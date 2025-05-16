const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

/**
 * Utility functions for authentication and authorization
 */
module.exports = {
  /**
   * Verify if a user exists in Cognito
   */
  verifyUser: async (userPoolId, username) => {
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: username
      };
      
      const user = await cognito.adminGetUser(params).promise();
      return user;
    } catch (error) {
      console.error('Error verifying user:', error);
      return null;
    }
  },
  
  /**
   * Check if a user belongs to a specific group
   */
  isUserInGroup: async (userPoolId, username, groupName) => {
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: username
      };
      
      const response = await cognito.adminListGroupsForUser(params).promise();
      return response.Groups.some(group => group.GroupName === groupName);
    } catch (error) {
      console.error('Error checking user group:', error);
      return false;
    }
  },
  
  /**
   * Add a user to a group
   */
  addUserToGroup: async (userPoolId, username, groupName) => {
    try {
      const params = {
        GroupName: groupName,
        UserPoolId: userPoolId,
        Username: username
      };
      
      await cognito.adminAddUserToGroup(params).promise();
      return true;
    } catch (error) {
      console.error('Error adding user to group:', error);
      return false;
    }
  }
};
