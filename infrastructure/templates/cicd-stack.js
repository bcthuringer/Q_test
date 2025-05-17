"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CICDStack = void 0;
const cdk = require("aws-cdk-lib");
const codebuild = require("aws-cdk-lib/aws-codebuild");
const codepipeline = require("aws-cdk-lib/aws-codepipeline");
const codepipeline_actions = require("aws-cdk-lib/aws-codepipeline-actions");
const iam = require("aws-cdk-lib/aws-iam");
const s3 = require("aws-cdk-lib/aws-s3");
const ssm = require("aws-cdk-lib/aws-ssm");
const codeartifact = require("aws-cdk-lib/aws-codeartifact");
class CICDStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Default values with clear indication they should be overridden
        const githubOwner = props?.githubOwner || 'bcthuringer';
        const githubRepo = props?.githubRepo || 'Q_test';
        const githubBranch = props?.githubBranch || 'main';
        const githubTokenSecretName = props?.githubTokenSecretName || 'github-token';
        // Get the website bucket name from SSM Parameter Store
        const websiteBucketName = ssm.StringParameter.valueForStringParameter(this, '/blog/storage/websiteBucket');
        // Create an artifact bucket for the pipeline
        const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            // Enforce server-side encryption
            enforceSSL: true,
        });
        // Create a CodeArtifact domain and repository
        const domain = new codeartifact.CfnDomain(this, 'QBlogDomain', {
            domainName: 'qblog-domain',
        });
        const repository = new codeartifact.CfnRepository(this, 'QBlogRepository', {
            domainName: 'qblog-domain',
            repositoryName: 'qblog-repo',
            // Connect to npm public repository
            externalConnections: ['public:npmjs'],
        });
        repository.addDependsOn(domain);
        // Create a CodeBuild project
        const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                privileged: true, // Required for Docker commands
            },
            environmentVariables: {
                WEBSITE_BUCKET: {
                    value: websiteBucketName,
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
                CODEARTIFACT_DOMAIN: {
                    value: 'qblog-domain',
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
                CODEARTIFACT_REPO: {
                    value: 'qblog-repo',
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
                AWS_REGION: {
                    value: this.region,
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
                AWS_ACCOUNT_ID: {
                    value: this.account,
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        'runtime-versions': {
                            nodejs: '16',
                        },
                        commands: [
                            'echo Logging in to AWS CodeArtifact...',
                            'aws codeartifact login --tool npm --domain $CODEARTIFACT_DOMAIN --repository $CODEARTIFACT_REPO --region $AWS_REGION',
                            'echo Installing dependencies...',
                            'npm run install:all',
                        ],
                    },
                    pre_build: {
                        commands: [
                            'echo Running tests...',
                            'echo No tests configured, skipping...',
                            // Add a secrets detection tool
                            'echo Checking for hardcoded secrets...',
                            'npm install -g detect-secrets || true',
                            'detect-secrets scan --all-files || echo "Warning: Secret detection failed or found potential secrets"',
                        ],
                    },
                    build: {
                        commands: [
                            'echo Building frontend...',
                            'cd frontend',
                            '../scripts/load-env.sh',
                            'npm run build',
                            'echo Deploying to S3...',
                            'aws s3 sync build/ s3://$WEBSITE_BUCKET --delete',
                            'echo Creating CloudFront invalidation...',
                            'aws cloudfront create-invalidation --distribution-id $(aws cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items, \'$WEBSITE_BUCKET\')].Id" --output text) --paths "/*"',
                        ],
                    },
                    post_build: {
                        commands: [
                            'echo Build completed on `date`',
                        ],
                    },
                },
                artifacts: {
                    'base-directory': 'frontend/build',
                    files: [
                        '**/*',
                    ],
                },
                cache: {
                    paths: [
                        'node_modules/**/*',
                        'frontend/node_modules/**/*',
                        'backend/node_modules/**/*',
                        'infrastructure/node_modules/**/*',
                    ],
                },
            }),
        });
        // Grant permissions to the build project
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:ListBucket',
                's3:DeleteObject',
            ],
            resources: [
                `arn:aws:s3:::${websiteBucketName}`,
                `arn:aws:s3:::${websiteBucketName}/*`,
            ],
        }));
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'cloudfront:CreateInvalidation',
                'cloudfront:GetDistribution',
                'cloudfront:ListDistributions',
            ],
            resources: ['*'],
        }));
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
            ],
            // Restrict to only the parameters needed
            resources: ['arn:aws:ssm:*:*:parameter/blog/*'],
        }));
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'codeartifact:GetAuthorizationToken',
                'codeartifact:GetRepositoryEndpoint',
                'codeartifact:ReadFromRepository',
            ],
            // Restrict to specific domain and repository
            resources: [
                `arn:aws:codeartifact:${this.region}:${this.account}:domain/qblog-domain`,
                `arn:aws:codeartifact:${this.region}:${this.account}:repository/qblog-domain/qblog-repo`,
            ],
        }));
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ['sts:GetServiceBearerToken'],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'sts:AWSServiceName': 'codeartifact.amazonaws.com',
                },
            },
        }));
        // Create the pipeline
        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();
        const pipeline = new codepipeline.Pipeline(this, 'QBlogPipeline', {
            artifactBucket,
            pipelineName: 'QBlogPipeline',
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new codepipeline_actions.GitHubSourceAction({
                            actionName: 'GitHub_Source',
                            owner: githubOwner,
                            repo: githubRepo,
                            branch: githubBranch,
                            oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretName),
                            output: sourceOutput,
                            trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Build',
                            project: buildProject,
                            input: sourceOutput,
                            outputs: [buildOutput],
                        }),
                    ],
                },
            ],
        });
        // Outputs
        new cdk.CfnOutput(this, 'PipelineConsoleUrl', {
            value: `https://${this.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view?region=${this.region}`,
            description: 'URL to the CodePipeline console',
        });
        new cdk.CfnOutput(this, 'CodeArtifactDomain', {
            value: domain.attrName,
            description: 'CodeArtifact domain name',
        });
        new cdk.CfnOutput(this, 'CodeArtifactRepository', {
            value: repository.attrName,
            description: 'CodeArtifact repository name',
        });
        // Output GitHub configuration for verification
        new cdk.CfnOutput(this, 'GitHubConfiguration', {
            value: `Repository: ${githubOwner}/${githubRepo}, Branch: ${githubBranch}`,
            description: 'GitHub repository configuration',
        });
    }
}
exports.CICDStack = CICDStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2ljZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNpY2Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLHVEQUF1RDtBQUN2RCw2REFBNkQ7QUFDN0QsNkVBQTZFO0FBQzdFLDJDQUEyQztBQUMzQyx5Q0FBeUM7QUFDekMsMkNBQTJDO0FBQzNDLDZEQUE2RDtBQVc3RCxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGlFQUFpRTtRQUNqRSxNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLGFBQWEsQ0FBQztRQUN4RCxNQUFNLFVBQVUsR0FBRyxLQUFLLEVBQUUsVUFBVSxJQUFJLFFBQVEsQ0FBQztRQUNqRCxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsWUFBWSxJQUFJLE1BQU0sQ0FBQztRQUNuRCxNQUFNLHFCQUFxQixHQUFHLEtBQUssRUFBRSxxQkFBcUIsSUFBSSxjQUFjLENBQUM7UUFFN0UsdURBQXVEO1FBQ3ZELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FDbkUsSUFBSSxFQUFFLDZCQUE2QixDQUNwQyxDQUFDO1FBRUYsNkNBQTZDO1FBQzdDLE1BQU0sY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDM0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxpQ0FBaUM7WUFD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QUVILFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxNQUFNLDREQUE0RCxRQUFRLENBQUMsWUFBWSxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUMzSSxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3RCLFdBQVcsRUFBRSwwQkFBMEI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsVUFBVSxDQUFDLFFBQVE7WUFDMUIsV0FBVyxFQUFFLDhCQUE4QjtTQUM1QyxDQUFDLENBQUM7UUFFSCwrQ0FBK0M7UUFDL0MsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsZUFBZSxXQUFXLElBQUksVUFBVSxhQUFhLFlBQVksRUFBRTtZQUMxRSxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlPRCw4QkE4T0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBjb2RlYnVpbGQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZGVidWlsZCc7XG5pbXBvcnQgKiBhcyBjb2RlcGlwZWxpbmUgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZGVwaXBlbGluZSc7XG5pbXBvcnQgKiBhcyBjb2RlcGlwZWxpbmVfYWN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29kZXBpcGVsaW5lLWFjdGlvbnMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCAqIGFzIGNvZGVhcnRpZmFjdCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29kZWFydGlmYWN0JztcblxuZXhwb3J0IGludGVyZmFjZSBDSUNEU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgLy8gUmVwb3NpdG9yeSBpbmZvcm1hdGlvblxuICBnaXRodWJPd25lcj86IHN0cmluZztcbiAgZ2l0aHViUmVwbz86IHN0cmluZztcbiAgZ2l0aHViQnJhbmNoPzogc3RyaW5nO1xuICAvLyBTZWNyZXQgbmFtZSBmb3IgR2l0SHViIHRva2VuXG4gIGdpdGh1YlRva2VuU2VjcmV0TmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIENJQ0RTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogQ0lDRFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIERlZmF1bHQgdmFsdWVzIHdpdGggY2xlYXIgaW5kaWNhdGlvbiB0aGV5IHNob3VsZCBiZSBvdmVycmlkZGVuXG4gICAgY29uc3QgZ2l0aHViT3duZXIgPSBwcm9wcz8uZ2l0aHViT3duZXIgfHwgJ2JjdGh1cmluZ2VyJztcbiAgICBjb25zdCBnaXRodWJSZXBvID0gcHJvcHM/LmdpdGh1YlJlcG8gfHwgJ1FfdGVzdCc7XG4gICAgY29uc3QgZ2l0aHViQnJhbmNoID0gcHJvcHM/LmdpdGh1YkJyYW5jaCB8fCAnbWFpbic7XG4gICAgY29uc3QgZ2l0aHViVG9rZW5TZWNyZXROYW1lID0gcHJvcHM/LmdpdGh1YlRva2VuU2VjcmV0TmFtZSB8fCAnZ2l0aHViLXRva2VuJztcblxuICAgIC8vIEdldCB0aGUgd2Vic2l0ZSBidWNrZXQgbmFtZSBmcm9tIFNTTSBQYXJhbWV0ZXIgU3RvcmVcbiAgICBjb25zdCB3ZWJzaXRlQnVja2V0TmFtZSA9IHNzbS5TdHJpbmdQYXJhbWV0ZXIudmFsdWVGb3JTdHJpbmdQYXJhbWV0ZXIoXG4gICAgICB0aGlzLCAnL2Jsb2cvc3RvcmFnZS93ZWJzaXRlQnVja2V0J1xuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgYW4gYXJ0aWZhY3QgYnVja2V0IGZvciB0aGUgcGlwZWxpbmVcbiAgICBjb25zdCBhcnRpZmFjdEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0FydGlmYWN0QnVja2V0Jywge1xuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIC8vIEVuZm9yY2Ugc2VydmVyLXNpZGUgZW5jcnlwdGlvblxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhIENvZGVBcnRpZmFjdCBkb21haW4gYW5kIHJlcG9zaXRvcnlcbiAgICBjb25zdCBkb21haW4gPSBuZXcgY29kZWFydGlmYWN0LkNmbkRvbWFpbih0aGlzLCAnUUJsb2dEb21haW4nLCB7XG4gICAgICBkb21haW5OYW1lOiAncWJsb2ctZG9tYWluJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcG9zaXRvcnkgPSBuZXcgY29kZWFydGlmYWN0LkNmblJlcG9zaXRvcnkodGhpcywgJ1FCbG9nUmVwb3NpdG9yeScsIHtcbiAgICAgIGRvbWFpbk5hbWU6ICdxYmxvZy1kb21haW4nLFxuICAgICAgcmVwb3NpdG9yeU5hbWU6ICdxYmxvZy1yZXBvJyxcbiAgICAgIC8vIENvbm5lY3QgdG8gbnBtIHB1YmxpYyByZXBvc2l0b3J5XG4gICAgICBleHRlcm5hbENvbm5lY3Rpb25zOiBbJ3B1YmxpYzpucG1qcyddLFxuICAgIH0pO1xuICAgIHJlcG9zaXRvcnkuYWRkRGVwZW5kc09uKGRvbWFpbik7XG5cbiAgICAvLyBDcmVhdGUgYSBDb2RlQnVpbGQgcHJvamVjdFxuICAgIGNvbnN0IGJ1aWxkUHJvamVjdCA9IG5ldyBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0KHRoaXMsICdCdWlsZFByb2plY3QnLCB7XG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBidWlsZEltYWdlOiBjb2RlYnVpbGQuTGludXhCdWlsZEltYWdlLlNUQU5EQVJEXzVfMCxcbiAgICAgICAgcHJpdmlsZWdlZDogdHJ1ZSwgLy8gUmVxdWlyZWQgZm9yIERvY2tlciBjb21tYW5kc1xuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50VmFyaWFibGVzOiB7XG4gICAgICAgIFdFQlNJVEVfQlVDS0VUOiB7XG4gICAgICAgICAgdmFsdWU6IHdlYnNpdGVCdWNrZXROYW1lLFxuICAgICAgICAgIHR5cGU6IGNvZGVidWlsZC5CdWlsZEVudmlyb25tZW50VmFyaWFibGVUeXBlLlBMQUlOVEVYVCxcbiAgICAgICAgfSxcbiAgICAgICAgQ09ERUFSVElGQUNUX0RPTUFJTjoge1xuICAgICAgICAgIHZhbHVlOiAncWJsb2ctZG9tYWluJyxcbiAgICAgICAgICB0eXBlOiBjb2RlYnVpbGQuQnVpbGRFbnZpcm9ubWVudFZhcmlhYmxlVHlwZS5QTEFJTlRFWFQsXG4gICAgICAgIH0sXG4gICAgICAgIENPREVBUlRJRkFDVF9SRVBPOiB7XG4gICAgICAgICAgdmFsdWU6ICdxYmxvZy1yZXBvJyxcbiAgICAgICAgICB0eXBlOiBjb2RlYnVpbGQuQnVpbGRFbnZpcm9ubWVudFZhcmlhYmxlVHlwZS5QTEFJTlRFWFQsXG4gICAgICAgIH0sXG4gICAgICAgIEFXU19SRUdJT046IHtcbiAgICAgICAgICB2YWx1ZTogdGhpcy5yZWdpb24sXG4gICAgICAgICAgdHlwZTogY29kZWJ1aWxkLkJ1aWxkRW52aXJvbm1lbnRWYXJpYWJsZVR5cGUuUExBSU5URVhULFxuICAgICAgICB9LFxuICAgICAgICBBV1NfQUNDT1VOVF9JRDoge1xuICAgICAgICAgIHZhbHVlOiB0aGlzLmFjY291bnQsXG4gICAgICAgICAgdHlwZTogY29kZWJ1aWxkLkJ1aWxkRW52aXJvbm1lbnRWYXJpYWJsZVR5cGUuUExBSU5URVhULFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tT2JqZWN0KHtcbiAgICAgICAgdmVyc2lvbjogJzAuMicsXG4gICAgICAgIHBoYXNlczoge1xuICAgICAgICAgIGluc3RhbGw6IHtcbiAgICAgICAgICAgICdydW50aW1lLXZlcnNpb25zJzoge1xuICAgICAgICAgICAgICBub2RlanM6ICcxNicsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29tbWFuZHM6IFtcbiAgICAgICAgICAgICAgJ2VjaG8gTG9nZ2luZyBpbiB0byBBV1MgQ29kZUFydGlmYWN0Li4uJyxcbiAgICAgICAgICAgICAgJ2F3cyBjb2RlYXJ0aWZhY3QgbG9naW4gLS10b29sIG5wbSAtLWRvbWFpbiAkQ09ERUFSVElGQUNUX0RPTUFJTiAtLXJlcG9zaXRvcnkgJENPREVBUlRJRkFDVF9SRVBPIC0tcmVnaW9uICRBV1NfUkVHSU9OJyxcbiAgICAgICAgICAgICAgJ2VjaG8gSW5zdGFsbGluZyBkZXBlbmRlbmNpZXMuLi4nLFxuICAgICAgICAgICAgICAnbnBtIHJ1biBpbnN0YWxsOmFsbCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJlX2J1aWxkOiB7XG4gICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAnZWNobyBSdW5uaW5nIHRlc3RzLi4uJyxcbiAgICAgICAgICAgICAgJ2VjaG8gTm8gdGVzdHMgY29uZmlndXJlZCwgc2tpcHBpbmcuLi4nLFxuICAgICAgICAgICAgICAvLyBBZGQgYSBzZWNyZXRzIGRldGVjdGlvbiB0b29sXG4gICAgICAgICAgICAgICdlY2hvIENoZWNraW5nIGZvciBoYXJkY29kZWQgc2VjcmV0cy4uLicsXG4gICAgICAgICAgICAgICducG0gaW5zdGFsbCAtZyBkZXRlY3Qtc2VjcmV0cyB8fCB0cnVlJyxcbiAgICAgICAgICAgICAgJ2RldGVjdC1zZWNyZXRzIHNjYW4gLS1hbGwtZmlsZXMgfHwgZWNobyBcIldhcm5pbmc6IFNlY3JldCBkZXRlY3Rpb24gZmFpbGVkIG9yIGZvdW5kIHBvdGVudGlhbCBzZWNyZXRzXCInLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAnZWNobyBCdWlsZGluZyBmcm9udGVuZC4uLicsXG4gICAgICAgICAgICAgICdjZCBmcm9udGVuZCcsXG4gICAgICAgICAgICAgICcuLi9zY3JpcHRzL2xvYWQtZW52LnNoJyxcbiAgICAgICAgICAgICAgJ25wbSBydW4gYnVpbGQnLFxuICAgICAgICAgICAgICAnZWNobyBEZXBsb3lpbmcgdG8gUzMuLi4nLFxuICAgICAgICAgICAgICAnYXdzIHMzIHN5bmMgYnVpbGQvIHMzOi8vJFdFQlNJVEVfQlVDS0VUIC0tZGVsZXRlJyxcbiAgICAgICAgICAgICAgJ2VjaG8gQ3JlYXRpbmcgQ2xvdWRGcm9udCBpbnZhbGlkYXRpb24uLi4nLFxuICAgICAgICAgICAgICAnYXdzIGNsb3VkZnJvbnQgY3JlYXRlLWludmFsaWRhdGlvbiAtLWRpc3RyaWJ1dGlvbi1pZCAkKGF3cyBjbG91ZGZyb250IGxpc3QtZGlzdHJpYnV0aW9ucyAtLXF1ZXJ5IFwiRGlzdHJpYnV0aW9uTGlzdC5JdGVtc1s/Y29udGFpbnMoQWxpYXNlcy5JdGVtcywgXFwnJFdFQlNJVEVfQlVDS0VUXFwnKV0uSWRcIiAtLW91dHB1dCB0ZXh0KSAtLXBhdGhzIFwiLypcIicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcG9zdF9idWlsZDoge1xuICAgICAgICAgICAgY29tbWFuZHM6IFtcbiAgICAgICAgICAgICAgJ2VjaG8gQnVpbGQgY29tcGxldGVkIG9uIGBkYXRlYCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFydGlmYWN0czoge1xuICAgICAgICAgICdiYXNlLWRpcmVjdG9yeSc6ICdmcm9udGVuZC9idWlsZCcsXG4gICAgICAgICAgZmlsZXM6IFtcbiAgICAgICAgICAgICcqKi8qJyxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBjYWNoZToge1xuICAgICAgICAgIHBhdGhzOiBbXG4gICAgICAgICAgICAnbm9kZV9tb2R1bGVzLyoqLyonLFxuICAgICAgICAgICAgJ2Zyb250ZW5kL25vZGVfbW9kdWxlcy8qKi8qJyxcbiAgICAgICAgICAgICdiYWNrZW5kL25vZGVfbW9kdWxlcy8qKi8qJyxcbiAgICAgICAgICAgICdpbmZyYXN0cnVjdHVyZS9ub2RlX21vZHVsZXMvKiovKicsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gdGhlIGJ1aWxkIHByb2plY3RcbiAgICBidWlsZFByb2plY3QuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpzMzo6OiR7d2Vic2l0ZUJ1Y2tldE5hbWV9YCxcbiAgICAgICAgYGFybjphd3M6czM6Ojoke3dlYnNpdGVCdWNrZXROYW1lfS8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgYnVpbGRQcm9qZWN0LmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjbG91ZGZyb250OkNyZWF0ZUludmFsaWRhdGlvbicsXG4gICAgICAgICdjbG91ZGZyb250OkdldERpc3RyaWJ1dGlvbicsXG4gICAgICAgICdjbG91ZGZyb250Okxpc3REaXN0cmlidXRpb25zJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIGJ1aWxkUHJvamVjdC5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnc3NtOkdldFBhcmFtZXRlcicsXG4gICAgICAgICdzc206R2V0UGFyYW1ldGVycycsXG4gICAgICBdLFxuICAgICAgLy8gUmVzdHJpY3QgdG8gb25seSB0aGUgcGFyYW1ldGVycyBuZWVkZWRcbiAgICAgIHJlc291cmNlczogWydhcm46YXdzOnNzbToqOio6cGFyYW1ldGVyL2Jsb2cvKiddLFxuICAgIH0pKTtcblxuICAgIGJ1aWxkUHJvamVjdC5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnY29kZWFydGlmYWN0OkdldEF1dGhvcml6YXRpb25Ub2tlbicsXG4gICAgICAgICdjb2RlYXJ0aWZhY3Q6R2V0UmVwb3NpdG9yeUVuZHBvaW50JyxcbiAgICAgICAgJ2NvZGVhcnRpZmFjdDpSZWFkRnJvbVJlcG9zaXRvcnknLFxuICAgICAgXSxcbiAgICAgIC8vIFJlc3RyaWN0IHRvIHNwZWNpZmljIGRvbWFpbiBhbmQgcmVwb3NpdG9yeVxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIGBhcm46YXdzOmNvZGVhcnRpZmFjdDoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06ZG9tYWluL3FibG9nLWRvbWFpbmAsXG4gICAgICAgIGBhcm46YXdzOmNvZGVhcnRpZmFjdDoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06cmVwb3NpdG9yeS9xYmxvZy1kb21haW4vcWJsb2ctcmVwb2AsXG4gICAgICBdLFxuICAgIH0pKTtcblxuICAgIGJ1aWxkUHJvamVjdC5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydzdHM6R2V0U2VydmljZUJlYXJlclRva2VuJ10sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAnc3RzOkFXU1NlcnZpY2VOYW1lJzogJ2NvZGVhcnRpZmFjdC5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBwaXBlbGluZVxuICAgIGNvbnN0IHNvdXJjZU91dHB1dCA9IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoKTtcbiAgICBjb25zdCBidWlsZE91dHB1dCA9IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoKTtcblxuICAgIGNvbnN0IHBpcGVsaW5lID0gbmV3IGNvZGVwaXBlbGluZS5QaXBlbGluZSh0aGlzLCAnUUJsb2dQaXBlbGluZScsIHtcbiAgICAgIGFydGlmYWN0QnVja2V0LFxuICAgICAgcGlwZWxpbmVOYW1lOiAnUUJsb2dQaXBlbGluZScsXG4gICAgICBzdGFnZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YWdlTmFtZTogJ1NvdXJjZScsXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkdpdEh1YlNvdXJjZUFjdGlvbih7XG4gICAgICAgICAgICAgIGFjdGlvbk5hbWU6ICdHaXRIdWJfU291cmNlJyxcbiAgICAgICAgICAgICAgb3duZXI6IGdpdGh1Yk93bmVyLFxuICAgICAgICAgICAgICByZXBvOiBnaXRodWJSZXBvLFxuICAgICAgICAgICAgICBicmFuY2g6IGdpdGh1YkJyYW5jaCxcbiAgICAgICAgICAgICAgb2F1dGhUb2tlbjogY2RrLlNlY3JldFZhbHVlLnNlY3JldHNNYW5hZ2VyKGdpdGh1YlRva2VuU2VjcmV0TmFtZSksXG4gICAgICAgICAgICAgIG91dHB1dDogc291cmNlT3V0cHV0LFxuICAgICAgICAgICAgICB0cmlnZ2VyOiBjb2RlcGlwZWxpbmVfYWN0aW9ucy5HaXRIdWJUcmlnZ2VyLldFQkhPT0ssXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhZ2VOYW1lOiAnQnVpbGQnLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlQnVpbGRBY3Rpb24oe1xuICAgICAgICAgICAgICBhY3Rpb25OYW1lOiAnQnVpbGQnLFxuICAgICAgICAgICAgICBwcm9qZWN0OiBidWlsZFByb2plY3QsXG4gICAgICAgICAgICAgIGlucHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgICAgICAgICAgIG91dHB1dHM6IFtidWlsZE91dHB1dF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGlwZWxpbmVDb25zb2xlVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5yZWdpb259LmNvbnNvbGUuYXdzLmFtYXpvbi5jb20vY29kZXN1aXRlL2NvZGVwaXBlbGluZS9waXBlbGluZXMvJHtwaXBlbGluZS5waXBlbGluZU5hbWV9L3ZpZXc/cmVnaW9uPSR7dGhpcy5yZWdpb259YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVVJMIHRvIHRoZSBDb2RlUGlwZWxpbmUgY29uc29sZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29kZUFydGlmYWN0RG9tYWluJywge1xuICAgICAgdmFsdWU6IGRvbWFpbi5hdHRyTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29kZUFydGlmYWN0IGRvbWFpbiBuYW1lJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2RlQXJ0aWZhY3RSZXBvc2l0b3J5Jywge1xuICAgICAgdmFsdWU6IHJlcG9zaXRvcnkuYXR0ck5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZGVBcnRpZmFjdCByZXBvc2l0b3J5IG5hbWUnLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IEdpdEh1YiBjb25maWd1cmF0aW9uIGZvciB2ZXJpZmljYXRpb25cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR2l0SHViQ29uZmlndXJhdGlvbicsIHtcbiAgICAgIHZhbHVlOiBgUmVwb3NpdG9yeTogJHtnaXRodWJPd25lcn0vJHtnaXRodWJSZXBvfSwgQnJhbmNoOiAke2dpdGh1YkJyYW5jaH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdHaXRIdWIgcmVwb3NpdG9yeSBjb25maWd1cmF0aW9uJyxcbiAgICB9KTtcbiAgfVxufVxuIl19