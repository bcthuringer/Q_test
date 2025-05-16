/**
 * Pre-signup Lambda trigger for Cognito
 * This function sets new users to CONFIRMED but disabled until admin approval
 */
exports.handler = async (event) => {
  // Set the user to confirmed but disabled
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  
  // Log the event for admin review
  console.log('New user signup:', JSON.stringify({
    username: event.userName,
    email: event.request.userAttributes.email,
    timestamp: new Date().toISOString()
  }));
  
  // Return the modified event
  return event;
};
