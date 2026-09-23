import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudUpload } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';

const OfflineBanner = () => {
  const { isOnline, syncStatus, pendingQueueCount, showSyncedToast, triggerSync } = useOffline();

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-bold transition-all animate-in fade-in duration-300">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>You're offline. Changes will sync automatically when you're back online.</span>
          </div>
          {pendingQueueCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-black/20 text-white font-extrabold text-[10px] border border-white/30">
              {pendingQueueCount} Pending Sync
            </span>
          )}
        </div>
      </div>
    );
  }

  if (syncStatus === 'Syncing') {
    return (
      <div className="bg-purple-600 text-white px-4 py-2.5 shadow-md flex items-center justify-center text-xs font-bold">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing pending offline changes...</span>
        </div>
      </div>
    );
  }

  if (showSyncedToast || syncStatus === 'Synced') {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-md flex items-center justify-center text-xs font-bold transition-all animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>All changes synced successfully.</span>
        </div>
      </div>
    );
  }

  if (syncStatus === 'Sync Failed') {
    return (
      <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Some changes couldn't be synced.</span>
          </div>
          <button
            onClick={triggerSync}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-colors"
          >
            <CloudUpload className="w-3.5 h-3.5" /> Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
