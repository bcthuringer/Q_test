import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface GitHubSecretStackProps extends cdk.StackProps {
    githubTokenValue?: string;
}
export declare class GitHubSecretStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: GitHubSecretStackProps);
}
