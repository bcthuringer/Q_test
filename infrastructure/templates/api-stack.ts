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
    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this, '/blog/auth/userPoolId'
    );
    
    const mediaBucketName = ssm.StringParameter.valueForStringParameter(
      this, '/blog/storage/mediaBucket'
    );

    // Create DynamoDB tables
    const blogsTable = new dynamodb.Table(this, 'BlogsTable', {
      partitionKey: { name: 'blogId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Add GSI for querying by userId
    blogsTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Get the media bucket
    const mediaBucket = s3.Bucket.fromBucketName(
      this, 'MediaBucket', mediaBucketName
    );

    // Create Cognito authorizer
    const userPool = cognito.UserPool.fromUserPoolId(
      this, 'UserPool', userPoolId
    );

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'BlogApi', {
      restApiName: 'Q_Blog API',
      description: 'API for Q_Blog personal journal',
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
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'BlogApiAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Common Lambda function configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        BLOGS_TABLE: blogsTable.tableName,
        MEDIA_BUCKET: mediaBucket.bucketName,
      },
    };

    // Create Lambda functions for blog operations
    const createBlogFunction = new lambda.Function(this, 'CreateBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/create')),
    });

    const getBlogFunction = new lambda.Function(this, 'GetBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/get')),
    });

    const listBlogsFunction = new lambda.Function(this, 'ListBlogsFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/list')),
    });

    const updateBlogFunction = new lambda.Function(this, 'UpdateBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/update')),
    });

    const deleteBlogFunction = new lambda.Function(this, 'DeleteBlogFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/delete')),
    });

    const searchBlogsFunction = new lambda.Function(this, 'SearchBlogsFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/search')),
    });

    const exportBlogsFunction = new lambda.Function(this, 'ExportBlogsFunction', {
      ...lambdaConfig,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions/blog/export')),
      timeout: cdk.Duration.seconds(30), // Export might take longer
    });

    // Grant permissions to Lambda functions
    blogsTable.grantReadWriteData(createBlogFunction);
    blogsTable.grantReadData(getBlogFunction);
    blogsTable.grantReadData(listBlogsFunction);
    blogsTable.grantReadWriteData(updateBlogFunction);
    blogsTable.grantReadWriteData(deleteBlogFunction);
    blogsTable.grantReadData(searchBlogsFunction);
    blogsTable.grantReadData(exportBlogsFunction);

    mediaBucket.grantReadWrite(createBlogFunction);
    mediaBucket.grantRead(getBlogFunction);
    mediaBucket.grantReadWrite(updateBlogFunction);
    mediaBucket.grantReadWrite(deleteBlogFunction);
    mediaBucket.grantReadWrite(exportBlogsFunction);

    // Create API Gateway resources and methods
    const blogsResource = api.root.addResource('blogs');
    const blogResource = blogsResource.addResource('{blogId}');
    const searchResource = blogsResource.addResource('search');
    const exportResource = blogsResource.addResource('export');

    // Common method options with Cognito authorizer
    const methodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Add methods to resources
    blogsResource.addMethod('POST', new apigateway.LambdaIntegration(createBlogFunction), methodOptions);
    blogsResource.addMethod('GET', new apigateway.LambdaIntegration(listBlogsFunction), methodOptions);
    blogResource.addMethod('GET', new apigateway.LambdaIntegration(getBlogFunction), methodOptions);
    blogResource.addMethod('PUT', new apigateway.LambdaIntegration(updateBlogFunction), methodOptions);
    blogResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteBlogFunction), methodOptions);
    searchResource.addMethod('GET', new apigateway.LambdaIntegration(searchBlogsFunction), methodOptions);
    exportResource.addMethod('GET', new apigateway.LambdaIntegration(exportBlogsFunction), methodOptions);

    // Store API endpoint in SSM Parameter Store
    new ssm.StringParameter(this, 'ApiEndpointParameter', {
      parameterName: '/blog/api/endpoint',
      stringValue: api.url,
      description: 'API Gateway endpoint URL for the blog application',
    });

    // Outputs
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
