-- =============================================
-- FS Monitoring Database Schema
-- Run in FSMonitoringDB_UAT or FSMonitoringDB
-- =============================================

USE FSMonitoringDB_UAT;
GO

-- Drop existing tables if they exist (in correct order for foreign keys)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Sessions')
    DROP TABLE Sessions;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    DROP TABLE Users;
GO

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    azure_user_id NVARCHAR(255) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL,
    display_name NVARCHAR(255),
    photo_url NVARCHAR(500),
    job_title NVARCHAR(255),
    department NVARCHAR(255),
    role NVARCHAR(50) DEFAULT 'pending',  -- pending, auditor, admin
    assigned_stores NVARCHAR(MAX),        -- JSON array of store IDs
    assigned_department NVARCHAR(255),
    is_active BIT DEFAULT 1,
    is_approved BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2
);

CREATE INDEX idx_users_azure_id ON Users(azure_user_id);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);

PRINT 'Users table created';
GO

-- =============================================
-- Sessions Table
-- =============================================
CREATE TABLE Sessions (
    id INT PRIMARY KEY IDENTITY(1,1),
    session_token NVARCHAR(255) NOT NULL UNIQUE,
    user_id INT FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
    azure_access_token NVARCHAR(MAX),
    azure_refresh_token NVARCHAR(MAX),
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    last_activity DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_sessions_token ON Sessions(session_token);
CREATE INDEX idx_sessions_user ON Sessions(user_id);
CREATE INDEX idx_sessions_expires ON Sessions(expires_at);

PRINT 'Sessions table created';
GO

-- =============================================
-- Stores Table (for auditor assignments)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Stores')
BEGIN
    CREATE TABLE Stores (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(255) NOT NULL,
        code NVARCHAR(50),
        location NVARCHAR(255),
        status NVARCHAR(50) DEFAULT 'active',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    PRINT 'Stores table created';
END
GO

-- =============================================
-- Checklists Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Checklists')
BEGIN
    CREATE TABLE Checklists (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        category NVARCHAR(100),
        status NVARCHAR(50) DEFAULT 'active',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    PRINT 'Checklists table created';
END
GO

-- =============================================
-- Checklist Items Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChecklistItems')
BEGIN
    CREATE TABLE ChecklistItems (
        id INT PRIMARY KEY IDENTITY(1,1),
        checklist_id INT FOREIGN KEY REFERENCES Checklists(id) ON DELETE CASCADE,
        question NVARCHAR(MAX) NOT NULL,
        category NVARCHAR(100),
        sort_order INT DEFAULT 0,
        is_required BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    PRINT 'ChecklistItems table created';
END
GO

-- =============================================
-- Add first admin user
-- =============================================
INSERT INTO Users (azure_user_id, email, display_name, role, is_active, is_approved)
VALUES ('admin-placeholder', 'muhammad.shammas@gmrlgroup.com', 'Muhammad Shammas', 'admin', 1, 1);

PRINT '';
PRINT '=============================================';
PRINT 'Database schema created successfully!';
PRINT 'Admin user added: muhammad.shammas@gmrlgroup.com';
PRINT '=============================================';
GO
