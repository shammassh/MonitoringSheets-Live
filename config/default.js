/**
 * Default Configuration
 * Loads settings from environment variables
 */

require('dotenv').config();

module.exports = {
    // App settings
    app: {
        name: process.env.APP_NAME || 'FS Monitoring',
        url: process.env.APP_URL || 'https://fsmonitoring.gmrlapps.com',
        port: parseInt(process.env.PORT) || 443
    },

    // Azure AD settings
    azure: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        redirectUri: process.env.REDIRECT_URI,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
    },

    // Database settings
    database: {
        server: process.env.SQL_SERVER || 'localhost',
        database: process.env.SQL_DATABASE || 'FSMonitoringDB',
        user: process.env.SQL_USER || 'sa',
        password: process.env.SQL_PASSWORD,
        options: {
            encrypt: process.env.SQL_ENCRYPT === 'true',
            trustServerCertificate: process.env.SQL_TRUST_CERT === 'true'
        }
    },

    // Session settings
    session: {
        secret: process.env.SESSION_SECRET || 'change-this-secret',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },

    // SSL settings
    ssl: {
        keyPath: process.env.SSL_KEY_PATH,
        certPath: process.env.SSL_CERT_PATH
    }
};


