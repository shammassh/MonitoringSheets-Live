-- Hot Holding Quality Control Checklist Schema
-- Form 8: Hot Holding Temperature Monitoring

USE FSMonitoringDB_UAT;
GO

-- Main readings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='HotHoldingReadings' AND xtype='U')
CREATE TABLE HotHoldingReadings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    document_number NVARCHAR(50) NOT NULL UNIQUE,
    log_date DATE NOT NULL,
    product NVARCHAR(200) NOT NULL,
    product_temp DECIMAL(5,2) NOT NULL,
    product_temp_status NVARCHAR(20) NOT NULL DEFAULT 'Pass',
    hot_holding_unit_temp DECIMAL(5,2) NOT NULL,
    unit_temp_status NVARCHAR(20) NOT NULL DEFAULT 'Pass',
    corrective_action_product NVARCHAR(500) NULL,
    corrective_action_unit NVARCHAR(500) NULL,
    correct_clear_shelf_life NVARCHAR(500) NULL,
    filled_by NVARCHAR(100) NOT NULL,
    verified BIT DEFAULT 0,
    verified_by NVARCHAR(100) NULL,
    verified_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Settings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='HotHoldingSettings' AND xtype='U')
CREATE TABLE HotHoldingSettings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    setting_key NVARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(500) NOT NULL,
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default settings
IF NOT EXISTS (SELECT 1 FROM HotHoldingSettings WHERE setting_key = 'product_temp_target')
    INSERT INTO HotHoldingSettings (setting_key, setting_value) VALUES ('product_temp_target', '63');

IF NOT EXISTS (SELECT 1 FROM HotHoldingSettings WHERE setting_key = 'product_temp_critical')
    INSERT INTO HotHoldingSettings (setting_key, setting_value) VALUES ('product_temp_critical', '60');

IF NOT EXISTS (SELECT 1 FROM HotHoldingSettings WHERE setting_key = 'unit_temp_target')
    INSERT INTO HotHoldingSettings (setting_key, setting_value) VALUES ('unit_temp_target', '70');
GO

-- Products table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='HotHoldingProducts' AND xtype='U')
CREATE TABLE HotHoldingProducts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Insert default products
IF NOT EXISTS (SELECT 1 FROM HotHoldingProducts WHERE name = 'Grilled Chicken')
    INSERT INTO HotHoldingProducts (name) VALUES ('Grilled Chicken');
IF NOT EXISTS (SELECT 1 FROM HotHoldingProducts WHERE name = 'Rice')
    INSERT INTO HotHoldingProducts (name) VALUES ('Rice');
IF NOT EXISTS (SELECT 1 FROM HotHoldingProducts WHERE name = 'Soup')
    INSERT INTO HotHoldingProducts (name) VALUES ('Soup');
IF NOT EXISTS (SELECT 1 FROM HotHoldingProducts WHERE name = 'Gravy')
    INSERT INTO HotHoldingProducts (name) VALUES ('Gravy');
IF NOT EXISTS (SELECT 1 FROM HotHoldingProducts WHERE name = 'Vegetables')
    INSERT INTO HotHoldingProducts (name) VALUES ('Vegetables');
GO

PRINT 'Hot Holding Quality Control tables created successfully';
GO
