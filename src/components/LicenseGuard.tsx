import React, { useContext } from "react";
import { DataContext } from "./Layout";
import { ShieldAlert } from "lucide-react";

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const data = useContext(DataContext) as any;

  // If context is still loading or unavailable, don't block the app yet
  if (!data || !data.settings) {
    return <>{children}</>;
  }

  const expiryDateStr = data.settings?.licenseExpiryDate;
  
  if (!expiryDateStr) {
    return <>{children}</>;
  }

  const expiryDate = new Date(expiryDateStr);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const isExpired = today > expiryDate;

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-blue-950 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">License Expired</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your 1-year software license for <strong>Croissance POS</strong> has expired. 
            Please reach out to your developer (<strong>Emmytex Favourite Global Ventures</strong>) to renew your license and restore full access.
          </p>
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            Powered by Emmytex Favourite Global Ventures
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}