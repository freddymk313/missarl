-- ============================================================================
-- Migration: 007_quotation_brand_image_snapshots.sql
-- Description: Add optional quotation-line brand text and image URL snapshots
-- Requirements: Additive and backward-compatible. Does not alter historical totals or items.
-- ============================================================================

ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS brand_snapshot TEXT;

ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS brand_image_url_snapshot TEXT;

-- Backfill textual brand snapshots from the current items/brands relationship
-- for historical rows that do not yet have a saved brand_snapshot.
-- Never fabricate brand_image_url_snapshot values.
UPDATE quotation_items qi
SET brand_snapshot = COALESCE(b.name, NULLIF(TRIM(it.brand), ''))
FROM items it
LEFT JOIN brands b ON b.id = it.brand_id
WHERE qi.item_id = it.id
  AND qi.brand_snapshot IS NULL
  AND COALESCE(b.name, NULLIF(TRIM(it.brand), '')) IS NOT NULL;

INSERT INTO schema_migrations (version, name)
VALUES ('007', '007_quotation_brand_image_snapshots')
ON CONFLICT (version) DO NOTHING;
