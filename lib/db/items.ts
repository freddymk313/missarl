// ============================================================================
// Item Catalogue Repository — buy-on-demand model
// No stock. No selling price. Supplier offers tracked separately.
// ============================================================================

import { sql } from "@/lib/db";
import { normalizeCode } from "@/lib/db/normalize";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryRecord {
  id: string;
  code: string;
  nameFr: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BrandRecord {
  id: string;
  name: string;
  nameNormalized: string;
}

export interface UnitRecord {
  code: string;
  labelFr: string;
  aliases: string[];
}

export interface CurrencyRecord {
  code: string;
  name: string;
  symbol: string;
}

export interface ExchangeRateRecord {
  id: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  rateToUsd: number;
  effectiveOn: string;
  note: string | null;
  createdAt: string;
}

export interface SupplierOfferRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierItemCode: string | null;
  currencyCode: string;
  currencySymbol: string;
  unitPrice: number; // stored as string from DB, we parse
  unitPriceUsd: number | null; // converted via latest exchange rate
  leadTimeDays: number | null;
  minOrderQty: number | null;
  quotedOn: string;
  validUntil: string | null;
  isCurrent: boolean;
  notes: string | null;
  createdAt: string;
}

export interface IdentifierRecord {
  id: string;
  kind: "CLIENT_CODE" | "GTIN" | "ALT_MPN";
  clientId: string | null;
  clientName: string | null;
  clientCode: string | null;
  value: string;
  createdAt: string;
}

/** Which field matched a search query */
export type MatchBadge =
  | { type: "CLIENT_CODE"; clientName: string }
  | { type: "MPN" }
  | { type: "SUPPLIER_CODE"; supplierName: string }
  | { type: "SKU" }
  | { type: "FUZZY" };

export interface ItemRecord {
  id: string;
  skuRef: string;
  designation: string | null;
  description: string;
  categoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  manufacturerPartNumber: string | null;
  unitCode: string | null;
  supplyPrice: number | null;
  specs: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // populated by search / detail queries
  matchBadge?: MatchBadge;
  identifiers?: IdentifierRecord[];
  currentOffers?: SupplierOfferRecord[];
  cheapestOfferUsd?: number | null;
}

