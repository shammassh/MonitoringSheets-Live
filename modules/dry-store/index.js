const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');

const dbConfig = {
    server: 'localhost',
    database: 'FSMonitoringDB',
    user: 'sa',
    password: 'Kokowawa123@@',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

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

router.get('/locations', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'locations.html'));
});

router.get('/branches', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'branches.html'));
});

router.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

// API: Get settings
router.get('/api/settings', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM DryStoreSettings');
        
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

// API: Update settings
router.put('/api/settings', async (req, res) => {
    try {
        const { temp_max, humidity_max, branch, creation_date, last_revision_date, edition, company_name } = req.body;
        const pool = await sql.connect(dbConfig);
        
        if (temp_max !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, temp_max.toString())
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'temp_max'");
        }
        if (humidity_max !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, humidity_max.toString())
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'humidity_max'");
        }
        if (branch !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, branch)
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'branch'");
        }
        if (creation_date !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, creation_date)
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'creation_date'");
        }
        if (last_revision_date !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, last_revision_date)
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'last_revision_date'");
        }
        if (edition !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, edition)
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'edition'");
        }
        if (company_name !== undefined) {
            await pool.request()
                .input('value', sql.NVarChar, company_name)
                .query("UPDATE DryStoreSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = 'company_name'");
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// API: Get locations
router.get('/api/locations', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM DryStoreLocations WHERE is_active = 1 ORDER BY name');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching locations:', err);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// API: Create location
router.post('/api/locations', async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO DryStoreLocations (name) OUTPUT INSERTED.* VALUES (@name)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating location:', err);
        res.status(500).json({ error: 'Failed to create location' });
    }
});

// API: Delete location
router.delete('/api/locations/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE DryStoreLocations SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting location:', err);
        res.status(500).json({ error: 'Failed to delete location' });
    }
});

// API: Get branches
router.get('/api/branches', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM DryStoreBranches WHERE is_active = 1 ORDER BY name');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching branches:', err);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// API: Create branch
router.post('/api/branches', async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO DryStoreBranches (name) OUTPUT INSERTED.* VALUES (@name)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating branch:', err);
        res.status(500).json({ error: 'Failed to create branch' });
    }
});

// API: Delete branch
router.delete('/api/branches/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE DryStoreBranches SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting branch:', err);
        res.status(500).json({ error: 'Failed to delete branch' });
    }
});

// API: Get all readings
router.get('/api/readings', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM DryStoreReadings ORDER BY reading_date DESC, created_at DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching readings:', err);
        res.status(500).json({ error: 'Failed to fetch readings' });
    }
});

// API: Get single reading
router.get('/api/readings/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM DryStoreReadings WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Reading not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching reading:', err);
        res.status(500).json({ error: 'Failed to fetch reading' });
    }
});

// Generate document number
async function generateDocNumber(pool) {
    const today = new Date();
    const prefix = `DS-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const result = await pool.request()
        .input('prefix', sql.NVarChar, prefix + '%')
        .query("SELECT TOP 1 document_number FROM DryStoreReadings WHERE document_number LIKE @prefix ORDER BY document_number DESC");
    
    let sequence = 1;
    if (result.recordset.length > 0) {
        const lastNum = result.recordset[0].document_number;
        const lastSeq = parseInt(lastNum.split('-').pop());
        sequence = lastSeq + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

// Helper function to safely parse decimal values
function safeDecimal(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    // Clamp to valid DECIMAL(5,2) range (-999.99 to 999.99)
    const clamped = Math.max(-999.99, Math.min(999.99, num));
    // Round to 2 decimal places to fit DECIMAL(5,2)
    return Math.round(clamped * 100) / 100;
}

// API: Create reading
router.post('/api/readings', async (req, res) => {
    console.log('POST /api/readings called with body:', JSON.stringify(req.body));
    try {
        const {
            branch, dry_store, reading_date,
            time_am, temp_am, humidity_am, temp_am_status, humidity_am_status,
            temp_am_corrective_action, humidity_am_corrective_action,
            time_pm, temp_pm, humidity_pm, temp_pm_status, humidity_pm_status,
            temp_pm_corrective_action, humidity_pm_corrective_action,
            filled_by
        } = req.body;
        
        const pool = await sql.connect(dbConfig);
        const docNumber = await generateDocNumber(pool);
        
        const result = await pool.request()
            .input('document_number', sql.NVarChar, docNumber)
            .input('branch', sql.NVarChar, branch)
            .input('dry_store', sql.NVarChar, dry_store)
            .input('reading_date', sql.Date, reading_date)
            .input('time_am', sql.NVarChar, time_am || null)
            .input('temp_am', sql.Decimal(5, 2), safeDecimal(temp_am))
            .input('humidity_am', sql.Decimal(5, 2), safeDecimal(humidity_am))
            .input('temp_am_status', sql.NVarChar, temp_am_status || 'Pass')
            .input('humidity_am_status', sql.NVarChar, humidity_am_status || 'Pass')
            .input('temp_am_corrective_action', sql.NVarChar, temp_am_corrective_action || null)
            .input('humidity_am_corrective_action', sql.NVarChar, humidity_am_corrective_action || null)
            .input('time_pm', sql.NVarChar, time_pm || null)
            .input('temp_pm', sql.Decimal(5, 2), safeDecimal(temp_pm))
            .input('humidity_pm', sql.Decimal(5, 2), safeDecimal(humidity_pm))
            .input('temp_pm_status', sql.NVarChar, temp_pm_status || 'Pass')
            .input('humidity_pm_status', sql.NVarChar, humidity_pm_status || 'Pass')
            .input('temp_pm_corrective_action', sql.NVarChar, temp_pm_corrective_action || null)
            .input('humidity_pm_corrective_action', sql.NVarChar, humidity_pm_corrective_action || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .query(`
                INSERT INTO DryStoreReadings (
                    document_number, branch, dry_store, reading_date,
                    time_am, temp_am, humidity_am, temp_am_status, humidity_am_status,
                    temp_am_corrective_action, humidity_am_corrective_action,
                    time_pm, temp_pm, humidity_pm, temp_pm_status, humidity_pm_status,
                    temp_pm_corrective_action, humidity_pm_corrective_action,
                    filled_by
                )
                OUTPUT INSERTED.*
                VALUES (
                    @document_number, @branch, @dry_store, @reading_date,
                    @time_am, @temp_am, @humidity_am, @temp_am_status, @humidity_am_status,
                    @temp_am_corrective_action, @humidity_am_corrective_action,
                    @time_pm, @temp_pm, @humidity_pm, @temp_pm_status, @humidity_pm_status,
                    @temp_pm_corrective_action, @humidity_pm_corrective_action,
                    @filled_by
                )
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating reading:', err);
        res.status(500).json({ error: 'Failed to create reading' });
    }
});

