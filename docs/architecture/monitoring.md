# Monitoring and Observability Guide

This document outlines the monitoring and observability strategy for the Q_Blog serverless application. It explains how to use CloudWatch dashboards, metrics, and alarms to gain operational visibility into the application.

## Monitoring Architecture

The Q_Blog application implements a comprehensive monitoring strategy with these components:

1. **CloudWatch Dashboards**: Centralized visualization of key metrics
2. **Custom Metrics**: Business and technical metrics published from Lambda functions
3. **CloudWatch Alarms**: Automated alerting for critical thresholds
4. **CloudWatch Logs**: Centralized logging with structured formats
5. **X-Ray Tracing**: End-to-end request tracing (optional enhancement)

## CloudWatch Dashboard

The main operational dashboard provides visibility into all components of the application:

- **API Gateway Metrics**: Request counts, latency, and error rates
- **Lambda Function Metrics**: Invocations, errors, duration, and throttles
- **DynamoDB Metrics**: Read/write capacity consumption and provisioning
- **Cognito Metrics**: User signups, logins, and authentication events
- **Custom Business Metrics**: Blog post creation, views, and user activity

## Custom Metrics

The application publishes these custom metrics to CloudWatch:

### Blog Post Metrics
- `BlogPostCreations`: Count of new blog posts created
- `BlogPostViews`: Count of blog post views
- `ContentLength`: Size of blog post content in bytes
- `ImageUploads`: Count of images uploaded
- `ImageUploadSize`: Size of uploaded images in bytes

### User Metrics
- `UserRegistrations`: Count of new user registrations
- `UserLogins`: Count of user logins
- `UserApprovals`: Count of users approved by admins

### API Metrics
- `ApiLatency`: Latency of API requests in milliseconds
- `ApiRequests`: Count of API requests by path and status code
- `ProcessingTime`: Time taken to process requests in milliseconds

## CloudWatch Alarms

Critical alarms are configured to alert on these conditions:

1. **API Gateway 5XX Errors**: More than 5 errors in 5 minutes
2. **Lambda Function Errors**: More than 3 errors in 5 minutes
3. **DynamoDB Throttling**: More than 10 throttled requests in 5 minutes

## Implementing Monitoring

### Deploying the Monitoring Stack

The monitoring infrastructure is defined in the `MonitoringStack` class and can be deployed using:

```bash
cd infrastructure
npm run deploy:monitoring
```

This will create:
- CloudWatch dashboard
- CloudWatch alarms
- IAM permissions for publishing metrics

### Publishing Custom Metrics

Lambda functions publish custom metrics using the CloudWatch API:

```javascript
// Example of publishing a custom metric
await cloudwatch.putMetricData({
  Namespace: 'Q_Blog',
  MetricData: [{
    MetricName: 'BlogPostCreations',
    Value: 1,
    Unit: 'Count',
    Dimensions: [
      { Name: 'UserId', Value: userId }
    ],
    Timestamp: new Date()
  }]
}).promise();
```

For convenience, the `custom-metrics.ts` module provides helper functions for publishing metrics consistently across all Lambda functions.

### Accessing the Dashboard

After deployment, you can access the dashboard at:
```
https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#dashboards:name=Q_Blog-Operational-Dashboard
```

## Best Practices

1. **Metric Dimensions**: Use dimensions to segment metrics (by user, API path, etc.)
2. **Metric Namespaces**: Use consistent namespaces (`Q_Blog`) for all custom metrics
3. **Error Handling**: Publish metrics in try/catch blocks to avoid affecting the main function
4. **Metric Granularity**: Balance detail with cost (more metrics = higher CloudWatch costs)
5. **Dashboard Organization**: Group related metrics together for easier analysis

## Cost Considerations

CloudWatch metrics and dashboards incur costs:

- **Custom Metrics**: $0.30 per metric per month
- **Dashboard**: $3.00 per dashboard per month
- **API Calls**: $0.01 per 1,000 PutMetricData API calls

To optimize costs:
- Limit custom metrics to essential business and operational metrics
- Use dimensions judiciously
- Consider aggregating metrics where appropriate

## Troubleshooting

If metrics aren't appearing in the dashboard:

1. Check Lambda function permissions (IAM role needs `cloudwatch:PutMetricData`)
2. Verify the metric namespace matches what's expected in the dashboard
3. Ensure metrics are being published with the correct dimensions
4. Check CloudWatch Logs for any errors in the metric publishing code

## Future Enhancements

Consider these enhancements to improve monitoring:

1. **X-Ray Integration**: Enable X-Ray tracing for end-to-end request visibility
2. **Metric Filters**: Create metric filters from CloudWatch Logs
3. **Anomaly Detection**: Set up CloudWatch anomaly detection for key metrics
4. **Cross-Account Monitoring**: Centralize monitoring across multiple environments
