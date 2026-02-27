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

    // UI States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form States
    const [newCatName, setNewCatName] = useState('');
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: '', imageUrl: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [catsRes, itemsRes] = await Promise.all([
                api.get('/vendor/categories'),
                api.get('/vendor/menu-items')
            ]);
            setCategories(catsRes.data);
            setMenuItems(itemsRes.data);
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
            setQrData(res.data.qrUrl);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate QR Code');
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
                                                                <button className="bg-success-500 hover:bg-success-600 text-white px-4 py-1.5 rounded font-bold text-sm transition-colors shadow-sm">
                                                                    Mark Ready
                                                                </button>
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
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
