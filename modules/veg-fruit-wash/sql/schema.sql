-- Vegetables & Fruits Washing and Disinfecting Monitoring Schema
-- Form 12: Track washing and disinfecting of vegetables and fruits

USE FSMonitoringDB_UAT;
GO

-- Vegetables & Fruits Master Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VegFruitItems' AND xtype='U')
BEGIN
    CREATE TABLE VegFruitItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        category NVARCHAR(50) NOT NULL DEFAULT 'Vegetable', -- Vegetable or Fruit
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );

    -- Insert sample items
    INSERT INTO VegFruitItems (name, category) VALUES
    ('Tomato', 'Vegetable'),
    ('Cucumber', 'Vegetable'),
    ('Lettuce', 'Vegetable'),
    ('Carrot', 'Vegetable'),
    ('Onion', 'Vegetable'),
    ('Pepper', 'Vegetable'),
    ('Cabbage', 'Vegetable'),
    ('Spinach', 'Vegetable'),
    ('Broccoli', 'Vegetable'),
    ('Cauliflower', 'Vegetable'),
    ('Apple', 'Fruit'),
    ('Orange', 'Fruit'),
    ('Banana', 'Fruit'),
    ('Grapes', 'Fruit'),
    ('Strawberry', 'Fruit'),
    ('Lemon', 'Fruit'),
    ('Mango', 'Fruit'),
    ('Watermelon', 'Fruit');
END
GO

-- Washing/Disinfecting Documents (One per check)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VegFruitWashDocuments' AND xtype='U')
BEGIN
    CREATE TABLE VegFruitWashDocuments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        document_number NVARCHAR(50) NOT NULL UNIQUE,
        log_date DATE NOT NULL,
        check_time NVARCHAR(10) NOT NULL,
        concentration NVARCHAR(50) NOT NULL,
        filled_by NVARCHAR(100) NOT NULL,
        comments NVARCHAR(500) NULL,
        status NVARCHAR(20) DEFAULT 'Active',
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Checked Items (Which veggies/fruits were checked)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VegFruitWashItems' AND xtype='U')
BEGIN
    CREATE TABLE VegFruitWashItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        document_id INT NOT NULL,
        item_id INT NOT NULL,
        item_name NVARCHAR(100) NOT NULL,
        is_checked BIT DEFAULT 1,
        FOREIGN KEY (document_id) REFERENCES VegFruitWashDocuments(id),
        FOREIGN KEY (item_id) REFERENCES VegFruitItems(id)
    );
END
GO

PRINT 'Vegetables & Fruits Washing Monitoring schema created successfully';
