import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as codeartifact from 'aws-cdk-lib/aws-codeartifact';

export interface CICDStackProps extends cdk.StackProps {
  // Repository information
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
  // Secret name for GitHub token
  githubTokenSecretName?: string;
}

export class CICDStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: CICDStackProps) {
    super(scope, id, props);

    // Default values with clear indication they should be overridden
    const githubOwner = props?.githubOwner || 'bcthuringer';
    const githubRepo = props?.githubRepo || 'Q_test';
    const githubBranch = props?.githubBranch || 'main';
    const githubTokenSecretName = props?.githubTokenSecretName || 'github-token';

    // Get the website bucket name from SSM Parameter Store
    const websiteBucketName = ssm.StringParameter.valueForStringParameter(
      this, '/blog/storage/websiteBucket'
    );

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
