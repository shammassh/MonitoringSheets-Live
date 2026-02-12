-- Water Quality Monitoring Sheet Module Schema
-- Created: January 2026

USE FSMonitoringDB_UAT;
GO

-- Water Quality Readings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WaterQualityReadings' AND xtype='U')
CREATE TABLE WaterQualityReadings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) NOT NULL UNIQUE,
    reading_date DATE NOT NULL,
    section NVARCHAR(255) NOT NULL,
    th_value DECIMAL(8,2),
    th_status NVARCHAR(20) DEFAULT 'Pass',
    tds_value DECIMAL(8,2),
    tds_status NVARCHAR(20) DEFAULT 'Pass',
    salt_ok BIT DEFAULT 1,
    salt_status NVARCHAR(20) DEFAULT 'Pass',
    ph_value DECIMAL(4,2),
    ph_status NVARCHAR(20) DEFAULT 'Pass',
    chlorine_30min DECIMAL(4,2),
    chlorine_30min_status NVARCHAR(20) DEFAULT 'Pass',
    chlorine_point_of_use DECIMAL(4,2),
    chlorine_point_of_use_status NVARCHAR(20) DEFAULT 'Pass',
    corrective_action NVARCHAR(1000),
    filled_by NVARCHAR(255),
    verified BIT DEFAULT 0,
    verified_by NVARCHAR(255),
    verified_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Water Quality Settings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WaterQualitySettings' AND xtype='U')
CREATE TABLE WaterQualitySettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(500),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default settings (reference values)
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'tds_min')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('tds_min', '100');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'tds_max')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('tds_max', '750');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'th_max')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('th_max', '500');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'ph_min')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('ph_min', '6.5');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'ph_max')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('ph_max', '8.5');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'chlorine_30min_min')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('chlorine_30min_min', '0.5');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'chlorine_pou_min')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('chlorine_pou_min', '0.2');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySettings WHERE setting_key = 'chlorine_pou_max')
    INSERT INTO WaterQualitySettings (setting_key, setting_value) VALUES ('chlorine_pou_max', '0.5');
GO

-- Water Quality Sections Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WaterQualitySections' AND xtype='U')
CREATE TABLE WaterQualitySections (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default sections
IF NOT EXISTS (SELECT 1 FROM WaterQualitySections WHERE name = 'Kitchen')
    INSERT INTO WaterQualitySections (name) VALUES ('Kitchen');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySections WHERE name = 'Production Area')
    INSERT INTO WaterQualitySections (name) VALUES ('Production Area');
IF NOT EXISTS (SELECT 1 FROM WaterQualitySections WHERE name = 'Storage Tank')
    INSERT INTO WaterQualitySections (name) VALUES ('Storage Tank');
GO

PRINT 'Water Quality Monitoring tables created successfully';
GO
