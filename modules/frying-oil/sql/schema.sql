-- Frying Oil Verification Module Schema
-- Database: FSMonitoringDB_UAT

-- Oil References Table (equipment/fryers to monitor)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OilReferences')
BEGIN
    CREATE TABLE OilReferences (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        reference NVARCHAR(500),
        frequency NVARCHAR(50) NOT NULL,
        is_active BIT DEFAULT 1,
        last_test_date DATE NULL,
        next_due_date DATE NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Oil Test Sessions Table (one per submission)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OilTestSessions')
BEGIN
    CREATE TABLE OilTestSessions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        test_date DATE NOT NULL,
        document_number NVARCHAR(50) NOT NULL,
        tested_by NVARCHAR(200),
        verified BIT DEFAULT 0,
        verified_by NVARCHAR(200),
        verified_at DATETIME,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        updated_by NVARCHAR(200)
    );
END
GO

-- Oil Test Records Table (individual test entries)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OilTestRecords')
BEGIN
    CREATE TABLE OilTestRecords (
        id INT IDENTITY(1,1) PRIMARY KEY,
        session_id INT NOT NULL FOREIGN KEY REFERENCES OilTestSessions(id),
        reference_id INT NOT NULL FOREIGN KEY REFERENCES OilReferences(id),
        tested_value NVARCHAR(50),
        status NVARCHAR(20),
        remarks NVARCHAR(500),
        corrective_action NVARCHAR(500),
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Oil Settings Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OilSettings')
BEGIN
    CREATE TABLE OilSettings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        setting_key NVARCHAR(100) NOT NULL UNIQUE,
        setting_value NVARCHAR(500),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    
    -- Default settings
    INSERT INTO OilSettings (setting_key, setting_value) VALUES ('document_prefix', 'OIL');
END
GO
