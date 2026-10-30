import { neon, neonConfig } from "@neondatabase/serverless";
import https from "https";
import dns from "dns/promises";
import crypto from "crypto";

const databaseUrl = process.env.DATABASE_URL?.trim();

// Extract the Neon hostname if URL is valid
let neonHost: string | null = null;
if (databaseUrl) {
  try {
    neonHost = new URL(databaseUrl.replace(/^postgresql:\/\//, "https://")).hostname;
  } catch {
    neonHost = null;
  }
}

function makeBypassFetch(ip: string, host: string): typeof fetch {
  return async (url: string | URL | Request, opts: RequestInit = {}): Promise<Response> => {
    const urlObj = new URL(url.toString());
    const body = opts.body != null ? Buffer.from(opts.body as string) : null;

    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string>),
      Host: host,
    };
    if (body) headers["Content-Length"] = String(body.length);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          method: opts.method ?? "GET",
          hostname: ip,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          headers,
          servername: host,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => {
            const buf = Buffer.concat(chunks);
            const resHeaders = res.headers as Record<string, string>;
            resolve({
              ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
              status: res.statusCode ?? 0,
              headers: { get: (k: string) => resHeaders[k.toLowerCase()] ?? null },
              text: () => Promise.resolve(buf.toString()),
              json: () => Promise.resolve(JSON.parse(buf.toString())),
              arrayBuffer: () => Promise.resolve(buf.buffer),
            } as unknown as Response);
          });
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  };
}

let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!databaseUrl || !neonHost) {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = dns
      .resolve4(neonHost)
      .then(([ip]) => {
        if (ip && neonHost) {
          neonConfig.fetchFunction = makeBypassFetch(ip, neonHost);
        }
      })
      .catch((err) => {
        console.warn("[DB] Failed to resolve Neon IP, using standard fetch:", err);
      });
  }
  return initPromise;
}

// ----------------------------------------------------------------------------
// IN-MEMORY MOCK DATABASE ENGINE
// Provides complete development & test persistence when DATABASE_URL is not set
// ----------------------------------------------------------------------------

