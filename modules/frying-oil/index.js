/**
 * Frying Oil Verification Module
 * Main router for the Frying Oil Verification functionality
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const sql = require('mssql');
const config = require('../../config/default');

// Middleware to prevent caching of API responses
router.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// ==========================================
// Page Routes
// ==========================================

// Main page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Form page
router.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

// References management
router.get('/references', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'references.html'));
});

// History
router.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'history.html'));
});

// Schedule
router.get('/schedule', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'schedule.html'));
});

// Settings page
router.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

// ==========================================
// API Routes - Current User
// ==========================================

router.get('/api/me', (req, res) => {
    if (req.currentUser) {
        res.json(req.currentUser);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// ==========================================
// API Routes - Oil References
// ==========================================

// Get all references
router.get('/api/references', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT * FROM OilReferences 
            WHERE is_active = 1 
            ORDER BY name
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching references:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single reference
router.get('/api/references/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM OilReferences WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Reference not found' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching reference:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create reference
router.post('/api/references', async (req, res) => {
    try {
        const { name, reference, frequency } = req.body;
        
        if (!name || !frequency) {
            return res.status(400).json({ error: 'Name and frequency are required' });
        }
        
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('reference', sql.NVarChar, reference || null)
            .input('frequency', sql.NVarChar, frequency)
            .query(`
                INSERT INTO OilReferences (name, reference, frequency)
                OUTPUT INSERTED.*
                VALUES (@name, @reference, @frequency)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error creating reference:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update reference
router.put('/api/references/:id', async (req, res) => {
    try {
        const { name, reference, frequency } = req.body;
        
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('reference', sql.NVarChar, reference || null)
            .input('frequency', sql.NVarChar, frequency)
            .query(`
                UPDATE OilReferences SET 
                    name = @name, reference = @reference, 
                    frequency = @frequency, updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Reference not found' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error updating reference:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete reference (soft delete)
router.delete('/api/references/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE OilReferences SET is_active = 0 WHERE id = @id');
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting reference:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API Routes - Schedule
// ==========================================

router.get('/api/schedule', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT 
                r.id,
                r.name,
                r.reference,
                r.frequency,
                r.next_due_date,
                r.last_test_date,
                latest.session_id,
                latest.document_number,
                latest.test_date as last_test_date_actual,
                latest.status as last_status,
                latest.tested_value,
                latest.verified
            FROM OilReferences r
            LEFT JOIN (
                SELECT 
                    tr.reference_id,
                    ts.id as session_id,
                    ts.document_number,
                    ts.test_date,
                    ts.verified,
                    tr.status,
                    tr.tested_value,
                    ROW_NUMBER() OVER (PARTITION BY tr.reference_id ORDER BY ts.test_date DESC, ts.created_at DESC) as rn
                FROM OilTestRecords tr
                JOIN OilTestSessions ts ON tr.session_id = ts.id
            ) latest ON r.id = latest.reference_id AND latest.rn = 1
            WHERE r.is_active = 1
            ORDER BY 
                CASE WHEN r.next_due_date IS NULL THEN 1 ELSE 0 END,
                r.next_due_date
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get alert count
router.get('/api/alerts/count', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN next_due_date < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN next_due_date = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as due_today
            FROM OilReferences
            WHERE is_active = 1 AND next_due_date IS NOT NULL
        `);
        const counts = result.recordset[0];
        res.json({
            overdue: counts.overdue || 0,
            dueToday: counts.due_today || 0,
            total: (counts.overdue || 0) + (counts.due_today || 0)
        });
    } catch (error) {
        console.error('Error fetching alert count:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API Routes - Oil Test Records
// ==========================================

// Submit oil test
router.post('/api/tests/batch', async (req, res) => {
    try {
        const { test_date, records } = req.body;
        const user = req.currentUser || { email: 'unknown', displayName: 'Unknown', name: 'Unknown' };
        
        if (!test_date || !records || records.length === 0) {
            return res.status(400).json({ error: 'Invalid test data' });
        }
        
        const pool = await sql.connect(config.database);
        
        // Get settings for document number
        const settingsResult = await pool.request().query('SELECT * FROM OilSettings');
        const settings = {};
        settingsResult.recordset.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        const prefix = settings.document_prefix || 'OIL';
        const dateStr = new Date(test_date).toISOString().slice(0, 10).replace(/-/g, '');
        
        // Get next sequence number for today
        const seqResult = await pool.request()
            .input('date', sql.Date, test_date)
            .query(`
                SELECT COUNT(*) + 1 as seq 
                FROM OilTestSessions 
                WHERE CAST(test_date AS DATE) = @date
            `);
        const seq = seqResult.recordset[0].seq;
        const document_number = `${prefix}-${dateStr}-${String(seq).padStart(3, '0')}`;
        
        // Create session
        const sessionResult = await pool.request()
            .input('test_date', sql.Date, test_date)
            .input('document_number', sql.NVarChar, document_number)
            .input('tested_by', sql.NVarChar, user.displayName || user.name || user.email)
            .query(`
                INSERT INTO OilTestSessions (test_date, document_number, tested_by)
                OUTPUT INSERTED.id
                VALUES (@test_date, @document_number, @tested_by)
            `);
        
        const session_id = sessionResult.recordset[0].id;
        
        // Insert all records and update due dates
        for (const record of records) {
            await pool.request()
                .input('session_id', sql.Int, session_id)
                .input('reference_id', sql.Int, record.reference_id)
                .input('tested_value', sql.NVarChar, record.tested_value || null)
                .input('status', sql.NVarChar, record.status)
                .input('remarks', sql.NVarChar, record.remarks || null)
                .input('corrective_action', sql.NVarChar, record.corrective_action || null)
                .query(`
                    INSERT INTO OilTestRecords (session_id, reference_id, tested_value, status, remarks, corrective_action)
                    VALUES (@session_id, @reference_id, @tested_value, @status, @remarks, @corrective_action)
                `);
            
            // Update the reference with last test date and next due date
            if (record.next_due_date) {
                await pool.request()
                    .input('reference_id', sql.Int, record.reference_id)
                    .input('test_date', sql.Date, test_date)
                    .input('next_due_date', sql.Date, record.next_due_date)
                    .query(`
                        UPDATE OilReferences 
                        SET last_test_date = @test_date,
                            next_due_date = @next_due_date,
                            updated_at = GETDATE()
                        WHERE id = @reference_id
                    `);
            }
        }
        
        res.status(201).json({ 
            success: true, 
            session_id,
            document_number,
            records_count: records.length
        });
    } catch (error) {
        console.error('Error submitting oil test:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get test history
router.get('/api/tests', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT s.*,
                (SELECT COUNT(*) FROM OilTestRecords WHERE session_id = s.id AND status = 'Pass') as pass_count,
                (SELECT COUNT(*) FROM OilTestRecords WHERE session_id = s.id AND status = 'Warning') as warning_count,
                (SELECT COUNT(*) FROM OilTestRecords WHERE session_id = s.id AND status = 'Fail') as fail_count,
                (SELECT COUNT(*) FROM OilTestRecords WHERE session_id = s.id) as total_count,
                (SELECT TOP 1 ref.name FROM OilTestRecords r 
                 JOIN OilReferences ref ON r.reference_id = ref.id 
                 WHERE r.session_id = s.id) as equipment_name
            FROM OilTestSessions s
            ORDER BY s.test_date DESC, s.created_at DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single test session with records
router.get('/api/tests/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const sessionResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM OilTestSessions WHERE id = @id');
        
        if (sessionResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const recordsResult = await pool.request()
            .input('session_id', sql.Int, req.params.id)
            .query(`
                SELECT r.*, ref.name as equipment_name, ref.reference
                FROM OilTestRecords r
                JOIN OilReferences ref ON r.reference_id = ref.id
                WHERE r.session_id = @session_id
                ORDER BY ref.name
            `);
        
        res.json({
            session: sessionResult.recordset[0],
            records: recordsResult.recordset
        });
    } catch (error) {
        console.error('Error fetching test:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify test session
router.post('/api/tests/:id/verify', async (req, res) => {
    try {
        const user = req.currentUser || { displayName: 'Unknown', name: 'Unknown' };
        const verifiedBy = user.displayName || user.name || 'Unknown';
        
        const pool = await sql.connect(config.database);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('verified_by', sql.NVarChar, verifiedBy)
            .query(`
                UPDATE OilTestSessions 
                SET verified = 1, verified_by = @verified_by, verified_at = GETDATE()
                WHERE id = @id
            `);
        
        res.json({ success: true, verified_by: verifiedBy });
    } catch (error) {
        console.error('Error verifying test:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update test (only Admin and Super Auditor)
router.put('/api/tests/:id', async (req, res) => {
    try {
        const user = req.currentUser;
        
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const role = user.role || '';
        if (role !== 'Admin' && role !== 'SuperAuditor') {
            return res.status(403).json({ error: 'Only Admin and SuperAuditor can edit records' });
        }
        
        const { test_date, record } = req.body;
        
        if (!test_date || !record) {
            return res.status(400).json({ error: 'Invalid data' });
        }
        
        const pool = await sql.connect(config.database);
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('test_date', sql.Date, test_date)
            .input('updated_by', sql.NVarChar, user.displayName || user.name || user.email)
            .query(`
                UPDATE OilTestSessions 
                SET test_date = @test_date, 
                    updated_at = GETDATE(),
                    updated_by = @updated_by
                WHERE id = @id
            `);
        
        await pool.request()
            .input('session_id', sql.Int, req.params.id)
            .input('tested_value', sql.NVarChar, record.tested_value || null)
            .input('status', sql.NVarChar, record.status)
            .input('remarks', sql.NVarChar, record.remarks || null)
            .input('corrective_action', sql.NVarChar, record.corrective_action || null)
            .query(`
                UPDATE OilTestRecords 
                SET tested_value = @tested_value,
                    status = @status,
                    remarks = @remarks,
                    corrective_action = @corrective_action
                WHERE session_id = @session_id
            `);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating test:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API Routes - Settings
// ==========================================

// Get all settings
router.get('/api/settings', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                SELECT setting_key, setting_value
                FROM OilSettings
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
        const user = req.currentUser;
        
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const pool = await sql.connect(config.database);
        
        // Update each setting
        for (const [key, value] of Object.entries(req.body)) {
            // Check if setting exists
            const existsResult = await pool.request()
                .input('key', sql.NVarChar, key)
                .query('SELECT id FROM OilSettings WHERE setting_key = @key');
            
            if (existsResult.recordset.length > 0) {
                // Update existing
                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, value)
                    .query(`
                        UPDATE OilSettings 
                        SET setting_value = @value, updated_at = GETDATE()
                        WHERE setting_key = @key
                    `);
            } else {
                // Insert new
                await pool.request()
                    .input('key', sql.NVarChar, key)
                    .input('value', sql.NVarChar, value)
                    .query(`
                        INSERT INTO OilSettings (setting_key, setting_value)
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
