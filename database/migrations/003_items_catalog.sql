-- ============================================================================
-- Migration: 003_items_catalog.sql
-- Description: Rework items catalogue for MIS SARL buy-on-demand model.
--   • New tables: item_categories, brands, units, currencies, exchange_rates,
--     item_identifiers, supplier_offers
--   • Alter items: add designation, category_id, brand_id, mpn, unit_code,
--     specs; drop stock/price/supplier columns; add SKU sequence
--   • Full-text / trigram search support (pg_trgm)
-- Run AFTER 001 and 002.
-- ============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. Item Categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT UNIQUE NOT NULL,
    name_fr     TEXT NOT NULL,
    parent_id   UUID REFERENCES item_categories(id) ON DELETE SET NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed exactly six categories (idempotent)
INSERT INTO item_categories (code, name_fr, sort_order) VALUES
    ('PLUMBING',         'Plomberie industrielle',                                    1),
    ('HDPE_WELDING',     'Soudure et réseaux HDPE',                                  2),
    ('ELECTROMECH',      'Électromécanique et instrumentation',                       3),
    ('MINING_MACHINERY', 'Engins miniers : location et pièces de rechange',           4),
    ('CONSTRUCTION',     'Construction et matériaux',                                  5),
    ('TOOLS_PPE',        'Outillage et équipements de protection (EPI)',              6)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. Brands
-- ============================================================================
CREATE TABLE IF NOT EXISTS brands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    name_normalized TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_brands_name_normalized ON brands(name_normalized);

-- ============================================================================
-- 3. Units of Measure
-- ============================================================================
CREATE TABLE IF NOT EXISTS units (
    code        TEXT PRIMARY KEY,
    label_fr    TEXT NOT NULL,
    aliases     TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO units (code, label_fr, aliases) VALUES
    ('EA',   'Pièce',          ARRAY['NOS','PCE','PCS','PC','UN']),
    ('M',    'Mètre',          ARRAY[]::TEXT[]),
    ('KG',   'Kilogramme',     ARRAY[]::TEXT[]),
    ('L',    'Litre',          ARRAY[]::TEXT[]),
    ('SET',  'Ensemble',       ARRAY[]::TEXT[]),
    ('KIT',  'Kit',            ARRAY[]::TEXT[]),
    ('ROLL', 'Rouleau',        ARRAY[]::TEXT[]),
    ('BOX',  'Boîte/Carton',   ARRAY[]::TEXT[]),
    ('PAIR', 'Paire',          ARRAY[]::TEXT[])
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. Currencies and Exchange Rates
-- ============================================================================
CREATE TABLE IF NOT EXISTS currencies (
    code    TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    symbol  TEXT NOT NULL
);

INSERT INTO currencies (code, name, symbol) VALUES
    ('USD', 'US Dollar',          '$'),
    ('CDF', 'Franc Congolais',    'FC'),
    ('ZAR', 'Rand sud-africain',  'R')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS exchange_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code   TEXT NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    rate_to_usd     NUMERIC(18,8) NOT NULL CHECK (rate_to_usd > 0),
    effective_on    DATE NOT NULL DEFAULT CURRENT_DATE,
    note            TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_exchange_rate_currency_date UNIQUE (currency_code, effective_on)
);

-- Seed USD = 1 (idempotent)
INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_on, note)
VALUES ('USD', 1.00000000, CURRENT_DATE, 'Base currency, always 1')
ON CONFLICT (currency_code, effective_on) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective_on ON exchange_rates(effective_on DESC);

-- ============================================================================
-- 5. Items table – new columns and sequence
-- ============================================================================

-- SKU auto-generation sequence: MIS-000001
CREATE SEQUENCE IF NOT EXISTS items_sku_seq START 1;

