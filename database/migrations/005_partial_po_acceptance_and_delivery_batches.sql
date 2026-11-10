-- ============================================================================
-- Migration: 005_partial_po_acceptance_and_delivery_batches.sql
-- Description: Partial Customer PO Acceptance, Partial Deliveries & Invoicing
-- Database: Neon PostgreSQL
-- Run AFTER 001, 002, 003, and 004.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Order Items: Snapshots for Brand and Discount
-- ----------------------------------------------------------------------------
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand_snapshot VARCHAR(100);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_percent_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent_snapshot >= 0 AND discount_percent_snapshot <= 100);

-- Backfill discount_percent_snapshot from quotation_items where available
UPDATE order_items oi
SET discount_percent_snapshot = COALESCE(qi.discount_percent, 0.00),
    brand_snapshot = COALESCE(oi.brand_snapshot, it.brand)
FROM quotation_items qi
LEFT JOIN items it ON qi.item_id = it.id
WHERE oi.quotation_item_id = qi.id;

-- ----------------------------------------------------------------------------
-- 2. Invoice Items: Snapshots for Brand and Discount
-- ----------------------------------------------------------------------------
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS brand_snapshot VARCHAR(100);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_percent_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent_snapshot >= 0 AND discount_percent_snapshot <= 100);

-- Backfill discount_percent_snapshot from order_items where available
UPDATE invoice_items ii
SET discount_percent_snapshot = COALESCE(oi.discount_percent_snapshot, 0.00),
    brand_snapshot = COALESCE(ii.brand_snapshot, oi.brand_snapshot)
FROM order_items oi
WHERE ii.order_item_id = oi.id;

-- ----------------------------------------------------------------------------
-- 3. Delivery Note Items: Observation Snapshot
-- ----------------------------------------------------------------------------
ALTER TABLE delivery_note_items ADD COLUMN IF NOT EXISTS observation_snapshot TEXT;

-- ----------------------------------------------------------------------------
-- 4. Delivery Notes: Safe Partial Unique Index on invoice_id
-- ----------------------------------------------------------------------------
-- Ensures one delivery note is associated with at most one invoice when not null
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_notes_invoice_id
ON delivery_notes(invoice_id)
WHERE invoice_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Document Numbering Counters (Concurrency-Safe Sequences)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_counters (
    doc_type VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    current_val INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (doc_type, year)
);

-- Seed initial counters from existing counts
INSERT INTO document_counters (doc_type, year, current_val)
SELECT 'INVOICE', EXTRACT(YEAR FROM CURRENT_DATE)::int, COALESCE((SELECT COUNT(*)::int FROM invoices WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)
ON CONFLICT (doc_type, year) DO NOTHING;

INSERT INTO document_counters (doc_type, year, current_val)
SELECT 'DELIVERY_NOTE', EXTRACT(YEAR FROM CURRENT_DATE)::int, COALESCE((SELECT COUNT(*)::int FROM delivery_notes WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)
ON CONFLICT (doc_type, year) DO NOTHING;

INSERT INTO document_counters (doc_type, year, current_val)
SELECT 'ORDER', EXTRACT(YEAR FROM CURRENT_DATE)::int, COALESCE((SELECT COUNT(*)::int FROM orders WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)
ON CONFLICT (doc_type, year) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Record this migration in schema_migrations
-- ----------------------------------------------------------------------------
INSERT INTO schema_migrations (version, name)
VALUES ('005', '005_partial_po_acceptance_and_delivery_batches')
ON CONFLICT (version) DO NOTHING;
