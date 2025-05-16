const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;

/**
 * Lambda function to get a single blog post
 */
exports.handler = async (event) => {
  try {
    // Get blog ID from path parameters
    const blogId = event.pathParameters.blogId;
    
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Get blog post from DynamoDB
    const result = await dynamodb.get({
      TableName: BLOGS_TABLE,
      Key: { blogId }
    }).promise();
    
    // Check if blog post exists
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Blog post not found' })
      };
    }
    
    // Check if user has permission to view this blog post
    const blog = result.Item;
    if (blog.visibility === 'private' && blog.userId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'You do not have permission to view this blog post' })
      };
    }
    
    // If shared, check if user is in the sharedWith list
    if (blog.visibility === 'shared' && blog.userId !== userId) {
      const userEmail = event.requestContext.authorizer.claims.email;
      if (!blog.sharedWith || !blog.sharedWith.includes(userEmail)) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'You do not have permission to view this blog post' })
        };
      }
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blog)
    };
  } catch (error) {
    console.error('Error getting blog post:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error getting blog post', error: error.message })
    };
  }
};
