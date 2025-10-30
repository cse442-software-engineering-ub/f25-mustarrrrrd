import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait until the auth check finishes before deciding
  if (loading || loading === null) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        Checking authentication...
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If logged in, render the protected route
  return children;
};