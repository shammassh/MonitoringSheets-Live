-- Food Safety Verification Sheet Module Schema
-- Created: January 2026

USE FSMonitoringDB_UAT;
GO

-- Food Safety References Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FoodSafetyReferences' AND xtype='U')
CREATE TABLE FoodSafetyReferences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    frequency NVARCHAR(50) NOT NULL,
    reference NVARCHAR(500),
    accept_error NVARCHAR(100),
    reference_value NVARCHAR(100),
    reference_value_method NVARCHAR(500),
    unit_of_measurement NVARCHAR(50),
    next_due_date DATE NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Food Safety Verification Sessions Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FoodSafetyVerificationSessions' AND xtype='U')
CREATE TABLE FoodSafetyVerificationSessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) NOT NULL UNIQUE,
    verification_date DATE NOT NULL,
    branch NVARCHAR(100),
    verified_by NVARCHAR(255),
    verified BIT DEFAULT 0,
    verified_by_user NVARCHAR(255),
    verified_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Add branch column if it doesn't exist (migration for existing tables)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FoodSafetyVerificationSessions') AND name = 'branch')
ALTER TABLE FoodSafetyVerificationSessions ADD branch NVARCHAR(100);
GO

-- Food Safety Verification Records Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FoodSafetyVerificationRecords' AND xtype='U')
CREATE TABLE FoodSafetyVerificationRecords (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    reference_id INT NOT NULL,
    procedure_name NVARCHAR(255),
    unit_of_measurement NVARCHAR(50),
    test_value NVARCHAR(100),
    reference_value NVARCHAR(100),
    difference NVARCHAR(100),
    status NVARCHAR(20) DEFAULT 'Pass',
    corrective_action NVARCHAR(MAX),
    next_due_date DATE,
    comments NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (session_id) REFERENCES FoodSafetyVerificationSessions(id),
    FOREIGN KEY (reference_id) REFERENCES FoodSafetyReferences(id)
);
GO

-- Food Safety Settings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FoodSafetySettings' AND xtype='U')
CREATE TABLE FoodSafetySettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(MAX),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

PRINT 'Food Safety Verification tables created successfully';
GO
