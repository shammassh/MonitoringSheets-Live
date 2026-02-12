/**
 * Equipment Calibration Module
 * Main router for the Equipment Calibration Record functionality
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const sql = require('mssql');
const config = require('../../config/default');

// Note: Authentication is handled by main app.js via requireAuth middleware
// All routes in this module are already protected

// Middleware to prevent caching of API responses ONLY (not HTML pages)
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

// Main calibration page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Calibration form page
router.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

// Calibration references management
router.get('/references', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'references.html'));
});

// Calibration history
router.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'history.html'));
});

// Settings page
router.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

// Schedule page
router.get('/schedule', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'schedule.html'));
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
// API Routes - Calibration References
// ==========================================

// Get all references
router.get('/api/references', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT * FROM CalibrationReferences 
            WHERE is_active = 1 
            ORDER BY name
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching references:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get schedule (equipment with due dates from actual calibration records)
router.get('/api/schedule', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT 
                r.id,
                r.name,
                r.frequency,
                r.next_due_date,
                r.last_calibration_date,
                latest.session_id,
                latest.document_number,
                latest.calibration_date as last_calibration_date_actual,
                latest.status as last_status,
                latest.measured_value,
                latest.verified
            FROM CalibrationReferences r
            LEFT JOIN (
                SELECT 
                    cr.reference_id,
                    cs.id as session_id,
                    cs.document_number,
                    cs.calibration_date,
                    cs.verified,
                    cr.status,
                    cr.measured_value,
                    ROW_NUMBER() OVER (PARTITION BY cr.reference_id ORDER BY cs.calibration_date DESC, cs.created_at DESC) as rn
                FROM CalibrationRecords cr
                JOIN CalibrationSessions cs ON cr.session_id = cs.id
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

// Get alert count (overdue + due today)
router.get('/api/alerts/count', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN next_due_date < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN next_due_date = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as due_today
            FROM CalibrationReferences
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

// Get single reference
router.get('/api/references/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM CalibrationReferences WHERE id = @id');
        
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
        const { name, frequency, reference, reference_value, acceptable_error, method_used } = req.body;
        
        if (!name || !frequency) {
            return res.status(400).json({ error: 'Name and frequency are required' });
        }
        
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('frequency', sql.NVarChar, frequency)
            .input('reference', sql.NVarChar, reference || null)
            .input('reference_value', sql.NVarChar, reference_value || null)
            .input('acceptable_error', sql.NVarChar, acceptable_error || null)
            .input('method_used', sql.NVarChar, method_used || null)
            .query(`
                INSERT INTO CalibrationReferences (name, frequency, reference, reference_value, acceptable_error, method_used)
                OUTPUT INSERTED.*
                VALUES (@name, @frequency, @reference, @reference_value, @acceptable_error, @method_used)
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
        const { name, frequency, reference, reference_value, acceptable_error, method_used } = req.body;
        
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('frequency', sql.NVarChar, frequency)
            .input('reference', sql.NVarChar, reference || null)
            .input('reference_value', sql.NVarChar, reference_value || null)
            .input('acceptable_error', sql.NVarChar, acceptable_error || null)
            .input('method_used', sql.NVarChar, method_used || null)
            .query(`
                UPDATE CalibrationReferences 
                SET name = @name, frequency = @frequency, reference = @reference,
                    reference_value = @reference_value, acceptable_error = @acceptable_error,
                    method_used = @method_used, updated_at = GETDATE()
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
            .query('UPDATE CalibrationReferences SET is_active = 0 WHERE id = @id');
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting reference:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API Routes - Calibration Records
// ==========================================

// Submit batch calibration records
router.post('/api/calibrations/batch', async (req, res) => {
    try {
        const { calibration_date, shift, branch, records } = req.body;
        const user = req.currentUser || { email: 'unknown', displayName: 'Unknown', name: 'Unknown' };
        
        if (!calibration_date || !shift || !records || records.length === 0) {
            return res.status(400).json({ error: 'Invalid calibration data' });
        }
        
        const pool = await sql.connect(config.database);
        
        // Get settings for document number
        const settingsResult = await pool.request().query('SELECT * FROM CalibrationSettings');
        const settings = {};
        settingsResult.recordset.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        const prefix = settings.document_prefix || 'CAL';
        const dateStr = new Date(calibration_date).toISOString().slice(0, 10).replace(/-/g, '');
        
        // Get next sequence number for today
        const seqResult = await pool.request()
            .input('date', sql.Date, calibration_date)
            .query(`
                SELECT COUNT(*) + 1 as seq 
                FROM CalibrationSessions 
                WHERE CAST(calibration_date AS DATE) = @date
            `);
        const seq = seqResult.recordset[0].seq;
        const document_number = `${prefix}-${dateStr}-${String(seq).padStart(3, '0')}`;
        
        // Create session
        const sessionResult = await pool.request()
            .input('calibration_date', sql.Date, calibration_date)
            .input('shift', sql.NVarChar, shift)
            .input('branch', sql.NVarChar, branch || null)
            .input('document_number', sql.NVarChar, document_number)
            .input('calibrated_by', sql.NVarChar, user.displayName || user.name || user.email)
            .query(`
                INSERT INTO CalibrationSessions (calibration_date, shift, branch, document_number, calibrated_by)
                OUTPUT INSERTED.id
                VALUES (@calibration_date, @shift, @branch, @document_number, @calibrated_by)
            `);
        
        const session_id = sessionResult.recordset[0].id;
        
        // Insert all records and update due dates
        for (const record of records) {
            await pool.request()
                .input('session_id', sql.Int, session_id)
                .input('reference_id', sql.Int, record.reference_id)
                .input('item_name', sql.NVarChar, record.item_name || null)
                .input('measured_value', sql.NVarChar, record.measured_value || null)
                .input('deviation', sql.NVarChar, record.deviation || null)
                .input('status', sql.NVarChar, record.status)
                .input('remarks', sql.NVarChar, record.remarks || null)
                .input('corrective_action', sql.NVarChar, record.corrective_action || null)
                .query(`
                    INSERT INTO CalibrationRecords (session_id, reference_id, item_name, measured_value, deviation, status, remarks, corrective_action)
                    VALUES (@session_id, @reference_id, @item_name, @measured_value, @deviation, @status, @remarks, @corrective_action)
                `);
            
            // Update the reference with last calibration date and next due date
            if (record.next_due_date) {
                await pool.request()
                    .input('reference_id', sql.Int, record.reference_id)
                    .input('calibration_date', sql.Date, calibration_date)
                    .input('next_due_date', sql.Date, record.next_due_date)
                    .query(`
                        UPDATE CalibrationReferences 
                        SET last_calibration_date = @calibration_date,
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
        console.error('Error submitting calibration:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get calibration history
router.get('/api/calibrations', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query(`
            SELECT s.*,
                (SELECT COUNT(*) FROM CalibrationRecords WHERE session_id = s.id AND status = 'Pass') as pass_count,
                (SELECT COUNT(*) FROM CalibrationRecords WHERE session_id = s.id AND status = 'Fail') as fail_count,
                (SELECT COUNT(*) FROM CalibrationRecords WHERE session_id = s.id) as total_count,
                (SELECT TOP 1 ref.name FROM CalibrationRecords r 
                 JOIN CalibrationReferences ref ON r.reference_id = ref.id 
                 WHERE r.session_id = s.id) as equipment_name
            FROM CalibrationSessions s
            ORDER BY s.calibration_date DESC, s.created_at DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching calibrations:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single calibration session with records
router.get('/api/calibrations/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const sessionResult = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM CalibrationSessions WHERE id = @id');
        
        if (sessionResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const recordsResult = await pool.request()
            .input('session_id', sql.Int, req.params.id)
            .query(`
                SELECT r.*, ref.name as equipment_name, ref.reference_value, ref.acceptable_error, ref.method_used
                FROM CalibrationRecords r
                JOIN CalibrationReferences ref ON r.reference_id = ref.id
                WHERE r.session_id = @session_id
                ORDER BY ref.name
            `);
        
        res.json({
            session: sessionResult.recordset[0],
            records: recordsResult.recordset
        });
    } catch (error) {
        console.error('Error fetching calibration:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify calibration session
router.post('/api/calibrations/:id/verify', async (req, res) => {
    try {
        const user = req.currentUser || { displayName: 'Unknown', name: 'Unknown' };
        const verifiedBy = user.displayName || user.name || 'Unknown';
        
        const pool = await sql.connect(config.database);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('verified_by', sql.NVarChar, verifiedBy)
            .query(`
                UPDATE CalibrationSessions 
                SET verified = 1, verified_by = @verified_by, verified_at = GETDATE()
                WHERE id = @id
            `);
        
        res.json({ success: true, verified_by: verifiedBy });
    } catch (error) {
        console.error('Error verifying calibration:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update calibration record (only Admin and Super Auditor can edit)
router.put('/api/calibrations/:id', async (req, res) => {
    try {
        const user = req.currentUser;
        
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // Check role - only Admin and Super Auditor can edit
        const role = user.role || '';
        if (role !== 'Admin' && role !== 'Super Auditor') {
            return res.status(403).json({ error: 'Only Admin and Super Auditor can edit calibration records' });
        }
        
        const { calibration_date, record } = req.body;
        
        if (!calibration_date || !record) {
            return res.status(400).json({ error: 'Invalid data' });
        }
        
        const pool = await sql.connect(config.database);
        
        // Update session
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('calibration_date', sql.Date, calibration_date)
            .input('updated_by', sql.NVarChar, user.displayName || user.name || user.email)
            .query(`
                UPDATE CalibrationSessions 
                SET calibration_date = @calibration_date, 
                    updated_at = GETDATE(),
                    updated_by = @updated_by
                WHERE id = @id
            `);
        
        // Update record
        await pool.request()
            .input('session_id', sql.Int, req.params.id)
            .input('measured_value', sql.NVarChar, record.measured_value || null)
            .input('deviation', sql.NVarChar, record.deviation || null)
            .input('status', sql.NVarChar, record.status)
            .input('remarks', sql.NVarChar, record.remarks || null)
            .input('corrective_action', sql.NVarChar, record.corrective_action || null)
            .query(`
                UPDATE CalibrationRecords 
                SET measured_value = @measured_value,
                    deviation = @deviation,
                    status = @status,
                    remarks = @remarks,
                    corrective_action = @corrective_action
                WHERE session_id = @session_id
            `);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating calibration:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API Routes - Settings
// ==========================================

router.get('/api/settings', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request().query('SELECT * FROM CalibrationSettings');
        
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

router.put('/api/settings', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        for (const [key, value] of Object.entries(req.body)) {
            await pool.request()
                .input('key', sql.NVarChar, key)
                .input('value', sql.NVarChar, value)
                .query(`
                    IF EXISTS (SELECT 1 FROM CalibrationSettings WHERE setting_key = @key)
                        UPDATE CalibrationSettings SET setting_value = @value, updated_at = GETDATE() WHERE setting_key = @key
                    ELSE
                        INSERT INTO CalibrationSettings (setting_key, setting_value) VALUES (@key, @value)
                `);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
