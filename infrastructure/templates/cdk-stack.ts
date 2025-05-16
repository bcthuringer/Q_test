import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class BlogServerlessStack extends cdk.Stack {
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

    // Add a pre-signup Lambda trigger to handle admin approval
    const preSignupFunction = new lambda.Function(this, 'PreSignupFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/functions/auth/pre-signup'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignupFunction);

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

    // Lambda functions for API
    const authLayer = new lambda.LayerVersion(this, 'AuthLayer', {
      code: lambda.Code.fromAsset('backend/layers/auth'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common authentication utilities',
    });

    const dbLayer = new lambda.LayerVersion(this, 'DbLayer', {
      code: lambda.Code.fromAsset('backend/layers/db'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Database utilities',
    });

    // Create API Lambda functions
    const createBlogFunction = new lambda.Function(this, 'CreateBlogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/functions/blog/create'),
      layers: [authLayer, dbLayer],
      environment: {
        BLOGS_TABLE: blogsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    const getBlogsFunction = new lambda.Function(this, 'GetBlogsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/functions/blog/list'),
      layers: [dbLayer],
      environment: {
        BLOGS_TABLE: blogsTable.tableName,
      },
    });

    const approveUserFunction = new lambda.Function(this, 'ApproveUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend/functions/admin/approve-user'),
      layers: [authLayer],
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USERS_TABLE: usersTable.tableName,
      },
    });

    // Grant permissions
    blogsTable.grantReadWriteData(createBlogFunction);
    blogsTable.grantReadData(getBlogsFunction);
    usersTable.grantReadWriteData(approveUserFunction);
    mediaBucket.grantReadWrite(createBlogFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'BlogApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'BlogApiAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Resources and Methods
    const blogsResource = api.root.addResource('blogs');
    
    blogsResource.addMethod('GET', new apigateway.LambdaIntegration(getBlogsFunction));
    
    blogsResource.addMethod('POST', new apigateway.LambdaIntegration(createBlogFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const adminResource = api.root.addResource('admin');
    const usersResource = adminResource.addResource('users');
    
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(approveUserFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
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

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
