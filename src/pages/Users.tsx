import React, { useContext, useState } from "react";
import { DataContext } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { User, UserRole, ActiveSession } from "../types";
import { 
  UserPlus, 
  Search, 
  ShieldCheck, 
  User as UserIcon, 
  KeyRound, 
  Edit, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Radio,
  MapPin
} from "lucide-react";
import { apiCall } from "../lib/api";

function formatTimeAgo(isoString?: string) {
  if (!isoString) return "Never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (diffMs < 0 || diffMs < 10000) return "Just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return new Date(isoString).toLocaleDateString([], { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

export default function UsersPage() {
  const { users = [], activeSessions = [], refreshData } = useContext(DataContext);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "user" as UserRole,
    status: "Active"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastCreatedUser, setLastCreatedUser] = useState<{ fullName: string; email: string; role: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isUserOnline = (u: User) => {
    if (u.isOnline) return true;
    const now = Date.now();
    const hasSession = activeSessions.some(
      (s: ActiveSession) => s.userId === u.id && (now - new Date(s.lastActiveAt).getTime() < 90000)
    );
    if (hasSession) return true;
    if (u.lastActiveAt) {
      return (now - new Date(u.lastActiveAt).getTime()) < 90000;
    }
    return false;
  };

  const getUserActiveSession = (u: User) => {
    return activeSessions.find((s: ActiveSession) => s.userId === u.id);
  };

  const filteredUsers = users.filter((u: User) => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    let matchesStatus = true;
    if (statusFilter === "Active") {
      matchesStatus = (u.status || "Active") === "Active";
    } else if (statusFilter === "Inactive") {
      matchesStatus = u.status === "Inactive";
    } else if (statusFilter === "Online") {
      matchesStatus = isUserOnline(u);
    }
    return matchesSearch && matchesRole && matchesStatus;
  });

  const onlineUsers = users.filter((u: User) => isUserOnline(u));
  const totalAdmins = users.filter((u: User) => u.role === "admin").length;
  const totalCashiers = users.filter((u: User) => u.role === "user").length;
  const activeCount = users.filter((u: User) => (u.status || "Active") === "Active").length;
  const inactiveCount = users.filter((u: User) => u.status === "Inactive").length;

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "user",
      status: "Active"
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      fullName: u.fullName,
      email: u.email,
      password: "",
      role: u.role,
      status: u.status || "Active"
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenPasswordModal = (u: User) => {
    setSelectedUserForPassword(u);
    setNewPassword("");
    setShowPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent, andAddAnother: boolean = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: Partial<User> & { id: string; password?: string } = {
          id: editingUser.id,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          status: formData.status
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await apiCall("updateUser", payload);
        showToast(`User "${formData.fullName}" updated successfully!`);
        setIsModalOpen(false);
      } else {
        if (!formData.password) {
          alert("Please enter a password for the new user.");
          setIsSubmitting(false);
          return;
        }
        await apiCall("addUser", formData);
        showToast(`New user "${formData.fullName}" created successfully!`);
        setLastCreatedUser({
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role
        });

        if (andAddAnother) {
          setFormData({
            fullName: "",
            email: "",
            password: "",
            role: "user",
            status: "Active"
          });
        } else {
          setIsModalOpen(false);
        }
      }
      if (refreshData) {
        await refreshData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword) return;
    setIsSubmitting(true);
    try {
      await apiCall("updateUser", {
        id: selectedUserForPassword.id,
        password: newPassword
      });
      showToast(`Password updated for ${selectedUserForPassword.fullName}`);
      setIsPasswordModalOpen(false);
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert("You cannot deactivate your own account.");
      return;
    }
    const nextStatus = u.status === "Inactive" ? "Active" : "Inactive";
    try {
      await apiCall("updateUser", { id: u.id, status: nextStatus });
      showToast(`User status set to ${nextStatus}.`);
      if (refreshData) {
        await refreshData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "Failed to change user status.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiCall("deleteUser", { id: deleteConfirmUser.id });
      showToast(`User "${deleteConfirmUser.fullName}" deleted.`);
      if (refreshData) {
        await refreshData();
      }
      setDeleteConfirmUser(null);
    } catch (error: unknown) {
      const err = error as Error;
      alert(err.message || "Failed to delete user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center max-w-md mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500 mt-1">
          Only administrators have permission to manage staff accounts and user credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-blue-900 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-blue-700">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Staff & User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Create user accounts for station attendants and cashiers, assign permissions, and control login access.
          </p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-5 h-5" /> Create New User
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 relative">
            <Radio className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Active Users Online</p>
            </div>
            <p className="text-2xl font-bold text-emerald-950 mt-0.5">{onlineUsers.length} Logged In</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administrators</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{totalAdmins}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cashiers & Staff</p>
            <p className="text-2xl font-bold text-blue-900 mt-0.5">{totalCashiers}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search staff by full name or email address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="user">Cashiers / Attendants</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Online">🟢 Logged In Now ({onlineUsers.length})</option>
              <option value="Active">Active Accounts</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Email Login</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Live Presence</th>
                <th className="px-5 py-3.5 text-center">Account Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u: User) => {
                const isCurrent = u.id === currentUser?.id;
                const isActive = (u.status || "Active") === "Active";
                const online = isUserOnline(u);

                return (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                            {u.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          {online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {u.fullName}
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                      {u.email}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === "admin" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {u.role === "admin" ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {u.role === "admin" ? "Administrator" : "Cashier / Attendant"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {online ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Online Now</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          Last active: {formatTimeAgo(u.lastActiveAt || u.lastLogin)}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isCurrent}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          isActive 
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        } disabled:opacity-50`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenPasswordModal(u)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmUser(u)}
                        disabled={isCurrent}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-blue-900">
                {editingUser ? "Edit User Account" : "Create New User"}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveUser(e, false)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="jane@croissance.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Cashier / Attendant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isPasswordModalOpen && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-blue-900">Reset Password</h3>
              <button 
                type="button" 
                onClick={() => setIsPasswordModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <p className="text-xs text-gray-600">
                Updating password for <strong className="text-gray-900">{selectedUserForPassword.fullName}</strong>.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-blue-900 hover:bg-blue-800 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-gray-900">Delete User</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{deleteConfirmUser.fullName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}