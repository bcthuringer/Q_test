# Serverless Blog Platform Architecture

This document outlines the architecture of the serverless blog platform.

## Overview

The application is built using a serverless architecture on AWS, consisting of:

1. **Frontend**: React.js application hosted on S3 and delivered via CloudFront
2. **Backend**: AWS Lambda functions exposed through API Gateway
3. **Authentication**: Amazon Cognito for user management and authentication
4. **Database**: Amazon DynamoDB for storing blog posts and user data
5. **Storage**: Amazon S3 for storing media files
6. **Infrastructure**: AWS CDK for infrastructure as code

## Architecture Diagram

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│             │     │               │     │              │
│   Browser   │────▶│   CloudFront  │────▶│  S3 Website  │
│             │     │               │     │              │
└─────────────┘     └───────────────┘     └──────────────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│             │     │               │     │              │
│ API Gateway │────▶│ AWS Lambda    │────▶│   DynamoDB   │
│             │     │               │     │              │
└─────────────┘     └───────────────┘     └──────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌─────────────┐     ┌───────────────┐
│             │     │               │
│   Cognito   │     │  S3 Media     │
│             │     │               │
└─────────────┘     └───────────────┘
```

## Components

### Frontend

- **React.js**: Single-page application
- **AWS Amplify**: Client library for authentication and API calls
- **S3**: Hosts the static website files
- **CloudFront**: CDN for global distribution and HTTPS

### Backend

- **API Gateway**: RESTful API endpoints
- **Lambda Functions**:
  - Authentication functions
  - Blog management functions
  - Admin functions
- **Lambda Layers**: Shared code for authentication and database operations

### Data Storage

- **DynamoDB Tables**:
  - `UsersTable`: Stores user information and approval status
  - `BlogsTable`: Stores blog posts with GSI for querying by user
- **S3 Buckets**:
  - Website bucket: Stores frontend assets
  - Media bucket: Stores blog images and attachments

### Authentication & Authorization

- **Cognito User Pool**: Manages user accounts and authentication
- **Cognito User Pool Groups**: Admin group for administrative privileges
- **Pre-signup Lambda Trigger**: Handles new user approval workflow

## Security

- **CloudFront**: Provides HTTPS and WAF protection
- **S3**: Buckets configured with appropriate access policies
- **API Gateway**: Cognito authorizers for protected endpoints
- **IAM**: Least privilege permissions for Lambda functions
- **Cognito**: Secure user authentication and authorization

## Scalability

- All components are serverless and auto-scaling
- DynamoDB can scale to handle any amount of traffic
- CloudFront provides global edge caching
- Lambda functions automatically scale with demand

## Deployment

The entire infrastructure is defined as code using AWS CDK, enabling:
- Consistent deployments
- Version control of infrastructure
- Easy replication across environments (dev, staging, prod)
- Automated testing and CI/CD integration
