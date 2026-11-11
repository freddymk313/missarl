-- ============================================================================
-- Migration: 006_invoice_normalized_number.sql
-- Description: Add optional normalized_invoice_number to invoices table
-- Requirements: Additive and backward-compatible. Preserves existing invoice_number.
-- ============================================================================

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS normalized_invoice_number VARCHAR(150) NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_normalized_number 
ON invoices(normalized_invoice_number);
