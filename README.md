# Q_Blog: A Serverless Blog Platform Tutorial

This repository serves as an instructional guide for building a serverless, auto-scaling blog website with user authentication and administrative approval. Follow along to learn AWS serverless architecture best practices.

## Introduction

Welcome to the Q_Blog tutorial! This project demonstrates how to build a modern, serverless blog platform using AWS services. By following this guide, you'll learn how to implement:

- Serverless architecture patterns
- User authentication and authorization flows
- Content management systems
- Administrative workflows
- Auto-scaling infrastructure
- Cost optimization techniques
- Security best practices
- CI/CD pipelines

This project is designed as a learning resource for developers looking to understand AWS serverless architecture in a real-world context.

## Features

- **Serverless Architecture**: Learn how to build applications without managing servers
- **User Authentication**: Implement secure login, registration, and account management
- **Content Management**: Create a system for blog post creation and management
- **Administrative Workflows**: Build approval processes for new users
- **Auto-scaling Infrastructure**: Design systems that scale automatically with demand
- **Responsive Frontend**: Develop a modern, mobile-friendly user interface
- **Security Implementation**: Apply best practices for secure application development
- **CI/CD Pipeline**: Create automated build and deployment processes
- **Cost Optimization**: Implement strategies to minimize cloud infrastructure costs

## Architecture Overview

This project demonstrates a modern serverless architecture:

- **Frontend**: React.js application hosted on AWS S3 and CloudFront
  - *Learning goals: Static website hosting, CDN configuration, SPA design*

- **Backend**: AWS Lambda functions with API Gateway
  - *Learning goals: Serverless computing, API design, function organization*

- **Database**: Amazon DynamoDB with provisioned capacity and auto-scaling
  - *Learning goals: NoSQL database design, capacity planning, scaling strategies*

- **Authentication**: Amazon Cognito for user management
  - *Learning goals: User pools, identity management, authorization flows*

- **Storage**: Amazon S3 for media uploads with lifecycle policies
  - *Learning goals: Object storage, lifecycle management, access control*

- **CDN**: CloudFront for content delivery (North America and Europe regions)
  - *Learning goals: Content distribution, cache strategies, geographic optimization*

- **Infrastructure as Code**: AWS CDK for infrastructure definition
  - *Learning goals: IaC principles, resource modeling, environment management*

- **Secret Management**: AWS SSM Parameter Store for configuration
  - *Learning goals: Secret handling, configuration management, environment variables*

- **CI/CD**: AWS CodePipeline, CodeBuild, and CodeArtifact
  - *Learning goals: Automated testing, deployment strategies, artifact management*

- **Logging**: CloudWatch Logs with retention policies
  - *Learning goals: Log management, monitoring strategies, troubleshooting*

## Directory Structure

```
/
├── frontend/           # React.js frontend application
│   ├── src/            # Source code with components, hooks, and utilities
│   ├── public/         # Static assets and HTML template
│   └── tests/          # Frontend unit and integration tests
│
├── backend/            # Serverless backend functions
│   ├── functions/      # Lambda function code organized by domain
│   │   ├── auth/       # Authentication-related functions
│   │   ├── blog/       # Blog post management functions
│   │   └── admin/      # Administrative functions
│   ├── layers/         # Shared Lambda layers for common code
│   └── tests/          # Backend unit and integration tests
│
├── infrastructure/     # AWS CDK infrastructure code
│   ├── lib/            # Stack definitions for each component
│   ├── bin/            # Entry point for CDK application
│   └── test/           # Infrastructure tests
│
├── scripts/            # Utility scripts for deployment and management
│   ├── load-env.sh     # Script to load environment variables
│   └── deploy.sh       # Deployment automation script
│
└── docs/               # Project documentation
    ├── architecture/   # Architecture diagrams and explanations
    └── user-guide/     # End-user documentation
```

## Prerequisites

