/**
 * Vegetables & Fruits Washing and Disinfecting Monitoring Module
 * Form 12: Track washing and disinfecting of vegetables and fruits
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const sql = require('mssql');

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Kokowawa123@@',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'FSMonitoringDB_UAT',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Get database connection
async function getPool() {
    try {
        const pool = await sql.connect(dbConfig);
        return pool;
    } catch (err) {
        console.error('Database connection error:', err);
        throw err;
    }
}

// Disable caching for API responses
router.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Serve static pages
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

router.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

router.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'history.html'));
});

router.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

// API: Get current user
router.get('/api/current-user', (req, res) => {
    if (req.currentUser) {
        res.json({
            name: req.currentUser.displayName || req.currentUser.name,
            email: req.currentUser.email,
            role: req.currentUser.role
        });
    } else {
        res.json({ name: 'Unknown User', email: '', role: 'User' });
    }
});

// ==========================================
// Items Management APIs
// ==========================================

// Get all items
router.get('/api/items', async (req, res) => {
    try {
        const { category } = req.query;
        const pool = await getPool();
        
        let query = 'SELECT * FROM VegFruitItems WHERE is_active = 1';
        const request = pool.request();
        
        if (category) {
            query += ' AND category = @category';
            request.input('category', sql.NVarChar, category);
        }
        
        query += ' ORDER BY category, name';
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Add item
router.post('/api/items', async (req, res) => {
    try {
        const { name, category } = req.body;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('category', sql.NVarChar, category || 'Vegetable')
            .query(`INSERT INTO VegFruitItems (name, category) 
                    OUTPUT INSERTED.* 
                    VALUES (@name, @category)`);
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error adding item:', err);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Update item
router.put('/api/items/:id', async (req, res) => {
    try {
        const { name, category } = req.body;
        const pool = await getPool();
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('category', sql.NVarChar, category)
            .query(`UPDATE VegFruitItems SET 
                    name = @name, 
                    category = @category,
                    updated_at = GETDATE()
                    WHERE id = @id`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating item:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Delete item (soft delete)
router.delete('/api/items/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE VegFruitItems SET is_active = 0, updated_at = GETDATE() WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// ==========================================
// Document APIs
// ==========================================

// Get all documents (history)
router.get('/api/documents', async (req, res) => {
    try {
        const { date, fromDate, toDate } = req.query;
        const pool = await getPool();
        
        let query = `SELECT d.*, 
                     (SELECT COUNT(*) FROM VegFruitWashItems WHERE document_id = d.id) as items_count
                     FROM VegFruitWashDocuments d WHERE 1=1`;
        const request = pool.request();
        
        if (date) {
            query += ' AND d.log_date = @date';
            request.input('date', sql.Date, date);
        }
        
        if (fromDate) {
            query += ' AND d.log_date >= @fromDate';
            request.input('fromDate', sql.Date, fromDate);
        }
        
        if (toDate) {
            query += ' AND d.log_date <= @toDate';
            request.input('toDate', sql.Date, toDate);
        }
        
        query += ' ORDER BY d.log_date DESC, d.check_time DESC';
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Get single document with items
router.get('/api/documents/:id', async (req, res) => {
    try {
        const pool = await getPool();
        
        const docResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM VegFruitWashDocuments WHERE id = @id');
        
        if (docResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        const itemsResult = await pool.request()
            .input('document_id', sql.Int, req.params.id)
            .query(`SELECT wi.*, vi.category 
                    FROM VegFruitWashItems wi
                    JOIN VegFruitItems vi ON wi.item_id = vi.id
                    WHERE wi.document_id = @document_id 
                    ORDER BY vi.category, wi.item_name`);
        
        res.json({
            document: docResult.recordset[0],
            items: itemsResult.recordset
        });
    } catch (err) {
        console.error('Error fetching document:', err);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

// Create document with checked items
router.post('/api/documents', async (req, res) => {
    try {
        const { log_date, branch, check_time, concentration, filled_by, comments, peracetic_acid_1,
                log_date_2, check_time_2, concentration_2, filled_by_2, comments_2, peracetic_acid_2, checked_items } = req.body;
        const pool = await getPool();
        
        // Generate document number: VFW-YYYYMMDD-###
        const dateStr = new Date(log_date).toISOString().split('T')[0].replace(/-/g, '');
        const countResult = await pool.request()
            .input('date', sql.Date, log_date)
            .query('SELECT COUNT(*) as count FROM VegFruitWashDocuments WHERE log_date = @date');
        const count = countResult.recordset[0].count + 1;
        const documentNumber = `VFW-${dateStr}-${String(count).padStart(3, '0')}`;
        
        // Create document
        const insertResult = await pool.request()
            .input('document_number', sql.NVarChar, documentNumber)
            .input('log_date', sql.Date, log_date)
            .input('branch', sql.NVarChar, branch || null)
            .input('check_time', sql.NVarChar, check_time)
            .input('concentration', sql.NVarChar, concentration)
            .input('filled_by', sql.NVarChar, filled_by)
            .input('comments', sql.NVarChar, comments || null)
            .input('peracetic_acid_1', sql.Bit, peracetic_acid_1 ? 1 : 0)
            .input('log_date_2', sql.Date, log_date_2 || null)
            .input('check_time_2', sql.NVarChar, check_time_2 || null)
            .input('concentration_2', sql.NVarChar, concentration_2 || null)
            .input('filled_by_2', sql.NVarChar, filled_by_2 || null)
            .input('comments_2', sql.NVarChar, comments_2 || null)
            .input('peracetic_acid_2', sql.Bit, peracetic_acid_2 ? 1 : 0)
            .query(`INSERT INTO VegFruitWashDocuments 
                    (document_number, log_date, branch, check_time, concentration, filled_by, comments, peracetic_acid_1, log_date_2, check_time_2, concentration_2, filled_by_2, comments_2, peracetic_acid_2) 
                    OUTPUT INSERTED.id 
                    VALUES (@document_number, @log_date, @branch, @check_time, @concentration, @filled_by, @comments, @peracetic_acid_1, @log_date_2, @check_time_2, @concentration_2, @filled_by_2, @comments_2, @peracetic_acid_2)`);
        
        const documentId = insertResult.recordset[0].id;
        
        // Get all items to get their names
        const itemsResult = await pool.request()
            .query('SELECT id, name FROM VegFruitItems WHERE is_active = 1');
        const itemsMap = {};
        itemsResult.recordset.forEach(i => { itemsMap[i.id] = i.name; });
        
        // Insert checked items
        for (const itemId of checked_items) {
            const itemName = itemsMap[itemId];
            if (itemName) {
                await pool.request()
                    .input('document_id', sql.Int, documentId)
                    .input('item_id', sql.Int, itemId)
                    .input('item_name', sql.NVarChar, itemName)
                    .query(`INSERT INTO VegFruitWashItems (document_id, item_id, item_name, is_checked) 
                            VALUES (@document_id, @item_id, @item_name, 1)`);
            }
        }
        
        res.json({ success: true, document_number: documentNumber, document_id: documentId });
    } catch (err) {
        console.error('Error saving document:', err);
        res.status(500).json({ error: 'Failed to save document' });
    }
});

// Delete document
router.delete('/api/documents/:id', async (req, res) => {
    try {
        const pool = await getPool();
        
        // Check if verified
        const checkResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT status FROM VegFruitWashDocuments WHERE id = @id');
        
        if (checkResult.recordset.length > 0 && checkResult.recordset[0].status === 'Verified') {
            return res.status(400).json({ error: 'Cannot delete verified document' });
        }
        
        // Delete items first
        await pool.request()
            .input('document_id', sql.Int, req.params.id)
            .query('DELETE FROM VegFruitWashItems WHERE document_id = @document_id');
        
        // Delete document
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM VegFruitWashDocuments WHERE id = @id');
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// Verify document
router.post('/api/documents/:id/verify', async (req, res) => {
    try {
        const pool = await getPool();
        const verifiedBy = req.currentUser?.displayName || req.currentUser?.name || 'Unknown';
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('verified_by', sql.NVarChar, verifiedBy)
            .query(`UPDATE VegFruitWashDocuments SET 
                    status = 'Verified', 
                    verified_by = @verified_by, 
                    verified_at = GETDATE(),
                    updated_at = GETDATE()
                    WHERE id = @id`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error verifying document:', err);
        res.status(500).json({ error: 'Failed to verify document' });
    }
});

// Update document (for edit)
router.put('/api/documents/:id', async (req, res) => {
    try {
        const { log_date, branch, check_time, concentration, comments, peracetic_acid_1,
                log_date_2, check_time_2, concentration_2, filled_by_2, comments_2, peracetic_acid_2, checked_items } = req.body;
        const pool = await getPool();
        
        // Check if verified
        const checkResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT status FROM VegFruitWashDocuments WHERE id = @id');
        
        if (checkResult.recordset.length > 0 && checkResult.recordset[0].status === 'Verified') {
            return res.status(400).json({ error: 'Cannot edit verified document' });
        }
        
        // Update document
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('log_date', sql.Date, log_date)
            .input('branch', sql.NVarChar, branch || null)
            .input('check_time', sql.NVarChar, check_time)
            .input('concentration', sql.NVarChar, concentration)
            .input('comments', sql.NVarChar, comments || null)
            .input('peracetic_acid_1', sql.Bit, peracetic_acid_1 ? 1 : 0)
            .input('log_date_2', sql.Date, log_date_2 || null)
            .input('check_time_2', sql.NVarChar, check_time_2 || null)
            .input('concentration_2', sql.NVarChar, concentration_2 || null)
            .input('filled_by_2', sql.NVarChar, filled_by_2 || null)
            .input('comments_2', sql.NVarChar, comments_2 || null)
            .input('peracetic_acid_2', sql.Bit, peracetic_acid_2 ? 1 : 0)
            .query(`UPDATE VegFruitWashDocuments SET 
                    log_date = @log_date,
                    branch = @branch,
                    check_time = @check_time, 
                    concentration = @concentration, 
                    comments = @comments,
                    peracetic_acid_1 = @peracetic_acid_1,
                    log_date_2 = @log_date_2,
                    check_time_2 = @check_time_2,
                    concentration_2 = @concentration_2,
                    filled_by_2 = @filled_by_2,
                    comments_2 = @comments_2,
                    peracetic_acid_2 = @peracetic_acid_2,
                    updated_at = GETDATE()
                    WHERE id = @id`);
        
        // Delete old items
        await pool.request()
            .input('document_id', sql.Int, req.params.id)
            .query('DELETE FROM VegFruitWashItems WHERE document_id = @document_id');
        
        // Get all items to get their names
        const itemsResult = await pool.request()
            .query('SELECT id, name FROM VegFruitItems WHERE is_active = 1');
        const itemsMap = {};
        itemsResult.recordset.forEach(i => { itemsMap[i.id] = i.name; });
        
        // Insert new checked items
        for (const itemId of checked_items) {
            const itemName = itemsMap[itemId];
            if (itemName) {
                await pool.request()
                    .input('document_id', sql.Int, req.params.id)
                    .input('item_id', sql.Int, itemId)
                    .input('item_name', sql.NVarChar, itemName)
                    .query(`INSERT INTO VegFruitWashItems (document_id, item_id, item_name, is_checked) 
                            VALUES (@document_id, @item_id, @item_name, 1)`);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating document:', err);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// ==========================================
// Settings APIs
// ==========================================

// Get settings
router.get('/api/settings', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT setting_key, setting_value FROM VegFruitWashSettings
        `);
        
        // Convert to object
        const settings = {};
        result.recordset.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings
router.put('/api/settings', async (req, res) => {
    try {
        const pool = await getPool();
        
        for (const [key, value] of Object.entries(req.body)) {
            const existsResult = await pool.request()
                .input('key', sql.NVarChar, key)
                .query('SELECT id FROM VegFruitWashSettings WHERE setting_key = @key');
            
            if (existsResult.recordset.length > 0) {
                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, value)
                    .query(`UPDATE VegFruitWashSettings SET setting_value = @value WHERE setting_key = @key`);
            } else {
                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, value)
                    .query(`INSERT INTO VegFruitWashSettings (setting_key, setting_value) VALUES (@key, @value)`);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving settings:', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
