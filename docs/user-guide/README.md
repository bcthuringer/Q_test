# Serverless Blog Platform User Guide

This guide provides instructions for setting up, deploying, and using the serverless blog platform.

## Prerequisites

- AWS Account with appropriate permissions
- Node.js (v14 or later)
- AWS CLI configured with your credentials
- AWS CDK installed globally (`npm install -g aws-cdk`)

## Setup and Deployment

### 1. Clone the Repository

```bash
git clone <repository-url>
cd serverless-blog
```

### 2. Install Dependencies

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

```bash
cd infrastructure
cdk bootstrap  # Only needed once per AWS account/region
cdk deploy
```

The deployment will output several values that you'll need for the frontend configuration:

- WebsiteBucketName
- MediaBucketName
- UserPoolId
- UserPoolClientId
- ApiUrl

### 4. Configure the Frontend

Update the Amplify configuration in `frontend/src/index.js` with the values from the CDK deployment:

```javascript
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'YOUR_USER_POOL_ID',
    userPoolWebClientId: 'YOUR_USER_POOL_CLIENT_ID',
    mandatorySignIn: true,
  },
  API: {
    endpoints: [
      {
        name: 'blogApi',
        endpoint: 'YOUR_API_URL',
        region: 'us-east-1'
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: 'YOUR_MEDIA_BUCKET_NAME',
      region: 'us-east-1'
    }
  }
});
```

### 5. Build and Deploy the Frontend

```bash
cd frontend
npm run build

# Update the deploy script in package.json with your S3 bucket name
npm run deploy
```

### 6. Create an Admin User

1. Sign up a new user through the application
2. Use the AWS CLI to add the user to the Admins group:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --group-name Admins
```

## Using the Application

### User Registration and Login

1. Navigate to the application URL
2. Click "Sign In" and then "Create account"
3. Complete the registration form
4. Wait for an admin to approve your account
5. Once approved, you can log in with your credentials

### Creating Blog Posts

1. Log in to your account
2. Click "Create Post" in the navigation menu
3. Fill in the title and content
4. Optionally upload a featured image
5. Click "Publish Post"

### Admin Functions

1. Log in with an admin account
2. Click "Admin" in the navigation menu
3. Review pending user registrations
4. Approve or reject user registrations

## Troubleshooting

### Common Issues

1. **API Errors**: Check that the API URL in the Amplify configuration is correct
2. **Authentication Issues**: Verify that the Cognito User Pool ID and Client ID are correct
3. **Image Upload Failures**: Ensure the S3 bucket permissions are properly configured

### Logs and Debugging

- CloudWatch Logs: Check Lambda function logs for backend errors
- Browser Console: Check for frontend JavaScript errors
- API Gateway: Test endpoints directly in the AWS Console

## Security Best Practices

1. Regularly rotate admin credentials
2. Monitor CloudTrail for suspicious activity
3. Review and update IAM permissions as needed
4. Enable MFA for admin users

## Support

For issues or questions, please contact the development team or open an issue in the GitHub repository.
