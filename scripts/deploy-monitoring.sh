#!/bin/bash
# Script to deploy the monitoring stack for Q_Blog application
# This script deploys the CloudWatch dashboard and alarms

set -e  # Exit on error

# Display banner
echo "====================================="
echo "Q_Blog Monitoring Deployment"
echo "====================================="

# Navigate to infrastructure directory
cd "$(dirname "$0")/../infrastructure"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
  echo "Error: AWS CLI is not configured. Please run 'aws configure' first."
  exit 1
fi

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION=$(aws configure get region)

echo "Deploying monitoring stack to account $AWS_ACCOUNT in region $AWS_REGION..."

# Deploy the monitoring stack
npx cdk deploy Q-Blog-MonitoringStack --require-approval never

echo "====================================="
echo "Monitoring deployment complete!"
echo "====================================="
echo "Access your dashboard at:"
echo "https://$AWS_REGION.console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=Q_Blog-Operational-Dashboard"
echo "====================================="
