/**
 * ============================================================================
 * GramChakra Frontend - Offline Queue & Synchronization Manager
 * ============================================================================
 * Module: frontend/src/utils/offlineQueue.js
 * Description:
 *   Provides low-bandwidth, offline-first data persistence for rural Swachhata
 *   Doots. Utilizes browser IndexedDB to buffer 4-stream waste logs during edge
 *   network blackouts and flushes queued records atomically when online.
 * 
 * SBM-G Field Context:
 *   Rural collection sheds in Gram Panchayats often operate under 2G or zero
 *   cellular signal. This manager guarantees zero data loss and prevents duplicate
 *   entries using client-generated idempotency UUIDs.
 * ============================================================================
 */

const DB_NAME = 'gramchakra_offline_db';
const STORE_NAME = 'waste_logs_queue';
const DB_VERSION = 1;

/**
 * Initializes and opens the browser IndexedDB instance.
 * @returns {Promise<IDBDatabase>}
 */
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'client_sync_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generates an idempotent client-side UUID v4.
 * @returns {string}
 */
export function generateSyncId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'SYNC_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Enqueues a 4-stream waste log record into IndexedDB.
 * 
 * @param {Object} logData - Waste log data (village_id, weights, fill %)
 * @returns {Promise<Object>} The enqueued record with client_sync_id
 */
export async function enqueueWasteLog(logData) {
  const db = await openOfflineDB();
  const client_sync_id = logData.client_sync_id || generateSyncId();
  const record = {
    ...logData,
    client_sync_id,
    recorded_at: logData.recorded_at || new Date().toISOString(),
    sync_status: 'PENDING'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetches all pending offline records from IndexedDB.
 * @returns {Promise<Array<Object>>}
 */
export async function getPendingQueue() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns the count of pending offline records awaiting sync.
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Flushes the pending IndexedDB queue to the backend API.
 * Automatically deletes successfully persisted items.
 * 
 * @returns {Promise<{ syncedCount: number, error: string|null }>}
 */
export async function flushQueue() {
  try {
    const pendingItems = await getPendingQueue();
    if (pendingItems.length === 0) {
      return { syncedCount: 0, error: null };
    }

    // Call backend batch-sync endpoint
    const response = await fetch('/api/waste-logs/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pendingItems })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Sync failed with HTTP ${response.status}`);
    }

    // Clear successfully synced items from IndexedDB
    const db = await openOfflineDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    return { syncedCount: pendingItems.length, error: null };
  } catch (err) {
    console.warn('[GramChakra Sync] Flush failed, will retry later:', err);
    return { syncedCount: 0, error: err.message };
  }
}
