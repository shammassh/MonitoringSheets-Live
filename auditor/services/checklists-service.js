/**
 * Checklists Service
 * Handles checklist data operations
 */

const sql = require('mssql');
const config = require('../../config/default');

class ChecklistsService {
    static async getAllChecklists() {
        try {
            const pool = await sql.connect(config.database);
            const result = await pool.request().query(`
                SELECT id, name, description, category, status
                FROM checklists
                WHERE status = 'active'
                ORDER BY name
            `);
            return result.recordset;
        } catch (error) {
            console.error('[CHECKLISTS] Error fetching checklists:', error);
            return [];
        }
    }

    static async getChecklistById(checklistId) {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('checklistId', sql.Int, checklistId)
            .query(`SELECT * FROM checklists WHERE id = @checklistId`);
        return result.recordset[0];
    }

    static async getChecklistItems(checklistId) {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('checklistId', sql.Int, checklistId)
            .query(`
                SELECT * FROM checklist_items 
                WHERE checklist_id = @checklistId
                ORDER BY sort_order
            `);
        return result.recordset;
    }
}

module.exports = ChecklistsService;
