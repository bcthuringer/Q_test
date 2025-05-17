/**
 * Blog Post Creation Lambda Function
 * 
 * This Lambda function handles the creation of new blog posts, including text content
 * and image uploads. It demonstrates how to work with multiple AWS services
 * (DynamoDB, S3) in a serverless application.
 * 
 * Learning points:
 * - Handling file uploads in serverless applications
 * - Working with DynamoDB for data storage
 * - Using S3 for media storage
 * - Input validation and error handling
 * - Using environment variables for configuration
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Get parameters from environment variables
// This allows for different configurations in different environments
const BLOGS_TABLE = process.env.BLOGS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;

/**
 * Lambda function to create a new blog post
 * 
 * @param {Object} event - API Gateway event containing request data
 * @returns {Object} - API Gateway response object
 */
exports.handler = async (event) => {
  try {
    // Parse request body to get blog post data
    const body = JSON.parse(event.body);
    const { title, content, imageBase64, visibility = 'private', tags = [], mood } = body;
    
    // Validate required fields
    if (!title || !content) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Title and content are required' })
      };
    }
    
    // Get user ID from Cognito authorizer
    // This information comes from the JWT token validated by API Gateway
    const userId = event.requestContext.authorizer.claims.sub;
    const username = event.requestContext.authorizer.claims['cognito:username'];
    
    // Generate a unique ID for the blog post using UUID v4
    // This ensures each blog post has a globally unique identifier
    const blogId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Handle image upload if provided
    // Images are sent as base64-encoded strings and uploaded to S3
    let imageUrls = [];
    if (imageBase64) {
      if (Array.isArray(imageBase64)) {
        // Handle multiple images
        for (const imgBase64 of imageBase64) {
          const imageUrl = await uploadImage(imgBase64, blogId);
          if (imageUrl) imageUrls.push(imageUrl);
        }
      } else {
        // Handle single image
        const imageUrl = await uploadImage(imageBase64, blogId);
        if (imageUrl) imageUrls.push(imageUrl);
      }
    }
    
    // Create blog post item for DynamoDB
    // This defines the schema for our blog posts
    const blogItem = {
      blogId,                // Primary key - unique identifier
      userId,                // User who created the post (for filtering)
      username,              // Username for display purposes
      title,                 // Blog post title
      content,               // Blog post content (markdown or HTML)
      imageUrls,             // Array of S3 keys for uploaded images
      visibility,            // 'private', 'shared', or 'public'
      tags,                  // Array of tags for categorization
      mood,                  // Optional mood indicator
      createdAt: timestamp,  // Creation timestamp (for sorting)
      updatedAt: timestamp,  // Last update timestamp
      status: 'PUBLISHED'    // Status flag (could be DRAFT, PUBLISHED, etc.)
    };
    
    // Save the blog post to DynamoDB
    await dynamodb.put({
      TableName: BLOGS_TABLE,
      Item: blogItem
    }).promise();
    
    // Return success response with the new blog ID
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
    // Log the full error for debugging but return a sanitized message
    console.error('Error creating blog post:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error creating blog post', error: error.message })
    };
  }
};

/**
 * Helper function to upload an image to S3
 * 
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} blogId - ID of the blog post the image belongs to
 * @returns {string|null} - S3 key of the uploaded image or null if upload failed
 */
async function uploadImage(imageBase64, blogId) {
  try {
    // Convert base64 string to buffer
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    );
    
    // Generate a unique key for the image
    // We organize images by blog ID to keep related images together
    const imageKey = `blogs/${blogId}/${uuidv4()}.jpg`;
    
    // Upload the image to S3
    await s3.putObject({
      Bucket: MEDIA_BUCKET,
      Key: imageKey,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'private'  // Keep images private by default
    }).promise();
    
    // Return the S3 key (not the full URL)
    // The frontend can construct the URL using the configured S3 bucket
    return imageKey;
  } catch (error) {
    // Log the error but don't fail the entire request
    console.error('Error uploading image:', error);
    return null;
  }
}
