import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class GitHubSecretStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a placeholder secret for GitHub OAuth token
    // In a real scenario, you would create this secret manually in the AWS console
    // and store your actual GitHub token there
    const githubToken = new secretsmanager.Secret(this, 'GitHubToken', {
      secretName: 'github-token',
      description: 'GitHub OAuth token for CodePipeline',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ token: 'PLACEHOLDER_TOKEN' }),
        generateStringKey: 'token',
      },
    });

    // Output the secret ARN
    new cdk.CfnOutput(this, 'GitHubTokenSecretArn', {
      value: githubToken.secretArn,
      description: 'ARN of the GitHub token secret',
    });
  }
}
