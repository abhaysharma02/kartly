import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ChevronLeft, Search, Share2, Star, Clock, Info, ShoppingBag, X } from 'lucide-react';

const CustomerMenu = () => {
    const { vendorId } = useParams();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]);

    // Vendor Details (Fallback if not provided by public API easily, we can just show generic for now if needed, or fetch if available)
    const [vendorDetails, setVendorDetails] = useState({ name: "Kartly Store", rating: "4.5", time: "20-25 mins", type: "Quick Bites" });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Checkout States
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('');

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
                const [catsRes, itemsRes] = await Promise.all([
                    api.get(`/public/${vendorId}/categories`),
                    api.get(`/public/${vendorId}/menu-items`)
                ]);

                const activeCats = catsRes.data.filter(c => c.isActive);
                setCategories(activeCats);
                setMenuItems(itemsRes.data);

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

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsCheckingOut(true);
        setError(null);

        try {
            const orderPayload = {
                items: cart,
                subtotal: cartTotal,
                taxAmount: cartTotal * 0.05,
                totalAmount: cartTotal * 1.05
            };

            const res = await api.post(`/public/${vendorId}/order`, orderPayload);
            const { orderId, razorpayOrderId, amount } = res.data;

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_stub',
                amount: amount,
                currency: "INR",
                name: vendorDetails.name,
                description: "Order Payment",
                order_id: razorpayOrderId,
                handler: function () {
                    setCart([]);
                    navigate(`/q/${vendorId}/receipt/${orderId}`);
                },
                prefill: {
                    name: "Customer",
                    email: "customer@example.com",
                    contact: customerPhone || "9999999999"
                },
                theme: {
                    color: "#f97316" // Orange to match our primary theme
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function () {
                setError('Payment failed. Please try again.');
            });
            rzp.open();

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

    const filteredItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                    <div className={`w-4 h-4 rounded-sm border ${item.isVeg !== false ? 'border-success-500' : 'border-danger-500'} flex items-center justify-center mb-2`}>
                        <div className={`w-2 h-2 rounded-full ${item.isVeg !== false ? 'bg-success-500' : 'bg-danger-500'}`}></div>
                    </div>
                    <h3 className="font-black text-secondary-900 text-lg leading-tight mb-1">{item.name}</h3>
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

                        {/* Floating Add Button Overlapping Image */}
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-28 translate-y-1/2 z-10">
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
                                <button onClick={() => addToCart(item)} className="w-full bg-white text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-xl text-center font-black text-[15px] premium-shadow border border-primary-100 tracking-wide uppercase transition-colors relative">
                                    ADD <span className="absolute top-1 right-2 text-xs font-black">+</span>
                                </button>
                            )}
                        </div>
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

                {/* Vendor Info Section */}
                <div className="max-w-2xl mx-auto px-4 py-5 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-black text-secondary-900 tracking-tight">{vendorDetails.name}</h1>
                            <p className="text-sm text-secondary-500 font-medium mt-1">{vendorDetails.type}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 bg-success-600 text-white px-2 py-1 rounded-lg shadow-sm">
                                <span className="font-bold text-sm">{vendorDetails.rating}</span>
                                <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center mb-5 bg-secondary-50 px-4 py-3 rounded-2xl border border-secondary-100">
                        <div className="flex gap-2 items-center text-sm font-bold text-secondary-700">
                            <Clock className="w-4 h-4 text-primary-500" />
                            <span>{vendorDetails.time}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-secondary-300"></div>
                        <div className="flex gap-2 items-center text-sm font-medium text-secondary-600">
                            <Info className="w-4 h-4" />
                            <span>Details</span>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-secondary-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-secondary-50 border border-secondary-100 text-secondary-900 text-sm rounded-2xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-11 p-3.5 font-medium transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Sticky Categories */}
                {!searchQuery && categories.length > 0 && (
                    <div className="max-w-2xl mx-auto bg-white border-b border-secondary-100 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
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
            </header>

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
                <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-[60] animate-fade-in-up flex justify-center pointer-events-none">
                    <div className="bg-success-600 text-white w-full max-w-2xl rounded-2xl premium-shadow p-4 cursor-pointer hover:bg-success-700 transition-colors flex justify-between items-center pointer-events-auto border border-success-500" onClick={handleCheckout}>
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
        </div>
    );
};

export default CustomerMenu;
