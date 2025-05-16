# Serverless Blog Platform

A serverless, auto-scaling personal blog website with user authentication and administrative approval.

## Features

- Serverless architecture using AWS services
- User authentication and authorization
- Blog post creation and management
- Administrative approval process for new users
- Auto-scaling infrastructure
- Responsive frontend design

## Architecture

This project uses a modern serverless architecture:

- **Frontend**: React.js application hosted on AWS S3 and CloudFront
- **Backend**: AWS Lambda functions with API Gateway
- **Database**: Amazon DynamoDB for scalable NoSQL storage
- **Authentication**: Amazon Cognito for user management
- **Storage**: Amazon S3 for media uploads
- **CDN**: CloudFront for content delivery
- **Infrastructure**: AWS CDK for infrastructure as code

## Directory Structure

```
/
├── frontend/           # React.js frontend application
├── backend/            # Serverless backend functions
├── infrastructure/     # AWS CDK infrastructure code
└── docs/               # Project documentation
```

## Prerequisites

- Node.js and npm
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally (`npm install -g aws-cdk`)

## Deployment Instructions

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Bootstrap your AWS environment** (only needed once per account/region):
   ```bash
   cd infrastructure
   cdk bootstrap
   ```

3. **Deploy the infrastructure**:
   ```bash
   npm run deploy:infrastructure
   ```

4. **Update the frontend configuration**:
   Update the Amplify configuration in `frontend/src/index.js` with the output values from the CDK deployment.

5. **Build and deploy the frontend**:
   ```bash
   npm run build:frontend
   npm run deploy:frontend
   ```

6. **Create an admin user**:
   Follow the instructions in the docs/user-guide directory.

## Estimated Costs

For a small deployment with less than 5 users posting once per day:
- Approximately $0.55 per month (most services within AWS Free Tier)
- After free tier: $1-2 per month

## Getting Started

See the detailed setup instructions in the docs/user-guide directory.
