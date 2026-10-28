// ============================================================================
// Article Catalogue & Prices Repository (Direct SQL)
// ============================================================================

import { sql } from "@/lib/db";

export interface ItemRecord {
  id: string;
  skuRef: string;
  description: string;
  category: string | null;
  unit: string;
  brand: string | null;
  supplierId: string | null;
  supplierName?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  currency: string;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getItems(options?: {
  search?: string;
  category?: string;
  supplierId?: string;
  activeOnly?: boolean;
}): Promise<ItemRecord[]> {
  const searchTerm = options?.search?.trim() ? `%${options.search.trim().toLowerCase()}%` : null;
  const category = options?.category?.trim() || null;
  const supplierId = options?.supplierId || null;
  const activeOnly = options?.activeOnly !== false;

  const rows = await sql`
    SELECT 
      i.id,
      i.sku_ref as "skuRef",
      i.description,
      i.category,
      i.unit,
      i.brand,
      i.supplier_id as "supplierId",
      s.name as "supplierName",
      i.purchase_price::float as "purchasePrice",
      i.selling_price::float as "sellingPrice",
      i.currency,
      i.stock_quantity::float as "stockQuantity",
      i.min_stock_level::float as "minStockLevel",
      i.is_active as "isActive",
      i.created_at as "createdAt",
      i.updated_at as "updatedAt"
    FROM items i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE (${searchTerm}::text IS NULL OR 
           LOWER(i.description) LIKE ${searchTerm} OR 
           LOWER(i.sku_ref) LIKE ${searchTerm} OR 
           LOWER(COALESCE(i.brand, '')) LIKE ${searchTerm} OR
           LOWER(COALESCE(s.name, '')) LIKE ${searchTerm})
      AND (${category}::text IS NULL OR i.category = ${category})
      AND (${supplierId}::uuid IS NULL OR i.supplier_id = ${supplierId}::uuid)
      AND (${activeOnly}::boolean = FALSE OR i.is_active = TRUE)
    ORDER BY i.category ASC, i.description ASC
  `;

  return rows as unknown as ItemRecord[];
}

export async function getItemById(id: string): Promise<ItemRecord | null> {
  const rows = await sql`
    SELECT 
      i.id,
      i.sku_ref as "skuRef",
      i.description,
      i.category,
      i.unit,
      i.brand,
      i.supplier_id as "supplierId",
      s.name as "supplierName",
      i.purchase_price::float as "purchasePrice",
      i.selling_price::float as "sellingPrice",
      i.currency,
      i.stock_quantity::float as "stockQuantity",
      i.min_stock_level::float as "minStockLevel",
      i.is_active as "isActive",
      i.created_at as "createdAt",
      i.updated_at as "updatedAt"
    FROM items i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.id = ${id}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as ItemRecord;
}

export async function createItem(data: {
  skuRef: string;
  description: string;
  category?: string;
  unit: string;
  brand?: string;
  supplierId?: string;
  purchasePrice: number;
  sellingPrice: number;
  currency?: string;
  stockQuantity?: number;
  minStockLevel?: number;
}): Promise<ItemRecord> {
  const rows = await sql`
    INSERT INTO items (
      sku_ref, description, category, unit, brand, supplier_id,
      purchase_price, selling_price, currency, stock_quantity, min_stock_level, is_active
    )
    VALUES (
      ${data.skuRef.trim().toUpperCase()},
      ${data.description.trim()},
      ${data.category?.trim() || null},
      ${data.unit.trim()},
      ${data.brand?.trim() || null},
      ${data.supplierId || null},
      ${data.purchasePrice},
      ${data.sellingPrice},
      ${data.currency || "USD"},
      ${data.stockQuantity ?? 0},
      ${data.minStockLevel ?? 0},
      TRUE
    )
    RETURNING 
      id, sku_ref as "skuRef", description, category, unit, brand,
      supplier_id as "supplierId", purchase_price::float as "purchasePrice",
      selling_price::float as "sellingPrice", currency,
      stock_quantity::float as "stockQuantity", min_stock_level::float as "minStockLevel",
      is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return rows[0] as unknown as ItemRecord;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<ItemRecord, "id" | "createdAt" | "updatedAt">>
): Promise<ItemRecord | null> {
  const rows = await sql`
    UPDATE items
    SET 
      sku_ref = COALESCE(${data.skuRef ? data.skuRef.trim().toUpperCase() : null}, sku_ref),
      description = COALESCE(${data.description ? data.description.trim() : null}, description),
      category = COALESCE(${data.category ?? null}, category),
      unit = COALESCE(${data.unit ?? null}, unit),
      brand = COALESCE(${data.brand ?? null}, brand),
      supplier_id = COALESCE(${data.supplierId ?? null}, supplier_id),
      purchase_price = COALESCE(${data.purchasePrice ?? null}, purchase_price),
      selling_price = COALESCE(${data.sellingPrice ?? null}, selling_price),
      currency = COALESCE(${data.currency ?? null}, currency),
      stock_quantity = COALESCE(${data.stockQuantity ?? null}, stock_quantity),
      min_stock_level = COALESCE(${data.minStockLevel ?? null}, min_stock_level),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING 
      id, sku_ref as "skuRef", description, category, unit, brand,
      supplier_id as "supplierId", purchase_price::float as "purchasePrice",
      selling_price::float as "sellingPrice", currency,
      stock_quantity::float as "stockQuantity", min_stock_level::float as "minStockLevel",
      is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as ItemRecord;
}
