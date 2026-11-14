// ============================================================================
// SQL Mock Dispatcher for AI Studio Preview
// Dispatches queries to in-memory MockDatabase when real DB is offline/unconfigured.
// ============================================================================

import {
  mockDb,
  MockClient,
  MockOrder,
  MockDeliveryNote,
  MockInvoice,
  MockQuotation,
} from "./mock-db";

export async function executeMockSql(
  queryText: string,
  values: unknown[]
): Promise<Record<string, unknown>[]> {
  const q = queryText.replace(/\s+/g, " ").trim();
  const lowerQ = q.toLowerCase();

  // 1. Database Health Check / Version
  if (lowerQ.includes("select version()")) {
    return [{ version: "PostgreSQL 16.2 (Mock / AI Studio In-Memory)" }];
  }

  // 2. Schema Migrations (Paramètres page)
  if (lowerQ.includes("from schema_migrations")) {
    return [
      { version: "001", name: "001_initial_schema.sql", applied_at: "2026-11-01T08:00:00Z" },
      { version: "002", name: "002_seed_data.sql", applied_at: "2026-11-01T08:00:00Z" },
      { version: "003", name: "003_items_catalog.sql", applied_at: "2026-11-02T08:00:00Z" },
      { version: "004", name: "004_supplier_pricing_and_quotation_snapshots.sql", applied_at: "2026-11-03T08:00:00Z" },
      { version: "005", name: "005_partial_po_acceptance_and_delivery_batches.sql", applied_at: "2026-11-09T08:00:00Z" },
      { version: "006", name: "006_invoice_normalized_number.sql", applied_at: "2026-11-11T08:00:00Z" },
    ];
  }

  // 3. Audit Logs
  if (lowerQ.startsWith("insert into audit_logs")) {
    const userId = (values[0] as string) || null;
    const action = (values[1] as string) || "UNKNOWN";
    const entityType = (values[2] as string) || "GENERAL";
    const entityId = (values[3] as string) || null;
    const details = (typeof values[4] === "string" ? JSON.parse(values[4]) : values[4]) as Record<string, unknown>;
    const ipAddress = (values[5] as string) || "127.0.0.1";

    const user = mockDb.users.find((u) => u.id === userId);
    mockDb.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
      user_full_name: user?.full_name || null,
      user_email: user?.email || null,
    });
    return [];
  }

  if (lowerQ.includes("from audit_logs")) {
    const limit = (typeof values[0] === "number" ? values[0] : 10);
    return mockDb.auditLogs.slice(0, limit).map((a) => ({
      id: a.id,
      userId: a.user_id,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      details: a.details,
      ipAddress: a.ip_address,
      createdAt: a.created_at,
      userFullName: a.user_full_name,
      userEmail: a.user_email,
    }));
  }

  // 4. Sessions (Authentication)
  if (lowerQ.startsWith("insert into sessions")) {
    const userId = values[0] as string;
    const tokenHash = values[1] as string;
    const ipAddress = (values[2] as string) || null;
    const userAgent = (values[3] as string) || null;
    const expiresAt = values[4] as string;

    mockDb.sessions.push({
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
    });
    return [];
  }

  if (lowerQ.includes("from sessions s join users u on s.user_id = u.id")) {
    const tokenHash = values[0] as string;
    const session = mockDb.sessions.find(
      (s) => s.token_hash === tokenHash && new Date(s.expires_at) > new Date()
    );
    if (!session) return [];

    const user = mockDb.users.find((u) => u.id === session.user_id && u.is_active);
    if (!user) return [];

    return [
      {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        expiresAt: session.expires_at,
      },
    ];
  }

  if (lowerQ.startsWith("delete from sessions where token_hash")) {
    const tokenHash = values[0] as string;
    mockDb.sessions = mockDb.sessions.filter((s) => s.token_hash !== tokenHash);
    return [];
  }

  // 5. Users
  if (lowerQ.includes("from users") && lowerQ.includes("lower(email) = lower(")) {
    const email = (values[0] as string)?.toLowerCase().trim();
    const user = mockDb.users.find((u) => u.email.toLowerCase() === email);
    if (!user) return [];
    return [
      {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    ];
  }

  if (lowerQ.includes("from users where id =")) {
    const id = values[0] as string;
    const user = mockDb.users.find((u) => u.id === id);
    if (!user) return [];
    return [
      {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    ];
  }

  if (lowerQ.includes("from users order by created_at desc")) {
    return mockDb.users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      isActive: u.is_active,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
  }

  if (lowerQ.startsWith("update users set last_login_at = now() where id =")) {
    const id = values[0] as string;
    const u = mockDb.users.find((user) => user.id === id);
    if (u) u.last_login_at = new Date().toISOString();
    return [];
  }

  if (lowerQ.startsWith("insert into users")) {
    const email = values[0] as string;
    const passwordHash = values[1] as string;
    const fullName = values[2] as string;
    const role = values[3] as string;
    const newUser = {
      id: `usr-${Date.now()}`,
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role,
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.users.unshift(newUser);
    return [
      {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        isActive: newUser.is_active,
        lastLoginAt: newUser.last_login_at,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      },
    ];
  }

  if (lowerQ.startsWith("update users set") && lowerQ.includes("password_hash =")) {
    const passwordHash = values[0] as string;
    const id = values[1] as string;
    const u = mockDb.users.find((user) => user.id === id);
    if (u) u.password_hash = passwordHash;
    return [];
  }

  if (lowerQ.startsWith("update users set") && lowerQ.includes("returning")) {
    const fullName = values[0] as string | null;
    const email = values[1] as string | null;
    const role = values[2] as string | null;
    const isActive = values[3] as boolean | null;
    const id = values[4] as string;
    const u = mockDb.users.find((user) => user.id === id);
    if (!u) return [];
    if (fullName) u.full_name = fullName;
    if (email) u.email = email;
    if (role) u.role = role;
    if (isActive !== null && isActive !== undefined) u.is_active = isActive;
    u.updated_at = new Date().toISOString();
    return [
      {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      },
    ];
  }

  if (lowerQ.startsWith("delete from users where id =")) {
    const id = values[0] as string;
    const idx = mockDb.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      mockDb.users.splice(idx, 1);
      return [{ id }];
    }
    return [];
  }

  if (lowerQ.startsWith("delete from items where id =")) {
    const id = values[0] as string;
    const idx = mockDb.items.findIndex((it) => it.id === id);
    if (idx !== -1) {
      mockDb.items.splice(idx, 1);
      return [{ id }];
    }
    return [];
  }

  // 6. Clients & Quotation Sequence
  if (lowerQ.includes("select sequence_val from quotation_sequences") || lowerQ.includes("client_quotation_sequences") || lowerQ.includes("quotation_sequence")) {
    const clientCode = (values[0] as string) || "CLI-KCC";
    const nextSeq = (mockDb.clientSequences[clientCode] || 88) + 1;
    mockDb.clientSequences[clientCode] = nextSeq;
    const ref = `${String(nextSeq).padStart(4, "0")}/026/MIS`;
    return [{ next_ref: ref, sequence_val: nextSeq }];
  }

  if (lowerQ.includes("from clients") && lowerQ.includes("where id =")) {
    const id = values[0] as string;
    const c = mockDb.clients.find((client) => client.id === id);
    if (!c) return [];
    return [
      {
        id: c.id,
        code: c.code,
        name: c.name,
        contactPerson: c.contact_person,
        email: c.email,
        phone: c.phone,
        billingAddress: c.billing_address,
        deliveryAddress: c.delivery_address,
        taxId: c.tax_id,
        paymentTerms: c.payment_terms,
        currency: c.currency,
        isActive: c.is_active,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    ];
  }

  if (lowerQ.includes("from clients")) {
    const search = values[0] ? String(values[0]).replace(/%/g, "").toLowerCase() : "";
    let filtered = mockDb.clients;
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.code.toLowerCase().includes(search) ||
          (c.contact_person && c.contact_person.toLowerCase().includes(search))
      );
    }
    return filtered.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      contactPerson: c.contact_person,
      email: c.email,
      phone: c.phone,
      billingAddress: c.billing_address,
      deliveryAddress: c.delivery_address,
      taxId: c.tax_id,
      paymentTerms: c.payment_terms,
      currency: c.currency,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  if (lowerQ.startsWith("insert into clients")) {
    const code = (values[0] as string).toUpperCase();
    const name = values[1] as string;
    const contactPerson = (values[2] as string) || null;
    const email = (values[3] as string) || null;
    const phone = (values[4] as string) || null;
    const billingAddress = (values[5] as string) || null;
    const deliveryAddress = (values[6] as string) || null;
    const taxId = (values[7] as string) || null;
    const paymentTerms = (values[8] as string) || "30_DAYS";
    const currency = (values[9] as string) || "USD";

    const newClient: MockClient = {
      id: `client-${Date.now()}`,
      code,
      name,
      contact_person: contactPerson,
      email,
      phone,
      billing_address: billingAddress,
      delivery_address: deliveryAddress,
      tax_id: taxId,
      payment_terms: paymentTerms,
      currency,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.clients.push(newClient);
    return [
      {
        id: newClient.id,
        code: newClient.code,
        name: newClient.name,
        contactPerson: newClient.contact_person,
        email: newClient.email,
        phone: newClient.phone,
        billingAddress: newClient.billing_address,
        deliveryAddress: newClient.delivery_address,
        taxId: newClient.tax_id,
        paymentTerms: newClient.payment_terms,
        currency: newClient.currency,
        isActive: newClient.is_active,
        createdAt: newClient.created_at,
        updatedAt: newClient.updated_at,
      },
    ];
  }

  // 7. Suppliers
  if (lowerQ.includes("from suppliers") && lowerQ.includes("where id =")) {
    const id = values[0] as string;
    const s = mockDb.suppliers.find((sup) => sup.id === id);
    if (!s) return [];
    return [
      {
        id: s.id,
        code: s.code,
        name: s.name,
        country: s.country,
        contactPerson: s.contact_person,
        email: s.email,
        phone: s.phone,
        address: s.address,
        notes: s.notes,
        isActive: s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      },
    ];
  }

  if (lowerQ.includes("from suppliers")) {
    const search = values[0] ? String(values[0]).replace(/%/g, "").toLowerCase() : "";
    let list = mockDb.suppliers;
    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.code.toLowerCase().includes(search) ||
          (s.country && s.country.toLowerCase().includes(search))
      );
    }
    return list.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      country: s.country,
      contactPerson: s.contact_person,
      email: s.email,
      phone: s.phone,
      address: s.address,
      notes: s.notes,
      isActive: s.is_active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  // 8. Items Catalog, Categories, Brands, Units, Exchange Rates
  if (lowerQ.includes("from item_categories")) {
    return mockDb.categories.map((c) => ({
      id: c.id,
      code: c.code,
      nameFr: c.name_fr,
      sortOrder: c.sort_order,
      isActive: c.is_active,
    }));
  }

  if (lowerQ.includes("from brands")) {
    return mockDb.brands.map((b) => ({
      id: b.id,
      name: b.name,
      nameNormalized: b.name_normalized,
    }));
  }

  if (lowerQ.includes("from units")) {
    return mockDb.units.map((u) => ({
      code: u.code,
      labelFr: u.label_fr,
      aliases: u.aliases,
    }));
  }

  if (lowerQ.includes("from currencies")) {
    return mockDb.currencies.map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
    }));
  }

  if (lowerQ.includes("from exchange_rates")) {
    return mockDb.exchangeRates.map((xr) => ({
      id: xr.id,
      currencyCode: xr.currency_code,
      currencyName: xr.currency_code,
      currencySymbol: xr.currency_code === "USD" ? "$" : xr.currency_code === "CDF" ? "FC" : "R",
      rateToUsd: xr.rate_to_usd,
      effectiveOn: xr.effective_on,
      note: xr.note,
      createdAt: xr.created_at,
    }));
  }

  if (lowerQ.includes("count(*)::int as total") && lowerQ.includes("from items")) {
    const activeItems = mockDb.items.filter((i) => i.is_active);
    const catCount = new Set(activeItems.map((i) => i.category_id)).size;
    return [{ total: activeItems.length, categories: catCount || 1 }];
  }

  if (lowerQ.includes("from items") && lowerQ.includes("where id =")) {
    const id = values[0] as string;
    const it = mockDb.items.find((item) => item.id === id);
    if (!it) return [];
    return [
      {
        id: it.id,
        sku: it.sku,
        designation: it.designation,
        categoryId: it.category_id,
        categoryCode: it.category_code || "ELECTROMECH",
        categoryName: it.category_name || "Électromécanique",
        brandId: it.brand_id,
        brandName: it.brand_name || "IFM Electronic",
        mpn: it.mpn,
        unitCode: it.unit_code,
        unitLabel: it.unit_label || "Pièce",
        specs: it.specs,
        notes: it.notes,
        isActive: it.is_active,
        createdAt: it.created_at,
        updatedAt: it.updated_at,
        bestOfferPrice: 150.0,
        bestOfferCurrency: "USD",
        bestOfferSupplierName: "IFM Electronic SA",
      },
    ];
  }

  if (lowerQ.includes("from items")) {
    const search = values[0] ? String(values[0]).replace(/%/g, "").toLowerCase() : "";
    let list = mockDb.items;
    if (search) {
      list = list.filter(
        (it) =>
          it.designation.toLowerCase().includes(search) ||
          it.sku.toLowerCase().includes(search) ||
          (it.mpn && it.mpn.toLowerCase().includes(search))
      );
    }
    return list.map((it) => ({
      id: it.id,
      sku: it.sku,
      designation: it.designation,
      categoryId: it.category_id,
      categoryCode: it.category_code || "ELECTROMECH",
      categoryName: it.category_name || "Électromécanique",
      brandId: it.brand_id,
      brandName: it.brand_name || "IFM Electronic",
      mpn: it.mpn,
      unitCode: it.unit_code,
      unitLabel: it.unit_label || "Pièce",
      specs: it.specs,
      notes: it.notes,
      isActive: it.is_active,
      createdAt: it.created_at,
      updatedAt: it.updated_at,
      bestOfferPrice: 150.0,
      bestOfferCurrency: "USD",
      bestOfferSupplierName: "IFM Electronic SA",
    }));
  }

  // 9. Quotations & Quotation Lines
  if (lowerQ.includes("from quotation_lines") && lowerQ.includes("where quotation_id =")) {
    const qId = values[0] as string;
    const lines = mockDb.quotationLines.filter((l) => l.quotation_id === qId);
    return lines.map((l) => ({
      id: l.id,
      quotationId: l.quotation_id,
      itemId: l.item_id,
      brand: l.brand,
      supplierOfferId: l.supplier_offer_id,
      lineNumber: l.line_number,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unit_price,
      discountPercent: l.discount_percent,
      lineSubtotal: l.line_subtotal,
      supplierPriceSnapshot: l.supplier_price_snapshot,
      supplierCurrencySnapshot: l.supplier_currency_snapshot,
      supplierVatIncludedSnapshot: l.supplier_vat_included_snapshot,
      supplierVatRateSnapshot: l.supplier_vat_rate_snapshot,
      exchangeRateSnapshot: l.exchange_rate_snapshot,
      baseCostUsdSnapshot: l.base_cost_usd_snapshot,
      commissionPercentSnapshot: l.commission_percent_snapshot,
      commissionAmountSnapshot: l.commission_amount_snapshot,
    }));
  }

  if (lowerQ.includes("from quotations") && lowerQ.includes("count(*)::int as total")) {
    const valid = mockDb.quotations.filter((q) => q.status === "VALIDATED").length;
    const totalAmount = mockDb.quotations.reduce((sum, q) => sum + (q.status !== "CANCELLED" ? q.total : 0), 0);
    return [{ total: mockDb.quotations.length, validated: valid, total_amount: totalAmount }];
  }

  if (lowerQ.includes("from quotations") && lowerQ.includes("where q.id =")) {
    const id = values[0] as string;
    const quote = mockDb.quotations.find((q) => q.id === id);
    if (!quote) return [];
    const client = mockDb.clients.find((c) => c.id === quote.client_id);
    const creator = mockDb.users.find((u) => u.id === quote.created_by);
    return [
      {
        id: quote.id,
        clientId: quote.client_id,
        clientCode: client?.code || "CLI-KCC",
        clientName: client?.name || "Kamoto Copper Company",
        docType: quote.doc_type,
        clientRfqNumber: quote.client_rfq_number,
        internalReference: quote.internal_reference,
        sequenceNumber: quote.sequence_number,
        year: quote.year,
        documentDate: quote.document_date,
        validityDate: quote.validity_date,
        status: quote.status,
        currency: quote.currency,
        defaultCommissionPercent: quote.default_commission_percent,
        subtotal: quote.subtotal,
        vatRate: quote.vat_rate,
        vatAmount: quote.vat_amount,
        total: quote.total,
        paymentTerms: quote.payment_terms,
        deliveryLeadTime: quote.delivery_lead_time,
        notes: quote.notes,
        createdByName: creator?.full_name || "Marc K.",
        createdAt: quote.created_at,
        updatedAt: quote.updated_at,
      },
    ];
  }

  if (lowerQ.startsWith("insert into quotations")) {
    const hasDefaultComm = lowerQ.includes("default_commission_percent");
    const newQuote: MockQuotation = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      client_id: values[0] as string,
      doc_type: (values[1] as "QUOTATION" | "PROFORMA") || "QUOTATION",
      client_rfq_number: (values[2] as string) || null,
      internal_reference: values[3] as string,
      sequence_number: Number(values[4]) || 1,
      year: Number(values[5]) || new Date().getFullYear(),
      document_date: new Date().toISOString().split("T")[0],
      validity_date: (values[6] as string) || new Date().toISOString().split("T")[0],
      status: "DRAFT",
      currency: "USD",
      default_commission_percent: hasDefaultComm ? Number(values[7] || 0) : 0,
      subtotal: Number(values[hasDefaultComm ? 8 : 7] || 0),
      vat_rate: Number(values[hasDefaultComm ? 9 : 8] || 16),
      vat_amount: Number(values[hasDefaultComm ? 10 : 9] || 0),
      total: Number(values[hasDefaultComm ? 11 : 10] || 0),
      payment_terms: (values[hasDefaultComm ? 12 : 11] as string) || null,
      delivery_lead_time: (values[hasDefaultComm ? 13 : 12] as string) || null,
      notes: (values[hasDefaultComm ? 14 : 13] as string) || null,
      rejection_reason: null,
      cancellation_reason: null,
      created_by: values[hasDefaultComm ? 15 : 14] as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.quotations.unshift(newQuote);
    return [{ id: newQuote.id }];
  }

  if (lowerQ.startsWith("update quotations set") && lowerQ.includes("cancellation_reason =")) {
    const status = values[0] as MockQuotation["status"];
    const reason = (values[1] as string | null) || null;
    const id = values[3] as string;
    const q = mockDb.quotations.find((qt) => qt.id === id);
    if (q) {
      q.status = status;
      if (reason !== null) q.cancellation_reason = reason;
      q.updated_at = new Date().toISOString();
    }
    return [];
  }

  if (lowerQ.startsWith("update quotations set")) {
    const hasDefaultComm = lowerQ.includes("default_commission_percent");
    const docType = (values[0] as "QUOTATION" | "PROFORMA" | null) || null;
    const clientRfq = (values[1] as string | null) || null;
    const validityDate = values[2] as string;
    const status = values[3] as MockQuotation["status"];
    let idx = 4;
    const defaultComm = hasDefaultComm ? Number(values[idx++] || 0) : undefined;
    const subtotal = Number(values[idx++]);
    const vatRate = Number(values[idx++]);
    const vatAmount = Number(values[idx++]);
    const total = Number(values[idx++]);
    const paymentTerms = (values[idx++] as string | null) || null;
    const deliveryLeadTime = (values[idx++] as string | null) || null;
    const notes = (values[idx++] as string | null) || null;
    idx++; // updated_by
    const quotationId = values[idx] as string;

    const q = mockDb.quotations.find((qt) => qt.id === quotationId);
    if (q) {
      if (docType) q.doc_type = docType;
      q.client_rfq_number = clientRfq;
      q.validity_date = validityDate;
      q.status = status;
      if (defaultComm !== undefined) q.default_commission_percent = defaultComm;
      q.subtotal = subtotal;
      q.vat_rate = vatRate;
      q.vat_amount = vatAmount;
      q.total = total;
      q.payment_terms = paymentTerms;
      q.delivery_lead_time = deliveryLeadTime;
      q.notes = notes;
      q.updated_at = new Date().toISOString();
    }
    return [];
  }

  if (lowerQ.startsWith("delete from quotation_items where quotation_id =")) {
    const quotationId = values[0] as string;
    mockDb.quotationLines = mockDb.quotationLines.filter(
      (l) => l.quotation_id !== quotationId
    );
    return [];
  }

  if (lowerQ.startsWith("insert into quotation_items")) {
    const hasBrandSnapshots = lowerQ.includes("brand_snapshot");
    const hasSupplierSnapshots = lowerQ.includes("supplier_offer_id");
    let idx = 0;
    const quotationId = values[idx++] as string;
    const itemId = (values[idx++] as string) || null;
    const lineNumber = Number(values[idx++]);
    const description = values[idx++] as string;
    const unit = values[idx++] as string;
    const quantity = Number(values[idx++]);
    const unitPrice = Number(values[idx++]);
    const discountPercent = Number(values[idx++] || 0);
    const lineSubtotal = Number(values[idx++]);
    const brand = hasBrandSnapshots ? ((values[idx++] as string | null) ?? null) : null;
    const brandImageUrl = hasBrandSnapshots ? ((values[idx++] as string | null) || null) : null;
    const supplierOfferId = hasSupplierSnapshots ? ((values[idx++] as string) || null) : null;
    const supplierPriceSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);
    const supplierCurrencySnapshot = hasSupplierSnapshots ? ((values[idx++] as string) || null) : null;
    const supplierVatIncludedSnapshot = hasSupplierSnapshots ? (values[idx++] as boolean | null) : null;
    const supplierVatRateSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);
    const exchangeRateSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);
    const baseCostUsdSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);
    const commissionPercentSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);
    const commissionAmountSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);

    const newLine = {
      id: `ql-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      quotation_id: quotationId,
      item_id: itemId,
      brand,
      brand_image_url_snapshot: brandImageUrl,
      supplier_offer_id: supplierOfferId,
      line_number: lineNumber,
      description,
      unit,
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      line_subtotal: lineSubtotal,
      supplier_price_snapshot: supplierPriceSnapshot,
      supplier_currency_snapshot: supplierCurrencySnapshot,
      supplier_vat_included_snapshot: supplierVatIncludedSnapshot,
      supplier_vat_rate_snapshot: supplierVatRateSnapshot,
      exchange_rate_snapshot: exchangeRateSnapshot,
      base_cost_usd_snapshot: baseCostUsdSnapshot,
      commission_percent_snapshot: commissionPercentSnapshot,
      commission_amount_snapshot: commissionAmountSnapshot,
    };
    mockDb.quotationLines.push(newLine);
    return [{ id: newLine.id }];
  }

  if (lowerQ.includes("from quotation_items")) {
    const quoteId = values[0] as string;
    return mockDb.quotationLines
      .filter((l) => l.quotation_id === quoteId)
      .sort((a, b) => a.line_number - b.line_number)
      .map((l) => {
        let resolvedBrand: string | null = l.brand;
        if (resolvedBrand === null && l.item_id) {
          const it = mockDb.items.find((item) => item.id === l.item_id);
          resolvedBrand = it?.brand_name?.trim() || null;
        } else if (resolvedBrand === "") {
          resolvedBrand = null;
        }
        return {
          id: l.id,
          itemId: l.item_id,
          brand: resolvedBrand,
          brandImageUrl: l.brand_image_url_snapshot ?? null,
          supplierOfferId: l.supplier_offer_id,
          lineNumber: l.line_number,
          description: l.description,
          unit: l.unit,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          discountPercent: l.discount_percent,
          lineSubtotal: l.line_subtotal,
          supplierPriceSnapshot: l.supplier_price_snapshot,
          supplierCurrencySnapshot: l.supplier_currency_snapshot,
          supplierVatIncludedSnapshot: l.supplier_vat_included_snapshot,
          supplierVatRateSnapshot: l.supplier_vat_rate_snapshot,
          exchangeRateSnapshot: l.exchange_rate_snapshot,
          baseCostUsdSnapshot: l.base_cost_usd_snapshot,
          commissionPercentSnapshot: l.commission_percent_snapshot,
          commissionAmountSnapshot: l.commission_amount_snapshot,
        };
      });
  }

  if (lowerQ.includes("from quotations")) {
    const statusParam = values.find((v) => typeof v === "string" && ["DRAFT", "SUBMITTED", "VALIDATED", "EXPIRED", "REJECTED", "CANCELLED"].includes(v as string)) as string | undefined;
    const list = statusParam
      ? mockDb.quotations.filter((q) => q.status === statusParam)
      : mockDb.quotations;

    const limitMatch = lowerQ.match(/limit (\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : list.length;
    return list.slice(0, limit).map((q) => {
      const client = mockDb.clients.find((c) => c.id === q.client_id);
      return {
        id: q.id,
        clientId: q.client_id,
        clientCode: client?.code,
        clientName: client?.name,
        docType: q.doc_type,
        clientRfqNumber: q.client_rfq_number,
        internalReference: q.internal_reference,
        documentDate: q.document_date,
        validityDate: q.validity_date,
        status: q.status,
        currency: q.currency,
        subtotal: q.subtotal,
        vatRate: q.vat_rate,
        vatAmount: q.vat_amount,
        total: q.total,
        createdAt: q.created_at,
      };
    });
  }

  // 9b. Document Counters (Concurrency-Safe Sequences)
  if (lowerQ.includes("document_counters")) {
    const docType = (values[0] as string) || "ORDER";
    const year = (values[1] as number) || new Date().getFullYear();
    const key = `${docType}_${year}`;
    const nextVal = (mockDb.documentCounters[key] || 0) + 1;
    mockDb.documentCounters[key] = nextVal;
    return [{ current_val: nextVal }];
  }

  // 10. Purchase Orders (Orders)
  if (lowerQ.startsWith("insert into orders")) {
    const newOrd = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_number: values[0] as string,
      client_id: values[1] as string,
      quotation_id: values[2] as string,
      client_po_number: values[3] as string,
      po_date: (values[4] as string) || new Date().toISOString().split("T")[0],
      expected_delivery_date: (values[5] as string) || null,
      status: "CONFIRMED" as const,
      currency: (values[7] as string) || "USD",
      subtotal: Number(values[8]),
      vat_rate: Number(values[9] || 16.0),
      vat_amount: Number(values[10]),
      total: Number(values[11]),
      notes: (values[12] as string) || null,
      cancellation_reason: null,
      created_by: values[13] as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.orders.unshift(newOrd);
    return [{ id: newOrd.id }];
  }

  if (lowerQ.startsWith("update orders set status =")) {
    const status = values[0] as MockOrder["status"];
    const reason = values[1] as string | null;
    const id = values[3] as string;
    const ord = mockDb.orders.find((o) => o.id === id);
    if (ord) {
      ord.status = status;
      if (reason) ord.cancellation_reason = reason;
      ord.updated_at = new Date().toISOString();
    }
    return [];
  }

  if (lowerQ.includes("from order_items") && (lowerQ.includes("order_id =") || lowerQ.includes("oi.order_id ="))) {
    const oId = values[0] as string;
    const items = mockDb.orderItems.filter((oi) => oi.order_id === oId);
    return items.map((oi) => ({
      id: oi.id,
      orderId: oi.order_id,
      quotationItemId: oi.quotation_item_id,
      itemId: oi.item_id,
      lineNumber: oi.line_number,
      description: oi.description_snapshot,
      unit: oi.unit_snapshot,
      brand: oi.brand_snapshot,
      discountPercent: oi.discount_percent_snapshot,
      quantityOrdered: oi.quantity_ordered,
      quantityDelivered: oi.quantity_delivered,
      unitPrice: oi.unit_price_snapshot,
      lineTotal: oi.line_subtotal,
    }));
  }

  if (lowerQ.startsWith("insert into order_items")) {
    const newOi = {
      id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_id: values[0] as string,
      quotation_item_id: (values[1] as string) || null,
      item_id: (values[2] as string) || null,
      line_number: Number(values[3]),
      description_snapshot: values[4] as string,
      unit_snapshot: values[5] as string,
      quantity_ordered: Number(values[6]),
      quantity_delivered: Number(values[7] || 0),
      unit_price_snapshot: Number(values[8]),
      line_subtotal: Number(values[9]),
      brand_snapshot: (values[10] as string) || null,
      discount_percent_snapshot: Number(values[11] || 0),
    };
    mockDb.orderItems.push(newOi);
    return [{ id: newOi.id }];
  }

  if (lowerQ.startsWith("update order_items set quantity_delivered =")) {
    const qty = Number(values[0]);
    const id = values[1] as string;
    const item = mockDb.orderItems.find((oi) => oi.id === id);
    if (item) item.quantity_delivered = qty;
    return [];
  }

  if (lowerQ.includes("from orders") && lowerQ.includes("count(*)::int as total")) {
    const active = mockDb.orders.filter((o) => o.status === "CONFIRMED" || o.status === "PARTIALLY_DELIVERED").length;
    const totalAmount = mockDb.orders.reduce((sum, o) => sum + (o.status !== "CANCELLED" ? o.total : 0), 0);
    return [{ total: mockDb.orders.length, active, total_amount: totalAmount }];
  }

  if (lowerQ.includes("from orders") && lowerQ.includes("where o.id =")) {
    const id = values[0] as string;
    const o = mockDb.orders.find((ord) => ord.id === id);
    if (!o) return [];
    const client = mockDb.clients.find((c) => c.id === o.client_id);
    const quote = mockDb.quotations.find((q) => q.id === o.quotation_id);
    return [{
      id: o.id,
      orderNumber: o.order_number,
      clientId: o.client_id,
      clientCode: client?.code,
      clientName: client?.name,
      clientEmail: client?.email,
      clientPhone: client?.phone,
      quotationId: o.quotation_id,
      quotationReference: quote?.internal_reference,
      clientRfqNumber: quote?.client_rfq_number,
      clientPoNumber: o.client_po_number,
      poDate: o.po_date,
      expectedDeliveryDate: o.expected_delivery_date,
      status: o.status,
      currency: o.currency,
      subtotal: o.subtotal,
      vatRate: o.vat_rate,
      vatAmount: o.vat_amount,
      total: o.total,
      notes: o.notes,
      cancellationReason: o.cancellation_reason,
      createdBy: o.created_by,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }];
  }

  if (lowerQ.includes("from orders where quotation_id =")) {
    const qId = values[0] as string;
    return mockDb.orders
      .filter((o) => o.quotation_id === qId)
      .slice(0, 1)
      .map((o) => ({ id: o.id }));
  }

  if (lowerQ.includes("from orders")) {
    return mockDb.orders.map((o) => {
      const client = mockDb.clients.find((c) => c.id === o.client_id);
      const quote = mockDb.quotations.find((q) => q.id === o.quotation_id);
      return {
        id: o.id,
        orderNumber: o.order_number,
        clientId: o.client_id,
        clientCode: client?.code,
        clientName: client?.name,
        quotationId: o.quotation_id,
        quotationReference: quote?.internal_reference,
        clientPoNumber: o.client_po_number,
        poDate: o.po_date,
        expectedDeliveryDate: o.expected_delivery_date,
        status: o.status,
        currency: o.currency,
        subtotal: o.subtotal,
        vatRate: o.vat_rate,
        vatAmount: o.vat_amount,
        total: o.total,
        notes: o.notes,
        createdAt: o.created_at,
      };
    });
  }

  // 11. Delivery Notes (Bons de Livraison)
  if (
    lowerQ.includes("from delivery_note_items") &&
    (lowerQ.includes("delivery_note_id =") || lowerQ.includes("dni.delivery_note_id =")) &&
    !lowerQ.includes("group by")
  ) {
    const blId = values[0] as string;
    return mockDb.deliveryNoteItems.filter((i) => i.delivery_note_id === blId).map((i) => ({
      id: i.id,
      deliveryNoteId: i.delivery_note_id,
      orderItemId: i.order_item_id,
      itemId: i.item_id,
      lineNumber: i.line_number,
      description: i.description_snapshot,
      unit: i.unit_snapshot,
      brand: (i as unknown as Record<string, unknown>).brand_snapshot as string || null,
      quantityDelivered: i.quantity_delivered,
      observation: i.observation_snapshot || null,
    }));
  }

  if (lowerQ.includes("from delivery_note_items") && (lowerQ.includes("dn.order_id =") || lowerQ.includes("group by"))) {
    const orderId = values[0] as string;
    const blsForOrder = mockDb.deliveryNotes.filter((bl) => bl.order_id === orderId);
    const blMap = new Map(blsForOrder.map((bl) => [bl.id, bl]));
    return mockDb.deliveryNoteItems.filter((dni) => blMap.has(dni.delivery_note_id)).map((i) => {
      const bl = blMap.get(i.delivery_note_id);
      return {
        id: i.id,
        deliveryNoteId: i.delivery_note_id,
        blStatus: bl?.status || "PREPARED",
        orderItemId: i.order_item_id,
        itemId: i.item_id,
        lineNumber: i.line_number,
        description: i.description_snapshot,
        unit: i.unit_snapshot,
        quantityDelivered: i.quantity_delivered,
        observation: i.observation_snapshot,
      };
    });
  }

  if (lowerQ.startsWith("insert into delivery_note_items")) {
    const newDni = {
      id: `dni-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      delivery_note_id: values[0] as string,
      order_item_id: values[1] as string,
      item_id: (values[2] as string) || null,
      line_number: Number(values[3]),
      description_snapshot: values[4] as string,
      unit_snapshot: values[5] as string,
      quantity_delivered: Number(values[6]),
      observation_snapshot: (values[7] as string) || null,
    };
    mockDb.deliveryNoteItems.push(newDni);
    return [{ id: newDni.id }];
  }

  if (lowerQ.includes("from delivery_notes") && (lowerQ.includes("where dn.id =") || lowerQ.includes("dn.id::text ="))) {
    const id = values[0] as string;
    const bl = mockDb.deliveryNotes.find((d) => d.id === id || d.bl_number === id);
    if (!bl) return [];
    const client = mockDb.clients.find((c) => c.id === bl.client_id);
    const order = mockDb.orders.find((o) => o.id === bl.order_id);
    const quote = order ? mockDb.quotations.find((q) => q.id === order.quotation_id) : null;
    const invoice = mockDb.invoices.find((i) => i.id === bl.invoice_id);
    return [{
      id: bl.id,
      blNumber: bl.bl_number,
      clientId: bl.client_id,
      clientCode: client?.code,
      clientName: client?.name,
      orderId: bl.order_id,
      orderNumber: order?.order_number,
      clientPoNumber: order?.client_po_number,
      quotationReference: quote?.internal_reference,
      clientRfqNumber: quote?.client_rfq_number,
      invoiceId: bl.invoice_id,
      invoiceNumber: invoice?.invoice_number,
      deliveryDate: bl.delivery_date,
      carrierName: bl.carrier_name,
      driverName: bl.driver_name,
      vehiclePlate: bl.vehicle_plate,
      receiverName: bl.receiver_name,
      status: bl.status,
      notes: bl.notes,
      cancellationReason: bl.cancellation_reason,
      createdBy: bl.created_by,
      createdAt: bl.created_at,
      updatedAt: bl.updated_at,
    }];
  }

  if (lowerQ.includes("from delivery_notes")) {
    const orderId = values[0] as string | undefined;
    let list = mockDb.deliveryNotes;
    if (orderId && lowerQ.includes("order_id =")) {
      list = list.filter((bl) => bl.order_id === orderId);
    }
    return list.map((bl) => {
      const client = mockDb.clients.find((c) => c.id === bl.client_id);
      const order = mockDb.orders.find((o) => o.id === bl.order_id);
      const invoice = mockDb.invoices.find((i) => i.id === bl.invoice_id);
      return {
        id: bl.id,
        blNumber: bl.bl_number,
        clientId: bl.client_id,
        clientCode: client?.code,
        clientName: client?.name,
        orderId: bl.order_id,
        orderNumber: order?.order_number,
        clientPoNumber: order?.client_po_number,
        invoiceId: bl.invoice_id,
        invoiceNumber: invoice?.invoice_number,
        deliveryDate: bl.delivery_date,
        carrierName: bl.carrier_name,
        driverName: bl.driver_name,
        vehiclePlate: bl.vehicle_plate,
        receiverName: bl.receiver_name,
        status: bl.status,
        notes: bl.notes,
        cancellationReason: bl.cancellation_reason,
        createdBy: bl.created_by,
        createdAt: bl.created_at,
        updatedAt: bl.updated_at,
      };
    });
  }

  if (lowerQ.startsWith("insert into delivery_notes")) {
    const newBl = {
      id: `bl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bl_number: values[0] as string,
      client_id: values[1] as string,
      order_id: values[2] as string,
      invoice_id: (values[3] as string) || null,
      delivery_date: (values[4] as string) || new Date().toISOString().split("T")[0],
      carrier_name: (values[5] as string) || null,
      driver_name: (values[6] as string) || null,
      vehicle_plate: (values[7] as string) || null,
      receiver_name: (values[8] as string) || null,
      status: "PREPARED" as const,
      notes: (values[10] as string) || null,
      cancellation_reason: null,
      created_by: values[11] as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.deliveryNotes.unshift(newBl);
    return [{ id: newBl.id, blNumber: newBl.bl_number }];
  }

  if (lowerQ.startsWith("update delivery_notes set status =")) {
    const status = values[0] as MockDeliveryNote["status"];
    const reason = values[1] as string | null;
    const id = values[2] as string;
    const bl = mockDb.deliveryNotes.find((d) => d.id === id);
    if (bl) {
      bl.status = status;
      if (reason) bl.cancellation_reason = reason;
      bl.updated_at = new Date().toISOString();
    }
    return [];
  }

  // 12. Invoices & Invoice Items
  if (lowerQ.startsWith("insert into invoices")) {
    const newInv = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoice_number: values[0] as string,
      client_id: values[1] as string,
      order_id: (values[2] as string) || null,
      quotation_id: (values[3] as string) || null,
      issue_date: (values[4] as string) || new Date().toISOString().split("T")[0],
      due_date: (values[5] as string) || new Date().toISOString().split("T")[0],
      status: (values[6] as MockInvoice["status"]) || "ISSUED",
      currency: (values[7] as string) || "USD",
      subtotal: Number(values[8]),
      vat_rate: Number(values[9] || 16.0),
      vat_amount: Number(values[10]),
      total: Number(values[11]),
      paid_amount: Number(values[12] || 0),
      balance_due: Number(values[13]),
      payment_terms: "30_DAYS",
      notes: (values[14] as string) || null,
      cancellation_reason: null,
      created_by: values[15] as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.invoices.unshift(newInv);
    return [{ id: newInv.id }];
  }

  if (lowerQ.includes("from invoice_items") && (lowerQ.includes("invoice_id =") || lowerQ.includes("ii.invoice_id ="))) {
    const invId = values[0] as string;
    return mockDb.invoiceItems.filter((i) => i.invoice_id === invId).map((i) => ({
      id: i.id,
      invoiceId: i.invoice_id,
      orderItemId: i.order_item_id,
      itemId: i.item_id,
      lineNumber: i.line_number,
      description: i.description_snapshot,
      unit: i.unit_snapshot,
      brand: i.brand_snapshot,
      discountPercent: i.discount_percent_snapshot,
      quantity: i.quantity,
      unitPrice: i.unit_price_snapshot,
      lineSubtotal: i.line_subtotal,
      lineTotal: i.line_subtotal,
    }));
  }

  if (lowerQ.startsWith("insert into invoice_items")) {
    const newIi = {
      id: `ii-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoice_id: values[0] as string,
      order_item_id: (values[1] as string) || null,
      item_id: (values[2] as string) || null,
      line_number: Number(values[3]),
      description_snapshot: values[4] as string,
      unit_snapshot: values[5] as string,
      quantity: Number(values[6]),
      unit_price_snapshot: Number(values[7]),
      line_subtotal: Number(values[8]),
      brand_snapshot: (values[9] as string) || null,
      discount_percent_snapshot: Number(values[10] || 0),
    };
    mockDb.invoiceItems.push(newIi);
    return [{ id: newIi.id }];
  }

  if (lowerQ.startsWith("update invoices set normalized_invoice_number =")) {
    const val = (values[0] as string | null) || null;
    const id = values[2] as string;
    const inv = mockDb.invoices.find((i) => i.id === id);
    if (inv) {
      inv.normalized_invoice_number = val;
      inv.updated_at = new Date().toISOString();
    }
    return [{ id }];
  }

  if (lowerQ.includes("from invoices") && lowerQ.includes("i.balance_due > 0")) {
    const clientId = values[0] as string;
    const startFilter = (values[1] as string) || null;
    const endFilter = (values[2] as string) || null;

    let list = mockDb.invoices.filter((i) =>
      i.client_id === clientId &&
      i.status !== "CANCELLED" &&
      i.status !== "DRAFT" &&
      ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status) &&
      i.balance_due > 0
    );

    if (startFilter) {
      list = list.filter((i) => i.issue_date >= startFilter);
    }
    if (endFilter) {
      list = list.filter((i) => i.issue_date <= endFilter);
    }

    list.sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());

    return list.map((inv) => {
      const order = mockDb.orders.find((o) => o.id === inv.order_id);
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        normalizedInvoiceNumber: inv.normalized_invoice_number || null,
        clientPoNumber: order?.client_po_number || null,
        orderNumber: order?.order_number || null,
        issueDate: inv.issue_date,
        currency: inv.currency,
        debit: inv.total,
        credit: inv.paid_amount,
        balance: inv.balance_due,
        status: inv.status,
      };
    });
  }

  if (lowerQ.includes("from invoices") && lowerQ.includes("count(*)::int as total")) {
    const totalInvoiced = mockDb.invoices.reduce((s, i) => s + (i.status !== "CANCELLED" ? i.total : 0), 0);
    const receivables = mockDb.invoices.reduce((s, i) => s + (i.status !== "CANCELLED" ? i.balance_due : 0), 0);
    const unpaid = mockDb.invoices.filter((i) => i.balance_due > 0).length;
    return [{ total: mockDb.invoices.length, total_invoiced: totalInvoiced, total_receivables: receivables, unpaid_count: unpaid }];
  }

  if (lowerQ.includes("from invoices") && (lowerQ.includes("where i.id =") || lowerQ.includes("i.id::text ="))) {
    const id = values[0] as string;
    const inv = mockDb.invoices.find((i) => i.id === id || i.invoice_number === id || i.normalized_invoice_number === id);
    if (!inv) return [];
    const client = mockDb.clients.find((c) => c.id === inv.client_id);
    const order = mockDb.orders.find((o) => o.id === inv.order_id);
    const quote = order ? mockDb.quotations.find((q) => q.id === order.quotation_id) : null;
    const bl = mockDb.deliveryNotes.find((d) => d.invoice_id === inv.id);
    return [{
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      normalizedInvoiceNumber: inv.normalized_invoice_number || null,
      clientId: inv.client_id,
      clientCode: client?.code,
      clientName: client?.name,
      clientEmail: client?.email,
      clientPhone: client?.phone,
      orderId: inv.order_id,
      orderNumber: order?.order_number,
      clientPoNumber: order?.client_po_number,
      deliveryNoteId: bl?.id,
      deliveryNoteNumber: bl?.bl_number,
      quotationId: inv.quotation_id,
      quotationReference: quote?.internal_reference,
      clientRfqNumber: quote?.client_rfq_number,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      status: inv.status,
      currency: inv.currency,
      subtotal: inv.subtotal,
      vatRate: inv.vat_rate,
      vatAmount: inv.vat_amount,
      total: inv.total,
      paidAmount: inv.paid_amount,
      balanceDue: inv.balance_due,
      paymentTerms: inv.payment_terms,
      notes: inv.notes,
      cancellationReason: inv.cancellation_reason,
      createdBy: inv.created_by,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    }];
  }

  if (lowerQ.includes("from invoices where quotation_id =")) {
    const qId = values[0] as string;
    return mockDb.invoices
      .filter((i) => i.quotation_id === qId)
      .slice(0, 1)
      .map((i) => ({ id: i.id }));
  }

  if (lowerQ.includes("from invoices")) {
    return mockDb.invoices.map((inv) => {
      const client = mockDb.clients.find((c) => c.id === inv.client_id);
      const order = mockDb.orders.find((o) => o.id === inv.order_id);
      const quote = mockDb.quotations.find((q) => q.id === inv.quotation_id);
      const bl = mockDb.deliveryNotes.find((d) => d.invoice_id === inv.id);
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        normalizedInvoiceNumber: inv.normalized_invoice_number || null,
        clientId: inv.client_id,
        clientCode: client?.code,
        clientName: client?.name,
        orderId: inv.order_id,
        orderNumber: order?.order_number,
        clientPoNumber: order?.client_po_number,
        deliveryNoteNumber: bl?.bl_number,
        quotationId: inv.quotation_id,
        quotationReference: quote?.internal_reference,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        status: inv.status,
        currency: inv.currency,
        subtotal: inv.subtotal,
        vatRate: inv.vat_rate,
        vatAmount: inv.vat_amount,
        total: inv.total,
        paidAmount: inv.paid_amount,
        balanceDue: inv.balance_due,
        paymentTerms: inv.payment_terms,
        notes: inv.notes,
        createdAt: inv.created_at,
      };
    });
  }

  // 12. Payments
  if (lowerQ.includes("from payments") && lowerQ.includes("count(*)::int as total")) {
    const collected = mockDb.payments.reduce((s, p) => s + p.amount, 0);
    return [{ total: mockDb.payments.length, total_collected: collected }];
  }

  if (lowerQ.includes("from payments")) {
    return mockDb.payments.map((p) => {
      const client = mockDb.clients.find((c) => c.id === p.client_id);
      return {
        id: p.id,
        paymentNumber: p.payment_number,
        clientId: p.client_id,
        clientCode: client?.code,
        clientName: client?.name,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        reference: p.reference,
        amount: p.amount,
        currency: p.currency,
        notes: p.notes,
        createdAt: p.created_at,
      };
    });
  }

  // Fallback empty result
  return [];
}