export interface ItemStats {
  totalItems: number;
  categoriesUsed: number;
  suppliersReferenced: number;
  itemsWithoutOffer: number;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export async function getItemCategories(): Promise<CategoryRecord[]> {
  const rows = await sql`
    SELECT id, code, name_fr as "nameFr", sort_order as "sortOrder", is_active as "isActive"
    FROM item_categories
    WHERE is_active = TRUE
    ORDER BY sort_order ASC
  `;
  return rows as unknown as CategoryRecord[];
}

export async function getBrands(): Promise<BrandRecord[]> {
  const rows = await sql`
    SELECT id, name, name_normalized as "nameNormalized"
    FROM brands
    ORDER BY name ASC
  `;
  return rows as unknown as BrandRecord[];
}

export async function getUnits(): Promise<UnitRecord[]> {
  const rows = await sql`
    SELECT code, label_fr as "labelFr", aliases
    FROM units
    ORDER BY code ASC
  `;
  return rows as unknown as UnitRecord[];
}

export async function getCurrencies(): Promise<CurrencyRecord[]> {
  const rows = await sql`
    SELECT code, name, symbol FROM currencies ORDER BY code ASC
  `;
  return rows as unknown as CurrencyRecord[];
}

export async function getExchangeRates(): Promise<ExchangeRateRecord[]> {
  // One row per currency: the most recent effective rate
  const rows = await sql`
    SELECT DISTINCT ON (er.currency_code)
      er.id,
      er.currency_code as "currencyCode",
      c.name as "currencyName",
      c.symbol as "currencySymbol",
      er.rate_to_usd::float as "rateToUsd",
      er.effective_on::text as "effectiveOn",
      er.note,
      er.created_at as "createdAt"
    FROM exchange_rates er
    JOIN currencies c ON c.code = er.currency_code
    ORDER BY er.currency_code, er.effective_on DESC
  `;
  return rows as unknown as ExchangeRateRecord[];
}

export async function upsertExchangeRate(data: {
  currencyCode: string;
  rateToUsd: number; // caller already converted (1/N)
  effectiveOn: string; // ISO date
  note?: string;
  userId: string;
}): Promise<ExchangeRateRecord> {
  const rows = await sql`
    INSERT INTO exchange_rates (currency_code, rate_to_usd, effective_on, note, created_by)
    VALUES (
      ${data.currencyCode},
      ${data.rateToUsd},
      ${data.effectiveOn}::date,
      ${data.note ?? null},
      ${data.userId}::uuid
    )
    ON CONFLICT (currency_code, effective_on)
    DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd, note = EXCLUDED.note
    RETURNING
      id,
      currency_code as "currencyCode",
      rate_to_usd::float as "rateToUsd",
      effective_on::text as "effectiveOn",
      note,
      created_at as "createdAt"
  `;
  return rows[0] as unknown as ExchangeRateRecord;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getItemStats(): Promise<ItemStats> {
  const rows = await sql`
    SELECT
      COUNT(*)::int                                          AS "totalItems",
      COUNT(DISTINCT category_id)::int                       AS "categoriesUsed",
      (SELECT COUNT(DISTINCT supplier_id)::int
         FROM supplier_offers WHERE is_current = TRUE)       AS "suppliersReferenced",
      (SELECT COUNT(*)::int FROM items i2
         WHERE NOT EXISTS (
           SELECT 1 FROM supplier_offers so
           WHERE so.item_id = i2.id AND so.is_current = TRUE
         ))                                                  AS "itemsWithoutOffer"
    FROM items
    WHERE is_active = TRUE
  `;
  return rows[0] as unknown as ItemStats;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchItems(
  q: string,
  filters?: {
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    currencyCode?: string;
  }
): Promise<ItemRecord[]> {
  const normalized = q ? normalizeCode(q) : null;
  const fuzzy = q ? `%${q.toLowerCase()}%` : null;
  const catId = filters?.categoryId || null;
  const brandId = filters?.brandId || null;
  const supplierId = filters?.supplierId || null;

  // Phase 1: exact normalized match (client codes, MPN, supplier codes, SKU)
  // We union three sources and label the match.
  const exactRows = normalized
    ? await sql`
        -- Match by client identifier code
        SELECT
          i.id,
          i.sku_ref as "skuRef",
          i.designation,
          i.description,
          i.category_id as "categoryId",
          ic.code as "categoryCode",
          ic.name_fr as "categoryName",
          i.brand_id as "brandId",
          b.name as "brandName",
          i.manufacturer_part_number as "manufacturerPartNumber",
          i.unit_code as "unitCode",
          i.supply_price::float as "supplyPrice",
          i.specs,
          i.is_active as "isActive",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          'CLIENT_CODE' as "matchType",
          cl.name as "matchLabel"
        FROM item_identifiers ii
        JOIN items i ON i.id = ii.item_id
        LEFT JOIN item_categories ic ON ic.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        LEFT JOIN clients cl ON cl.id = ii.client_id
        WHERE ii.value_normalized = ${normalized}
          AND ii.kind = 'CLIENT_CODE'
          AND (${catId}::uuid IS NULL OR i.category_id = ${catId}::uuid)
          AND (${brandId}::uuid IS NULL OR i.brand_id = ${brandId}::uuid)

        UNION

        -- Match by MPN
        SELECT
          i.id,
          i.sku_ref as "skuRef",
          i.designation,
          i.description,
          i.category_id as "categoryId",
          ic.code as "categoryCode",
          ic.name_fr as "categoryName",
          i.brand_id as "brandId",
          b.name as "brandName",
          i.manufacturer_part_number as "manufacturerPartNumber",
          i.unit_code as "unitCode",
          i.supply_price::float as "supplyPrice",
          i.specs,
          i.is_active as "isActive",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          'MPN' as "matchType",
          NULL as "matchLabel"
        FROM items i
        LEFT JOIN item_categories ic ON ic.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        WHERE i.mpn_normalized = ${normalized}
          AND (${catId}::uuid IS NULL OR i.category_id = ${catId}::uuid)
          AND (${brandId}::uuid IS NULL OR i.brand_id = ${brandId}::uuid)

        UNION

        -- Match by supplier item code
        SELECT
          i.id,
          i.sku_ref as "skuRef",
          i.designation,
          i.description,
          i.category_id as "categoryId",
          ic.code as "categoryCode",
          ic.name_fr as "categoryName",
          i.brand_id as "brandId",
          b.name as "brandName",
          i.manufacturer_part_number as "manufacturerPartNumber",
          i.unit_code as "unitCode",
          i.supply_price::float as "supplyPrice",
          i.specs,
          i.is_active as "isActive",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          'SUPPLIER_CODE' as "matchType",
          s.name as "matchLabel"
        FROM supplier_offers so
        JOIN items i ON i.id = so.item_id
        JOIN suppliers s ON s.id = so.supplier_id
        LEFT JOIN item_categories ic ON ic.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        WHERE so.supplier_item_code_normalized = ${normalized}
          AND (${catId}::uuid IS NULL OR i.category_id = ${catId}::uuid)
          AND (${brandId}::uuid IS NULL OR i.brand_id = ${brandId}::uuid)
          AND (${supplierId}::uuid IS NULL OR so.supplier_id = ${supplierId}::uuid)

        UNION

        -- Match by internal SKU
        SELECT
          i.id,
          i.sku_ref as "skuRef",
          i.designation,
          i.description,
          i.category_id as "categoryId",
          ic.code as "categoryCode",
          ic.name_fr as "categoryName",
          i.brand_id as "brandId",
          b.name as "brandName",
          i.manufacturer_part_number as "manufacturerPartNumber",
          i.unit_code as "unitCode",
          i.supply_price::float as "supplyPrice",
          i.specs,
          i.is_active as "isActive",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          'SKU' as "matchType",
          NULL as "matchLabel"
        FROM items i
        LEFT JOIN item_categories ic ON ic.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        WHERE UPPER(i.sku_ref) = ${normalized}
          AND (${catId}::uuid IS NULL OR i.category_id = ${catId}::uuid)
          AND (${brandId}::uuid IS NULL OR i.brand_id = ${brandId}::uuid)
      `
    : ([] as unknown[]);

  const exactIds = new Set((exactRows as { id: string }[]).map((r) => r.id));

  // Phase 2: fuzzy on designation / description (exclude already found)
  const fuzzyRows = fuzzy
    ? await sql`
        SELECT
          i.id,
          i.sku_ref as "skuRef",
          i.designation,
          i.description,
          i.category_id as "categoryId",
          ic.code as "categoryCode",
          ic.name_fr as "categoryName",
          i.brand_id as "brandId",
          b.name as "brandName",
          i.manufacturer_part_number as "manufacturerPartNumber",
          i.unit_code as "unitCode",
          i.supply_price::float as "supplyPrice",
          i.specs,
          i.is_active as "isActive",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          'FUZZY' as "matchType",
          NULL as "matchLabel"
        FROM items i
        LEFT JOIN item_categories ic ON ic.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        WHERE (
          LOWER(i.designation) LIKE ${fuzzy}
          OR LOWER(i.description) LIKE ${fuzzy}
          OR LOWER(i.sku_ref) LIKE ${fuzzy}
        )
          AND (${catId}::uuid IS NULL OR i.category_id = ${catId}::uuid)
          AND (${brandId}::uuid IS NULL OR i.brand_id = ${brandId}::uuid)
        ORDER BY i.designation ASC
        LIMIT 50
      `
    : ([] as unknown[]);

  // When no search query, return all items
  const allRows = fuzzy
    ? [
        ...((exactRows as unknown[]) as Array<{
          id: string;
          matchType: string;
          matchLabel: string | null;
        }>),
        ...((fuzzyRows as unknown[]) as Array<{
          id: string;
          matchType: string;
          matchLabel: string | null;
        }>).filter((r) => !exactIds.has(r.id)),
      ]
    : await sql`
        SELECT
          i.id,
          i.sku_ref as "skuRef",
          i.designation,
          i.description,
          i.category_id as "categoryId",
          ic.code as "categoryCode",
          ic.name_fr as "categoryName",
          i.brand_id as "brandId",
          b.name as "brandName",
          i.manufacturer_part_number as "manufacturerPartNumber",
          i.unit_code as "unitCode",
          i.supply_price::float as "supplyPrice",
          i.specs,
          i.is_active as "isActive",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          'FUZZY' as "matchType",
          NULL as "matchLabel"
        FROM items i
        LEFT JOIN item_categories ic ON ic.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        WHERE (${catId}::uuid IS NULL OR i.category_id = ${catId}::uuid)
          AND (${brandId}::uuid IS NULL OR i.brand_id = ${brandId}::uuid)
        ORDER BY i.designation ASC
        LIMIT 100
      `;

  // Optionally filter by supplier and currency if we couldn't do it in the query
  const typedRows = allRows as Array<{
    id: string;
    skuRef: string;
    designation: string | null;
    description: string;
    categoryId: string | null;
    categoryCode: string | null;
    categoryName: string | null;
    brandId: string | null;
    brandName: string | null;
    manufacturerPartNumber: string | null;
    unitCode: string | null;
    supplyPrice: number | null;
    specs: Record<string, string>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    matchType: string;
    matchLabel: string | null;
  }>;

  // Map basic rows
  const mappedItems: ItemRecord[] = typedRows.map((row) => {
    let matchBadge: MatchBadge;
    if (row.matchType === "CLIENT_CODE") {
      matchBadge = { type: "CLIENT_CODE", clientName: row.matchLabel || "Client" };
    } else if (row.matchType === "MPN") {
      matchBadge = { type: "MPN" };
    } else if (row.matchType === "SUPPLIER_CODE") {
      matchBadge = { type: "SUPPLIER_CODE", supplierName: row.matchLabel || "Supplier" };
    } else if (row.matchType === "SKU") {
      matchBadge = { type: "SKU" };
    } else {
      matchBadge = { type: "FUZZY" };
    }

    return {
      id: row.id,
      skuRef: row.skuRef,
      designation: row.designation,
      description: row.description,
      categoryId: row.categoryId,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      brandId: row.brandId,
      brandName: row.brandName,
      manufacturerPartNumber: row.manufacturerPartNumber,
      unitCode: row.unitCode,
      supplyPrice: row.supplyPrice != null ? Number(row.supplyPrice) : null,
      specs: row.specs ?? {},
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      matchBadge,
      cheapestOfferUsd: null,
    };
  });

  // Attach cheapest offers if items exist
  if (mappedItems.length > 0) {
    const itemIds = mappedItems.map((m) => m.id);
    const offerRows = await sql`
      SELECT
        so.item_id as "itemId",
        MIN(so.unit_price * COALESCE(er.rate_to_usd, 1))::float as "cheapestOfferUsd"
      FROM supplier_offers so
      LEFT JOIN LATERAL (
        SELECT rate_to_usd FROM exchange_rates
        WHERE currency_code = so.currency_code
        ORDER BY effective_on DESC LIMIT 1
      ) er ON TRUE
      WHERE so.item_id = ANY(${itemIds}::uuid[])
        AND so.is_current = TRUE
      GROUP BY so.item_id
    `;

    const offerMap = new Map<string, number>();
    for (const r of (offerRows as unknown as Array<{ itemId: string; cheapestOfferUsd: number }>)) {
      offerMap.set(r.itemId, r.cheapestOfferUsd);
    }

    for (const item of mappedItems) {
      if (offerMap.has(item.id)) {
        item.cheapestOfferUsd = offerMap.get(item.id) ?? null;
      }
    }
  }

  return mappedItems;
}

// ---------------------------------------------------------------------------
// Alias getItems for backwards compatibility
// ---------------------------------------------------------------------------

export async function getItems(options?: {
  search?: string;
  category?: string;
  supplierId?: string;
  activeOnly?: boolean;
}): Promise<ItemRecord[]> {
  return searchItems(options?.search || "", {
    categoryId: options?.category,
    supplierId: options?.supplierId,
  });
}

// ---------------------------------------------------------------------------
// Get single item with full detail
// ---------------------------------------------------------------------------

export async function getItemById(id: string): Promise<ItemRecord | null> {
  const rows = await sql`
    SELECT
      i.id,
      i.sku_ref as "skuRef",
      i.designation,
      i.description,
      i.category_id as "categoryId",
      ic.code as "categoryCode",
      ic.name_fr as "categoryName",
      i.brand_id as "brandId",
      b.name as "brandName",
      i.manufacturer_part_number as "manufacturerPartNumber",
      i.unit_code as "unitCode",
      i.supply_price::float as "supplyPrice",
      i.specs,
      i.is_active as "isActive",
      i.created_at as "createdAt",
      i.updated_at as "updatedAt"
    FROM items i
    LEFT JOIN item_categories ic ON ic.id = i.category_id
    LEFT JOIN brands b ON b.id = i.brand_id
    WHERE i.id = ${id}::uuid
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;

  const item = rows[0] as unknown as ItemRecord;
  item.specs = (item.specs as unknown as Record<string, string>) ?? {};

  // Load identifiers
  const identRows = await sql`
    SELECT
      ii.id, ii.kind, ii.client_id as "clientId",
      cl.name as "clientName", cl.code as "clientCode",
      ii.value, ii.created_at as "createdAt"
    FROM item_identifiers ii
    LEFT JOIN clients cl ON cl.id = ii.client_id
    WHERE ii.item_id = ${id}::uuid
    ORDER BY ii.kind, ii.created_at ASC
  `;
  item.identifiers = identRows as unknown as IdentifierRecord[];

  // Load current and historical offers with USD conversion
  const offerRows = await sql`
    SELECT
      so.id,
      so.supplier_id as "supplierId",
      s.name as "supplierName",
      so.supplier_item_code as "supplierItemCode",
      so.currency_code as "currencyCode",
      c.symbol as "currencySymbol",
      so.unit_price::float as "unitPrice",
      (so.unit_price * COALESCE(
        (SELECT er.rate_to_usd FROM exchange_rates er
         WHERE er.currency_code = so.currency_code
         ORDER BY er.effective_on DESC LIMIT 1),
        NULL
      ))::float as "unitPriceUsd",
      so.lead_time_days as "leadTimeDays",
      so.min_order_qty::float as "minOrderQty",
      so.quoted_on::text as "quotedOn",
      so.valid_until::text as "validUntil",
      so.is_current as "isCurrent",
      so.notes,
      so.created_at as "createdAt"
    FROM supplier_offers so
    JOIN suppliers s ON s.id = so.supplier_id
    JOIN currencies c ON c.code = so.currency_code
    WHERE so.item_id = ${id}::uuid
    ORDER BY so.is_current DESC, so.created_at DESC
  `;

  const allOffers = offerRows as unknown as SupplierOfferRecord[];
  item.currentOffers = allOffers.filter((o) => o.isCurrent);

  // Cheapest by USD equivalent
  const usdPrices = item.currentOffers
    .map((o) => o.unitPriceUsd)
    .filter((p): p is number => p !== null && p >= 0);
  item.cheapestOfferUsd = usdPrices.length > 0 ? Math.min(...usdPrices) : null;

  return item;
}

// ---------------------------------------------------------------------------
// Create item
// ---------------------------------------------------------------------------

export async function createItem(data: {
  designation: string;
  description: string;
  categoryId?: string;
  brandId?: string;
  manufacturerPartNumber?: string;
  unitCode?: string;
  supplyPrice?: number | null;
  specs?: Record<string, string>;
  isActive?: boolean;
}): Promise<ItemRecord> {
  const mpnNorm = data.manufacturerPartNumber
    ? normalizeCode(data.manufacturerPartNumber)
    : null;

  const rows = await sql`
    INSERT INTO items (
      unit, unit_code, designation, description, category_id, brand_id,
      manufacturer_part_number, mpn_normalized, supply_price, specs, is_active
    )
    VALUES (
      ${data.unitCode || "EA"},
      ${data.unitCode ?? null},
      ${data.designation.trim()},
      ${data.description.trim()},
      ${data.categoryId ?? null},
      ${data.brandId ?? null},
      ${data.manufacturerPartNumber?.trim() ?? null},
      ${mpnNorm},
      ${data.supplyPrice !== undefined && data.supplyPrice !== null ? data.supplyPrice : null},
      ${JSON.stringify(data.specs ?? {})}::jsonb,
      ${data.isActive !== false}
    )
    RETURNING
      id, sku_ref as "skuRef", designation, description,
      category_id as "categoryId", brand_id as "brandId",
      manufacturer_part_number as "manufacturerPartNumber",
      mpn_normalized as "mpnNormalized",
      unit_code as "unitCode",
      supply_price::float as "supplyPrice",
      specs,
      is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const item = rows[0] as unknown as ItemRecord;
  item.specs = item.specs ?? {};
  return item;
}

// ---------------------------------------------------------------------------
// Update item
// ---------------------------------------------------------------------------

export async function updateItem(
  id: string,
  data: {
    designation?: string;
    description?: string;
    categoryId?: string | null;
    brandId?: string | null;
    manufacturerPartNumber?: string | null;
    unitCode?: string | null;
    supplyPrice?: number | null;
    specs?: Record<string, string>;
    isActive?: boolean;
  }
): Promise<ItemRecord | null> {
  const mpnNorm =
    data.manufacturerPartNumber !== undefined
      ? data.manufacturerPartNumber
        ? normalizeCode(data.manufacturerPartNumber)
        : null
      : undefined;

  const rows = await sql`
    UPDATE items SET
      unit           = CASE WHEN ${data.unitCode !== undefined} THEN ${data.unitCode ?? "EA"} ELSE unit END,
      unit_code      = CASE WHEN ${data.unitCode !== undefined} THEN ${data.unitCode ?? null} ELSE unit_code END,
      supply_price   = CASE WHEN ${data.supplyPrice !== undefined} THEN ${data.supplyPrice ?? null}::numeric ELSE supply_price END,
      designation    = COALESCE(${data.designation?.trim() ?? null}, designation),
      description    = COALESCE(${data.description?.trim() ?? null}, description),
      category_id    = CASE WHEN ${data.categoryId !== undefined} THEN ${data.categoryId ?? null}::uuid ELSE category_id END,
      brand_id       = CASE WHEN ${data.brandId !== undefined} THEN ${data.brandId ?? null}::uuid ELSE brand_id END,
      manufacturer_part_number = CASE WHEN ${data.manufacturerPartNumber !== undefined} THEN ${data.manufacturerPartNumber ?? null} ELSE manufacturer_part_number END,
      mpn_normalized = CASE WHEN ${mpnNorm !== undefined} THEN ${mpnNorm ?? null} ELSE mpn_normalized END,
      specs          = CASE WHEN ${data.specs !== undefined} THEN ${JSON.stringify(data.specs ?? {})}::jsonb ELSE specs END,
      is_active      = COALESCE(${data.isActive ?? null}, is_active),
      updated_at     = NOW()
    WHERE id = ${id}::uuid
    RETURNING
      id, sku_ref as "skuRef", designation, description,
      category_id as "categoryId", brand_id as "brandId",
      manufacturer_part_number as "manufacturerPartNumber",
      unit_code as "unitCode",
      supply_price::float as "supplyPrice",
      specs,
      is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows || rows.length === 0) return null;
  const item = rows[0] as unknown as ItemRecord;
  item.specs = item.specs ?? {};
  return item;
}

// ---------------------------------------------------------------------------
// Delete item (only if not referenced by any transaction document)
// ---------------------------------------------------------------------------

export async function deleteItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Check for references in quotation_items, order_items, invoice_items
  const refs = await sql`
    SELECT COUNT(*)::int as cnt FROM (
      SELECT item_id FROM quotation_items WHERE item_id = ${id}::uuid
      UNION ALL
      SELECT item_id FROM order_items WHERE item_id = ${id}::uuid
      UNION ALL
      SELECT item_id FROM invoice_items WHERE item_id = ${id}::uuid
    ) sub
  `;
  const count = (refs[0] as unknown as { cnt: number }).cnt;
  if (count > 0) {
    return {
      success: false,
      error: `Cannot delete: item is referenced in ${count} document line(s).`,
    };
  }

  await sql`DELETE FROM items WHERE id = ${id}::uuid`;
  return { success: true };
}

// ---------------------------------------------------------------------------
// Item identifiers
// ---------------------------------------------------------------------------

export async function addItemIdentifier(data: {
  itemId: string;
  kind: "CLIENT_CODE" | "GTIN" | "ALT_MPN";
  clientId?: string;
  value: string;
}): Promise<IdentifierRecord> {
  const valueNorm = normalizeCode(data.value);
  const rows = await sql`
    INSERT INTO item_identifiers (item_id, kind, client_id, value, value_normalized)
    VALUES (
      ${data.itemId}::uuid,
      ${data.kind},
      ${data.clientId ?? null},
      ${data.value.trim()},
      ${valueNorm}
    )
    RETURNING id, kind, client_id as "clientId", value, created_at as "createdAt"
  `;
  return rows[0] as unknown as IdentifierRecord;
}

export async function deleteItemIdentifier(id: string): Promise<void> {
  await sql`DELETE FROM item_identifiers WHERE id = ${id}::uuid`;
}

// ---------------------------------------------------------------------------
// Supplier offers — history-aware (ONE transaction)
// ---------------------------------------------------------------------------

export async function addSupplierOffer(data: {
  itemId: string;
  supplierId: string;
  supplierItemCode?: string;
  currencyCode: string;
  unitPrice: number;
  leadTimeDays?: number;
  minOrderQty?: number;
  quotedOn?: string;
  validUntil?: string;
  notes?: string;
  userId: string;
}): Promise<SupplierOfferRecord> {
  const supplierCodeNorm = data.supplierItemCode
    ? normalizeCode(data.supplierItemCode)
    : null;

  let insertedRows: SupplierOfferRecord[];

  // Execute in a transaction via callback or fallback sequentially
  if (typeof sql.transaction === "function") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await sql.transaction((txn: any) => [
        // 1. Archive previous current offer for this item+supplier
        txn`
          UPDATE supplier_offers
          SET is_current = FALSE
          WHERE item_id = ${data.itemId}::uuid
            AND supplier_id = ${data.supplierId}::uuid
            AND is_current = TRUE
        `,
        // 2. Insert new offer
        txn`
          INSERT INTO supplier_offers (
            item_id, supplier_id, supplier_item_code, supplier_item_code_normalized,
            currency_code, unit_price, lead_time_days, min_order_qty,
            quoted_on, valid_until, is_current, notes, created_by
          )
          VALUES (
            ${data.itemId}::uuid,
            ${data.supplierId}::uuid,
            ${data.supplierItemCode?.trim() ?? null},
            ${supplierCodeNorm},
            ${data.currencyCode},
            ${data.unitPrice},
            ${data.leadTimeDays ?? null},
            ${data.minOrderQty ?? null},
            ${data.quotedOn ?? null}::date,
            ${data.validUntil ?? null}::date,
            TRUE,
            ${data.notes?.trim() ?? null},
            ${data.userId}::uuid
          )
          RETURNING
            id,
            supplier_id as "supplierId",
            supplier_item_code as "supplierItemCode",
            currency_code as "currencyCode",
            unit_price::float as "unitPrice",
            lead_time_days as "leadTimeDays",
            min_order_qty::float as "minOrderQty",
            quoted_on::text as "quotedOn",
            valid_until::text as "validUntil",
            is_current as "isCurrent",
            notes,
            created_at as "createdAt"
        `,
      ]);
      insertedRows = results[1] as unknown as SupplierOfferRecord[];
    } catch {
      await sql`
        UPDATE supplier_offers
        SET is_current = FALSE
        WHERE item_id = ${data.itemId}::uuid
          AND supplier_id = ${data.supplierId}::uuid
          AND is_current = TRUE
      `;
      const res = await sql`
        INSERT INTO supplier_offers (
          item_id, supplier_id, supplier_item_code, supplier_item_code_normalized,
          currency_code, unit_price, lead_time_days, min_order_qty,
          quoted_on, valid_until, is_current, notes, created_by
        )
        VALUES (
          ${data.itemId}::uuid,
          ${data.supplierId}::uuid,
          ${data.supplierItemCode?.trim() ?? null},
          ${supplierCodeNorm},
          ${data.currencyCode},
          ${data.unitPrice},
          ${data.leadTimeDays ?? null},
          ${data.minOrderQty ?? null},
          ${data.quotedOn ?? null}::date,
          ${data.validUntil ?? null}::date,
          TRUE,
          ${data.notes?.trim() ?? null},
          ${data.userId}::uuid
        )
        RETURNING
          id,
          supplier_id as "supplierId",
          supplier_item_code as "supplierItemCode",
          currency_code as "currencyCode",
          unit_price::float as "unitPrice",
          lead_time_days as "leadTimeDays",
          min_order_qty::float as "minOrderQty",
          quoted_on::text as "quotedOn",
          valid_until::text as "validUntil",
          is_current as "isCurrent",
          notes,
          created_at as "createdAt"
      `;
      insertedRows = res as unknown as SupplierOfferRecord[];
    }
  } else {
    await sql`
      UPDATE supplier_offers
      SET is_current = FALSE
      WHERE item_id = ${data.itemId}::uuid
        AND supplier_id = ${data.supplierId}::uuid
        AND is_current = TRUE
    `;
    const res = await sql`
      INSERT INTO supplier_offers (
        item_id, supplier_id, supplier_item_code, supplier_item_code_normalized,
        currency_code, unit_price, lead_time_days, min_order_qty,
        quoted_on, valid_until, is_current, notes, created_by
      )
      VALUES (
        ${data.itemId}::uuid,
        ${data.supplierId}::uuid,
        ${data.supplierItemCode?.trim() ?? null},
        ${supplierCodeNorm},
        ${data.currencyCode},
        ${data.unitPrice},
        ${data.leadTimeDays ?? null},
        ${data.minOrderQty ?? null},
        ${data.quotedOn ?? null}::date,
        ${data.validUntil ?? null}::date,
        TRUE,
        ${data.notes?.trim() ?? null},
        ${data.userId}::uuid
      )
      RETURNING
        id,
        supplier_id as "supplierId",
        supplier_item_code as "supplierItemCode",
        currency_code as "currencyCode",
        unit_price::float as "unitPrice",
        lead_time_days as "leadTimeDays",
        min_order_qty::float as "minOrderQty",
        quoted_on::text as "quotedOn",
        valid_until::text as "validUntil",
        is_current as "isCurrent",
        notes,
        created_at as "createdAt"
    `;
    insertedRows = res as unknown as SupplierOfferRecord[];
  }
  return insertedRows[0];
}

// ---------------------------------------------------------------------------
// Brands (find-or-create)
// ---------------------------------------------------------------------------

export async function findOrCreateBrand(name: string): Promise<BrandRecord> {
  const nameNorm = normalizeCode(name);
  const existing = await sql`
    SELECT id, name, name_normalized as "nameNormalized"
    FROM brands WHERE name_normalized = ${nameNorm} LIMIT 1
  `;
  if (existing.length > 0) return existing[0] as unknown as BrandRecord;

  const created = await sql`
    INSERT INTO brands (name, name_normalized) VALUES (${name.trim()}, ${nameNorm})
    ON CONFLICT (name_normalized) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, name_normalized as "nameNormalized"
  `;
  return created[0] as unknown as BrandRecord;
}

// ---------------------------------------------------------------------------
// Compatibility export for quotation-wizard (minimal surface)
// ---------------------------------------------------------------------------

export async function getItemsForPicker(): Promise<
  Array<{
    id: string;
    skuRef: string;
    designation: string | null;
    description: string;
    unitCode: string | null;
    cheapestOfferUsd: number | null;
  }>
> {
  const rows = await sql`
    SELECT
      i.id,
      i.sku_ref as "skuRef",
      i.designation,
      i.description,
      i.unit_code as "unitCode",
      i.supply_price::float as "supplyPrice",
      COALESCE(
        (
          SELECT (so.unit_price * COALESCE(
            (SELECT er.rate_to_usd FROM exchange_rates er
             WHERE er.currency_code = so.currency_code
             ORDER BY er.effective_on DESC LIMIT 1),
            NULL
          ))::float
          FROM supplier_offers so
          WHERE so.item_id = i.id AND so.is_current = TRUE
          ORDER BY (so.unit_price * COALESCE(
            (SELECT er.rate_to_usd FROM exchange_rates er
             WHERE er.currency_code = so.currency_code
             ORDER BY er.effective_on DESC LIMIT 1),
            1
          )) ASC
          LIMIT 1
        ),
        i.supply_price::float
      ) as "cheapestOfferUsd"
    FROM items i
    WHERE i.is_active = TRUE
    ORDER BY i.designation ASC
    LIMIT 200
  `;
  return rows as unknown as Array<{
    id: string;
    skuRef: string;
    designation: string | null;
    description: string;
    unitCode: string | null;
    supplyPrice: number | null;
    cheapestOfferUsd: number | null;
  }>;
}
