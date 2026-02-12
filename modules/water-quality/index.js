const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');
const config = require('../../config/default');

// Middleware to prevent caching of API responses
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

router.get('/sections', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'sections.html'));
});

// API: Get settings
router.get('/api/settings', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query('SELECT * FROM WaterQualitySettings');
        
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
        const pool = await sql.connect(config.database);
        
        for (const [key, value] of Object.entries(req.body)) {
            await pool.request()
                .input('key', sql.NVarChar, key)
                .input('value', sql.NVarChar, value.toString())
                .query(`
                    IF EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = @key)
                        UPDATE WaterQualitySettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = @key
                    ELSE
                        INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES (@key, @value)
                `);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// API: Get sections
router.get('/api/sections', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .query('SELECT * FROM WaterQualitySections WHERE is_active = 1 ORDER BY name');
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
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO WaterQualitySections (name) OUTPUT INSERTED.* VALUES (@name)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating section:', err);
        res.status(500).json({ error: 'Failed to create section' });
    }
});

// API: Delete section
router.delete('/api/sections/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE WaterQualitySections SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting section:', err);
        res.status(500).json({ error: 'Failed to delete section' });
    }
});

// API: Get all readings
router.get('/api/readings', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .query('SELECT * FROM WaterQualityReadings ORDER BY reading_date DESC, created_at DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching readings:', err);
        res.status(500).json({ error: 'Failed to fetch readings' });
    }
});

// API: Get single reading
router.get('/api/readings/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM WaterQualityReadings WHERE id = @id');
        
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
    const prefix = `WQ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const result = await pool.request()
        .input('prefix', sql.NVarChar, prefix + '%')
        .query("SELECT TOP 1 document_number FROM WaterQualityReadings WHERE document_number LIKE @prefix ORDER BY document_number DESC");
    
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
            reading_date, section,
            th_value, th_status,
            tds_value, tds_status,
            salt_ok, salt_status,
            ph_value, ph_status,
            chlorine_30min, chlorine_30min_status,
            chlorine_point_of_use, chlorine_point_of_use_status,
            corrective_action, filled_by
        } = req.body;
        
        const pool = await sql.connect(config.database);
        const docNumber = await generateDocNumber(pool);
        
        const result = await pool.request()
            .input('document_number', sql.NVarChar, docNumber)
            .input('reading_date', sql.Date, reading_date)
            .input('section', sql.NVarChar, section)
            .input('th_value', sql.Decimal(8, 2), th_value || null)
            .input('th_status', sql.NVarChar, th_status || 'Pass')
            .input('tds_value', sql.Decimal(8, 2), tds_value || null)
            .input('tds_status', sql.NVarChar, tds_status || 'Pass')
            .input('salt_ok', sql.Bit, salt_ok === true || salt_ok === 'true' ? 1 : 0)
            .input('salt_status', sql.NVarChar, salt_status || 'Pass')
            .input('ph_value', sql.Decimal(4, 2), ph_value || null)
            .input('ph_status', sql.NVarChar, ph_status || 'Pass')
            .input('chlorine_30min', sql.Decimal(4, 2), chlorine_30min || null)
            .input('chlorine_30min_status', sql.NVarChar, chlorine_30min_status || 'Pass')
            .input('chlorine_point_of_use', sql.Decimal(4, 2), chlorine_point_of_use || null)
            .input('chlorine_point_of_use_status', sql.NVarChar, chlorine_point_of_use_status || 'Pass')
            .input('corrective_action', sql.NVarChar, corrective_action || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .query(`
                INSERT INTO WaterQualityReadings (
                    document_number, reading_date, section,
                    th_value, th_status, tds_value, tds_status,
                    salt_ok, salt_status, ph_value, ph_status,
                    chlorine_30min, chlorine_30min_status,
                    chlorine_point_of_use, chlorine_point_of_use_status,
                    corrective_action, filled_by
                )
                OUTPUT INSERTED.*
                VALUES (
                    @document_number, @reading_date, @section,
                    @th_value, @th_status, @tds_value, @tds_status,
                    @salt_ok, @salt_status, @ph_value, @ph_status,
                    @chlorine_30min, @chlorine_30min_status,
                    @chlorine_point_of_use, @chlorine_point_of_use_status,
                    @corrective_action, @filled_by
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
            reading_date, section,
            th_value, th_status,
            tds_value, tds_status,
            salt_ok, salt_status,
            ph_value, ph_status,
            chlorine_30min, chlorine_30min_status,
            chlorine_point_of_use, chlorine_point_of_use_status,
            corrective_action, filled_by
        } = req.body;
        
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('reading_date', sql.Date, reading_date)
            .input('section', sql.NVarChar, section)
            .input('th_value', sql.Decimal(8, 2), th_value || null)
            .input('th_status', sql.NVarChar, th_status || 'Pass')
            .input('tds_value', sql.Decimal(8, 2), tds_value || null)
            .input('tds_status', sql.NVarChar, tds_status || 'Pass')
            .input('salt_ok', sql.Bit, salt_ok === true || salt_ok === 'true' ? 1 : 0)
            .input('salt_status', sql.NVarChar, salt_status || 'Pass')
            .input('ph_value', sql.Decimal(4, 2), ph_value || null)
            .input('ph_status', sql.NVarChar, ph_status || 'Pass')
            .input('chlorine_30min', sql.Decimal(4, 2), chlorine_30min || null)
            .input('chlorine_30min_status', sql.NVarChar, chlorine_30min_status || 'Pass')
            .input('chlorine_point_of_use', sql.Decimal(4, 2), chlorine_point_of_use || null)
            .input('chlorine_point_of_use_status', sql.NVarChar, chlorine_point_of_use_status || 'Pass')
            .input('corrective_action', sql.NVarChar, corrective_action || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .query(`
                UPDATE WaterQualityReadings SET
                    reading_date = @reading_date, section = @section,
                    th_value = @th_value, th_status = @th_status,
                    tds_value = @tds_value, tds_status = @tds_status,
                    salt_ok = @salt_ok, salt_status = @salt_status,
                    ph_value = @ph_value, ph_status = @ph_status,
                    chlorine_30min = @chlorine_30min, chlorine_30min_status = @chlorine_30min_status,
                    chlorine_point_of_use = @chlorine_point_of_use, chlorine_point_of_use_status = @chlorine_point_of_use_status,
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
        const pool = await sql.connect(config.database);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM WaterQualityReadings WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting reading:', err);
        res.status(500).json({ error: 'Failed to delete reading' });
    }
});

// API: Verify reading
router.post('/api/readings/:id/verify', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const verifiedBy = req.currentUser?.displayName || req.currentUser?.name || 'Unknown';
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('verified_by', sql.NVarChar, verifiedBy)
            .query(`
                UPDATE WaterQualityReadings 
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
