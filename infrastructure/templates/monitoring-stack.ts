/**
 * Monitoring Stack for Q_Blog Serverless Application
 * 
 * This stack creates CloudWatch dashboards and alarms to provide operational
 * visibility into the serverless application components. It demonstrates how
 * to implement comprehensive monitoring for serverless architectures.
 * 
 * Learning points:
 * - Creating CloudWatch dashboards programmatically with CDK
 * - Monitoring serverless applications effectively
 * - Setting up alarms for critical metrics
 * - Organizing metrics for operational visibility
 * - Implementing observability best practices
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get resources from SSM Parameter Store
    // This allows us to reference resources created in other stacks
    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this, '/blog/auth/userPoolId'
    );
    
    const apiEndpoint = ssm.StringParameter.valueForStringParameter(
      this, '/blog/api/endpoint'
    );
    
    const blogsTableName = ssm.StringParameter.valueForStringParameter(
      this, '/blog/database/blogsTable'
    );

    // Reference existing resources
    const userPool = cognito.UserPool.fromUserPoolId(
      this, 'UserPool', userPoolId
    );
    
    const blogsTable = dynamodb.Table.fromTableName(
      this, 'BlogsTable', blogsTableName
    );

    // Create the main operational dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Q_BlogOperationalDashboard', {
      dashboardName: 'Q_Blog-Operational-Dashboard',
      // Start with the current time and show 3 hours of data by default
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    // API Gateway Metrics
    const apiGatewayWidget = new cloudwatch.GraphWidget({
      title: 'API Gateway',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: {
            ApiName: 'BlogApi',
          },
          statistic: 'Sum',
          label: 'Request Count',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiName: 'BlogApi',
          },
          statistic: 'Average',
          label: 'Latency (avg)',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiName: 'BlogApi',
          },
          statistic: 'Sum',
          label: '4XX Errors',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiName: 'BlogApi',
          },
          statistic: 'Sum',
          label: '5XX Errors',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Lambda Function Metrics
    const lambdaWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Functions',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          statistic: 'Sum',
          label: 'Invocations',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          statistic: 'Sum',
          label: 'Errors',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'Average',
          label: 'Duration (avg)',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          statistic: 'Sum',
          label: 'Throttles',
        }),
      ],
      width: 12,
      height: 6,
    });

    // DynamoDB Metrics
    const dynamoDbWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB - Blogs Table',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedReadCapacityUnits',
          dimensionsMap: {
            TableName: blogsTableName,
          },
          statistic: 'Sum',
          label: 'Read Capacity',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedWriteCapacityUnits',
          dimensionsMap: {
            TableName: blogsTableName,
          },
          statistic: 'Sum',
          label: 'Write Capacity',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ProvisionedReadCapacityUnits',
          dimensionsMap: {
            TableName: blogsTableName,
          },
          statistic: 'Average',
          label: 'Provisioned Read',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ProvisionedWriteCapacityUnits',
          dimensionsMap: {
            TableName: blogsTableName,
          },
          statistic: 'Average',
          label: 'Provisioned Write',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Cognito Metrics
    const cognitoWidget = new cloudwatch.GraphWidget({
      title: 'Cognito User Pool',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Cognito',
          metricName: 'SignUpSuccesses',
          dimensionsMap: {
            UserPool: userPoolId,
          },
          statistic: 'Sum',
          label: 'Successful Signups',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Cognito',
          metricName: 'SignInSuccesses',
          dimensionsMap: {
            UserPool: userPoolId,
          },
          statistic: 'Sum',
          label: 'Successful Logins',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/Cognito',
          metricName: 'SignUpThrottles',
          dimensionsMap: {
            UserPool: userPoolId,
          },
          statistic: 'Sum',
          label: 'Signup Throttles',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Cognito',
          metricName: 'SignInThrottles',
          dimensionsMap: {
            UserPool: userPoolId,
          },
          statistic: 'Sum',
          label: 'Login Throttles',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Text widget with operational information
    const infoWidget = new cloudwatch.TextWidget({
      markdown: `# Q_Blog Operational Dashboard
      
## Key Information
* **Environment**: ${this.stackName}
* **API Endpoint**: ${apiEndpoint}
* **User Pool ID**: ${userPoolId}
      
## Operational Notes
* DynamoDB is configured with auto-scaling between 5-20 units based on 70% utilization
* Lambda functions have a timeout of 10 seconds (30 seconds for export function)
* CloudWatch Logs retention is set to 7 days
* For detailed logs, check CloudWatch Log Groups for each Lambda function
      `,
      width: 24,
      height: 4,
    });

    // Add all widgets to the dashboard
    dashboard.addWidgets(
      infoWidget,
      apiGatewayWidget, lambdaWidget,
      dynamoDbWidget, cognitoWidget
    );

    // Create alarms for critical metrics

    // API Gateway 5XX Error Alarm
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: 'BlogApi',
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm if the API Gateway returns 5 or more 5XX errors in 5 minutes',
    });

    // Lambda Error Rate Alarm
    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorRateAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 3,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm if any Lambda function has 3 or more errors in 5 minutes',
    });

    // DynamoDB Throttling Alarm
    const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        dimensionsMap: {
          TableName: blogsTableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm if DynamoDB throttles more than 10 requests in 5 minutes',
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'URL to the CloudWatch Dashboard',
    });
  }
}
