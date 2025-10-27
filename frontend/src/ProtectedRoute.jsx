// ProtectedRoute.jsx

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// Configure the URL for your existing PHP session check endpoint
const CHECK_SESSION_URL = '/api/check_session.php'; // Adjust path if necessary

export const ProtectedRoute = ({ children }) => {
    // State to track authentication status: null = Loading, false = Not Authenticated, true = Authenticated
    const [isAuthenticated, setIsAuthenticated] = useState(null); 
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Perform a GET request to your check_session.php
                const response = await fetch(CHECK_SESSION_URL, {
                    method: 'GET',
                    // CRUCIAL: Ensures the session/persistent login cookies are sent
                    credentials: 'include', 
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Check the 'loggedIn' field returned by your PHP script
                    if (data.loggedIn === true) {
                        setIsAuthenticated(true);
                    } else {
                        // LoggedIn is false, meaning the server couldn't validate the user
                        setIsAuthenticated(false);
                    }
                } else {
                    // Handle non-200 responses if your server is ever configured to return them
                    setIsAuthenticated(false);
                }
            } catch (error) {
                // Network error or inability to connect to the server
                console.error("Session check failed:", error);
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []); 

    // 1. Loading State
    if (isAuthenticated === null) {
        // Show a loading indicator while the server is being checked
        return <div style={{textAlign: 'center', padding: '50px'}}>Checking authentication...</div>; 
    }

    // 2. Redirection
    if (!isAuthenticated) {
        // Redirect to the login page ('/') if not authenticated
        return <Navigate to="/" replace />;
    }

    // 3. Render Protected Content
    // Render the child component (the protected page content)
    return children;
};