# Serverless Blog Platform User Guide

This guide provides detailed instructions for setting up, deploying, and using the serverless blog platform. It's designed to help you understand both the user-facing features and the underlying architecture.

## Prerequisites

Before you begin, ensure you have the following:

- **AWS Account**: You'll need an AWS account with appropriate permissions to create resources
- **Node.js**: Version 14 or later installed on your development machine
- **AWS CLI**: Configured with your credentials (`aws configure`)
- **AWS CDK**: Installed globally (`npm install -g aws-cdk`)
- **Git**: For source control and CI/CD integration

## Setup and Deployment

### 1. Clone the Repository

```bash
# Clone the repository to your local machine
git clone <repository-url>
cd serverless-blog
```

### 2. Install Dependencies

The project is organized into separate modules, each with its own dependencies:

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install infrastructure dependencies
cd infrastructure
npm install
cd ..
```

### 3. Deploy the Infrastructure

The infrastructure is defined using AWS CDK, which allows for consistent and repeatable deployments:

```bash
# Navigate to the infrastructure directory
cd infrastructure

# Bootstrap your AWS environment (only needed once per AWS account/region)
# This creates the necessary resources for CDK to deploy infrastructure
cdk bootstrap

# Deploy the core infrastructure stack
cdk deploy BlogServerlessStack
```

The deployment will output several important values that you'll need for the frontend configuration:

- `WebsiteBucketName`: S3 bucket where the frontend will be hosted
- `MediaBucketName`: S3 bucket for storing blog images and attachments
- `UserPoolId`: Cognito User Pool ID for authentication
- `UserPoolClientId`: Client ID for the frontend application
- `ApiUrl`: API Gateway endpoint URL

### 4. Configure the Frontend

Update the Amplify configuration in `frontend/src/index.js` with the values from the CDK deployment:

```javascript
// This configuration connects your frontend to the AWS backend services
Amplify.configure({
  Auth: {
    region: 'us-east-1',  // Replace with your region
    userPoolId: 'YOUR_USER_POOL_ID',  // From CDK output
    userPoolWebClientId: 'YOUR_USER_POOL_CLIENT_ID',  // From CDK output
    mandatorySignIn: true,
  },
  API: {
    endpoints: [
      {
        name: 'blogApi',
        endpoint: 'YOUR_API_URL',  // From CDK output
        region: 'us-east-1'  // Replace with your region
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: 'YOUR_MEDIA_BUCKET_NAME',  // From CDK output
      region: 'us-east-1'  // Replace with your region
    }
  }
});
```

### 5. Build and Deploy the Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Build the React application
npm run build

# Update the deploy script in package.json with your S3 bucket name
# Then deploy to S3
npm run deploy
```

### 6. Create an Admin User

To manage the application, you'll need an administrator user:

1. Sign up a new user through the application
2. Use the AWS CLI to add the user to the Admins group:

```bash
# Replace YOUR_USER_POOL_ID with the actual User Pool ID
# Replace admin@example.com with your admin email
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --group-name Admins
```

## Using the Application

### User Registration and Login

1. Navigate to the application URL (available in the CloudFront distribution)
2. Click "Sign In" and then "Create account"
3. Complete the registration form with your email and password
4. You'll receive a message that your account is pending approval
5. An administrator must approve your account before you can log in
6. Once approved, you can log in with your credentials

### Creating Blog Posts

1. Log in to your account
2. Click "Create Post" in the navigation menu
3. Fill in the title and content (supports Markdown formatting)
4. Optionally upload one or more images
5. Set visibility (private, shared, or public)
6. Add tags for categorization
7. Click "Publish Post"

### Managing Your Posts

1. Navigate to "My Posts" to see all your blog entries
2. Use the filter options to find specific posts:
   - Filter by date range
   - Filter by tags
   - Filter by visibility
   - Search by content
3. Click on any post to view, edit, or delete it
4. Use the export feature to download your posts in various formats

### Admin Functions

1. Log in with an admin account
2. Click "Admin" in the navigation menu
3. Review pending user registrations
4. Approve or reject user registrations
5. View system statistics and usage metrics
6. Manage content moderation if needed

## Troubleshooting

### Common Issues

1. **API Errors**: 
   - Check that the API URL in the Amplify configuration is correct
   - Verify that your Lambda functions have the necessary permissions

2. **Authentication Issues**: 
   - Verify that the Cognito User Pool ID and Client ID are correct
   - Ensure your account has been approved by an administrator
   - Check for correct password format (minimum 8 characters, including numbers and special characters)

3. **Image Upload Failures**: 
   - Ensure the S3 bucket permissions are properly configured
   - Check that image files are in a supported format (JPEG, PNG)
   - Verify that images are under the size limit (5MB)

### Logs and Debugging

- **CloudWatch Logs**: Check Lambda function logs for backend errors
  - Navigate to CloudWatch > Log Groups > /aws/lambda/[function-name]
  
- **Browser Console**: Check for frontend JavaScript errors
  - Open browser developer tools (F12) and check the Console tab
  
- **API Gateway**: Test endpoints directly in the AWS Console
  - Navigate to API Gateway > [your-api] > Resources > Test

## Security Best Practices

1. **User Accounts**:
   - Use strong, unique passwords
   - Enable multi-factor authentication when available
   - Regularly rotate admin credentials

2. **Content Security**:
   - Be cautious about sharing sensitive information in blog posts
   - Use private visibility for personal content
   - Review shared content before publishing

3. **System Security**:
   - Monitor CloudTrail for suspicious activity
   - Review and update IAM permissions as needed
   - Keep all dependencies updated to patch security vulnerabilities

## Support and Resources

For issues or questions:

- Check the documentation in the `docs` directory
- Review the architecture diagrams in `docs/architecture`
- Open an issue in the GitHub repository
- Contact the development team at support@example.com

## Advanced Features

### Custom Domains

To use a custom domain with your blog:

1. Register a domain in Route 53 or with another provider
2. Create an SSL certificate in AWS Certificate Manager
3. Update the CloudFront distribution to use your custom domain
4. Configure DNS settings to point to the CloudFront distribution

### Backup and Recovery

The application includes several data protection features:

- DynamoDB point-in-time recovery is enabled
- S3 versioning is enabled for the media bucket
- Regular automated backups can be configured through AWS Backup

### Performance Optimization

For better performance:

- CloudFront caching is configured for static assets
- DynamoDB auto-scaling adjusts capacity based on demand
- Lambda functions are sized appropriately for their workload
