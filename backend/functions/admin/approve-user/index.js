/**
 * Admin User Approval Lambda Function
 * 
 * This Lambda function handles the approval or rejection of new user registrations.
 * It's designed to be called by administrators through the API Gateway.
 * 
 * Learning points:
 * - Working with multiple AWS services (Cognito, DynamoDB) in a single function
 * - Implementing administrative workflows with proper authorization
 * - Error handling and input validation in Lambda functions
 * - Using environment variables for configuration
 */

const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get parameters from environment variables
// Using environment variables keeps sensitive information out of the code
// and allows for different configurations in different environments
const USER_POOL_ID = process.env.USER_POOL_ID;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Admin function to approve or reject new user registrations
 * 
 * @param {Object} event - API Gateway event containing request data
 * @returns {Object} - API Gateway response object
 */
exports.handler = async (event) => {
  try {
    // Parse request body to get action parameters
    const body = JSON.parse(event.body);
    const { username, action } = body;
    
    // Validate required parameters
    if (!username || !action) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Missing required parameters' })
      };
    }
    
    // Get the user making the request (admin)
    // This information comes from the Cognito authorizer attached to the API Gateway
    const adminUser = event.requestContext.authorizer.claims['cognito:username'];
    
    // Check if the user has admin privileges
    // This is a security measure to ensure only admins can approve/reject users
    const isAdmin = await checkAdminStatus(adminUser);
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized: Admin privileges required' })
      };
    }
    
    // Handle user approval
    if (action === 'approve') {
      // Enable the user in Cognito
      // This allows the user to sign in with their credentials
      await cognito.adminEnableUser({
        UserPoolId: USER_POOL_ID,
        Username: username
      }).promise();
      
      // Add user to the users table with approved status
      // This creates an audit trail of who approved the user and when
      await dynamodb.put({
        TableName: USERS_TABLE,
        Item: {
          userId: username,
          status: 'APPROVED',
          approvedBy: adminUser,
          approvedAt: new Date().toISOString()
        }
      }).promise();
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User approved successfully' })
      };
    } 
    // Handle user rejection
    else if (action === 'reject') {
      // Delete the user from Cognito
      // This completely removes the user account
      await cognito.adminDeleteUser({
        UserPoolId: USER_POOL_ID,
        Username: username
      }).promise();
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User rejected and removed' })
      };
    } 
    // Handle invalid action
    else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid action. Use "approve" or "reject"' })
      };
    }
  } catch (error) {
    // Log the error for debugging but return a sanitized message to the client
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
};

/**
 * Check if a user has admin privileges by verifying their group membership
 * 
 * @param {string} username - The username to check for admin privileges
 * @returns {boolean} - True if the user is an admin, false otherwise
 */
async function checkAdminStatus(username) {
  try {
    // Get user from Cognito to verify they exist
    const userResponse = await cognito.adminGetUser({
      UserPoolId: USER_POOL_ID,
      Username: username
    }).promise();
    
    // Check for admin group membership
    // In Cognito, permissions are often managed through groups
    const groupsResponse = await cognito.adminListGroupsForUser({
      UserPoolId: USER_POOL_ID,
      Username: username
    }).promise();
    
    // Return true if the user is in the Admins group
    return groupsResponse.Groups.some(group => group.GroupName === 'Admins');
  } catch (error) {
    // Log the error but return false to deny access on any error
    console.error('Error checking admin status:', error);
    return false;
  }
}
