/**
 * Blog Post Listing Lambda Function
 * 
 * This Lambda function retrieves blog posts from DynamoDB with support for
 * pagination, filtering, and sorting. It demonstrates advanced DynamoDB query
 * techniques in a serverless application.
 * 
 * Learning points:
 * - Working with DynamoDB queries and filters
 * - Implementing pagination in serverless APIs
 * - Using GSIs (Global Secondary Indexes) for efficient queries
 * - Building complex filter expressions
 * - Handling query parameters in API Gateway
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;

/**
 * Lambda function to list blog posts with pagination and filtering
 * 
 * @param {Object} event - API Gateway event containing request data
 * @returns {Object} - API Gateway response object with blog posts
 */
exports.handler = async (event) => {
  try {
    // Get user ID from Cognito authorizer
    // This is used to filter posts by the current user
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Parse query parameters with defaults
    // These parameters allow for flexible querying of blog posts
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit) || 10;  // Number of items per page
    const lastEvaluatedKey = queryParams.nextToken 
      ? JSON.parse(decodeURIComponent(queryParams.nextToken)) 
      : undefined;  // Pagination token
    const visibility = queryParams.visibility || 'all';  // Filter by visibility
    const tag = queryParams.tag;  // Filter by tag
    const startDate = queryParams.startDate;  // Filter by date range start
    const endDate = queryParams.endDate;  // Filter by date range end
    const mood = queryParams.mood;  // Filter by mood
    
    // Build the DynamoDB query parameters
    let params = {
      TableName: BLOGS_TABLE,
      Limit: limit  // Maximum number of items to return
    };
    
    // Filter by user ID (for personal journal entries)
    // This demonstrates using different query strategies based on parameters
    if (visibility === 'private' || visibility === 'all') {
      // Use the GSI to efficiently query by userId
      params.IndexName = 'userIdIndex';
      params.KeyConditionExpression = 'userId = :userId';
      params.ExpressionAttributeValues = {
        ':userId': userId
      };
      
      // Add filter for visibility if not showing all
      if (visibility !== 'all') {
        params.FilterExpression = 'visibility = :visibility';
        params.ExpressionAttributeValues[':visibility'] = visibility;
      }
    } else if (visibility === 'public') {
      // For public posts, use a filter expression
      // Note: In a production app, you might want a GSI for public posts
      params.FilterExpression = 'visibility = :visibility';
      params.ExpressionAttributeValues = {
        ':visibility': 'public'
      };
    }
    
    // Add date range filter if provided
    // This demonstrates building complex filter expressions
    if (startDate && endDate) {
      if (params.FilterExpression) {
        params.FilterExpression += ' AND createdAt BETWEEN :startDate AND :endDate';
      } else {
        params.FilterExpression = 'createdAt BETWEEN :startDate AND :endDate';
      }
      params.ExpressionAttributeValues[':startDate'] = startDate;
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }
    
    // Add tag filter if provided
    // This demonstrates using the contains function for array fields
    if (tag) {
      if (params.FilterExpression) {
        params.FilterExpression += ' AND contains(tags, :tag)';
      } else {
        params.FilterExpression = 'contains(tags, :tag)';
      }
      params.ExpressionAttributeValues[':tag'] = tag;
    }
    
    // Add mood filter if provided
    if (mood) {
      if (params.FilterExpression) {
        params.FilterExpression += ' AND mood = :mood';
      } else {
        params.FilterExpression = 'mood = :mood';
      }
      params.ExpressionAttributeValues[':mood'] = mood;
    }
    
    // Add pagination token if provided
    // This enables retrieving results beyond the initial query limit
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    // Execute the query against DynamoDB
    const result = await dynamodb.query(params).promise();
    
    // Prepare the response object
    const response = {
      items: result.Items,  // The blog posts
      count: result.Count   // Number of items returned
    };
    
    // Add pagination token if more results exist
    // This allows the client to request the next page of results
    if (result.LastEvaluatedKey) {
      response.nextToken = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }
    
    // Return successful response with blog posts
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    // Log the error for debugging but return a sanitized message
    console.error('Error listing blog posts:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error listing blog posts', error: error.message })
    };
  }
};
