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

## Getting Started

See the setup instructions in the docs/user-guide directory.