// API: Update reading
router.put('/api/readings/:id', async (req, res) => {
    try {
        const {
            branch, dry_store, reading_date,
            time_am, temp_am, humidity_am, temp_am_status, humidity_am_status,
            temp_am_corrective_action, humidity_am_corrective_action,
            time_pm, temp_pm, humidity_pm, temp_pm_status, humidity_pm_status,
            temp_pm_corrective_action, humidity_pm_corrective_action,
            filled_by
        } = req.body;
        
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('branch', sql.NVarChar, branch)
            .input('dry_store', sql.NVarChar, dry_store)
            .input('reading_date', sql.Date, reading_date)
            .input('time_am', sql.NVarChar, time_am || null)
            .input('temp_am', sql.Decimal(5, 2), safeDecimal(temp_am))
            .input('humidity_am', sql.Decimal(5, 2), safeDecimal(humidity_am))
            .input('temp_am_status', sql.NVarChar, temp_am_status || 'Pass')
            .input('humidity_am_status', sql.NVarChar, humidity_am_status || 'Pass')
            .input('temp_am_corrective_action', sql.NVarChar, temp_am_corrective_action || null)
            .input('humidity_am_corrective_action', sql.NVarChar, humidity_am_corrective_action || null)
            .input('time_pm', sql.NVarChar, time_pm || null)
            .input('temp_pm', sql.Decimal(5, 2), safeDecimal(temp_pm))
            .input('humidity_pm', sql.Decimal(5, 2), safeDecimal(humidity_pm))
            .input('temp_pm_status', sql.NVarChar, temp_pm_status || 'Pass')
            .input('humidity_pm_status', sql.NVarChar, humidity_pm_status || 'Pass')
            .input('temp_pm_corrective_action', sql.NVarChar, temp_pm_corrective_action || null)
            .input('humidity_pm_corrective_action', sql.NVarChar, humidity_pm_corrective_action || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .query(`
                UPDATE DryStoreReadings SET
                    branch = @branch, dry_store = @dry_store, reading_date = @reading_date,
                    time_am = @time_am, temp_am = @temp_am, humidity_am = @humidity_am,
                    temp_am_status = @temp_am_status, humidity_am_status = @humidity_am_status,
                    temp_am_corrective_action = @temp_am_corrective_action,
                    humidity_am_corrective_action = @humidity_am_corrective_action,
                    time_pm = @time_pm, temp_pm = @temp_pm, humidity_pm = @humidity_pm,
                    temp_pm_status = @temp_pm_status, humidity_pm_status = @humidity_pm_status,
                    temp_pm_corrective_action = @temp_pm_corrective_action,
                    humidity_pm_corrective_action = @humidity_pm_corrective_action,
                    filled_by = @filled_by, updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Reading not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating reading:', err);
        res.status(500).json({ error: 'Failed to update reading' });
    }
});

// API: Delete reading
router.delete('/api/readings/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM DryStoreReadings WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting reading:', err);
        res.status(500).json({ error: 'Failed to delete reading' });
    }
});

// API: Verify reading
router.post('/api/readings/:id/verify', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const verifiedBy = req.currentUser?.displayName || req.currentUser?.name || 'Unknown';
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('verified_by', sql.NVarChar, verifiedBy)
            .query(`
                UPDATE DryStoreReadings 
                SET verified = 1, verified_by = @verified_by, verified_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Reading not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error verifying reading:', err);
        res.status(500).json({ error: 'Failed to verify reading' });
    }
});

// API: Get current user
router.get('/api/current-user', (req, res) => {
    res.json({
        name: req.currentUser?.displayName || req.currentUser?.name || 'Unknown User',
        email: req.currentUser?.email || '',
        role: req.currentUser?.role || 'User'
    });
});

module.exports = router;
