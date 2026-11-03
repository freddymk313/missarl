-- ============================================================================
-- Migration: 004_supplier_pricing_and_quotation_snapshots.sql
-- Description: Supplier Pricing, Quoted Reference Prices, and Commercial Cost Snapshots
-- Database: Neon PostgreSQL
-- Run AFTER 001, 002, and 003.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Items: Reference quoted price in USD and Supplier VAT indicator
-- ----------------------------------------------------------------------------
-- Reference/latest quoted price in USD (indicative only, never overwrites quotation lines)
ALTER TABLE items ADD COLUMN IF NOT EXISTS quoted_price NUMERIC(18,4);

-- Indicates whether the supplier price associated with this item includes VAT
ALTER TABLE items ADD COLUMN IF NOT EXISTS vat_included BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure supply_price column exists (kept for backward compatibility)
ALTER TABLE items ADD COLUMN IF NOT EXISTS supply_price NUMERIC(18,4);

-- ----------------------------------------------------------------------------
-- 2. Supplier Offers: Extended commercial fields and constraints
-- ----------------------------------------------------------------------------
-- Explicit supply_price column (synced with unit_price)
ALTER TABLE supplier_offers ADD COLUMN IF NOT EXISTS supply_price NUMERIC(18,4);

-- Backfill supply_price from unit_price for existing offers
UPDATE supplier_offers
SET supply_price = unit_price
WHERE supply_price IS NULL AND unit_price IS NOT NULL;

-- Explicit currency column (synced with currency_code)
ALTER TABLE supplier_offers ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Backfill currency from currency_code
UPDATE supplier_offers
SET currency = currency_code
WHERE currency IS NULL AND currency_code IS NOT NULL;

-- Supplier VAT inclusion & rate
ALTER TABLE supplier_offers ADD COLUMN IF NOT EXISTS vat_included BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE supplier_offers ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT NULL;

-- Offer date (synced with quoted_on)
ALTER TABLE supplier_offers ADD COLUMN IF NOT EXISTS offer_date DATE DEFAULT CURRENT_DATE;

UPDATE supplier_offers
SET offer_date = quoted_on
WHERE offer_date IS NULL AND quoted_on IS NOT NULL;

-- Active status (synced with is_current)
ALTER TABLE supplier_offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE supplier_offers
SET is_active = is_current
WHERE is_active IS NULL AND is_current IS NOT NULL;

-- Safe constraints for supply_price and vat_rate
ALTER TABLE supplier_offers DROP CONSTRAINT IF EXISTS chk_supplier_offers_supply_price;
ALTER TABLE supplier_offers ADD CONSTRAINT chk_supplier_offers_supply_price CHECK (supply_price IS NULL OR supply_price >= 0);

ALTER TABLE supplier_offers DROP CONSTRAINT IF EXISTS chk_supplier_offers_vat_rate;
ALTER TABLE supplier_offers ADD CONSTRAINT chk_supplier_offers_vat_rate CHECK (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100));

-- ----------------------------------------------------------------------------
-- 3. Exchange Rates: Extended tracking & Initial configurable defaults
-- ----------------------------------------------------------------------------
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS source_note TEXT;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE exchange_rates
SET effective_from = effective_on
WHERE effective_from IS NULL AND effective_on IS NOT NULL;

UPDATE exchange_rates
SET source_note = note
WHERE source_note IS NULL AND note IS NOT NULL;

-- Seed / update initial exchange rates: USD = 1, CDF = 2250, ZAR = 16
-- rate_to_usd represents the value of 1 currency unit in USD (1 / N)
INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_on, effective_from, note, source_note, is_active)
VALUES ('USD', 1.00000000, CURRENT_DATE, CURRENT_DATE, 'Base currency, always 1', 'Base currency, always 1', TRUE)
ON CONFLICT (currency_code, effective_on) DO UPDATE
SET rate_to_usd = EXCLUDED.rate_to_usd,
    effective_from = EXCLUDED.effective_from,
    source_note = EXCLUDED.source_note,
    is_active = EXCLUDED.is_active;

INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_on, effective_from, note, source_note, is_active)
VALUES ('CDF', ROUND(1.0 / 2250.0, 8), CURRENT_DATE, CURRENT_DATE, 'Default rate: 1 USD = 2250 CDF', 'Default rate: 1 USD = 2250 CDF', TRUE)
ON CONFLICT (currency_code, effective_on) DO UPDATE
SET rate_to_usd = EXCLUDED.rate_to_usd,
    effective_from = EXCLUDED.effective_from,
    source_note = EXCLUDED.source_note,
    is_active = EXCLUDED.is_active;

INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_on, effective_from, note, source_note, is_active)
VALUES ('ZAR', ROUND(1.0 / 16.0, 8), CURRENT_DATE, CURRENT_DATE, 'Default rate: 1 USD = 16 ZAR', 'Default rate: 1 USD = 16 ZAR', TRUE)
ON CONFLICT (currency_code, effective_on) DO UPDATE
SET rate_to_usd = EXCLUDED.rate_to_usd,
    effective_from = EXCLUDED.effective_from,
    source_note = EXCLUDED.source_note,
    is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 4. Quotations: Default commission percentage
-- ----------------------------------------------------------------------------
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS default_commission_percent NUMERIC(7,4) NOT NULL DEFAULT 0.0000;

-- ----------------------------------------------------------------------------
-- 5. Quotation Items: Commercial calculation snapshots
-- ----------------------------------------------------------------------------
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS supplier_offer_id UUID REFERENCES supplier_offers(id) ON DELETE SET NULL;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS supplier_price_snapshot NUMERIC(18,4);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS supplier_currency_snapshot VARCHAR(10);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS supplier_vat_included_snapshot BOOLEAN;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS supplier_vat_rate_snapshot NUMERIC(5,2);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS exchange_rate_snapshot NUMERIC(18,8);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS base_cost_usd_snapshot NUMERIC(18,4);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS commission_percent_snapshot NUMERIC(7,4);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS commission_amount_snapshot NUMERIC(18,4);

-- Indexes for performance & integrity
CREATE INDEX IF NOT EXISTS idx_quotation_items_supplier_offer ON quotation_items(supplier_offer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_is_active ON supplier_offers(is_active);

-- ----------------------------------------------------------------------------
-- 6. Record this migration in schema_migrations
-- ----------------------------------------------------------------------------
INSERT INTO schema_migrations (version, name)
VALUES ('004', '004_supplier_pricing_and_quotation_snapshots')
ON CONFLICT (version) DO NOTHING;

