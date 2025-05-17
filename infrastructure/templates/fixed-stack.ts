import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class FixedBlogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for frontend hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true, // Allow public read access for website hosting
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // S3 bucket for blog media uploads
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // Add lifecycle rules for media bucket to manage storage costs
      lifecycleRules: [
        {
          // Transition objects to Infrequent Access after 30 days
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            }
          ],
          // Clean up incomplete multipart uploads
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        }
      ],
    });

    // CloudFront Origin Access Identity for media bucket
    const mediaOAI = new cloudfront.OriginAccessIdentity(this, 'MediaOAI', {
      comment: 'OAI for accessing media bucket'
    });

    // Grant read access to the media bucket for CloudFront
    mediaBucket.grantRead(mediaOAI);

    // CloudFront distribution for website
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/media/*': {
          origin: new origins.S3Origin(mediaBucket, {
            originAccessIdentity: mediaOAI
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:3000/callback', `https://${distribution.distributionDomainName}/callback`],
        logoutUrls: ['http://localhost:3000/', `https://${distribution.distributionDomainName}/`],
      },
    });

    // DynamoDB Tables with cost-optimized provisioned capacity
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    
    // Add auto-scaling to users table
    const usersReadScaling = usersTable.autoScaleReadCapacity({ 
      minCapacity: 5, 
      maxCapacity: 20 
    });
    usersReadScaling.scaleOnUtilization({ targetUtilizationPercent: 70 });
    
    const usersWriteScaling = usersTable.autoScaleWriteCapacity({ 
      minCapacity: 5, 
      maxCapacity: 20 
    });
    usersWriteScaling.scaleOnUtilization({ targetUtilizationPercent: 70 });

    const blogsTable = new dynamodb.Table(this, 'BlogsTable', {
      partitionKey: { name: 'blogId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    
    // Add auto-scaling to blogs table
    const blogsReadScaling = blogsTable.autoScaleReadCapacity({ 
      minCapacity: 5, 
      maxCapacity: 20 
    });
    blogsReadScaling.scaleOnUtilization({ targetUtilizationPercent: 70 });
    
    const blogsWriteScaling = blogsTable.autoScaleWriteCapacity({ 
      minCapacity: 5, 
      maxCapacity: 20 
    });
    blogsWriteScaling.scaleOnUtilization({ targetUtilizationPercent: 70 });

    blogsTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add CloudWatch Logs retention policy
    const logGroup = new logs.LogGroup(this, 'BlogAppLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK, // Set log retention to one week
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Store configuration values in SSM Parameter Store
    new ssm.StringParameter(this, 'UserPoolIdParameter', {
      parameterName: '/blog/auth/userPoolId',
      stringValue: userPool.userPoolId,
      description: 'Cognito User Pool ID for the blog application',
    });

    new ssm.StringParameter(this, 'UserPoolClientIdParameter', {
      parameterName: '/blog/auth/userPoolClientId',
      stringValue: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID for the blog application',
    });

    new ssm.StringParameter(this, 'WebsiteBucketParameter', {
      parameterName: '/blog/storage/websiteBucket',
      stringValue: websiteBucket.bucketName,
      description: 'S3 bucket name for website hosting',
    });

    new ssm.StringParameter(this, 'MediaBucketParameter', {
      parameterName: '/blog/storage/mediaBucket',
      stringValue: mediaBucket.bucketName,
      description: 'S3 bucket name for media storage',
    });

    new ssm.StringParameter(this, 'CloudFrontDomainParameter', {
      parameterName: '/blog/distribution/domain',
      stringValue: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    // Store CloudFront distribution ID for invalidations
    new ssm.StringParameter(this, 'CloudFrontDistributionIdParameter', {
      parameterName: '/blog/distribution/id',
      stringValue: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: mediaBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
  }
}
