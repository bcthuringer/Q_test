import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';

export class SimplifiedBlogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for frontend hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
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
    });

    // CloudFront distribution for website
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/media/*': {
          origin: new origins.S3Origin(mediaBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
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

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const blogsTable = new dynamodb.Table(this, 'BlogsTable', {
      partitionKey: { name: 'blogId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    blogsTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
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
