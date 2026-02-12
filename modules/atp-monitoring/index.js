const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');

const dbConfig = {
    server: 'localhost',
    database: 'FSMonitoringDB_UAT',
    user: 'sa',
    password: 'Kokowawa123@@',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Disable caching for all API routes
router.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
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

// API: Get settings
router.get('/api/settings', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM ATPSettings');
        
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
        const pool = await sql.connect(dbConfig);
        
        for (const [key, value] of Object.entries(req.body)) {
            await pool.request()
                .input('key', sql.NVarChar, key)
                .input('value', sql.NVarChar, value.toString())
                .query(`
                    IF EXISTS (SELECT 1 FROM ATPSettings WHERE setting_key = @key)
                        UPDATE ATPSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = @key
                    ELSE
                        INSERT INTO ATPSettings (setting_key, setting_value) VALUES (@key, @value)
                `);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// API: Get branches
router.get('/api/branches', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM ATPBranches WHERE is_active = 1 ORDER BY name');
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
            .query('INSERT INTO ATPBranches (name) OUTPUT INSERTED.* VALUES (@name)');
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
            .query('UPDATE ATPBranches SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting branch:', err);
        res.status(500).json({ error: 'Failed to delete branch' });
    }
});

// API: Get sections
router.get('/api/sections', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM ATPSections WHERE is_active = 1 ORDER BY name');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching sections:', err);
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});

// API: Create section
router.post('/api/sections', async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO ATPSections (name) OUTPUT INSERTED.* VALUES (@name)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating section:', err);
        res.status(500).json({ error: 'Failed to create section' });
    }
});

// API: Delete section
router.delete('/api/sections/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE ATPSections SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting section:', err);
        res.status(500).json({ error: 'Failed to delete section' });
    }
});

// API: Get equipment
router.get('/api/equipment', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM ATPEquipment WHERE is_active = 1 ORDER BY name');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching equipment:', err);
        res.status(500).json({ error: 'Failed to fetch equipment' });
    }
});

// API: Create equipment
router.post('/api/equipment', async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO ATPEquipment (name) OUTPUT INSERTED.* VALUES (@name)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating equipment:', err);
        res.status(500).json({ error: 'Failed to create equipment' });
    }
});

// API: Delete equipment
router.delete('/api/equipment/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE ATPEquipment SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting equipment:', err);
        res.status(500).json({ error: 'Failed to delete equipment' });
    }
});

// API: Get all readings
router.get('/api/readings', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query('SELECT * FROM ATPReadings ORDER BY log_date DESC, created_at DESC');
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
            .query('SELECT * FROM ATPReadings WHERE id = @id');
        
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
    const prefix = `ATP-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const result = await pool.request()
        .input('prefix', sql.NVarChar, prefix + '%')
        .query("SELECT TOP 1 document_number FROM ATPReadings WHERE document_number LIKE @prefix ORDER BY document_number DESC");
    
    let sequence = 1;
    if (result.recordset.length > 0) {
        const lastNum = result.recordset[0].document_number;
        const lastSeq = parseInt(lastNum.split('-').pop());
        sequence = lastSeq + 1;
    }
    
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

// API: Create reading
router.post('/api/readings', async (req, res) => {
    try {
        const {
            log_date, branch, section, equipment_packaging,
            result_value, result_status, corrective_action, filled_by
        } = req.body;
        
        const pool = await sql.connect(dbConfig);
        const docNumber = await generateDocNumber(pool);
        
        const result = await pool.request()
            .input('document_number', sql.NVarChar, docNumber)
            .input('log_date', sql.Date, log_date)
            .input('branch', sql.NVarChar, branch)
            .input('section', sql.NVarChar, section)
            .input('equipment_packaging', sql.NVarChar, equipment_packaging)
            .input('result_value', sql.Decimal(10, 2), result_value)
            .input('result_status', sql.NVarChar, result_status || 'Pass')
            .input('corrective_action', sql.NVarChar, corrective_action || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .query(`
                INSERT INTO ATPReadings (
                    document_number, log_date, branch, section, equipment_packaging,
                    result_value, result_status, corrective_action, filled_by
                )
                OUTPUT INSERTED.*
                VALUES (
                    @document_number, @log_date, @branch, @section, @equipment_packaging,
                    @result_value, @result_status, @corrective_action, @filled_by
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
            log_date, branch, section, equipment_packaging,
            result_value, result_status, corrective_action, filled_by
        } = req.body;
        
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('log_date', sql.Date, log_date)
            .input('branch', sql.NVarChar, branch)
            .input('section', sql.NVarChar, section)
            .input('equipment_packaging', sql.NVarChar, equipment_packaging)
            .input('result_value', sql.Decimal(10, 2), result_value)
            .input('result_status', sql.NVarChar, result_status || 'Pass')
            .input('corrective_action', sql.NVarChar, corrective_action || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .query(`
                UPDATE ATPReadings SET
                    log_date = @log_date, branch = @branch, section = @section,
                    equipment_packaging = @equipment_packaging,
                    result_value = @result_value, result_status = @result_status,
                    corrective_action = @corrective_action, filled_by = @filled_by,
                    updated_at = GETDATE()
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
            .query('DELETE FROM ATPReadings WHERE id = @id');
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
                UPDATE ATPReadings 
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
