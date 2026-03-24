import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Store, IndianRupee, UtensilsCrossed, MonitorSpeaker, QrCode, CheckCircle2, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const OnboardingWizard = ({ vendorId, onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    const [shopName, setShopName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    
    const [upiId, setUpiId] = useState('');
    
    const [categoryName, setCategoryName] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    
    const [tables, setTables] = useState(['1', '2', '3', '4']);
    const [newTable, setNewTable] = useState('');
    
    const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
        api.get('/vendor/settings').then(res => {
            if (res.data.settings) {
                setShopName(res.data.settings.shopName || '');
                setOwnerName(res.data.settings.name || '');
                setUpiId(res.data.settings.upiId || '');
            }
        }).catch(err => console.error(err));
    }, []);

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleStep1 = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/vendor/settings', { shopName, name: ownerName });
            nextStep();
        } catch (err) { alert('Failed to save details'); }
        finally { setLoading(false); }
    };

    const handleStep2 = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/vendor/settings', { upiId });
            nextStep();
        } catch (err) { alert('Failed to save UPI'); }
        finally { setLoading(false); }
    };

    const handleStep3 = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const catRes = await api.post('/vendor/categories', { name: categoryName });
            await api.post('/vendor/menu-items', {
                categoryId: catRes.data._id,
                name: itemName,
                price: Number(itemPrice),
                description: 'Our signature dish'
            });
            nextStep();
        } catch (err) { alert('Failed to create initial menu'); }
        finally { setLoading(false); }
    };

    const handleStep4 = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch('/vendor/settings/tables', { tables });
            const qrRes = await api.get('/vendor/qr');
            setQrUrl(`${window.location.origin}${qrRes.data.qrPath}`);
            nextStep();
        } catch (err) { alert('Failed to save tables'); }
        finally { setLoading(false); }
    };

    const handleStep4Takeaway = async () => {
        setLoading(true);
        try {
            await api.patch('/vendor/settings/tables', { tables: [] });
            const qrRes = await api.get('/vendor/qr');
            setQrUrl(`${window.location.origin}${qrRes.data.qrPath}`);
            nextStep();
        } catch (err) { alert('Failed to save'); }
        finally { setLoading(false); }
    };

    const finishOnboarding = async () => {
        setLoading(true);
        try {
            await api.patch('/vendor/onboarding-complete');
            onComplete();
        } catch (err) { alert('Failed to complete setup'); }
        finally { setLoading(false); }
    };

    const removeTable = (tName) => {
        setTables(tables.filter(t => t !== tName));
    };

    const addTable = () => {
        if (newTable && !tables.includes(newTable)) {
            setTables([...tables, newTable]);
            setNewTable('');
        }
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl premium-shadow overflow-hidden flex flex-col border border-secondary-100">
                
                {/* Progress Header */}
                <div className="bg-primary-900 text-white p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
                        <div className="h-full bg-primary-400 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black mb-1">Store Setup Wizard</h2>
                            <p className="text-primary-200 text-sm font-medium">Step {step} of 5</p>
                        </div>
                        <Store className="w-10 h-10 text-primary-400 opacity-50" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8">
                    {step === 1 && (
                        <form onSubmit={handleStep1} className="space-y-6 animate-fade-in">
                            <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-3">
                                <Store className="w-6 h-6 text-primary-500" /> Business Details
                            </h3>
                            <p className="text-secondary-500 font-medium pb-4 border-b border-secondary-100">Let's start by recording your actual storefront designation customers will recognize.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-700 uppercase mb-1">Restaurant / Shop Name</label>
                                    <input required type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. The Spicery" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-700 uppercase mb-1">Owner Name</label>
                                    <input required type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. Rahul Sharma" />
                                </div>
                            </div>
                            
                            <div className="pt-6 flex justify-end">
                                <button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                                    Next Step <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleStep2} className="space-y-6 animate-fade-in">
                            <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-3">
                                <IndianRupee className="w-6 h-6 text-primary-500" /> Payment Setup
                            </h3>
                            <p className="text-secondary-500 font-medium pb-4 border-b border-secondary-100">0% Commission. Customers bypass gateways and pay you directly via native UPI intents.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-700 uppercase mb-1">Merchant UPI ID (VPA)</label>
                                    <input required type="text" value={upiId} onChange={e => setUpiId(e.target.value)} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono text-lg" placeholder="example@okhdfcbank" />
                                    {upiId && (
                                        <p className="text-xs text-success-600 mt-2 font-medium flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Payments will route exclusively to <span className="font-bold">{upiId}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="pt-6 flex justify-between">
                                <button type="button" onClick={prevStep} className="text-secondary-500 hover:text-secondary-900 px-4 py-3 font-bold flex items-center gap-2">
                                    <ChevronLeft className="w-5 h-5" /> Back
                                </button>
                                <button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                                    Continue <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleStep3} className="space-y-6 animate-fade-in">
                            <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-3">
                                <UtensilsCrossed className="w-6 h-6 text-primary-500" /> First Menu Item
                            </h3>
                            <p className="text-secondary-500 font-medium pb-4 border-b border-secondary-100">You must have an active menu entry before your Store QR Code allows customer scanning.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-700 uppercase mb-1">First Category</label>
                                    <input required type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. Main Course, Starters, Drinks" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-700 uppercase mb-1">Item Name</label>
                                        <input required type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. Masala Dosa" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-700 uppercase mb-1">Price (₹)</label>
                                        <input required type="number" min="0" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono" placeholder="120" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-6 flex justify-between">
                                <button type="button" onClick={prevStep} className="text-secondary-500 hover:text-secondary-900 px-4 py-3 font-bold flex items-center gap-2">
                                    <ChevronLeft className="w-5 h-5" /> Back
                                </button>
                                <button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                                    Create Product <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-3">
                                <MonitorSpeaker className="w-6 h-6 text-primary-500" /> Dine-In Layout
                            </h3>
                            <p className="text-secondary-500 font-medium pb-4 border-b border-secondary-100">Setup specific Table routing tracking codes customers can invoke when scanning.</p>
                            
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newTable} 
                                        onChange={e => setNewTable(e.target.value)} 
                                        placeholder="Add table ID (e.g. T-15)"
                                        className="flex-1 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button onClick={addTable} type="button" className="bg-secondary-800 text-white px-6 font-bold rounded-xl hover:bg-black transition-colors">Add</button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {tables.map(t => (
                                        <div key={t} className="bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold">
                                            {t}
                                            <button onClick={() => removeTable(t)} className="text-primary-400 hover:text-danger-500">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {tables.length === 0 && <span className="text-sm text-secondary-400 font-medium italic">No tables defined.</span>}
                                </div>
                            </div>
                            
                            <div className="pt-6 flex justify-between items-center border-t border-secondary-100 mt-6 pt-6">
                                <button type="button" onClick={prevStep} className="text-secondary-500 hover:text-secondary-900 px-4 py-3 font-bold flex items-center gap-2">
                                    <ChevronLeft className="w-5 h-5" /> Back
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={handleStep4Takeaway} disabled={loading} className="text-primary-600 bg-primary-50 hover:bg-primary-100 px-6 py-3 rounded-xl font-bold transition-colors">
                                        Takeaway Only
                                    </button>
                                    <button onClick={handleStep4} disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                                        Save Tables <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-fade-in text-center py-6">
                            <div className="w-20 h-20 bg-success-50 text-success-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-100 shadow-inner">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-3xl font-black text-secondary-900">You're All Set!</h3>
                            <p className="text-secondary-500 font-medium max-w-sm mx-auto">Your store is now operational. Customers scanning this explicit checkout routing token bypass waiting lines entirely.</p>
                            
                            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-secondary-200 mx-auto w-max my-8">
                                <QRCodeSVG value={qrUrl} size={180} level="H" includeMargin={true} />
                            </div>
                            
                            <div className="flex flex-col gap-3 max-w-sm mx-auto">
                                <button onClick={finishOnboarding} disabled={loading} className="w-full bg-success-600 hover:bg-success-700 text-white px-8 py-4 rounded-xl font-black text-lg transition-colors shadow-lg shadow-success-500/30">
                                    Enter Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Simple X icon for deleting tables since it wasn't imported above dynamically
const X = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default OnboardingWizard;
