-- ============================================================================
-- Garden data snapshot — taken 2026-08-12, BEFORE the garden-map redesign.
-- Run this ONCE in the Supabase SQL Editor (project sjtlmvcxcffftsdleftf)
-- before any redesign migration touches the garden schema.
--
-- It copies every garden table into a timestamped *_bak_20260812 table in the
-- public schema. These snapshots are plain data copies (no RLS, no FKs), kept
-- purely for recovery. To restore a table:
--     INSERT INTO garden_plots SELECT * FROM garden_plots_bak_20260812;
-- To discard the snapshots later:
--     DROP TABLE garden_plots_bak_20260812;  -- etc.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS garden_plots_bak_20260812;
CREATE TABLE garden_plots_bak_20260812           AS SELECT * FROM garden_plots;

DROP TABLE IF EXISTS garden_zones_bak_20260812;
CREATE TABLE garden_zones_bak_20260812           AS SELECT * FROM garden_zones;

DROP TABLE IF EXISTS garden_cells_bak_20260812;
CREATE TABLE garden_cells_bak_20260812           AS SELECT * FROM garden_cells;

DROP TABLE IF EXISTS garden_plantings_bak_20260812;
CREATE TABLE garden_plantings_bak_20260812       AS SELECT * FROM garden_plantings;

DROP TABLE IF EXISTS garden_harvests_bak_20260812;
CREATE TABLE garden_harvests_bak_20260812        AS SELECT * FROM garden_harvests;

DROP TABLE IF EXISTS garden_amendments_bak_20260812;
CREATE TABLE garden_amendments_bak_20260812      AS SELECT * FROM garden_amendments;

DROP TABLE IF EXISTS garden_pest_logs_bak_20260812;
CREATE TABLE garden_pest_logs_bak_20260812       AS SELECT * FROM garden_pest_logs;

DROP TABLE IF EXISTS garden_seed_inventory_bak_20260812;
CREATE TABLE garden_seed_inventory_bak_20260812  AS SELECT * FROM garden_seed_inventory;

DROP TABLE IF EXISTS garden_journal_entries_bak_20260812;
CREATE TABLE garden_journal_entries_bak_20260812 AS SELECT * FROM garden_journal_entries;

DROP TABLE IF EXISTS garden_watering_logs_bak_20260812;
CREATE TABLE garden_watering_logs_bak_20260812   AS SELECT * FROM garden_watering_logs;

DROP TABLE IF EXISTS garden_weather_logs_bak_20260812;
CREATE TABLE garden_weather_logs_bak_20260812     AS SELECT * FROM garden_weather_logs;

COMMIT;

-- Verify row counts — originals should equal their snapshots.
SELECT 'garden_plots'           AS table, (SELECT count(*) FROM garden_plots)           AS original, (SELECT count(*) FROM garden_plots_bak_20260812)           AS backup
UNION ALL SELECT 'garden_zones',           (SELECT count(*) FROM garden_zones),           (SELECT count(*) FROM garden_zones_bak_20260812)
UNION ALL SELECT 'garden_cells',           (SELECT count(*) FROM garden_cells),           (SELECT count(*) FROM garden_cells_bak_20260812)
UNION ALL SELECT 'garden_plantings',       (SELECT count(*) FROM garden_plantings),       (SELECT count(*) FROM garden_plantings_bak_20260812)
UNION ALL SELECT 'garden_harvests',        (SELECT count(*) FROM garden_harvests),        (SELECT count(*) FROM garden_harvests_bak_20260812)
UNION ALL SELECT 'garden_amendments',      (SELECT count(*) FROM garden_amendments),      (SELECT count(*) FROM garden_amendments_bak_20260812)
UNION ALL SELECT 'garden_pest_logs',       (SELECT count(*) FROM garden_pest_logs),       (SELECT count(*) FROM garden_pest_logs_bak_20260812)
UNION ALL SELECT 'garden_seed_inventory',  (SELECT count(*) FROM garden_seed_inventory),  (SELECT count(*) FROM garden_seed_inventory_bak_20260812)
UNION ALL SELECT 'garden_journal_entries', (SELECT count(*) FROM garden_journal_entries), (SELECT count(*) FROM garden_journal_entries_bak_20260812)
UNION ALL SELECT 'garden_watering_logs',   (SELECT count(*) FROM garden_watering_logs),   (SELECT count(*) FROM garden_watering_logs_bak_20260812)
UNION ALL SELECT 'garden_weather_logs',    (SELECT count(*) FROM garden_weather_logs),    (SELECT count(*) FROM garden_weather_logs_bak_20260812);
