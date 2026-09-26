import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Users,
  UserPlus,
  PlusCircle,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

type CustomerStatus = 'Active' | 'Inactive' | 'Pending';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalSpent: number;
  balanceDue: number;
  status: CustomerStatus;
  createdAt?: Timestamp | null;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  balanceDue: number;
  totalSpent: number;
}

const INITIAL_FORM_DATA: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  status: 'Active',
  balanceDue: 0,
  totalSpent: 0,
};

const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const toSafeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const isCustomerStatus = (value: unknown): value is CustomerStatus => {
  return (
    value === 'Active' ||
    value === 'Inactive' ||
    value === 'Pending'
  );
};

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | CustomerStatus
  >('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [formData, setFormData] =
    useState<CustomerFormData>(INITIAL_FORM_DATA);

  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');

    window.setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');

    window.setTimeout(() => {
      setErrorMessage('');
    }, 5000);
  };

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM_DATA });
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    setPaymentAmount(0);
    resetForm();
  };

  useEffect(() => {
    setLoading(true);

    const customersRef = collection(db, 'customers');

    const unsubscribe = onSnapshot(
      customersRef,
      (snapshot) => {
        const customerData: Customer[] = snapshot.docs.map(
          (customerDoc) => {
            const data = customerDoc.data();

            return {
              id: customerDoc.id,
              name:
                typeof data.name === 'string'
                  ? data.name
                  : '',
              email:
                typeof data.email === 'string'
                  ? data.email
                  : '',
              phone:
                typeof data.phone === 'string'
                  ? data.phone
                  : '',
              address:
                typeof data.address === 'string'
                  ? data.address
                  : '',
              totalSpent: toSafeNumber(data.totalSpent),
              balanceDue: toSafeNumber(data.balanceDue),
              status: isCustomerStatus(data.status)
                ? data.status
                : 'Active',
              createdAt: data.createdAt ?? null,
            };
          }
        );

        setCustomers(customerData);
        setLoading(false);
      },
      (error) => {
        console.error(
          'Error fetching customers:',
          error
        );

        setLoading(false);

        showError(
          'Unable to load customers. Please check your Firebase connection and permissions.'
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddCustomer = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();

    if (!name) {
      showError('Customer name is required.');
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      showError('Please enter a valid email address.');
      return;
    }

    if (!phone) {
      showError('Phone number is required.');
      return;
    }

    if (
      formData.balanceDue < 0 ||
      formData.totalSpent < 0
    ) {
      showError('Amounts cannot be negative.');
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, 'customers'), {
        name,
        email,
        phone,
        address,
        status: formData.status,
        balanceDue: toSafeNumber(formData.balanceDue),
        totalSpent: toSafeNumber(formData.totalSpent),
        createdAt: serverTimestamp(),
      });

      closeAllModals();

      showSuccess('Customer added successfully.');
    } catch (error) {
      console.error('Error adding customer:', error);

      showError(
        'Unable to add customer. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCustomer = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!selectedCustomer) {
      showError('No customer selected.');
      return;
    }

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();

    if (!name) {
      showError('Customer name is required.');
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      showError('Please enter a valid email address.');
      return;
    }

    if (!phone) {
      showError('Phone number is required.');
      return;
    }

    setSaving(true);

    try {
      const customerRef = doc(
        db,
        'customers',
        selectedCustomer.id
      );

      await updateDoc(customerRef, {
        name,
        email,
        phone,
        address,
        status: formData.status,
      });

      closeAllModals();

      showSuccess(
        'Customer updated successfully.'
      );
    } catch (error) {
      console.error(
        'Error updating customer:',
        error
      );

      showError(
        'Unable to update customer. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!selectedCustomer) {
      showError('No customer selected.');
      return;
    }

    const amount = toSafeNumber(paymentAmount);
    const currentBalance = toSafeNumber(
      selectedCustomer.balanceDue
    );

    if (amount <= 0) {
      showError(
        'Payment amount must be greater than ₦0.'
      );
      return;
    }

    if (amount > currentBalance) {
      showError(
        `Payment cannot be greater than the outstanding balance of ${formatNaira(
          currentBalance
        )}.`
      );
      return;
    }

    setSaving(true);

    try {
      const newBalance = Math.max(
        0,
        currentBalance - amount
      );

      const customerRef = doc(
        db,
        'customers',
        selectedCustomer.id
      );

      await updateDoc(customerRef, {
        balanceDue: newBalance,
      });

      closeAllModals();

      showSuccess(
        `Payment of ${formatNaira(
          amount
        )} recorded successfully.`
      );
    } catch (error) {
      console.error(
        'Error recording payment:',
        error
      );

      showError(
        'Unable to record payment. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (
    id: string
  ) => {
    const customer = customers.find(
      (item) => item.id === id
    );

    if (!customer) {
      showError('Customer not found.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      await deleteDoc(
        doc(db, 'customers', id)
      );

      showSuccess(
        'Customer deleted successfully.'
      );
    } catch (error) {
      console.error(
        'Error deleting customer:',
        error
      );

      showError(
        'Unable to delete customer. Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openAddModal = () => {
    setSelectedCustomer(null);
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (
    customer: Customer
  ) => {
    setSelectedCustomer(customer);

    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status,
      balanceDue: customer.balanceDue,
      totalSpent: customer.totalSpent,
    });

    setIsEditModalOpen(true);
  };

  const openPaymentModal = (
    customer: Customer
  ) => {
    setSelectedCustomer(customer);

    setPaymentAmount(
      customer.balanceDue > 0
        ? customer.balanceDue
        : 0
    );

    setIsPaymentModalOpen(true);
  };

  const filteredCustomers = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !search ||
        customer.name
          .toLowerCase()
          .includes(search) ||
        customer.email
          .toLowerCase()
          .includes(search) ||
        customer.phone
          .toLowerCase()
          .includes(search) ||
        customer.address
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === 'All' ||
        customer.status === statusFilter;

      return (
        matchesSearch && matchesStatus
      );
    });
  }, [
    customers,
    searchTerm,
    statusFilter,
  ]);

  const totalCustomers =
    customers.length;

  const activeCustomers =
    customers.filter(
      (customer) =>
        customer.status === 'Active'
    ).length;

  const totalOutstanding =
    customers.reduce(
      (total, customer) =>
        total +
        toSafeNumber(
          customer.balanceDue
        ),
      0
    );

  const totalSales =
    customers.reduce(
      (total, customer) =>
        total +
        toSafeNumber(
          customer.totalSpent
        ),
      0
    );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Notifications */}

      {errorMessage && (
        <div className="fixed top-5 right-5 z-[100] max-w-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

          <span className="text-sm">
            {errorMessage}
          </span>

          <button
            type="button"
            onClick={() =>
              setErrorMessage('')
            }
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-5 right-5 z-[100] max-w-md bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />

          <span className="text-sm">
            {successMessage}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccessMessage('')
            }
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Management
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage your customers, balances,
            payments, and account history.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Total Customers
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {totalCustomers}
            </h3>
          </div>

          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Active Customers
            </p>

            <h3 className="text-2xl font-bold text-green-600 mt-1">
              {activeCustomers}
            </h3>
          </div>

          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Outstanding Balance
            </p>

            <h3 className="text-xl font-bold text-orange-600 mt-1">
              {formatNaira(
                totalOutstanding
              )}
            </h3>
          </div>

          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Customer Sales
            </p>

            <h3 className="text-xl font-bold text-blue-600 mt-1">
              {formatNaira(totalSales)}
            </h3>
          </div>

          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Search and Filters */}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

          <input
            type="text"
            placeholder="Search by name, email, phone or address..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-gray-400" />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | 'All'
                  | CustomerStatus
              )
            }
            className="w-full md:w-auto border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="All">
              All Status
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>

            <option value="Pending">
              Pending
            </option>
          </select>
        </div>

      </div>

      {/* Customers Table */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">

            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />

            <p className="text-gray-500">
              {customers.length === 0
                ? 'No customers have been added yet.'
                : 'No customers match your search or filter.'}
            </p>

            {customers.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Add your first customer
              </button>
            )}

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-6">
                    Customer
                  </th>

                  <th className="py-3 px-6">
                    Contact Info
                  </th>

                  <th className="py-3 px-6">
                    Status
                  </th>

                  <th className="py-3 px-6">
                    Balance Due
                  </th>

                  <th className="py-3 px-6">
                    Total Spent
                  </th>

                  <th className="py-3 px-6 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">

                {filteredCustomers.map(
                  (customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 transition-colors"
                    >

                      <td className="py-4 px-6 font-medium text-gray-900">

                        {customer.name ||
                          'Unnamed Customer'}

                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">

                          <MapPin className="w-3 h-3 flex-shrink-0" />

                          <span>
                            {customer.address ||
                              'No address'}
                          </span>

                        </div>

                      </td>

                      <td className="py-4 px-6 text-gray-600">

                        <div className="flex items-center gap-1 text-xs">

                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

                          <span>
                            {customer.email ||
                              'No email'}
                          </span>

                        </div>

                        <div className="flex items-center gap-1 text-xs mt-1">

                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

                          <span>
                            {customer.phone ||
                              'No phone'}
                          </span>

                        </div>

                      </td>

                      <td className="py-4 px-6">

                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.status ===
                            'Active'
                              ? 'bg-green-50 text-green-700'
                              : customer.status ===
                                  'Inactive'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {customer.status}
                        </span>

                      </td>

                      <td className="py-4 px-6 font-medium text-orange-600">
                        {formatNaira(
                          customer.balanceDue
                        )}
                      </td>

                      <td className="py-4 px-6 font-medium text-gray-900">
                        {formatNaira(
                          customer.totalSpent
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">

                        <div className="flex items-center justify-end gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openPaymentModal(
                                customer
                              )
                            }
                            disabled={
                              customer.balanceDue <=
                              0
                            }
                            className="text-emerald-600 hover:text-emerald-800 disabled:text-gray-300 disabled:cursor-not-allowed text-xs font-medium bg-emerald-50 disabled:bg-gray-50 px-2.5 py-1.5 rounded-md"
                            title={
                              customer.balanceDue >
                              0
                                ? 'Record Payment'
                                : 'No outstanding balance'
                            }
                          >
                            Pay
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                customer
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-md hover:bg-blue-50"
                            title="Edit customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCustomer(
                                customer.id
                              )
                            }
                            disabled={
                              deletingId ===
                              customer.id
                            }
                            className="text-red-600 hover:text-red-800 disabled:text-gray-300 p-1.5 rounded-md hover:bg-red-50"
                            title="Delete customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ADD CUSTOMER MODAL */}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">

            <div className="flex items-center justify-between border-b pb-3 mb-4">

              <h3 className="text-lg font-bold text-gray-900">
                Add New Customer
              </h3>

              <button
                type="button"
                onClick={closeAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <form
              onSubmit={handleAddCustomer}
              className="space-y-4"
            >

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>

                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="08012345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>

                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  placeholder="Customer address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status:
                        e.target.value as CustomerStatus,
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                  <option value="Pending">
                    Pending
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Balance Due (₦)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.balanceDue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balanceDue: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">

                <button
                  type="button"
                  onClick={closeAllModals}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Customer'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}

      {isEditModalOpen &&
        selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">

              <div className="flex items-center justify-between border-b pb-3 mb-4">

                <h3 className="text-lg font-bold text-gray-900">
                  Edit Customer
                </h3>

                <button
                  type="button"
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <form
                onSubmit={handleUpdateCustomer}
                className="space-y-4"
              >

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>

                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>

                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>

                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status:
                          e.target.value as CustomerStatus,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>

                    <option value="Pending">
                      Pending
                    </option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Current Balance:
                    </span>

                    <span className="font-semibold text-orange-600">
                      {formatNaira(
                        selectedCustomer.balanceDue
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">
                      Total Spent:
                    </span>

                    <span className="font-semibold text-gray-900">
                      {formatNaira(
                        selectedCustomer.totalSpent
                      )}
                    </span>
                  </div>

                </div>

                <div className="flex justify-end gap-3 pt-3">

                  <button
                    type="button"
                    onClick={closeAllModals}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow disabled:opacity-50"
                  >
                    {saving
                      ? 'Updating...'
                      : 'Update Customer'}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

      {/* RECORD PAYMENT MODAL */}

      {isPaymentModalOpen &&
        selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">

              <div className="flex items-center justify-between border-b pb-3 mb-4">

                <h3 className="text-lg font-bold text-gray-900">
                  Record Payment
                </h3>

                <button
                  type="button"
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2 mb-4">

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Customer:
                  </span>

                  <strong className="text-gray-900">
                    {selectedCustomer.name}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Current Balance:
                  </span>

                  <strong className="text-orange-600">
                    {formatNaira(
                      selectedCustomer.balanceDue
                    )}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Balance After Payment:
                  </span>

                  <strong className="text-green-600">
                    {formatNaira(
                      Math.max(
                        0,
                        selectedCustomer.balanceDue -
                          toSafeNumber(
                            paymentAmount
                          )
                      )
                    )}
                  </strong>
                </div>

              </div>

              <form
                onSubmit={handleRecordPayment}
                className="space-y-4"
              >

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (₦) *
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    max={
                      selectedCustomer.balanceDue
                    }
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(
                        Math.max(
                          0,
                          Number(e.target.value) ||
                            0
                        )
                      )
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />

                  <p className="text-xs text-gray-500 mt-1">
                    Maximum payment:{' '}
                    {formatNaira(
                      selectedCustomer.balanceDue
                    )}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3">

                  <button
                    type="button"
                    onClick={closeAllModals}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      paymentAmount <= 0 ||
                      paymentAmount >
                        selectedCustomer.balanceDue
                    }
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving
                      ? 'Processing...'
                      : 'Confirm Payment'}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </div>
  );
};

export default Customers;