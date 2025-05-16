const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;

/**
 * Lambda function to list blog posts with pagination and filtering
 */
exports.handler = async (event) => {
  try {
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit) || 10;
    const lastEvaluatedKey = queryParams.nextToken ? JSON.parse(decodeURIComponent(queryParams.nextToken)) : undefined;
    const visibility = queryParams.visibility || 'all';
    const tag = queryParams.tag;
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const mood = queryParams.mood;
    
    // Determine which index to use based on query parameters
    let params = {
      TableName: BLOGS_TABLE,
      Limit: limit
    };
    
    // Filter by user ID (for personal journal entries)
    if (visibility === 'private' || visibility === 'all') {
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
      // For public posts, use a different query approach
      params.FilterExpression = 'visibility = :visibility';
      params.ExpressionAttributeValues = {
        ':visibility': 'public'
      };
    }
    
    // Add date range filter if provided
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
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    // Query DynamoDB
    const result = await dynamodb.query(params).promise();
    
    // Prepare response
    const response = {
      items: result.Items,
      count: result.Count
    };
    
    // Add pagination token if more results exist
    if (result.LastEvaluatedKey) {
      response.nextToken = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error listing blog posts:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error listing blog posts', error: error.message })
    };
  }
};
