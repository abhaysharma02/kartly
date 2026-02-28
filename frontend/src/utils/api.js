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

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login if unauthorized
            localStorage.removeItem('token');
            localStorage.removeItem('vendorId');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
