import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { IndianRupee, ChevronLeft, Search, Share2, Star, Clock, Info, ShoppingBag, X, Receipt, Trash2, ChefHat, ScanLine } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const CustomerMenu = () => {
    const { vendorId } = useParams();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]);

    // Vendor Details (Fallback if not provided by public API easily)
    const [vendorDetails, setVendorDetails] = useState({ name: "Kartly Store", businessName: "", upiId: "", rating: "4.5", time: "20-25 mins", type: "Quick Bites" });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Checkout States
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('CART'); // 'CART' | 'PAYMENT' | 'UPI_INTENT'
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const [activeCategory, setActiveCategory] = useState('');
    const [recoveryLink, setRecoveryLink] = useState(null);

    const categoryRefs = useRef({});

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
                const [catsRes, itemsRes, infoRes] = await Promise.all([
                    api.get(`/public/${vendorId}/categories`),
                    api.get(`/public/${vendorId}/menu-items`),
                    api.get(`/public/${vendorId}/info`).catch(err => ({ data: null }))
                ]);

                const activeCats = catsRes.data.filter(c => c.isActive);
                setCategories(activeCats);
                setMenuItems(itemsRes.data);

                if (infoRes.data) {
                    setVendorDetails(prev => ({ ...prev, ...infoRes.data }));
                }

                if (activeCats.length > 0) {
                    setActiveCategory(activeCats[0]._id);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load menu. Store may be inactive at the moment.');
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();

        // Option A (Token Recovery): Check localStorage
        try {
            const data = localStorage.getItem(`kartly_last_order_${vendorId}`);
            if (data) {
                const parsed = JSON.parse(data);
                // Simple 1-hour expiry on local recovery link just so it goes away eventually 
                if (new Date().getTime() - parsed.time < 3600000) {
                    setRecoveryLink(`/q/${vendorId}/receipt/${parsed.orderId}`);
                }
            }
        } catch (e) { /* ignore */ }
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

    const getQuantity = (itemId) => {
        const item = cart.find(i => i.menuItemId === itemId);
        return item ? item.quantity : 0;
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId);
        const element = categoryRefs.current[categoryId];
        if (element) {
            const yOffset = -140; // Adjust for sticky header height
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const closeCart = () => {
        setIsCartOpen(false);
        setTimeout(() => setCheckoutStep('CART'), 300);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsCheckingOut(true);
        setError(null);

        try {
            const orderPayload = {
                items: cart,
                subtotal: cartTotal,
                taxAmount: cartTotal * 0.05,
                totalAmount: cartTotal * 1.05,
                paymentMethod: paymentMethod === 'SCAN_QR' ? 'UPI' : paymentMethod,
                customerPhone: customerPhone,
                customerName: customerName
            };

            const res = await api.post(`/public/${vendorId}/order`, orderPayload);
            const { orderId, paymentMethod: returnedMethod } = res.data;

            // If Cash or UPI, we bypass Razorpay natively on the backend now.
            if (returnedMethod === 'CASH' || returnedMethod === 'UPI' || paymentMethod === 'SCAN_QR') {
                setCart([]);
                const recoveryData = { vendorId, orderId, time: new Date().getTime() };
                localStorage.setItem(`kartly_last_order_${vendorId}`, JSON.stringify(recoveryData));
                navigate(`/q/${vendorId}/receipt/${orderId}`);
                return;
            }

            setCart([]);

            // Option A (Token Recovery): Store the last successful order
            const recoveryData = { vendorId, orderId, time: new Date().getTime() };
            localStorage.setItem(`kartly_last_order_${vendorId}`, JSON.stringify(recoveryData));

            navigate(`/q/${vendorId}/receipt/${orderId}`);
        } catch (err) {
            if (err.response?.status === 403) {
                setError('This vendor is not currently accepting orders.');
            } else {
                setError(err.response?.data?.error || 'Failed to initiate checkout.');
            }
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Filter items by search query and veg status
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesVeg = !vegOnly || item.isVeg !== false;
        // Note: isVeg logic: assuming isVeg is true unless explicitly false. 
        // If the model does not have isVeg, then this won't filter out anything. 
        // We will assume that if we want "Veg Only", we want things that are explicitly veg or not explicitly non-veg. Let's rely on standard logic.
        return matchesSearch && matchesVeg;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-secondary-50 flex flex-col justify-center items-center">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                <div className="text-secondary-500 font-bold animate-pulse">Loading amazing food...</div>
            </div>
        );
    }

    if (error && !loading && !categories.length) {
        return (
            <div className="min-h-screen bg-secondary-50 flex justify-center items-center p-4">
                <div className="bg-white p-8 rounded-3xl premium-shadow max-w-sm w-full text-center border-t-4 border-danger-500">
                    <div className="w-20 h-20 bg-danger-50 text-danger-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 mb-2">Unavailable</h2>
                    <p className="text-secondary-500 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    const renderMenuItem = (item) => {
        const qty = getQuantity(item._id);
        const isAvailable = item.isAvailable;

        return (
            <div key={item._id} className={`flex justify-between gap-4 py-6 border-b border-secondary-100 border-dashed last:border-0 ${!isAvailable ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <div className="flex-1 pr-4">
                    <div className="flex items-start gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-sm border ${item.isVeg !== false ? 'border-success-500' : 'border-danger-500'} flex items-center justify-center flex-shrink-0 mt-1`}>
                            <div className={`w-2 h-2 rounded-full ${item.isVeg !== false ? 'bg-success-500' : 'bg-danger-500'}`}></div>
                        </div>
                        <h3 className="font-black text-secondary-900 text-lg leading-tight">{item.name}</h3>
                    </div>
                    <p className="font-bold text-secondary-900 text-md mb-2">₹{item.price}</p>
                    <p className="text-sm text-secondary-500 font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="w-36 h-36 flex-shrink-0 relative">
                    <div className="w-full h-full rounded-2xl bg-secondary-100 overflow-hidden shadow-inner relative">
                        {item.imageUrl && item.imageUrl !== 'stub' && item.imageUrl !== '' ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-secondary-400 bg-secondary-50">
                                <ShoppingBag className="w-8 h-8 opacity-20 mb-2" />
                            </div>
                        )}
                    </div>

                    {/* Floating Add Button Extracted outside overflow to prevent click blocking */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-28 z-20">
                        {!isAvailable ? (
                            <div className="bg-secondary-100 text-secondary-500 px-3 py-2 rounded-xl text-center font-black text-sm uppercase tracking-wider premium-shadow border border-secondary-200">
                                Sold Out
                            </div>
                        ) : qty > 0 ? (
                            <div className="flex justify-between items-center bg-white rounded-xl premium-shadow border border-primary-100 overflow-hidden">
                                <button onClick={() => removeFromCart(item._id)} className="w-9 h-10 flex items-center justify-center text-primary-600 hover:bg-primary-50 active:bg-primary-100 font-black text-xl transition-colors">
                                    -
                                </button>
                                <span className="font-black text-primary-600 text-md">{qty}</span>
                                <button onClick={() => addToCart(item)} className="w-9 h-10 flex items-center justify-center text-primary-600 hover:bg-primary-50 active:bg-primary-100 font-black text-xl transition-colors">
                                    +
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => addToCart(item)} className="w-full bg-white text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-xl text-center font-black text-[15px] premium-shadow border border-primary-100 tracking-wide uppercase transition-colors relative shadow-lg shadow-primary-500/10">
                                ADD <span className="absolute top-1 right-2 text-xs font-black">+</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-secondary-50 pb-32 md:pb-24 font-sans selection:bg-primary-100 selection:text-primary-900">
            {/* Top Navigation */}
            <header className="bg-white sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center bg-white border-b border-secondary-100">
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 rounded-full bg-secondary-50 hover:bg-secondary-100 flex items-center justify-center text-secondary-900 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 rounded-full bg-secondary-50 hover:bg-secondary-100 flex items-center justify-center text-secondary-900 transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Hero Banner Area */}
                <div className="relative h-36 md:h-48 w-full bg-secondary-900 border-b-4 border-primary-500 shadow-md">
                    <img src={vendorDetails.coverImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80'} alt="Restaurant Cover" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pb-6 z-10">
                        <div className="max-w-2xl mx-auto flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">{vendorDetails.name}</h1>
                                <p className="text-sm font-bold text-gray-300 mt-1 flex items-center gap-1.5 drop-shadow">
                                    <ChefHat className="w-4 h-4 text-primary-400" /> {vendorDetails.type}
                                </p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 bg-success-600/90 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-xl border border-success-400/30 shadow-lg">
                                    <span className="font-black text-sm">{vendorDetails.rating}</span>
                                    <Star className="w-4 h-4 fill-current pt-0.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vendor Info Section */}
                <div className="max-w-2xl mx-auto px-4 py-3 bg-white shadow-sm rounded-b-3xl relative z-20 -mt-4 pb-4 border-x border-b border-secondary-100">
                    <div className="flex gap-4 items-center mb-4 bg-secondary-50 px-4 py-2.5 rounded-2xl border border-secondary-200 shadow-inner">
                        <div className="flex gap-2 items-center text-sm font-black text-secondary-800 tracking-tight">
                            <Clock className="w-4.5 h-4.5 text-primary-600" />
                            <span>{vendorDetails.time}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-200"></div>
                        <div className="flex gap-2 items-center text-sm font-bold text-secondary-600 tracking-tight hover:text-primary-600 transition-colors cursor-pointer">
                            <Info className="w-4.5 h-4.5" />
                            <span>Restaurant Details</span>
                        </div>
                    </div>

                    {/* Search Bar & Veg Filter */}
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-secondary-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search for dishes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white border-2 border-secondary-100 text-secondary-900 text-sm rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 block w-full pl-11 p-3 font-bold transition-all outline-none shadow-sm placeholder:font-medium"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1.5 rounded-full border-2 ${vegOnly ? 'border-success-500 bg-success-50 ring-2 ring-success-500/20' : 'border-secondary-200 bg-white hover:bg-secondary-50'}`}>
                                <div className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors cursor-pointer mr-0.5">
                                    <input type="checkbox" checked={vegOnly} onChange={() => setVegOnly(!vegOnly)} className="sr-only peer" />
                                    <div className={`w-9 h-5 bg-secondary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${vegOnly ? 'bg-success-500' : ''}`}></div>
                                </div>
                                <span className={`text-sm font-black tracking-tight ${vegOnly ? 'text-success-700' : 'text-secondary-600'}`}>Veg Only</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Token Recovery Banner */}
                {recoveryLink && (
                    <div className="max-w-2xl mx-auto px-4 mt-3 animate-fade-in-up flex justify-center w-full z-10 relative">
                        <div className="bg-primary-50 w-full border border-primary-200 rounded-2xl p-3 flex justify-between items-center premium-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                    <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-secondary-900 text-sm">Active Order</h3>
                                    <p className="text-secondary-500 text-xs font-medium">View your live order status</p>
                                </div>
                            </div>
                            <button onClick={() => navigate(recoveryLink)} className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-colors">
                                View Receipt
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Sticky Categories */}
            {!searchQuery && categories.length > 0 && (
                <div className="sticky top-[64px] z-40 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border-b border-secondary-100 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex px-4 py-3 gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat._id}
                                onClick={() => scrollToCategory(cat._id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeCategory === cat._id ? 'bg-primary-600 text-white border-primary-600 premium-shadow' : 'bg-white text-secondary-600 border-secondary-200 hover:bg-secondary-50 hover:border-secondary-300'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                {error && (
                    <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-sm">{error}</span>
                    </div>
                )}

                {searchQuery ? (
                    <div className="mb-10">
                        <h2 className="text-xl font-black text-secondary-900 mb-6 flex items-center gap-2">
                            Search Results
                        </h2>
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-3xl border border-secondary-100">
                                <Search className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                                <p className="text-secondary-500 font-medium text-lg">No matches found</p>
                            </div>
                        ) : (
                            <div className="space-y-2 bg-white p-4 rounded-3xl premium-shadow border border-secondary-100">
                                {filteredItems.map(item => renderMenuItem(item))}
                            </div>
                        )}
                    </div>
                ) : (
                    categories.map(category => {
                        const catItems = menuItems.filter(item => item.categoryId === category._id);
                        if (catItems.length === 0) return null;

                        return (
                            <div
                                key={category._id}
                                id={`category-${category._id}`}
                                ref={el => categoryRefs.current[category._id] = el}
                                className="mb-10 pt-4"
                            >
                                <h2 className="text-2xl font-black text-secondary-900 mb-6 flex items-center justify-between">
                                    <span>{category.name}</span>
                                    <span className="text-sm font-bold text-secondary-400 bg-secondary-100 px-2 py-0.5 rounded-lg border border-secondary-200">{catItems.length}</span>
                                </h2>
                                <div className="space-y-4">
                                    {catItems.map(item => renderMenuItem(item))}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Floating Cart Button (Swiggy Style) */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-[50] animate-fade-in-up flex justify-center pointer-events-none">
                    <div className="bg-success-600 text-white w-full max-w-2xl rounded-2xl premium-shadow p-4 cursor-pointer hover:bg-success-700 transition-colors flex justify-between items-center pointer-events-auto border border-success-500 shadow-[0_-10px_40px_rgba(22,163,74,0.3)]" onClick={() => setIsCartOpen(true)}>
                        <div className="flex flex-col">
                            <span className="font-bold text-xs uppercase tracking-widest bg-success-700/50 px-2 py-1 rounded w-max mb-1 border border-success-500/50">
                                {totalItems} ITEM{totalItems > 1 ? 'S' : ''} ADDED
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xl">₹{cartTotal.toFixed(0)}</span>
                                <span className="text-xs text-success-100 font-medium opacity-80 decoration-success-400 underline decoration-dashed underline-offset-2">plus taxes</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-black text-lg tracking-tight hover:gap-3 transition-all">
                            Checkout <ChevronLeft className="w-6 h-6 rotate-180" />
                        </div>
                    </div>
                </div>
            )}

            {/* Added a spacing div at bottom so cart doesn't cover last item */}
            {cart.length > 0 && <div className="h-28"></div>}

            {/* Cart Modal Overlay */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={closeCart}>
                    <div className="bg-white w-full max-w-2xl rounded-t-3xl p-6 md:p-8 flex flex-col max-h-[90vh] shadow-2xl animate-slide-up relative" onClick={e => e.stopPropagation()}>

                        {/* Header Context */}
                        <div className="flex justify-between items-center mb-6 border-b border-secondary-100 pb-4">
                            <div className="flex items-center gap-3">
                                {checkoutStep !== 'CART' && (
                                    <button onClick={() => setCheckoutStep(checkoutStep === 'UPI_INTENT' ? 'PAYMENT' : 'CART')} className="w-10 h-10 rounded-full bg-secondary-50 hover:bg-secondary-100 flex items-center justify-center">
                                        <ChevronLeft className="w-5 h-5 text-secondary-600" />
                                    </button>
                                )}
                                <h2 className="text-2xl font-black text-secondary-900 tracking-tight">
                                    {checkoutStep === 'CART' ? 'Your Cart' : checkoutStep === 'PAYMENT' ? 'Checkout' : 'Payment'}
                                </h2>
                            </div>
                            <div className="flex gap-2 items-center">
                                {checkoutStep === 'CART' && (
                                    <button onClick={() => setCart([])} className="flex items-center gap-1.5 text-secondary-500 hover:text-danger-600 transition-colors font-bold text-sm px-3 py-1.5 rounded-lg border border-secondary-200 hover:border-danger-200 bg-secondary-50 hover:bg-danger-50">
                                        <Trash2 className="w-4 h-4" /> Clear
                                    </button>
                                )}
                                <button onClick={closeCart} className="w-10 h-10 rounded-full bg-secondary-100 hover:bg-secondary-200 flex items-center justify-center transition-colors">
                                    <X className="w-6 h-6 text-secondary-600" />
                                </button>
                            </div>
                        </div>

                        {/* STEP 1: CART */}
                        {checkoutStep === 'CART' && (
                            <>
                                <div className="overflow-y-auto flex-1 pr-2 no-scrollbar space-y-4 mb-6">
                                    {cart.map(item => (
                                        <div key={item.menuItemId} className="flex justify-between items-center py-3 border-b border-secondary-100 last:border-0">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-secondary-900 text-sm line-clamp-1 pr-2">{item.name}</h4>
                                                <p className="text-primary-600 font-black text-sm mt-0.5">₹{item.unitPrice}</p>
                                            </div>
                                            <div className="flex items-center bg-secondary-50 border border-secondary-200 rounded-xl overflow-hidden ml-2 flex-shrink-0">
                                                <button onClick={() => removeFromCart(item.menuItemId)} className="w-8 h-8 flex items-center justify-center text-secondary-600 hover:bg-secondary-100 font-bold hover:text-danger-600 transition-colors">-</button>
                                                <span className="w-8 text-center text-sm font-black text-secondary-900">{item.quantity}</span>
                                                <button onClick={() => addToCart({ _id: item.menuItemId, name: item.name, price: item.unitPrice })} className="w-8 h-8 flex items-center justify-center text-secondary-600 hover:bg-secondary-100 font-bold hover:text-success-600 transition-colors">+</button>
                                            </div>
                                            <div className="w-16 text-right font-black text-secondary-900 flex-shrink-0">
                                                ₹{item.totalPrice}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-secondary-50 p-5 rounded-2xl mb-6 border border-secondary-100">
                                    <div className="flex justify-between text-sm text-secondary-600 font-medium mb-2">
                                        <span>Subtotal</span>
                                        <span>₹{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-secondary-600 font-medium mb-4 pb-4 border-b border-secondary-200 border-dashed">
                                        <span>Taxes (5% GST)</span>
                                        <span>₹{(cartTotal * 0.05).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-black text-secondary-900">
                                        <span>Grand Total</span>
                                        <span>₹{(cartTotal * 1.05).toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setCheckoutStep('PAYMENT')}
                                    disabled={cart.length === 0}
                                    className="w-full bg-primary-600 text-white font-black py-4 rounded-xl text-lg hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-lg shadow-primary-500/30 flex justify-center items-center gap-2 disabled:opacity-70"
                                >
                                    Proceed to Checkout
                                </button>
                            </>
                        )}


                        {/* STEP 2: PAYMENT INFO */}
                        {checkoutStep === 'PAYMENT' && (
                            <>
                                <div className="mb-6 space-y-3">
                                    <h3 className="font-bold text-secondary-900 mb-2">Contact Info (Optional)</h3>
                                    <div className="flex gap-3">
                                        <input type="text" placeholder="Your Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow placeholder:text-secondary-400" />
                                        <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm font-medium transition-shadow placeholder:text-secondary-400" />
                                    </div>
                                </div>

                                <div className="mb-8 space-y-3">
                                    <h3 className="font-bold text-secondary-900 mb-2">Select Payment Method</h3>
                                    <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${paymentMethod === 'UPI' ? 'border-success-500 bg-success-50 ring-2 ring-success-500/20' : 'border-secondary-200 bg-white hover:bg-secondary-50'}`}>
                                        <input type="radio" name="paymentMethod" value="UPI" checked={paymentMethod === 'UPI'} onChange={() => setPaymentMethod('UPI')} className="w-5 h-5 text-success-600 focus:ring-success-500 border-secondary-300" />
                                        <div className="ml-3 flex-1 flex justify-between items-center">
                                            <span className="font-bold text-secondary-900">Pay via UPI App</span>
                                            <span className="text-xs font-bold bg-success-100 text-success-700 px-2 py-1 rounded-md">Instant</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${paymentMethod === 'SCAN_QR' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20' : 'border-secondary-200 bg-white hover:bg-secondary-50'}`}>
                                        <input type="radio" name="paymentMethod" value="SCAN_QR" checked={paymentMethod === 'SCAN_QR'} onChange={() => setPaymentMethod('SCAN_QR')} className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-secondary-300" />
                                        <div className="ml-3 flex-1 flex justify-between items-center">
                                            <span className="font-bold text-secondary-900">Scan QR Code</span>
                                            <span className="flex items-center gap-1 text-xs font-bold bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded border border-secondary-200"><ScanLine className="w-3 h-3" /> 2 Devices</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${paymentMethod === 'CASH' ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20' : 'border-secondary-200 bg-white hover:bg-secondary-50'}`}>
                                        <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-secondary-300" />
                                        <div className="ml-3">
                                            <span className="font-bold text-secondary-900">Cash on Delivery</span>
                                        </div>
                                    </label>
                                </div>

                                <button
                                    onClick={(e) => {
                                        if (paymentMethod === 'UPI' || paymentMethod === 'SCAN_QR') setCheckoutStep('UPI_INTENT');
                                        else handleCheckout(e);
                                    }}
                                    disabled={isCheckingOut}
                                    className="w-full bg-secondary-900 text-white font-black py-4 rounded-xl text-lg hover:bg-black transition-colors shadow-lg flex justify-center items-center disabled:opacity-70"
                                >
                                    Continue to Confirm
                                </button>
                            </>
                        )}


                        {/* STEP 3: UPI INTENT */}
                        {checkoutStep === 'UPI_INTENT' && (
                            <div className="flex flex-col items-center py-4 space-y-5 animate-fade-in text-center">
                                {paymentMethod === 'SCAN_QR' ? (
                                    <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-secondary-200 mb-2 pointer-events-none premium-shadow">
                                        <QRCodeSVG
                                            value={`upi://pay?pa=${vendorDetails.upiId}&pn=${vendorDetails.businessName}&am=${(cartTotal * 1.05).toFixed(2)}&cu=INR`}
                                            size={200}
                                            level={"H"}
                                            includeMargin={false}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center border-4 border-success-100 shadow-inner mb-2">
                                        <span className="text-3xl font-black text-success-600">₹</span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-2xl font-black text-secondary-900">{paymentMethod === 'SCAN_QR' ? 'Scan to Pay' : 'Complete Payment'}</h3>
                                    <p className="text-secondary-500 font-medium text-sm mt-1 max-w-[250px] mx-auto">
                                        {paymentMethod === 'SCAN_QR'
                                            ? <span>Scan heavily guarded QR with your UPI App to pay <span className="text-secondary-900 font-bold tracking-tight">₹{(cartTotal * 1.05).toFixed(2)}</span></span>
                                            : <span>Tap below to safely open your UPI App and pay <span className="text-secondary-900 font-bold tracking-tight">₹{(cartTotal * 1.05).toFixed(2)}</span></span>
                                        }
                                    </p>
                                    {paymentMethod === 'SCAN_QR' && <p className="text-xs font-bold text-secondary-400 mt-2 tracking-widest uppercase">{vendorDetails.businessName}</p>}
                                </div>

                                {paymentMethod === 'UPI' && (
                                    <a
                                        href={`upi://pay?pa=${vendorDetails.upiId}&pn=${vendorDetails.businessName}&am=${(cartTotal * 1.05).toFixed(2)}&cu=INR`}
                                        className="w-full bg-success-600 text-white font-black py-4 rounded-xl text-lg hover:bg-success-700 transition-colors shadow-lg shadow-success-600/30 flex justify-center items-center mt-4"
                                    >
                                        Pay via UPI App
                                    </a>
                                )}

                                <div className="w-full relative py-2">
                                    <div className="absolute inset-x-0 top-1/2 h-px bg-secondary-200"></div>
                                    <span className="relative bg-white px-3 text-xs font-bold text-secondary-400 uppercase tracking-widest leading-none block w-max mx-auto">Then</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={isCheckingOut}
                                    className="w-full bg-secondary-900 text-white font-black py-4 rounded-xl text-lg hover:bg-black transition-colors shadow-lg flex justify-center items-center relative overflow-hidden disabled:opacity-70"
                                >
                                    {isCheckingOut ? 'Confirming...' : 'I Have Paid'}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in">
                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span className="font-bold text-sm leading-tight">{error}</span>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerMenu;
