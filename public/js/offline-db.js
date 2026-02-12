/**
 * Offline Database Module
 * Uses IndexedDB to store data locally when offline
 */

const DB_NAME = 'FSMonitoringDB';
const DB_VERSION = 2;

class OfflineDB {
    constructor() {
        this.db = null;
        this.isReady = false;
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineDB] Failed to open database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('[OfflineDB] Database ready');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Stores cache
                if (!db.objectStoreNames.contains('stores')) {
                    db.createObjectStore('stores', { keyPath: 'id' });
                }

                // Checklists cache
                if (!db.objectStoreNames.contains('checklists')) {
                    db.createObjectStore('checklists', { keyPath: 'id' });
                }

                // Checklist items cache
                if (!db.objectStoreNames.contains('checklistItems')) {
                    const store = db.createObjectStore('checklistItems', { keyPath: 'id' });
                    store.createIndex('checklistId', 'checklist_id', { unique: false });
                }

                // Hygiene employees cache
                if (!db.objectStoreNames.contains('hygieneEmployees')) {
                    db.createObjectStore('hygieneEmployees', { keyPath: 'id' });
                }

                // Hygiene checklist items cache
                if (!db.objectStoreNames.contains('hygieneChecklistItems')) {
                    db.createObjectStore('hygieneChecklistItems', { keyPath: 'id' });
                }

                // Hygiene settings cache
                if (!db.objectStoreNames.contains('hygieneSettings')) {
                    db.createObjectStore('hygieneSettings', { keyPath: 'key' });
                }

                // Pending hygiene submissions (offline)
                if (!db.objectStoreNames.contains('pendingHygieneSubmissions')) {
                    const store = db.createObjectStore('pendingHygieneSubmissions', { keyPath: 'localId', autoIncrement: true });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Pending audits (offline submissions)
                if (!db.objectStoreNames.contains('pendingAudits')) {
                    const store = db.createObjectStore('pendingAudits', { keyPath: 'localId', autoIncrement: true });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Completed audits cache
                if (!db.objectStoreNames.contains('completedAudits')) {
                    const store = db.createObjectStore('completedAudits', { keyPath: 'id' });
                    store.createIndex('syncedAt', 'syncedAt', { unique: false });
                }

                // User session cache
                if (!db.objectStoreNames.contains('userSession')) {
                    db.createObjectStore('userSession', { keyPath: 'key' });
                }

                console.log('[OfflineDB] Database schema created');
            };
        });
    }

    // Generic get all from store
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic get by key
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic put (add or update)
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic delete
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Bulk put
    async bulkPut(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            items.forEach(item => store.put(item));
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Clear store
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ==========================================
    // Specific Methods for FS Monitoring
    // ==========================================

    // Cache stores from server
    async cacheStores(stores) {
        await this.clear('stores');
        await this.bulkPut('stores', stores);
        console.log(`[OfflineDB] Cached ${stores.length} stores`);
    }

    // Get cached stores
    async getStores() {
        return this.getAll('stores');
    }

    // Cache checklists from server
    async cacheChecklists(checklists) {
        await this.clear('checklists');
        await this.bulkPut('checklists', checklists);
        console.log(`[OfflineDB] Cached ${checklists.length} checklists`);
    }

    // Get cached checklists
    async getChecklists() {
        return this.getAll('checklists');
    }

    // Cache checklist items
    async cacheChecklistItems(checklistId, items) {
        const itemsWithChecklistId = items.map(item => ({
            ...item,
            checklist_id: checklistId
        }));
        await this.bulkPut('checklistItems', itemsWithChecklistId);
        console.log(`[OfflineDB] Cached ${items.length} items for checklist ${checklistId}`);
    }

    // Get checklist items
    async getChecklistItems(checklistId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('checklistItems', 'readonly');
            const store = transaction.objectStore('checklistItems');
            const index = store.index('checklistId');
            const request = index.getAll(checklistId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Save pending audit (offline submission)
    async savePendingAudit(auditData) {
        const pendingAudit = {
            ...auditData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            attempts: 0
        };
        
        const localId = await this.put('pendingAudits', pendingAudit);
        console.log(`[OfflineDB] Saved pending audit with localId: ${localId}`);
        return localId;
    }

    // Get all pending audits
    async getPendingAudits() {
        return this.getAll('pendingAudits');
    }

    // Get pending audit count
    async getPendingCount() {
        const pending = await this.getPendingAudits();
        return pending.filter(a => a.status === 'pending').length;
    }

    // Mark audit as synced
    async markAuditSynced(localId, serverId) {
        const audit = await this.get('pendingAudits', localId);
        if (audit) {
            audit.status = 'synced';
            audit.serverId = serverId;
            audit.syncedAt = new Date().toISOString();
            await this.put('pendingAudits', audit);
            
            // Also save to completed audits
            await this.put('completedAudits', {
                id: serverId,
                localId: localId,
                ...audit
            });
        }
    }

    // Mark audit as failed
    async markAuditFailed(localId, error) {
        const audit = await this.get('pendingAudits', localId);
        if (audit) {
            audit.status = 'failed';
            audit.lastError = error;
            audit.attempts = (audit.attempts || 0) + 1;
            await this.put('pendingAudits', audit);
        }
    }

    // Delete synced audits older than X days
    async cleanupSyncedAudits(daysOld = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const pending = await this.getPendingAudits();
        const toDelete = pending.filter(a => 
            a.status === 'synced' && 
            new Date(a.syncedAt) < cutoffDate
        );
        
        for (const audit of toDelete) {
            await this.delete('pendingAudits', audit.localId);
        }
        
        console.log(`[OfflineDB] Cleaned up ${toDelete.length} old synced audits`);
    }

    // Save user session
    async saveSession(sessionData) {
        await this.put('userSession', { key: 'current', ...sessionData });
    }

    // Get user session
    async getSession() {
        return this.get('userSession', 'current');
    }

    // Clear user session
    async clearSession() {
        await this.delete('userSession', 'current');
    }
}

// Create and export singleton instance
const offlineDB = new OfflineDB();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        offlineDB.init().catch(console.error);
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = offlineDB;
}
