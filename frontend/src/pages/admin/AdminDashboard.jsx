import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const AdminDashboard = () => {
    const [data, setData] = useState({ metrics: {}, subscriptions: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [adminSecret, setAdminSecret] = useState(localStorage.getItem('adminSecret') || '');

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await api.get('/admin/analytics', {
                headers: { 'x-admin-secret': adminSecret }
            });

            setData(res.data);
            localStorage.setItem('adminSecret', adminSecret);
        } catch (err) {
            setError('Failed to load admin data. Incorrect secret?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (adminSecret) fetchAnalytics();
    }, []);

    const handleToggleStatus = async (vendorId) => {
        try {
            await api.put(`/admin/vendor/${vendorId}/toggle-status`, {}, {
                headers: { 'x-admin-secret': adminSecret }
            });
            fetchAnalytics(); // Refresh
        } catch (err) {
            alert('Failed to update vendor status.');
        }
    };

    if (!adminSecret && !loading) {
        return (
            <div className="min-h-screen bg-secondary-900 flex justify-center items-center">
                <div className="bg-secondary-800 p-8 rounded-xl max-w-sm w-full shadow-2xl">
                    <h2 className="text-white text-2xl font-bold mb-4">Admin Authentication</h2>
                    <input
                        type="password"
                        value={adminSecret}
                        onChange={e => setAdminSecret(e.target.value)}
                        placeholder="Enter SaaS Admin Secret"
                        className="w-full px-4 py-3 bg-secondary-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                    />
                    <button onClick={fetchAnalytics} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-colors">
                        Access Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (loading) return <div className="min-h-screen bg-secondary-50 flex justify-center items-center font-bold text-xl text-primary-600">Loading SaaS Metrics...</div>;

    return (
        <div className="min-h-screen bg-secondary-50">
            <header className="bg-secondary-900 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-500 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xl">K</div>
                        <h1 className="text-xl font-bold tracking-tight">Kartly SaaS Control Center</h1>
                    </div>
                    <button onClick={() => { setAdminSecret(''); localStorage.removeItem('adminSecret'); }} className="text-secondary-400 hover:text-white text-sm font-medium transition-colors">
                        Lock Terminal
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-6">
                {error && (
                    <div className="bg-danger-500 text-white p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg">
                        <p className="font-medium">{error}</p>
                        <button onClick={() => setAdminSecret('')} className="bg-white text-danger-600 px-4 py-1.5 text-sm font-bold rounded-lg hover:bg-danger-50 transition-colors">Retry Auth</button>
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 border border-secondary-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><svg className="w-16 h-16 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg></div>
                        <p className="text-secondary-500 font-medium text-sm mb-1 z-10 relative">Total Vendors / Active</p>
                        <div className="flex items-end gap-2 z-10 relative">
                            <p className="text-4xl font-black text-secondary-900">{data.metrics.totalVendors}</p>
                            <p className="text-lg font-bold text-success-500 mb-1">({data.metrics.activeVendors})</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-secondary-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><svg className="w-16 h-16 text-warning-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"></path></svg></div>
                        <p className="text-secondary-500 font-medium text-sm mb-1 z-10 relative">Platform Orders</p>
                        <p className="text-4xl font-black text-secondary-900 z-10 relative">{data.metrics.totalOrders}</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-secondary-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><svg className="w-16 h-16 text-success-500" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.311c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.311c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path></svg></div>
                        <p className="text-secondary-500 font-medium text-sm mb-1 z-10 relative">GMV Processed</p>
                        <p className="text-4xl font-black text-secondary-900 z-10 relative"><span className="text-2xl text-secondary-400 font-semibold mr-1">₹</span>{data.metrics.totalPlatformRevenue}</p>
                    </div>

                    <div className="bg-primary-600 rounded-2xl p-6 shadow-md relative overflow-hidden group text-white">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></div>
                        <p className="text-primary-100 font-medium text-sm mb-1 z-10 relative">Active / Expired Subs</p>
                        <p className="text-4xl font-black z-10 relative">{data.metrics.activeSubs + data.metrics.trialSubs} <span className="text-lg font-bold text-primary-200">/ {data.metrics.expiredSubs}</span></p>
                    </div>
                </div>

                {/* Vendor Management List */}
                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                        <h3 className="text-lg font-bold text-secondary-900">Tenant Management</h3>
                        <button onClick={fetchAnalytics} className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Refresh List
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-white">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Vendor / Shop</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Sub Status</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Valid Until</th>
                                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Account Control</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-50">
                                {data.subscriptions.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-secondary-500 italic">No vendors registered yet.</td></tr>
                                ) : data.subscriptions.map((sub, idx) => {
                                    const isSubValid = sub.status === 'ACTIVE' || sub.status === 'TRIAL';
                                    const isAccountActive = sub.vendorStatus === 'ACTIVE';

                                    return (
                                        <tr key={sub._id || idx} className="hover:bg-secondary-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 shrink-0 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                                                        {sub.shopName?.charAt(0) || 'V'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-secondary-900">{sub.shopName}</div>
                                                        <div className="text-sm text-secondary-500 font-medium">{sub.vendorName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md ${sub.status === 'ACTIVE' ? 'bg-success-100 text-success-800' :
                                                        sub.status === 'TRIAL' ? 'bg-warning-100 text-warning-800' :
                                                            'bg-danger-100 text-danger-800'
                                                    }`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`text-sm font-medium ${!isSubValid ? 'text-danger-500' : 'text-secondary-900'}`}>
                                                    {new Date(sub.endDate).toLocaleDateString()}
                                                </div>
                                                {!isSubValid && <div className="text-xs text-danger-500 font-bold mt-0.5">EXPIRED</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(sub._id)} // Requires updating backend logic if sub._id isn't vendor._id mapping perfectly
                                                    className={`px-4 py-1.5 rounded font-bold text-xs uppercase tracking-wide transition-colors ${isAccountActive
                                                            ? 'bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200'
                                                            : 'bg-success-50 text-success-700 hover:bg-success-100 border border-success-200'
                                                        }`}
                                                >
                                                    {isAccountActive ? 'Suspend' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
