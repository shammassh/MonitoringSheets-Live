-- Equipment Calibration Module Schema
-- Run this to create the required tables

-- Calibration References (equipment/tools to calibrate)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CalibrationReferences' AND xtype='U')
CREATE TABLE CalibrationReferences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    frequency NVARCHAR(50) NOT NULL, -- 'Daily', 'Every 3 Days', 'Weekly', 'Every 3 Weeks', 'Monthly', 'Every 6 Months', 'Yearly'
    reference NVARCHAR(200),
    reference_value NVARCHAR(100),
    acceptable_error NVARCHAR(100),
    method_used NVARCHAR(500),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Calibration Records (actual calibration entries)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CalibrationRecords' AND xtype='U')
CREATE TABLE CalibrationRecords (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    reference_id INT NOT NULL FOREIGN KEY REFERENCES CalibrationReferences(id),
    item_name NVARCHAR(200),
    measured_value NVARCHAR(100),
    deviation NVARCHAR(100),
    status NVARCHAR(20) DEFAULT 'Pass', -- 'Pass', 'Fail', 'N/A'
    corrective_action NVARCHAR(500),
    remarks NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE()
);

-- Calibration Sessions (group records by date/shift)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CalibrationSessions' AND xtype='U')
CREATE TABLE CalibrationSessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) UNIQUE,
    calibration_date DATE NOT NULL,
    shift NVARCHAR(20),
    branch NVARCHAR(100),
    calibrated_by INT, -- user id
    verified BIT DEFAULT 0,
    verified_by INT,
    verified_at DATETIME,
    remarks NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Add foreign key for session_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_CalibrationRecords_Session')
ALTER TABLE CalibrationRecords
ADD CONSTRAINT FK_CalibrationRecords_Session
FOREIGN KEY (session_id) REFERENCES CalibrationSessions(id);

-- Add branch column if it doesn't exist (migration for existing tables)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CalibrationSessions') AND name = 'branch')
ALTER TABLE CalibrationSessions ADD branch NVARCHAR(100);

-- Calibration Settings
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CalibrationSettings' AND xtype='U')
CREATE TABLE CalibrationSettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) UNIQUE NOT NULL,
    setting_value NVARCHAR(500),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Insert default settings
IF NOT EXISTS (SELECT 1 FROM CalibrationSettings WHERE setting_key = 'document_prefix')
INSERT INTO CalibrationSettings (setting_key, setting_value) VALUES ('document_prefix', 'CAL');

IF NOT EXISTS (SELECT 1 FROM CalibrationSettings WHERE setting_key = 'creation_date')
INSERT INTO CalibrationSettings (setting_key, setting_value) VALUES ('creation_date', '2024-01-01');

IF NOT EXISTS (SELECT 1 FROM CalibrationSettings WHERE setting_key = 'revision_date')
INSERT INTO CalibrationSettings (setting_key, setting_value) VALUES ('revision_date', '2024-01-01');

IF NOT EXISTS (SELECT 1 FROM CalibrationSettings WHERE setting_key = 'edition')
INSERT INTO CalibrationSettings (setting_key, setting_value) VALUES ('edition', '1');

-- Add item_name column if it doesn't exist (migration for existing tables)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CalibrationRecords') AND name = 'item_name')
ALTER TABLE CalibrationRecords ADD item_name NVARCHAR(200);

PRINT 'Equipment Calibration tables created successfully';
