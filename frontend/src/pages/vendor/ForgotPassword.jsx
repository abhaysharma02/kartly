import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mockLink, setMockLink] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setMockLink('');
        setIsLoading(true);

        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage(res.data.message);
            if (res.data.mockResetLink) {
                setMockLink(res.data.mockResetLink);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-primary-700">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-secondary-600">
                    Enter your email to receive a password reset link.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-danger-50 border-l-4 border-danger-500 p-4 mb-4">
                                <p className="text-sm text-danger-500 font-medium">{error}</p>
                            </div>
                        )}
                        {message && (
                            <div className="bg-success-50 border-l-4 border-success-500 p-4 mb-4">
                                <p className="text-sm text-success-700 font-medium">{message}</p>
                            </div>
                        )}
                        {mockLink && (
                            <div className="bg-warning-50 border border-warning-200 p-4 mb-4 rounded">
                                <p className="text-xs text-warning-700 font-bold mb-2">DEVELOPMENT MODE ONLY:</p>
                                <a href={mockLink} className="text-sm text-primary-600 font-medium break-all hover:underline">
                                    {mockLink}
                                </a>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-secondary-700">Email address</label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:bg-primary-300"
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>

                        <div className="text-center mt-4">
                            <Link to="/vendor/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                                Back to login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
