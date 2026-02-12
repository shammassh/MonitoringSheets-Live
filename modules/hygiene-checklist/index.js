/**
 * Hygiene Checklist Module
 * Employee Health & Hygiene Monitoring
 */

const express = require('express');
const path = require('path');
const router = express.Router();

// Import routes
const employeesRoutes = require('./routes/employees');
const checklistItemsRoutes = require('./routes/checklist-items');
const checklistRoutes = require('./routes/checklist');
const storesRoutes = require('./routes/stores');
const settingsRoutes = require('./routes/settings');

// ==========================================
// API Routes (under /hygiene-checklist/api/...)
// ==========================================
router.use('/api/employees', employeesRoutes);
router.use('/api/checklist-items', checklistItemsRoutes);
router.use('/api/hygiene-checklists', checklistRoutes);
router.use('/api/stores', storesRoutes);
router.use('/api/settings', settingsRoutes);

// Get current user info
const { requireAuth } = require(path.join(process.cwd(), 'auth', 'auth-server'));
router.get('/api/me', requireAuth, (req, res) => {
    res.json({
        id: req.currentUser.id,
        email: req.currentUser.email,
        display_name: req.currentUser.display_name,
        role: req.currentUser.role
    });
});

// ==========================================
// Page Routes (under /hygiene-checklist/...)
// ==========================================

// Main form page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

// Employee management
router.get('/employees', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'employees.html'));
});

// Checklist items management
router.get('/items', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checklist-items.html'));
});

// Checklist history
router.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'history.html'));
});

// System settings
router.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

module.exports = router;
