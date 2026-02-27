import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';

const CustomerMenu = () => {
    const { vendorId } = useParams();

    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Checkout States
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [tokenNumber, setTokenNumber] = useState(null);

    // Load Razorpay Script dynamically
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true);
                // Uses public routes that don't need authentication headers
                const [catsRes, itemsRes] = await Promise.all([
                    api.get(`/public/${vendorId}/categories`),
                    api.get(`/public/${vendorId}/menu-items`)
                ]);

                setCategories(catsRes.data);
                setMenuItems(itemsRes.data);
            } catch (err) {
                // If it's a 403, it's likely a subscription block or similar if we added it,
                // though currently public routes just read by target vendor ID.
                setError(err.response?.data?.error || 'Failed to load menu. Vendor may be inactive.');
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, [vendorId]);

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItemId === item._id);
            if (existing) {
                return prev.map(i => i.menuItemId === item._id
                    ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
                    : i
                );
            }
            return [...prev, {
                menuItemId: item._id,
                name: item.name,
                quantity: 1,
                unitPrice: item.price,
                totalPrice: item.price
            }];
        });
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItemId === itemId);
            if (existing.quantity === 1) {
                return prev.filter(i => i.menuItemId !== itemId);
            }
            return prev.map(i => i.menuItemId === itemId
                ? { ...i, quantity: i.quantity - 1, totalPrice: (i.quantity - 1) * i.unitPrice }
                : i
            );
        });
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsCheckingOut(true);
        setError(null);

        try {
            // Create backend order
            const orderPayload = {
                items: cart,
                subtotal: cartTotal,
                taxAmount: cartTotal * 0.05, // Example 5% tax
                totalAmount: cartTotal * 1.05
            };

            const res = await api.post(`/public/${vendorId}/order`, orderPayload);
            const { orderId, razorpayOrderId, amount, tokenNumber: generatedToken } = res.data;

            // Initialize Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_stub',
                amount: amount,
                currency: "INR",
                name: "Kartly Store",
                description: "Order Payment",
                order_id: razorpayOrderId,
                handler: function (response) {
                    // Frontend success - actual verification happens via backend webhook
                    setOrderSuccess(true);
                    setTokenNumber(generatedToken);
                    setCart([]); // Clear cart
                },
                prefill: {
                    name: "Customer",
                    email: "customer@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#3b82f6"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                setError('Payment failed. Please try again.');
            });
            rzp.open();

        } catch (err) {
            if (err.response?.status === 403) {
                setError('This vendor is not currently accepting orders (Subscription Expired).');
            } else {
                setError('Failed to initiate checkout. Please try again later.');
            }
        } finally {
            setIsCheckingOut(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-secondary-50 flex justify-center items-center"><div className="animate-pulse text-xl text-primary-600 font-bold">Loading Menu...</div></div>;
    }

    if (error && !loading && !categories.length) {
        return (
            <div className="min-h-screen bg-secondary-50 flex justify-center items-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center border-t-4 border-danger-500">
                    <svg className="w-16 h-16 text-danger-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <h2 className="text-2xl font-bold text-secondary-900 mb-2">Unavailable</h2>
                    <p className="text-secondary-600">{error}</p>
                </div>
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-secondary-50 flex flex-col justify-center items-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border-t-4 border-success-500 animate-fade-in-up">
                    <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-secondary-900 mb-2">Order Placed!</h2>
                    <p className="text-secondary-600 mb-8">Your payment was successful and your order has been sent to the kitchen.</p>

                    <div className="bg-secondary-50 p-6 rounded-xl border border-secondary-200 mb-8">
                        <p className="text-sm font-medium text-secondary-500 uppercase tracking-wide mb-1">Your Token Number</p>
                        <p className="text-6xl font-black text-primary-600">{tokenNumber}</p>
                    </div>

                    <button onClick={() => setOrderSuccess(false)} className="w-full bg-secondary-200 hover:bg-secondary-300 text-secondary-800 font-bold py-3 px-4 rounded-xl transition-colors">
                        Order Something Else
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-50 pb-24">
            {/* Header */}
            <header className="bg-white shadow sticky top-0 z-10">
                <div className="max-w-3xl mx-auto py-4 px-4 flex justify-between items-center">
                    <h1 className="text-2xl font-black text-primary-600 tracking-tight">
                        Menu
                    </h1>
                    <div className="flex items-center space-x-2">
                        <div className="bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full font-semibold flex items-center gap-2 shadow-sm border border-primary-100">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <span>{totalItems}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Menu Feed */}
            <main className="max-w-3xl mx-auto py-6 px-4">
                {error && (
                    <div className="bg-danger-50 border-l-4 border-danger-500 p-4 mb-6 rounded shadow-sm">
                        <p className="text-sm text-danger-700 font-medium">{error}</p>
                    </div>
                )}

                {categories.map(category => {
                    const catItems = menuItems.filter(item => item.categoryId === category._id);
                    if (catItems.length === 0) return null;

                    return (
                        <div key={category._id} className="mb-10">
                            <h2 className="text-xl font-bold border-b-2 border-primary-200 pb-2 mb-4 text-secondary-900 sticky top-16 bg-secondary-50 py-2 z-0">
                                {category.name}
                            </h2>
                            <div className="space-y-4">
                                {catItems.map(item => {
                                    const cartItem = cart.find(i => i.menuItemId === item._id);
                                    const isAvailable = item.isAvailable;

                                    return (
                                        <div key={item._id} className={`bg-white rounded-2xl shadow-sm border ${isAvailable ? 'border-secondary-200' : 'border-secondary-100 opacity-60'} overflow-hidden flex transition-all hover:shadow-md`}>
                                            <div className="w-24 h-full min-h-24 bg-secondary-200 shrink-0 relative overflow-hidden">
                                                {item.imageUrl && item.imageUrl !== 'stub' && item.imageUrl !== '' ? (
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover absolute inset-0" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-secondary-400 text-xs font-semibold">No Image</div>
                                                )}
                                            </div>
                                            <div className="p-3 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-secondary-900 text-lg leading-tight">{item.name}</h3>
                                                    </div>
                                                    <p className="text-primary-600 font-bold mt-1">₹{item.price}</p>
                                                    <p className="text-xs text-secondary-500 mt-1 line-clamp-2">{item.description}</p>
                                                </div>

                                                <div className="mt-3 flex justify-end">
                                                    {!isAvailable ? (
                                                        <span className="text-xs font-bold text-danger-500 bg-danger-50 px-2 py-1 rounded">SOLD OUT</span>
                                                    ) : cartItem ? (
                                                        <div className="flex items-center bg-primary-50 rounded-lg overflow-hidden border border-primary-200 shadow-sm">
                                                            <button onClick={() => removeFromCart(item._id)} className="w-8 h-8 flex items-center justify-center text-primary-700 hover:bg-primary-100 font-bold transition-colors">-</button>
                                                            <span className="w-6 text-center font-bold text-primary-900 text-sm">{cartItem.quantity}</span>
                                                            <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center text-primary-700 hover:bg-primary-100 font-bold transition-colors">+</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => addToCart(item)} className="bg-white border-2 border-primary-100 text-primary-600 hover:bg-primary-50 hover:border-primary-200 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                                            ADD
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Floating Checkout Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-secondary-200 p-4 shadow-2xl z-20 animate-fade-in-up">
                    <div className="max-w-3xl mx-auto flex justify-between items-center">
                        <div>
                            <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">Total ({totalItems} items)</p>
                            <p className="text-2xl font-black text-secondary-900">₹{cartTotal.toFixed(2)}</p>
                            <p className="text-xs text-secondary-400">+ taxes</p>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={isCheckingOut}
                            className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-8 py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isCheckingOut ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : 'Pay Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerMenu;
