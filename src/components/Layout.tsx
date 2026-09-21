import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import Sidebar from "./Sidebar";
import { apiCall } from "../lib/api";

export const DataContext = React.createContext<any>(null);

export default function Layout() {
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const refreshData = async () => {
    try {
      const res = await apiCall("getInitialData");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
      const interval = setInterval(() => {
        refreshData();
      }, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (dataLoading) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-blue-900">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
      <p>Loading application data...</p>
    </div>;
  }

  return (
    <DataContext.Provider value={{ ...data, refreshData }}>
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </DataContext.Provider>
  );
}
