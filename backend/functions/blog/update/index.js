const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;

/**
 * Lambda function to update a blog post
 */
exports.handler = async (event) => {
  try {
    // Get blog ID from path parameters
    const blogId = event.pathParameters.blogId;
    
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Parse request body
    const body = JSON.parse(event.body);
    const { title, content, imageBase64, visibility, tags, mood, sharedWith } = body;
    
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
        body: JSON.stringify({ message: 'You do not have permission to update this blog post' })
      };
    }
    
    // Handle image upload if provided
    let imageUrls = blog.imageUrls || [];
    if (imageBase64) {
      if (Array.isArray(imageBase64)) {
        // Handle multiple new images
        for (const imgBase64 of imageBase64) {
          const imageUrl = await uploadImage(imgBase64, blogId);
          if (imageUrl) imageUrls.push(imageUrl);
        }
      } else {
        // Handle single new image
        const imageUrl = await uploadImage(imageBase64, blogId);
        if (imageUrl) imageUrls.push(imageUrl);
      }
    }
    
    // Prepare update expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };
    
    // Add fields to update expression if provided
    if (title) {
      updateExpression += ', title = :title';
      expressionAttributeValues[':title'] = title;
    }
    
    if (content) {
      updateExpression += ', content = :content';
      expressionAttributeValues[':content'] = content;
    }
    
    if (imageUrls.length > 0) {
      updateExpression += ', imageUrls = :imageUrls';
      expressionAttributeValues[':imageUrls'] = imageUrls;
    }
    
    if (visibility) {
      updateExpression += ', visibility = :visibility';
      expressionAttributeValues[':visibility'] = visibility;
    }
    
    if (tags) {
      updateExpression += ', tags = :tags';
      expressionAttributeValues[':tags'] = tags;
    }
    
    if (mood) {
      updateExpression += ', mood = :mood';
      expressionAttributeValues[':mood'] = mood;
    }
    
    if (sharedWith) {
      updateExpression += ', sharedWith = :sharedWith';
      expressionAttributeValues[':sharedWith'] = sharedWith;
    }
    
    // Update blog post in DynamoDB
    await dynamodb.update({
      TableName: BLOGS_TABLE,
      Key: { blogId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Blog post updated successfully',
        blogId
      })
    };
  } catch (error) {
    console.error('Error updating blog post:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error updating blog post', error: error.message })
    };
  }
};

/**
 * Helper function to upload an image to S3
 */
async function uploadImage(imageBase64, blogId) {
  try {
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
    
    return imageKey;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}