Before starting this tutorial, ensure you have:

- **Node.js and npm**: Required for running JavaScript code and managing packages
  - *Recommended: Node.js v14 or later*
  - *Installation: https://nodejs.org/*

- **AWS CLI**: Command-line tool for interacting with AWS services
  - *Installation: https://aws.amazon.com/cli/*
  - *Configuration: Run `aws configure` with your credentials*

- **AWS CDK**: Infrastructure as Code toolkit for defining cloud resources
  - *Installation: `npm install -g aws-cdk`*
  - *Documentation: https://docs.aws.amazon.com/cdk/*

- **GitHub Account**: For source control and CI/CD integration
  - *Sign up: https://github.com/*
  - *Create a personal access token with repo and admin:repo_hook permissions*

## Deployment Instructions

Follow these steps to deploy the application:

1. **Install dependencies**:
   ```bash
   # This command installs all dependencies for frontend, backend, and infrastructure
   npm run install:all
   ```

2. **Bootstrap your AWS environment** (only needed once per account/region):
   ```bash
   # This creates the necessary resources for CDK to deploy infrastructure
   cd infrastructure
   cdk bootstrap
   ```

3. **Deploy the infrastructure**:
   ```bash
   # This deploys the core infrastructure components (DynamoDB, S3, Cognito, etc.)
   npm run deploy:infrastructure
   ```

4. **Create GitHub token secret**:
   ```bash
   # First, create a GitHub personal access token in your GitHub account settings
   # Then, deploy the secret management stack
   cd infrastructure
   npm run deploy:github-secret
   
   # Finally, update the secret value in AWS Secrets Manager console with your token
   # Navigate to AWS Secrets Manager > Secrets > github-token > Update secret value
   ```

5. **Deploy the CI/CD pipeline**:
   ```bash
   # This sets up the automated build and deployment pipeline
   cd infrastructure
   npm run deploy:cicd
   ```

6. **Load environment variables from SSM Parameter Store**:
   ```bash
   # This retrieves configuration values from SSM and creates a .env file
   cd frontend
   ../scripts/load-env.sh
   ```

7. **Build and deploy the frontend**:
   ```bash
   # This builds the React application and deploys it to S3
   npm run build:frontend
   npm run deploy:frontend
   ```

8. **Create an admin user**:
   ```bash
   # This creates an administrator user in Cognito
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id $(aws ssm get-parameter --name "/blog/auth/userPoolId" --query "Parameter.Value" --output text) \
     --username admin@example.com \
     --group-name Admins
   ```

## CI/CD Pipeline Explanation

The CI/CD pipeline automates the build and deployment process:

1. **Source Stage**: Monitors the GitHub repository for changes
   - *When changes are detected, the pipeline automatically starts*

2. **Build Stage**: Compiles and packages the application
   - *Installs dependencies using `npm install`*
   - *Builds the frontend application with `npm run build`*
   - *Runs tests to ensure code quality*

3. **Deploy Stage**: Updates the production environment
   - *Uploads built assets to the S3 website bucket*
   - *Invalidates the CloudFront cache to serve new content*
   - *Stores build artifacts in CodeArtifact for future reference*

4. **Post-Deployment**: Performs cleanup and notification
   - *Removes temporary build files*
   - *Sends deployment notifications if configured*

## Cost Optimization Strategies

This project demonstrates several cost optimization techniques:

1. **DynamoDB Provisioned Capacity with Auto-scaling**:
   - *Initial capacity: 5 read/write units (minimum to ensure performance)*
   - *Auto-scales between 5-20 units based on 70% utilization*
   - *Why: More cost-effective than on-demand for predictable workloads*
   
2. **S3 Lifecycle Management**:
   - *Media bucket: Transitions objects to Infrequent Access after 30 days*
   - *Artifact bucket: Automatically deletes objects after 30 days*
   - *Both buckets: Clean up incomplete multipart uploads after 7 days*
   - *Why: Reduces storage costs for infrequently accessed objects*
   
