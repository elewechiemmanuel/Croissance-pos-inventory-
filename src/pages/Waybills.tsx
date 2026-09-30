import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Waybill } from '../types';
import { FileText, Search, Printer, Trash2, Building2, User, Eye, CheckCircle2, PlusCircle, X, Truck, Package, MapPin } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import WaybillModal from '../components/WaybillModal';

export default function Waybills() {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for manually generating a waybill
  const [formData, setFormData] = useState({
    waybillNumber: `WB-${Date.now().toString().slice(-6)}`,
    customerName: '',
    destination: '',
    deliveryAddress: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    notes: '',
    itemsText: '', // Simple item breakdown entry
  });

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

  const handleGenerateWaybill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.destination.trim()) {
      alert('Please fill in the customer name and destination.');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'waybills'), {
        waybillNumber: formData.waybillNumber,
        customerName: formData.customerName.trim(),
        destination: formData.destination.trim(),
        deliveryAddress: formData.deliveryAddress.trim(),
        vehicleNumber: formData.vehicleNumber.trim(),
        driverName: formData.driverName.trim(),
        driverPhone: formData.driverPhone.trim(),
        notes: formData.notes.trim(),
        status: 'Dispatched',
        items: [{ name: formData.itemsText || 'General Dispatch Cargo', quantity: 1 }],
        createdAt: serverTimestamp(),
      });

      setIsCreateModalOpen(false);
      setFormData({
        waybillNumber: `WB-${Date.now().toString().slice(-6)}`,
        customerName: '',
        destination: '',
        deliveryAddress: '',
        vehicleNumber: '',
        driverName: '',
        driverPhone: '',
        notes: '',
        itemsText: '',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to generate waybill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-2xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Waybills &amp; Dispatch</h1>
          <p className="text-xs text-gray-500 mt-1">
            Track product dispatch notes, delivery destinations, and logistics documentation.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search waybill number, customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Waybill</span>
          </button>
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
                    <p className="text-xs text-gray-400 mt-1">Generate a waybill manually or via wholesale order checkouts.</p>
                  </td>
                </tr>
              ) : (
                filteredWaybills.map((w) => (
                  <tr key={w.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-blue-900">
                      {w.waybillNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{w.customerName || 'Walk-in Customer'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-xs">{w.destination || w.deliveryAddress || 'Standard Store'}</span>
                      </div>
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
                          <span>View / Print</span>
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

      {/* Manual Waybill Generation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Generate Standard Waybill</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateWaybill} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Waybill Number</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.waybillNumber}
                    onChange={(e) => setFormData({ ...formData, waybillNumber: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none font-bold text-blue-950"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Customer / Consignee Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter customer name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Destination / Branch *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Abuja Central Depot"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Vehicle / Truck Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ABC-123-XY"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Full Delivery Address</label>
                <input 
                  type="text" 
                  placeholder="Street address or delivery depot location"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Driver Name</label>
                  <input 
                    type="text" 
                    placeholder="Driver full name"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Driver Phone</label>
                  <input 
                    type="tel" 
                    placeholder="Phone number"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Cargo / Items Summary</label>
                <input 
                  type="text" 
                  placeholder="e.g. 50x Cartons of Merchandise / Goods"
                  value={formData.itemsText}
                  onChange={(e) => setFormData({ ...formData, itemsText: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Dispatch Notes / Remarks</label>
                <textarea 
                  rows={2}
                  placeholder="Additional instructions or handling terms..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Create & Save Waybill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waybill Detail & Print Modal Component */}
      <WaybillModal 
        waybill={selectedWaybill} 
        onClose={() => setSelectedWaybill(null)} 
      />
    </div>
  );
}