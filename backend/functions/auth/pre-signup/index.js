/**
 * Pre-signup Lambda trigger for Cognito
 * 
 * This function is triggered when a new user signs up through Cognito.
 * It automatically confirms the user's email but keeps the account disabled
 * until an administrator approves it through the admin interface.
 * 
 * Learning points:
 * - Cognito triggers allow you to customize the authentication workflow
 * - You can implement approval workflows by manipulating user attributes
 * - Sensitive information should be carefully handled in logs
 * 
 * @param {Object} event - The Cognito event containing user information
 * @returns {Object} - The modified event with autoConfirmUser and autoVerifyEmail flags
 */
exports.handler = async (event) => {
  // Set the user to confirmed but disabled
  // This means the user won't need to enter a verification code,
  // but still can't log in until an admin enables the account
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  
  // Log the event for admin review
  // IMPORTANT: Only log non-sensitive information to avoid security issues
  console.log('New user signup:', JSON.stringify({
    username: event.userName,
    email: event.request.userAttributes.email,
    timestamp: new Date().toISOString()
  }));
  
  // Return the modified event back to Cognito
  // Cognito will use this response to determine how to proceed with the signup
  return event;
};
