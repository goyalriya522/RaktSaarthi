import API from './api';

const DB_NAME = 'RaktSaarthiOfflineDB';
const DB_VERSION = 1;
const STORE_CACHED_DATA = 'cached_data';
const STORE_SYNC_QUEUE = 'sync_queue';

/**
 * Initialize native browser IndexedDB database
 */
export const openOfflineDB = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not supported by browser.');
      return resolve(null);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target?.error);
      resolve(null);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_CACHED_DATA)) {
        db.createObjectStore(STORE_CACHED_DATA, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        queueStore.createIndex('clientRequestId', 'clientRequestId', { unique: false });
      }
    };
  });
};

/**
 * Cache an API response data object locally
 */
export const setCachedData = async (key, data) => {
  const db = await openOfflineDB();
  if (!db) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CACHED_DATA, 'readwrite');
    const store = tx.objectStore(STORE_CACHED_DATA);
    store.put({ key, data, cachedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
};

/**
 * Get cached API response data object locally
 */
export const getCachedData = async (key) => {
  const db = await openOfflineDB();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_CACHED_DATA, 'readonly');
    const store = tx.objectStore(STORE_CACHED_DATA);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => resolve(null);
  });
};

/**
 * Add an offline action into the sync queue
 */
export const enqueueOfflineAction = async ({ action, endpoint, method = 'POST', payload, clientRequestId }) => {
  const db = await openOfflineDB();
  const id = `SYNC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const finalClientReqId = clientRequestId || `CLIENT-REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const item = {
    id,
    action,
    endpoint,
    method,
    clientRequestId: finalClientReqId,
    payload: {
      ...payload,
      clientRequestId: finalClientReqId
    },
    createdAt: new Date().toISOString(),
    status: 'Pending Sync', // 'Pending Sync', 'Syncing', 'Synced', 'Sync Failed', 'Conflict'
    attempts: 0,
    lastError: null
  };

  if (db) {
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      store.put(item);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  return item;
};

/**
 * Get all sync queue items regardless of status
 */
export const getAllSyncQueue = async () => {
  const db = await openOfflineDB();
  if (!db) return [];

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
};

/**
 * Get all pending/failed sync queue items
 */
export const getPendingSyncQueue = async () => {
  const items = await getAllSyncQueue();
  const pending = items.filter(i => i.status === 'Pending Sync' || i.status === 'Sync Failed');
  pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return pending;
};

/**
 * Retrieve offline created blood requests formatted for UI display
 */
export const getPendingOfflineRequests = async () => {
  const items = await getAllSyncQueue();
  const offlineRequests = items
    .filter(i => i.action === 'CREATE_BLOOD_REQUEST')
    .map(i => {
      const p = i.payload || {};
      return {
        _id: i.clientRequestId || i.id,
        clientRequestId: i.clientRequestId,
        requestNumber: `OFFLINE-${i.id.slice(-6)}`,
        patientName: p.patientName || 'Patient',
        age: p.age || 0,
        gender: p.gender || 'Other',
        bloodGroup: p.bloodGroup || 'O+',
        unitsRequired: p.unitsRequired || 1,
        hospitalName: p.hospitalName || 'Hospital',
        hospitalAddress: p.hospitalAddress || '',
        emergencyLevel: p.emergencyLevel || 'URGENT',
        reason: p.reason || '',
        contactPhone: p.contactPhone || '',
        status: i.status, // 'Pending Sync', 'Syncing', 'Synced', 'Sync Failed'
        isOfflineRecord: true,
        createdAt: i.createdAt
      };
    });

  return offlineRequests;
};

/**
 * Update queue item status
 */
export const updateSyncItemStatus = async (id, status, lastError = null) => {
  const db = await openOfflineDB();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = {
          ...getReq.result,
          status,
          attempts: (getReq.result.attempts || 0) + 1,
          lastError,
          updatedAt: new Date().toISOString()
        };
        store.put(updated);
      }
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
};

/**
 * Process all pending actions in the sync queue when online connection is restored
 */
export const processSyncQueue = async () => {
  if (!navigator.onLine) {
    return { success: false, message: 'Offline', syncedCount: 0, failedCount: 0 };
  }

  const queue = await getPendingSyncQueue();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      await updateSyncItemStatus(item.id, 'Syncing');

      const payloadWithIdempotency = {
        ...item.payload,
        clientRequestId: item.clientRequestId
      };

      let res;
      if (item.method === 'POST') {
        res = await API.post(item.endpoint, payloadWithIdempotency);
      } else if (item.method === 'PUT') {
        res = await API.put(item.endpoint, payloadWithIdempotency);
      }

      if (res && res.data && res.data.success) {
        await updateSyncItemStatus(item.id, 'Synced');
        syncedCount++;
      } else {
        await updateSyncItemStatus(item.id, 'Sync Failed', res?.data?.message || 'Server error');
        failedCount++;
      }
    } catch (err) {
      console.error(`Sync error for item ${item.id}:`, err);
      const errMsg = err.response?.data?.message || err.message || 'Network error';
      await updateSyncItemStatus(item.id, 'Sync Failed', errMsg);
      failedCount++;
    }
  }

  return {
    success: failedCount === 0,
    syncedCount,
    failedCount
  };
};