-- New columns (idempotent via IF NOT EXISTS)
ALTER TABLE items ADD COLUMN IF NOT EXISTS designation           TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id          UUID REFERENCES item_categories(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS brand_id             UUID REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS manufacturer_part_number TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS mpn_normalized        TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS specs                 JSONB NOT NULL DEFAULT '{}';
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_code             TEXT REFERENCES units(code) ON DELETE SET NULL;

-- Update sku_ref default to use the sequence
ALTER TABLE items ALTER COLUMN sku_ref SET DEFAULT ('MIS-' || lpad(nextval('items_sku_seq')::text, 6, '0'));

-- Make legacy unit column nullable with default
ALTER TABLE items ALTER COLUMN unit DROP NOT NULL;
ALTER TABLE items ALTER COLUMN unit SET DEFAULT 'EA';

-- Drop legacy stock / price / supplier columns (old demo data; safe because of ON CONFLICT DO NOTHING seed)
ALTER TABLE items DROP COLUMN IF EXISTS stock_quantity;
ALTER TABLE items DROP COLUMN IF EXISTS min_stock_level;
ALTER TABLE items DROP COLUMN IF EXISTS purchase_price;
ALTER TABLE items DROP COLUMN IF EXISTS selling_price;
ALTER TABLE items DROP COLUMN IF EXISTS currency;
ALTER TABLE items DROP COLUMN IF EXISTS supplier_id;

-- Unique index: brand + normalized MPN (only when both are set)
CREATE UNIQUE INDEX IF NOT EXISTS uq_items_brand_mpn
    ON items(brand_id, mpn_normalized)
    WHERE brand_id IS NOT NULL AND mpn_normalized IS NOT NULL;

-- Trigram indexes for full-text fuzzy search
CREATE INDEX IF NOT EXISTS idx_items_designation_trgm
    ON items USING GIN (designation gin_trgm_ops)
    WHERE designation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_description_trgm
    ON items USING GIN (description gin_trgm_ops);

-- Btree indexes
CREATE INDEX IF NOT EXISTS idx_items_mpn_normalized   ON items(mpn_normalized) WHERE mpn_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_category_id      ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_brand_id         ON items(brand_id);
CREATE INDEX IF NOT EXISTS idx_items_unit_code        ON items(unit_code);

-- ============================================================================
-- 6. Item Identifiers (client codes, GTINs, alternate MPNs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_identifiers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id          UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    kind             TEXT NOT NULL CHECK (kind IN ('CLIENT_CODE', 'GTIN', 'ALT_MPN')),
    client_id        UUID REFERENCES clients(id) ON DELETE CASCADE,
    value            TEXT NOT NULL,
    value_normalized TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_identifier_kind_client_value UNIQUE (kind, client_id, value_normalized)
);

CREATE INDEX IF NOT EXISTS idx_item_identifiers_item_id         ON item_identifiers(item_id);
CREATE INDEX IF NOT EXISTS idx_item_identifiers_value_norm      ON item_identifiers(value_normalized);
CREATE INDEX IF NOT EXISTS idx_item_identifiers_client_id       ON item_identifiers(client_id);

-- ============================================================================
-- 7. Supplier Offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_offers (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id                     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    supplier_id                 UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_item_code          TEXT,
    supplier_item_code_normalized TEXT,
    currency_code               TEXT NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    unit_price                  NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    lead_time_days              INTEGER,
    min_order_qty               NUMERIC(12,3),
    quoted_on                   DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until                 DATE,
    is_current                  BOOLEAN NOT NULL DEFAULT TRUE,
    notes                       TEXT,
    created_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one current offer per (item, supplier)
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_offers_current
    ON supplier_offers(item_id, supplier_id)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_supplier_offers_item_id          ON supplier_offers(item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_supplier_id      ON supplier_offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_supplier_code    ON supplier_offers(supplier_item_code_normalized)
    WHERE supplier_item_code_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_offers_is_current       ON supplier_offers(is_current);

-- ============================================================================
-- 8. Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name)
VALUES ('003', '003_items_catalog')
ON CONFLICT (version) DO NOTHING;

