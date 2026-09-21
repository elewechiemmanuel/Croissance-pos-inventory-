import React, { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { DataContext } from "./Layout";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Truck, 
  BarChart2, 
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
  Droplets,
  FileText,
  Boxes,
  FileSpreadsheet,
  ExternalLink
} from "lucide-react";
import { cn } from "../lib/utils";
import { getStoredSheetInfo } from "../lib/googleSheets";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dataContext = useContext(DataContext);
  const activeSessions = dataContext?.activeSessions || [];
  const users = dataContext?.users || [];

  const onlineCount = users.filter((u: any) => {
    if (u.isOnline) return true;
    const hasSession = activeSessions.some(
      (s: any) => s.userId === u.id && (Date.now() - new Date(s.lastActiveAt).getTime() < 90000)
    );
    return hasSession;
  }).length;

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "user"] },
    { name: "Sales / POS", path: "/pos", icon: ShoppingCart, roles: ["admin", "user"] },
    { name: "Invoices", path: "/invoices", icon: FileText, roles: ["admin", "user"] },
    { name: "Waybill & Delivery", path: "/waybills", icon: Truck, roles: ["admin", "user"] },
    { name: "Products", path: "/products", icon: Package, roles: ["admin", "user"] },
    { name: "Customers", path: "/customers", icon: Users, roles: ["admin", "user"] },
    { name: "Purchases", path: "/purchases", icon: Boxes, roles: ["admin"] },
    { name: "Reports", path: "/reports", icon: BarChart2, roles: ["admin", "user"] },
    { name: "Staff & Users", path: "/users", icon: UserCog, roles: ["admin"] },
    { name: "Settings", path: "/settings", icon: Settings, roles: ["admin"] },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter((item) => 
    user && item.roles.includes(user.role)
  );

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-blue-900 text-white p-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Droplets className="text-amber-500" /> Croissance POS
        </div>
        <button onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-blue-900 text-white flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-2 font-bold text-xl border-b border-blue-800">
          <Droplets className="text-amber-500" /> Croissance POS
        </div>
        
        <div className="p-4 text-sm text-blue-300">
          Welcome, {user?.fullName} <br />
          <span className="capitalize text-amber-500">({user?.role})</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center justify-between px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-blue-800 text-white border-l-4 border-amber-500" 
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              {item.path === "/users" && onlineCount > 0 && (
                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{onlineCount} live</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800 space-y-2">
          {/* Google Sheets Live Database Quick Status */}
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="block p-2.5 rounded-lg bg-blue-950/70 border border-blue-800/80 hover:bg-blue-800 transition-colors group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-[10px] text-blue-300 mt-1 flex items-center justify-between">
              <span>9 Modules Sync</span>
              <span className="text-amber-400 font-medium group-hover:underline">Open Sync</span>
            </p>
          </NavLink>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-300 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
