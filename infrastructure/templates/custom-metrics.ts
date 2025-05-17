/**
 * Custom Metrics Helper for Q_Blog Serverless Application
 * 
 * This module provides utility functions for publishing custom metrics
 * to CloudWatch from Lambda functions. It can be used as a Lambda layer
 * to standardize metrics collection across all functions.
 * 
 * Learning points:
 * - Creating custom CloudWatch metrics from Lambda functions
 * - Using Lambda layers for shared code
 * - Implementing standardized observability patterns
 * - Tracking business metrics alongside technical metrics
 */

import * as AWS from 'aws-sdk';

// Initialize CloudWatch client
const cloudWatch = new AWS.CloudWatch();

// Namespace for all Q_Blog custom metrics
const METRIC_NAMESPACE = 'Q_Blog';

/**
 * Publishes a custom metric to CloudWatch
 * 
 * @param metricName - Name of the metric
 * @param value - Value to record
 * @param unit - CloudWatch metric unit (default: Count)
 * @param dimensions - Optional dimensions for the metric
 */
export async function publishMetric(
  metricName: string,
  value: number,
  unit: AWS.CloudWatch.StandardUnit = 'Count',
  dimensions?: AWS.CloudWatch.Dimension[]
): Promise<void> {
  try {
    await cloudWatch.putMetricData({
      Namespace: METRIC_NAMESPACE,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Dimensions: dimensions || [],
          Timestamp: new Date()
        }
      ]
    }).promise();
    
    console.log(`Published metric ${metricName} with value ${value}`);
  } catch (error) {
    // Log error but don't fail the function
    console.error(`Error publishing metric ${metricName}:`, error);
  }
}

/**
 * Blog post metrics
 */
export const BlogMetrics = {
  /**
   * Records a blog post creation
   * @param userId - ID of the user creating the post
   */
  recordPostCreation: async (userId: string): Promise<void> => {
    await publishMetric('BlogPostCreations', 1, 'Count', [
      { Name: 'UserId', Value: userId }
    ]);
  },
  
  /**
   * Records a blog post view
   * @param blogId - ID of the blog post being viewed
   */
  recordPostView: async (blogId: string): Promise<void> => {
    await publishMetric('BlogPostViews', 1, 'Count', [
      { Name: 'BlogId', Value: blogId }
    ]);
  },
  
  /**
   * Records image upload size
   * @param sizeBytes - Size of the uploaded image in bytes
   */
  recordImageUpload: async (sizeBytes: number): Promise<void> => {
    await publishMetric('ImageUploadSize', sizeBytes, 'Bytes');
  }
};

/**
 * User metrics
 */
export const UserMetrics = {
  /**
   * Records a new user registration
   */
  recordRegistration: async (): Promise<void> => {
    await publishMetric('UserRegistrations', 1);
  },
  
  /**
   * Records a user login
   */
  recordLogin: async (): Promise<void> => {
    await publishMetric('UserLogins', 1);
  },
  
  /**
   * Records a user approval by admin
   */
  recordUserApproval: async (): Promise<void> => {
    await publishMetric('UserApprovals', 1);
  }
};

/**
 * API metrics
 */
export const ApiMetrics = {
  /**
   * Records API latency
   * @param apiPath - API path (e.g., /blogs, /blogs/{id})
   * @param latencyMs - Latency in milliseconds
   */
  recordLatency: async (apiPath: string, latencyMs: number): Promise<void> => {
    await publishMetric('ApiLatency', latencyMs, 'Milliseconds', [
      { Name: 'Path', Value: apiPath }
    ]);
  },
  
  /**
   * Records API request
   * @param apiPath - API path
   * @param statusCode - HTTP status code
   */
  recordRequest: async (apiPath: string, statusCode: number): Promise<void> => {
    await publishMetric('ApiRequests', 1, 'Count', [
      { Name: 'Path', Value: apiPath },
      { Name: 'StatusCode', Value: statusCode.toString() }
    ]);
  }
};

/**
 * Helper function to time an async operation and record its latency
 * 
 * @param apiPath - API path for the metric dimension
 * @param operation - Async function to time
 * @returns The result of the operation
 */
export async function timeOperation<T>(apiPath: string, operation: () => Promise<T>): Promise<T> {
  const startTime = Date.now();
  try {
    return await operation();
  } finally {
    const latency = Date.now() - startTime;
    // Don't await this to avoid adding latency to the response
    ApiMetrics.recordLatency(apiPath, latency).catch(err => 
      console.error('Failed to record latency metric:', err)
    );
  }
}
