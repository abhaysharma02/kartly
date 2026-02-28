import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../utils/api';

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
                // To fetch an order publicly, we need a public route.
                // Assuming we add a GET /api/public/orders/:orderId route
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

        // For customers, the server emits to `order_${orderId}`
        socket.on('connect', () => {
            // In our backend, we just explicitly emitted to `order_${orderId}`. 
            // To ensure they receive it, they should join that room, or we can just 
            // listen if the server broadcasts. Since `io.to(room)` requires the socket 
            // to be in the room, we should add a `join_order_room` event.
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
            <div className="flex justify-center items-center h-screen bg-secondary-50">
                <p className="text-secondary-600 font-medium">Generating Receipt...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-secondary-50 p-4 text-center">
                <p className="text-danger-600 font-medium mb-4">{error || 'Order not found.'}</p>
                <Link to={`/q/${vendorId}`} className="text-primary-600 hover:text-primary-800 font-medium">
                    &larr; Return to Menu
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-50 p-4 sm:p-6 lg:p-8 flex justify-center">
            <div className="max-w-md w-full bg-white shadow-xl rounded-xl overflow-hidden">
                {/* Receipt Header */}
                <div className="bg-primary-600 p-6 text-center text-white">
                    <h1 className="text-2xl font-bold tracking-tight pb-1">Order Confirmed!</h1>
                    <p className="text-primary-100 text-sm">Thank you for your order.</p>
                </div>

                <div className="p-6">
                    {/* Token & Status */}
                    <div className="flex justify-between items-start border-b border-secondary-100 pb-4 mb-4">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase font-semibold tracking-wider">Token Number</p>
                            <p className="text-3xl font-black text-secondary-900 leading-none mt-1">#{order.tokenNumber}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-secondary-500 uppercase font-semibold tracking-wider">Status</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 shadow-sm ${order.orderStatus === 'Pending' ? 'bg-warning-100 text-warning-800 border fill-warning-800' :
                                    order.orderStatus === 'Preparing' ? 'bg-primary-100 text-primary-800 blink-text' :
                                        order.orderStatus === 'Ready' ? 'bg-success-100 text-success-800' :
                                            'bg-secondary-200 text-secondary-800'
                                }`}>
                                {order.orderStatus === 'Preparing' && <span className="w-2 h-2 rounded-full bg-primary-500 mr-1.5 animate-pulse"></span>}
                                {order.orderStatus === 'Ready' && <span className="w-2 h-2 rounded-full bg-success-500 mr-1.5"></span>}
                                {order.orderStatus}
                            </span>
                        </div>
                    </div>

                    {/* Vendor Info */}
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-bold text-secondary-800">{vendor?.shopName || 'Vendor'}</h2>
                        <p className="text-xs text-secondary-500">{new Date(order.createdAt).toLocaleString()}</p>
                        <p className="text-xs text-secondary-400 mt-1">Order ID: {order._id}</p>
                    </div>

                    {/* Item List */}
                    <p className="text-xs font-bold text-secondary-800 uppercase tracking-wider mb-2 border-b border-dashed border-secondary-200 pb-1">Items</p>
                    <ul className="space-y-3 mb-6">
                        {order.items.map((item, index) => (
                            <li key={index} className="flex justify-between text-sm">
                                <span className="text-secondary-700">
                                    <span className="font-medium mr-2">{item.quantity}x</span>
                                    {item.name}
                                </span>
                                <span className="font-medium text-secondary-900">₹{item.totalPrice.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Pricing Summary */}
                    <div className="border-t border-dashed border-secondary-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm text-secondary-600">
                            <span>Subtotal</span>
                            <span>₹{order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-secondary-600">
                            <span>GST (5%)</span>
                            <span>₹{order.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-secondary-900 mt-2 border-t border-secondary-100 pt-2">
                            <span>Total</span>
                            <span>₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Status Check */}
                    <div className="mt-8 text-center bg-secondary-50 rounded-lg p-3 border border-secondary-100">
                        <p className="text-xs text-secondary-500 font-medium">Payment Status</p>
                        <p className={`text-sm font-bold mt-1 ${order.paymentStatus === 'SUCCESS' ? 'text-success-600' : 'text-danger-600'}`}>
                            {order.paymentStatus === 'SUCCESS' ? 'PAID ONLINE' : 'UNPAID / PENDING'}
                        </p>
                    </div>

                    {/* Return Action */}
                    <div className="mt-8 text-center">
                        <Link to={`/q/${vendorId}`} className="block w-full py-3 px-4 rounded-lg bg-secondary-100 text-secondary-700 font-medium hover:bg-secondary-200 transition-colors">
                            Place Another Order
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderReceipt;
