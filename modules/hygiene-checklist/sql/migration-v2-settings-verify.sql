-- =====================================================
-- Hygiene Checklist Module - Migration v2
-- Features: System Settings + Verify/Lock functionality
-- Run this on the LIVE database before deploying
-- =====================================================

-- =====================================================
-- 1. Create HygieneSettings table
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HygieneSettings')
BEGIN
    CREATE TABLE HygieneSettings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        setting_key NVARCHAR(100) NOT NULL UNIQUE,
        setting_value NVARCHAR(500),
        updated_by INT,
        updated_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created HygieneSettings table';
END
ELSE
BEGIN
    PRINT 'HygieneSettings table already exists';
END
GO

-- =====================================================
-- 2. Insert default settings (if not exists)
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM HygieneSettings WHERE setting_key = 'document_prefix')
    INSERT INTO HygieneSettings (setting_key, setting_value) VALUES ('document_prefix', 'HYG');

IF NOT EXISTS (SELECT 1 FROM HygieneSettings WHERE setting_key = 'document_title')
    INSERT INTO HygieneSettings (setting_key, setting_value) VALUES ('document_title', 'Employee Health and Hygiene Checklist');

IF NOT EXISTS (SELECT 1 FROM HygieneSettings WHERE setting_key = 'creation_date')
    INSERT INTO HygieneSettings (setting_key, setting_value) VALUES ('creation_date', '2026-01-15');

IF NOT EXISTS (SELECT 1 FROM HygieneSettings WHERE setting_key = 'last_revision_date')
    INSERT INTO HygieneSettings (setting_key, setting_value) VALUES ('last_revision_date', '2026-01-15');

IF NOT EXISTS (SELECT 1 FROM HygieneSettings WHERE setting_key = 'edition')
    INSERT INTO HygieneSettings (setting_key, setting_value) VALUES ('edition', '1.0');

IF NOT EXISTS (SELECT 1 FROM HygieneSettings WHERE setting_key = 'company_name')
    INSERT INTO HygieneSettings (setting_key, setting_value) VALUES ('company_name', 'GMRL Group');

PRINT 'Default settings inserted';
GO

-- =====================================================
-- 3. Add verified columns to HygieneChecklistSessions
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'verified')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD verified BIT DEFAULT 0;
    PRINT 'Added verified column';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'verified_by')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD verified_by INT NULL;
    PRINT 'Added verified_by column';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HygieneChecklistSessions') AND name = 'verified_at')
BEGIN
    ALTER TABLE HygieneChecklistSessions ADD verified_at DATETIME NULL;
    PRINT 'Added verified_at column';
END
GO

-- =====================================================
-- 4. Add foreign key for verified_by (if not exists)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_HygieneChecklistSessions_VerifiedBy')
BEGIN
    ALTER TABLE HygieneChecklistSessions 
    ADD CONSTRAINT FK_HygieneChecklistSessions_VerifiedBy 
    FOREIGN KEY (verified_by) REFERENCES Users(id);
    PRINT 'Added foreign key constraint';
END
GO

-- =====================================================
-- 5. Update NULL verified values to 0
-- =====================================================
UPDATE HygieneChecklistSessions SET verified = 0 WHERE verified IS NULL;
PRINT 'Updated NULL verified values to 0';
GO

-- =====================================================
-- Migration Complete
-- =====================================================
PRINT '';
PRINT '=====================================================';
PRINT 'Migration v2 completed successfully!';
PRINT 'You can now deploy the updated module files.';
PRINT '=====================================================';
GO