3. **CloudFront Price Class Optimization**:
   - *Uses PRICE_CLASS_100 (North America and Europe only)*
   - *Why: Reduces costs if your audience is primarily in these regions*

4. **CodeBuild Resource Optimization**:
   - *Uses SMALL compute type instead of MEDIUM*
   - *Why: Adequate for most builds while reducing compute costs*

5. **CloudWatch Logs Retention**:
   - *Implements one-week retention policy*
   - *Why: Balances troubleshooting needs with storage costs*

## Security Best Practices

This project implements these security best practices:

1. **Secret Management**:
   - *No hardcoded secrets in code*
   - *All configuration values stored in AWS SSM Parameter Store*
   - *Why: Prevents accidental exposure of sensitive information*

2. **Environment Variable Handling**:
   - *Sensitive values loaded from environment variables*
   - *Environment variables populated from secure sources*
   - *Why: Separates configuration from code*

3. **IAM Least Privilege**:
   - *Each component has only the permissions it needs*
   - *Resource-specific policies where possible*
   - *Why: Minimizes potential damage from compromised components*

4. **HTTPS Everywhere**:
   - *All communication encrypted using HTTPS*
   - *CloudFront provides SSL/TLS termination*
   - *Why: Protects data in transit from interception*

5. **Authentication Security**:
   - *Cognito handles user authentication with proper password policies*
   - *Multi-factor authentication available*
   - *Why: Implements industry-standard authentication practices*

6. **Input Validation**:
   - *All user inputs validated before processing*
   - *API Gateway request validation*
   - *Why: Prevents injection attacks and malformed data*

7. **CI/CD Security**:
   - *GitHub tokens stored in AWS Secrets Manager*
   - *Build artifacts scanned for vulnerabilities*
   - *Why: Secures the deployment pipeline*

## Estimated Costs

For a small deployment with less than 5 users posting once per day:

- **First Year (with AWS Free Tier)**: ~$1-2 per month
  - *Many services covered by AWS Free Tier for 12 months*

- **After Free Tier**: ~$7-10 per month

Detailed cost breakdown:
- DynamoDB: ~$5.84/month (mostly covered by free tier in first year)
- S3 Storage: ~$0.05/month (assuming ~100MB of storage)
- CloudFront: ~$0.085/month (assuming ~10GB data transfer)
- Lambda Functions: ~$0.30/month (assuming ~10,000 invocations)
- Cognito: Free for first 50,000 users
- API Gateway: ~$0.35/month (assuming ~100,000 API calls)
- CloudWatch Logs: ~$0.10/month (with 1-week retention)
- CI/CD: ~$1.00/month (assuming weekly deployments)

## Learning Resources

To get the most out of this tutorial:

- **AWS Documentation**: https://docs.aws.amazon.com/
- **React Documentation**: https://reactjs.org/docs/getting-started.html
- **AWS CDK Workshop**: https://cdkworkshop.com/
- **DynamoDB Modeling**: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-modeling-nosql.html
- **Serverless Best Practices**: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html

## Getting Started

For detailed, step-by-step instructions, see the comprehensive guides in the `docs/user-guide` directory.

## Contributing

This project is designed as a learning resource. If you have suggestions for improvements or additional learning concepts to include, please submit a pull request or open an issue.

## Authors

### Bradley C. Thuringer
Software Engineer and AWS Cloud Architect who contributed to the development of this instructional guide. Bradley provided expertise in serverless architecture design, AWS infrastructure, and best practices for cloud-native applications.

### Amazon Q
Amazon Q (May 2025 version) - AI assistant developed by AWS that helped enhance this codebase with instructional comments, documentation improvements, and architectural guidance. Amazon Q provided assistance in transforming the original codebase into a comprehensive learning resource with detailed explanations of AWS serverless concepts and implementation patterns.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
