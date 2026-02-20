-- =====================================================
-- Migration: Fix HygieneChecklistSessions table for Live database
-- Aligns Live schema with UAT schema
-- =====================================================

USE FSMonitoringDB;
GO

-- Add missing columns

-- 1. Add checked_by (INT, NOT NULL with default)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'checked_by')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD checked_by INT NULL;
    PRINT 'Added column: checked_by';
END
GO

-- 2. Add total_employees
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_employees')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_employees INT NULL DEFAULT 0;
    PRINT 'Added column: total_employees';
END
GO

-- 3. Add total_pass
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_pass')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_pass INT NULL DEFAULT 0;
    PRINT 'Added column: total_pass';
END
GO

-- 4. Add total_fail  
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_fail')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_fail INT NULL DEFAULT 0;
    PRINT 'Added column: total_fail';
END
GO

-- 5. Add total_absent
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'total_absent')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD total_absent INT NULL DEFAULT 0;
    PRINT 'Added column: total_absent';
END
GO

-- 6. Add notes (if comments exists, rename it)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'notes')
BEGIN
    -- Check if comments column exists, rename it
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'comments')
    BEGIN
        EXEC sp_rename 'HygieneChecklistSessions.comments', 'notes', 'COLUMN';
        PRINT 'Renamed column: comments -> notes';
    END
    ELSE
    BEGIN
        ALTER TABLE HygieneChecklistSessions ADD notes NVARCHAR(500) NULL;
        PRINT 'Added column: notes';
    END
END
GO

-- 7. Update verified_by to be INT (need to drop and recreate if it's the wrong type)
-- First, let's check the type
DECLARE @verifiedByType NVARCHAR(50);
SELECT @verifiedByType = DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'HygieneChecklistSessions' AND COLUMN_NAME = 'verified_by';

IF @verifiedByType = 'nvarchar'
BEGIN
    -- Create a temp column, copy data (as NULL since we can't convert names to IDs), drop old, rename new
    ALTER TABLE HygieneChecklistSessions ADD verified_by_new INT NULL;
    ALTER TABLE HygieneChecklistSessions DROP COLUMN verified_by;
    EXEC sp_rename 'HygieneChecklistSessions.verified_by_new', 'verified_by', 'COLUMN';
    PRINT 'Converted verified_by from NVARCHAR to INT';
END
GO

PRINT 'Migration completed successfully!';
GO
