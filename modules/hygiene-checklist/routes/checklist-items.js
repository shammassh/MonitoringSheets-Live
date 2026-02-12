/**
 * Hygiene Checklist Items Routes (Hygiene Checklist Module)
 * Manages checklist item CRUD operations
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');
const config = require(path.join(process.cwd(), 'config', 'default'));
const { requireAuth, requireRole } = require(path.join(process.cwd(), 'auth', 'auth-server'));

// ==========================================
// Get all checklist items
// ==========================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                SELECT id, name, description, is_active, sort_order, gender_specific, created_at
                FROM HygieneChecklistItems
                WHERE is_active = 1
                ORDER BY sort_order, name
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching checklist items:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get all items (including inactive) for admin
// ==========================================
router.get('/all', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                SELECT id, name, description, is_active, sort_order, gender_specific, created_at
                FROM HygieneChecklistItems
                ORDER BY sort_order, name
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching all checklist items:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get single checklist item
// ==========================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT id, name, description, is_active, sort_order, created_at
                FROM HygieneChecklistItems
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching checklist item:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Create checklist item (Super Auditor only)
// ==========================================
router.post('/', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const { name, description, sort_order } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const pool = await sql.connect(config.database);
        
        // Get next sort order if not provided
        let order = sort_order;
        if (!order) {
            const maxOrder = await pool.request()
                .query('SELECT ISNULL(MAX(sort_order), 0) + 1 as next_order FROM HygieneChecklistItems');
            order = maxOrder.recordset[0].next_order;
        }
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description || null)
            .input('sort_order', sql.Int, order)
            .input('created_by', sql.Int, req.currentUser.id)
            .query(`
                INSERT INTO HygieneChecklistItems (name, description, sort_order, created_by)
                OUTPUT INSERTED.*
                VALUES (@name, @description, @sort_order, @created_by)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error creating checklist item:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Update checklist item (Super Auditor only)
// ==========================================
router.put('/:id', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const { name, description, sort_order, is_active } = req.body;
        
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description || null)
            .input('sort_order', sql.Int, sort_order || 0)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : true)
            .query(`
                UPDATE HygieneChecklistItems
                SET name = @name, description = @description, sort_order = @sort_order,
                    is_active = @is_active, updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error updating checklist item:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Delete checklist item (soft delete)
// ==========================================
router.delete('/:id', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE HygieneChecklistItems SET is_active = 0, updated_at = GETDATE()
                WHERE id = @id
            `);
        
        res.json({ success: true, message: 'Checklist item deleted' });
    } catch (error) {
        console.error('Error deleting checklist item:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Reorder checklist items
// ==========================================
router.post('/reorder', requireAuth, requireRole('SuperAuditor', 'Admin'), async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sort_order }
        
        const pool = await sql.connect(config.database);
        
        for (const item of items) {
            await pool.request()
                .input('id', sql.Int, item.id)
                .input('sort_order', sql.Int, item.sort_order)
                .query('UPDATE HygieneChecklistItems SET sort_order = @sort_order WHERE id = @id');
        }
        
        res.json({ success: true, message: 'Items reordered' });
    } catch (error) {
        console.error('Error reordering items:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
