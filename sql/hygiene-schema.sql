-- =====================================================
-- Employee Health & Hygiene Checklist Schema
-- =====================================================

USE FSMonitoringDB_UAT;
GO

-- =====================================================
-- Employees Table
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees')
BEGIN
    CREATE TABLE Employees (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        gender NVARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
        store_id INT NULL,
        position NVARCHAR(100) NULL,
        is_active BIT DEFAULT 1,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_Employees_StoreId ON Employees(store_id);
    CREATE INDEX IX_Employees_IsActive ON Employees(is_active);
    PRINT 'Created Employees table';
END
GO

-- =====================================================
-- Stores Table
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Stores')
BEGIN
    CREATE TABLE Stores (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        location NVARCHAR(200) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
    
    -- Insert default stores
    INSERT INTO Stores (name, location) VALUES 
        ('Store 1 - Dubai Mall', 'Dubai Mall, Dubai'),
        ('Store 2 - MOE', 'Mall of Emirates, Dubai'),
        ('Store 3 - Festival City', 'Dubai Festival City'),
        ('Store 4 - Marina Mall', 'Dubai Marina');
    
    PRINT 'Created Stores table with default data';
END
GO

-- =====================================================
-- Hygiene Checklist Items Table
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HygieneChecklistItems')
BEGIN
    CREATE TABLE HygieneChecklistItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        is_active BIT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    
    -- Insert default hygiene checklist items
    INSERT INTO HygieneChecklistItems (name, description, sort_order, created_by) VALUES 
        ('Covered And Tied Hair', 'Hair is properly covered with hairnet/cap and tied back', 1, 1),
        ('Protective Clothing', 'Wearing appropriate protective clothing (apron, gloves, etc.)', 2, 1),
        ('Clean Uniform', 'Uniform is clean and in good condition', 3, 1),
        ('Clean Short Nails', 'Nails are clean, short, and free of nail polish', 4, 1),
        ('Absence Of Uncovered Wounds', 'No uncovered wounds, cuts, or sores visible', 5, 1),
        ('No Sickness Symptoms', 'No visible signs of illness (coughing, sneezing, fever)', 6, 1),
        ('No Accessories', 'Not wearing jewelry, watches, or other accessories', 7, 1),
        ('Well Shaved', 'Facial hair is properly groomed or covered', 8, 1),
        ('Handwashing Procedure Followed', 'Follows proper handwashing procedures', 9, 1);
    
    PRINT 'Created HygieneChecklistItems table with default items';
END
GO

-- =====================================================
-- Hygiene Checklists Table (Header)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HygieneChecklists')
BEGIN
    CREATE TABLE HygieneChecklists (
        id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id INT NOT NULL,
        store_id INT NOT NULL,
        check_date DATE NOT NULL,
        check_time TIME NOT NULL,
        shift NVARCHAR(20) NULL, -- Morning, Afternoon, Evening
        checked_by INT NOT NULL,
        overall_pass BIT NULL,
        notes NVARCHAR(1000) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        
        FOREIGN KEY (employee_id) REFERENCES Employees(id),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (checked_by) REFERENCES Users(id)
    );
    
    CREATE INDEX IX_HygieneChecklists_EmployeeId ON HygieneChecklists(employee_id);
    CREATE INDEX IX_HygieneChecklists_StoreId ON HygieneChecklists(store_id);
    CREATE INDEX IX_HygieneChecklists_CheckDate ON HygieneChecklists(check_date);
    CREATE INDEX IX_HygieneChecklists_CheckedBy ON HygieneChecklists(checked_by);
    
    PRINT 'Created HygieneChecklists table';
END
GO

-- =====================================================
-- Hygiene Checklist Responses Table (Details)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HygieneChecklistResponses')
BEGIN
    CREATE TABLE HygieneChecklistResponses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        checklist_id INT NOT NULL,
        item_id INT NOT NULL,
        response BIT NOT NULL, -- true = Pass, false = Fail
        notes NVARCHAR(500) NULL,
        
        FOREIGN KEY (checklist_id) REFERENCES HygieneChecklists(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES HygieneChecklistItems(id)
    );
    
    CREATE INDEX IX_HygieneChecklistResponses_ChecklistId ON HygieneChecklistResponses(checklist_id);
    
    PRINT 'Created HygieneChecklistResponses table';
END
GO

PRINT '✅ Hygiene Checklist schema created successfully!';
GO
