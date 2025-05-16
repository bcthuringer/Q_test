#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimplifiedBlogStack } from '../templates/simplified-stack';

const app = new cdk.App();
new SimplifiedBlogStack(app, 'BlogServerlessStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  description: 'Serverless blog platform with user authentication and admin approval',
});
