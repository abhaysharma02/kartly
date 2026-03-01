import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { CheckCircle2, ChefHat, Bell, Receipt, MapPin, Phone, ChevronRight } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const OrderReceipt = () => {
    const { vendorId, orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [vendor, setVendor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchReceiptDetails = async () => {
            try {
                const res = await api.get(`/public/orders/${orderId}`);
                setOrder(res.data.order);
                setVendor(res.data.vendor);
            } catch (err) {
                console.error(err);
                setError('Could not load receipt details.');
            } finally {
                setIsLoading(false);
            }
        };

        if (orderId) {
            fetchReceiptDetails();
        }
    }, [orderId]);

    useEffect(() => {
        if (!orderId) return;

        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            socket.emit('join_order_room', { orderId });
        });

        socket.on('order_status_update', (data) => {
            if (data.orderId === orderId) {
                setOrder(prev => prev ? { ...prev, orderStatus: data.orderStatus } : prev);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [orderId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-secondary-50 flex flex-col justify-center items-center">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                <div className="text-secondary-500 font-bold animate-pulse">Loading your receipt...</div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-secondary-50 flex flex-col justify-center items-center p-4">
                <div className="bg-white p-8 rounded-3xl premium-shadow max-w-sm w-full text-center border-t-4 border-danger-500">
                    <h2 className="text-2xl font-black text-secondary-900 mb-2">Order Not Found</h2>
                    <p className="text-secondary-500 font-medium mb-6">{error || 'We could not find the details for this order.'}</p>
                    <Link to={`/q/${vendorId}`} className="block w-full py-3.5 px-4 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30">
                        Return to Menu
                    </Link>
                </div>
            </div>
        );
    }

    const isPending = order.orderStatus === 'Pending';
    const isPreparing = order.orderStatus === 'Preparing';
    const isReady = order.orderStatus === 'Ready';
    const isCompleted = order.orderStatus === 'Completed';
    const isDone = isReady || isCompleted;

    const getStatusIcon = () => {
        if (isPreparing) return <ChefHat className="w-12 h-12 text-primary-500" />;
        if (isDone) return <Bell className="w-12 h-12 text-success-500" />;
        return <CheckCircle2 className="w-12 h-12 text-warning-500" />;
    };

    const getStatusText = () => {
        if (isPreparing) return 'Your food is being prepared';
        if (isReady) return 'Your food is ready for pickup!';
        if (isCompleted) return 'Order Completed';
        return 'Order Received, waiting for confirmation';
    };

    const getStatusColor = () => {
        if (isPreparing) return 'text-primary-600 bg-primary-50 border-primary-100';
        if (isDone) return 'text-success-600 bg-success-50 border-success-100';
        return 'text-warning-600 bg-warning-50 border-warning-100';
    };

    return (
        <div className="min-h-screen bg-secondary-50 pb-12 font-sans selection:bg-primary-100 selection:text-primary-900">
            {/* Top Navigation */}
            <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-secondary-100">
                <div className="max-w-xl mx-auto px-4 py-4 flex justify-between items-center bg-white">
                    <h1 className="text-xl font-black text-secondary-900 tracking-tight flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary-600" /> Order Summary
                    </h1>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

                {/* Status Hero Card */}
                <div className="bg-white rounded-3xl premium-shadow border border-secondary-100 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>

                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white ${isPreparing ? 'bg-primary-50' : isDone ? 'bg-success-50' : 'bg-warning-50'}`}>
                        {getStatusIcon()}
                    </div>

                    <h2 className="text-2xl font-black text-secondary-900 mb-2">{getStatusText()}</h2>
                    <p className="text-secondary-500 font-medium mb-6">Token #{order.tokenNumber}</p>

                    {/* Progress Steps */}
                    <div className="flex justify-between items-center max-w-xs mx-auto relative px-2 mb-2">
                        <div className="absolute left-[10%] top-1/2 transform -translate-y-1/2 w-[80%] h-1 bg-secondary-100 -z-10 rounded-full"></div>

                        <div className={`absolute left-[10%] top-1/2 transform -translate-y-1/2 h-1 rounded-full transition-all duration-500 -z-10 ${isPending ? 'w-0' : isPreparing ? 'w-[45%] bg-primary-500' : 'w-[80%] bg-success-500'}`}></div>

                        <div className="flex flex-col items-center gap-2 bg-white px-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isPending ? 'bg-warning-500 text-white ring-4 ring-warning-50' : 'bg-success-500 text-white'}`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Received</span>
                        </div>

                        <div className="flex flex-col items-center gap-2 bg-white px-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors delay-100 ${isPreparing ? 'bg-primary-500 text-white ring-4 ring-primary-50' : isDone ? 'bg-success-500 text-white' : 'bg-secondary-200 text-transparent'}`}>
                                <ChefHat className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors delay-100 ${isPreparing || isDone ? 'text-secondary-900' : 'text-secondary-400'}`}>Preparing</span>
                        </div>

                        <div className="flex flex-col items-center gap-2 bg-white px-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors delay-200 ${isDone ? 'bg-success-500 text-white ring-4 ring-success-50 shadow-lg shadow-success-500/40' : 'bg-secondary-200 text-transparent'}`}>
                                <Bell className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors delay-200 ${isDone ? 'text-success-600' : 'text-secondary-400'}`}>Ready</span>
                        </div>
                    </div>
                </div>

                {/* Vendor Details */}
                <div className="bg-white rounded-3xl premium-shadow border border-secondary-100 p-6">
                    <div className="flex items-center gap-4 border-b border-secondary-100 pb-4 mb-4">
                        <div className="w-12 h-12 bg-secondary-50 rounded-xl flex items-center justify-center text-primary-600 border border-secondary-100 shrink-0">
                            <span className="font-black text-xl">{vendor?.shopName?.charAt(0) || 'V'}</span>
                        </div>
                        <div>
                            <h3 className="font-black text-secondary-900 text-lg">{vendor?.shopName || 'Vendor Store'}</h3>
                            <p className="text-secondary-500 text-sm font-medium">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Link to={`/q/${vendorId}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary-50 hover:bg-secondary-100 text-secondary-700 font-bold text-sm transition-colors border border-secondary-200">
                            View Menu <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Bill Breakdown */}
                <div className="bg-white rounded-3xl premium-shadow border border-secondary-100 overflow-hidden">
                    <div className="p-6 bg-secondary-50/50 border-b border-secondary-100">
                        <h3 className="font-black text-secondary-900 text-lg">Bill Details</h3>
                        <p className="text-sm font-medium text-secondary-500">Order ID: {order._id.slice(-8).toUpperCase()}</p>
                    </div>

                    <div className="p-6">
                        <ul className="space-y-4 mb-6">
                            {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between items-start text-sm">
                                    <div className="flex gap-3">
                                        <span className="w-6 h-6 flex justify-center items-center bg-secondary-50 text-secondary-700 font-bold rounded shadow-sm border border-secondary-200 shrink-0">
                                            {item.quantity}
                                        </span>
                                        <span className="font-bold text-secondary-800 mt-0.5">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-secondary-900 mt-0.5">₹{item.totalPrice.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="border-t border-dashed border-secondary-200 pt-4 pb-2 space-y-3">
                            <div className="flex justify-between text-sm font-medium text-secondary-500">
                                <span>Item Total</span>
                                <span>₹{order.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-secondary-500">
                                <span>Taxes & Charges</span>
                                <span>₹{order.taxAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Grand Total */}
                    <div className="p-6 bg-success-50 border-t border-success-100 flex justify-between items-center">
                        <div>
                            <span className="font-black text-success-900 text-xl block">Grand Total</span>
                            <span className={`text-xs font-bold px-2 py-0.5 mt-1 rounded uppercase tracking-widest ${order.paymentStatus === 'SUCCESS' ? 'bg-success-200 text-success-800' : 'bg-danger-200 text-danger-800'}`}>
                                {order.paymentStatus === 'SUCCESS' ? 'PAID ONLINE' : 'PENDING'}
                            </span>
                        </div>
                        <span className="font-black text-3xl text-success-700">₹{order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="text-center pt-4">
                    <p className="text-secondary-400 font-medium text-sm flex items-center justify-center gap-1">
                        Powered by <span className="font-black text-secondary-500 tracking-tight">Nestely</span>
                    </p>
                </div>

            </main>
        </div>
    );
};

export default OrderReceipt;