interface MockDb {
  users: Array<{
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  sessions: Array<{
    id: string;
    user_id: string;
    token_hash: string;
    ip_address: string | null;
    user_agent: string | null;
    expires_at: string;
    created_at: string;
  }>;
  suppliers: Array<{
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
  }>;
  clients: Array<{
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
  }>;
  client_quotation_sequences: Array<{
    id: string;
    client_id: string;
    year: number;
    last_sequence: number;
    created_at: string;
    updated_at: string;
  }>;
  items: Array<{
    id: string;
    sku_ref: string;
    description: string;
    category: string | null;
    unit: string;
    brand: string | null;
    supplier_id: string | null;
    purchase_price: number;
    selling_price: number;
    currency: string;
    stock_quantity: number;
    min_stock_level: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  quotations: Array<{
    id: string;
    client_id: string;
    doc_type: string;
    client_rfq_number: string | null;
    internal_reference: string;
    sequence_number: number;
    year: number;
    document_date: string;
    validity_date: string;
    status: string;
    currency: string;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
    payment_terms: string | null;
    delivery_lead_time: string | null;
    notes: string | null;
    cancellation_reason: string | null;
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
  quotation_items: Array<{
    id: string;
    quotation_id: string;
    item_id: string | null;
    line_number: number;
    description_snapshot: string;
    unit_snapshot: string;
    quantity: number;
    unit_price_snapshot: number;
    discount_percent: number;
    line_subtotal: number;
  }>;
  orders: Array<{
    id: string;
    order_number: string;
    client_id: string;
    quotation_id: string;
    client_po_number: string;
    po_date: string;
    expected_delivery_date: string | null;
    status: string;
    currency: string;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
    notes: string | null;
    cancellation_reason: string | null;
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
  order_items: Array<{
    id: string;
    order_id: string;
    quotation_item_id: string | null;
    item_id: string | null;
    line_number: number;
    description_snapshot: string;
    unit_snapshot: string;
    quantity_ordered: number;
    quantity_delivered: number;
    unit_price_snapshot: number;
    line_subtotal: number;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    client_id: string;
    order_id: string | null;
    quotation_id: string | null;
    issue_date: string;
    due_date: string;
    status: string;
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
    updated_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
  invoice_items: Array<{
    id: string;
    invoice_id: string;
    order_item_id: string | null;
    item_id: string | null;
    line_number: number;
    description_snapshot: string;
    unit_snapshot: string;
    quantity: number;
    unit_price_snapshot: number;
    line_subtotal: number;
  }>;
  payments: Array<{
    id: string;
    payment_number: string;
    client_id: string;
    payment_date: string;
    amount: number;
    unallocated_amount: number;
    currency: string;
    payment_method: string;
    reference_number: string;
    notes: string | null;
    status: string;
    cancellation_reason: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>;
  payment_allocations: Array<{
    id: string;
    payment_id: string;
    invoice_id: string;
    client_id: string;
    allocated_amount: number;
    allocated_at: string;
    created_by: string;
  }>;
  audit_logs: Array<{
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details: Record<string, unknown>;
    ip_address: string | null;
    created_at: string;
  }>;
  schema_migrations: Array<{
    id: number;
    version: string;
    name: string;
    applied_at: string;
  }>;
}

// Global persistent instance in Node.js runtime
const globalForDb = globalThis as unknown as { __mockDbInstance?: MockDb };

function createInitialMockDb(): MockDb {
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  return {
    users: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        email: "admin@missarl.com",
        password_hash:
          "54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f",
        full_name: "Directeur Général (Super Admin)",
        role: "SUPER_ADMIN",
        is_active: true,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        email: "commercial@missarl.com",
        password_hash:
          "54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f",
        full_name: "Agent Commercial (Admin)",
        role: "ADMIN",
        is_active: true,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        email: "collecteur@missarl.com",
        password_hash:
          "54ce034bc089adf9f821c54bc0526dd0:e4f5300e2c456e05ec737765df2f960c2b8427d44d5eadfab092b6a1491d718facad33ceb1760faa414e1cd7a1bba0c5f9f8788a7922adafd61b7519bbe0986f",
        full_name: "Collecteur de Prix",
        role: "PRICE_COLLECTOR",
        is_active: true,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      },
    ],
    sessions: [],
    suppliers: [
      {
        id: "a0000000-0000-0000-0000-000000000001",
        code: "FOURN-ATL",
        name: "Atlas Mining Supplies",
        country: "Afrique du Sud",
        contact_person: "Johan Van Der Merwe",
        email: "sales@atlasmining.co.za",
        phone: "+27 11 892 4000",
        address: "Boksburg, Johannesburg, RSA",
        notes: "Fournisseur d'équipements miniers lourds et pièces d'usure",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "a0000000-0000-0000-0000-000000000002",
        code: "FOURN-SCH",
        name: "Schneider Electric Distribution RDC",
        country: "RDC",
        contact_person: "Marc Kabongo",
        email: "contact.rdc@se.com",
        phone: "+243 81 700 8900",
        address: "Kinshasa / Lubumbashi, RDC",
        notes: "Disjoncteurs industriels, variateurs et automatismes",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "a0000000-0000-0000-0000-000000000003",
        code: "FOURN-KAT",
        name: "Katanga Industrial Piping SARL",
        country: "RDC",
        contact_person: "Serge Ilunga",
        email: "serge@katangapiping.cd",
        phone: "+243 99 450 1122",
        address: "Route Likasi, Lubumbashi",
        notes: "Tuyauterie PEHD, vannes papillon et raccords industriels",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    clients: [
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
        created_at: now,
        updated_at: now,
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
        created_at: now,
        updated_at: now,
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
        created_at: now,
        updated_at: now,
      },
    ],
    client_quotation_sequences: [
      {
        id: crypto.randomUUID(),
        client_id: "b0000000-0000-0000-0000-000000000001",
        year: 2026,
        last_sequence: 1,
        created_at: now,
        updated_at: now,
      },
    ],
    items: [
      {
        id: "c0000000-0000-0000-0000-000000000001",
        sku_ref: "ROB-VAN-DN100",
        description: "Vanne papillon PN16 DN100 avec réducteur manuel et volant",
        category: "Plomberie & Robinetterie",
        unit: "Pce",
        brand: "KSB",
        supplier_id: "a0000000-0000-0000-0000-000000000003",
        purchase_price: 185.0,
        selling_price: 245.0,
        currency: "USD",
        stock_quantity: 12.0,
        min_stock_level: 3.0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c0000000-0000-0000-0000-000000000002",
        sku_ref: "ELEC-DISJ-160A",
        description: "Disjoncteur Compact NSX160F 3P 160A 36kA déclencheur TMD",
        category: "Électromécanique",
        unit: "Pce",
        brand: "Schneider Electric",
        supplier_id: "a0000000-0000-0000-0000-000000000002",
        purchase_price: 320.0,
        selling_price: 420.0,
        currency: "USD",
        stock_quantity: 6.0,
        min_stock_level: 2.0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c0000000-0000-0000-0000-000000000003",
        sku_ref: "TUY-PEHD-110",
        description: "Tube PEHD 100 PN16 diamètre extérieur 110mm (couronne de 50m)",
        category: "Tuyauterie Industrielle",
        unit: "Rouleau",
        brand: "Plasson",
        supplier_id: "a0000000-0000-0000-0000-000000000003",
        purchase_price: 450.0,
        selling_price: 580.0,
        currency: "USD",
        stock_quantity: 8.0,
        min_stock_level: 2.0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c0000000-0000-0000-0000-000000000004",
        sku_ref: "EPI-CASQ-VENT",
        description: "Casque de sécurité ventilé avec harnais à crémaillère EN397",
        category: "Sécurité & EPI",
        unit: "Pce",
        brand: "Delta Plus",
        supplier_id: null,
        purchase_price: 12.5,
        selling_price: 18.0,
        currency: "USD",
        stock_quantity: 80.0,
        min_stock_level: 20.0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "c0000000-0000-0000-0000-000000000005",
        sku_ref: "MIN-POMP-GARN",
        description: "Garniture mécanique simple pour pompe centrifuge Warman 6/4",
        category: "Mines & Broyage",
        unit: "Kit",
        brand: "Weir Minerals",
        supplier_id: "a0000000-0000-0000-0000-000000000001",
        purchase_price: 650.0,
        selling_price: 890.0,
        currency: "USD",
        stock_quantity: 4.0,
        min_stock_level: 1.0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    quotations: [
      {
        id: "d0000000-0000-0000-0000-000000000001",
        client_id: "b0000000-0000-0000-0000-000000000001",
        doc_type: "QUOTATION",
        client_rfq_number: "RFQ-KCC-2026-042",
        internal_reference: "MIS/DEV/CLI-KCC/2026/001",
        sequence_number: 1,
        year: 2026,
        document_date: today,
        validity_date: in30Days,
        status: "VALIDATED",
        currency: "USD",
        subtotal: 910.0,
        vat_rate: 16.0,
        vat_amount: 145.6,
        total: 1055.6,
        payment_terms: "30 jours net après réception",
        delivery_lead_time: "2 à 3 semaines sur site Kolwezi",
        notes: "Fourniture de vannes et disjoncteurs pour extension atelier KCC",
        cancellation_reason: null,
        created_by: "11111111-1111-1111-1111-111111111111",
        updated_by: null,
        created_at: now,
        updated_at: now,
      },
    ],
    quotation_items: [
      {
        id: "e0000000-0000-0000-0000-000000000001",
        quotation_id: "d0000000-0000-0000-0000-000000000001",
        item_id: "c0000000-0000-0000-0000-000000000001",
        line_number: 1,
        description_snapshot: "Vanne papillon PN16 DN100 avec réducteur manuel et volant",
        unit_snapshot: "Pce",
        quantity: 2,
        unit_price_snapshot: 245.0,
        discount_percent: 0,
        line_subtotal: 490.0,
      },
      {
        id: "e0000000-0000-0000-0000-000000000002",
        quotation_id: "d0000000-0000-0000-0000-000000000001",
        item_id: "c0000000-0000-0000-0000-000000000002",
        line_number: 2,
        description_snapshot: "Disjoncteur Compact NSX160F 3P 160A 36kA déclencheur TMD",
        unit_snapshot: "Pce",
        quantity: 1,
        unit_price_snapshot: 420.0,
        discount_percent: 0,
        line_subtotal: 420.0,
      },
    ],
    orders: [
      {
        id: "f0000000-0000-0000-0000-000000000001",
        order_number: "MIS/BC/2026/001",
        client_id: "b0000000-0000-0000-0000-000000000001",
        quotation_id: "d0000000-0000-0000-0000-000000000001",
        client_po_number: "PO-KCC-88910",
        po_date: today,
        expected_delivery_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        status: "CONFIRMED",
        currency: "USD",
        subtotal: 910.0,
        vat_rate: 16.0,
        vat_amount: 145.6,
        total: 1055.6,
        notes: "Livraison au magasin central KCC Kolwezi",
        cancellation_reason: null,
        created_by: "11111111-1111-1111-1111-111111111111",
        updated_by: null,
        created_at: now,
        updated_at: now,
      },
    ],
    order_items: [
      {
        id: crypto.randomUUID(),
        order_id: "f0000000-0000-0000-0000-000000000001",
        quotation_item_id: "e0000000-0000-0000-0000-000000000001",
        item_id: "c0000000-0000-0000-0000-000000000001",
        line_number: 1,
        description_snapshot: "Vanne papillon PN16 DN100 avec réducteur manuel et volant",
        unit_snapshot: "Pce",
        quantity_ordered: 2,
        quantity_delivered: 0,
        unit_price_snapshot: 245.0,
        line_subtotal: 490.0,
      },
      {
        id: crypto.randomUUID(),
        order_id: "f0000000-0000-0000-0000-000000000001",
        quotation_item_id: "e0000000-0000-0000-0000-000000000002",
        item_id: "c0000000-0000-0000-0000-000000000002",
        line_number: 2,
        description_snapshot: "Disjoncteur Compact NSX160F 3P 160A 36kA déclencheur TMD",
        unit_snapshot: "Pce",
        quantity_ordered: 1,
        quantity_delivered: 0,
        unit_price_snapshot: 420.0,
        line_subtotal: 420.0,
      },
    ],
    invoices: [
      {
        id: "10000000-0000-0000-0000-000000000001",
        invoice_number: "MIS/FAC/2026/001",
        client_id: "b0000000-0000-0000-0000-000000000001",
        order_id: "f0000000-0000-0000-0000-000000000001",
        quotation_id: "d0000000-0000-0000-0000-000000000001",
        issue_date: today,
        due_date: in30Days,
        status: "ISSUED",
        currency: "USD",
        subtotal: 910.0,
        vat_rate: 16.0,
        vat_amount: 145.6,
        total: 1055.6,
        paid_amount: 0.0,
        balance_due: 1055.6,
        payment_terms: "30_DAYS",
        notes: null,
        cancellation_reason: null,
        created_by: "11111111-1111-1111-1111-111111111111",
        updated_by: null,
        created_at: now,
        updated_at: now,
      },
    ],
    invoice_items: [
      {
        id: crypto.randomUUID(),
        invoice_id: "10000000-0000-0000-0000-000000000001",
        order_item_id: null,
        item_id: "c0000000-0000-0000-0000-000000000001",
        line_number: 1,
        description_snapshot: "Vanne papillon PN16 DN100 avec réducteur manuel et volant",
        unit_snapshot: "Pce",
        quantity: 2,
        unit_price_snapshot: 245.0,
        line_subtotal: 490.0,
      },
    ],
    payments: [],
    payment_allocations: [],
    audit_logs: [
      {
        id: crypto.randomUUID(),
        user_id: "11111111-1111-1111-1111-111111111111",
        action: "SYSTEM_INITIALIZED",
        entity_type: "SYSTEM",
        entity_id: "SYSTEM",
        details: { message: "Système de gestion MIS SARL prêt" },
        ip_address: "127.0.0.1",
        created_at: now,
      },
    ],
    schema_migrations: [
      {
        id: 1,
        version: "001",
        name: "001_initial_schema.sql",
        applied_at: now,
      },
      {
        id: 2,
        version: "002",
        name: "002_seed_data.sql",
        applied_at: now,
      },
    ],
  };
}

const mockDb: MockDb = globalForDb.__mockDbInstance || (globalForDb.__mockDbInstance = createInitialMockDb());

// ----------------------------------------------------------------------------
// SQL Query Mock Dispatcher
// Evaluates all application queries against in-memory state
// ----------------------------------------------------------------------------

function executeMockQuery(query: string, params: unknown[]): unknown[] {
  const q = query.replace(/\s+/g, " ").trim();

  // 1. SELECT version()
  if (/^SELECT\s+version\(\)/i.test(q)) {
    return [{ version: "PostgreSQL 16.0 (MIS SARL In-Memory)" }];
  }

  // 2. schema_migrations
  if (/FROM\s+schema_migrations/i.test(q)) {
    if (/^SELECT/i.test(q)) {
      return [...mockDb.schema_migrations].sort((a, b) => a.version.localeCompare(b.version));
    }
    return [];
  }

  // 3. users & sessions
  if (/FROM\s+sessions\s+s\s+JOIN\s+users\s+u/i.test(q)) {
    const tokenHash = params[0] as string;
    const now = new Date();
    const session = mockDb.sessions.find(
      (s) => s.token_hash === tokenHash && new Date(s.expires_at) > now
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

  if (/INSERT\s+INTO\s+sessions/i.test(q)) {
    const [userId, tokenHash, ip, userAgent, expiresAt] = params as [
      string,
      string,
      string | null,
      string | null,
      string
    ];
    mockDb.sessions.push({
      id: crypto.randomUUID(),
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
    return [];
  }

  if (/DELETE\s+FROM\s+sessions/i.test(q)) {
    const tokenHash = params[0] as string;
    mockDb.sessions = mockDb.sessions.filter((s) => s.token_hash !== tokenHash);
    return [];
  }

  if (/UPDATE\s+users\s+SET\s+last_login_at\s*=\s*NOW\(\)/i.test(q)) {
    const userId = params[0] as string;
    const u = mockDb.users.find((x) => x.id === userId);
    if (u) {
      u.last_login_at = new Date().toISOString();
      u.updated_at = new Date().toISOString();
    }
    return [];
  }

  if (/FROM\s+users/i.test(q) && /^SELECT/i.test(q)) {
    if (/LOWER\(email\)\s*=\s*LOWER\(/i.test(q)) {
      const email = String(params[0] || "").toLowerCase();
      const u = mockDb.users.find((x) => x.email.toLowerCase() === email);
      if (!u) return [];
      return [
        {
          id: u.id,
          email: u.email,
          passwordHash: u.password_hash,
          fullName: u.full_name,
          role: u.role,
          isActive: u.is_active,
          lastLoginAt: u.last_login_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        },
      ];
    }
    if (/WHERE\s+id\s*=/i.test(q)) {
      const id = params[0] as string;
      const u = mockDb.users.find((x) => x.id === id);
      if (!u) return [];
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
    return mockDb.users
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (/INSERT\s+INTO\s+users/i.test(q)) {
    const [email, passwordHash, fullName, role] = params as [string, string, string, string];
    const now = new Date().toISOString();
    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name: fullName,
      role,
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };
    mockDb.users.push(newUser);
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

  if (/UPDATE\s+users/i.test(q)) {
    if (/password_hash/i.test(q) && params.length === 2) {
      const [passwordHash, id] = params as [string, string];
      const u = mockDb.users.find((x) => x.id === id);
      if (u) u.password_hash = passwordHash;
      return [];
    }
    const [fullName, role, isActive, id] = params as [string | null, string | null, boolean | null, string];
    const u = mockDb.users.find((x) => x.id === id);
    if (!u) return [];
    if (fullName) u.full_name = fullName;
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

  // 4. clients
  if (/INSERT\s+INTO\s+client_quotation_sequences/i.test(q)) {
    const [clientId, year] = params as [string, number];
    let seq = mockDb.client_quotation_sequences.find((s) => s.client_id === clientId && s.year === year);
    if (!seq) {
      seq = {
        id: crypto.randomUUID(),
        client_id: clientId,
        year,
        last_sequence: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.client_quotation_sequences.push(seq);
    } else {
      seq.last_sequence += 1;
      seq.updated_at = new Date().toISOString();
    }
    return [{ lastSequence: seq.last_sequence }];
  }

  if (/FROM\s+clients/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+id\s*=/i.test(q)) {
      const id = params[0] as string;
      const c = mockDb.clients.find((x) => x.id === id);
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
    let list = mockDb.clients;
    if (params.length > 0 && typeof params[0] === "string" && params[0].startsWith("%")) {
      const term = params[0].replace(/%/g, "").toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term) ||
          (c.contact_person && c.contact_person.toLowerCase().includes(term)) ||
          (c.email && c.email.toLowerCase().includes(term))
      );
    }
    return list
      .map((c) => ({
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
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (/INSERT\s+INTO\s+clients/i.test(q)) {
    const [code, name, contactPerson, email, phone, billingAddress, deliveryAddress, taxId, paymentTerms, currency] =
      params as [string, string, string | null, string | null, string | null, string | null, string | null, string | null, string, string];
    const now = new Date().toISOString();
    const newClient = {
      id: crypto.randomUUID(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      contact_person: contactPerson,
      email,
      phone,
      billing_address: billingAddress,
      delivery_address: deliveryAddress,
      tax_id: taxId,
      payment_terms: paymentTerms || "30_DAYS",
      currency: currency || "USD",
      is_active: true,
      created_at: now,
      updated_at: now,
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

  if (/UPDATE\s+clients/i.test(q)) {
    const [name, contactPerson, email, phone, billingAddress, deliveryAddress, taxId, paymentTerms, currency, isActive, id] =
      params as [string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, boolean | null, string];
    const c = mockDb.clients.find((x) => x.id === id);
    if (!c) return [];
    if (name) c.name = name;
    if (contactPerson !== null) c.contact_person = contactPerson;
    if (email !== null) c.email = email;
    if (phone !== null) c.phone = phone;
    if (billingAddress !== null) c.billing_address = billingAddress;
    if (deliveryAddress !== null) c.delivery_address = deliveryAddress;
    if (taxId !== null) c.tax_id = taxId;
    if (paymentTerms) c.payment_terms = paymentTerms;
    if (currency) c.currency = currency;
    if (isActive !== null && isActive !== undefined) c.is_active = isActive;
    c.updated_at = new Date().toISOString();
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

  // 5. suppliers
  if (/FROM\s+suppliers/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+id\s*=/i.test(q)) {
      const id = params[0] as string;
      const s = mockDb.suppliers.find((x) => x.id === id);
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
    let list = mockDb.suppliers;
    if (params.length > 0 && typeof params[0] === "string" && params[0].startsWith("%")) {
      const term = params[0].replace(/%/g, "").toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          (s.country && s.country.toLowerCase().includes(term)) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(term))
      );
    }
    return list
      .map((s) => ({
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
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (/INSERT\s+INTO\s+suppliers/i.test(q)) {
    const [code, name, country, contactPerson, email, phone, address, notes] = params as [
      string,
      string,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null
    ];
    const now = new Date().toISOString();
    const newSup = {
      id: crypto.randomUUID(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      country,
      contact_person: contactPerson,
      email,
      phone,
      address,
      notes,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    mockDb.suppliers.push(newSup);
    return [
      {
        id: newSup.id,
        code: newSup.code,
        name: newSup.name,
        country: newSup.country,
        contactPerson: newSup.contact_person,
        email: newSup.email,
        phone: newSup.phone,
        address: newSup.address,
        notes: newSup.notes,
        isActive: newSup.is_active,
        createdAt: newSup.created_at,
        updatedAt: newSup.updated_at,
      },
    ];
  }

  if (/UPDATE\s+suppliers/i.test(q)) {
    const [name, country, contactPerson, email, phone, address, notes, isActive, id] = params as [
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      boolean | null,
      string
    ];
    const s = mockDb.suppliers.find((x) => x.id === id);
    if (!s) return [];
    if (name) s.name = name;
    if (country !== null) s.country = country;
    if (contactPerson !== null) s.contact_person = contactPerson;
    if (email !== null) s.email = email;
    if (phone !== null) s.phone = phone;
    if (address !== null) s.address = address;
    if (notes !== null) s.notes = notes;
    if (isActive !== null && isActive !== undefined) s.is_active = isActive;
    s.updated_at = new Date().toISOString();
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

  // 6. items
  if (/FROM\s+items/i.test(q) && /COUNT\(\*\)::int/i.test(q)) {
    const total = mockDb.items.filter((i) => i.is_active).length;
    const cats = new Set(mockDb.items.filter((i) => i.is_active && i.category).map((i) => i.category)).size;
    return [{ total, categories: cats }];
  }

  if (/FROM\s+items/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+i\.id\s*=/i.test(q)) {
      const id = params[0] as string;
      const item = mockDb.items.find((x) => x.id === id);
      if (!item) return [];
      const sup = item.supplier_id ? mockDb.suppliers.find((s) => s.id === item.supplier_id) : null;
      return [
        {
          id: item.id,
          skuRef: item.sku_ref,
          description: item.description,
          category: item.category,
          unit: item.unit,
          brand: item.brand,
          supplierId: item.supplier_id,
          supplierName: sup ? sup.name : null,
          purchasePrice: item.purchase_price,
          sellingPrice: item.selling_price,
          currency: item.currency,
          stockQuantity: item.stock_quantity,
          minStockLevel: item.min_stock_level,
          isActive: item.is_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        },
      ];
    }
    const [searchTerm, category, supplierId, activeOnly] = params as [
      string | null,
      string | null,
      string | null,
      boolean
    ];
    let list = mockDb.items;
    if (activeOnly !== false) {
      list = list.filter((i) => i.is_active);
    }
    if (category) {
      list = list.filter((i) => i.category === category);
    }
    if (supplierId) {
      list = list.filter((i) => i.supplier_id === supplierId);
    }
    if (searchTerm) {
      const term = searchTerm.replace(/%/g, "").toLowerCase();
      list = list.filter((i) => {
        const sup = i.supplier_id ? mockDb.suppliers.find((s) => s.id === i.supplier_id) : null;
        return (
          i.description.toLowerCase().includes(term) ||
          i.sku_ref.toLowerCase().includes(term) ||
          (i.brand && i.brand.toLowerCase().includes(term)) ||
          (sup && sup.name.toLowerCase().includes(term))
        );
      });
    }
    return list
      .map((item) => {
        const sup = item.supplier_id ? mockDb.suppliers.find((s) => s.id === item.supplier_id) : null;
        return {
          id: item.id,
          skuRef: item.sku_ref,
          description: item.description,
          category: item.category,
          unit: item.unit,
          brand: item.brand,
          supplierId: item.supplier_id,
          supplierName: sup ? sup.name : null,
          purchasePrice: item.purchase_price,
          sellingPrice: item.selling_price,
          currency: item.currency,
          stockQuantity: item.stock_quantity,
          minStockLevel: item.min_stock_level,
          isActive: item.is_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      })
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.description.localeCompare(b.description));
  }

  if (/INSERT\s+INTO\s+items/i.test(q)) {
    const [skuRef, description, category, unit, brand, supplierId, purchasePrice, sellingPrice, currency, stockQuantity, minStockLevel] =
      params as [string, string, string | null, string, string | null, string | null, number, number, string, number, number];
    const now = new Date().toISOString();
    const newItem = {
      id: crypto.randomUUID(),
      sku_ref: skuRef.trim().toUpperCase(),
      description: description.trim(),
      category: category?.trim() || null,
      unit: unit.trim(),
      brand: brand?.trim() || null,
      supplier_id: supplierId || null,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      currency: currency || "USD",
      stock_quantity: stockQuantity ?? 0,
      min_stock_level: minStockLevel ?? 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    mockDb.items.push(newItem);
    return [
      {
        id: newItem.id,
        skuRef: newItem.sku_ref,
        description: newItem.description,
        category: newItem.category,
        unit: newItem.unit,
        brand: newItem.brand,
        supplierId: newItem.supplier_id,
        purchasePrice: newItem.purchase_price,
        sellingPrice: newItem.selling_price,
        currency: newItem.currency,
        stockQuantity: newItem.stock_quantity,
        minStockLevel: newItem.min_stock_level,
        isActive: newItem.is_active,
        createdAt: newItem.created_at,
        updatedAt: newItem.updated_at,
      },
    ];
  }

  if (/UPDATE\s+items/i.test(q)) {
    const [skuRef, description, category, unit, brand, supplierId, purchasePrice, sellingPrice, currency, stockQuantity, minStockLevel, isActive, id] =
      params as [
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number | null,
        number | null,
        string | null,
        number | null,
        number | null,
        boolean | null,
        string
      ];
    const item = mockDb.items.find((x) => x.id === id);
    if (!item) return [];
    if (skuRef) item.sku_ref = skuRef.toUpperCase();
    if (description) item.description = description;
    if (category !== undefined && category !== null) item.category = category;
    if (unit) item.unit = unit;
    if (brand !== undefined) item.brand = brand;
    if (supplierId !== undefined) item.supplier_id = supplierId;
    if (purchasePrice !== null && purchasePrice !== undefined) item.purchase_price = purchasePrice;
    if (sellingPrice !== null && sellingPrice !== undefined) item.selling_price = sellingPrice;
    if (currency) item.currency = currency;
    if (stockQuantity !== null && stockQuantity !== undefined) item.stock_quantity = stockQuantity;
    if (minStockLevel !== null && minStockLevel !== undefined) item.min_stock_level = minStockLevel;
    if (isActive !== null && isActive !== undefined) item.is_active = isActive;
    item.updated_at = new Date().toISOString();
    return [
      {
        id: item.id,
        skuRef: item.sku_ref,
        description: item.description,
        category: item.category,
        unit: item.unit,
        brand: item.brand,
        supplierId: item.supplier_id,
        purchasePrice: item.purchase_price,
        sellingPrice: item.selling_price,
        currency: item.currency,
        stockQuantity: item.stock_quantity,
        minStockLevel: item.min_stock_level,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
    ];
  }

  // 7. quotations
  if (/FROM\s+quotations/i.test(q) && /COUNT\(\*\)::int/i.test(q)) {
    const activeQuotes = mockDb.quotations.filter((q) => q.status !== "CANCELLED");
    const total = activeQuotes.length;
    const validated = activeQuotes.filter((q) => q.status === "VALIDATED").length;
    const totalAmount = activeQuotes.reduce((acc, cur) => acc + cur.total, 0);
    return [{ total, validated, total_amount: totalAmount }];
  }

  if (/FROM\s+quotation_items/i.test(q) && /^SELECT/i.test(q)) {
    const quoteId = params[0] as string;
    return mockDb.quotation_items
      .filter((qi) => qi.quotation_id === quoteId)
      .sort((a, b) => a.line_number - b.line_number)
      .map((qi) => ({
        id: qi.id,
        itemId: qi.item_id,
        lineNumber: qi.line_number,
        description: qi.description_snapshot,
        unit: qi.unit_snapshot,
        quantity: qi.quantity,
        unitPrice: qi.unit_price_snapshot,
        discountPercent: qi.discount_percent,
        lineSubtotal: qi.line_subtotal,
      }));
  }

  if (/FROM\s+quotations\s+q/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+q\.id\s*=/i.test(q)) {
      const id = params[0] as string;
      const qRec = mockDb.quotations.find((x) => x.id === id);
      if (!qRec) return [];
      const client = mockDb.clients.find((c) => c.id === qRec.client_id);
      const user = mockDb.users.find((u) => u.id === qRec.created_by);
      return [
        {
          id: qRec.id,
          clientId: qRec.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          clientEmail: client?.email,
          clientPhone: client?.phone,
          clientBillingAddress: client?.billing_address,
          docType: qRec.doc_type,
          clientRfqNumber: qRec.client_rfq_number,
          internalReference: qRec.internal_reference,
          sequenceNumber: qRec.sequence_number,
          year: qRec.year,
          documentDate: qRec.document_date,
          validityDate: qRec.validity_date,
          status: qRec.status,
          currency: qRec.currency,
          subtotal: qRec.subtotal,
          vatRate: qRec.vat_rate,
          vatAmount: qRec.vat_amount,
          total: qRec.total,
          paymentTerms: qRec.payment_terms,
          deliveryLeadTime: qRec.delivery_lead_time,
          notes: qRec.notes,
          cancellationReason: qRec.cancellation_reason,
          createdBy: qRec.created_by,
          createdByName: user?.full_name,
          createdAt: qRec.created_at,
          updatedAt: qRec.updated_at,
        },
      ];
    }
    const [clientId, status, docType, searchTerm] = params as [
      string | null,
      string | null,
      string | null,
      string | null
    ];
    let list = mockDb.quotations;
    if (clientId) list = list.filter((x) => x.client_id === clientId);
    if (status) list = list.filter((x) => x.status === status);
    if (docType) list = list.filter((x) => x.doc_type === docType);
    if (searchTerm) {
      const term = searchTerm.replace(/%/g, "").toLowerCase();
      list = list.filter((x) => {
        const client = mockDb.clients.find((c) => c.id === x.client_id);
        return (
          x.internal_reference.toLowerCase().includes(term) ||
          (x.client_rfq_number && x.client_rfq_number.toLowerCase().includes(term)) ||
          (client && client.name.toLowerCase().includes(term))
        );
      });
    }
    return list
      .map((qRec) => {
        const client = mockDb.clients.find((c) => c.id === qRec.client_id);
        const user = mockDb.users.find((u) => u.id === qRec.created_by);
        return {
          id: qRec.id,
          clientId: qRec.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          client_name: client?.name,
          clientEmail: client?.email,
          clientPhone: client?.phone,
          clientBillingAddress: client?.billing_address,
          docType: qRec.doc_type,
          clientRfqNumber: qRec.client_rfq_number,
          internalReference: qRec.internal_reference,
          internal_reference: qRec.internal_reference,
          sequenceNumber: qRec.sequence_number,
          year: qRec.year,
          documentDate: qRec.document_date,
          document_date: qRec.document_date,
          validityDate: qRec.validity_date,
          status: qRec.status,
          currency: qRec.currency,
          subtotal: qRec.subtotal,
          vatRate: qRec.vat_rate,
          vatAmount: qRec.vat_amount,
          total: qRec.total,
          paymentTerms: qRec.payment_terms,
          deliveryLeadTime: qRec.delivery_lead_time,
          notes: qRec.notes,
          cancellationReason: qRec.cancellation_reason,
          createdBy: qRec.created_by,
          createdByName: user?.full_name,
          createdAt: qRec.created_at,
          updatedAt: qRec.updated_at,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (/INSERT\s+INTO\s+quotations/i.test(q)) {
    const [
      clientId,
      docType,
      rfqNumber,
      internalRef,
      seqNumber,
      year,
      validityDate,
      subtotal,
      vatRate,
      vatAmount,
      total,
      paymentTerms,
      leadTime,
      notes,
      userId,
    ] = params as [
      string,
      string,
      string | null,
      string,
      number,
      number,
      string,
      number,
      number,
      number,
      number,
      string | null,
      string | null,
      string | null,
      string
    ];
    const now = new Date().toISOString();
    const newQuote = {
      id: crypto.randomUUID(),
      client_id: clientId,
      doc_type: docType,
      client_rfq_number: rfqNumber,
      internal_reference: internalRef,
      sequence_number: seqNumber,
      year,
      document_date: now.split("T")[0],
      validity_date: validityDate,
      status: "DRAFT",
      currency: "USD",
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      payment_terms: paymentTerms,
      delivery_lead_time: leadTime,
      notes,
      cancellation_reason: null,
      created_by: userId,
      updated_by: null,
      created_at: now,
      updated_at: now,
    };
    mockDb.quotations.push(newQuote);
    return [{ id: newQuote.id }];
  }

  if (/INSERT\s+INTO\s+quotation_items/i.test(q)) {
    const [quotationId, itemId, lineNum, desc, unit, qty, price, disc, subtotal] = params as [
      string,
      string | null,
      number,
      string,
      string,
      number,
      number,
      number,
      number
    ];
    mockDb.quotation_items.push({
      id: crypto.randomUUID(),
      quotation_id: quotationId,
      item_id: itemId,
      line_number: lineNum,
      description_snapshot: desc,
      unit_snapshot: unit,
      quantity: qty,
      unit_price_snapshot: price,
      discount_percent: disc,
      line_subtotal: subtotal,
    });
    return [];
  }

  if (/UPDATE\s+quotations/i.test(q)) {
    const [status, cancelReason, userId, id] = params as [string, string | null, string, string];
    const quote = mockDb.quotations.find((x) => x.id === id);
    if (quote) {
      quote.status = status;
      if (cancelReason) quote.cancellation_reason = cancelReason;
      quote.updated_by = userId;
      quote.updated_at = new Date().toISOString();
    }
    return [];
  }

  // 8. orders
  if (/FROM\s+orders/i.test(q) && /COUNT\(\*\)::int/i.test(q)) {
    if (/EXTRACT\(YEAR/i.test(q)) {
      const year = params[0] as number;
      const count = mockDb.orders.filter((o) => new Date(o.created_at).getFullYear() === year).length;
      return [{ count }];
    }
    const activeOrders = mockDb.orders.filter((o) => o.status !== "CANCELLED");
    const total = activeOrders.length;
    const active = activeOrders.filter((o) => o.status === "CONFIRMED").length;
    const totalAmount = activeOrders.reduce((acc, cur) => acc + cur.total, 0);
    return [{ total, active, total_amount: totalAmount }];
  }

  if (/FROM\s+order_items/i.test(q) && /^SELECT/i.test(q)) {
    const orderId = params[0] as string;
    return mockDb.order_items
      .filter((oi) => oi.order_id === orderId)
      .sort((a, b) => a.line_number - b.line_number)
      .map((oi) => ({
        id: oi.id,
        quotationItemId: oi.quotation_item_id,
        itemId: oi.item_id,
        lineNumber: oi.line_number,
        description: oi.description_snapshot,
        unit: oi.unit_snapshot,
        quantityOrdered: oi.quantity_ordered,
        quantityDelivered: oi.quantity_delivered,
        unitPrice: oi.unit_price_snapshot,
        lineTotal: oi.line_subtotal,
      }));
  }

  if (/FROM\s+orders\s+o/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+o\.id\s*=/i.test(q)) {
      const id = params[0] as string;
      const o = mockDb.orders.find((x) => x.id === id);
      if (!o) return [];
      const client = mockDb.clients.find((c) => c.id === o.client_id);
      const quote = mockDb.quotations.find((q) => q.id === o.quotation_id);
      const user = mockDb.users.find((u) => u.id === o.created_by);
      return [
        {
          id: o.id,
          orderNumber: o.order_number,
          clientId: o.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          clientEmail: client?.email,
          clientPhone: client?.phone,
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
          cancellationReason: o.cancellation_reason,
          createdBy: o.created_by,
          createdByName: user?.full_name,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        },
      ];
    }
    const [clientId, status, searchTerm] = params as [string | null, string | null, string | null];
    let list = mockDb.orders;
    if (clientId) list = list.filter((x) => x.client_id === clientId);
    if (status) list = list.filter((x) => x.status === status);
    if (searchTerm) {
      const term = searchTerm.replace(/%/g, "").toLowerCase();
      list = list.filter((x) => {
        const client = mockDb.clients.find((c) => c.id === x.client_id);
        return (
          x.order_number.toLowerCase().includes(term) ||
          x.client_po_number.toLowerCase().includes(term) ||
          (client && client.name.toLowerCase().includes(term))
        );
      });
    }
    return list
      .map((o) => {
        const client = mockDb.clients.find((c) => c.id === o.client_id);
        const quote = mockDb.quotations.find((q) => q.id === o.quotation_id);
        const user = mockDb.users.find((u) => u.id === o.created_by);
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
          cancellationReason: o.cancellation_reason,
          createdBy: o.created_by,
          createdByName: user?.full_name,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (/INSERT\s+INTO\s+orders/i.test(q)) {
    const [orderNumber, clientId, quoteId, poNumber, deliveryDate, currency, subtotal, vatRate, vatAmount, total, notes, userId] =
      params as [
        string,
        string,
        string,
        string,
        string | null,
        string,
        number,
        number,
        number,
        number,
        string | null,
        string
      ];
    const now = new Date().toISOString();
    const newOrder = {
      id: crypto.randomUUID(),
      order_number: orderNumber,
      client_id: clientId,
      quotation_id: quoteId,
      client_po_number: poNumber,
      po_date: now.split("T")[0],
      expected_delivery_date: deliveryDate,
      status: "CONFIRMED",
      currency,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      notes,
      cancellation_reason: null,
      created_by: userId,
      updated_by: null,
      created_at: now,
      updated_at: now,
    };
    mockDb.orders.push(newOrder);
    return [{ id: newOrder.id }];
  }

  if (/INSERT\s+INTO\s+order_items/i.test(q)) {
    const [orderId, quoteItemId, itemId, lineNum, desc, unit, qtyOrdered, qtyDelivered, price, lineSubtotal] =
      params as [string, string | null, string | null, number, string, string, number, number, number, number];
    mockDb.order_items.push({
      id: crypto.randomUUID(),
      order_id: orderId,
      quotation_item_id: quoteItemId,
      item_id: itemId,
      line_number: lineNum,
      description_snapshot: desc,
      unit_snapshot: unit,
      quantity_ordered: qtyOrdered,
      quantity_delivered: qtyDelivered,
      unit_price_snapshot: price,
      line_subtotal: lineSubtotal,
    });
    return [];
  }

  if (/UPDATE\s+orders/i.test(q)) {
    const [status, cancelReason, userId, id] = params as [string, string | null, string, string];
    const o = mockDb.orders.find((x) => x.id === id);
    if (o) {
      o.status = status;
      if (cancelReason) o.cancellation_reason = cancelReason;
      o.updated_by = userId;
      o.updated_at = new Date().toISOString();
    }
    return [];
  }

  // 9. invoices
  if (/FROM\s+invoices/i.test(q) && /COUNT\(\*\)::int/i.test(q)) {
    if (/EXTRACT\(YEAR/i.test(q)) {
      const year = params[0] as number;
      const count = mockDb.invoices.filter((inv) => new Date(inv.created_at).getFullYear() === year).length;
      return [{ count }];
    }
    const activeInvoices = mockDb.invoices.filter((inv) => inv.status !== "CANCELLED");
    const total = activeInvoices.length;
    const totalInvoiced = activeInvoices.reduce((acc, cur) => acc + cur.total, 0);
    const totalReceivables = activeInvoices.reduce((acc, cur) => acc + cur.balance_due, 0);
    const unpaidCount = activeInvoices.filter((inv) => inv.balance_due > 0).length;
    return [{ total, total_invoiced: totalInvoiced, total_receivables: totalReceivables, unpaid_count: unpaidCount }];
  }

  if (/FROM\s+invoice_items/i.test(q) && /^SELECT/i.test(q)) {
    const invoiceId = params[0] as string;
    return mockDb.invoice_items
      .filter((ii) => ii.invoice_id === invoiceId)
      .sort((a, b) => a.line_number - b.line_number)
      .map((ii) => ({
        id: ii.id,
        orderItemId: ii.order_item_id,
        itemId: ii.item_id,
        lineNumber: ii.line_number,
        description: ii.description_snapshot,
        unit: ii.unit_snapshot,
        quantity: ii.quantity,
        unitPrice: ii.unit_price_snapshot,
        lineSubtotal: ii.line_subtotal,
      }));
  }

  if (/FROM\s+invoices\s+i/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+i\.id\s*=/i.test(q)) {
      const id = params[0] as string;
      const inv = mockDb.invoices.find((x) => x.id === id);
      if (!inv) return [];
      const client = mockDb.clients.find((c) => c.id === inv.client_id);
      const order = inv.order_id ? mockDb.orders.find((o) => o.id === inv.order_id) : null;
      const quote = inv.quotation_id ? mockDb.quotations.find((q) => q.id === inv.quotation_id) : null;
      const user = mockDb.users.find((u) => u.id === inv.created_by);
      return [
        {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          clientId: inv.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          clientEmail: client?.email,
          clientPhone: client?.phone,
          clientBillingAddress: client?.billing_address,
          clientTaxId: client?.tax_id,
          orderId: inv.order_id,
          orderNumber: order?.order_number,
          clientPoNumber: order?.client_po_number,
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
          cancellationReason: inv.cancellation_reason,
          createdBy: inv.created_by,
          createdByName: user?.full_name,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        },
      ];
    }
    const [clientId, status, searchTerm] = params as [string | null, string | null, string | null];
    let list = mockDb.invoices;
    if (clientId) list = list.filter((x) => x.client_id === clientId);
    if (status) list = list.filter((x) => x.status === status);
    if (searchTerm) {
      const term = searchTerm.replace(/%/g, "").toLowerCase();
      list = list.filter((x) => {
        const client = mockDb.clients.find((c) => c.id === x.client_id);
        const order = x.order_id ? mockDb.orders.find((o) => o.id === x.order_id) : null;
        return (
          x.invoice_number.toLowerCase().includes(term) ||
          (client && client.name.toLowerCase().includes(term)) ||
          (order && order.order_number.toLowerCase().includes(term))
        );
      });
    }
    return list
      .map((inv) => {
        const client = mockDb.clients.find((c) => c.id === inv.client_id);
        const order = inv.order_id ? mockDb.orders.find((o) => o.id === inv.order_id) : null;
        const quote = inv.quotation_id ? mockDb.quotations.find((q) => q.id === inv.quotation_id) : null;
        const user = mockDb.users.find((u) => u.id === inv.created_by);
        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          invoice_number: inv.invoice_number,
          clientId: inv.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          client_name: client?.name,
          orderId: inv.order_id,
          orderNumber: order?.order_number,
          quotationId: inv.quotation_id,
          quotationReference: quote?.internal_reference,
          issueDate: inv.issue_date,
          issue_date: inv.issue_date,
          dueDate: inv.due_date,
          due_date: inv.due_date,
          status: inv.status,
          currency: inv.currency,
          subtotal: inv.subtotal,
          vatRate: inv.vat_rate,
          vatAmount: inv.vat_amount,
          total: inv.total,
          paidAmount: inv.paid_amount,
          balanceDue: inv.balance_due,
          balance_due: inv.balance_due,
          paymentTerms: inv.payment_terms,
          notes: inv.notes,
          cancellationReason: inv.cancellation_reason,
          createdBy: inv.created_by,
          createdByName: user?.full_name,
          createdAt: inv.created_at,
          updatedAt: inv.updated_at,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (/INSERT\s+INTO\s+invoices/i.test(q)) {
    const [invoiceNumber, clientId, orderId, quoteId, dueDate, currency, subtotal, vatRate, vatAmount, total, notes, userId] =
      params as [
        string,
        string,
        string | null,
        string | null,
        string,
        string,
        number,
        number,
        number,
        number,
        string | null,
        string
      ];
    const now = new Date().toISOString();
    const newInv = {
      id: crypto.randomUUID(),
      invoice_number: invoiceNumber,
      client_id: clientId,
      order_id: orderId,
      quotation_id: quoteId,
      issue_date: now.split("T")[0],
      due_date: dueDate,
      status: "ISSUED",
      currency,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      paid_amount: 0.0,
      balance_due: total,
      payment_terms: "30_DAYS",
      notes,
      cancellation_reason: null,
      created_by: userId,
      updated_by: null,
      created_at: now,
      updated_at: now,
    };
    mockDb.invoices.push(newInv);
    return [{ id: newInv.id }];
  }

  if (/INSERT\s+INTO\s+invoice_items/i.test(q)) {
    const [invoiceId, orderItemId, itemId, lineNum, desc, unit, qty, price, lineSubtotal] = params as [
      string,
      string | null,
      string | null,
      number,
      string,
      string,
      number,
      number,
      number
    ];
    mockDb.invoice_items.push({
      id: crypto.randomUUID(),
      invoice_id: invoiceId,
      order_item_id: orderItemId,
      item_id: itemId,
      line_number: lineNum,
      description_snapshot: desc,
      unit_snapshot: unit,
      quantity: qty,
      unit_price_snapshot: price,
      line_subtotal: lineSubtotal,
    });
    return [];
  }

  if (/UPDATE\s+invoices/i.test(q)) {
    if (/status\s*=\s*'CANCELLED'/i.test(q)) {
      const [reason, userId, id] = params as [string, string, string];
      const inv = mockDb.invoices.find((x) => x.id === id);
      if (inv) {
        inv.status = "CANCELLED";
        inv.cancellation_reason = reason;
        inv.balance_due = 0;
        inv.updated_by = userId;
        inv.updated_at = new Date().toISOString();
      }
      return [];
    }
    // Payment application update: paid_amount = paid_amount + $1, balance_due = balance_due - $2 ...
    const allocAmount = (params[0] || params[1]) as number;
    const invId = params[params.length - 1] as string;
    const inv = mockDb.invoices.find((x) => x.id === invId);
    if (inv && typeof allocAmount === "number") {
      inv.paid_amount += allocAmount;
      inv.balance_due = Math.max(0, inv.balance_due - allocAmount);
      inv.status = inv.balance_due <= 0.01 ? "PAID" : "PARTIALLY_PAID";
      inv.updated_at = new Date().toISOString();
    }
    return [];
  }

  // 10. payments
  if (/FROM\s+payments/i.test(q) && /COUNT\(\*\)::int/i.test(q)) {
    if (/EXTRACT\(YEAR/i.test(q)) {
      const year = params[0] as number;
      const count = mockDb.payments.filter((p) => new Date(p.created_at).getFullYear() === year).length;
      return [{ count }];
    }
    const active = mockDb.payments.filter((p) => p.status !== "CANCELLED");
    const total = active.length;
    const totalCollected = active.reduce((acc, cur) => acc + cur.amount, 0);
    return [{ total, total_collected: totalCollected }];
  }

  if (/FROM\s+payment_allocations/i.test(q) && /^SELECT/i.test(q)) {
    const paymentId = params[0] as string;
    return mockDb.payment_allocations
      .filter((pa) => pa.payment_id === paymentId)
      .map((pa) => {
        const inv = mockDb.invoices.find((i) => i.id === pa.invoice_id);
        return {
          id: pa.id,
          paymentId: pa.payment_id,
          invoiceId: pa.invoice_id,
          invoiceNumber: inv?.invoice_number,
          allocatedAmount: pa.allocated_amount,
          allocatedAt: pa.allocated_at,
        };
      });
  }

  if (/FROM\s+payments\s+p/i.test(q) && /^SELECT/i.test(q)) {
    if (/WHERE\s+p\.id\s*=/i.test(q)) {
      const id = params[0] as string;
      const p = mockDb.payments.find((x) => x.id === id);
      if (!p) return [];
      const client = mockDb.clients.find((c) => c.id === p.client_id);
      const user = mockDb.users.find((u) => u.id === p.created_by);
      return [
        {
          id: p.id,
          paymentNumber: p.payment_number,
          clientId: p.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          paymentDate: p.payment_date,
          amount: p.amount,
          unallocatedAmount: p.unallocated_amount,
          currency: p.currency,
          paymentMethod: p.payment_method,
          referenceNumber: p.reference_number,
          notes: p.notes,
          status: p.status,
          cancellationReason: p.cancellation_reason,
          createdBy: p.created_by,
          createdByName: user?.full_name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        },
      ];
    }
    const [clientId, searchTerm] = params as [string | null, string | null];
    let list = mockDb.payments;
    if (clientId) list = list.filter((x) => x.client_id === clientId);
    if (searchTerm) {
      const term = searchTerm.replace(/%/g, "").toLowerCase();
      list = list.filter((x) => {
        const client = mockDb.clients.find((c) => c.id === x.client_id);
        return (
          x.payment_number.toLowerCase().includes(term) ||
          x.reference_number.toLowerCase().includes(term) ||
          (client && client.name.toLowerCase().includes(term))
        );
      });
    }
    return list
      .map((p) => {
        const client = mockDb.clients.find((c) => c.id === p.client_id);
        const user = mockDb.users.find((u) => u.id === p.created_by);
        return {
          id: p.id,
          paymentNumber: p.payment_number,
          clientId: p.client_id,
          clientCode: client?.code,
          clientName: client?.name,
          paymentDate: p.payment_date,
          amount: p.amount,
          unallocatedAmount: p.unallocated_amount,
          currency: p.currency,
          paymentMethod: p.payment_method,
          referenceNumber: p.reference_number,
          notes: p.notes,
          status: p.status,
          cancellationReason: p.cancellation_reason,
          createdBy: p.created_by,
          createdByName: user?.full_name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (/INSERT\s+INTO\s+payments/i.test(q)) {
    const [paymentNumber, clientId, paymentDate, amount, unallocatedAmount, paymentMethod, referenceNumber, notes, status, userId] =
      params as [string, string, string, number, number, string, string, string | null, string, string];
    const now = new Date().toISOString();
    const newPayment = {
      id: crypto.randomUUID(),
      payment_number: paymentNumber,
      client_id: clientId,
      payment_date: paymentDate === "CURRENT_DATE" ? now.split("T")[0] : paymentDate,
      amount,
      unallocated_amount: unallocatedAmount,
      currency: "USD",
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      notes,
      status,
      cancellation_reason: null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };
    mockDb.payments.push(newPayment);
    return [{ id: newPayment.id }];
  }

  if (/INSERT\s+INTO\s+payment_allocations/i.test(q)) {
    const [paymentId, invoiceId, clientId, allocatedAmount, userId] = params as [string, string, string, number, string];
    mockDb.payment_allocations.push({
      id: crypto.randomUUID(),
      payment_id: paymentId,
      invoice_id: invoiceId,
      client_id: clientId,
      allocated_amount: allocatedAmount,
      allocated_at: new Date().toISOString(),
      created_by: userId,
    });
    return [];
  }

  // 11. audit_logs
  if (/INSERT\s+INTO\s+audit_logs/i.test(q)) {
    const [userId, action, entityType, entityId, detailsJson, ip] = params as [
      string | null,
      string,
      string,
      string,
      string,
      string | null
    ];
    let parsedDetails = {};
    try {
      parsedDetails = typeof detailsJson === "string" ? JSON.parse(detailsJson) : detailsJson || {};
    } catch {
      parsedDetails = {};
    }
    mockDb.audit_logs.push({
      id: crypto.randomUUID(),
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: parsedDetails,
      ip_address: ip,
      created_at: new Date().toISOString(),
    });
    return [];
  }

  if (/FROM\s+audit_logs\s+a/i.test(q) && /^SELECT/i.test(q)) {
    const limit = (params[0] as number) || 100;
    return mockDb.audit_logs
      .map((a) => {
        const u = a.user_id ? mockDb.users.find((x) => x.id === a.user_id) : null;
        return {
          id: a.id,
          userId: a.user_id,
          userEmail: u?.email,
          userFullName: u?.full_name,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          details: a.details,
          ipAddress: a.ip_address,
          createdAt: a.created_at,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  // 12. Statements helper: invoice debit events
  if (/FROM\s+invoices\s+WHERE\s+client_id/i.test(q) && /'Facture de vente/i.test(q)) {
    const clientId = params[0] as string;
    return mockDb.invoices
      .filter((inv) => inv.client_id === clientId && inv.status !== "CANCELLED")
      .map((inv) => ({
        id: inv.id,
        date: inv.issue_date,
        reference: inv.invoice_number,
        description: `Facture de vente ${inv.invoice_number}`,
        debit: inv.total,
        credit: 0.0,
        status: inv.status,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // 13. Statements helper: payment credit events
  if (/FROM\s+payments\s+WHERE\s+client_id/i.test(q) && /Paiement reçu/i.test(q)) {
    const clientId = params[0] as string;
    return mockDb.payments
      .filter((p) => p.client_id === clientId && p.status !== "CANCELLED")
      .map((p) => ({
        id: p.id,
        date: p.payment_date,
        reference: p.payment_number,
        description: `Paiement reçu (${p.payment_method}) Réf: ${p.reference_number}`,
        debit: 0.0,
        credit: p.amount,
        status: p.status,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Fallback default
  return [];
}

// ----------------------------------------------------------------------------
// SQL Tagged Template & Invoker
// ----------------------------------------------------------------------------

export interface NeonSqlFunction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T = Record<string, any>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T = Record<string, any>>(sqlText: string, ...values: unknown[]): Promise<T[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (sqlText: string) => Promise<{ rows: any[] }>;
}

let realNeon: NeonSqlFunction | null = null;
if (databaseUrl) {
  try {
    realNeon = neon(databaseUrl) as unknown as NeonSqlFunction;
  } catch (err) {
    console.warn("[DB] Failed to initialize Neon client:", err);
    realNeon = null;
  }
}

export const sql = (async (
  strings: TemplateStringsArray | string,
  ...values: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> => {
  // If invoked with a template string
  if (Array.isArray(strings) && "raw" in strings) {
    if (realNeon) {
      try {
        return await realNeon(strings as TemplateStringsArray, ...values);
      } catch (err) {
        console.warn("[DB] Neon query failed, falling back to mock:", err);
      }
    }

    // Combine strings and values for mock dispatcher
    let reconstructed = "";
    for (let i = 0; i < strings.length; i++) {
      reconstructed += strings[i];
      if (i < values.length) {
        reconstructed += `$${i + 1}`;
      }
    }
    return executeMockQuery(reconstructed, values);
  }

  // If invoked directly with query string
  if (typeof strings === "string") {
    if (realNeon) {
      try {
        const res = await realNeon.query(strings);
        return Array.isArray(res) ? res : res.rows || [];
      } catch (err) {
        console.warn("[DB] Neon query failed, falling back to mock:", err);
      }
    }
    return executeMockQuery(strings, values);
  }

  return [];
}) as unknown as NeonSqlFunction;

sql.query = async (sqlText: string) => {
  if (realNeon) {
    try {
      const res = await realNeon.query(sqlText);
      return res;
    } catch (err) {
      console.warn("[DB] Neon query failed, falling back to mock:", err);
    }
  }
  const rows = executeMockQuery(sqlText, []);
  return { rows };
};
