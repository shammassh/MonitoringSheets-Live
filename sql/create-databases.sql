-- =============================================
-- Create FS Monitoring Databases
-- Run this script in SSMS as sa or admin
-- =============================================

-- Create UAT Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'FSMonitoringDB_UAT')
BEGIN
    CREATE DATABASE FSMonitoringDB_UAT;
    PRINT 'Created database: FSMonitoringDB_UAT';
END
ELSE
BEGIN
    PRINT 'Database FSMonitoringDB_UAT already exists';
END
GO

-- Create Live/Production Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'FSMonitoringDB')
BEGIN
    CREATE DATABASE FSMonitoringDB;
    PRINT 'Created database: FSMonitoringDB';
END
ELSE
BEGIN
    PRINT 'Database FSMonitoringDB already exists';
END
GO

-- =============================================
-- Switch to UAT database and create auth tables
-- =============================================
USE FSMonitoringDB_UAT;
GO

-- Users table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        azure_id NVARCHAR(255) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL,
        display_name NVARCHAR(255),
        role NVARCHAR(50) DEFAULT 'pending',
        status NVARCHAR(50) DEFAULT 'pending_approval',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        last_login DATETIME2
    );
    
    CREATE INDEX idx_users_azure_id ON users(azure_id);
    CREATE INDEX idx_users_email ON users(email);
    PRINT 'Created users table in FSMonitoringDB_UAT';
END
GO

-- Sessions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sessions')
BEGIN
    CREATE TABLE sessions (
        sid NVARCHAR(255) PRIMARY KEY,
        user_id INT FOREIGN KEY REFERENCES users(id),
        expires DATETIME2,
        data NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_expires ON sessions(expires);
    PRINT 'Created sessions table in FSMonitoringDB_UAT';
END
GO

-- =============================================
-- Switch to Live database and create auth tables
-- =============================================
USE FSMonitoringDB;
GO

-- Users table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        azure_id NVARCHAR(255) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL,
        display_name NVARCHAR(255),
        role NVARCHAR(50) DEFAULT 'pending',
        status NVARCHAR(50) DEFAULT 'pending_approval',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        last_login DATETIME2
    );
    
    CREATE INDEX idx_users_azure_id ON users(azure_id);
    CREATE INDEX idx_users_email ON users(email);
    PRINT 'Created users table in FSMonitoringDB';
END
GO

-- Sessions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sessions')
BEGIN
    CREATE TABLE sessions (
        sid NVARCHAR(255) PRIMARY KEY,
        user_id INT FOREIGN KEY REFERENCES users(id),
        expires DATETIME2,
        data NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_expires ON sessions(expires);
    PRINT 'Created sessions table in FSMonitoringDB';
END
GO

PRINT '';
PRINT '=============================================';
PRINT 'Database setup complete!';
PRINT 'UAT Database: FSMonitoringDB_UAT';
PRINT 'Live Database: FSMonitoringDB';
PRINT '=============================================';
