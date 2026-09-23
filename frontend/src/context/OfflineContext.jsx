import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  enqueueOfflineAction,
  getPendingSyncQueue,
  getPendingOfflineRequests,
  processSyncQueue,
  setCachedData,
  getCachedData
} from '../services/offlineSync';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'ONLINE' : 'OFFLINE');
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [showSyncedToast, setShowSyncedToast] = useState(false);

  const checkPendingQueue = async () => {
    try {
      const pending = await getPendingSyncQueue();
      setPendingQueueCount(pending.length);
    } catch (err) {
      console.error('Check pending queue error:', err);
    }
  };

  const triggerSync = async () => {
    if (!navigator.onLine) return;
    setSyncStatus('Syncing');
    try {
      const result = await processSyncQueue();
      await checkPendingQueue();

      if (result.syncedCount > 0 && result.failedCount === 0) {
        setSyncStatus('Synced');
        setShowSyncedToast(true);
        setTimeout(() => setShowSyncedToast(false), 5000);
      } else if (result.failedCount > 0) {
        setSyncStatus('Sync Failed');
      } else {
        setSyncStatus('ONLINE');
      }
      return result;
    } catch (err) {
      console.error('Trigger sync error:', err);
      setSyncStatus('Sync Failed');
      return { success: false, syncedCount: 0, failedCount: 1 };
    }
  };

  useEffect(() => {
    checkPendingQueue();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('ONLINE');
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addOfflineRequest = async (payload) => {
    const clientRequestId = payload.clientRequestId || `CLIENT-REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const item = await enqueueOfflineAction({
      action: 'CREATE_BLOOD_REQUEST',
      endpoint: '/requests',
      method: 'POST',
      payload: { ...payload, clientRequestId },
      clientRequestId
    });

    await checkPendingQueue();
    setSyncStatus('Pending Sync');
    return item;
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      syncStatus,
      pendingQueueCount,
      showSyncedToast,
      triggerSync,
      addOfflineRequest,
      getPendingOfflineRequests,
      checkPendingQueue,
      setCachedData,
      getCachedData
    }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    // Provide fallback if rendered outside provider
    return {
      isOnline: navigator.onLine,
      syncStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
      pendingQueueCount: 0,
      showSyncedToast: false,
      triggerSync: async () => {},
      addOfflineRequest: async () => {},
      getPendingOfflineRequests: async () => [],
      checkPendingQueue: async () => {},
      setCachedData: async () => {},
      getCachedData: async () => null
    };
  }
  return context;
};

