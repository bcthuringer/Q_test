#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GitHubSecretStack } from '../templates/github-secret';

// Get GitHub token from environment variable if provided
const githubTokenValue = process.env.GITHUB_TOKEN;

const app = new cdk.App();
new GitHubSecretStack(app, 'QBlogGitHubSecretStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  description: 'GitHub OAuth token secret for Q_Blog CI/CD pipeline',
  // Pass the GitHub token if available
  githubTokenValue: githubTokenValue,
});
