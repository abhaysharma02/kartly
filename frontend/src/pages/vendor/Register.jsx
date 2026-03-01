import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { Store, Mail, Lock, User, Phone, CheckCircle2, Building2, ArrowRight } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        name: '',
        shopName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        setIsLoading(true);

        try {
            const response = await api.post('/auth/register', {
                name: formData.name,
                shopName: formData.shopName,
                phone: formData.phone,
                email: formData.email,
                password: formData.password
            });

            // Login immediately upon successful registration
            login(
                { id: response.data.vendor.id, name: formData.name, role: 'OWNER' },
                response.data.token,
                response.data.vendor.id
            );

            navigate('/vendor/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex font-sans selection:bg-primary-100 selection:text-primary-900">
            {/* Left Side - Register Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 overflow-y-auto">
                <div className="mx-auto w-full max-w-md">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <Store className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-secondary-900 tracking-tight leading-none">Kartly</h2>
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1">Merchant Portal</p>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-secondary-900 mb-3 tracking-tight">Claim your free trial</h1>
                    <p className="text-secondary-500 font-medium mb-8 text-lg">
                        Join 1000+ businesses growing with Kartly. No credit card required.
                    </p>

                    <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-secondary-100 relative">
                        {/* Decorative gradient blur behind the form */}
                        <div className="absolute -z-10 -inset-4 bg-gradient-to-r from-primary-50 to-blue-50 blur-2xl opacity-50 rounded-[3rem]"></div>

                        <form className="space-y-5 relative" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl flex items-start gap-3">
                                    <span className="font-medium text-sm">{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-secondary-700 uppercase tracking-widest">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                        </div>
                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="appearance-none block w-full pl-10 pr-3 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-secondary-700 uppercase tracking-widest">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                        </div>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="appearance-none block w-full pl-10 pr-3 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                            placeholder="9876543210"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-secondary-700 uppercase tracking-widest">Shop Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Building2 className="h-5 w-5 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                    </div>
                                    <input
                                        name="shopName"
                                        type="text"
                                        required
                                        value={formData.shopName}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                        placeholder="Awesome Food Cart"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-secondary-700 uppercase tracking-widest">Email address</label>
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
                                        placeholder="owner@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-secondary-700 uppercase tracking-widest">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                        </div>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="appearance-none block w-full pl-10 pr-3 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-secondary-700 uppercase tracking-widest">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                                        </div>
                                        <input
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="appearance-none block w-full pl-10 pr-3 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white text-sm font-medium transition-all text-secondary-900 placeholder:text-secondary-400"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-black text-white bg-primary-600 hover:bg-primary-700 hover:shadow-primary-500/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-secondary-500 font-medium pt-2">
                                By signing up, you agree to our Terms of Service & Privacy Policy.
                            </p>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-sm font-medium text-secondary-500 mb-8 sm:mb-0">
                        Already have an account?{' '}
                        <Link to="/vendor/login" className="font-bold text-primary-600 hover:text-primary-700 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary-600 after:transition-transform hover:after:origin-bottom-left hover:after:scale-x-100">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Premium Illustration graphic */}
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-primary-900 border-l border-primary-800">
                {/* Modern Dark Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-950 opacity-100 z-0"></div>

                {/* Decorative Lights */}
                <div className="absolute top-[10%] right-[10%] w-80 h-80 bg-blue-400 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col justify-center items-start p-20 max-w-2xl text-white w-full h-full">

                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full mb-8 shadow-xl">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
                        </span>
                        <span className="text-sm font-bold tracking-wide">Join 10+ new restaurants today</span>
                    </div>

                    <h2 className="text-5xl lg:text-6xl font-black leading-[1.1] mb-8 tracking-tight">
                        Transform how your customers order <span className="text-transparent bg-clip-text bg-gradient-to-r from-warning-300 to-warning-100">in minutes.</span>
                    </h2>

                    <div className="grid grid-cols-2 gap-6 w-full text-secondary-100 font-medium">
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/30 flex items-center justify-center mb-4">
                                <QrCode className="w-5 h-5 text-primary-200" />
                            </div>
                            <h4 className="font-bold text-white text-lg mb-1">Digital Menus</h4>
                            <p className="text-sm text-primary-200 font-medium leading-relaxed">No more printing menus. Updates flow instantly to all tables.</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl">
                            <div className="w-10 h-10 rounded-xl bg-success-500/30 flex items-center justify-center mb-4">
                                <Store className="w-5 h-5 text-success-300" />
                            </div>
                            <h4 className="font-bold text-white text-lg mb-1">Kitchen Display</h4>
                            <p className="text-sm text-success-100 font-medium leading-relaxed">Track and manage preparation times directly on screen.</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-xl col-span-2 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-warning-500/30 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-warning-300" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">7-Day Premium Trial</h4>
                                <p className="text-sm text-warning-100">Setup your whole restaurant before paying a single rupee.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Quick stub for the QrCode icon since we used it in the UI and didn't import it at the top
function QrCode(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="5" height="5" x="3" y="3" rx="1" />
            <rect width="5" height="5" x="16" y="3" rx="1" />
            <rect width="5" height="5" x="3" y="16" rx="1" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
            <path d="M21 21v.01" />
            <path d="M12 7v3a2 2 0 0 1-2 2H7" />
            <path d="M3 12h.01" />
            <path d="M12 3h.01" />
            <path d="M12 16v.01" />
            <path d="M16 12h1" />
            <path d="M21 12v.01" />
            <path d="M12 21v-1" />
        </svg>
    )
}

export default Register;
