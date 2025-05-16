const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Get parameters from environment variables
const BLOGS_TABLE = process.env.BLOGS_TABLE;
const EXPORT_BUCKET = process.env.EXPORT_BUCKET || process.env.MEDIA_BUCKET;

/**
 * Lambda function to export blog posts
 */
exports.handler = async (event) => {
  try {
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    const username = event.requestContext.authorizer.claims['cognito:username'];
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const format = queryParams.format || 'json'; // json, markdown, html, pdf
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const tag = queryParams.tag;
    
    // Query DynamoDB for user's blog posts
    const params = {
      TableName: BLOGS_TABLE,
      IndexName: 'userIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      params.FilterExpression = 'createdAt BETWEEN :startDate AND :endDate';
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
    
    // Execute the query
    const result = await dynamodb.query(params).promise();
    
    // Format the data based on requested format
    let exportData;
    let contentType;
    let fileExtension;
    
    switch (format.toLowerCase()) {
      case 'markdown':
        exportData = formatAsMarkdown(result.Items);
        contentType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'html':
        exportData = formatAsHtml(result.Items);
        contentType = 'text/html';
        fileExtension = 'html';
        break;
      case 'pdf':
        // PDF generation would typically require additional libraries
        // For simplicity, we'll return HTML that could be converted to PDF client-side
        exportData = formatAsHtml(result.Items);
        contentType = 'text/html';
        fileExtension = 'html';
        break;
      case 'json':
      default:
        exportData = JSON.stringify(result.Items, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
    }
    
    // Generate a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `export-${username}-${timestamp}.${fileExtension}`;
    
    // Upload the export file to S3
    const uploadResult = await s3.putObject({
      Bucket: EXPORT_BUCKET,
      Key: `exports/${userId}/${filename}`,
      Body: exportData,
      ContentType: contentType,
      ACL: 'private'
    }).promise();
    
    // Generate a pre-signed URL for downloading the export
    const expirationSeconds = 3600; // URL expires in 1 hour
    const downloadUrl = s3.getSignedUrl('getObject', {
      Bucket: EXPORT_BUCKET,
      Key: `exports/${userId}/${filename}`,
      Expires: expirationSeconds
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Export created successfully',
        downloadUrl,
        expiresIn: `${expirationSeconds} seconds`,
        format,
        count: result.Items.length
      })
    };
  } catch (error) {
    console.error('Error exporting blog posts:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error exporting blog posts', error: error.message })
    };
  }
};

/**
 * Format blog posts as Markdown
 */
function formatAsMarkdown(blogs) {
  return blogs.map(blog => {
    const date = new Date(blog.createdAt).toLocaleDateString();
    const mood = blog.mood ? `\nMood: ${blog.mood}` : '';
    const tags = blog.tags && blog.tags.length > 0 ? `\nTags: ${blog.tags.join(', ')}` : '';
    
    return `# ${blog.title}\n\n${date}${mood}${tags}\n\n${blog.content}\n\n---\n\n`;
  }).join('');
}

/**
 * Format blog posts as HTML
 */
function formatAsHtml(blogs) {
  const blogHtml = blogs.map(blog => {
    const date = new Date(blog.createdAt).toLocaleDateString();
    const mood = blog.mood ? `<p><strong>Mood:</strong> ${blog.mood}</p>` : '';
    const tags = blog.tags && blog.tags.length > 0 
      ? `<p><strong>Tags:</strong> ${blog.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>` 
      : '';
    
    return `
      <article class="blog-entry">
        <h2>${blog.title}</h2>
        <div class="meta">
          <time datetime="${blog.createdAt}">${date}</time>
          ${mood}
          ${tags}
        </div>
        <div class="content">
          ${blog.content.replace(/\n/g, '<br>')}
        </div>
      </article>
      <hr>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Journal Export</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { text-align: center; margin-bottom: 30px; }
        .blog-entry { margin-bottom: 30px; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 15px; }
        .tag { background: #f0f0f0; padding: 2px 8px; border-radius: 3px; margin-right: 5px; }
        hr { border: 0; border-top: 1px solid #eee; margin: 30px 0; }
      </style>
    </head>
    <body>
      <h1>Journal Export</h1>
      ${blogHtml}
    </body>
    </html>
  `;
}
