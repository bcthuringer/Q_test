import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface CICDStackProps extends cdk.StackProps {
    githubOwner?: string;
    githubRepo?: string;
    githubBranch?: string;
    githubTokenSecretName?: string;
}
export declare class CICDStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: CICDStackProps);
}
