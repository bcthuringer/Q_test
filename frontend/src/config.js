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
  
  // API Gateway (when implemented)
  apiEndpoint: process.env.REACT_APP_API_ENDPOINT,
  
  // Feature flags
  features: {
    // Set to false since API Gateway is not yet deployed
    apiEnabled: false
  }
};

// For local development, provide fallback values if environment variables are not set
if (!config.userPoolId) {
  console.warn('REACT_APP_USER_POOL_ID not set. Using development fallback value.');
  config.userPoolId = 'us-east-1_1zABzmEZz'; // Replace with your development value
}

if (!config.userPoolClientId) {
  console.warn('REACT_APP_USER_POOL_CLIENT_ID not set. Using development fallback value.');
  config.userPoolClientId = '7hfns9lovoob0dqg0dqg42bu9n'; // Replace with your development value
}

if (!config.mediaBucket) {
  console.warn('REACT_APP_MEDIA_BUCKET not set. Using development fallback value.');
  config.mediaBucket = 'blogserverlessstack-mediabucketbcbb02ba-lhlpl0eipl0n'; // Replace with your development value
}

export default config;
