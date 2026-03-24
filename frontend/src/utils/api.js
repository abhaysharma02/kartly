import axios from 'axios';

// Handle Vercel env variable missing /api suffix
let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (apiUrl && !apiUrl.endsWith('/api') && apiUrl !== 'http://localhost:5000') {
    apiUrl = apiUrl.replace(/\/$/, '') + '/api';
}

const api = axios.create({
    baseURL: apiUrl,
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 Unauthorized and 402 Payment Required
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token
            localStorage.removeItem('token');
            localStorage.removeItem('vendorId');
            localStorage.removeItem('user');

            // Only redirect to login if we are NOT on a public customer facing route (/q/*)
            if (!window.location.pathname.startsWith('/q/')) {
                window.location.href = '/vendor/login';
            }
        }
        
        if (error.response && error.response.status === 402) {
            // Subscription Expired - Force redirect to Billing ONLY if on dashboard
            if (!window.location.pathname.startsWith('/q/')) {
                // Usually window.location.href is a full reload, but it's safe to push them strictly into the dashboard.
                // It's up to the React Router to handle this or we can just window.location.href it.
                // We will redirect to /vendor/dashboard where the activeTab acts as billing, but we don't have direct path.
                // We'll let the components catch it or force a reload if needed, but since activeTab is state,
                // we'll just throw the error and let Dashboard.jsx handle it via its own catch block
                // which sets activeTab to 'billing' ideally.
                // But as a hard fallback:
                console.error('Subscription expired:', error.response.data);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
