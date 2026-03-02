-- =====================================================
-- Migration: Fix HygieneChecklistSessions schema
-- Issue: Old schema has checklist_id NOT NULL column
--        that the new code doesn't populate
-- Solution: Make checklist_id nullable or drop it
-- =====================================================

USE FSMonitoringDB;
GO

-- First, check if the problematic column exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'checklist_id')
BEGIN
    PRINT 'Found checklist_id column in HygieneChecklistSessions';
    
    -- Option 1: Make it nullable (safer, preserves existing data)
    -- Check if there's a foreign key constraint first
    DECLARE @constraintName NVARCHAR(200);
    
    SELECT @constraintName = name 
    FROM sys.foreign_keys 
    WHERE parent_object_id = OBJECT_ID('HygieneChecklistSessions') 
      AND COL_NAME(parent_object_id, parent_column_id) = 'checklist_id';
    
    IF @constraintName IS NOT NULL
    BEGIN
        PRINT 'Dropping foreign key constraint: ' + @constraintName;
        EXEC('ALTER TABLE HygieneChecklistSessions DROP CONSTRAINT ' + @constraintName);
    END
    
    -- Remove NOT NULL constraint by altering the column
    ALTER TABLE HygieneChecklistSessions ALTER COLUMN checklist_id INT NULL;
    PRINT 'Made checklist_id nullable';
    
    -- Option 2: If you want to completely remove the column (uncomment if needed):
    -- ALTER TABLE HygieneChecklistSessions DROP COLUMN checklist_id;
    -- PRINT 'Dropped checklist_id column';
END
ELSE
BEGIN
    PRINT 'checklist_id column not found - schema is already correct';
END
GO

-- Also ensure required columns exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'checked_by')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD checked_by INT NULL;
    PRINT 'Added column: checked_by';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_employees')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_employees INT DEFAULT 0;
    PRINT 'Added column: total_employees';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_pass')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_pass INT DEFAULT 0;
    PRINT 'Added column: total_pass';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_fail')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_fail INT DEFAULT 0;
    PRINT 'Added column: total_fail';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_absent')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_absent INT DEFAULT 0;
    PRINT 'Added column: total_absent';
END
GO

-- Also make sure HygieneChecklists has session_id column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklists') AND name = 'session_id')
BEGIN
    ALTER TABLE HygieneChecklists ADD session_id INT NULL;
    PRINT 'Added column: session_id to HygieneChecklists';
END
GO

-- Add is_absent column if missing
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklists') AND name = 'is_absent')
BEGIN
    ALTER TABLE HygieneChecklists ADD is_absent BIT DEFAULT 0;
    PRINT 'Added column: is_absent to HygieneChecklists';
END
GO

PRINT '';
PRINT '=====================================================';
PRINT 'Migration completed!';
PRINT 'The personal hygiene form should now work correctly.';
PRINT '=====================================================';
GO
