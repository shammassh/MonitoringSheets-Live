-- ATP Monitoring Sheet Module Schema
-- Created: January 2026

USE FSMonitoringDB_UAT;
GO

-- ATP Readings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ATPReadings' AND xtype='U')
CREATE TABLE ATPReadings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) NOT NULL UNIQUE,
    log_date DATE NOT NULL,
    branch NVARCHAR(255) NOT NULL,
    section NVARCHAR(255) NOT NULL,
    equipment_packaging NVARCHAR(255) NOT NULL,
    result_value DECIMAL(10,2) NOT NULL,
    result_status NVARCHAR(20) DEFAULT 'Pass',
    corrective_action NVARCHAR(1000),
    filled_by NVARCHAR(255),
    verified BIT DEFAULT 0,
    verified_by NVARCHAR(255),
    verified_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- ATP Settings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ATPSettings' AND xtype='U')
CREATE TABLE ATPSettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(500),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default settings (reference values)
IF NOT EXISTS (SELECT 1 FROM ATPSettings WHERE setting_key = 'acceptable_max')
    INSERT INTO ATPSettings (setting_key, setting_value) VALUES ('acceptable_max', '30');
GO

-- ATP Sections Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ATPSections' AND xtype='U')
CREATE TABLE ATPSections (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- ATP Equipment/Packaging Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ATPEquipment' AND xtype='U')
CREATE TABLE ATPEquipment (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default sections
IF NOT EXISTS (SELECT 1 FROM ATPSections WHERE name = 'Kitchen')
    INSERT INTO ATPSections (name) VALUES ('Kitchen');
IF NOT EXISTS (SELECT 1 FROM ATPSections WHERE name = 'Production')
    INSERT INTO ATPSections (name) VALUES ('Production');
IF NOT EXISTS (SELECT 1 FROM ATPSections WHERE name = 'Storage')
    INSERT INTO ATPSections (name) VALUES ('Storage');
GO

-- Insert default equipment/packaging items
IF NOT EXISTS (SELECT 1 FROM ATPEquipment WHERE name = 'Cutting Board')
    INSERT INTO ATPEquipment (name) VALUES ('Cutting Board');
IF NOT EXISTS (SELECT 1 FROM ATPEquipment WHERE name = 'Food Container')
    INSERT INTO ATPEquipment (name) VALUES ('Food Container');
IF NOT EXISTS (SELECT 1 FROM ATPEquipment WHERE name = 'Work Surface')
    INSERT INTO ATPEquipment (name) VALUES ('Work Surface');
IF NOT EXISTS (SELECT 1 FROM ATPEquipment WHERE name = 'Utensils')
    INSERT INTO ATPEquipment (name) VALUES ('Utensils');
GO

PRINT 'ATP Monitoring tables created successfully';
GO
