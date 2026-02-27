import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [vendorId, setVendorId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            const storedVendorId = localStorage.getItem('vendorId');

            if (token && storedUser && storedVendorId) {
                setUser(JSON.parse(storedUser));
                setVendorId(storedVendorId);
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = (userData, token, vId) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('vendorId', vId);

        setUser(userData);
        setVendorId(vId);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('vendorId');

        setUser(null);
        setVendorId(null);
    };

    return (
        <AuthContext.Provider value={{ user, vendorId, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
