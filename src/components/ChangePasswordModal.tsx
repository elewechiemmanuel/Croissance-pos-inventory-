import React, { useState } from "react";
import { useAuth } from "../store/AuthContext";

export default function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
      <h3 className="font-bold text-gray-800 text-base">Change Password</h3>
      
      {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg">{success}</div>}

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-900 text-white font-bold text-xs rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}