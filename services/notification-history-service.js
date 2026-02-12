/**
 * Notification History Service
 * Handles notification logging and history
 */

const sql = require('mssql');
const config = require('../config/default');

class NotificationHistoryService {
    static async logNotification(userId, type, message, data = {}) {
        try {
            const pool = await sql.connect(config.database);
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('type', sql.NVarChar, type)
                .input('message', sql.NVarChar, message)
                .input('data', sql.NVarChar, JSON.stringify(data))
                .query(`
                    INSERT INTO notification_history (user_id, type, message, data, created_at)
                    VALUES (@userId, @type, @message, @data, GETDATE())
                `);
        } catch (error) {
            console.error('[NOTIFICATIONS] Error logging notification:', error);
        }
    }

    static async getNotificationsForUser(userId, limit = 50) {
        try {
            const pool = await sql.connect(config.database);
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) * 
                    FROM notification_history 
                    WHERE user_id = @userId
                    ORDER BY created_at DESC
                `);
            return result.recordset;
        } catch (error) {
            console.error('[NOTIFICATIONS] Error fetching notifications:', error);
            return [];
        }
    }
}

module.exports = NotificationHistoryService;
