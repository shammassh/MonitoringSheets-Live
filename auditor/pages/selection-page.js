/**
 * Auditor Selection Page
 * Page for auditors to select stores and checklists
 */

class AuditorSelectionPage {
    static render(stores, checklists, currentUser) {
        return `
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
            <p>Welcome, ${currentUser.display_name}</p>
        </header>
        
        <main>
            <form id="selection-form" action="/auditor/start-audit" method="POST">
                <div class="form-group">
                    <label for="store">Select Store:</label>
                    <select name="store_id" id="store" required>
                        <option value="">-- Choose a store --</option>
                        ${stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="checklist">Select Checklist:</label>
                    <select name="checklist_id" id="checklist" required>
                        <option value="">-- Choose a checklist --</option>
                        ${checklists.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                
                <button type="submit" class="btn-primary">Start Audit</button>
            </form>
        </main>
    </div>
    <script src="/auditor/scripts/selection.js"></script>
</body>
</html>`;
    }
}

module.exports = AuditorSelectionPage;
