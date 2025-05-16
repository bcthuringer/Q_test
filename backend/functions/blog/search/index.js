const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;

/**
 * Lambda function to search blog posts
 */
exports.handler = async (event) => {
  try {
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const searchTerm = queryParams.q || '';
    const limit = parseInt(queryParams.limit) || 10;
    const lastEvaluatedKey = queryParams.nextToken ? JSON.parse(decodeURIComponent(queryParams.nextToken)) : undefined;
    
    // Validate search term
    if (!searchTerm) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Search term is required' })
      };
    }
    
    // Scan DynamoDB for matching items
    // Note: In a production environment, consider using Amazon OpenSearch Service for better search capabilities
    const params = {
      TableName: BLOGS_TABLE,
      FilterExpression: '(contains(title, :searchTerm) OR contains(content, :searchTerm) OR contains(tags, :searchTerm)) AND (userId = :userId OR visibility = :public)',
      ExpressionAttributeValues: {
        ':searchTerm': searchTerm,
        ':userId': userId,
        ':public': 'public'
      },
      Limit: limit
    };
    
    // Add pagination token if provided
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    // Execute the scan
    const result = await dynamodb.scan(params).promise();
    
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
    console.error('Error searching blog posts:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error searching blog posts', error: error.message })
    };
  }
};
