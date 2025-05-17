/**
 * API Stack for Q_Blog Serverless Application
 * 
 * This stack defines the API Gateway, Lambda functions, and related resources
 * for the blog application. It demonstrates how to build a complete serverless
 * API using AWS CDK.
 * 
 * Learning points:
 * - Creating REST APIs with API Gateway
 * - Implementing Lambda functions for API endpoints
 * - Setting up DynamoDB tables with GSIs
 * - Configuring Cognito authorizers for secure APIs
 * - Managing permissions between AWS services
 * - Using SSM Parameter Store for configuration
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get resources from SSM Parameter Store
    // This allows us to reference resources created in other stacks
    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this, '/blog/auth/userPoolId'
    );
    
    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this, '/blog/storage/mediaBucket'
    );

    // Create DynamoDB tables
    // This table will store all blog posts with a unique blogId as the partition key
    const blogsTable = new dynamodb.Table(this, 'BlogsTable', {
      partitionKey: { name: 'blogId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand capacity for cost optimization
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent accidental deletion
      pointInTimeRecovery: true, // Enable point-in-time recovery for data protection
    });

    // Add Global Secondary Index for querying by userId
    // This allows efficient retrieval of all blogs by a specific user
    blogsTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }, // Sort by creation date
      projectionType: dynamodb.ProjectionType.ALL, // Include all attributes in the index
    });

    // Get the media bucket from its name
    // The bucket was created in another stack and we're referencing it here
    const mediaBucket = s3.Bucket.fromBucketName(
      this, 'MediaBucket', mediaBucketName
    );

    // Reference the existing Cognito User Pool
    // This user pool handles authentication for our application
    const userPool = cognito.UserPool.fromUserPoolId(
      this, 'UserPool', userPoolId
    );

    // Create API Gateway
    // This defines the REST API that clients will interact with
    const api = new apigateway.RestApi(this, 'BlogApi', {
      restApiName: 'Q_Blog API',
      description: 'API for Q_Blog personal journal',
      // Configure CORS to allow browser clients to call the API
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Create Cognito authorizer for API Gateway
    // This ensures that API calls require valid Cognito authentication
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'BlogApiAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Common Lambda function configuration
    // These settings are shared across all Lambda functions
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_16_X, // Node.js runtime version
      memorySize: 256, // Allocated memory in MB
      timeout: cdk.Duration.seconds(10), // Function timeout
      environment: {
        // Environment variables available to all functions
        BLOGS_TABLE: blogsTable.tableName,
        MEDIA_BUCKET: mediaBucket.bucketName,
      },
    };

    // Create Lambda functions for blog operations
    // Each function handles a specific API operation

    // Function to create new blog posts
    const createBlogFunction = new lambda.Function(this, 'CreateBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler', // Entry point in the code
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/create')),
    });

    // Function to retrieve a specific blog post
    const getBlogFunction = new lambda.Function(this, 'GetBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/get')),
    });

    // Function to list blog posts with filtering and pagination
    const listBlogsFunction = new lambda.Function(this, 'ListBlogsFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/list')),
    });

    // Function to update existing blog posts
    const updateBlogFunction = new lambda.Function(this, 'UpdateBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/update')),
    });

    // Function to delete blog posts
    const deleteBlogFunction = new lambda.Function(this, 'DeleteBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/delete')),
    });

    // Function to search across blog posts
    const searchBlogsFunction = new lambda.Function(this, 'SearchBlogsFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/search')),
    });

    // Function to export blog posts (e.g., to PDF or other formats)
    const exportBlogsFunction = new lambda.Function(this, 'ExportBlogsFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/export')),
      timeout: cdk.Duration.seconds(30), // Export might take longer than standard operations
    });

    // Grant permissions to Lambda functions
    // This follows the principle of least privilege by granting only necessary permissions

    // Grant permissions to the blogs table
    blogsTable.grantReadWriteData(createBlogFunction);  // Create needs read/write
    blogsTable.grantReadData(getBlogFunction);          // Get only needs read
    blogsTable.grantReadData(listBlogsFunction);        // List only needs read
    blogsTable.grantReadWriteData(updateBlogFunction);  // Update needs read/write
    blogsTable.grantReadWriteData(deleteBlogFunction);  // Delete needs read/write
    blogsTable.grantReadData(searchBlogsFunction);      // Search only needs read
    blogsTable.grantReadData(exportBlogsFunction);      // Export only needs read

    // Grant permissions to the media bucket
    mediaBucket.grantReadWrite(createBlogFunction);     // Create needs to upload images
    mediaBucket.grantRead(getBlogFunction);             // Get needs to read images
    mediaBucket.grantReadWrite(updateBlogFunction);     // Update might change images
    mediaBucket.grantReadWrite(deleteBlogFunction);     // Delete needs to remove images
    mediaBucket.grantReadWrite(exportBlogsFunction);    // Export needs to read images and possibly create temporary files

    // Create API Gateway resources and methods
    // This defines the API structure and routes
    const blogsResource = api.root.addResource('blogs');
    const blogResource = blogsResource.addResource('{blogId}');
    const searchResource = blogsResource.addResource('search');
    const exportResource = blogsResource.addResource('export');

    // Common method options with Cognito authorizer
    // This ensures all API endpoints require authentication
    const methodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Add methods to resources
    // This maps HTTP methods to Lambda functions
    blogsResource.addMethod('POST', new apigateway.LambdaIntegration(createBlogFunction), methodOptions);
    blogsResource.addMethod('GET', new apigateway.LambdaIntegration(listBlogsFunction), methodOptions);
    blogResource.addMethod('GET', new apigateway.LambdaIntegration(getBlogFunction), methodOptions);
    blogResource.addMethod('PUT', new apigateway.LambdaIntegration(updateBlogFunction), methodOptions);
    blogResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteBlogFunction), methodOptions);
    searchResource.addMethod('GET', new apigateway.LambdaIntegration(searchBlogsFunction), methodOptions);
    exportResource.addMethod('GET', new apigateway.LambdaIntegration(exportBlogsFunction), methodOptions);

    // Store API endpoint in SSM Parameter Store
    // This allows other stacks or the frontend to reference the API URL
    new ssm.StringParameter(this, 'ApiEndpointParameter', {
      parameterName: '/blog/api/endpoint',
      stringValue: api.url,
      description: 'API Gateway endpoint URL for the blog application',
    });

    // Outputs
    // These values are displayed in the CloudFormation console after deployment
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'BlogsTableName', {
      value: blogsTable.tableName,
      description: 'DynamoDB table name for blogs',
    });
  }
}
