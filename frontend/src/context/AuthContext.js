import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth, Hub } from 'aws-amplify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const listener = (data) => {
      switch (data.payload.event) {
        case 'signIn':
          checkUser();
          break;
        case 'signOut':
          setUser(null);
          setIsAdmin(false);
          break;
        default:
          break;
      }
    };

    Hub.listen('auth', listener);
    return () => Hub.remove('auth', listener);
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const userData = await Auth.currentAuthenticatedUser();
      
      // Check if user is in admin group
      const groups = userData.signInUserSession.accessToken.payload['cognito:groups'] || [];
      const userIsAdmin = groups.includes('Admins');
      
      setUser(userData);
      setIsAdmin(userIsAdmin);
    } catch (error) {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await Auth.signOut();
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    isAdmin,
    loading,
    signOut,
    checkUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
