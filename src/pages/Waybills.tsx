import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Waybill, Customer } from '../types';
import { FileText, Search, Printer, Trash2, Building2, User, Eye, CheckCircle2, PlusCircle, X, Truck, Package, MapPin, Landmark, ClipboardCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import WaybillModal from '../components/WaybillModal';

export default function Waybills() {
  const [activeTab, setActiveTab] = useState<'waybills' | 'deliveryNotes'>('waybills');
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for generating a waybill
  const [formData, setFormData] = useState({
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

  // Form state for generating a formal structured Delivery Note
  const [noteData, setNoteData] = useState({
    noteNumber: `DN-${Date.now().toString().slice(-6)}`,
    customerName: '',
    recipientName: '',
    deliveryAddress: '',
    orderReference: '',
    itemsDescription: '',
    packagesCount: '1',
    receiverSignaturePlaceholder: 'Received in Good Condition',
  });

  // Fetch collections from Firestore
  useEffect(() => {
    const qWaybills = query(collection(db, 'waybills'), orderBy('createdAt', 'desc'));
    const unsubscribeWaybills = onSnapshot(qWaybills, (snapshot) => {
      const fetched = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Waybill, 'id'>)
      }));
      setWaybills(fetched);
    });

    const qDeliveryNotes = query(collection(db, 'deliveryNotes'), orderBy('createdAt', 'desc'));
    const unsubscribeNotes = onSnapshot(qDeliveryNotes, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setDeliveryNotes(fetchedNotes);
    });

    const qCustomers = query(collection(db, 'customers'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      const fetchedCust = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Customer, 'id'>)
      }));
      setCustomers(fetchedCust);
    });

    return () => {
      unsubscribeWaybills();
      unsubscribeNotes();
      unsubscribeCustomers();
    };
  }, []);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const matchedCustomer = customers.find(c => c.name === selectedName);

    setFormData(prev => ({
      ...prev,
      customerName: selectedName,
      destination: matchedCustomer?.address || matchedCustomer?.city || prev.destination,
      deliveryAddress: matchedCustomer?.address || prev.deliveryAddress,
    }));
  };

  const handleNoteCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const matchedCustomer = customers.find(c => c.name === selectedName);

    setNoteData(prev => ({
      ...prev,
      customerName: selectedName,
      deliveryAddress: matchedCustomer?.address || prev.deliveryAddress,
    }));
  };

  const handleDeleteWaybill = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this waybill?")) return;
    try {
      await deleteDoc(doc(db, 'waybills', id));
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this delivery note?")) return;
    try {
      await deleteDoc(doc(db, 'deliveryNotes', id));
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const handleGenerateWaybill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.destination.trim()) {
      alert('Please fill in required fields.');
      return;
    }

    setSaving(true);
    try {
      let bankDetails = {};
      const settingsDoc = await getDoc(doc(db, 'settings', 'company'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        bankDetails = {
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          accountName: data.accountName || '',
        };
      }

      await addDoc(collection(db, 'waybills'), {
        ...formData,
        status: 'Dispatched',
        items: [{ name: formData.itemsText || 'Standard Cargo Goods', quantity: 1 }],
        ...bankDetails,
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
      alert(err.message || 'Failed to save waybill.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDeliveryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteData.customerName.trim() || !noteData.deliveryAddress.trim()) {
      alert('Please fill in customer and delivery address.');
      return;
    }

    setSaving(true);
    try {
      let companyInfo = {};
      const settingsDoc = await getDoc(doc(db, 'settings', 'company'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        companyInfo = {
          companyName: data.companyName || 'Our Company',
          companyPhone: data.phone || '',
          companyEmail: data.email || '',
          companyAddress: data.address || '',
        };
      }

      await addDoc(collection(db, 'deliveryNotes'), {
        ...noteData,
        ...companyInfo,
        status: 'Delivered / Issued',
        createdAt: serverTimestamp(),
      });

      setIsNoteModalOpen(false);
      setNoteData({
        noteNumber: `DN-${Date.now().toString().slice(-6)}`,
        customerName: '',
        recipientName: '',
        deliveryAddress: '',
        orderReference: '',
        itemsDescription: '',
        packagesCount: '1',
        receiverSignaturePlaceholder: 'Received in Good Condition',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to generate delivery note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-2xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Dispatch &amp; Logistics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your shipment waybills and structured delivery notes.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('waybills')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'waybills' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Waybills ({waybills.length})
          </button>
          <button
            onClick={() => setActiveTab('deliveryNotes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'deliveryNotes' ? 'bg-white text-blue-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Delivery Notes ({deliveryNotes.length})
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-2xl shadow-2xs border border-gray-100">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'waybills' ? 'waybills' : 'delivery notes'}...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {activeTab === 'waybills' ? (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Waybill</span>
          </button>
        ) : (
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Delivery Note</span>
          </button>
        )}
      </div>

      {/* Content View */}
      {activeTab === 'waybills' ? (
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
                {waybills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm">No waybills recorded</p>
                    </td>
                  </tr>
                ) : (
                  waybills.map((w) => (
                    <tr key={w.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-blue-900">{w.waybillNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{w.customerName}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-xs">{w.destination}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{formatDate(w.createdAt || w.date)}</td>
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
                            onClick={() => w.id && handleDeleteWaybill(w.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Note Number</th>
                  <th className="px-4 py-3.5">Customer / Client</th>
                  <th className="px-4 py-3.5">Delivery Address</th>
                  <th className="px-4 py-3.5">Packages</th>
                  <th className="px-4 py-3.5">Date Issued</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveryNotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm">No delivery notes found</p>
                    </td>
                  </tr>
                ) : (
                  deliveryNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-emerald-900">{note.noteNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900">{note.customerName}</td>
                      <td className="px-4 py-3.5 text-gray-600 truncate max-w-xs">{note.deliveryAddress}</td>
                      <td className="px-4 py-3.5 text-gray-600 font-medium">{note.packagesCount} Carton(s)</td>
                      <td className="px-4 py-3.5 text-gray-600">{formatDate(note.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => w => {}} // Add direct view trigger or printer if needed
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Waybill Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Generate Standard Waybill</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateWaybill} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Waybill Number</label>
                  <input type="text" required value={formData.waybillNumber} onChange={(e) => setFormData({ ...formData, waybillNumber: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none font-bold text-blue-950" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Customer Name *</label>
                  <select required value={formData.customerName} onChange={handleCustomerChange} className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-600">
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Destination / Branch *</label>
                  <input type="text" required placeholder="e.g. Central Warehouse" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Vehicle / Truck Number</label>
                  <input type="text" placeholder="e.g. ABC-123-XY" value={formData.vehicleNumber} onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none" />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Full Delivery Address</label>
                <input type="text" placeholder="Street address or delivery location" value={formData.deliveryAddress} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Driver Name</label>
                  <input type="text" placeholder="Driver full name" value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Driver Phone</label>
                  <input type="tel" placeholder="Phone number" value={formData.driverPhone} onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none" />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Cargo Summary</label>
                <input type="text" placeholder="e.g. 20 Cartons of Goods" value={formData.itemsText} onChange={(e) => setFormData({ ...formData, itemsText: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none" />
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center gap-2 text-blue-900">
                <Landmark className="w-4 h-4 shrink-0 text-blue-600" />
                <span className="text-[11px] font-medium">Company bank details will be attached automatically from settings.</span>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-xl text-gray-600 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow cursor-pointer">{saving ? 'Saving...' : 'Save Waybill'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Structured Delivery Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Create Structured Delivery Note</h3>
              </div>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateDeliveryNote} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Delivery Note Number</label>
                  <input type="text" required value={noteData.noteNumber} onChange={(e) => setNoteData({ ...noteData, noteNumber: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none font-bold text-emerald-950" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Customer / Client *</label>
                  <select required value={noteData.customerName} onChange={handleNoteCustomerChange} className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-600">
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Recipient Name</label>
                  <input type="text" placeholder="Person receiving" value={noteData.recipientName} onChange={(e) => setNoteData({ ...noteData, recipientName: e.target.value })} className="w-full border rounded-xl px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Order Reference</label>
                  <input type="text" placeholder="e.g. PO-98231" value={noteData.orderReference} onChange={(e) => setNoteData({ ...noteData, orderReference: e.target.value })} className="w-full border rounded-xl px-3 py-2 outline-none" />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Delivery Destination Address *</label>
                <input type="text" required placeholder="Full street delivery location" value={noteData.deliveryAddress} onChange={(e) => setNoteData({ ...noteData, deliveryAddress: e.target.value })} className="w-full border rounded-xl px-3 py-2 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Package Count</label>
                  <input type="number" min="1" value={noteData.packagesCount} onChange={(e) => setNoteData({ ...noteData, packagesCount: e.target.value })} className="w-full border rounded-xl px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Items Description</label>
                  <input type="text" placeholder="e.g. Assorted Stock / Inventory" value={noteData.itemsDescription} onChange={(e) => setNoteData({ ...noteData, itemsDescription: e.target.value })} className="w-full border rounded-xl px-3 py-2 outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 border rounded-xl text-gray-600 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow cursor-pointer">{saving ? 'Saving...' : 'Save Delivery Note'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <WaybillModal waybill={selectedWaybill} onClose={() => setSelectedWaybill(null)} />
    </div>
  );
}