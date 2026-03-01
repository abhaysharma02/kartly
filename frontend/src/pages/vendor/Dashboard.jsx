import React, { useState, useEffect, useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import {
    LayoutDashboard,
    UtensilsCrossed,
    ClipboardList,
    QrCode,
    Users,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    ChefHat,
    TrendingUp,
    Store
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('dashboard_home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Data States
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [qrData, setQrData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [subscription, setSubscription] = useState(null);

    // UI States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form States
    const [newCatName, setNewCatName] = useState('');
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: '', imageUrl: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [catsRes, itemsRes, custRes, subRes] = await Promise.all([
                api.get('/vendor/categories'),
                api.get('/vendor/menu-items'),
                api.get('/vendor/customers'),
                api.get('/vendor/subscription')
            ]);
            setCategories(catsRes.data);
            setMenuItems(itemsRes.data);
            setCustomers(custRes.data?.customers || []);
            setSubscription(subRes.data?.subscription || null);
        } catch (err) {
            setError('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (user && user.vendorId) {
            const socket = io(SOCKET_URL);

            socket.on('connect', () => {
                socket.emit('join_room', { vendorId: user.vendorId });
            });

            socket.on('new_order', (orderData) => {
                setOrders(prev => [orderData, ...prev]);
            });

            return () => {
                socket.disconnect();
            };
        }
    }, [user]);

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            const res = await api.put(`/vendor/orders/${orderId}/status`, { status: newStatus });
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
        } catch (err) {
            setError('Failed to update order status');
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vendor/categories', { name: newCatName });
            setNewCatName('');
            fetchData();
        } catch (err) {
            setError('Failed to create category');
        }
    };

    const handleCreateItem = async (e) => {
        e.preventDefault();
        try {
            if (!newItem.categoryId) return setError('Please select a category');

            await api.post('/vendor/menu-items', {
                ...newItem,
                price: Number(newItem.price)
            });
            setNewItem({ name: '', description: '', price: '', categoryId: '', imageUrl: '' });
            fetchData();
        } catch (err) {
            setError('Failed to create menu item');
        }
    };

    const generateQR = async () => {
        try {
            setError(null);
            const res = await api.get('/vendor/qr');
            const fullUrl = `${window.location.origin}${res.data.qrPath}`;
            setQrData(fullUrl);
        } catch (err) {
            console.error("QR Generation Failed:", err);
            setError(err.response?.data?.error || 'Failed to generate QR Code. Make sure you have an active subscription, category, and menu item.');
        }
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleUpgradePlan = async () => {
        try {
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) return setError('Failed to load Razorpay. Check your connection.');

            setLoading(true);
            const res = await api.post('/vendor/subscription/renew');
            const { razorpayOrderId, amount, planInfo } = res.data;

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_stub',
                amount: amount,
                currency: 'INR',
                name: 'Kartly Premium Upgrade',
                description: `Upgrade to ${planInfo.name} Plan for 30 Days`,
                order_id: razorpayOrderId,
                handler: function (response) {
                    alert('Renewal processed! Razorpay Webhook will update your backend status shortly.');
                    setTimeout(fetchData, 3000);
                },
                theme: { color: '#f59e0b' }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert('Payment failed. Please try again.');
            });
            rzp.open();
        } catch (err) {
            console.error('Upgrade failed:', err);
            setError('Failed to initiate upgrade process.');
        } finally {
            setLoading(false);
        }
    };

    const navItems = [
        { id: 'dashboard_home', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'orders', label: 'Live Orders', icon: ChefHat, badge: orders.filter(o => o.orderStatus === 'Pending').length },
        { id: 'menu', label: 'Menu Items', icon: UtensilsCrossed },
        { id: 'categories', label: 'Categories', icon: ListMenu },
        { id: 'qr', label: 'QR Code', icon: QrCode },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    ];

    return (
        <div className="min-h-screen bg-secondary-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-secondary-900/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-secondary-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 premium-shadow ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-secondary-800 bg-secondary-900/50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Store className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-secondary-300 bg-clip-text text-transparent">Kartly</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-secondary-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 hide-scrollbar">
                        <div className="mb-6 px-2">
                            <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Store Management</p>
                        </div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/20'
                                        : 'text-secondary-400 hover:bg-secondary-800 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-secondary-400'}`} />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    {item.badge > 0 && (
                                        <span className="bg-danger-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-secondary-800 bg-secondary-900/80">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-secondary-400 hover:bg-danger-500/10 hover:text-danger-400 rounded-xl transition-colors group"
                        >
                            <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header Navbar */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-secondary-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold text-secondary-900 hidden sm:block">
                            {navItems.find(item => item.id === activeTab)?.label}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-full transition-colors">
                            <Bell className="w-5 h-5" />
                            {orders.filter(o => o.orderStatus === 'Pending').length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full border border-white"></span>
                            )}
                        </button>
                        <div className="h-8 w-px bg-secondary-200 mx-2"></div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-bold text-secondary-900">{user?.name}</p>
                                <p className="text-xs font-medium text-secondary-500">Store Owner</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-100 to-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 font-bold shadow-sm">
                                {user?.name?.charAt(0).toUpperCase() || 'V'}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-secondary-50">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {error && (
                            <div className="bg-danger-50 border border-danger-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
                                    <X className="w-5 h-5 text-danger-600" />
                                </div>
                                <p className="text-sm text-danger-700 font-medium">{error}</p>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-secondary-200 border-t-primary-500 rounded-full animate-spin"></div>
                                    <div className="text-secondary-500 font-medium animate-pulse">Loading dashboard...</div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in-up">
                                {/* Dashboard Home Tab */}
                                {activeTab === 'dashboard_home' && (
                                    <div className="space-y-6">
                                        {/* Status Header */}
                                        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-2xl font-black text-secondary-900">Welcome back, {user?.name}! 👋</h2>
                                                <p className="text-secondary-500 mt-1 font-medium">Here's what's happening at your store today.</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-success-50 px-4 py-2 rounded-xl border border-success-100">
                                                <div className="w-3 h-3 rounded-full bg-success-500 animate-pulse"></div>
                                                <span className="font-bold text-success-700">Store is Open</span>
                                            </div>
                                        </div>

                                        {/* Metric Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="bg-white p-6 rounded-2xl premium-shadow border border-secondary-100 flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-primary-50 rounded-xl">
                                                        <TrendingUp className="w-6 h-6 text-primary-600" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider">Total Sales</p>
                                                    <h3 className="text-3xl font-black text-secondary-900 mt-1">
                                                        ₹{orders.filter(o => o.paymentStatus === 'SUCCESS').reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-2xl premium-shadow border border-secondary-100 flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-warning-50 rounded-xl">
                                                        <ChefHat className="w-6 h-6 text-warning-600" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider">Total Orders</p>
                                                    <h3 className="text-3xl font-black text-secondary-900 mt-1">{orders.length}</h3>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-2xl premium-shadow border border-secondary-100 flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-success-50 rounded-xl">
                                                        <Users className="w-6 h-6 text-success-600" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider">Customers</p>
                                                    <h3 className="text-3xl font-black text-secondary-900 mt-1">{customers.length}</h3>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-2xl premium-shadow border border-secondary-100 flex flex-col justify-between relative overflow-hidden">
                                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full opacity-10"></div>
                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className="p-3 bg-secondary-100 rounded-xl">
                                                        <CreditCard className="w-6 h-6 text-secondary-700" />
                                                    </div>
                                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${subscription?.status === 'ACTIVE' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                                        {subscription?.planId?.name || 'TRIAL'}
                                                    </span>
                                                </div>
                                                <div className="relative z-10">
                                                    <p className="text-sm font-bold text-secondary-500 uppercase tracking-wider">Plan Status</p>
                                                    <h3 className="text-xl font-bold text-secondary-900 mt-1 truncate">
                                                        {subscription?.status === 'ACTIVE' ? 'Premium Active' : 'Trial Active'}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Live Orders Tab */}
                                {activeTab === 'orders' && (
                                    <div className="space-y-6">
                                        <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 premium-shadow-hover">
                                            <div>
                                                <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                                                    Kitchen Display System
                                                    <span className="relative flex h-3 w-3 ml-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-danger-500"></span>
                                                    </span>
                                                </h3>
                                                <p className="text-sm text-secondary-500 font-medium mt-1">Real-time order tracking and management.</p>
                                            </div>
                                            <div className="flex gap-2 text-xs font-bold uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warning-50 text-warning-700 rounded-lg border border-warning-100">
                                                    <span className="w-2 h-2 rounded-full bg-warning-500"></span> New
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg border border-primary-100">
                                                    <span className="w-2 h-2 rounded-full bg-primary-500"></span> Prep
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success-50 text-success-700 rounded-lg border border-success-100">
                                                    <span className="w-2 h-2 rounded-full bg-success-500"></span> Ready
                                                </div>
                                            </div>
                                        </div>

                                        {orders.length === 0 ? (
                                            <div className="py-20 border-2 border-dashed border-secondary-200 bg-white rounded-3xl flex flex-col items-center justify-center premium-shadow">
                                                <div className="w-20 h-20 bg-secondary-50 flex items-center justify-center rounded-full mb-6">
                                                    <ChefHat className="w-10 h-10 text-secondary-300" />
                                                </div>
                                                <p className="text-2xl font-black text-secondary-900 mb-2">Kitchen is Quiet</p>
                                                <p className="text-secondary-500 font-medium">Waiting for new orders to arrive...</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {orders.map((order) => {
                                                    const isPending = order.orderStatus === 'Pending';
                                                    const isPreparing = order.orderStatus === 'Preparing';
                                                    const isReady = order.orderStatus === 'Ready';
                                                    const isCompleted = order.orderStatus === 'Completed';

                                                    // Color themes based on status
                                                    const borderClass = isPending ? 'border-warning-300' : isPreparing ? 'border-primary-300' : isReady ? 'border-success-300' : 'border-secondary-200';
                                                    const headerClass = isPending ? 'bg-gradient-to-r from-warning-500 to-warning-400' : isPreparing ? 'bg-gradient-to-r from-primary-600 to-primary-500' : isReady ? 'bg-gradient-to-r from-success-500 to-success-400' : 'bg-secondary-200';
                                                    const textClass = isCompleted ? 'text-secondary-800' : 'text-white';

                                                    // Only show active orders in KDS ideally, but for demo we show all or hide completed
                                                    if (isCompleted) return null;

                                                    return (
                                                        <div key={order._id} className={`bg-white border-2 rounded-2xl shadow-lg overflow-hidden flex flex-col h-full transform transition-all duration-300 hover:-translate-y-1 ${borderClass}`}>
                                                            {/* Ticket Header */}
                                                            <div className={`${headerClass} ${textClass} px-5 py-4 flex justify-between items-center shadow-inner`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                                                        <span className="font-black text-xl tracking-tight">#{order.tokenNumber}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex flex-col items-end">
                                                                    <span className="text-xs font-black uppercase tracking-widest opacity-80 mb-0.5">Status</span>
                                                                    <span className="font-bold bg-white/20 px-2.5 py-0.5 rounded backdrop-blur-sm text-sm">
                                                                        {order.orderStatus}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Ticket Body: Items */}
                                                            <div className="p-5 flex-1 bg-secondary-50/30">
                                                                <ul className="space-y-3 mb-4">
                                                                    {order.items?.map((item, i) => (
                                                                        <li key={i} className="flex justify-between items-start text-sm group">
                                                                            <div className="flex gap-3">
                                                                                <span className={`font-black flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${isPending ? 'bg-warning-100 text-warning-700' : isPreparing ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700'}`}>
                                                                                    {item.quantity}x
                                                                                </span>
                                                                                <span className="font-bold text-secondary-800 mt-1.5">{item.name}</span>
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>

                                                            {/* Ticket Footer: Actions */}
                                                            <div className="p-5 border-t border-secondary-100 bg-white">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <span className="text-secondary-500 font-bold text-sm uppercase tracking-wider">Total Amount</span>
                                                                    <span className="font-black text-2xl text-secondary-900">₹{order.totalAmount}</span>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {isPending && (
                                                                        <button
                                                                            onClick={() => handleUpdateOrderStatus(order._id, 'Preparing')}
                                                                            className="col-span-2 bg-gradient-to-r from-warning-500 to-warning-400 hover:from-warning-600 hover:to-warning-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-warning-500/30 transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <ChefHat className="w-5 h-5" /> Accept & Prepare
                                                                        </button>
                                                                    )}
                                                                    {isPreparing && (
                                                                        <button
                                                                            onClick={() => handleUpdateOrderStatus(order._id, 'Ready')}
                                                                            className="col-span-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-black py-3.5 rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <Bell className="w-5 h-5" /> Mark Ready
                                                                        </button>
                                                                    )}
                                                                    {isReady && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleUpdateOrderStatus(order._id, 'Completed')}
                                                                                className="col-span-2 bg-gradient-to-r from-success-500 to-success-400 hover:from-success-600 hover:to-success-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-success-500/30 transition-all flex items-center justify-center gap-2"
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> Complete Order
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Categories Tab */}
                                {activeTab === 'categories' && (
                                    <div className="space-y-6">
                                        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h3 className="text-xl font-black text-secondary-900">Menu Categories</h3>
                                                <p className="text-sm text-secondary-500 font-medium">Organize your food items into sections for customers.</p>
                                            </div>
                                            <form onSubmit={handleCreateCategory} className="flex w-full md:w-auto gap-3">
                                                <input
                                                    type="text"
                                                    required
                                                    value={newCatName}
                                                    onChange={e => setNewCatName(e.target.value)}
                                                    className="flex-1 md:w-64 px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium transition-shadow placeholder:text-secondary-400"
                                                    placeholder="e.g., Starters, Main Course"
                                                />
                                                <button type="submit" className="bg-secondary-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center justify-center whitespace-nowrap">
                                                    Add New
                                                </button>
                                            </form>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-secondary-100 premium-shadow overflow-hidden">
                                            {categories.length === 0 ? (
                                                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                                                    <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mb-3 border border-secondary-100">
                                                        <ClipboardList className="w-8 h-8 text-secondary-400" />
                                                    </div>
                                                    <p className="text-secondary-900 font-bold mb-1">No Categories Yet</p>
                                                    <p className="text-secondary-500 text-sm font-medium max-w-sm">Create your first category above to start organizing your menu items.</p>
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-secondary-50">
                                                    {categories.map(cat => (
                                                        <li key={cat._id} className="p-5 flex justify-between items-center hover:bg-secondary-50/50 transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100 shadow-sm">
                                                                    <ClipboardList className="w-5 h-5" />
                                                                </div>
                                                                <span className="font-bold text-secondary-900 text-lg">{cat.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${cat.isActive ? 'bg-success-100 text-success-700 border border-success-200' : 'bg-secondary-100 text-secondary-600 border border-secondary-200'}`}>
                                                                    {cat.isActive ? 'Active' : 'Hidden'}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Menu Items Tab */}
                                {activeTab === 'menu' && (
                                    <div className="space-y-6">
                                        <div className="glass-panel p-6 or rounded-2xl">
                                            <div className="mb-6">
                                                <h3 className="text-xl font-black text-secondary-900">Add New Item</h3>
                                                <p className="text-sm text-secondary-500 font-medium">Create a new dish for your digital menu.</p>
                                            </div>
                                            <form onSubmit={handleCreateItem} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Item Title</label>
                                                    <input required type="text" placeholder="e.g. Butter Chicken" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Category</label>
                                                    <select required value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow cursor-pointer">
                                                        <option value="">Select a category</option>
                                                        {categories.map(cat => (
                                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Price (₹)</label>
                                                    <input required type="number" step="1" placeholder="e.g. 250" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow font-mono" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Image URL</label>
                                                    <input type="url" placeholder="https://example.com/food.jpg" value={newItem.imageUrl} onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow" />
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="block text-xs font-bold text-secondary-700 uppercase tracking-widest">Description</label>
                                                    <input type="text" placeholder="Brief appetizing description of the dish..." value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow" />
                                                </div>
                                                <div className="md:col-span-2 pt-2">
                                                    <button type="submit" className="flex items-center justify-center gap-2 w-full bg-secondary-900 hover:bg-black text-white px-4 py-3.5 rounded-xl font-bold shadow-md transition-all">
                                                        <UtensilsCrossed className="w-5 h-5" />
                                                        Add Item to Menu
                                                    </button>
                                                </div>
                                            </form>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {menuItems.length === 0 ? (
                                                <div className="col-span-full py-16 flex flex-col items-center justify-center text-center px-4 bg-white rounded-2xl border border-secondary-200 border-dashed">
                                                    <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mb-4 border border-secondary-100">
                                                        <ChefHat className="w-8 h-8 text-secondary-400" />
                                                    </div>
                                                    <p className="text-xl font-black text-secondary-900 mb-2">Build Your Menu</p>
                                                    <p className="text-secondary-500 font-medium max-w-md">Your digital storefront is empty. Add your delicious food items using the form above to start receiving orders.</p>
                                                </div>
                                            ) : (
                                                menuItems.map(item => (
                                                    <div key={item._id} className="bg-white border border-secondary-100 rounded-2xl overflow-hidden premium-shadow-hover flex flex-col h-full group">
                                                        <div className="h-40 bg-secondary-100 relative overflow-hidden">
                                                            {item.imageUrl && item.imageUrl !== 'stub' ? (
                                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                            ) : (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-secondary-400 bg-secondary-50">
                                                                    <UtensilsCrossed className="w-8 h-8 opacity-20 mb-2" />
                                                                    <span className="text-xs font-bold uppercase tracking-wider">No Image</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-3 right-3">
                                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm backdrop-blur-md ${item.isAvailable ? 'bg-success-500/90 text-white' : 'bg-danger-500/90 text-white'}`}>
                                                                    {item.isAvailable ? 'Available' : 'Sold Out'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="p-5 flex flex-col flex-1 relative">
                                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                                <h3 className="font-black text-lg text-secondary-900 leading-tight">{item.name}</h3>
                                                                <span className="font-black text-lg text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-100">₹{item.price}</span>
                                                            </div>

                                                            <p className="text-sm text-secondary-500 font-medium line-clamp-2 flex-1 mb-4">
                                                                {item.description || <span className="italic opacity-50">No description provided</span>}
                                                            </p>

                                                            <div className="pt-4 border-t border-secondary-100 flex justify-between items-center mt-auto">
                                                                <span className="text-xs font-bold text-secondary-400 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%]">
                                                                    {categories.find(c => c._id === item.categoryId)?.name || 'Uncategorized'}
                                                                </span>
                                                                <button className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-primary-100">
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* QR Generation Tab */}
                                {activeTab === 'qr' && (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <div className="bg-white p-8 rounded-3xl premium-shadow border border-secondary-100 text-center max-w-sm w-full relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
                                            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-100">
                                                <QrCode className="w-8 h-8 text-primary-600" />
                                            </div>

                                            <h3 className="text-2xl font-black text-secondary-900 mb-2">Store QR Code</h3>
                                            <p className="text-sm text-secondary-500 font-medium mb-8">
                                                Print this code and place it on your tables. Customers scan to order instantly.
                                            </p>

                                            {error && activeTab === 'qr' && (
                                                <div className="bg-danger-50 text-danger-700 p-3 rounded-xl mb-6 text-sm font-semibold border border-danger-200">
                                                    {error}
                                                </div>
                                            )}

                                            {qrData ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="bg-white p-6 rounded-2xl shadow-inner border-2 border-dashed border-secondary-200 mb-6">
                                                        <QRCodeSVG id="store-qr-code" value={qrData} size={220} level="H" includeMargin={true} />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 w-full mb-4">
                                                        <button
                                                            onClick={() => {
                                                                const canvas = document.getElementById('store-qr-code');
                                                                const svgData = new XMLSerializer().serializeToString(canvas);
                                                                const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                                                                const url = URL.createObjectURL(blob);
                                                                const link = document.createElement("a");
                                                                link.href = url;
                                                                link.download = "store-qr-code.svg";
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            className="flex items-center justify-center gap-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-bold py-2.5 rounded-xl transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                            Download
                                                        </button>
                                                        <button
                                                            onClick={() => window.print()}
                                                            className="flex items-center justify-center gap-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-bold py-2.5 rounded-xl transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                                            Print
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(qrData);
                                                            alert("Link copied to clipboard!");
                                                        }}
                                                        className="w-full text-primary-600 hover:text-primary-700 font-bold text-sm bg-primary-50 py-3 rounded-xl transition-colors"
                                                    >
                                                        Copy Direct Link
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={generateQR}
                                                    className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-primary-500/30 transition-transform hover:scale-[1.02]"
                                                >
                                                    Generate QR Code
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CRM Customers Tab */}
                                {activeTab === 'customers' && (
                                    <div className="space-y-6">
                                        <div className="glass-panel p-6 rounded-2xl flex justify-between items-center premium-shadow-hover transition-all">
                                            <div>
                                                <h3 className="text-xl font-black text-secondary-900">Customer CRM</h3>
                                                <p className="text-sm text-secondary-500 font-medium mt-1">Export details for personalized direct marketing.</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-4xl font-black text-primary-600 tracking-tight">{customers.length}</div>
                                                <div className="text-xs font-bold text-secondary-500 uppercase tracking-widest mt-1">Loyal Users</div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-secondary-100 premium-shadow overflow-hidden">
                                            <table className="min-w-full divide-y divide-secondary-100">
                                                <thead className="bg-secondary-50/80">
                                                    <tr>
                                                        <th className="px-6 py-5 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Phone No.</th>
                                                        <th className="px-6 py-5 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Orders</th>
                                                        <th className="px-6 py-5 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Spent</th>
                                                        <th className="px-6 py-5 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Last Visit</th>
                                                        <th className="px-6 py-5 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-secondary-50">
                                                    {customers.length === 0 ? (
                                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-secondary-400 font-medium">No customer data collected yet.</td></tr>
                                                    ) : customers.map((c, idx) => (
                                                        <tr key={idx} className="hover:bg-secondary-50/50 transition-colors group">
                                                            <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-secondary-900">{c._id}</td>
                                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-center text-secondary-600 font-bold">{c.totalOrders}</td>
                                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-center text-success-600 font-black">₹{c.totalSpent}</td>
                                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-secondary-500 font-medium">{new Date(c.lastOrderDate).toLocaleDateString()}</td>
                                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                                <a
                                                                    href={`https://wa.me/91${c._id}?text=${encodeURIComponent("Hey there! It's been a while. Aaj kya khaoge? Mention this text for 10% off your next order!")}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366] text-[#128C7E] hover:text-white px-4 py-2 rounded-xl font-bold text-xs transition-all opacity-80 group-hover:opacity-100"
                                                                >
                                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z" /></svg>
                                                                    Send Promo
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Billing & Plan Tab */}
                                {activeTab === 'billing' && subscription && (
                                    <div className="flex flex-col items-center justify-center py-6">
                                        <div className="bg-white p-8 rounded-3xl premium-shadow border border-secondary-100 max-w-lg w-full text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-bl-full opacity-50"></div>

                                            <h3 className="text-xl font-bold text-secondary-500 uppercase tracking-widest mb-2 relative z-10">Current Plan</h3>

                                            <div className="mt-4 mb-8 relative z-10">
                                                <span className={`text-5xl font-black tracking-tight bg-clip-text text-transparent ${subscription.status === 'TRIAL' ? 'bg-gradient-to-r from-warning-500 to-warning-600' : 'bg-gradient-to-r from-primary-500 to-primary-700'}`}>
                                                    {subscription.planId?.name || 'TRIAL'}
                                                </span>
                                            </div>

                                            <div className="space-y-4 text-left mb-8 relative z-10">
                                                <div className="flex justify-between items-center py-3 border-b border-secondary-50">
                                                    <span className="text-secondary-500 font-medium">Status</span>
                                                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${subscription.status === 'ACTIVE' ? 'bg-success-100 text-success-700' : subscription.status === 'TRIAL' ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700'}`}>
                                                        {subscription.status}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-3 border-b border-secondary-50">
                                                    <span className="text-secondary-500 font-medium">Valid Until</span>
                                                    <span className="text-secondary-900 font-black">{new Date(subscription.endDate).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-3 border-b border-secondary-50">
                                                    <span className="text-secondary-500 font-medium">Order Limit</span>
                                                    <span className="text-secondary-900 font-black bg-secondary-100 px-3 py-1 rounded-lg">Unlimited</span>
                                                </div>
                                            </div>

                                            {subscription.status === 'TRIAL' && (
                                                <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-2xl border border-primary-100 mb-2 text-left relative z-10 shadow-inner">
                                                    <h4 className="font-black text-primary-900 mb-2 truncate text-xl">Go Commercial ✨</h4>
                                                    <p className="text-primary-700 text-sm font-medium mb-6">Upgrade to Premium to unlock Priority Support, Analytics, and unlimited QR generations forever.</p>
                                                    <button onClick={handleUpgradePlan} className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-black py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-transform hover:-translate-y-0.5">
                                                        Upgrade for ₹999/mo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
