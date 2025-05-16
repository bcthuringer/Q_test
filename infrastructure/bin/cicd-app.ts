#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CICDStack } from '../templates/cicd-stack';

const app = new cdk.App();
new CICDStack(app, 'QBlogCICDStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  description: 'CI/CD pipeline for Q_Blog application',
});
