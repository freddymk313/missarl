-- ============================================================================
-- Migration: 002_seed_data.sql
-- Description: Safe development seed data for MIS SARL (Idempotent)
-- ============================================================================

-- 1. Initial Users (All default accounts have password: Password123!)
INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@missarl.com', '54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f', 'Directeur Général (Super Admin)', 'SUPER_ADMIN', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'commercial@missarl.com', '54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f', 'Agent Commercial (Admin)', 'ADMIN', TRUE),
    ('33333333-3333-3333-3333-333333333333', 'collecteur@missarl.com', '54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f', 'Collecteur de Prix', 'PRICE_COLLECTOR', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. Sample Clients
INSERT INTO clients (id, code, name, contact_person, email, phone, billing_address, delivery_address, tax_id, payment_terms, currency, is_active)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'CLI-KCC', 'Kamoto Copper Company (KCC)', 'Directeur des Approvisionnements', 'procurement@kcc.cd', '+243 99 800 2000', 'Kamoto Mine, Kolwezi, Lualaba, RDC', 'Site KCC Magasin Central, Kolwezi', 'A09123456Z', '30_DAYS', 'USD', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'CLI-TFM', 'Tenke Fungurume Mining (TFM)', 'Service Achats & Contrats', 'purchasing@tfm.cd', '+243 82 500 3000', 'Fungurume, Lualaba, RDC', 'Mine Site, Fungurume Gate 3', 'A08765432Y', '30_DAYS', 'USD', TRUE),
    ('b0000000-0000-0000-0000-000000000003', 'CLI-MMG', 'MMG Kinsevere SARL', 'Responsable Logistique', 'kinsevere.procurement@mmg.com', '+243 97 100 4000', 'Site Minier Kinsevere, Haut-Katanga, RDC', 'Kinsevere Warehouse, Lubumbashi', 'A07654321X', '45_DAYS', 'USD', TRUE)
ON CONFLICT (code) DO NOTHING;
