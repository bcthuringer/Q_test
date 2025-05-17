"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiStack = void 0;
const cdk = require("aws-cdk-lib");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const s3 = require("aws-cdk-lib/aws-s3");
const cognito = require("aws-cdk-lib/aws-cognito");
const ssm = require("aws-cdk-lib/aws-ssm");
const path = require("path");
class ApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Get resources from SSM Parameter Store
        const userPoolId = ssm.StringParameter.valueForStringParameter(this, '/blog/auth/userPoolId');
        const mediaBucketName = ssm.StringParameter.valueForStringParameter(this, '/blog/storage/mediaBucket');
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
        const mediaBucket = s3.Bucket.fromBucketName(this, 'MediaBucket', mediaBucketName);
        // Create Cognito authorizer
        const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId);
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
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyx5REFBeUQ7QUFDekQsaURBQWlEO0FBRWpELHFEQUFxRDtBQUNyRCx5Q0FBeUM7QUFDekMsbURBQW1EO0FBQ25ELDJDQUEyQztBQUMzQyw2QkFBNkI7QUFFN0IsTUFBYSxRQUFTLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix5Q0FBeUM7UUFDekMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FDNUQsSUFBSSxFQUFFLHVCQUF1QixDQUM5QixDQUFDO1FBRUYsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FDakUsSUFBSSxFQUFFLDJCQUEyQixDQUNsQyxDQUFDO1FBRUYseUJBQXlCO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtZQUN2QyxtQkFBbUIsRUFBRSxJQUFJO1NBQzFCLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUs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Q0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDM0IsV0FBVyxFQUFFLCtCQUErQjtTQUM3QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEzS0QsNEJBMktDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgc3NtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gR2V0IHJlc291cmNlcyBmcm9tIFNTTSBQYXJhbWV0ZXIgU3RvcmVcbiAgICBjb25zdCB1c2VyUG9vbElkID0gc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZvclN0cmluZ1BhcmFtZXRlcihcbiAgICAgIHRoaXMsICcvYmxvZy9hdXRoL3VzZXJQb29sSWQnXG4gICAgKTtcbiAgICBcbiAgICBjb25zdCBtZWRpYUJ1Y2tldE5hbWUgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRm9yU3RyaW5nUGFyYW1ldGVyKFxuICAgICAgdGhpcywgJy9ibG9nL3N0b3JhZ2UvbWVkaWFCdWNrZXQnXG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBEeW5hbW9EQiB0YWJsZXNcbiAgICBjb25zdCBibG9nc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdCbG9nc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdibG9nSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgR1NJIGZvciBxdWVyeWluZyBieSB1c2VySWRcbiAgICBibG9nc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZEluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgIH0pO1xuXG4gICAgLy8gR2V0IHRoZSBtZWRpYSBidWNrZXRcbiAgICBjb25zdCBtZWRpYUJ1Y2tldCA9IHMzLkJ1Y2tldC5mcm9tQnVja2V0TmFtZShcbiAgICAgIHRoaXMsICdNZWRpYUJ1Y2tldCcsIG1lZGlhQnVja2V0TmFtZVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgQ29nbml0byBhdXRob3JpemVyXG4gICAgY29uc3QgdXNlclBvb2wgPSBjb2duaXRvLlVzZXJQb29sLmZyb21Vc2VyUG9vbElkKFxuICAgICAgdGhpcywgJ1VzZXJQb29sJywgdXNlclBvb2xJZFxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdCbG9nQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdRX0Jsb2cgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBRX0Jsb2cgcGVyc29uYWwgam91cm5hbCcsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gYXV0aG9yaXplciBmb3IgQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGFwaWdhdGV3YXkuQ29nbml0b1VzZXJQb29sc0F1dGhvcml6ZXIodGhpcywgJ0Jsb2dBcGlBdXRob3JpemVyJywge1xuICAgICAgY29nbml0b1VzZXJQb29sczogW3VzZXJQb29sXSxcbiAgICB9KTtcblxuICAgIC8vIENvbW1vbiBMYW1iZGEgZnVuY3Rpb24gY29uZmlndXJhdGlvblxuICAgIGNvbnN0IGxhbWJkYUNvbmZpZyA9IHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNl9YLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgQkxPR1NfVEFCTEU6IGJsb2dzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBNRURJQV9CVUNLRVQ6IG1lZGlhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgYmxvZyBvcGVyYXRpb25zXG4gICAgY29uc3QgY3JlYXRlQmxvZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlQmxvZ0Z1bmN0aW9uJywge1xuICAgICAgLi4ubGFtYmRhQ29uZmlnLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Z1bmN0aW9ucy9ibG9nL2NyZWF0ZScpKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldEJsb2dGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEJsb2dGdW5jdGlvbicsIHtcbiAgICAgIC4uLmxhbWJkYUNvbmZpZyxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vYmFja2VuZC9mdW5jdGlvbnMvYmxvZy9nZXQnKSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBsaXN0QmxvZ3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xpc3RCbG9nc0Z1bmN0aW9uJywge1xuICAgICAgLi4ubGFtYmRhQ29uZmlnLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Z1bmN0aW9ucy9ibG9nL2xpc3QnKSksXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVCbG9nRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGRhdGVCbG9nRnVuY3Rpb24nLCB7XG4gICAgICAuLi5sYW1iZGFDb25maWcsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2JhY2tlbmQvZnVuY3Rpb25zL2Jsb2cvdXBkYXRlJykpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVsZXRlQmxvZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRGVsZXRlQmxvZ0Z1bmN0aW9uJywge1xuICAgICAgLi4ubGFtYmRhQ29uZmlnLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Z1bmN0aW9ucy9ibG9nL2RlbGV0ZScpKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHNlYXJjaEJsb2dzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTZWFyY2hCbG9nc0Z1bmN0aW9uJywge1xuICAgICAgLi4ubGFtYmRhQ29uZmlnLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Z1bmN0aW9ucy9ibG9nL3NlYXJjaCcpKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGV4cG9ydEJsb2dzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdFeHBvcnRCbG9nc0Z1bmN0aW9uJywge1xuICAgICAgLi4ubGFtYmRhQ29uZmlnLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Z1bmN0aW9ucy9ibG9nL2V4cG9ydCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSwgLy8gRXhwb3J0IG1pZ2h0IHRha2UgbG9uZ2VyXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBMYW1iZGEgZnVuY3Rpb25zXG4gICAgYmxvZ3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlQmxvZ0Z1bmN0aW9uKTtcbiAgICBibG9nc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0QmxvZ0Z1bmN0aW9uKTtcbiAgICBibG9nc1RhYmxlLmdyYW50UmVhZERhdGEobGlzdEJsb2dzRnVuY3Rpb24pO1xuICAgIGJsb2dzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZUJsb2dGdW5jdGlvbik7XG4gICAgYmxvZ3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZGVsZXRlQmxvZ0Z1bmN0aW9uKTtcbiAgICBibG9nc1RhYmxlLmdyYW50UmVhZERhdGEoc2VhcmNoQmxvZ3NGdW5jdGlvbik7XG4gICAgYmxvZ3NUYWJsZS5ncmFudFJlYWREYXRhKGV4cG9ydEJsb2dzRnVuY3Rpb24pO1xuXG4gICAgbWVkaWFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoY3JlYXRlQmxvZ0Z1bmN0aW9uKTtcbiAgICBtZWRpYUJ1Y2tldC5ncmFudFJlYWQoZ2V0QmxvZ0Z1bmN0aW9uKTtcbiAgICBtZWRpYUJ1Y2tldC5ncmFudFJlYWRXcml0ZSh1cGRhdGVCbG9nRnVuY3Rpb24pO1xuICAgIG1lZGlhQnVja2V0LmdyYW50UmVhZFdyaXRlKGRlbGV0ZUJsb2dGdW5jdGlvbik7XG4gICAgbWVkaWFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZXhwb3J0QmxvZ3NGdW5jdGlvbik7XG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgcmVzb3VyY2VzIGFuZCBtZXRob2RzXG4gICAgY29uc3QgYmxvZ3NSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdibG9ncycpO1xuICAgIGNvbnN0IGJsb2dSZXNvdXJjZSA9IGJsb2dzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tibG9nSWR9Jyk7XG4gICAgY29uc3Qgc2VhcmNoUmVzb3VyY2UgPSBibG9nc1Jlc291cmNlLmFkZFJlc291cmNlKCdzZWFyY2gnKTtcbiAgICBjb25zdCBleHBvcnRSZXNvdXJjZSA9IGJsb2dzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2V4cG9ydCcpO1xuXG4gICAgLy8gQ29tbW9uIG1ldGhvZCBvcHRpb25zIHdpdGggQ29nbml0byBhdXRob3JpemVyXG4gICAgY29uc3QgbWV0aG9kT3B0aW9ucyA9IHtcbiAgICAgIGF1dGhvcml6ZXIsXG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5DT0dOSVRPLFxuICAgIH07XG5cbiAgICAvLyBBZGQgbWV0aG9kcyB0byByZXNvdXJjZXNcbiAgICBibG9nc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNyZWF0ZUJsb2dGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuICAgIGJsb2dzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihsaXN0QmxvZ3NGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuICAgIGJsb2dSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEJsb2dGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuICAgIGJsb2dSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVwZGF0ZUJsb2dGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuICAgIGJsb2dSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGRlbGV0ZUJsb2dGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuICAgIHNlYXJjaFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc2VhcmNoQmxvZ3NGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuICAgIGV4cG9ydFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZXhwb3J0QmxvZ3NGdW5jdGlvbiksIG1ldGhvZE9wdGlvbnMpO1xuXG4gICAgLy8gU3RvcmUgQVBJIGVuZHBvaW50IGluIFNTTSBQYXJhbWV0ZXIgU3RvcmVcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQXBpRW5kcG9pbnRQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiAnL2Jsb2cvYXBpL2VuZHBvaW50JyxcbiAgICAgIHN0cmluZ1ZhbHVlOiBhcGkudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBlbmRwb2ludCBVUkwgZm9yIHRoZSBibG9nIGFwcGxpY2F0aW9uJyxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgZW5kcG9pbnQgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCbG9nc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBibG9nc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgbmFtZSBmb3IgYmxvZ3MnLFxuICAgIH0pO1xuICB9XG59XG4iXX0=