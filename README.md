# Serverless Blog Platform

A serverless, auto-scaling personal blog website with user authentication and administrative approval.

## Features

- Serverless architecture using AWS services
- User authentication and authorization
- Blog post creation and management
- Administrative approval process for new users
- Auto-scaling infrastructure
- Responsive frontend design
- Secure configuration management

## Architecture

This project uses a modern serverless architecture:

- **Frontend**: React.js application hosted on AWS S3 and CloudFront
- **Backend**: AWS Lambda functions with API Gateway
- **Database**: Amazon DynamoDB for scalable NoSQL storage
- **Authentication**: Amazon Cognito for user management
- **Storage**: Amazon S3 for media uploads
- **CDN**: CloudFront for content delivery
- **Infrastructure**: AWS CDK for infrastructure as code
- **Secret Management**: AWS SSM Parameter Store for configuration

## Directory Structure

```
/
├── frontend/           # React.js frontend application
├── backend/            # Serverless backend functions
├── infrastructure/     # AWS CDK infrastructure code
├── scripts/            # Utility scripts
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

4. **Load environment variables from SSM Parameter Store**:
   ```bash
   cd frontend
   ../scripts/load-env.sh
   ```

5. **Build and deploy the frontend**:
   ```bash
   npm run build
   npm run deploy
   ```

6. **Create an admin user**:
   ```bash
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id $(aws ssm get-parameter --name "/blog/auth/userPoolId" --query "Parameter.Value" --output text) \
     --username admin@example.com \
     --group-name Admins
   ```

## Security Best Practices

This project follows these security best practices:

1. **No hardcoded secrets**: Configuration values are stored in AWS SSM Parameter Store
2. **Environment variables**: Sensitive values are loaded from environment variables
3. **Least privilege**: IAM roles follow the principle of least privilege
4. **HTTPS everywhere**: All communication is encrypted using HTTPS
5. **Secure authentication**: Cognito handles user authentication with proper password policies
6. **Input validation**: All user inputs are validated before processing

## Estimated Costs

For a small deployment with less than 5 users posting once per day:
- Approximately $0.55 per month (most services within AWS Free Tier)
- After free tier: $1-2 per month

## Getting Started

See the detailed setup instructions in the docs/user-guide directory.
