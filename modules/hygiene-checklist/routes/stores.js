/**
 * Stores Routes (Hygiene Checklist Module)
 * Manages store CRUD operations
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const path = require('path');
const config = require(path.join(process.cwd(), 'config', 'default'));
const { requireAuth, requireRole } = require(path.join(process.cwd(), 'auth', 'auth-server'));

// ==========================================
// Get all stores
// ==========================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                SELECT id, name, location, is_active, created_at
                FROM Stores
                WHERE is_active = 1
                ORDER BY name
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Get single store
// ==========================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT id, name, location, is_active, created_at
                FROM Stores
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching store:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Create store (Admin only)
// ==========================================
router.post('/', requireAuth, requireRole('Admin'), async (req, res) => {
    try {
        const { name, location } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('location', sql.NVarChar, location || null)
            .query(`
                INSERT INTO Stores (name, location)
                OUTPUT INSERTED.*
                VALUES (@name, @location)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Update store (Admin only)
// ==========================================
router.put('/:id', requireAuth, requireRole('Admin'), async (req, res) => {
    try {
        const { name, location, is_active } = req.body;
        
        const pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('location', sql.NVarChar, location || null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : true)
            .query(`
                UPDATE Stores
                SET name = @name, location = @location, is_active = @is_active
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// Delete store (soft delete)
// ==========================================
router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE Stores SET is_active = 0 WHERE id = @id');
        
        res.json({ success: true, message: 'Store deleted' });
    } catch (error) {
        console.error('Error deleting store:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
