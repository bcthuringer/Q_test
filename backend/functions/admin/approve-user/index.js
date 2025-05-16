const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Admin function to approve new user registrations
 */
exports.handler = async (event) => {
  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { username, action } = body;
    
    if (!username || !action) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Missing required parameters' })
      };
    }
    
    // Get the user making the request (admin)
    const adminUser = event.requestContext.authorizer.claims['cognito:username'];
    
    // Check if the user has admin privileges
    const isAdmin = await checkAdminStatus(adminUser);
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized: Admin privileges required' })
      };
    }
    
    if (action === 'approve') {
      // Enable the user in Cognito
      await cognito.adminEnableUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: username
      }).promise();
      
      // Add user to the users table with approved status
      await dynamodb.put({
        TableName: process.env.USERS_TABLE,
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
    } else if (action === 'reject') {
      // Delete the user from Cognito
      await cognito.adminDeleteUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: username
      }).promise();
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User rejected and removed' })
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid action. Use "approve" or "reject"' })
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
};

/**
 * Check if a user has admin privileges
 */
async function checkAdminStatus(username) {
  try {
    // Get user from Cognito
    const userResponse = await cognito.adminGetUser({
      UserPoolId: process.env.USER_POOL_ID,
      Username: username
    }).promise();
    
    // Check for admin group membership
    const groupsResponse = await cognito.adminListGroupsForUser({
      UserPoolId: process.env.USER_POOL_ID,
      Username: username
    }).promise();
    
    return groupsResponse.Groups.some(group => group.GroupName === 'Admins');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
