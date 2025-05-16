import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useAuth } from '../context/AuthContext';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
  const { user, checkUser } = useAuth();
  const [userAttributes, setUserAttributes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchUserAttributes();
  }, []);

  const fetchUserAttributes = async () => {
    try {
      setLoading(true);
      
      const currentUser = await Auth.currentAuthenticatedUser();
      const attributes = currentUser.attributes || {};
      
      setUserAttributes(attributes);
      setError(null);
    } catch (err) {
      console.error('Error fetching user attributes:', err);
      setError('Failed to load user profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>Your Profile</h1>
        
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {userAttributes.name ? userAttributes.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-info">
              <h2>{userAttributes.name || 'User'}</h2>
              <p>{userAttributes.email}</p>
            </div>
          </div>
          
          <div className="profile-details">
            <div className="profile-section">
              <h3>Account Information</h3>
              <div className="profile-field">
                <span className="field-label">Email:</span>
                <span className="field-value">{userAttributes.email}</span>
              </div>
              {userAttributes.name && (
                <div className="profile-field">
                  <span className="field-label">Name:</span>
                  <span className="field-value">{userAttributes.name}</span>
                </div>
              )}
              {userAttributes.phone_number && (
                <div className="profile-field">
                  <span className="field-label">Phone:</span>
                  <span className="field-value">{userAttributes.phone_number}</span>
                </div>
              )}
              <div className="profile-field">
                <span className="field-label">Account Created:</span>
                <span className="field-value">
                  {new Date(parseInt(user.signInUserSession.idToken.payload.auth_time * 1000)).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
