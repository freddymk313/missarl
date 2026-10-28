-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core relational schema for MIS SARL Business Management System
-- Database: Neon PostgreSQL
-- ============================================================================

-- Ensure pgcrypto extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. Schema Migrations Tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 1. Users and Authentication
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'PRICE_COLLECTOR')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Active server session tokens (for secure cookie session validation & invalidation)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ----------------------------------------------------------------------------
-- 2. Clients
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(100),
    billing_address TEXT,
    delivery_address TEXT,
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100) DEFAULT '30_DAYS',
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- Dedicated sequence counter per client per year (concurrency-safe quotation numbering)
CREATE TABLE IF NOT EXISTS client_quotation_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_year_seq UNIQUE (client_id, year)
);

CREATE INDEX IF NOT EXISTS idx_client_seq_client_year ON client_quotation_sequences(client_id, year);

-- ----------------------------------------------------------------------------
-- 3. Suppliers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    contact_person VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(100),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ----------------------------------------------------------------------------
-- 4. Article Catalogue and Prices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_ref VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    min_stock_level NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku_ref);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_brand ON items(brand);
CREATE INDEX IF NOT EXISTS idx_items_supplier_id ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);

-- ----------------------------------------------------------------------------
-- 5. Quotations and Proforma Invoices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('QUOTATION', 'PROFORMA')),
    client_rfq_number VARCHAR(100),
    internal_reference VARCHAR(100) NOT NULL,
    sequence_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    document_date DATE NOT NULL DEFAULT CURRENT_DATE,
    validity_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'VALIDATED', 'EXPIRED', 'REJECTED', 'CANCELLED')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 16.00 CHECK (vat_rate >= 0),
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (vat_amount >= 0),
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    payment_terms TEXT,
    delivery_lead_time TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quotation_client_ref UNIQUE (client_id, internal_reference),
    CONSTRAINT uq_quotation_client_id UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_internal_ref ON quotations(internal_reference);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_doc_type ON quotations(doc_type);
CREATE INDEX IF NOT EXISTS idx_quotations_document_date ON quotations(document_date);

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    line_number INTEGER NOT NULL,
    description_snapshot TEXT NOT NULL,
    unit_snapshot VARCHAR(50) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price_snapshot NUMERIC(15, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    line_subtotal NUMERIC(15, 2) NOT NULL CHECK (line_subtotal >= 0),
    CONSTRAINT uq_quotation_line UNIQUE (quotation_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_id ON quotation_items(item_id);

-- ----------------------------------------------------------------------------
-- 6. Customer Purchase Orders (PO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    quotation_id UUID NOT NULL,
    client_po_number VARCHAR(100) NOT NULL,
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 16.00 CHECK (vat_rate >= 0),
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (vat_amount >= 0),
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    notes TEXT,
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_quotation_client FOREIGN KEY (quotation_id, client_id) REFERENCES quotations(id, client_id),
    CONSTRAINT uq_order_client_id UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_po_date ON orders(po_date);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    quotation_item_id UUID REFERENCES quotation_items(id) ON DELETE SET NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    line_number INTEGER NOT NULL,
    description_snapshot TEXT NOT NULL,
    unit_snapshot VARCHAR(50) NOT NULL,
    quantity_ordered NUMERIC(12, 2) NOT NULL CHECK (quantity_ordered > 0),
    quantity_delivered NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_delivered >= 0),
    unit_price_snapshot NUMERIC(15, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    line_subtotal NUMERIC(15, 2) NOT NULL CHECK (line_subtotal >= 0),
    CONSTRAINT uq_order_line UNIQUE (order_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);

-- ----------------------------------------------------------------------------
-- 7. Sales Invoices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    order_id UUID,
    quotation_id UUID,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 16.00 CHECK (vat_rate >= 0),
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (vat_amount >= 0),
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance_due >= 0),
    payment_terms TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_invoice_order_client FOREIGN KEY (order_id, client_id) REFERENCES orders(id, client_id),
    CONSTRAINT fk_invoice_quotation_client FOREIGN KEY (quotation_id, client_id) REFERENCES quotations(id, client_id),
    CONSTRAINT uq_invoice_client_id UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    line_number INTEGER NOT NULL,
    description_snapshot TEXT NOT NULL,
    unit_snapshot VARCHAR(50) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price_snapshot NUMERIC(15, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    line_subtotal NUMERIC(15, 2) NOT NULL CHECK (line_subtotal >= 0),
    CONSTRAINT uq_invoice_line UNIQUE (invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items(item_id);

-- ----------------------------------------------------------------------------
-- 8. Delivery Notes (Bon de Livraison - BL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bl_number VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    carrier_name VARCHAR(150),
    driver_name VARCHAR(150),
    vehicle_plate VARCHAR(50),
    receiver_name VARCHAR(150),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PREPARED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
    notes TEXT,
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_bl_order_client FOREIGN KEY (order_id, client_id) REFERENCES orders(id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_client_id ON delivery_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_order_id ON delivery_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_delivery_date ON delivery_notes(delivery_date);

CREATE TABLE IF NOT EXISTS delivery_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE RESTRICT,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    line_number INTEGER NOT NULL,
    description_snapshot TEXT NOT NULL,
    unit_snapshot VARCHAR(50) NOT NULL,
    quantity_delivered NUMERIC(12, 2) NOT NULL CHECK (quantity_delivered > 0),
    CONSTRAINT uq_bl_line UNIQUE (delivery_note_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_bl_id ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_item_id ON delivery_note_items(item_id);

-- ----------------------------------------------------------------------------
-- 9. Payments and Multi-Invoice Allocations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    unallocated_amount NUMERIC(15, 2) NOT NULL CHECK (unallocated_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'CHECK', 'CASH', 'MOBILE_MONEY', 'OTHER')),
    reference_number VARCHAR(100) NOT NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('RECORDED', 'RECONCILED', 'CANCELLED')),
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_client_id UNIQUE (id, client_id),
    CONSTRAINT uq_client_reference_number UNIQUE (client_id, reference_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    client_id UUID NOT NULL,
    allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount > 0),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_alloc_payment_client FOREIGN KEY (payment_id, client_id) REFERENCES payments(id, client_id),
    CONSTRAINT fk_alloc_invoice_client FOREIGN KEY (invoice_id, client_id) REFERENCES invoices(id, client_id),
    CONSTRAINT uq_payment_invoice_alloc UNIQUE (payment_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_invoice_id ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_allocations_client_id ON payment_allocations(client_id);

-- ----------------------------------------------------------------------------
-- 10. Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- 11. Document Generation Metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('QUOTATION', 'PROFORMA', 'ORDER', 'INVOICE', 'DELIVERY_NOTE', 'STATEMENT')),
    record_id UUID NOT NULL,
    template_id VARCHAR(255),
    sheet_url TEXT,
    pdf_url TEXT,
    generation_status VARCHAR(50) NOT NULL CHECK (generation_status IN ('PENDING', 'GENERATED', 'FAILED', 'MODIFIED')),
    is_manually_modified BOOLEAN NOT NULL DEFAULT FALSE,
    manual_notes TEXT,
    exported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_regenerated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_document_exports_record ON document_exports(doc_type, record_id);
CREATE INDEX IF NOT EXISTS idx_document_exports_status ON document_exports(generation_status);
