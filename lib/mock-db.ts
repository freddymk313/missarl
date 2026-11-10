// ============================================================================
// In-Memory Mock Database for AI Studio Preview
// Used when DATABASE_URL is not set or Neon is unavailable.
// Enables full functionality: login, browsing, quotations, orders, invoices,
// payments, items catalog, and reporting without requiring external DB setup.
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockSession {
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
}

export interface MockClient {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  delivery_address: string | null;
  tax_id: string | null;
  payment_terms: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockSupplier {
  id: string;
  code: string;
  name: string;
  country: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockCategory {
  id: string;
  code: string;
  name_fr: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MockBrand {
  id: string;
  name: string;
  name_normalized: string;
}

export interface MockUnit {
  code: string;
  label_fr: string;
  aliases: string[];
}

export interface MockCurrency {
  code: string;
  name: string;
  symbol: string;
}

export interface MockExchangeRate {
  id: string;
  currency_code: string;
  rate_to_usd: number;
  effective_on: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MockItem {
  id: string;
  sku: string;
  designation: string;
  category_id: string;
  brand_id: string | null;
  mpn: string | null;
  mpn_normalized: string | null;
  unit_code: string;
  specs: Record<string, unknown> | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed / joined helpers
  category_code?: string;
  category_name?: string;
  brand_name?: string | null;
  unit_label?: string;
}

export interface MockItemIdentifier {
  id: string;
  item_id: string;
  type: string;
  value: string;
  value_normalized: string;
  client_id: string | null;
  created_at: string;
}

export interface MockSupplierOffer {
  id: string;
  item_id: string;
  supplier_id: string;
  supplier_item_code: string | null;
  currency_code: string;
  unit_price: number;
  vat_included: boolean;
  vat_rate: number | null;
  lead_time_days: number | null;
  min_order_qty: number | null;
  quoted_on: string;
  valid_until: string | null;
  is_current: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MockQuotation {
  id: string;
  client_id: string;
  doc_type: "QUOTATION" | "PROFORMA";
  client_rfq_number: string | null;
  internal_reference: string;
  sequence_number: number;
  year: number;
  document_date: string;
  validity_date: string;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "EXPIRED" | "REJECTED" | "CANCELLED";
  currency: string;
  default_commission_percent: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  payment_terms: string | null;
  delivery_lead_time: string | null;
  notes: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockQuotationLine {
  id: string;
  quotation_id: string;
  item_id: string | null;
  brand: string | null;
  supplier_offer_id: string | null;
  line_number: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_subtotal: number;
  supplier_price_snapshot: number | null;
  supplier_currency_snapshot: string | null;
  supplier_vat_included_snapshot: boolean | null;
  supplier_vat_rate_snapshot: number | null;
  exchange_rate_snapshot: number | null;
  base_cost_usd_snapshot: number | null;
  commission_percent_snapshot: number | null;
  commission_amount_snapshot: number | null;
}

export interface MockOrder {
  id: string;
  order_number: string;
  client_id: string;
  quotation_id: string;
  client_po_number: string;
  po_date: string;
  expected_delivery_date: string | null;
  status: "PENDING" | "CONFIRMED" | "PARTIALLY_DELIVERED" | "COMPLETED" | "CANCELLED";
  currency: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockInvoice {
  id: string;
  invoice_number: string;
  client_id: string;
  order_id: string | null;
  quotation_id: string | null;
  issue_date: string;
  due_date: string;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  currency: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  payment_terms: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockPayment {
  id: string;
  payment_number: string;
  client_id: string;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface MockOrderItem {
  id: string;
  order_id: string;
  quotation_item_id: string | null;
  item_id: string | null;
  line_number: number;
  description_snapshot: string;
  unit_snapshot: string;
  brand_snapshot: string | null;
  discount_percent_snapshot: number;
  quantity_ordered: number;
  quantity_delivered: number;
  unit_price_snapshot: number;
  line_subtotal: number;
}

export interface MockInvoiceItem {
  id: string;
  invoice_id: string;
  order_item_id: string | null;
  item_id: string | null;
  line_number: number;
  description_snapshot: string;
  unit_snapshot: string;
  brand_snapshot: string | null;
  discount_percent_snapshot: number;
  quantity: number;
  unit_price_snapshot: number;
  line_subtotal: number;
}

export interface MockDeliveryNote {
  id: string;
  bl_number: string;
  client_id: string;
  order_id: string;
  invoice_id: string | null;
  delivery_date: string;
  carrier_name: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  receiver_name: string | null;
  status: "PREPARED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  notes: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockDeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  order_item_id: string;
  item_id: string | null;
  line_number: number;
  description_snapshot: string;
  unit_snapshot: string;
  quantity_delivered: number;
  observation_snapshot: string | null;
}

export interface MockAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_full_name?: string | null;
  user_email?: string | null;
}

// ----------------------------------------------------------------------------
// In-Memory Tables Initialization
// ----------------------------------------------------------------------------

export class MockDatabase {
  users: MockUser[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@missarl.com",
      password_hash:
        "54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f",
      full_name: "Directeur Général (Super Admin)",
      role: "SUPER_ADMIN",
      is_active: true,
      last_login_at: "2026-11-09T10:00:00Z",
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      email: "commercial@missarl.com",
      password_hash:
        "54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f",
      full_name: "Agent Commercial (Admin)",
      role: "ADMIN",
      is_active: true,
      last_login_at: "2026-11-08T15:30:00Z",
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      email: "collecteur@missarl.com",
      password_hash:
        "54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f",
      full_name: "Collecteur de Prix",
      role: "PRICE_COLLECTOR",
      is_active: true,
      last_login_at: "2026-11-07T09:15:00Z",
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
  ];

  sessions: MockSession[] = [];

  clients: MockClient[] = [
    {
      id: "b0000000-0000-0000-0000-000000000001",
      code: "CLI-KCC",
      name: "Kamoto Copper Company (KCC)",
      contact_person: "Directeur des Approvisionnements",
      email: "procurement@kcc.cd",
      phone: "+243 99 800 2000",
      billing_address: "Kamoto Mine, Kolwezi, Lualaba, RDC",
      delivery_address: "Site KCC Magasin Central, Kolwezi",
      tax_id: "A09123456Z",
      payment_terms: "30_DAYS",
      currency: "USD",
      is_active: true,
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
    {
      id: "b0000000-0000-0000-0000-000000000002",
      code: "CLI-TFM",
      name: "Tenke Fungurume Mining (TFM)",
      contact_person: "Service Achats & Contrats",
      email: "purchasing@tfm.cd",
      phone: "+243 82 500 3000",
      billing_address: "Fungurume, Lualaba, RDC",
      delivery_address: "Mine Site, Fungurume Gate 3",
      tax_id: "A08765432Y",
      payment_terms: "30_DAYS",
      currency: "USD",
      is_active: true,
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
    {
      id: "b0000000-0000-0000-0000-000000000003",
      code: "CLI-MMG",
      name: "MMG Kinsevere SARL",
      contact_person: "Responsable Logistique",
      email: "kinsevere.procurement@mmg.com",
      phone: "+243 97 100 4000",
      billing_address: "Site Minier Kinsevere, Haut-Katanga, RDC",
      delivery_address: "Kinsevere Warehouse, Lubumbashi",
      tax_id: "A07654321X",
      payment_terms: "45_DAYS",
      currency: "USD",
      is_active: true,
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
  ];

  suppliers: MockSupplier[] = [
    {
      id: "s0000000-0000-0000-0000-000000000001",
      code: "SUP-IFM",
      name: "IFM Electronic SA",
      country: "Afrique du Sud",
      contact_person: "Technical Sales",
      email: "sales@ifm.co.za",
      phone: "+27 12 345 6789",
      address: "Johannesburg, South Africa",
      notes: "Fournisseur agréé capteurs et bus AS-Interface",
      is_active: true,
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
    {
      id: "s0000000-0000-0000-0000-000000000002",
      code: "SUP-ALLBRO",
      name: "Allbro Distribution",
      country: "Afrique du Sud",
      contact_person: "Industrial Enclosures",
      email: "orders@allbro.co.za",
      phone: "+27 11 987 6543",
      address: "Boksburg, South Africa",
      notes: "Boîtiers polyester et coffrets industriels",
      is_active: true,
      created_at: "2026-11-01T08:00:00Z",
      updated_at: "2026-11-01T08:00:00Z",
    },
  ];

  categories: MockCategory[] = [
    { id: "c1", code: "PLUMBING", name_fr: "Plomberie industrielle", parent_id: null, sort_order: 1, is_active: true },
    { id: "c2", code: "HDPE_WELDING", name_fr: "Soudure et réseaux HDPE", parent_id: null, sort_order: 2, is_active: true },
    { id: "c3", code: "ELECTROMECH", name_fr: "Électromécanique et instrumentation", parent_id: null, sort_order: 3, is_active: true },
    { id: "c4", code: "MINING_MACHINERY", name_fr: "Engins miniers : location et pièces de rechange", parent_id: null, sort_order: 4, is_active: true },
    { id: "c5", code: "CONSTRUCTION", name_fr: "Construction et matériaux", parent_id: null, sort_order: 5, is_active: true },
    { id: "c6", code: "TOOLS_PPE", name_fr: "Outillage et équipements de protection (EPI)", parent_id: null, sort_order: 6, is_active: true },
  ];

  brands: MockBrand[] = [
    { id: "b1", name: "IFM Electronic", name_normalized: "IFMELECTRONIC" },
    { id: "b2", name: "Allbro", name_normalized: "ALLBRO" },
    { id: "b3", name: "SEW-Eurodrive", name_normalized: "SEWEURODRIVE" },
    { id: "b4", name: "Grundfos", name_normalized: "GRUNDFOS" },
    { id: "b5", name: "Schneider Electric", name_normalized: "SCHNEIDERELECTRIC" },
    { id: "b6", name: "SKF", name_normalized: "SKF" },
  ];

  units: MockUnit[] = [
    { code: "EA", label_fr: "Pièce", aliases: ["NOS", "PCE", "PCS", "PC", "UN"] },
    { code: "M", label_fr: "Mètre", aliases: [] },
    { code: "KG", label_fr: "Kilogramme", aliases: [] },
    { code: "L", label_fr: "Litre", aliases: [] },
    { code: "SET", label_fr: "Ensemble", aliases: [] },
    { code: "KIT", label_fr: "Kit", aliases: [] },
    { code: "ROLL", label_fr: "Rouleau", aliases: [] },
    { code: "BOX", label_fr: "Boîte/Carton", aliases: [] },
    { code: "PAIR", label_fr: "Paire", aliases: [] },
  ];

  currencies: MockCurrency[] = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "CDF", name: "Franc Congolais", symbol: "FC" },
    { code: "ZAR", name: "Rand sud-africain", symbol: "R" },
  ];

  exchangeRates: MockExchangeRate[] = [
    { id: "xr1", currency_code: "USD", rate_to_usd: 1.0, effective_on: "2026-11-09", note: "Devise pivot", created_by: null, created_at: "2026-11-01" },
    { id: "xr2", currency_code: "CDF", rate_to_usd: 0.00035, effective_on: "2026-11-09", note: "Cours bancaire", created_by: null, created_at: "2026-11-01" },
    { id: "xr3", currency_code: "ZAR", rate_to_usd: 0.054, effective_on: "2026-11-09", note: "Fournisseurs RSA", created_by: null, created_at: "2026-11-01" },
  ];

  items: MockItem[] = [];
  itemIdentifiers: MockItemIdentifier[] = [];
  supplierOffers: MockSupplierOffer[] = [];
  quotations: MockQuotation[] = [];
  quotationLines: MockQuotationLine[] = [];
  orders: MockOrder[] = [];
  orderItems: MockOrderItem[] = [];
  invoices: MockInvoice[] = [];
  invoiceItems: MockInvoiceItem[] = [];
  deliveryNotes: MockDeliveryNote[] = [];
  deliveryNoteItems: MockDeliveryNoteItem[] = [];
  payments: MockPayment[] = [];
  auditLogs: MockAuditLog[] = [];
  clientSequences: Record<string, number> = { "CLI-KCC": 88 };
  documentCounters: Record<string, number> = {
    INVOICE_2026: 19,
    DELIVERY_NOTE_2026: 1,
    ORDER_2026: 42,
  };

  constructor() {
    this.seedCatalog();
  }

  private seedCatalog() {
    const rawLines = [
      { num: 1, desc: "AS-Interface flat cable seal Part No: E70413 Order code: E70413-AS-i cable end seal 10pcs", unit: "EA", price: 61.25, brand: "IFM Electronic", mpn: "E70413" },
      { num: 2, desc: "ASI flat cable insulation displacement connector Part No: E70582 Order code: E70582 - FC Splitter AS-i / AUX 1 m M12 UL", unit: "EA", price: 87.50, brand: "IFM Electronic", mpn: "E70582" },
      { num: 3, desc: "ASI POWER DISTRIBUTOR Part No: E70588 Order code: E70588 - QUAD M12 AS-i/24V 4A", unit: "EA", price: 92.75, brand: "IFM Electronic", mpn: "E70588" },
      { num: 4, desc: "ASI PASSIVE BUS TERMINATION Part No: E70580 Order code: E70580-AS-I BUS TERMINATION", unit: "EA", price: 227.50, brand: "IFM Electronic", mpn: "E70580" },
      { num: 5, desc: "ASI BUS TERMINATION Part No: AC1147 Order code: AC1147-AS-I BUS TERMINATION", unit: "EA", price: 210.00, brand: "IFM Electronic", mpn: "AC1147" },
      { num: 6, desc: "ASI 4 DI MODULE Part No: AC5215 Order code: AC5215 Classic Line 4DI-Y IP67", unit: "EA", price: 262.50, brand: "IFM Electronic", mpn: "AC5215" },
      { num: 7, desc: "ASI 2 DO MODULE Part No: AC5214 Order code: AC5214 ClassicL 2DO-Y 2DI-Y IP67", unit: "EA", price: 280.00, brand: "IFM Electronic", mpn: "AC5214" },
      { num: 8, desc: "ASI 2 AI INPUT MODULE (2 AND 3 WIRES CONNECTIONS) Part No: AC5222 Order code: AC5222 ClassicLine 2AI C IP67", unit: "EA", price: 402.50, brand: "IFM Electronic", mpn: "AC5222" },
      { num: 9, desc: "ASI 2 DI 2 DO INPUT MODULE Part No: AC5224 Order code: AC5224 ClassicL 2DO-Y 2DI-Y IP67", unit: "EA", price: 262.50, brand: "IFM Electronic", mpn: "AC5224" },
      { num: 10, desc: "ASI GATEWAY Part No: AC1422 Order code: AC1422-AS-i Gateway 2Master EIP", unit: "EA", price: 2362.50, brand: "IFM Electronic", mpn: "AC1422" },
      { num: 11, desc: "ASI POWER SUPPLY MODULE Part No: DN4012 Order code: DN4012 - PSU-1AC/24VDC-5A", unit: "EA", price: 428.75, brand: "IFM Electronic", mpn: "DN4012" },
      { num: 12, desc: "ASI POWER SUPPLY MODULE Part No: AC1254 Order code: AC1254 - PSU-1AC/ASi-4A", unit: "EA", price: 638.75, brand: "IFM Electronic", mpn: "AC1254" },
      { num: 13, desc: "ALL BRO 5 BOX Part No: Allbrox 5 Order code: Allbrox 5", unit: "EA", price: 212.19, brand: "Allbro", mpn: "ALLBROX5" },
      { num: 14, desc: "AS-i safety pcb 2-SI/1-DO Part No: E7015S Order code: E7015S - AS-i safety pcb 2-SI/1-DO", unit: "EA", price: 218.75, brand: "IFM Electronic", mpn: "E7015S" },
      { num: 15, desc: "AS-Interface flat cable Part No: E74220 100 meter TPE red Order code: E74220 - Flat cable", unit: "M", price: 12.60, brand: "IFM Electronic", mpn: "E74220" },
      { num: 16, desc: "Safe AS-Interface ClassicLine module Part No: AC508S Order code: AC508S ClassicL 2SI AUX 2DOT 2LO OSSD", unit: "EA", price: 376.25, brand: "IFM Electronic", mpn: "AC508S" },
      { num: 17, desc: "Connection cable Part No: EVC134 Order code: EVC134 - VDOAH040MSS0020H04STGH040MSS", unit: "EA", price: 113.75, brand: "IFM Electronic", mpn: "EVC134" },
      { num: 18, desc: "AS-Interface addressing cable Part No: E70213 Order code: E70213 - Addressing cable", unit: "EA", price: 78.75, brand: "IFM Electronic", mpn: "E70213" },
      { num: 19, desc: "AS-Interface addressing unit Part No: AC1154 Order code: AC1154-Addressing unit AS-i 3.0", unit: "EA", price: 962.50, brand: "IFM Electronic", mpn: "AC1154" },
    ];

    const categoryElectromech = "c3";
    const brandIfm = "b1";

    rawLines.forEach((l, idx) => {
      const itemId = `item-${String(idx + 1).padStart(4, "0")}`;
      const sku = `MIS-ELM-${String(idx + 1).padStart(4, "0")}`;
      this.items.push({
        id: itemId,
        sku,
        designation: l.desc,
        category_id: categoryElectromech,
        brand_id: brandIfm,
        mpn: l.mpn,
        mpn_normalized: l.mpn.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        unit_code: l.unit,
        specs: null,
        notes: null,
        is_active: true,
        created_at: "2026-11-01T08:00:00Z",
        updated_at: "2026-11-01T08:00:00Z",
        category_code: "ELECTROMECH",
        category_name: "Électromécanique et instrumentation",
        brand_name: l.brand,
        unit_label: l.unit === "M" ? "Mètre" : "Pièce",
      });

      this.itemIdentifiers.push({
        id: `ident-${idx + 1}`,
        item_id: itemId,
        type: "MPN",
        value: l.mpn,
        value_normalized: l.mpn.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        client_id: null,
        created_at: "2026-11-01T08:00:00Z",
      });

      this.supplierOffers.push({
        id: `offer-${idx + 1}`,
        item_id: itemId,
        supplier_id: "s0000000-0000-0000-0000-000000000001",
        supplier_item_code: l.mpn,
        currency_code: "USD",
        unit_price: l.price * 0.8,
        vat_included: false,
        vat_rate: 0,
        lead_time_days: 14,
        min_order_qty: 1,
        quoted_on: "2026-11-01",
        valid_until: "2026-12-31",
        is_current: true,
        notes: "Tarif distributeur",
        created_by: "11111111-1111-1111-1111-111111111111",
        created_at: "2026-11-01T08:00:00Z",
      });
    });

    // Sample Quotation
    const quoteId = "q0000000-0000-0000-0000-000000000001";
    this.quotations.push({
      id: quoteId,
      client_id: "b0000000-0000-0000-0000-000000000001",
      doc_type: "QUOTATION",
      client_rfq_number: "RFQ-KICO-14425 OQ",
      internal_reference: "0088/026/MIS",
      sequence_number: 88,
      year: 2026,
      document_date: "2026-11-07",
      validity_date: "2026-12-07",
      status: "VALIDATED",
      currency: "USD",
      default_commission_percent: 25.0,
      subtotal: 25070.94,
      vat_rate: 16.0,
      vat_amount: 4011.35,
      total: 29082.29,
      payment_terms: "30_DAYS",
      delivery_lead_time: "EX-STOCK",
      notes: "Livraison sur site Kamoto Magasin Central",
      rejection_reason: null,
      cancellation_reason: null,
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-11-07T12:00:00Z",
      updated_at: "2026-11-07T12:00:00Z",
    });

    const quantities = [5, 5, 5, 5, 5, 2, 2, 2, 2, 1, 3, 3, 25, 4, 400, 2, 6, 1, 1];
    rawLines.forEach((l, idx) => {
      const q = quantities[idx] || 1;
      const sub = Math.round(l.price * q * 100) / 100;
      this.quotationLines.push({
        id: `ql-${idx + 1}`,
        quotation_id: quoteId,
        item_id: `item-${String(idx + 1).padStart(4, "0")}`,
        brand: l.brand,
        supplier_offer_id: `offer-${idx + 1}`,
        line_number: idx + 1,
        description: l.desc,
        unit: l.unit,
        quantity: q,
        unit_price: l.price,
        discount_percent: 0,
        line_subtotal: sub,
        supplier_price_snapshot: l.price * 0.8,
        supplier_currency_snapshot: "USD",
        supplier_vat_included_snapshot: false,
        supplier_vat_rate_snapshot: 0,
        exchange_rate_snapshot: 1.0,
        base_cost_usd_snapshot: l.price * 0.8,
        commission_percent_snapshot: 25.0,
        commission_amount_snapshot: l.price * 0.2,
      });
    });

    // Sample Order
    const orderId = "o0000000-0000-0000-0000-000000000001";
    this.orders.push({
      id: orderId,
      order_number: "PO-2026-0042",
      client_id: "b0000000-0000-0000-0000-000000000001",
      quotation_id: quoteId,
      client_po_number: "PO-KCC-99412",
      po_date: "2026-11-08",
      expected_delivery_date: "2026-12-15",
      status: "CONFIRMED",
      currency: "USD",
      subtotal: 25070.94,
      vat_rate: 16.0,
      vat_amount: 4011.35,
      total: 29082.29,
      notes: "Approuvé par Directeur Achats KCC",
      cancellation_reason: null,
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-11-08T09:00:00Z",
      updated_at: "2026-11-08T09:00:00Z",
    });

    // Populate order items
    rawLines.forEach((l, idx) => {
      const q = quantities[idx] || 1;
      const sub = Math.round(l.price * q * 100) / 100;
      this.orderItems.push({
        id: `oi-${idx + 1}`,
        order_id: orderId,
        quotation_item_id: `ql-${idx + 1}`,
        item_id: `item-${String(idx + 1).padStart(4, "0")}`,
        line_number: idx + 1,
        description_snapshot: l.desc,
        unit_snapshot: l.unit,
        brand_snapshot: l.brand,
        discount_percent_snapshot: 0,
        quantity_ordered: q,
        quantity_delivered: q, // marked delivered by initial sample BL
        unit_price_snapshot: l.price,
        line_subtotal: sub,
      });
    });

    // Sample Invoice
    const invoiceId = "i0000000-0000-0000-0000-000000000001";
    this.invoices.push({
      id: invoiceId,
      invoice_number: "FAC-2026-0019",
      client_id: "b0000000-0000-0000-0000-000000000001",
      order_id: orderId,
      quotation_id: quoteId,
      issue_date: "2026-11-08",
      due_date: "2026-12-08",
      status: "PARTIALLY_PAID",
      currency: "USD",
      subtotal: 25070.94,
      vat_rate: 16.0,
      vat_amount: 4011.35,
      total: 29082.29,
      paid_amount: 15000.0,
      balance_due: 14082.29,
      payment_terms: "30_DAYS",
      notes: "Acompte 50% reçu",
      cancellation_reason: null,
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-11-08T10:00:00Z",
      updated_at: "2026-11-09T08:00:00Z",
    });

    // Populate invoice items
    rawLines.forEach((l, idx) => {
      const q = quantities[idx] || 1;
      const sub = Math.round(l.price * q * 100) / 100;
      this.invoiceItems.push({
        id: `ii-${idx + 1}`,
        invoice_id: invoiceId,
        order_item_id: `oi-${idx + 1}`,
        item_id: `item-${String(idx + 1).padStart(4, "0")}`,
        line_number: idx + 1,
        description_snapshot: l.desc,
        unit_snapshot: l.unit,
        brand_snapshot: l.brand,
        discount_percent_snapshot: 0,
        quantity: q,
        unit_price_snapshot: l.price,
        line_subtotal: sub,
      });
    });

    // Sample Delivery Note
    const blId = "bl000000-0000-0000-0000-000000000001";
    this.deliveryNotes.push({
      id: blId,
      bl_number: "MIS/BL/2026/001",
      client_id: "b0000000-0000-0000-0000-000000000001",
      order_id: orderId,
      invoice_id: invoiceId,
      delivery_date: "2026-11-08",
      carrier_name: "MIS Logistics",
      driver_name: "Jean-Paul M.",
      vehicle_plate: "1234AB/05",
      receiver_name: "Magasin Central KCC",
      status: "DELIVERED",
      notes: "Livraison conforme",
      cancellation_reason: null,
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-11-08T09:30:00Z",
      updated_at: "2026-11-08T09:30:00Z",
    });

    rawLines.forEach((l, idx) => {
      const q = quantities[idx] || 1;
      this.deliveryNoteItems.push({
        id: `bli-${idx + 1}`,
        delivery_note_id: blId,
        order_item_id: `oi-${idx + 1}`,
        item_id: `item-${String(idx + 1).padStart(4, "0")}`,
        line_number: idx + 1,
        description_snapshot: l.desc,
        unit_snapshot: l.unit,
        quantity_delivered: q,
        observation_snapshot: "Conforme",
      });
    });

    // Sample Payment
    this.payments.push({
      id: "p0000000-0000-0000-0000-000000000001",
      payment_number: "PAY-2026-0011",
      client_id: "b0000000-0000-0000-0000-000000000001",
      payment_date: "2026-11-09",
      payment_method: "BANK_TRANSFER",
      reference: "VIR-KCC-00994",
      amount: 15000.0,
      currency: "USD",
      notes: "Premier versement acompte commande PO-2026-0042",
      created_by: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-11-09T08:00:00Z",
    });

    // Sample Audit
    this.auditLogs.push(
      {
        id: "a1",
        user_id: "11111111-1111-1111-1111-111111111111",
        action: "INITIAL_SEED",
        entity_type: "SYSTEM",
        entity_id: null,
        details: { status: "ready" },
        ip_address: "127.0.0.1",
        created_at: "2026-11-01T08:00:00Z",
        user_full_name: "Directeur Général (Super Admin)",
        user_email: "admin@missarl.com",
      },
      {
        id: "a2",
        user_id: "11111111-1111-1111-1111-111111111111",
        action: "QUOTATION_VALIDATED",
        entity_type: "QUOTATION",
        entity_id: quoteId,
        details: { reference: "0088/026/MIS" },
        ip_address: "127.0.0.1",
        created_at: "2026-11-07T14:20:00Z",
        user_full_name: "Directeur Général (Super Admin)",
        user_email: "admin@missarl.com",
      }
    );
  }
}

export const mockDb = new MockDatabase();
