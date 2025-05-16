#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BlogServerlessStack } from '../templates/cdk-stack';

const app = new cdk.App();
new BlogServerlessStack(app, 'BlogServerlessStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  description: 'Serverless blog platform with user authentication and admin approval',
});
