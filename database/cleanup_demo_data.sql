-- ============================================================================
-- cleanup_demo_data.sql
-- Removes ONLY the demo items and demo suppliers inserted by 002_seed_data.sql.
-- DO NOT RUN IN PRODUCTION unless you want to purge demo items and suppliers.
-- This does NOT drop any tables or schema objects.
-- ============================================================================

-- Order: child rows before parent rows to respect FK constraints.

-- 1. Quotation items linked to demo items
DELETE FROM quotation_items
WHERE item_id IN (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005'
);

-- 2. Order items linked to demo items
DELETE FROM order_items
WHERE item_id IN (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005'
);

-- 3. Invoice items linked to demo items
DELETE FROM invoice_items
WHERE item_id IN (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005'
);

-- 4. Supplier offers linked to demo items or demo suppliers
DELETE FROM supplier_offers
WHERE item_id IN (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005'
)
OR supplier_id IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
);

-- 5. Item identifiers linked to demo items
DELETE FROM item_identifiers
WHERE item_id IN (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005'
);

-- 6. Demo items
DELETE FROM items
WHERE id IN (
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005'
);

-- 7. Demo suppliers
DELETE FROM suppliers
WHERE id IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
);
