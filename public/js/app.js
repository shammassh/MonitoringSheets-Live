/**
 * FS Monitoring Main App
 * Handles PWA initialization, UI, and form submissions
 */

class FSMonitoringApp {
    constructor() {
        this.currentUser = null;
        this.selectedStore = null;
        this.selectedChecklist = null;
        this.isOffline = !navigator.onLine;
        
        this.init();
    }

    async init() {
        console.log('[App] Initializing FS Monitoring...');
        
        // Initialize offline database
        await offlineDB.init();
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Setup sync service listeners
        this.setupSyncListeners();
        
        // Setup UI
        this.setupUI();
        
        // Load cached data
        await this.loadCachedData();
        
        // Update online status
        this.updateOnlineStatus();
        
        console.log('[App] Initialization complete');
    }

    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                window.registration = registration;
                console.log('[App] Service Worker registered');
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('[App] New Service Worker available');
                    this.showUpdateNotification();
                });
            } catch (error) {
                console.error('[App] Service Worker registration failed:', error);
            }
        }
    }

    // Setup sync service listeners
    setupSyncListeners() {
        syncService.on(({ status, message, data }) => {
            this.updateSyncStatus(status, message);
            
            if (status === 'complete' && data) {
                this.showNotification(`Synced ${data.synced} audits`, 'success');
            }
        });
    }

    // Setup UI elements
    setupUI() {
        // Online/offline indicator
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        
        // Install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            this.showInstallButton();
        });
    }

    // Update online status indicator
    updateOnlineStatus() {
        this.isOffline = !navigator.onLine;
        const indicator = document.getElementById('online-status');
        
        if (indicator) {
            if (this.isOffline) {
                indicator.className = 'status-indicator offline';
                indicator.innerHTML = '<span class="dot"></span> Offline';
            } else {
                indicator.className = 'status-indicator online';
                indicator.innerHTML = '<span class="dot"></span> Online';
            }
        }
        
        // Update sync button
        this.updatePendingCount();
    }

    // Update sync status in UI
    updateSyncStatus(status, message) {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.textContent = message;
            syncStatus.className = `sync-status ${status}`;
        }
    }

    // Update pending count badge
    async updatePendingCount() {
        const count = await offlineDB.getPendingCount();
        const badge = document.getElementById('pending-count');
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Load cached data for offline use
    async loadCachedData() {
        try {
            const stores = await offlineDB.getStores();
            const checklists = await offlineDB.getChecklists();
            
            if (stores.length > 0) {
                this.populateStoreSelect(stores);
            }
            
            if (checklists.length > 0) {
                this.populateChecklistSelect(checklists);
            }
            
            console.log(`[App] Loaded ${stores.length} stores, ${checklists.length} checklists from cache`);
        } catch (error) {
            console.error('[App] Failed to load cached data:', error);
        }
    }

    // Populate store dropdown
    populateStoreSelect(stores) {
        const select = document.getElementById('store-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select Store --</option>';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            select.appendChild(option);
        });
    }

    // Populate checklist dropdown
    populateChecklistSelect(checklists) {
        const select = document.getElementById('checklist-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select Checklist --</option>';
        checklists.forEach(checklist => {
            const option = document.createElement('option');
            option.value = checklist.id;
            option.textContent = checklist.name;
            select.appendChild(option);
        });
    }

    // Load checklist items
    async loadChecklistItems(checklistId) {
        let items = [];
        
        if (navigator.onLine) {
            try {
                const response = await fetch(`/api/auditor/checklists/${checklistId}/items`);
                if (response.ok) {
                    items = await response.json();
                    await offlineDB.cacheChecklistItems(checklistId, items);
                }
            } catch (error) {
                console.log('[App] Failed to fetch items, using cache');
                items = await offlineDB.getChecklistItems(checklistId);
            }
        } else {
            items = await offlineDB.getChecklistItems(checklistId);
        }
        
        this.renderChecklistItems(items);
    }

    // Render checklist items as form
    renderChecklistItems(items) {
        const container = document.getElementById('checklist-items');
        if (!container) return;
        
        container.innerHTML = '';
        
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checklist-item';
            itemDiv.innerHTML = `
                <div class="item-question">
                    <span class="item-number">${index + 1}.</span>
                    ${item.question}
                    ${item.is_required ? '<span class="required">*</span>' : ''}
                </div>
                <div class="item-response">
                    <label class="radio-label">
                        <input type="radio" name="item_${item.id}" value="yes" required="${item.is_required}">
                        <span class="radio-btn yes">Yes</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="item_${item.id}" value="no" required="${item.is_required}">
                        <span class="radio-btn no">No</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="item_${item.id}" value="na">
                        <span class="radio-btn na">N/A</span>
                    </label>
                </div>
                <div class="item-notes">
                    <input type="text" name="notes_${item.id}" placeholder="Notes (optional)">
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    // Submit audit form
    async submitAudit(formData) {
        const auditData = {
            storeId: this.selectedStore,
            checklistId: this.selectedChecklist,
            responses: formData.responses,
            submittedAt: new Date().toISOString(),
            submittedBy: this.currentUser?.id
        };

        if (navigator.onLine) {
            // Try to submit directly
            try {
                const response = await fetch('/api/auditor/submit-audit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(auditData)
                });

                if (response.ok) {
                    this.showNotification('Audit submitted successfully!', 'success');
                    return { success: true, online: true };
                } else {
                    throw new Error('Server error');
                }
            } catch (error) {
                console.log('[App] Online submit failed, saving offline');
            }
        }

        // Save offline
        const localId = await offlineDB.savePendingAudit({ data: auditData });
        await this.updatePendingCount();
        
        this.showNotification('Saved offline - will sync when online', 'info');
        
        // Request background sync
        syncService.requestBackgroundSync();
        
        return { success: true, online: false, localId };
    }

    // Manual sync trigger
    async manualSync() {
        if (!navigator.onLine) {
            this.showNotification('Cannot sync - you are offline', 'warning');
            return;
        }
        
        await syncService.syncPendingAudits();
        await this.updatePendingCount();
    }

    // Download data for offline use
    async downloadOfflineData() {
        await syncService.cacheDataForOffline();
        await this.loadCachedData();
        this.showNotification('Data ready for offline use', 'success');
    }

    // Show notification
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications') || document.body;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Show update notification
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <span>A new version is available!</span>
            <button onclick="location.reload()">Update</button>
        `;
        document.body.appendChild(notification);
    }

    // Show install button
    showInstallButton() {
        const btn = document.getElementById('install-btn');
        if (btn) {
            btn.style.display = 'inline-block';
            btn.addEventListener('click', () => this.installApp());
        }
    }

    // Install app
    async installApp() {
        if (this.installPrompt) {
            this.installPrompt.prompt();
            const { outcome } = await this.installPrompt.userChoice;
            console.log('[App] Install prompt outcome:', outcome);
            this.installPrompt = null;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FSMonitoringApp();
});
