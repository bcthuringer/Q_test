#!/bin/bash

# Script to load environment variables from AWS SSM Parameter Store
# This script should be run before starting the application

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "jq is not installed. Please install it first."
    exit 1
fi

# Set the AWS region
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Get parameters from SSM Parameter Store
echo "Loading parameters from AWS SSM Parameter Store..."

# User Pool ID
USER_POOL_ID=$(aws ssm get-parameter --name "/blog/auth/userPoolId" --query "Parameter.Value" --output text --region $AWS_REGION)
if [ $? -ne 0 ]; then
    echo "Failed to get User Pool ID from SSM Parameter Store."
    exit 1
fi

# User Pool Client ID
USER_POOL_CLIENT_ID=$(aws ssm get-parameter --name "/blog/auth/userPoolClientId" --query "Parameter.Value" --output text --region $AWS_REGION)
if [ $? -ne 0 ]; then
    echo "Failed to get User Pool Client ID from SSM Parameter Store."
    exit 1
fi

# Website Bucket
WEBSITE_BUCKET=$(aws ssm get-parameter --name "/blog/storage/websiteBucket" --query "Parameter.Value" --output text --region $AWS_REGION)
if [ $? -ne 0 ]; then
    echo "Failed to get Website Bucket from SSM Parameter Store."
    exit 1
fi

# Media Bucket
MEDIA_BUCKET=$(aws ssm get-parameter --name "/blog/storage/mediaBucket" --query "Parameter.Value" --output text --region $AWS_REGION)
if [ $? -ne 0 ]; then
    echo "Failed to get Media Bucket from SSM Parameter Store."
    exit 1
fi

# CloudFront Domain
CLOUDFRONT_DOMAIN=$(aws ssm get-parameter --name "/blog/distribution/domain" --query "Parameter.Value" --output text --region $AWS_REGION)
if [ $? -ne 0 ]; then
    echo "Failed to get CloudFront Domain from SSM Parameter Store."
    exit 1
fi

# Create .env file
cat > .env << EOF
REACT_APP_AWS_REGION=$AWS_REGION
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_WEBSITE_BUCKET=$WEBSITE_BUCKET
REACT_APP_MEDIA_BUCKET=$MEDIA_BUCKET
REACT_APP_CLOUDFRONT_DOMAIN=$CLOUDFRONT_DOMAIN
EOF

echo "Environment variables loaded successfully."
echo "Created .env file with the following variables:"
echo "REACT_APP_AWS_REGION=$AWS_REGION"
echo "REACT_APP_USER_POOL_ID=$USER_POOL_ID"
echo "REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
echo "REACT_APP_WEBSITE_BUCKET=$WEBSITE_BUCKET"
echo "REACT_APP_MEDIA_BUCKET=$MEDIA_BUCKET"
echo "REACT_APP_CLOUDFRONT_DOMAIN=$CLOUDFRONT_DOMAIN"
