import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { route } = useAuthenticator((context) => [context.route]);
  const { loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (route !== 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
