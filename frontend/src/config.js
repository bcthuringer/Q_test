// Configuration file for the application
// In a production environment, these values should be loaded from environment variables
// or a secure parameter store like AWS Systems Manager Parameter Store or AWS Secrets Manager

// This file should be included in .gitignore to prevent committing sensitive information

const config = {
  // AWS Region
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  
  // Cognito User Pool - no default values for security
  userPoolId: process.env.REACT_APP_USER_POOL_ID,
  userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  
  // S3 Buckets - no default values for security
  mediaBucket: process.env.REACT_APP_MEDIA_BUCKET,
  websiteBucket: process.env.REACT_APP_WEBSITE_BUCKET,
  
  // CloudFront - no default values for security
  cloudfrontDomain: process.env.REACT_APP_CLOUDFRONT_DOMAIN,
  
  // API Gateway - no default values for security
  apiEndpoint: process.env.REACT_APP_API_ENDPOINT,
  
  // Feature flags
  features: {
    // Determine if API is enabled based on whether endpoint exists
    apiEnabled: !!process.env.REACT_APP_API_ENDPOINT
  }
};

// For local development, provide safe placeholder values if environment variables are not set
// These placeholders don't expose any real credentials
if (!config.userPoolId) {
  console.warn('REACT_APP_USER_POOL_ID not set. Application may not function correctly.');
  config.userPoolId = 'missing-user-pool-id';
}

if (!config.userPoolClientId) {
  console.warn('REACT_APP_USER_POOL_CLIENT_ID not set. Application may not function correctly.');
  config.userPoolClientId = 'missing-client-id';
}

if (!config.mediaBucket) {
  console.warn('REACT_APP_MEDIA_BUCKET not set. Media features may not function correctly.');
  config.mediaBucket = 'missing-media-bucket';
}

if (!config.apiEndpoint) {
  console.warn('REACT_APP_API_ENDPOINT not set. API features will be disabled.');
  config.features.apiEnabled = false;
}

export default config;
