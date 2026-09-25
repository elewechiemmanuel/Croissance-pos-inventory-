import React, { useContext, useMemo } from "react";
import { DataContext } from "../components/Layout";
import { formatCurrency } from "../lib/utils";
import { Package, Users, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { isToday, isThisMonth, subDays, format, isSameDay } from "date-fns";
import { Product, Sale } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import LowStockReplenishmentWidget from "../components/LowStockReplenishmentWidget";

export default function Dashboard() {
  const data = useContext(DataContext);
  if (!data) return null;

  const { products, customers, sales, refreshData } = data;

  // Calculate metrics
  const todaySales = (sales || []).filter((s: Sale) => isToday(new Date(s.date)));
  const monthSales = (sales || []).filter((s: Sale) => isThisMonth(new Date(s.date)));

  const todayRevenue = todaySales.reduce((sum: number, s: Sale) => sum + s.totalAmount, 0);
  const monthRevenue = monthSales.reduce((sum: number, s: Sale) => sum + s.totalAmount, 0);

  // Dynamic Chart data for past 7 days based on real sales
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const targetDate = subDays(today, i);
      const daySales = (sales || []).filter((s: Sale) => isSameDay(new Date(s.date), targetDate));
      const total = daySales.reduce((sum: number, s: Sale) => sum + s.totalAmount, 0);
      days.push({
        name: format(targetDate, "EEE"),
        dateStr: format(targetDate, "dd MMM"),
        sales: total
      });
    }
    return days;
  }, [sales]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time station operations, sales performance &amp; replenishment monitoring</p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Sales" value={formatCurrency(todayRevenue)} icon={TrendingUp} color="bg-green-500" />
        <StatCard title="This Month" value={formatCurrency(monthRevenue)} icon={ShoppingCart} color="bg-blue-500" />
        <StatCard title="Total Products" value={products?.length || 0} icon={Package} color="bg-amber-500" />
        <StatCard title="Total Customers" value={customers?.length || 0} icon={Users} color="bg-purple-500" />
      </div>

      {/* Main Visual Panels: Sales Overview & Low Stock Replenishment Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Sales Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Weekly Sales Overview</h2>
              <span className="text-xs font-semibold text-gray-400">Past 7 Days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}} 
                    formatter={(value: number) => [formatCurrency(value), "Sales"]} 
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.dateStr || label}
                  />
                  <Bar dataKey="sales" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Weekly Sales Volume:</span>
            <strong className="text-gray-900 font-bold">
              {formatCurrency(chartData.reduce((acc, curr) => acc + curr.sales, 0))}
            </strong>
          </div>
        </div>

        {/* User-Defined Low Stock Replenishment Alert Widget */}
        <div className="lg:col-span-7">
          <LowStockReplenishmentWidget 
            products={products || []} 
            onRefreshData={refreshData}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Recent Transactions</h2>
          <span className="text-xs text-gray-500">Latest completed sales &amp; dispatches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(sales || []).slice(-5).reverse().map((sale: Sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 font-bold text-blue-900">{sale.invoiceNumber}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{sale.customerName || "Walk-in"}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {sale.paymentMethod || "CASH"}
                    </span>
                  </td>
                </tr>
              ))}
              {(!sales || sales.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent transactions recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center shrink-0 shadow-xs`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-500 text-xs font-medium">{title}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}