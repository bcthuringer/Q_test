#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CICDStack } from '../templates/cicd-stack';

// Get GitHub configuration from environment variables if provided
const githubOwner = process.env.GITHUB_OWNER;
const githubRepo = process.env.GITHUB_REPO;
const githubBranch = process.env.GITHUB_BRANCH;
const githubTokenSecretName = process.env.GITHUB_TOKEN_SECRET_NAME;

const app = new cdk.App();
new CICDStack(app, 'QBlogCICDStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  description: 'CI/CD pipeline for Q_Blog application',
  // Pass GitHub configuration if available
  githubOwner,
  githubRepo,
  githubBranch,
  githubTokenSecretName,
});
