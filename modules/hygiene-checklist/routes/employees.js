/**
 * Employees Routes (Hygiene Checklist Module)
 * Manages employee CRUD operations
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');
const config = require(path.join(process.cwd(), 'config', 'default'));
const { requireAuth, requireRole } = require(path.join(process.cwd(), 'auth', 'auth-server'));

// ==========================================
// Get all employees
// ==========================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                SELECT 
                    e.id, e.name, e.gender, e.position, e.is_active,
                    e.created_at, s.name as store_name, s.id as store_id
                FROM Employees e
                LEFT JOIN Stores s ON e.store_id = s.id
                WHERE e.is_active = 1
                ORDER BY e.name
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get single employee
// ==========================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    e.id, e.name, e.gender, e.position, e.is_active,
                    e.store_id, e.created_at, s.name as store_name
                FROM Employees e
                LEFT JOIN Stores s ON e.store_id = s.id
                WHERE e.id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Create employee (Super Auditor only)
// ==========================================
router.post('/', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const { name, gender, store_id, position } = req.body;
        
        if (!name || !gender) {
            return res.status(400).json({ error: 'Name and gender are required' });
        }
        
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('gender', sql.NVarChar, gender)
            .input('store_id', sql.Int, store_id || null)
            .input('position', sql.NVarChar, position || null)
            .input('created_by', sql.Int, req.currentUser.id)
            .query(`
                INSERT INTO Employees (name, gender, store_id, position, created_by)
                OUTPUT INSERTED.*
                VALUES (@name, @gender, @store_id, @position, @created_by)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Update employee (Super Auditor only)
// ==========================================
router.put('/:id', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const { name, gender, store_id, position, is_active } = req.body;
        
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('gender', sql.NVarChar, gender)
            .input('store_id', sql.Int, store_id || null)
            .input('position', sql.NVarChar, position || null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : true)
            .query(`
                UPDATE Employees
                SET name = @name, gender = @gender, store_id = @store_id,
                    position = @position, is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Delete employee (soft delete)
// ==========================================
router.delete('/:id', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Employees SET is_active = 0, updated_at = GETDATE()
                WHERE id = @id
            `);
        
        res.json({ success: true, message: 'Employee deleted' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get employees by store
// ==========================================
router.get('/store/:storeId', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('storeId', sql.Int, req.params.storeId)
            .query(`
                SELECT id, name, gender, position
                FROM Employees
                WHERE store_id = @storeId AND is_active = 1
                ORDER BY name
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching employees by store:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
