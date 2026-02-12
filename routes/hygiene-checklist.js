/**
 * Hygiene Checklist Routes
 * Manages hygiene checklist submission and history
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../config/default');
const { requireAuth, requireRole } = require('../auth/auth-server');

// ==========================================
// Get all checklists with filters
// ==========================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const { store_id, employee_id, date_from, date_to, limit = 50 } = req.query;
        
        const pool = await sql.connect(config.database);
        
        let query = `
            SELECT TOP (@limit)
                hc.id, hc.check_date, hc.check_time, hc.shift, hc.overall_pass, hc.notes,
                hc.created_at,
                e.id as employee_id, e.name as employee_name, e.gender as employee_gender,
                s.id as store_id, s.name as store_name,
                u.display_name as checked_by_name
            FROM HygieneChecklists hc
            JOIN Employees e ON hc.employee_id = e.id
            JOIN Stores s ON hc.store_id = s.id
            JOIN Users u ON hc.checked_by = u.id
            WHERE 1=1
        `;
        
        const request = pool.request();
        request.input('limit', sql.Int, parseInt(limit));
        
        if (store_id) {
            query += ' AND hc.store_id = @store_id';
            request.input('store_id', sql.Int, store_id);
        }
        
        if (employee_id) {
            query += ' AND hc.employee_id = @employee_id';
            request.input('employee_id', sql.Int, employee_id);
        }
        
        if (date_from) {
            query += ' AND hc.check_date >= @date_from';
            request.input('date_from', sql.Date, date_from);
        }
        
        if (date_to) {
            query += ' AND hc.check_date <= @date_to';
            request.input('date_to', sql.Date, date_to);
        }
        
        query += ' ORDER BY hc.check_date DESC, hc.check_time DESC';
        
        const result = await request.query(query);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching checklists:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get single checklist with all responses
// ==========================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        // Get checklist header
        const checklist = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    hc.id, hc.check_date, hc.check_time, hc.shift, hc.overall_pass, hc.notes,
                    hc.created_at,
                    e.id as employee_id, e.name as employee_name, e.gender as employee_gender,
                    s.id as store_id, s.name as store_name,
                    u.display_name as checked_by_name, u.id as checked_by_id
                FROM HygieneChecklists hc
                JOIN Employees e ON hc.employee_id = e.id
                JOIN Stores s ON hc.store_id = s.id
                JOIN Users u ON hc.checked_by = u.id
                WHERE hc.id = @id
            `);
        
        if (checklist.recordset.length === 0) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        
        // Get responses
        const responses = await pool.request()
            .input('checklist_id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    r.id, r.response, r.notes,
                    i.id as item_id, i.name as item_name, i.description as item_description
                FROM HygieneChecklistResponses r
                JOIN HygieneChecklistItems i ON r.item_id = i.id
                WHERE r.checklist_id = @checklist_id
                ORDER BY i.sort_order
            `);
        
        res.json({
            ...checklist.recordset[0],
            responses: responses.recordset
        });
    } catch (error) {
        console.error('Error fetching checklist:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Submit new hygiene checklist
// ==========================================
router.post('/', requireAuth, requireRole('SuperAuditor', 'Auditor', 'Admin'), async (req, res) => {
    try {
        const { employee_id, store_id, shift, notes, responses } = req.body;
        
        if (!employee_id || !store_id || !responses || responses.length === 0) {
            return res.status(400).json({ 
                error: 'Employee, store, and responses are required' 
            });
        }
        
        const pool = await sql.connect(config.database);
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();
        
        try {
            // Calculate overall pass (all items must pass)
            const overall_pass = responses.every(r => r.response === true);
            
            // Insert checklist header
            const checklistResult = await transaction.request()
                .input('employee_id', sql.Int, employee_id)
                .input('store_id', sql.Int, store_id)
                .input('check_date', sql.Date, new Date())
                .input('check_time', sql.Time, new Date())
                .input('shift', sql.NVarChar, shift || null)
                .input('checked_by', sql.Int, req.currentUser.id)
                .input('overall_pass', sql.Bit, overall_pass)
                .input('notes', sql.NVarChar, notes || null)
                .query(`
                    INSERT INTO HygieneChecklists 
                        (employee_id, store_id, check_date, check_time, shift, checked_by, overall_pass, notes)
                    OUTPUT INSERTED.id
                    VALUES 
                        (@employee_id, @store_id, @check_date, @check_time, @shift, @checked_by, @overall_pass, @notes)
                `);
            
            const checklist_id = checklistResult.recordset[0].id;
            
            // Insert responses
            for (const response of responses) {
                await transaction.request()
                    .input('checklist_id', sql.Int, checklist_id)
                    .input('item_id', sql.Int, response.item_id)
                    .input('response', sql.Bit, response.response)
                    .input('notes', sql.NVarChar, response.notes || null)
                    .query(`
                        INSERT INTO HygieneChecklistResponses (checklist_id, item_id, response, notes)
                        VALUES (@checklist_id, @item_id, @response, @notes)
                    `);
            }
            
            await transaction.commit();
            
            res.status(201).json({ 
                success: true, 
                checklist_id,
                overall_pass,
                message: overall_pass ? 'Checklist passed!' : 'Checklist has failed items'
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('Error submitting checklist:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get today's checklists for a store
// ==========================================
router.get('/today/:storeId', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('store_id', sql.Int, req.params.storeId)
            .input('today', sql.Date, new Date())
            .query(`
                SELECT 
                    hc.id, hc.check_time, hc.shift, hc.overall_pass,
                    e.id as employee_id, e.name as employee_name,
                    u.display_name as checked_by_name
                FROM HygieneChecklists hc
                JOIN Employees e ON hc.employee_id = e.id
                JOIN Users u ON hc.checked_by = u.id
                WHERE hc.store_id = @store_id AND hc.check_date = @today
                ORDER BY hc.check_time DESC
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching today checklists:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get employees not checked today
// ==========================================
router.get('/pending/:storeId', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('store_id', sql.Int, req.params.storeId)
            .input('today', sql.Date, new Date())
            .query(`
                SELECT e.id, e.name, e.gender, e.position
                FROM Employees e
                WHERE e.store_id = @store_id 
                    AND e.is_active = 1
                    AND e.id NOT IN (
                        SELECT employee_id FROM HygieneChecklists 
                        WHERE store_id = @store_id AND check_date = @today
                    )
                ORDER BY e.name
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching pending employees:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get statistics
// ==========================================
router.get('/stats/summary', requireAuth, async (req, res) => {
    try {
        const { store_id, date_from, date_to } = req.query;
        
        const pool = await sql.connect(config.database);
        
        let query = `
            SELECT 
                COUNT(*) as total_checks,
                SUM(CASE WHEN overall_pass = 1 THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN overall_pass = 0 THEN 1 ELSE 0 END) as failed,
                CAST(SUM(CASE WHEN overall_pass = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100 as DECIMAL(5,2)) as pass_rate
            FROM HygieneChecklists
            WHERE 1=1
        `;
        
        const request = pool.request();
        
        if (store_id) {
            query += ' AND store_id = @store_id';
            request.input('store_id', sql.Int, store_id);
        }
        
        if (date_from) {
            query += ' AND check_date >= @date_from';
            request.input('date_from', sql.Date, date_from);
        }
        
        if (date_to) {
            query += ' AND check_date <= @date_to';
            request.input('date_to', sql.Date, date_to);
        }
        
        const result = await request.query(query);
        
        res.json(result.recordset[0] || { total_checks: 0, passed: 0, failed: 0, pass_rate: 0 });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
