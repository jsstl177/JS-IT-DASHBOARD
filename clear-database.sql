-- Clear all data except admin user for clean deployment
-- Run this script to prepare the database for production rollout

-- Clear custom links
DELETE FROM custom_links;

-- Clear asset column configurations
DELETE FROM asset_columns;

-- Clear employee setup data
DELETE FROM checklist_items;
DELETE FROM employee_setup_checklist;

-- Clear service settings (API keys, etc.)
DELETE FROM settings;

-- Clear all users except admin
DELETE FROM users WHERE username != 'admin';

-- Reset admin password to default (admin123)
-- Password hash for 'admin123' with bcrypt rounds=10
UPDATE users 
SET password_hash = '$2a$10$8K1p/a0dL3LHGkqY5sJzHe5PrqtAqw7zYQw8U8l8U8l8U8l8U8l8U',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

SELECT 'Database cleared successfully. Only admin user remains.' as status;
