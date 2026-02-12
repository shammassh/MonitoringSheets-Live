-- Dry Store Temperature and Humidity Monitoring Sheet Module Schema
-- Created: January 2026

USE FSMonitoringDB_UAT;
GO

-- Dry Store Readings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreReadings' AND xtype='U')
CREATE TABLE DryStoreReadings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) NOT NULL UNIQUE,
    branch NVARCHAR(255) NOT NULL,
    dry_store NVARCHAR(255) NOT NULL,
    reading_date DATE NOT NULL,
    temp_am DECIMAL(5,2),
    humidity_am DECIMAL(5,2),
    temp_am_status NVARCHAR(20) DEFAULT 'Pass',
    humidity_am_status NVARCHAR(20) DEFAULT 'Pass',
    temp_am_corrective_action NVARCHAR(500),
    humidity_am_corrective_action NVARCHAR(500),
    temp_pm DECIMAL(5,2),
    humidity_pm DECIMAL(5,2),
    temp_pm_status NVARCHAR(20) DEFAULT 'Pass',
    humidity_pm_status NVARCHAR(20) DEFAULT 'Pass',
    temp_pm_corrective_action NVARCHAR(500),
    humidity_pm_corrective_action NVARCHAR(500),
    filled_by NVARCHAR(255),
    verified BIT DEFAULT 0,
    verified_by NVARCHAR(255),
    verified_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Dry Store Settings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreSettings' AND xtype='U')
CREATE TABLE DryStoreSettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(500),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default settings
IF NOT EXISTS (SELECT 1 FROM DryStoreSettings WHERE setting_key = 'temp_max')
    INSERT INTO DryStoreSettings (setting_key, setting_value) VALUES ('temp_max', '25');
IF NOT EXISTS (SELECT 1 FROM DryStoreSettings WHERE setting_key = 'humidity_max')
    INSERT INTO DryStoreSettings (setting_key, setting_value) VALUES ('humidity_max', '65');
IF NOT EXISTS (SELECT 1 FROM DryStoreSettings WHERE setting_key = 'branch')
    INSERT INTO DryStoreSettings (setting_key, setting_value) VALUES ('branch', 'Main Branch');
GO

-- Dry Store Locations Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreLocations' AND xtype='U')
CREATE TABLE DryStoreLocations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default locations
IF NOT EXISTS (SELECT 1 FROM DryStoreLocations WHERE name = 'Dry Store 1')
    INSERT INTO DryStoreLocations (name) VALUES ('Dry Store 1');
IF NOT EXISTS (SELECT 1 FROM DryStoreLocations WHERE name = 'Dry Store 2')
    INSERT INTO DryStoreLocations (name) VALUES ('Dry Store 2');
GO

-- Dry Store Branches Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreBranches' AND xtype='U')
CREATE TABLE DryStoreBranches (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default branches
IF NOT EXISTS (SELECT 1 FROM DryStoreBranches WHERE name = 'Main Branch')
    INSERT INTO DryStoreBranches (name) VALUES ('Main Branch');
GO

PRINT 'Dry Store Temperature and Humidity Monitoring tables created successfully';
GO
