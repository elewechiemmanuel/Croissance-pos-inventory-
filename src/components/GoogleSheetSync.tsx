import React from "react";

export default function GoogleSheetSync({ appData, onRefreshLocalData }: { appData: any; onRefreshLocalData?: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-md font-bold text-gray-900">Google Sheets Sync</h3>
      <p className="text-xs text-gray-500 mt-1">
        Manage cloud synchronization between your POS system and Google Sheets.
      </p>
      {/* Add your sync UI/logic here */}
    </div>
  );
}