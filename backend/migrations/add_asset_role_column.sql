-- Migration: Add role column to assets table
-- Purpose: Add role field to distinguish between input, output, and intermediate assets

-- Add the role column
ALTER TABLE assets ADD COLUMN role VARCHAR(50) NULL;

-- Add a check constraint to ensure valid role values
ALTER TABLE assets ADD CONSTRAINT check_asset_role 
    CHECK (role IS NULL OR role IN ('input', 'output', 'intermediate'));

-- Add an index on role for better query performance
CREATE INDEX idx_assets_role ON assets(role);

-- Optional: Set default roles based on existing patterns
-- UPDATE assets SET role = 'input' WHERE name LIKE '%Input%' OR name LIKE '%Credential%';
-- UPDATE assets SET role = 'output' WHERE name LIKE '%Output%' OR name LIKE '%Summary%' OR name LIKE '%Result%';
-- UPDATE assets SET role = 'intermediate' WHERE role IS NULL; 