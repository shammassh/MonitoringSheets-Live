-- Dry Store Expiry Check Schema
-- Form 9: Dry Store Expiry Check Done

USE FSMonitoringDB_UAT;
GO

-- Main readings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreExpiryReadings' AND xtype='U')
CREATE TABLE DryStoreExpiryReadings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) NOT NULL UNIQUE,
    log_date DATE NOT NULL,
    branch NVARCHAR(200) NOT NULL,
    section NVARCHAR(200) NOT NULL,
    comments NVARCHAR(1000) NULL,
    image_path NVARCHAR(500) NULL,
    filled_by NVARCHAR(100) NOT NULL,
    overall_status NVARCHAR(20) NOT NULL DEFAULT 'OK',
    verified BIT DEFAULT 0,
    verified_by NVARCHAR(100) NULL,
    verified_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Products/Expiry items table (linked to readings)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreExpiryItems' AND xtype='U')
CREATE TABLE DryStoreExpiryItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    reading_id INT NOT NULL,
    product_name NVARCHAR(200) NOT NULL,
    expiry_date DATE NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'OK',
    FOREIGN KEY (reading_id) REFERENCES DryStoreExpiryReadings(id) ON DELETE CASCADE
);
GO

-- Sections table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DryStoreExpirySections' AND xtype='U')
CREATE TABLE DryStoreExpirySections (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default sections
IF NOT EXISTS (SELECT 1 FROM DryStoreExpirySections WHERE name = 'Dry Store Room 1')
    INSERT INTO DryStoreExpirySections (name) VALUES ('Dry Store Room 1');
IF NOT EXISTS (SELECT 1 FROM DryStoreExpirySections WHERE name = 'Dry Store Room 2')
    INSERT INTO DryStoreExpirySections (name) VALUES ('Dry Store Room 2');
IF NOT EXISTS (SELECT 1 FROM DryStoreExpirySections WHERE name = 'Pantry')
    INSERT INTO DryStoreExpirySections (name) VALUES ('Pantry');
IF NOT EXISTS (SELECT 1 FROM DryStoreExpirySections WHERE name = 'Storage Area')
    INSERT INTO DryStoreExpirySections (name) VALUES ('Storage Area');
GO

PRINT 'Dry Store Expiry Check tables created successfully';
GO
