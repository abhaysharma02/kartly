import React, { useState, useEffect, useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('categories');

    // Data States
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [qrData, setQrData] = useState(null);
    const [orders, setOrders] = useState([]); // Real-time orders
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

        // Socket.io Integration
        if (user && user.vendorId) {
            const socket = io(SOCKET_URL);

            socket.on('connect', () => {
                socket.emit('join_room', { vendorId: user.vendorId });
            });

            socket.on('new_order', (orderData) => {
                setOrders(prev => [orderData, ...prev]);
                // Play sound or notification if we were fully fleshed out
            });

            return () => {
                socket.disconnect();
            };
        }
    }, [user]);

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            const res = await api.put(`/vendor/orders/${orderId}/status`, { status: newStatus });
            // Update local state to reflect the change immediately
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
            // Basic validation
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
            // Dynamically construct the full URL so it works on any deployment domain
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
                    setTimeout(fetchData, 3000); // Give webhook time to hit
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

    return (
        <div className="min-h-screen bg-secondary-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-primary-600 font-extrabold text-2xl tracking-tight">Kartly</span>
                            <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs font-semibold rounded-full">Vendor Mode</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-secondary-700 text-sm font-medium">Hello, {user?.name}</span>
                            <button onClick={logout} className="bg-secondary-100 hover:bg-secondary-200 text-secondary-800 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="bg-danger-50 border-l-4 border-danger-500 p-4 mb-6 rounded shadow-sm">
                        <p className="text-sm text-danger-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Dashboard Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden mb-6">
                    <div className="flex border-b border-secondary-200">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'orders' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}`}
                        >
                            Live Orders
                            {orders.length > 0 && (
                                <span className="ml-2 bg-danger-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {orders.filter(o => o.orderStatus === 'Pending').length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'categories' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}`}
                        >
                            Categories
                        </button>
                        <button
                            onClick={() => setActiveTab('menu')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'menu' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}`}
                        >
                            Menu Items
                        </button>
                        <button
                            onClick={() => setActiveTab('qr')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'qr' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}`}
                        >
                            QR Code
                        </button>
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'customers' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}`}
                        >
                            Customers (CRM)
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${activeTab === 'billing' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}`}
                        >
                            Plan & Billing
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="animate-pulse text-secondary-400 font-medium">Loading your catalog...</div>
                            </div>
                        ) : (
                            <>
                                {/* Live Orders Tab */}
                                {activeTab === 'orders' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-secondary-50 p-4 rounded-lg border border-secondary-200">
                                            <h3 className="font-bold text-secondary-900">Live Kitchen Display</h3>
                                            <p className="text-sm text-secondary-500 font-medium blink-text">Listening for new orders...</p>
                                        </div>

                                        {orders.length === 0 ? (
                                            <div className="py-12 border-4 border-dashed border-secondary-200 rounded-2xl flex flex-col items-center justify-center">
                                                <svg className="w-16 h-16 text-secondary-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                                <p className="text-lg font-medium text-secondary-500">No active orders right now.</p>
                                                <p className="text-sm text-secondary-400 mt-1">Orders will appear here instantly when paid.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {orders.map((order, idx) => (
                                                    <div key={order._id || idx} className="bg-white border-2 border-warning-200 rounded-xl shadow-md overflow-hidden animate-fade-in-up">
                                                        <div className="bg-warning-50 px-4 py-3 border-b border-warning-200 flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-warning-500 text-white font-black text-xl px-3 py-1 rounded-lg shadow-sm">#{order.tokenNumber}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-warning-700 uppercase tracking-wider bg-warning-200 px-2 py-1 rounded">New</span>
                                                        </div>
                                                        <div className="p-4">
                                                            <ul className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                                                                {order.items?.map((item, i) => (
                                                                    <li key={i} className="flex justify-between items-start text-sm border-b border-secondary-50 pb-2">
                                                                        <div className="flex gap-2">
                                                                            <span className="font-bold text-secondary-900 border border-secondary-200 rounded px-1.5 py-0.5 bg-secondary-50">{item.quantity}x</span>
                                                                            <span className="font-medium text-secondary-800">{item.name}</span>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <div className="flex justify-between items-center pt-3 border-t border-secondary-100">
                                                                <p className="font-black text-lg text-secondary-900">₹{order.totalAmount}</p>
                                                                <select
                                                                    value={order.orderStatus}
                                                                    onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                                                    className={`px-3 py-1.5 rounded font-bold text-sm shadow-sm border-none focus:ring-2 focus:ring-primary-500 cursor-pointer ${order.orderStatus === 'Pending' ? 'bg-warning-100 text-warning-800' :
                                                                        order.orderStatus === 'Preparing' ? 'bg-primary-100 text-primary-800' :
                                                                            order.orderStatus === 'Ready' ? 'bg-success-100 text-success-800' :
                                                                                'bg-secondary-200 text-secondary-800'
                                                                        }`}
                                                                >
                                                                    <option value="Pending" className="bg-white text-secondary-900">Pending</option>
                                                                    <option value="Preparing" className="bg-white text-secondary-900">Preparing</option>
                                                                    <option value="Ready" className="bg-white text-secondary-900">Ready</option>
                                                                    <option value="Completed" className="bg-white text-secondary-900">Completed</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Categories Tab */}
                                {activeTab === 'categories' && (
                                    <div className="space-y-6">
                                        <form onSubmit={handleCreateCategory} className="flex gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-secondary-700 mb-1">New Category Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newCatName}
                                                    onChange={e => setNewCatName(e.target.value)}
                                                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                                                    placeholder="e.g. Beverages, Main Course"
                                                />
                                            </div>
                                            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md font-medium shadow-sm transition-colors">
                                                Add Category
                                            </button>
                                        </form>

                                        <div className="bg-secondary-50 border border-secondary-200 rounded-lg overflow-hidden">
                                            {categories.length === 0 ? (
                                                <p className="text-secondary-500 text-center py-6">No categories found. Create one above.</p>
                                            ) : (
                                                <ul className="divide-y divide-secondary-200">
                                                    {categories.map(cat => (
                                                        <li key={cat._id} className="px-6 py-4 flex justify-between items-center bg-white hover:bg-secondary-50 transition-colors">
                                                            <span className="font-medium text-secondary-900">{cat.name}</span>
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cat.isActive ? 'bg-success-100 text-success-800' : 'bg-secondary-200 text-secondary-800'}`}>
                                                                {cat.isActive ? 'Active' : 'Inactive'}
                                                            </span>
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
                                        <form onSubmit={handleCreateItem} className="bg-secondary-50 p-6 rounded-lg border border-secondary-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-secondary-700 mb-1">Item Name</label>
                                                <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500 shadow-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary-700 mb-1">Category</label>
                                                <select required value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })} className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500 shadow-sm bg-white">
                                                    <option value="">Select a category</option>
                                                    {categories.map(cat => (
                                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary-700 mb-1">Price (₹)</label>
                                                <input required type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500 shadow-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                                                <input type="text" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500 shadow-sm" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-secondary-700 mb-1">Image URL (Optional)</label>
                                                <input type="url" placeholder="https://example.com/image.jpg" value={newItem.imageUrl} onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500 shadow-sm" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors">
                                                    Add Menu Item
                                                </button>
                                            </div>
                                        </form>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                            {menuItems.length === 0 ? (
                                                <div className="col-span-full py-8 text-center bg-white border border-secondary-200 rounded-lg">
                                                    <p className="text-secondary-500">No menu items yet. Add your first item!</p>
                                                </div>
                                            ) : (
                                                menuItems.map(item => (
                                                    <div key={item._id} className="bg-white border text-left border-secondary-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="h-32 bg-secondary-200 relative overflow-hidden">
                                                            {item.imageUrl && item.imageUrl !== 'stub' ? (
                                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center text-secondary-400 font-medium bg-secondary-100">No Image</div>
                                                            )}
                                                        </div>
                                                        <div className="p-4">
                                                            <div className="flex justify-between items-start">
                                                                <h3 className="font-bold text-lg text-secondary-900">{item.name}</h3>
                                                                <span className="font-bold text-primary-600">₹{item.price}</span>
                                                            </div>
                                                            <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{item.description || 'No description'}</p>
                                                            <div className="mt-4 pt-4 border-t border-secondary-100 flex justify-between items-center">
                                                                <span className="text-xs font-medium text-secondary-500">
                                                                    {categories.find(c => c._id === item.categoryId)?.name || 'Unknown Category'}
                                                                </span>
                                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.isAvailable ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                                                                    {item.isAvailable ? 'Available' : 'Sold Out'}
                                                                </span>
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
                                        <div className="bg-secondary-50 p-8 rounded-2xl border border-secondary-200 text-center max-w-md w-full shadow-inner">
                                            <h3 className="text-xl font-bold text-secondary-900 mb-4">Customer QR Code</h3>
                                            <p className="text-sm text-secondary-600 mb-8">
                                                Print this QR code and place it on your cart. Customers can scan it to view your menu and order instantly.
                                            </p>

                                            {error && activeTab === 'qr' && (
                                                <div className="bg-danger-100 text-danger-800 p-3 rounded-lg mb-6 text-sm font-semibold border border-danger-200">
                                                    {error}
                                                </div>
                                            )}

                                            {qrData ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-secondary-100 mb-4">
                                                        <QRCodeSVG value={qrData} size={200} level="H" includeMargin={true} />
                                                    </div>
                                                    <a
                                                        href={qrData}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1"
                                                    >
                                                        Open Menu Link <span aria-hidden="true">&rarr;</span>
                                                    </a>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={generateQR}
                                                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform hover:scale-105"
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
                                        <div className="flex justify-between items-center bg-secondary-50 p-4 rounded-lg border border-secondary-200">
                                            <div>
                                                <h3 className="font-bold text-secondary-900">Customer Marketing (CRM)</h3>
                                                <p className="text-sm text-secondary-500 font-medium mt-1">Export customer details for personalized WhatsApp marketing.</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-black text-primary-600">{customers.length}</div>
                                                <div className="text-xs font-bold text-secondary-500 uppercase tracking-widest">Unique Customers</div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
                                            <table className="min-w-full divide-y divide-secondary-200">
                                                <thead className="bg-secondary-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Phone Number</th>
                                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Total Orders</th>
                                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Total Spent</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Last Order</th>
                                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-secondary-50">
                                                    {customers.length === 0 ? (
                                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-secondary-500 italic">No customer data yet. Once customers provide their phones while ordering, they will appear here.</td></tr>
                                                    ) : customers.map((c, idx) => (
                                                        <tr key={idx} className="hover:bg-secondary-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-secondary-900">{c._id}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-secondary-700 font-medium">{c.totalOrders}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-success-600 font-bold">₹{c.totalSpent}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-medium">{new Date(c.lastOrderDate).toLocaleDateString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                <a
                                                                    href={`https://wa.me/91${c._id}?text=${encodeURIComponent("Hey there! It's been a while. Aaj kya khaoge? Mention this text for 10% off your next order!")}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded font-bold text-xs transition-colors shadow-sm"
                                                                >
                                                                    WhatsApp Promo
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
                                        <div className="bg-white p-8 rounded-2xl border border-secondary-200 max-w-lg w-full shadow-sm text-center">
                                            <h3 className="text-2xl font-black text-secondary-900 mb-2">Current Plan</h3>

                                            <div className="mt-6 mb-8 inline-flex items-center justify-center p-6 bg-secondary-50 rounded-full border-4 border-primary-100">
                                                <span className={`text-4xl font-black tracking-tight ${subscription.status === 'TRIAL' ? 'text-warning-500' : 'text-success-600'}`}>
                                                    {subscription.planId?.name || 'TRIAL'}
                                                </span>
                                            </div>

                                            <div className="space-y-4 text-left mb-8">
                                                <div className="flex justify-between items-center py-2 border-b border-secondary-100">
                                                    <span className="text-secondary-600 font-medium">Status</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${subscription.status === 'ACTIVE' ? 'bg-success-100 text-success-800' : subscription.status === 'TRIAL' ? 'bg-warning-100 text-warning-800' : 'bg-danger-100 text-danger-800'}`}>
                                                        {subscription.status}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-secondary-100">
                                                    <span className="text-secondary-600 font-medium">Valid Until</span>
                                                    <span className="text-secondary-900 font-bold">{new Date(subscription.endDate).toLocaleDateString()} ({Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} Days Left)</span>
                                                </div>
                                                <div className="flex justify-between items-center py-2 border-b border-secondary-100">
                                                    <span className="text-secondary-600 font-medium">Order Limit</span>
                                                    <span className="text-secondary-900 font-bold">Unlimited</span>
                                                </div>
                                            </div>

                                            {subscription.status === 'TRIAL' && (
                                                <div className="bg-primary-50 p-4 rounded-xl border border-primary-200 mb-6 text-left">
                                                    <h4 className="font-bold text-primary-800 mb-1">Scale your business</h4>
                                                    <p className="text-primary-700 text-sm font-medium mb-3">Upgrade to Premium to get Priority Support, Analytics, and unlimited QR generations.</p>
                                                    <button onClick={handleUpgradePlan} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors block text-center">
                                                        Upgrade to Premium Plan (₹999/mo)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
