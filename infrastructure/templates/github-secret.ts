import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface GitHubSecretStackProps extends cdk.StackProps {
  // Optional parameter to provide the GitHub token at deployment time
  githubTokenValue?: string;
}

export class GitHubSecretStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: GitHubSecretStackProps) {
    super(scope, id, props);

    // Create a secret for GitHub OAuth token
    // If a token value is provided at deployment time, use it
    // Otherwise, create a placeholder that must be updated manually
    const githubToken = new secretsmanager.Secret(this, 'GitHubToken', {
      secretName: 'github-token',
      description: 'GitHub OAuth token for CodePipeline',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          token: props?.githubTokenValue || 'PLACEHOLDER_TOKEN_MUST_BE_UPDATED' 
        }),
        generateStringKey: 'token',
      },
    });

    // Enable automatic rotation if desired
    // This is commented out by default as it requires additional setup
    /*
    githubToken.addRotationSchedule('RotationSchedule', {
      automaticallyAfter: cdk.Duration.days(90), // Rotate every 90 days
      rotationLambda: new lambda.Function(this, 'RotationLambda', {
        // Lambda function configuration for rotation
      }),
    });
    */

    // Output the secret ARN
    new cdk.CfnOutput(this, 'GitHubTokenSecretArn', {
      value: githubToken.secretArn,
      description: 'ARN of the GitHub token secret',
    });

    // Add a warning if using the placeholder
    if (!props?.githubTokenValue) {
      new cdk.CfnOutput(this, 'GitHubTokenWarning', {
        value: 'WARNING: You must manually update the GitHub token in AWS Secrets Manager',
        description: 'Important security notice',
      });
    }
  }
}
