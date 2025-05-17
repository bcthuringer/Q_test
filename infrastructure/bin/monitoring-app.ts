#!/usr/bin/env node
/**
 * Entry point for the Monitoring stack deployment
 * 
 * This file defines the CDK app and instantiates the MonitoringStack
 * which creates CloudWatch dashboards and alarms for operational visibility.
 */

import * as cdk from 'aws-cdk-lib';
import { MonitoringStack } from '../templates/monitoring-stack';

const app = new cdk.App();

// Create the monitoring stack
new MonitoringStack(app, 'Q-Blog-MonitoringStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'CloudWatch dashboards and alarms for Q_Blog application',
});
