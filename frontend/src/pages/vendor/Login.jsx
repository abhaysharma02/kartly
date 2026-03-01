import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { Store, Mail, Lock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', formData);

            login(
                response.data.user,
                response.data.token,
                response.data.vendorId
            );

            navigate('/vendor/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex font-sans selection:bg-primary-100 selection:text-primary-900">
            {/* Left Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative z-10">
                <div className="mx-auto w-full max-w-md">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <Store className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-secondary-900 tracking-tight leading-none">Kartly</h2>
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1">Merchant Portal</p>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-secondary-900 mb-3 tracking-tight">Welcome back</h1>
                    <p className="text-secondary-500 font-medium mb-8 text-lg">
                        Enter your credentials to access your dashboard.
                    </p>

                    <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-secondary-100 relative">
                        {/* Decorative gradient blur behind the form */}
                        <div className="absolute -z-10 -inset-4 bg-gradient-to-r from-primary-50 to-blue-50 blur-2xl opacity-50 rounded-[3rem]"></div>

                        <form className="space-y-6 relative" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl flex items-start gap-3">
                                    <span className="font-medium text-sm">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Email address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Password</label>
                                    <Link to="/vendor/forgot-password" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center pt-2">
                                <div className="flex items-center h-5">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="w-4 h-4 text-primary-600 bg-secondary-50 border-secondary-300 rounded focus:ring-primary-500"
                                    />
                                </div>
                                <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-secondary-700">
                                    Remember me for 30 days
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-black text-white bg-primary-600 hover:bg-primary-700 hover:shadow-primary-500/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="mt-10 text-center text-sm font-medium text-secondary-500">
                        Don't have an account?{' '}
                        <Link to="/vendor/register" className="font-bold text-primary-600 hover:text-primary-700 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary-600 after:transition-transform hover:after:origin-bottom-left hover:after:scale-x-100">
                            Start your free trial
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Premium Illustration graphic */}
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-secondary-900 border-l border-secondary-800">
                {/* Modern Dark Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-900 via-[#0f172a] to-primary-950 opacity-100 z-0"></div>

                {/* Decorative Lights */}
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col justify-center items-start p-20 max-w-2xl text-white w-full h-full">

                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full mb-8 shadow-2xl">
                        <Sparkles className="w-4 h-4 text-warning-400" />
                        <span className="text-sm font-bold tracking-wide">Kartly – Smart Ordering & POS Platform</span>
                    </div>

                    <h2 className="text-5xl lg:text-6xl font-black leading-[1.1] mb-8 tracking-tight">
                        Grow your food business with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-200">powerful tools.</span>
                    </h2>

                    <div className="space-y-5 text-lg text-secondary-300 font-medium">
                        {[
                            'QR-based digital menus & ordering',
                            'Real-time Kitchen Display System',
                            'Automated WhatsApp marketing',
                            'Zero commission on all orders'
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                                <div className="w-8 h-8 rounded-full bg-success-500/20 text-success-400 flex items-center justify-center shrink-0 border border-success-500/30">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="text-white/90">{item}</span>
                            </div>
                        ))}
                    </div>

                    {/* Simulated "Dashboard" Graphic Element to make it look techy */}
                    <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-white/5 border-t border-l border-white/10 rounded-tl-[3rem] shadow-2xl backdrop-blur-lg transform translate-x-32 translate-y-32 rotate-[-5deg] flex flex-col p-6 hidden xl:block">
                        <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
                            <div className="w-3 h-3 rounded-full bg-danger-500"></div>
                            <div className="w-3 h-3 rounded-full bg-warning-500"></div>
                            <div className="w-3 h-3 rounded-full bg-success-500"></div>
                        </div>
                        <div className="flex-1 rounded-xl bg-white/5 border border-white/5 animate-pulse"></div>
                        <div className="h-12 flex gap-4 mt-4">
                            <div className="w-1/3 rounded-xl bg-white/5 border border-white/5"></div>
                            <div className="w-2/3 rounded-xl bg-white/5 border border-white/5"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
