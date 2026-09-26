import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Waybill } from '../types';
import { FileText, Search, Printer, Trash2, Building2, User, Eye, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import WaybillModal from '../components/WaybillModal';

export default function Waybills() {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'waybills'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Waybill, 'id'>)
      }));
      setWaybills(fetched);
    });

    return () => unsubscribe();
  }, []);

  const filteredWaybills = waybills.filter(w => 
    (w.waybillNumber && w.waybillNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (w.customerName && w.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (w.destination && w.destination.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (w.deliveryAddress && w.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this waybill record?")) return;
    try {
      await deleteDoc(doc(db, 'waybills', id));
    } catch (err: any) {
      alert(err.message || "Failed to delete waybill");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-2xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Waybills &amp; Dispatch</h1>
          <p className="text-xs text-gray-500 mt-1">
            Track product dispatch notes, delivery destinations, and logistics documentation.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search waybill number, customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Waybills Table */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Waybill Number</th>
                <th className="px-4 py-3.5">Customer / Consignee</th>
                <th className="px-4 py-3.5">Destination</th>
                <th className="px-4 py-3.5">Dispatch Date</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWaybills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No waybills found</p>
                    <p className="text-xs text-gray-400 mt-1">Waybills are automatically generated during wholesale order checkouts.</p>
                  </td>
                </tr>
              ) : (
                filteredWaybills.map((w) => (
                  <tr key={w.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-blue-900">
                      {w.waybillNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">
                      {w.customerName}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {w.destination || w.deliveryAddress || 'Standard Store'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {formatDate(w.createdAt || w.date)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {w.status || 'Dispatched'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedWaybill(w)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => w.id && handleDelete(w.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Waybill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waybill Modal Component */}
      <WaybillModal 
        waybill={selectedWaybill} 
        onClose={() => setSelectedWaybill(null)} 
      />
    </div>
  );
}