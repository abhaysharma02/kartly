import React, { useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { Printer, RefreshCw } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const KOTMonitor = () => {
    const { user } = useContext(AuthContext);
    const [kots, setKots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePrint, setActivePrint] = useState(null); // The specific KOT currently being printed

    useEffect(() => {
        const fetchRecentOrders = async () => {
            try {
                const res = await api.get('/vendor/orders');
                const recentKots = (res.data.orders || []).slice(0, 50).map(o => ({
                    token: o.tokenNumber,
                    tableNumber: o.tableNumber || '-',
                    items: o.items.map(i => ({ name: i.name, qty: i.quantity, note: i.note || '' })),
                    orderTime: o.createdAt,
                    orderId: o._id
                }));
                setKots(recentKots);
            } catch (err) {
                console.error("Failed to load KOTs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentOrders();

        if (user && user.vendorId) {
            const socket = io(SOCKET_URL);
            socket.on('connect', () => {
                socket.emit('join_room', { vendorId: user.vendorId });
            });

            socket.on('kot_print', (kotPayload) => {
                setKots(prev => [kotPayload, ...prev]);
                
                // Auto-print securely by setting state and awaiting render
                setActivePrint(kotPayload);
                setTimeout(() => {
                    window.print();
                    setActivePrint(null);
                }, 500);
            });

            return () => socket.disconnect();
        }
    }, [user]);

    const handleReprint = async (orderId) => {
        try {
            const res = await api.get(`/vendor/orders/${orderId}/kot`);
            if (res.data.success) {
                setActivePrint(res.data.kot);
                setTimeout(() => {
                    window.print();
                    setActivePrint(null);
                }, 100);
            }
        } catch (err) {
            console.error("Manual Reprint Error", err);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 font-mono print:bg-white print:text-black print:p-0">
            {/* --- SCREEN UI --- */}
            <div className="print:hidden">
                <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-2xl font-black text-green-400 flex items-center gap-3">
                        <Printer className="w-8 h-8" /> KITCHEN ORDER TERMINAL
                    </h1>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            Auto-Print Active
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500 mt-20 text-xl font-bold animate-pulse">Loading KOT Data...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {kots.map((kot, i) => (
                            <div key={i} className="bg-gray-900 border-2 border-gray-800 rounded-xl p-5 flex flex-col justify-between hover:border-gray-600 transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-3">
                                        <span className="text-3xl font-black text-white">#{kot.token}</span>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-500 block uppercase">Table</span>
                                            <span className="text-lg font-bold text-green-400">{kot.tableNumber}</span>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 mb-6 text-sm font-bold text-gray-300">
                                        {kot.items.map((item, idx) => (
                                            <li key={idx} className="flex gap-3 items-start">
                                                <span className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs">{item.qty}x</span>
                                                <span className="leading-tight">{item.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button 
                                    onClick={() => handleReprint(kot.orderId)}
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-700"
                                >
                                    <RefreshCw className="w-4 h-4" /> REPRINT
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- PRINT UI (Only visible during window.print()) --- */}
            <div className="hidden print:block w-[80mm] m-0 p-0 text-black font-mono">
                {activePrint && (
                    <div className="p-2">
                        <div className="text-center mb-4 border-b-2 border-black pb-2">
                            <h2 className="text-2xl font-black">K.O.T</h2>
                            <p className="text-xs font-bold mt-1">{new Date(activePrint.orderTime).toLocaleString()}</p>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-4">
                            <div className="flex flex-col">
                                <span className="text-xs uppercase font-bold">Token</span>
                                <span className="text-4xl font-black">#{activePrint.token}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-xs uppercase font-bold">Table</span>
                                <span className="text-3xl font-black leading-none">{activePrint.tableNumber}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <table className="w-full text-left font-bold text-sm">
                                <thead>
                                    <tr className="border-b border-dashed border-gray-400">
                                        <th className="pb-1 w-1/4">QTY</th>
                                        <th className="pb-1 w-3/4">ITEM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activePrint.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-dashed border-gray-300">
                                            <td className="py-2 align-top text-lg font-black">{item.qty}x</td>
                                            <td className="py-2 text-base uppercase leading-tight">{item.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="text-center text-xs font-bold border-t-2 border-black pt-2 uppercase">
                            - END OF TICKET -
                        </div>
                    </div>
                )}
            </div>

            {/* Print CSS explicitly for POS thermal printer override */}
            <style>{`
                @media print {
                    @page { margin: 0; width: 80mm; }
                    body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; width: 80mm; }
                    * { color: black !important; }
                }
            `}</style>
        </div>
    );
};

export default KOTMonitor;
