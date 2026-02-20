/**
 * Auditor Selection Page
 * Page for auditors to select stores and checklists
 */

class AuditorSelectionPage {
    static render(req, res) {
        const currentUser = req.currentUser;
        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Select Store - FS Monitoring</title>
    <link rel="stylesheet" href="/auditor/styles/selection.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>FS Monitoring</h1>
            <p>Welcome, ${currentUser.displayName || currentUser.display_name || 'User'}</p>
        </header>
        
        <main>
            <div class="loading" id="loading">
                <p>Loading stores and checklists...</p>
            </div>
            <form id="selection-form" action="/auditor/start-audit" method="POST" style="display:none;">
                <div class="form-group">
                    <label for="store">Select Store:</label>
                    <select name="store_id" id="store" required>
                        <option value="">-- Choose a store --</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="checklist">Select Checklist:</label>
                    <select name="checklist_id" id="checklist" required>
                        <option value="">-- Choose a checklist --</option>
                    </select>
                </div>
                
                <button type="submit" class="btn-primary">Start Audit</button>
            </form>
        </main>
    </div>
    <script>
        // Load stores and checklists via API
        async function loadData() {
            try {
                const [storesRes, checklistsRes] = await Promise.all([
                    fetch('/api/auditor/stores'),
                    fetch('/api/auditor/checklists')
                ]);
                
                const storesData = await storesRes.json();
                const checklistsData = await checklistsRes.json();
                
                const storeSelect = document.getElementById('store');
                const checklistSelect = document.getElementById('checklist');
                
                if (storesData.stores) {
                    storesData.stores.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.textContent = s.name || s.store_name;
                        storeSelect.appendChild(opt);
                    });
                }
                
                if (checklistsData.checklists) {
                    checklistsData.checklists.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = c.name;
                        checklistSelect.appendChild(opt);
                    });
                }
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('selection-form').style.display = 'block';
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('loading').innerHTML = '<p style="color:red;">Error loading data. Please refresh the page.</p>';
            }
        }
        
        loadData();
    </script>
    <script src="/auditor/scripts/selection.js"></script>
</body>
</html>`);
    }
}

module.exports = AuditorSelectionPage;
