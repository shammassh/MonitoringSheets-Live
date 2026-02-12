/**
 * Stores Service
 * Handles store data operations
 */

const sql = require('mssql');
const config = require('../../config/default');

class StoresService {
    static async getAllStores() {
        try {
            const pool = await sql.connect(config.database);
            const result = await pool.request().query(`
                SELECT id, name, code, location, status
                FROM stores
                WHERE status = 'active'
                ORDER BY name
            `);
            return result.recordset;
        } catch (error) {
            console.error('[STORES] Error fetching stores:', error);
            return [];
        }
    }

    static async getStoreById(storeId) {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('storeId', sql.Int, storeId)
            .query(`SELECT * FROM stores WHERE id = @storeId`);
        return result.recordset[0];
    }
}

module.exports = StoresService;
