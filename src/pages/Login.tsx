import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Droplets, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <Droplets className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-blue-950">Croissance Oil & Gas</h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise Management Portal</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl mb-5 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@croissance.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm shadow-sm disabled:opacity-60"
          >
            {loading ? "Authenticating..." : (
              <>
                <Lock className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
