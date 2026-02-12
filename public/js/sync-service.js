/**
 * Sync Service
 * Handles syncing offline data with the server
 */

class SyncService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.listeners = [];
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Listen for service worker sync messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_PENDING') {
                    this.syncPendingAudits();
                }
            });
        }
    }

    // Handle coming online
    async handleOnline() {
        console.log('[Sync] Connection restored');
        this.isOnline = true;
        this.notify('online', 'Connection restored');
        
        // Auto-sync pending data
        await this.syncPendingAudits();
    }

    // Handle going offline
    handleOffline() {
        console.log('[Sync] Connection lost');
        this.isOnline = false;
        this.notify('offline', 'Working offline');
    }

    // Add event listener
    on(callback) {
        this.listeners.push(callback);
    }

    // Notify all listeners
    notify(status, message, data = null) {
        this.listeners.forEach(callback => {
            callback({ status, message, data });
        });
    }

    // Check if online
    checkOnline() {
        return navigator.onLine;
    }

    // Sync all pending audits
    async syncPendingAudits() {
        if (this.isSyncing || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        this.notify('syncing', 'Syncing offline data...');

        try {
            const pendingAudits = await offlineDB.getPendingAudits();
            const toSync = pendingAudits.filter(a => a.status === 'pending');

            if (toSync.length === 0) {
                console.log('[Sync] No pending audits to sync');
                this.notify('idle', 'All data synced');
                return;
            }

            console.log(`[Sync] Syncing ${toSync.length} pending audits...`);
            let synced = 0;
            let failed = 0;

            for (const audit of toSync) {
                try {
                    const response = await fetch('/api/auditor/submit-audit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(audit.data)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        await offlineDB.markAuditSynced(audit.localId, result.id);
                        synced++;
                        console.log(`[Sync] Synced audit ${audit.localId} → Server ID: ${result.id}`);
                    } else {
                        throw new Error(`Server returned ${response.status}`);
                    }
                } catch (error) {
                    console.error(`[Sync] Failed to sync audit ${audit.localId}:`, error);
                    await offlineDB.markAuditFailed(audit.localId, error.message);
                    failed++;
                }
            }

            this.notify('complete', `Synced ${synced} audits`, { synced, failed });
            
            // Clean up old synced data
            await offlineDB.cleanupSyncedAudits();

        } catch (error) {
            console.error('[Sync] Sync failed:', error);
            this.notify('error', 'Sync failed');
        } finally {
            this.isSyncing = false;
        }
    }

    // Request background sync (if supported)
    async requestBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.registration) {
            try {
                await window.registration.sync.register('sync-pending-audits');
                console.log('[Sync] Background sync registered');
            } catch (error) {
                console.error('[Sync] Background sync registration failed:', error);
            }
        }
    }

    // Cache data for offline use
    async cacheDataForOffline() {
        if (!this.isOnline) {
            console.log('[Sync] Cannot cache data - offline');
            return;
        }

        try {
            this.notify('caching', 'Downloading data for offline use...');

            // Fetch and cache stores
            const storesResponse = await fetch('/api/auditor/stores');
            if (storesResponse.ok) {
                const stores = await storesResponse.json();
                await offlineDB.cacheStores(stores);
            }

            // Fetch and cache checklists
            const checklistsResponse = await fetch('/api/auditor/checklists');
            if (checklistsResponse.ok) {
                const checklists = await checklistsResponse.json();
                await offlineDB.cacheChecklists(checklists);
                
                // Cache checklist items for each checklist
                for (const checklist of checklists) {
                    const itemsResponse = await fetch(`/api/auditor/checklists/${checklist.id}/items`);
                    if (itemsResponse.ok) {
                        const items = await itemsResponse.json();
                        await offlineDB.cacheChecklistItems(checklist.id, items);
                    }
                }
            }

            this.notify('cached', 'Data ready for offline use');
            console.log('[Sync] Data cached for offline use');

        } catch (error) {
            console.error('[Sync] Failed to cache data:', error);
            this.notify('error', 'Failed to download offline data');
        }
    }

    // Get sync status
    async getStatus() {
        const pendingCount = await offlineDB.getPendingCount();
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            pendingCount: pendingCount
        };
    }
}

// Create singleton instance
const syncService = new SyncService();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = syncService;
}
