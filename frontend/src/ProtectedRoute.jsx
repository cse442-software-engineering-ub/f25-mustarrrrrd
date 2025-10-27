// ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    // 1. Loading State
    if (loading || loading === null) {
        return <div style={{textAlign: 'center', padding: '50px'}}>Checking authentication...</div>; 
    }

    // 2. Redirection
    // If the user object is null (not logged in), redirect
    if (!user) {
        // Redirect to the login page ('/') if not authenticated
        return <Navigate to="/" replace />;
    }

    // 3. Render Protected Content
    return children;
};