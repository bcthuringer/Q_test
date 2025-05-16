const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;

/**
 * Lambda function to delete a blog post
 */
exports.handler = async (event) => {
  try {
    // Get blog ID from path parameters
    const blogId = event.pathParameters.blogId;
    
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Get existing blog post
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
    
    // Check if user owns this blog post
    const blog = result.Item;
    if (blog.userId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'You do not have permission to delete this blog post' })
      };
    }
    
    // Delete associated images from S3
    if (blog.imageUrls && blog.imageUrls.length > 0) {
      const deletePromises = blog.imageUrls.map(imageUrl => {
        return s3.deleteObject({
          Bucket: MEDIA_BUCKET,
          Key: imageUrl
        }).promise();
      });
      
      await Promise.all(deletePromises);
    }
    
    // Delete blog post from DynamoDB
    await dynamodb.delete({
      TableName: BLOGS_TABLE,
      Key: { blogId }
    }).promise();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Blog post deleted successfully',
        blogId
      })
    };
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error deleting blog post', error: error.message })
    };
  }
};
