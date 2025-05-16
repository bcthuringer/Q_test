const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;

/**
 * Lambda function to create a new blog post
 */
exports.handler = async (event) => {
  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { title, content, imageBase64 } = body;
    
    if (!title || !content) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Title and content are required' })
      };
    }
    
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    const username = event.requestContext.authorizer.claims['cognito:username'];
    
    // Generate a unique ID for the blog post
    const blogId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Handle image upload if provided
    let imageUrl = null;
    if (imageBase64) {
      const buffer = Buffer.from(
        imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      );
      
      const imageKey = `blogs/${blogId}/${uuidv4()}.jpg`;
      
      await s3.putObject({
        Bucket: MEDIA_BUCKET,
        Key: imageKey,
        Body: buffer,
        ContentType: 'image/jpeg',
        ACL: 'private'
      }).promise();
      
      imageUrl = imageKey;
    }
    
    // Create blog post in DynamoDB
    const blogItem = {
      blogId,
      userId,
      username,
      title,
      content,
      imageUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'PUBLISHED'
    };
    
    await dynamodb.put({
      TableName: BLOGS_TABLE,
      Item: blogItem
    }).promise();
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Blog post created successfully',
        blogId,
        createdAt: timestamp
      })
    };
  } catch (error) {
    console.error('Error creating blog post:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error creating blog post', error: error.message })
    };
  }
};
