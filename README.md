# Q_Blog

A serverless, auto-scaling blog website with user authentication and administrative approval.

## Features

- Serverless architecture using AWS services
- User authentication and authorization
- Blog post creation and management
- Administrative approval process for new users
- Auto-scaling infrastructure
- Responsive frontend design
- Secure configuration management
- CI/CD pipeline with AWS CodePipeline, CodeBuild, and CodeArtifact
- Cost-optimized infrastructure

## Architecture

This project uses a modern serverless architecture:

- **Frontend**: React.js application hosted on AWS S3 and CloudFront
- **Backend**: AWS Lambda functions with API Gateway
- **Database**: Amazon DynamoDB with provisioned capacity and auto-scaling
- **Authentication**: Amazon Cognito for user management
- **Storage**: Amazon S3 for media uploads with lifecycle policies
- **CDN**: CloudFront for content delivery (North America and Europe regions)
- **Infrastructure**: AWS CDK for infrastructure as code
- **Secret Management**: AWS SSM Parameter Store for configuration
- **CI/CD**: AWS CodePipeline, CodeBuild (small instance), and CodeArtifact
- **Logging**: CloudWatch Logs with one-week retention policy

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
- GitHub personal access token with repo and admin:repo_hook permissions

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

4. **Create GitHub token secret**:
   - Create a GitHub personal access token with repo and admin:repo_hook permissions
   - Deploy the GitHub secret stack:
     ```bash
     cd infrastructure
     npm run deploy:github-secret
     ```
   - Update the secret value in AWS Secrets Manager console with your actual GitHub token

5. **Deploy the CI/CD pipeline**:
   ```bash
   cd infrastructure
   npm run deploy:cicd
   ```

6. **Load environment variables from SSM Parameter Store**:
   ```bash
   cd frontend
   ../scripts/load-env.sh
   ```

7. **Build and deploy the frontend**:
   ```bash
   npm run build:frontend
   npm run deploy:frontend
   ```

8. **Create an admin user**:
   ```bash
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id $(aws ssm get-parameter --name "/blog/auth/userPoolId" --query "Parameter.Value" --output text) \
     --username admin@example.com \
     --group-name Admins
   ```

## CI/CD Pipeline

The CI/CD pipeline automatically:
1. Detects changes in the GitHub repository
2. Pulls the latest code
3. Installs dependencies
4. Builds the frontend application
5. Deploys to S3
6. Invalidates the CloudFront cache using the stored distribution ID
7. Stores artifacts in CodeArtifact (with 30-day retention policy)

## Cost Optimizations

This project implements several cost optimizations:

1. **DynamoDB Provisioned Capacity**: Uses provisioned capacity with auto-scaling instead of on-demand pricing
   - Initial capacity: 5 read/write units
   - Auto-scales between 5-20 units based on 70% utilization
   
2. **S3 Lifecycle Rules**:
   - Media bucket: Transitions objects to Infrequent Access after 30 days
   - Artifact bucket: Automatically deletes objects after 30 days
   - Both buckets: Clean up incomplete multipart uploads after 7 days
   
3. **CloudFront Optimization**: Uses PRICE_CLASS_100 (North America and Europe only)

4. **CodeBuild Optimization**: Uses SMALL compute type instead of MEDIUM

5. **CloudWatch Logs**: Implements one-week retention policy instead of indefinite retention

## Security Best Practices

This project follows these security best practices:

1. **No hardcoded secrets**: Configuration values are stored in AWS SSM Parameter Store
2. **Environment variables**: Sensitive values are loaded from environment variables
3. **Least privilege**: IAM roles follow the principle of least privilege
4. **HTTPS everywhere**: All communication is encrypted using HTTPS
5. **Secure authentication**: Cognito handles user authentication with proper password policies
6. **Input validation**: All user inputs are validated before processing
7. **Secure CI/CD**: GitHub tokens stored in AWS Secrets Manager

## Estimated Costs

For a small deployment with less than 5 users posting once per day:
- **First Year (with AWS Free Tier)**: ~$1-2 per month
- **After Free Tier**: ~$7-10 per month

Cost breakdown:
- DynamoDB: ~$5.84/month (mostly covered by free tier in first year)
- S3 Storage: ~$0.05/month
- CloudFront: ~$0.085/month
- Lambda Functions: ~$0.30/month
- Cognito: Free for first 50,000 users
- API Gateway: ~$0.35/month
- CloudWatch Logs: ~$0.10/month (with 1-week retention)
- CI/CD: ~$1.00/month

## Getting Started

See the detailed setup instructions in the docs/user-guide directory.
