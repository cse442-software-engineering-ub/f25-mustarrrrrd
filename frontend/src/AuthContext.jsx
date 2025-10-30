// AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';

// URL for your existing PHP session check
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;
const CHECK_SESSION_URL = `${API_ROOT}/check_session.php`;

// 1. Create the Context
const AuthContext = createContext(null);

// Custom hook for convenience
export const useAuth = () => useContext(AuthContext);

// 2. Auth Provider Component
export const AuthProvider = ({ children }) => {
    // user: null means not logged in.
    const [user, setUser] = useState(null); 
    // loading: null = Initial check not started, true = Checking, false = Done
    const [loading, setLoading] = useState(true);

    // Function to run the session check
    const checkAuthStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch(CHECK_SESSION_URL, {
                method: 'GET',
                credentials: 'include', 
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.loggedIn === true) {
                    // Store user data returned from PHP (id, name, role, etc.)
                    setUser({ ...data.user, role: data.role });
                } else {
                    setUser(null); // Not logged in
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Session check failed:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Run check on initial load (i.e., browser refresh/first visit)
    useEffect(() => {
        checkAuthStatus();
    }, []);

    // Function to be called after successful login or logout
    const login = (userData) => {
        // Sets user object on successful login response from verify.php
        setUser(userData); 
    };
    
    const logout = () => {
        // Clears user object immediately after calling logout.php
        setUser(null); 
        // Note: The logout.php call must still happen separately!
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};