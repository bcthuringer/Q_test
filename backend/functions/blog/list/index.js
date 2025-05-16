const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;

/**
 * Lambda function to list blog posts
 */
exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const userId = queryParams.userId;
    const limit = parseInt(queryParams.limit) || 10;
    const lastEvaluatedKey = queryParams.nextToken 
      ? JSON.parse(Buffer.from(queryParams.nextToken, 'base64').toString()) 
      : undefined;
    
    let params = {
      TableName: BLOGS_TABLE,
      Limit: limit,
      ScanIndexForward: false, // Sort in descending order (newest first)
    };
    
    // If userId is provided, query by user
    if (userId) {
      params = {
        ...params,
        IndexName: 'userIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':status': 'PUBLISHED'
        },
        FilterExpression: 'status = :status'
      };
    } else {
      // Otherwise, scan for all published posts
      params = {
        ...params,
        FilterExpression: 'status = :status',
        ExpressionAttributeValues: {
          ':status': 'PUBLISHED'
        }
      };
    }
    
    // Add pagination token if provided
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    // Execute query or scan
    const operation = userId ? 'query' : 'scan';
    const result = await dynamodb[operation](params).promise();
    
    // Generate next token for pagination
    let nextToken = null;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blogs: result.Items,
        nextToken
      })
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
