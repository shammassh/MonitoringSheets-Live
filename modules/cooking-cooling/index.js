/**
 * Cooking and Cooling Temperature Monitoring Module
 * Form 10: Track cooking core temperatures and cooling process
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

// Calculate cooking status (>75°C is Pass)
function calculateCookingStatus(cookingTemp) {
    return cookingTemp >= 75 ? 'Pass' : 'Fail';
}

// Calculate cooling status based on temperatures
function calculateCoolingStatus(startTemp, temp1h, temp1h30, temp2h) {
    // If any temp reading reaches <20°C, it's a Pass
    if (temp1h !== null && temp1h < 20) return 'Pass';
    if (temp1h30 !== null && temp1h30 < 20) return 'Pass';
    if (temp2h !== null && temp2h < 20) return 'Pass';
    
    // If 2h temp is filled but still >=20, it's a Fail
    if (temp2h !== null && temp2h >= 20) return 'Fail';
    
    // Otherwise pending
    return 'Pending';
}

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

// API: Get cooling methods
router.get('/api/methods', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT id, name FROM CookingCoolingMethods WHERE is_active = 1 ORDER BY name');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching methods:', err);
        res.status(500).json({ error: 'Failed to fetch cooling methods' });
    }
});

// API: Add cooling method
router.post('/api/methods', async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO CookingCoolingMethods (name) OUTPUT INSERTED.* VALUES (@name)');
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error adding method:', err);
        res.status(500).json({ error: 'Failed to add cooling method' });
    }
});

// API: Delete cooling method
router.delete('/api/methods/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE CookingCoolingMethods SET is_active = 0 WHERE id = @id');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting method:', err);
        res.status(500).json({ error: 'Failed to delete cooling method' });
    }
});

// API: Get all readings with filters
router.get('/api/readings', async (req, res) => {
    try {
        const { date, cookingStatus, coolingStatus } = req.query;
        const pool = await getPool();
        
        let query = 'SELECT * FROM CookingCoolingReadings WHERE 1=1';
        const request = pool.request();
        
        if (date) {
            query += ' AND log_date = @date';
            request.input('date', sql.Date, date);
        }
        
        if (cookingStatus) {
            query += ' AND cooking_status = @cookingStatus';
            request.input('cookingStatus', sql.NVarChar, cookingStatus);
        }
        
        if (coolingStatus) {
            query += ' AND cooling_status = @coolingStatus';
            request.input('coolingStatus', sql.NVarChar, coolingStatus);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching readings:', err);
        res.status(500).json({ error: 'Failed to fetch readings' });
    }
});

// API: Get single reading
router.get('/api/readings/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM CookingCoolingReadings WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Reading not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching reading:', err);
        res.status(500).json({ error: 'Failed to fetch reading' });
    }
});

// API: Create reading
router.post('/api/readings', async (req, res) => {
    try {
        const {
            log_date, product_name, cooking_core_temp, cooling_method,
            start_cooling_time, start_cooling_temp,
            temp_after_1h, temp_after_1h30, temp_after_2h,
            corrective_action_cooking, corrective_action_cooling, comments, filled_by,
            status // 'draft' or 'submitted'
        } = req.body;
        
        const pool = await getPool();
        
        // Generate document number
        const dateStr = new Date(log_date).toISOString().split('T')[0].replace(/-/g, '');
        const countResult = await pool.request()
            .input('date', sql.Date, log_date)
            .query('SELECT COUNT(*) as count FROM CookingCoolingReadings WHERE log_date = @date');
        const count = countResult.recordset[0].count + 1;
        const document_number = `CCT-${dateStr}-${String(count).padStart(3, '0')}`;
        
        // Calculate statuses
        const cooking_status = calculateCookingStatus(parseFloat(cooking_core_temp));
        
        // For drafts, cooling fields may be optional
        const isDraft = status === 'draft';
        let cooling_status_calc = 'Pending';
        let time_after_1h = null;
        let time_after_1h30 = null;
        let time_after_2h = null;
        
        if (start_cooling_time) {
            const startTime = new Date(`2000-01-01T${start_cooling_time}`);
            time_after_1h = new Date(startTime.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
            time_after_1h30 = new Date(startTime.getTime() + 90 * 60 * 1000).toTimeString().slice(0, 5);
            time_after_2h = new Date(startTime.getTime() + 120 * 60 * 1000).toTimeString().slice(0, 5);
            
            cooling_status_calc = calculateCoolingStatus(
                start_cooling_temp ? parseFloat(start_cooling_temp) : null,
                temp_after_1h !== null && temp_after_1h !== '' ? parseFloat(temp_after_1h) : null,
                temp_after_1h30 !== null && temp_after_1h30 !== '' ? parseFloat(temp_after_1h30) : null,
                temp_after_2h !== null && temp_after_2h !== '' ? parseFloat(temp_after_2h) : null
            );
        }
        
        const result = await pool.request()
            .input('document_number', sql.NVarChar, document_number)
            .input('log_date', sql.Date, log_date)
            .input('product_name', sql.NVarChar, product_name)
            .input('cooking_core_temp', sql.Decimal(5, 2), cooking_core_temp)
            .input('cooking_status', sql.NVarChar, cooking_status)
            .input('cooling_method', sql.NVarChar, cooling_method || null)
            .input('start_cooling_time', sql.NVarChar, start_cooling_time || null)
            .input('start_cooling_temp', sql.Decimal(5, 2), start_cooling_temp || null)
            .input('time_after_1h', sql.NVarChar, time_after_1h)
            .input('temp_after_1h', sql.Decimal(5, 2), temp_after_1h || null)
            .input('time_after_1h30', sql.NVarChar, time_after_1h30)
            .input('temp_after_1h30', sql.Decimal(5, 2), temp_after_1h30 || null)
            .input('time_after_2h', sql.NVarChar, time_after_2h)
            .input('temp_after_2h', sql.Decimal(5, 2), temp_after_2h || null)
            .input('cooling_status', sql.NVarChar, cooling_status_calc)
            .input('corrective_action_cooking', sql.NVarChar, corrective_action_cooking || null)
            .input('corrective_action_cooling', sql.NVarChar, corrective_action_cooling || null)
            .input('comments', sql.NVarChar, comments || null)
            .input('filled_by', sql.NVarChar, filled_by)
            .input('status', sql.NVarChar, isDraft ? 'draft' : 'submitted')
            .query(`
                INSERT INTO CookingCoolingReadings (
                    document_number, log_date, product_name, cooking_core_temp, cooking_status,
                    cooling_method, start_cooling_time, start_cooling_temp,
                    time_after_1h, temp_after_1h, time_after_1h30, temp_after_1h30,
                    time_after_2h, temp_after_2h, cooling_status,
                    corrective_action_cooking, corrective_action_cooling, comments, filled_by, status
                ) OUTPUT INSERTED.*
                VALUES (
                    @document_number, @log_date, @product_name, @cooking_core_temp, @cooking_status,
                    @cooling_method, @start_cooling_time, @start_cooling_temp,
                    @time_after_1h, @temp_after_1h, @time_after_1h30, @temp_after_1h30,
                    @time_after_2h, @temp_after_2h, @cooling_status,
                    @corrective_action_cooking, @corrective_action_cooling, @comments, @filled_by, @status
                )
            `);
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating reading:', err);
        res.status(500).json({ error: 'Failed to create reading' });
    }
});

// API: Update reading
router.put('/api/readings/:id', async (req, res) => {
    try {
        const {
            log_date, product_name, cooking_core_temp, cooling_method,
            start_cooling_time, start_cooling_temp,
            temp_after_1h, temp_after_1h30, temp_after_2h,
            corrective_action_cooking, corrective_action_cooling, comments,
            status // 'draft' or 'submitted'
        } = req.body;
        
        const pool = await getPool();
        
        // Calculate statuses
        const cooking_status = calculateCookingStatus(parseFloat(cooking_core_temp));
        
        // For drafts, cooling fields may be optional
        const isDraft = status === 'draft';
        let cooling_status_calc = 'Pending';
        let time_after_1h = null;
        let time_after_1h30 = null;
        let time_after_2h = null;
        
        if (start_cooling_time) {
            const startTime = new Date(`2000-01-01T${start_cooling_time}`);
            time_after_1h = new Date(startTime.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
            time_after_1h30 = new Date(startTime.getTime() + 90 * 60 * 1000).toTimeString().slice(0, 5);
            time_after_2h = new Date(startTime.getTime() + 120 * 60 * 1000).toTimeString().slice(0, 5);
            
            cooling_status_calc = calculateCoolingStatus(
                start_cooling_temp ? parseFloat(start_cooling_temp) : null,
                temp_after_1h !== null && temp_after_1h !== '' ? parseFloat(temp_after_1h) : null,
                temp_after_1h30 !== null && temp_after_1h30 !== '' ? parseFloat(temp_after_1h30) : null,
                temp_after_2h !== null && temp_after_2h !== '' ? parseFloat(temp_after_2h) : null
            );
        }
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('log_date', sql.Date, log_date)
            .input('product_name', sql.NVarChar, product_name)
            .input('cooking_core_temp', sql.Decimal(5, 2), cooking_core_temp)
            .input('cooking_status', sql.NVarChar, cooking_status)
            .input('cooling_method', sql.NVarChar, cooling_method || null)
            .input('start_cooling_time', sql.NVarChar, start_cooling_time || null)
            .input('start_cooling_temp', sql.Decimal(5, 2), start_cooling_temp || null)
            .input('time_after_1h', sql.NVarChar, time_after_1h)
            .input('temp_after_1h', sql.Decimal(5, 2), temp_after_1h || null)
            .input('time_after_1h30', sql.NVarChar, time_after_1h30)
            .input('temp_after_1h30', sql.Decimal(5, 2), temp_after_1h30 || null)
            .input('time_after_2h', sql.NVarChar, time_after_2h)
            .input('temp_after_2h', sql.Decimal(5, 2), temp_after_2h || null)
            .input('cooling_status', sql.NVarChar, cooling_status_calc)
            .input('corrective_action_cooking', sql.NVarChar, corrective_action_cooking || null)
            .input('corrective_action_cooling', sql.NVarChar, corrective_action_cooling || null)
            .input('comments', sql.NVarChar, comments || null)
            .input('status', sql.NVarChar, isDraft ? 'draft' : 'submitted')
            .query(`
                UPDATE CookingCoolingReadings SET
                    log_date = @log_date,
                    product_name = @product_name,
                    cooking_core_temp = @cooking_core_temp,
                    cooking_status = @cooking_status,
                    cooling_method = @cooling_method,
                    start_cooling_time = @start_cooling_time,
                    start_cooling_temp = @start_cooling_temp,
                    time_after_1h = @time_after_1h,
                    temp_after_1h = @temp_after_1h,
                    time_after_1h30 = @time_after_1h30,
                    temp_after_1h30 = @temp_after_1h30,
                    time_after_2h = @time_after_2h,
                    temp_after_2h = @temp_after_2h,
                    cooling_status = @cooling_status,
                    corrective_action_cooking = @corrective_action_cooking,
                    corrective_action_cooling = @corrective_action_cooling,
                    comments = @comments,
                    status = @status,
                    updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id AND verified_by IS NULL
            `);
        
        if (result.recordset.length === 0) {
            return res.status(400).json({ error: 'Record not found or already verified' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating reading:', err);
        res.status(500).json({ error: 'Failed to update reading' });
    }
});

// API: Verify reading
router.post('/api/readings/:id/verify', async (req, res) => {
    try {
        const pool = await getPool();
        const verifier = req.currentUser?.displayName || req.currentUser?.name || 'Unknown';
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('verified_by', sql.NVarChar, verifier)
            .query(`
                UPDATE CookingCoolingReadings 
                SET verified_by = @verified_by, verified_at = GETDATE()
                WHERE id = @id
            `);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error verifying reading:', err);
        res.status(500).json({ error: 'Failed to verify reading' });
    }
});

// API: Delete reading
router.delete('/api/readings/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM CookingCoolingReadings WHERE id = @id AND verified_by IS NULL');
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting reading:', err);
        res.status(500).json({ error: 'Failed to delete reading' });
    }
});

// ==========================================
// API Routes - Settings
// ==========================================

// Get all settings
router.get('/api/settings', async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request()
            .query(`
                SELECT setting_key, setting_value
                FROM CookingCoolingSettings
            `);
        
        // Convert to object
        const settings = {};
        result.recordset.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update settings (batch)
router.put('/api/settings', async (req, res) => {
    try {
        const pool = await getPool();
        
        // Update each setting
        for (const [key, value] of Object.entries(req.body)) {
            // Check if setting exists
            const existsResult = await pool.request()
                .input('key', sql.NVarChar, key)
                .query('SELECT id FROM CookingCoolingSettings WHERE setting_key = @key');
            
            if (existsResult.recordset.length > 0) {
                // Update existing
                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, value)
                    .query(`
                        UPDATE CookingCoolingSettings 
                        SET setting_value = @value, updated_at = GETDATE()
                        WHERE setting_key = @key
                    `);
            } else {
                // Insert new
                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, value)
                    .query(`
                        INSERT INTO CookingCoolingSettings (setting_key, setting_value)
                        VALUES (@key, @value)
                    `);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
