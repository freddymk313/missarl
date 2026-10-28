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

-- 2. Sample Suppliers
INSERT INTO suppliers (id, code, name, country, contact_person, email, phone, address, notes, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'FOURN-ATL', 'Atlas Mining Supplies', 'Afrique du Sud', 'Johan Van Der Merwe', 'sales@atlasmining.co.za', '+27 11 892 4000', 'Boksburg, Johannesburg, RSA', 'Fournisseur d''équipements miniers lourds et pièces d''usure', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'FOURN-SCH', 'Schneider Electric Distribution RDC', 'RDC', 'Marc Kabongo', 'contact.rdc@se.com', '+243 81 700 8900', 'Kinshasa / Lubumbashi, RDC', 'Disjoncteurs industriels, variateurs et automatismes', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'FOURN-KAT', 'Katanga Industrial Piping SARL', 'RDC', 'Serge Ilunga', 'serge@katangapiping.cd', '+243 99 450 1122', 'Route Likasi, Lubumbashi', 'Tuyauterie PEHD, vannes papillon et raccords industriels', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. Sample Clients
INSERT INTO clients (id, code, name, contact_person, email, phone, billing_address, delivery_address, tax_id, payment_terms, currency, is_active)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'CLI-KCC', 'Kamoto Copper Company (KCC)', 'Directeur des Approvisionnements', 'procurement@kcc.cd', '+243 99 800 2000', 'Kamoto Mine, Kolwezi, Lualaba, RDC', 'Site KCC Magasin Central, Kolwezi', 'A09123456Z', '30_DAYS', 'USD', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'CLI-TFM', 'Tenke Fungurume Mining (TFM)', 'Service Achats & Contrats', 'purchasing@tfm.cd', '+243 82 500 3000', 'Fungurume, Lualaba, RDC', 'Mine Site, Fungurume Gate 3', 'A08765432Y', '30_DAYS', 'USD', TRUE),
    ('b0000000-0000-0000-0000-000000000003', 'CLI-MMG', 'MMG Kinsevere SARL', 'Responsable Logistique', 'kinsevere.procurement@mmg.com', '+243 97 100 4000', 'Site Minier Kinsevere, Haut-Katanga, RDC', 'Kinsevere Warehouse, Lubumbashi', 'A07654321X', '45_DAYS', 'USD', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. Sample Article Catalogue
INSERT INTO items (id, sku_ref, description, category, unit, brand, supplier_id, purchase_price, selling_price, currency, stock_quantity, min_stock_level, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'ROB-VAN-DN100', 'Vanne papillon PN16 DN100 avec réducteur manuel et volant', 'Plomberie & Robinetterie', 'Pce', 'KSB', 'a0000000-0000-0000-0000-000000000003', 185.00, 245.00, 'USD', 12.00, 3.00, TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'ELEC-DISJ-160A', 'Disjoncteur Compact NSX160F 3P 160A 36kA déclencheur TMD', 'Électromécanique', 'Pce', 'Schneider Electric', 'a0000000-0000-0000-0000-000000000002', 320.00, 420.00, 'USD', 6.00, 2.00, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'TUY-PEHD-110', 'Tube PEHD 100 PN16 diamètre extérieur 110mm (couronne de 50m)', 'Tuyauterie Industrielle', 'Rouleau', 'Plasson', 'a0000000-0000-0000-0000-000000000003', 450.00, 580.00, 'USD', 8.00, 2.00, TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'EPI-CASQ-VENT', 'Casque de sécurité ventilé avec harnais à crémaillère EN397', 'Sécurité & EPI', 'Pce', 'Delta Plus', NULL, 12.50, 18.00, 'USD', 80.00, 20.00, TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'MIN-POMP-GARN', 'Garniture mécanique simple pour pompe centrifuge Warman 6/4', 'Mines & Broyage', 'Kit', 'Weir Minerals', 'a0000000-0000-0000-0000-000000000001', 650.00, 890.00, 'USD', 4.00, 1.00, TRUE)
ON CONFLICT (sku_ref) DO NOTHING;
