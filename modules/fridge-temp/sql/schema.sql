-- Fridge Temperature Monitoring Schema
-- Form 11: Track fridge temperatures every 3 hours

USE FSMonitoringDB_UAT;
GO

-- Fridge Master Table (Reference)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Fridges' AND xtype='U')
BEGIN
    CREATE TABLE Fridges (
        id INT IDENTITY(1,1) PRIMARY KEY,
        fridge_name NVARCHAR(100) NOT NULL,
        section NVARCHAR(100) NOT NULL,
        min_temp DECIMAL(5,2) NOT NULL DEFAULT -22,
        max_temp DECIMAL(5,2) NOT NULL DEFAULT -18,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );

    -- Insert sample fridges
    INSERT INTO Fridges (fridge_name, section, min_temp, max_temp) VALUES
    ('Freezer 1', 'Kitchen', -22, -18),
    ('Freezer 2', 'Kitchen', -22, -18),
    ('Chiller 1', 'Kitchen', 0, 5),
    ('Chiller 2', 'Kitchen', 0, 5),
    ('Walk-in Freezer', 'Storage', -22, -18),
    ('Walk-in Chiller', 'Storage', 0, 5),
    ('Display Chiller', 'Front', 0, 5);
END
GO

-- Fridge Temperature Documents (One per day per section)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FridgeTempDocuments' AND xtype='U')
BEGIN
    CREATE TABLE FridgeTempDocuments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        document_number NVARCHAR(50) NOT NULL UNIQUE,
        log_date DATE NOT NULL,
        section NVARCHAR(100) NOT NULL,
        filled_by NVARCHAR(100) NOT NULL,
        status NVARCHAR(20) DEFAULT 'Active',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Fridge Temperature Readings (Each fridge per time slot)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FridgeTempReadings' AND xtype='U')
BEGIN
    CREATE TABLE FridgeTempReadings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        document_id INT NOT NULL,
        fridge_id INT NOT NULL,
        fridge_name NVARCHAR(100) NOT NULL,
        -- 8 time slots every 3 hours: 1AM, 4AM, 7AM, 10AM, 1PM, 4PM, 7PM, 10PM
        temp_01am DECIMAL(5,2) NULL,
        status_01am NVARCHAR(10) NULL,
        temp_04am DECIMAL(5,2) NULL,
        status_04am NVARCHAR(10) NULL,
        temp_07am DECIMAL(5,2) NULL,
        status_07am NVARCHAR(10) NULL,
        temp_10am DECIMAL(5,2) NULL,
        status_10am NVARCHAR(10) NULL,
        temp_01pm DECIMAL(5,2) NULL,
        status_01pm NVARCHAR(10) NULL,
        temp_04pm DECIMAL(5,2) NULL,
        status_04pm NVARCHAR(10) NULL,
        temp_07pm DECIMAL(5,2) NULL,
        status_07pm NVARCHAR(10) NULL,
        temp_10pm DECIMAL(5,2) NULL,
        status_10pm NVARCHAR(10) NULL,
        corrective_action NVARCHAR(500) NULL,
        FOREIGN KEY (document_id) REFERENCES FridgeTempDocuments(id),
        FOREIGN KEY (fridge_id) REFERENCES Fridges(id)
    );
END
GO

PRINT 'Fridge Temperature Monitoring schema created successfully';
