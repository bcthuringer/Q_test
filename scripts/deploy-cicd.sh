#!/bin/bash

# Script to deploy the CI/CD pipeline with proper secret handling
# This script helps avoid hardcoding GitHub tokens or repository information

# Check if required tools are installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Prompt for GitHub information if not provided as environment variables
if [ -z "$GITHUB_OWNER" ]; then
    read -p "Enter GitHub owner/organization name: " GITHUB_OWNER
    export GITHUB_OWNER
fi

if [ -z "$GITHUB_REPO" ]; then
    read -p "Enter GitHub repository name: " GITHUB_REPO
    export GITHUB_REPO
fi

if [ -z "$GITHUB_BRANCH" ]; then
    read -p "Enter GitHub branch name [main]: " GITHUB_BRANCH
    GITHUB_BRANCH=${GITHUB_BRANCH:-main}
    export GITHUB_BRANCH
fi

if [ -z "$GITHUB_TOKEN_SECRET_NAME" ]; then
    GITHUB_TOKEN_SECRET_NAME="github-token"
    echo "Using default GitHub token secret name: $GITHUB_TOKEN_SECRET_NAME"
    export GITHUB_TOKEN_SECRET_NAME
fi

# Check if GitHub token is provided
if [ -z "$GITHUB_TOKEN" ]; then
    echo "No GitHub token provided as GITHUB_TOKEN environment variable."
    echo "You will need to manually update the token in AWS Secrets Manager after deployment."
    
    # Deploy the GitHub secret stack without a token
    echo "Deploying GitHub secret stack..."
    cd infrastructure
    npm run deploy:github-secret
    
    echo "Please update the GitHub token in AWS Secrets Manager before proceeding."
    read -p "Press Enter to continue after updating the token..."
else
    # Deploy the GitHub secret stack with the provided token
    echo "Deploying GitHub secret stack with provided token..."
    cd infrastructure
    npm run deploy:github-secret
    cd ..
fi

# Deploy the CI/CD pipeline
echo "Deploying CI/CD pipeline..."
cd infrastructure
npm run deploy:cicd

echo "CI/CD pipeline deployment complete!"
echo "GitHub configuration:"
echo "  Owner: $GITHUB_OWNER"
echo "  Repository: $GITHUB_REPO"
echo "  Branch: $GITHUB_BRANCH"
echo "  Token Secret: $GITHUB_TOKEN_SECRET_NAME"
