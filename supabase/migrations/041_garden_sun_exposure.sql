-- Add sun exposure tracking to garden plots
ALTER TABLE garden_plots ADD COLUMN IF NOT EXISTS sun_exposure TEXT;
-- Valid values: 'full_sun', 'partial_sun', 'shade'
