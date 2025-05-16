# CI/CD Pipeline Setup Guide

This guide explains how to set up and use the CI/CD pipeline for the Q_Blog project.

## Architecture

The CI/CD pipeline consists of:

1. **GitHub Repository**: Source code repository
2. **AWS CodePipeline**: Orchestrates the CI/CD workflow
3. **AWS CodeBuild**: Builds and tests the application
4. **AWS CodeArtifact**: Stores build artifacts
5. **AWS S3**: Hosts the frontend application
6. **AWS CloudFront**: Distributes the frontend application

## Prerequisites

Before setting up the CI/CD pipeline, ensure you have:

1. An AWS account with appropriate permissions
2. A GitHub account with a personal access token
3. The Q_Blog repository cloned locally
4. AWS CLI installed and configured
5. AWS CDK installed globally (`npm install -g aws-cdk`)

## Setup Steps

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Click "Generate new token"
3. Give it a name like "Q_Blog CI/CD"
4. Select the following scopes:
   - `repo` (all)
   - `admin:repo_hook`
5. Click "Generate token"
6. Copy the token (you'll need it in the next step)

### 2. Store GitHub Token in AWS Secrets Manager

Deploy the GitHub secret stack:

```bash
cd infrastructure
npm run deploy:github-secret
```

Then update the secret value in AWS Secrets Manager:

1. Go to AWS Secrets Manager console
2. Find the secret named "github-token"
3. Click "Retrieve secret value"
4. Click "Edit"
5. Replace the placeholder value with your actual GitHub token
6. Click "Save"

### 3. Deploy the CI/CD Pipeline

```bash
cd infrastructure
npm run deploy:cicd
```

This will create:
- A CodeArtifact domain and repository
- A CodeBuild project
- A CodePipeline pipeline connected to your GitHub repository

### 4. Verify the Pipeline

1. Go to AWS CodePipeline console
2. Find the pipeline named "QBlogPipeline"
3. Verify that it has the following stages:
   - Source (GitHub)
   - Build (CodeBuild)

### 5. Trigger the Pipeline

The pipeline will automatically trigger when you push changes to the main branch of your GitHub repository. To manually trigger it:

1. Make a change to your repository
2. Commit and push the change
3. Go to the AWS CodePipeline console to monitor the pipeline execution

## Troubleshooting

### Pipeline Fails at Source Stage

- Check that your GitHub token has the correct permissions
- Verify that the token is correctly stored in AWS Secrets Manager
- Check that the repository name and owner are correct in the pipeline configuration

### Pipeline Fails at Build Stage

- Check the CodeBuild logs for errors
- Verify that the build environment has the necessary permissions
- Check that the buildspec.yml file is correctly configured

### Artifacts Not Being Stored

- Verify that the CodeArtifact domain and repository are correctly configured
- Check that the CodeBuild project has permissions to access CodeArtifact

## Customizing the Pipeline

To customize the pipeline, modify the following files:

- `infrastructure/templates/cicd-stack.ts`: Main pipeline configuration
- `buildspec.yml`: Build and deployment instructions

After making changes, redeploy the pipeline:

```bash
cd infrastructure
npm run deploy:cicd
```

## Monitoring and Logging

- **Pipeline Executions**: AWS CodePipeline console
- **Build Logs**: AWS CodeBuild console
- **Deployment Status**: AWS CloudFront console
- **Artifact Storage**: AWS CodeArtifact console
