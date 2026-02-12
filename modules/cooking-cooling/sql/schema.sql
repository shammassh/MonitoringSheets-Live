-- Cooking and Cooling Temperature Monitoring Schema
-- Form 10: Track cooking and cooling temperatures

USE FSMonitoringDB_UAT;
GO

-- Main readings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CookingCoolingReadings' AND xtype='U')
BEGIN
    CREATE TABLE CookingCoolingReadings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        document_number NVARCHAR(50) NOT NULL,
        log_date DATE NOT NULL,
        product_name NVARCHAR(200) NOT NULL,
        cooking_core_temp DECIMAL(5,2) NOT NULL,
        cooking_status NVARCHAR(20) NOT NULL, -- 'Pass' or 'Fail'
        cooling_method NVARCHAR(100) NOT NULL,
        start_cooling_time TIME NOT NULL,
        start_cooling_temp DECIMAL(5,2) NOT NULL,
        time_after_1h TIME,
        temp_after_1h DECIMAL(5,2),
        time_after_1h30 TIME,
        temp_after_1h30 DECIMAL(5,2),
        time_after_2h TIME,
        temp_after_2h DECIMAL(5,2),
        cooling_status NVARCHAR(20) NOT NULL, -- 'Pass', 'Fail', 'Pending'
        corrective_action_cooking NVARCHAR(500),
        corrective_action_cooling NVARCHAR(500),
        comments NVARCHAR(500),
        filled_by NVARCHAR(100) NOT NULL,
        verified_by NVARCHAR(100),
        verified_at DATETIME,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'CookingCoolingReadings table created';
END
GO

-- Cooling methods lookup table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CookingCoolingMethods' AND xtype='U')
BEGIN
    CREATE TABLE CookingCoolingMethods (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
    
    -- Insert default cooling methods
    INSERT INTO CookingCoolingMethods (name) VALUES 
        ('Ice Bath'),
        ('Blast Chiller'),
        ('Cold Room'),
        ('Shallow Pan / Divide'),
        ('Cold Water Running'),
        ('Ice Paddle'),
        ('Refrigerator');
    PRINT 'CookingCoolingMethods table created with defaults';
END
GO

PRINT 'Cooking and Cooling Temperature Monitoring tables created successfully';
