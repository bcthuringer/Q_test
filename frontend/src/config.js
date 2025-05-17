// Configuration file for the application
// In a production environment, these values should be loaded from environment variables
// or a secure parameter store like AWS Systems Manager Parameter Store or AWS Secrets Manager

// This file should be included in .gitignore to prevent committing sensitive information

const config = {
  // AWS Region
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  
  // Cognito User Pool
  userPoolId: process.env.REACT_APP_USER_POOL_ID,
  userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  
  // S3 Buckets
  mediaBucket: process.env.REACT_APP_MEDIA_BUCKET,
  websiteBucket: process.env.REACT_APP_WEBSITE_BUCKET,
  
  // CloudFront
  cloudfrontDomain: process.env.REACT_APP_CLOUDFRONT_DOMAIN,
  
  // API Gateway (now implemented)
  apiEndpoint: process.env.REACT_APP_API_ENDPOINT,
  
  // Feature flags
  features: {
    // Set to true since API Gateway is now deployed
    apiEnabled: true
  }
};

// For local development, provide fallback values if environment variables are not set
// SECURITY NOTE: These are development-only values and do not provide access to production resources
if (!config.userPoolId) {
  console.warn('REACT_APP_USER_POOL_ID not set. Using development fallback value.');
  // Use a clearly marked development value
  config.userPoolId = 'DEV_ONLY-us-east-1_1zABzmEZz';
}

if (!config.userPoolClientId) {
  console.warn('REACT_APP_USER_POOL_CLIENT_ID not set. Using development fallback value.');
  // Use a clearly marked development value
  config.userPoolClientId = 'DEV_ONLY-7hfns9lovoob0dqg0dqg42bu9n';
}

if (!config.mediaBucket) {
  console.warn('REACT_APP_MEDIA_BUCKET not set. Using development fallback value.');
  // Use a clearly marked development value
  config.mediaBucket = 'DEV_ONLY-blogserverlessstack-mediabucket';
}

if (!config.apiEndpoint) {
  console.warn('REACT_APP_API_ENDPOINT not set. Using development fallback value.');
  // Use a clearly marked development value
  config.apiEndpoint = 'https://yt2zvia5lf.execute-api.us-east-1.amazonaws.com/prod';
}

export default config;
