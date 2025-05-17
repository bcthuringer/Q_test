"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubSecretStack = void 0;
const cdk = require("aws-cdk-lib");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
class GitHubSecretStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.GitHubSecretStack = GitHubSecretStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViLXNlY3JldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdpdGh1Yi1zZWNyZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLGlFQUFpRTtBQU9qRSxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBOEI7UUFDdEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLDBEQUEwRDtRQUMxRCxnRUFBZ0U7UUFDaEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDakUsVUFBVSxFQUFFLGNBQWM7WUFDMUIsV0FBVyxFQUFFLHFDQUFxQztZQUNsRCxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsSUFBSSxtQ0FBbUM7aUJBQ3RFLENBQUM7Z0JBQ0YsaUJBQWlCLEVBQUUsT0FBTzthQUMzQjtTQUNGLENBQUMsQ0FBQztRQUVILHVDQUF1QztRQUN2QyxtRUFBbUU7UUFDbkU7Ozs7Ozs7VUFPRTtRQUVGLHdCQUF3QjtRQUN4QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxXQUFXLENBQUMsU0FBUztZQUM1QixXQUFXLEVBQUUsZ0NBQWdDO1NBQzlDLENBQUMsQ0FBQztRQUVILHlDQUF5QztRQUN6QyxJQUFJLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFO1lBQzVCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQzVDLEtBQUssRUFBRSwyRUFBMkU7Z0JBQ2xGLFdBQVcsRUFBRSwyQkFBMkI7YUFDekMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQ0Y7QUEzQ0QsOENBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcblxuZXhwb3J0IGludGVyZmFjZSBHaXRIdWJTZWNyZXRTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAvLyBPcHRpb25hbCBwYXJhbWV0ZXIgdG8gcHJvdmlkZSB0aGUgR2l0SHViIHRva2VuIGF0IGRlcGxveW1lbnQgdGltZVxuICBnaXRodWJUb2tlblZhbHVlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgR2l0SHViU2VjcmV0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IEdpdEh1YlNlY3JldFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBhIHNlY3JldCBmb3IgR2l0SHViIE9BdXRoIHRva2VuXG4gICAgLy8gSWYgYSB0b2tlbiB2YWx1ZSBpcyBwcm92aWRlZCBhdCBkZXBsb3ltZW50IHRpbWUsIHVzZSBpdFxuICAgIC8vIE90aGVyd2lzZSwgY3JlYXRlIGEgcGxhY2Vob2xkZXIgdGhhdCBtdXN0IGJlIHVwZGF0ZWQgbWFudWFsbHlcbiAgICBjb25zdCBnaXRodWJUb2tlbiA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0dpdEh1YlRva2VuJywge1xuICAgICAgc2VjcmV0TmFtZTogJ2dpdGh1Yi10b2tlbicsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dpdEh1YiBPQXV0aCB0b2tlbiBmb3IgQ29kZVBpcGVsaW5lJyxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHRva2VuOiBwcm9wcz8uZ2l0aHViVG9rZW5WYWx1ZSB8fCAnUExBQ0VIT0xERVJfVE9LRU5fTVVTVF9CRV9VUERBVEVEJyBcbiAgICAgICAgfSksXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAndG9rZW4nLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgcm90YXRpb24gaWYgZGVzaXJlZFxuICAgIC8vIFRoaXMgaXMgY29tbWVudGVkIG91dCBieSBkZWZhdWx0IGFzIGl0IHJlcXVpcmVzIGFkZGl0aW9uYWwgc2V0dXBcbiAgICAvKlxuICAgIGdpdGh1YlRva2VuLmFkZFJvdGF0aW9uU2NoZWR1bGUoJ1JvdGF0aW9uU2NoZWR1bGUnLCB7XG4gICAgICBhdXRvbWF0aWNhbGx5QWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSwgLy8gUm90YXRlIGV2ZXJ5IDkwIGRheXNcbiAgICAgIHJvdGF0aW9uTGFtYmRhOiBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSb3RhdGlvbkxhbWJkYScsIHtcbiAgICAgICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGNvbmZpZ3VyYXRpb24gZm9yIHJvdGF0aW9uXG4gICAgICB9KSxcbiAgICB9KTtcbiAgICAqL1xuXG4gICAgLy8gT3V0cHV0IHRoZSBzZWNyZXQgQVJOXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dpdEh1YlRva2VuU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IGdpdGh1YlRva2VuLnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBHaXRIdWIgdG9rZW4gc2VjcmV0JyxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBhIHdhcm5pbmcgaWYgdXNpbmcgdGhlIHBsYWNlaG9sZGVyXG4gICAgaWYgKCFwcm9wcz8uZ2l0aHViVG9rZW5WYWx1ZSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dpdEh1YlRva2VuV2FybmluZycsIHtcbiAgICAgICAgdmFsdWU6ICdXQVJOSU5HOiBZb3UgbXVzdCBtYW51YWxseSB1cGRhdGUgdGhlIEdpdEh1YiB0b2tlbiBpbiBBV1MgU2VjcmV0cyBNYW5hZ2VyJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdJbXBvcnRhbnQgc2VjdXJpdHkgbm90aWNlJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19