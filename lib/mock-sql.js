"use strict";
// ============================================================================
// SQL Mock Dispatcher for AI Studio Preview
// Dispatches queries to in-memory MockDatabase when real DB is offline/unconfigured.
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeMockSql = executeMockSql;
const crypto_1 = __importDefault(require("crypto"));
const mock_db_1 = require("./mock-db");
const normalize_1 = require("./db/normalize");
async function executeMockSql(queryText, values) {
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
        const userId = values[0] || null;
        const action = values[1] || "UNKNOWN";
        const entityType = values[2] || "GENERAL";
        const entityId = values[3] || null;
        const details = (typeof values[4] === "string" ? JSON.parse(values[4]) : values[4]);
        const ipAddress = values[5] || "127.0.0.1";
        const user = mock_db_1.mockDb.users.find((u) => u.id === userId);
        mock_db_1.mockDb.auditLogs.unshift({
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
        return mock_db_1.mockDb.auditLogs.slice(0, limit).map((a) => ({
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
        const userId = values[0];
        const tokenHash = values[1];
        const ipAddress = values[2] || null;
        const userAgent = values[3] || null;
        const expiresAt = values[4];
        mock_db_1.mockDb.sessions.push({
            user_id: userId,
            token_hash: tokenHash,
            ip_address: ipAddress,
            user_agent: userAgent,
            expires_at: expiresAt,
        });
        return [];
    }
    if (lowerQ.includes("from sessions s join users u on s.user_id = u.id")) {
        const tokenHash = values[0];
        const session = mock_db_1.mockDb.sessions.find((s) => s.token_hash === tokenHash && new Date(s.expires_at) > new Date());
        if (!session)
            return [];
        const user = mock_db_1.mockDb.users.find((u) => u.id === session.user_id && u.is_active);
        if (!user)
            return [];
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
        const tokenHash = values[0];
        mock_db_1.mockDb.sessions = mock_db_1.mockDb.sessions.filter((s) => s.token_hash !== tokenHash);
        return [];
    }
    // 5. Users
    if (lowerQ.includes("from users") && lowerQ.includes("lower(email) = lower(")) {
        const email = values[0]?.toLowerCase().trim();
        const user = mock_db_1.mockDb.users.find((u) => u.email.toLowerCase() === email);
        if (!user)
            return [];
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
        const id = values[0];
        const user = mock_db_1.mockDb.users.find((u) => u.id === id);
        if (!user)
            return [];
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
        return mock_db_1.mockDb.users.map((u) => ({
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
        const id = values[0];
        const u = mock_db_1.mockDb.users.find((user) => user.id === id);
        if (u)
            u.last_login_at = new Date().toISOString();
        return [];
    }
    if (lowerQ.startsWith("insert into users")) {
        const email = values[0];
        const passwordHash = values[1];
        const fullName = values[2];
        const role = values[3];
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
        mock_db_1.mockDb.users.unshift(newUser);
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
        const passwordHash = values[0];
        const id = values[1];
        const u = mock_db_1.mockDb.users.find((user) => user.id === id);
        if (u)
            u.password_hash = passwordHash;
        return [];
    }
    if (lowerQ.startsWith("update users set") && lowerQ.includes("returning")) {
        const fullName = values[0];
        const email = values[1];
        const role = values[2];
        const isActive = values[3];
        const id = values[4];
        const u = mock_db_1.mockDb.users.find((user) => user.id === id);
        if (!u)
            return [];
        if (fullName)
            u.full_name = fullName;
        if (email)
            u.email = email;
        if (role)
            u.role = role;
        if (isActive !== null && isActive !== undefined)
            u.is_active = isActive;
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
        const id = values[0];
        const idx = mock_db_1.mockDb.users.findIndex((u) => u.id === id);
        if (idx !== -1) {
            mock_db_1.mockDb.users.splice(idx, 1);
            return [{ id }];
        }
        return [];
    }
    if (lowerQ.startsWith("delete from items where id =")) {
        const id = values[0];
        const idx = mock_db_1.mockDb.items.findIndex((it) => it.id === id);
        if (idx !== -1) {
            mock_db_1.mockDb.items.splice(idx, 1);
            return [{ id }];
        }
        return [];
    }
    // 6. Clients & Quotation Sequence
    if (lowerQ.includes("select sequence_val from quotation_sequences") || lowerQ.includes("client_quotation_sequences") || lowerQ.includes("quotation_sequence")) {
        const clientCode = values[0] || "CLI-KCC";
        const nextSeq = (mock_db_1.mockDb.clientSequences[clientCode] || 88) + 1;
        mock_db_1.mockDb.clientSequences[clientCode] = nextSeq;
        const ref = `${String(nextSeq).padStart(4, "0")}/026/MIS`;
        return [{ next_ref: ref, sequence_val: nextSeq }];
    }
    if (lowerQ.includes("from clients") && lowerQ.includes("where id =")) {
        const id = values[0];
        const c = mock_db_1.mockDb.clients.find((client) => client.id === id);
        if (!c)
            return [];
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
        let filtered = mock_db_1.mockDb.clients;
        if (search) {
            filtered = filtered.filter((c) => c.name.toLowerCase().includes(search) ||
                c.code.toLowerCase().includes(search) ||
                (c.contact_person && c.contact_person.toLowerCase().includes(search)));
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
        const code = values[0].toUpperCase();
        const name = values[1];
        const contactPerson = values[2] || null;
        const email = values[3] || null;
        const phone = values[4] || null;
        const billingAddress = values[5] || null;
        const deliveryAddress = values[6] || null;
        const taxId = values[7] || null;
        const paymentTerms = values[8] || "30_DAYS";
        const currency = values[9] || "USD";
        const newClient = {
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
        mock_db_1.mockDb.clients.push(newClient);
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
        const id = values[0];
        const s = mock_db_1.mockDb.suppliers.find((sup) => sup.id === id);
        if (!s)
            return [];
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
        let list = mock_db_1.mockDb.suppliers;
        if (search) {
            list = list.filter((s) => s.name.toLowerCase().includes(search) ||
                s.code.toLowerCase().includes(search) ||
                (s.country && s.country.toLowerCase().includes(search)));
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
        return mock_db_1.mockDb.categories.map((c) => ({
            id: c.id,
            code: c.code,
            nameFr: c.name_fr,
            sortOrder: c.sort_order,
            isActive: c.is_active,
        }));
    }
    if (lowerQ.includes("from brands")) {
        return mock_db_1.mockDb.brands.map((b) => ({
            id: b.id,
            name: b.name,
            nameNormalized: b.name_normalized,
        }));
    }
    if (lowerQ.includes("from units")) {
        return mock_db_1.mockDb.units.map((u) => ({
            code: u.code,
            labelFr: u.label_fr,
            aliases: u.aliases,
        }));
    }
    if (lowerQ.includes("from currencies")) {
        return mock_db_1.mockDb.currencies.map((c) => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
        }));
    }
    if (lowerQ.includes("from exchange_rates")) {
        return mock_db_1.mockDb.exchangeRates.map((xr) => ({
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
    if (lowerQ.includes('as "totalitems"') && lowerQ.includes("from items")) {
        const activeItems = mock_db_1.mockDb.items.filter((i) => i.is_active);
        const categoriesUsed = new Set(activeItems.map((i) => i.category_id).filter(Boolean)).size;
        const currentOffers = mock_db_1.mockDb.supplierOffers.filter((so) => so.is_current);
        const suppliersReferenced = new Set(currentOffers.map((so) => so.supplier_id))
            .size;
        const itemsWithOffer = new Set(currentOffers.map((so) => so.item_id));
        const itemsWithoutOffer = mock_db_1.mockDb.items.filter((i) => !itemsWithOffer.has(i.id)).length;
        return [
            {
                totalItems: activeItems.length,
                categoriesUsed,
                suppliersReferenced,
                itemsWithoutOffer,
            },
        ];
    }
    if (lowerQ.includes("count(*)::int as total") && lowerQ.includes("from items")) {
        const activeItems = mock_db_1.mockDb.items.filter((i) => i.is_active);
        const catCount = new Set(activeItems.map((i) => i.category_id)).size;
        return [{ total: activeItems.length, categories: catCount || 1 }];
    }
    if (lowerQ.includes("from supplier_offers") &&
        lowerQ.includes('as "cheapestofferusd"')) {
        const ids = Array.isArray(values[0]) ? values[0] : [];
        const rateMap = new Map();
        for (const xr of mock_db_1.mockDb.exchangeRates) {
            rateMap.set(xr.currency_code, xr.rate_to_usd);
        }
        const grouped = new Map();
        for (const so of mock_db_1.mockDb.supplierOffers) {
            if (!so.is_current || !ids.includes(so.item_id))
                continue;
            const rate = rateMap.get(so.currency_code) ?? 1;
            const usd = so.unit_price * rate;
            const prev = grouped.get(so.item_id);
            if (prev === undefined || usd < prev) {
                grouped.set(so.item_id, usd);
            }
        }
        return Array.from(grouped.entries()).map(([itemId, cheapestOfferUsd]) => ({
            itemId,
            cheapestOfferUsd,
        }));
    }
    if (lowerQ.startsWith("insert into items")) {
        const hasQuotedPrice = lowerQ.includes("quoted_price");
        const unit = values[0] || "EA";
        const unitCode = values[1] ?? unit;
        const designation = String(values[2] || "").trim();
        const description = String(values[3] || "").trim();
        const categoryId = values[4] ?? null;
        const brandId = values[5] ?? null;
        const mpn = values[6] ?? null;
        const mpnNormalized = values[7] ?? null;
        const supplyPriceVal = values[8] !== undefined &&
            values[8] !== null &&
            Number.isFinite(Number(values[8]))
            ? Number(values[8])
            : null;
        const quotedPriceVal = hasQuotedPrice &&
            values[9] !== undefined &&
            values[9] !== null &&
            Number.isFinite(Number(values[9]))
            ? Number(values[9])
            : null;
        const vatIncludedVal = hasQuotedPrice ? values[10] === true : false;
        const specsRaw = hasQuotedPrice ? values[11] : values[9];
        const isActiveRaw = hasQuotedPrice ? values[12] : values[10];
        let specsObj = {};
        if (typeof specsRaw === "string") {
            try {
                specsObj = JSON.parse(specsRaw);
            }
            catch {
                specsObj = {};
            }
        }
        else if (specsRaw && typeof specsRaw === "object") {
            specsObj = specsRaw;
        }
        let seqNum = mock_db_1.mockDb.items.length + 1;
        let sku = `MIS-${String(seqNum).padStart(6, "0")}`;
        const existingSkus = new Set(mock_db_1.mockDb.items.map((it) => it.sku));
        while (existingSkus.has(sku)) {
            seqNum += 1;
            sku = `MIS-${String(seqNum).padStart(6, "0")}`;
        }
        const id = crypto_1.default.randomUUID ? crypto_1.default.randomUUID() : `item-${Date.now()}-${seqNum}`;
        const now = new Date().toISOString();
        const cat = categoryId ? mock_db_1.mockDb.categories.find((c) => c.id === categoryId) : undefined;
        const brand = brandId ? mock_db_1.mockDb.brands.find((b) => b.id === brandId) : undefined;
        const unitRec = unitCode ? mock_db_1.mockDb.units.find((u) => u.code === unitCode) : undefined;
        mock_db_1.mockDb.items.push({
            id,
            sku,
            designation,
            description,
            category_id: categoryId,
            brand_id: brandId,
            mpn,
            mpn_normalized: mpnNormalized,
            unit_code: unitCode,
            supply_price: supplyPriceVal,
            quoted_price: quotedPriceVal,
            vat_included: vatIncludedVal,
            specs: specsObj,
            notes: null,
            is_active: isActiveRaw !== false,
            created_at: now,
            updated_at: now,
            category_code: cat?.code,
            category_name: cat?.name_fr,
            brand_name: brand?.name ?? null,
            unit_label: unitRec?.label_fr,
        });
        return [
            {
                id,
                skuRef: sku,
                designation,
                description,
                categoryId,
                brandId,
                manufacturerPartNumber: mpn,
                mpnNormalized,
                unitCode,
                supplyPrice: supplyPriceVal,
                quotedPrice: quotedPriceVal,
                vatIncluded: vatIncludedVal,
                specs: specsObj,
                isActive: isActiveRaw !== false,
                createdAt: now,
                updatedAt: now,
            },
        ];
    }
    if (lowerQ.startsWith("update items set supply_price = coalesce(")) {
        const price = values[0] !== undefined && values[0] !== null && Number.isFinite(Number(values[0]))
            ? Number(values[0])
            : null;
        const id = values[1];
        const it = mock_db_1.mockDb.items.find((item) => item.id === id);
        if (it && price !== null) {
            it.supply_price = price;
            it.updated_at = new Date().toISOString();
        }
        return [];
    }
    if (lowerQ.startsWith("update items set")) {
        const hasQuotedPrice = lowerQ.includes("quoted_price");
        let idx = 0;
        const unitSet = Boolean(values[idx++]);
        const unitVal = values[idx++] || "EA";
        const unitCodeSet = Boolean(values[idx++]);
        const unitCodeVal = values[idx++] ?? null;
        const supplySet = Boolean(values[idx++]);
        const supplyVal = values[idx++];
        const quotedSet = hasQuotedPrice ? Boolean(values[idx++]) : false;
        const quotedVal = hasQuotedPrice ? values[idx++] : null;
        const vatSet = hasQuotedPrice ? Boolean(values[idx++]) : false;
        const vatVal = hasQuotedPrice ? Boolean(values[idx++]) : false;
        const designationVal = values[idx++] ?? null;
        const descriptionVal = values[idx++] ?? null;
        const categorySet = Boolean(values[idx++]);
        const categoryVal = values[idx++] ?? null;
        const brandSet = Boolean(values[idx++]);
        const brandVal = values[idx++] ?? null;
        const mpnSet = Boolean(values[idx++]);
        const mpnVal = values[idx++] ?? null;
        const mpnNormSet = Boolean(values[idx++]);
        const mpnNormVal = values[idx++] ?? null;
        const specsSet = Boolean(values[idx++]);
        const specsRaw = values[idx++];
        const isActiveVal = values[idx++];
        const id = values[idx];
        const it = mock_db_1.mockDb.items.find((item) => item.id === id);
        if (!it)
            return [];
        if (unitSet)
            void unitVal;
        if (unitCodeSet) {
            it.unit_code = unitCodeVal;
            const unitRec = unitCodeVal
                ? mock_db_1.mockDb.units.find((u) => u.code === unitCodeVal)
                : undefined;
            it.unit_label = unitRec?.label_fr;
        }
        if (supplySet) {
            it.supply_price =
                supplyVal !== undefined &&
                    supplyVal !== null &&
                    Number.isFinite(Number(supplyVal))
                    ? Number(supplyVal)
                    : null;
        }
        if (hasQuotedPrice && quotedSet) {
            it.quoted_price =
                quotedVal !== undefined &&
                    quotedVal !== null &&
                    Number.isFinite(Number(quotedVal))
                    ? Number(quotedVal)
                    : null;
        }
        if (hasQuotedPrice && vatSet) {
            it.vat_included = vatVal;
        }
        if (designationVal !== null)
            it.designation = designationVal;
        if (descriptionVal !== null)
            it.description = descriptionVal;
        if (categorySet) {
            it.category_id = categoryVal;
            const cat = categoryVal
                ? mock_db_1.mockDb.categories.find((c) => c.id === categoryVal)
                : undefined;
            it.category_code = cat?.code;
            it.category_name = cat?.name_fr;
        }
        if (brandSet) {
            it.brand_id = brandVal;
            const brand = brandVal
                ? mock_db_1.mockDb.brands.find((b) => b.id === brandVal)
                : undefined;
            it.brand_name = brand?.name ?? null;
        }
        if (mpnSet)
            it.mpn = mpnVal;
        if (mpnNormSet)
            it.mpn_normalized = mpnNormVal;
        if (specsSet && typeof specsRaw === "string") {
            try {
                it.specs = JSON.parse(specsRaw);
            }
            catch {
                // ignore invalid json
            }
        }
        if (isActiveVal !== null && isActiveVal !== undefined) {
            it.is_active = isActiveVal;
        }
        it.updated_at = new Date().toISOString();
        return [
            {
                id: it.id,
                skuRef: it.sku,
                designation: it.designation,
                description: it.description ?? it.designation,
                categoryId: it.category_id,
                brandId: it.brand_id,
                manufacturerPartNumber: it.mpn,
                unitCode: it.unit_code,
                supplyPrice: it.supply_price ?? null,
                quotedPrice: it.quoted_price ?? null,
                vatIncluded: Boolean(it.vat_included),
                specs: it.specs ?? {},
                isActive: it.is_active,
                createdAt: it.created_at,
                updatedAt: it.updated_at,
            },
        ];
    }
    if (lowerQ.includes("-- paginated_items_count")) {
        const activeOnly = Boolean(values[0]);
        const catId = values[1] ?? null;
        const brandId = values[3] ?? null;
        const supplierId = values[5] ?? null;
        const filtered = mock_db_1.mockDb.items.filter((it) => {
            if (activeOnly && !it.is_active)
                return false;
            if (catId && it.category_id !== catId)
                return false;
            if (brandId && it.brand_id !== brandId)
                return false;
            if (supplierId &&
                !mock_db_1.mockDb.supplierOffers.some((so) => so.item_id === it.id &&
                    so.supplier_id === supplierId &&
                    so.is_current)) {
                return false;
            }
            return true;
        });
        return [{ total: filtered.length }];
    }
    if (lowerQ.includes("-- paginated_items_list_designation") ||
        lowerQ.includes("-- paginated_items_list_recent")) {
        const isDesignationSort = lowerQ.includes("-- paginated_items_list_designation");
        const activeOnly = Boolean(values[0]);
        const catId = values[1] ?? null;
        const brandId = values[3] ?? null;
        const supplierId = values[5] ?? null;
        const limit = Math.max(1, Number(values[7] ?? 25));
        const offset = Math.max(0, Number(values[8] ?? 0));
        const filtered = mock_db_1.mockDb.items.filter((it) => {
            if (activeOnly && !it.is_active)
                return false;
            if (catId && it.category_id !== catId)
                return false;
            if (brandId && it.brand_id !== brandId)
                return false;
            if (supplierId &&
                !mock_db_1.mockDb.supplierOffers.some((so) => so.item_id === it.id &&
                    so.supplier_id === supplierId &&
                    so.is_current)) {
                return false;
            }
            return true;
        });
        const sorted = [...filtered].sort((a, b) => {
            if (isDesignationSort) {
                const nameA = (a.designation || a.description || "").toLowerCase();
                const nameB = (b.designation || b.description || "").toLowerCase();
                const cmp = nameA.localeCompare(nameB);
                if (cmp !== 0)
                    return cmp;
            }
            const timeCmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeCmp !== 0)
                return timeCmp;
            return a.id.localeCompare(b.id);
        });
        return sorted.slice(offset, offset + limit).map((it) => ({
            id: it.id,
            skuRef: it.sku,
            designation: it.designation,
            description: it.description ?? it.designation,
            categoryId: it.category_id,
            categoryCode: it.category_code || null,
            categoryName: it.category_name || null,
            brandId: it.brand_id,
            brandName: it.brand_name || null,
            manufacturerPartNumber: it.mpn,
            unitCode: it.unit_code,
            supplyPrice: it.supply_price ?? null,
            quotedPrice: it.quoted_price ?? null,
            vatIncluded: Boolean(it.vat_included),
            specs: it.specs ?? {},
            isActive: it.is_active,
            createdAt: it.created_at,
            updatedAt: it.updated_at,
            matchType: "FUZZY",
            matchLabel: null,
        }));
    }
    if (lowerQ.includes("-- paginated_items_search")) {
        const normalized = String(values[0] || "");
        const supplierFilterForSub = values[3] ?? null;
        const fuzzyRaw = String(values[6] || "").replace(/%/g, "").toLowerCase();
        const activeOnly = Boolean(values[9]);
        const catId = values[10] ?? null;
        const brandId = values[12] ?? null;
        const supplierId = values[14] ?? null;
        const sort = String(values[16] || "recent");
        const limit = Math.max(1, Number(values[17] ?? 25));
        const offset = Math.max(0, Number(values[18] ?? 0));
        const bestMatchByItem = new Map();
        const registerMatch = (item, matchType, matchLabel, rankPriority) => {
            const existing = bestMatchByItem.get(item.id);
            if (!existing || rankPriority < existing.rankPriority) {
                bestMatchByItem.set(item.id, { item, matchType, matchLabel, rankPriority });
            }
        };
        const itemById = new Map(mock_db_1.mockDb.items.map((it) => [it.id, it]));
        for (const ii of mock_db_1.mockDb.itemIdentifiers) {
            if (ii.type === "CLIENT_CODE" && ii.value_normalized === normalized) {
                const it = itemById.get(ii.item_id);
                if (it) {
                    const cl = ii.client_id
                        ? mock_db_1.mockDb.clients.find((c) => c.id === ii.client_id)
                        : undefined;
                    registerMatch(it, "CLIENT_CODE", cl?.name || null, 1);
                }
            }
        }
        for (const it of mock_db_1.mockDb.items) {
            if (it.mpn_normalized && it.mpn_normalized === normalized) {
                registerMatch(it, "MPN", null, 2);
            }
        }
        for (const so of mock_db_1.mockDb.supplierOffers) {
            if (supplierFilterForSub &&
                so.supplier_id !== supplierFilterForSub) {
                continue;
            }
            if (so.supplier_item_code &&
                (0, normalize_1.normalizeCode)(so.supplier_item_code) === normalized) {
                const it = itemById.get(so.item_id);
                const sup = mock_db_1.mockDb.suppliers.find((s) => s.id === so.supplier_id);
                if (it) {
                    registerMatch(it, "SUPPLIER_CODE", sup?.name || null, 3);
                }
            }
        }
        for (const it of mock_db_1.mockDb.items) {
            if ((it.sku || "").toUpperCase() === normalized) {
                registerMatch(it, "SKU", null, 4);
            }
            if (fuzzyRaw) {
                const desMatch = (it.designation || "").toLowerCase().includes(fuzzyRaw);
                const descMatch = (it.description || "").toLowerCase().includes(fuzzyRaw);
                const skuMatch = (it.sku || "").toLowerCase().includes(fuzzyRaw);
                if (desMatch || descMatch || skuMatch) {
                    registerMatch(it, "FUZZY", null, 5);
                }
            }
        }
        const filtered = Array.from(bestMatchByItem.values()).filter(({ item }) => {
            if (activeOnly && !item.is_active)
                return false;
            if (catId && item.category_id !== catId)
                return false;
            if (brandId && item.brand_id !== brandId)
                return false;
            if (supplierId &&
                !mock_db_1.mockDb.supplierOffers.some((so) => so.item_id === item.id &&
                    so.supplier_id === supplierId &&
                    so.is_current)) {
                return false;
            }
            return true;
        });
        filtered.sort((a, b) => {
            if (a.rankPriority !== b.rankPriority) {
                return a.rankPriority - b.rankPriority;
            }
            if (sort === "designation") {
                const nameA = (a.item.designation || a.item.description || "").toLowerCase();
                const nameB = (b.item.designation || b.item.description || "").toLowerCase();
                const cmp = nameA.localeCompare(nameB);
                if (cmp !== 0)
                    return cmp;
            }
            const timeCmp = new Date(b.item.created_at).getTime() -
                new Date(a.item.created_at).getTime();
            if (timeCmp !== 0)
                return timeCmp;
            return a.item.id.localeCompare(b.item.id);
        });
        const totalCount = filtered.length;
        return filtered.slice(offset, offset + limit).map(({ item: it, matchType, matchLabel }) => ({
            id: it.id,
            skuRef: it.sku,
            designation: it.designation,
            description: it.description ?? it.designation,
            categoryId: it.category_id,
            categoryCode: it.category_code || null,
            categoryName: it.category_name || null,
            brandId: it.brand_id,
            brandName: it.brand_name || null,
            manufacturerPartNumber: it.mpn,
            unitCode: it.unit_code,
            supplyPrice: it.supply_price ?? null,
            quotedPrice: it.quoted_price ?? null,
            vatIncluded: Boolean(it.vat_included),
            specs: it.specs ?? {},
            isActive: it.is_active,
            createdAt: it.created_at,
            updatedAt: it.updated_at,
            matchType,
            matchLabel,
            totalCount,
        }));
    }
    if (lowerQ.includes("from items") && lowerQ.includes("where is_active = true")) {
        return mock_db_1.mockDb.items
            .filter((it) => it.is_active)
            .map((it) => ({
            id: it.id,
            skuRef: it.sku,
            designation: it.designation,
            description: it.description ?? it.designation,
            unitCode: it.unit_code,
        }));
    }
    if (lowerQ.includes("from items") && lowerQ.includes("where id = any(")) {
        const ids = Array.isArray(values[0]) ? values[0] : [];
        return mock_db_1.mockDb.items
            .filter((item) => ids.includes(item.id))
            .map((item) => ({ id: item.id }));
    }
    if (lowerQ.includes("from items") &&
        (lowerQ.includes("where id =") || lowerQ.includes("where i.id ="))) {
        const id = values[0];
        const it = mock_db_1.mockDb.items.find((item) => item.id === id);
        if (!it)
            return [];
        return [
            {
                id: it.id,
                sku: it.sku,
                skuRef: it.sku,
                designation: it.designation,
                description: it.description ?? it.designation,
                categoryId: it.category_id,
                categoryCode: it.category_code || null,
                categoryName: it.category_name || null,
                brandId: it.brand_id,
                brandName: it.brand_name || null,
                manufacturerPartNumber: it.mpn,
                mpn: it.mpn,
                unitCode: it.unit_code,
                unitLabel: it.unit_label || it.unit_code || "Pièce",
                supplyPrice: it.supply_price ?? null,
                quotedPrice: it.quoted_price ?? null,
                vatIncluded: Boolean(it.vat_included),
                specs: it.specs ?? {},
                notes: it.notes,
                isActive: it.is_active,
                createdAt: it.created_at,
                updatedAt: it.updated_at,
                bestOfferPrice: null,
                bestOfferCurrency: "USD",
                bestOfferSupplierName: null,
            },
        ];
    }
    if (lowerQ.includes("from items")) {
        const isFilterQuery = typeof values[0] === "boolean";
        const activeOnly = isFilterQuery ? Boolean(values[0]) : false;
        const catId = isFilterQuery ? (values[1] ?? null) : null;
        const brandId = isFilterQuery ? (values[3] ?? null) : null;
        const supplierId = isFilterQuery ? (values[5] ?? null) : null;
        const search = !isFilterQuery && values[0]
            ? String(values[0]).replace(/%/g, "").toLowerCase()
            : "";
        let list = mock_db_1.mockDb.items;
        if (isFilterQuery) {
            list = list.filter((it) => {
                if (activeOnly && !it.is_active)
                    return false;
                if (catId && it.category_id !== catId)
                    return false;
                if (brandId && it.brand_id !== brandId)
                    return false;
                if (supplierId &&
                    !mock_db_1.mockDb.supplierOffers.some((so) => so.item_id === it.id &&
                        so.supplier_id === supplierId &&
                        so.is_current)) {
                    return false;
                }
                return true;
            });
        }
        else if (search) {
            list = list.filter((it) => (it.designation || "").toLowerCase().includes(search) ||
                (it.description && it.description.toLowerCase().includes(search)) ||
                (it.sku || "").toLowerCase().includes(search) ||
                (it.mpn && it.mpn.toLowerCase().includes(search)));
        }
        return list.map((it) => ({
            id: it.id,
            sku: it.sku,
            skuRef: it.sku,
            designation: it.designation,
            description: it.description ?? it.designation,
            categoryId: it.category_id,
            categoryCode: it.category_code || null,
            categoryName: it.category_name || null,
            brandId: it.brand_id,
            brandName: it.brand_name || null,
            manufacturerPartNumber: it.mpn,
            mpn: it.mpn,
            unitCode: it.unit_code,
            unitLabel: it.unit_label || it.unit_code || "Pièce",
            supplyPrice: it.supply_price ?? null,
            quotedPrice: it.quoted_price ?? null,
            vatIncluded: Boolean(it.vat_included),
            specs: it.specs ?? {},
            notes: it.notes,
            isActive: it.is_active,
            createdAt: it.created_at,
            updatedAt: it.updated_at,
            bestOfferPrice: null,
            bestOfferCurrency: "USD",
            bestOfferSupplierName: null,
        }));
    }
    // 9. Quotations & Quotation Lines
    if (lowerQ.includes("from quotation_lines") && lowerQ.includes("where quotation_id =")) {
        const qId = values[0];
        const lines = mock_db_1.mockDb.quotationLines.filter((l) => l.quotation_id === qId);
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
        const valid = mock_db_1.mockDb.quotations.filter((q) => q.status === "VALIDATED").length;
        const totalAmount = mock_db_1.mockDb.quotations.reduce((sum, q) => sum + (q.status !== "CANCELLED" ? q.total : 0), 0);
        return [{ total: mock_db_1.mockDb.quotations.length, validated: valid, total_amount: totalAmount }];
    }
    if (lowerQ.includes("from quotations") && lowerQ.includes("where q.id =")) {
        const id = values[0];
        const quote = mock_db_1.mockDb.quotations.find((q) => q.id === id);
        if (!quote)
            return [];
        const client = mock_db_1.mockDb.clients.find((c) => c.id === quote.client_id);
        const creator = mock_db_1.mockDb.users.find((u) => u.id === quote.created_by);
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
        const newQuote = {
            id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            client_id: values[0],
            doc_type: values[1] || "QUOTATION",
            client_rfq_number: values[2] || null,
            internal_reference: values[3],
            sequence_number: Number(values[4]) || 1,
            year: Number(values[5]) || new Date().getFullYear(),
            document_date: new Date().toISOString().split("T")[0],
            validity_date: values[6] || new Date().toISOString().split("T")[0],
            status: "DRAFT",
            currency: "USD",
            default_commission_percent: hasDefaultComm ? Number(values[7] || 0) : 0,
            subtotal: Number(values[hasDefaultComm ? 8 : 7] || 0),
            vat_rate: Number(values[hasDefaultComm ? 9 : 8] || 16),
            vat_amount: Number(values[hasDefaultComm ? 10 : 9] || 0),
            total: Number(values[hasDefaultComm ? 11 : 10] || 0),
            payment_terms: values[hasDefaultComm ? 12 : 11] || null,
            delivery_lead_time: values[hasDefaultComm ? 13 : 12] || null,
            notes: values[hasDefaultComm ? 14 : 13] || null,
            rejection_reason: null,
            cancellation_reason: null,
            created_by: values[hasDefaultComm ? 15 : 14],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mock_db_1.mockDb.quotations.unshift(newQuote);
        return [{ id: newQuote.id }];
    }
    if (lowerQ.startsWith("update quotations set") && lowerQ.includes("cancellation_reason =")) {
        const status = values[0];
        const reason = values[1] || null;
        const id = values[3];
        const q = mock_db_1.mockDb.quotations.find((qt) => qt.id === id);
        if (q) {
            q.status = status;
            if (reason !== null)
                q.cancellation_reason = reason;
            q.updated_at = new Date().toISOString();
        }
        return [];
    }
    if (lowerQ.startsWith("update quotations set")) {
        const hasDefaultComm = lowerQ.includes("default_commission_percent");
        const docType = values[0] || null;
        const clientRfq = values[1] || null;
        const validityDate = values[2];
        const status = values[3];
        let idx = 4;
        const defaultComm = hasDefaultComm ? Number(values[idx++] || 0) : undefined;
        const subtotal = Number(values[idx++]);
        const vatRate = Number(values[idx++]);
        const vatAmount = Number(values[idx++]);
        const total = Number(values[idx++]);
        const paymentTerms = values[idx++] || null;
        const deliveryLeadTime = values[idx++] || null;
        const notes = values[idx++] || null;
        idx++; // updated_by
        const quotationId = values[idx];
        const q = mock_db_1.mockDb.quotations.find((qt) => qt.id === quotationId);
        if (q) {
            if (docType)
                q.doc_type = docType;
            q.client_rfq_number = clientRfq;
            q.validity_date = validityDate;
            q.status = status;
            if (defaultComm !== undefined)
                q.default_commission_percent = defaultComm;
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
        const quotationId = values[0];
        mock_db_1.mockDb.quotationLines = mock_db_1.mockDb.quotationLines.filter((l) => l.quotation_id !== quotationId);
        return [];
    }
    if (lowerQ.startsWith("insert into quotation_items")) {
        const hasBrandSnapshots = lowerQ.includes("brand_snapshot");
        const hasSupplierSnapshots = lowerQ.includes("supplier_offer_id");
        let idx = 0;
        const quotationId = values[idx++];
        const itemId = values[idx++] || null;
        const lineNumber = Number(values[idx++]);
        const description = values[idx++];
        const unit = values[idx++];
        const quantity = Number(values[idx++]);
        const unitPrice = Number(values[idx++]);
        const discountPercent = Number(values[idx++] || 0);
        const lineSubtotal = Number(values[idx++]);
        const brand = hasBrandSnapshots ? (values[idx++] ?? null) : null;
        const brandImageUrl = hasBrandSnapshots ? (values[idx++] || null) : null;
        const supplierOfferId = hasSupplierSnapshots ? (values[idx++] || null) : null;
        const supplierPriceSnapshot = hasSupplierSnapshots && values[idx] != null ? Number(values[idx++]) : (hasSupplierSnapshots ? (idx++, null) : null);
        const supplierCurrencySnapshot = hasSupplierSnapshots ? (values[idx++] || null) : null;
        const supplierVatIncludedSnapshot = hasSupplierSnapshots ? values[idx++] : null;
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
        mock_db_1.mockDb.quotationLines.push(newLine);
        return [{ id: newLine.id }];
    }
    if (lowerQ.includes("from quotation_items")) {
        const quoteId = values[0];
        return mock_db_1.mockDb.quotationLines
            .filter((l) => l.quotation_id === quoteId)
            .sort((a, b) => a.line_number - b.line_number)
            .map((l) => {
            let resolvedBrand = l.brand;
            if (resolvedBrand === null && l.item_id) {
                const it = mock_db_1.mockDb.items.find((item) => item.id === l.item_id);
                resolvedBrand = it?.brand_name?.trim() || null;
            }
            else if (resolvedBrand === "") {
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
        const statusParam = values.find((v) => typeof v === "string" && ["DRAFT", "SUBMITTED", "VALIDATED", "EXPIRED", "REJECTED", "CANCELLED"].includes(v));
        const list = statusParam
            ? mock_db_1.mockDb.quotations.filter((q) => q.status === statusParam)
            : mock_db_1.mockDb.quotations;
        const limitMatch = lowerQ.match(/limit (\d+)/);
        const limit = limitMatch ? parseInt(limitMatch[1], 10) : list.length;
        return list.slice(0, limit).map((q) => {
            const client = mock_db_1.mockDb.clients.find((c) => c.id === q.client_id);
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
        const docType = values[0] || "ORDER";
        const year = values[1] || new Date().getFullYear();
        const key = `${docType}_${year}`;
        const nextVal = (mock_db_1.mockDb.documentCounters[key] || 0) + 1;
        mock_db_1.mockDb.documentCounters[key] = nextVal;
        return [{ current_val: nextVal }];
    }
    // 10. Purchase Orders (Orders)
    if (lowerQ.startsWith("insert into orders")) {
        const newOrd = {
            id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            order_number: values[0],
            client_id: values[1],
            quotation_id: values[2],
            client_po_number: values[3],
            po_date: values[4] || new Date().toISOString().split("T")[0],
            expected_delivery_date: values[5] || null,
            status: "CONFIRMED",
            currency: values[7] || "USD",
            subtotal: Number(values[8]),
            vat_rate: Number(values[9] || 16.0),
            vat_amount: Number(values[10]),
            total: Number(values[11]),
            notes: values[12] || null,
            cancellation_reason: null,
            created_by: values[13],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mock_db_1.mockDb.orders.unshift(newOrd);
        return [{ id: newOrd.id }];
    }
    if (lowerQ.startsWith("update orders set status =")) {
        const status = values[0];
        const reason = values[1];
        const id = values[3];
        const ord = mock_db_1.mockDb.orders.find((o) => o.id === id);
        if (ord) {
            ord.status = status;
            if (reason)
                ord.cancellation_reason = reason;
            ord.updated_at = new Date().toISOString();
        }
        return [];
    }
    if (lowerQ.includes("from order_items") && (lowerQ.includes("order_id =") || lowerQ.includes("oi.order_id ="))) {
        const oId = values[0];
        const items = mock_db_1.mockDb.orderItems.filter((oi) => oi.order_id === oId);
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
            order_id: values[0],
            quotation_item_id: values[1] || null,
            item_id: values[2] || null,
            line_number: Number(values[3]),
            description_snapshot: values[4],
            unit_snapshot: values[5],
            quantity_ordered: Number(values[6]),
            quantity_delivered: Number(values[7] || 0),
            unit_price_snapshot: Number(values[8]),
            line_subtotal: Number(values[9]),
            brand_snapshot: values[10] || null,
            discount_percent_snapshot: Number(values[11] || 0),
        };
        mock_db_1.mockDb.orderItems.push(newOi);
        return [{ id: newOi.id }];
    }
    if (lowerQ.startsWith("update order_items set quantity_delivered =")) {
        const qty = Number(values[0]);
        const id = values[1];
        const item = mock_db_1.mockDb.orderItems.find((oi) => oi.id === id);
        if (item)
            item.quantity_delivered = qty;
        return [];
    }
    if (lowerQ.includes("from orders") && lowerQ.includes("count(*)::int as total")) {
        const active = mock_db_1.mockDb.orders.filter((o) => o.status === "CONFIRMED" || o.status === "PARTIALLY_DELIVERED").length;
        const totalAmount = mock_db_1.mockDb.orders.reduce((sum, o) => sum + (o.status !== "CANCELLED" ? o.total : 0), 0);
        return [{ total: mock_db_1.mockDb.orders.length, active, total_amount: totalAmount }];
    }
    if (lowerQ.includes("from orders") && lowerQ.includes("where o.id =")) {
        const id = values[0];
        const o = mock_db_1.mockDb.orders.find((ord) => ord.id === id);
        if (!o)
            return [];
        const client = mock_db_1.mockDb.clients.find((c) => c.id === o.client_id);
        const quote = mock_db_1.mockDb.quotations.find((q) => q.id === o.quotation_id);
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
        const qId = values[0];
        return mock_db_1.mockDb.orders
            .filter((o) => o.quotation_id === qId)
            .slice(0, 1)
            .map((o) => ({ id: o.id }));
    }
    if (lowerQ.includes("from orders")) {
        return mock_db_1.mockDb.orders.map((o) => {
            const client = mock_db_1.mockDb.clients.find((c) => c.id === o.client_id);
            const quote = mock_db_1.mockDb.quotations.find((q) => q.id === o.quotation_id);
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
    if (lowerQ.includes("from delivery_note_items") &&
        (lowerQ.includes("delivery_note_id =") || lowerQ.includes("dni.delivery_note_id =")) &&
        !lowerQ.includes("group by")) {
        const blId = values[0];
        return mock_db_1.mockDb.deliveryNoteItems.filter((i) => i.delivery_note_id === blId).map((i) => ({
            id: i.id,
            deliveryNoteId: i.delivery_note_id,
            orderItemId: i.order_item_id,
            itemId: i.item_id,
            lineNumber: i.line_number,
            description: i.description_snapshot,
            unit: i.unit_snapshot,
            brand: i.brand_snapshot || null,
            quantityDelivered: i.quantity_delivered,
            observation: i.observation_snapshot || null,
        }));
    }
    if (lowerQ.includes("from delivery_note_items") && (lowerQ.includes("dn.order_id =") || lowerQ.includes("group by"))) {
        const orderId = values[0];
        const blsForOrder = mock_db_1.mockDb.deliveryNotes.filter((bl) => bl.order_id === orderId);
        const blMap = new Map(blsForOrder.map((bl) => [bl.id, bl]));
        return mock_db_1.mockDb.deliveryNoteItems.filter((dni) => blMap.has(dni.delivery_note_id)).map((i) => {
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
            delivery_note_id: values[0],
            order_item_id: values[1],
            item_id: values[2] || null,
            line_number: Number(values[3]),
            description_snapshot: values[4],
            unit_snapshot: values[5],
            quantity_delivered: Number(values[6]),
            observation_snapshot: values[7] || null,
        };
        mock_db_1.mockDb.deliveryNoteItems.push(newDni);
        return [{ id: newDni.id }];
    }
    if (lowerQ.includes("from delivery_notes") && (lowerQ.includes("where dn.id =") || lowerQ.includes("dn.id::text ="))) {
        const id = values[0];
        const bl = mock_db_1.mockDb.deliveryNotes.find((d) => d.id === id || d.bl_number === id);
        if (!bl)
            return [];
        const client = mock_db_1.mockDb.clients.find((c) => c.id === bl.client_id);
        const order = mock_db_1.mockDb.orders.find((o) => o.id === bl.order_id);
        const quote = order ? mock_db_1.mockDb.quotations.find((q) => q.id === order.quotation_id) : null;
        const invoice = mock_db_1.mockDb.invoices.find((i) => i.id === bl.invoice_id);
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
        const orderId = values[0];
        let list = mock_db_1.mockDb.deliveryNotes;
        if (orderId && lowerQ.includes("order_id =")) {
            list = list.filter((bl) => bl.order_id === orderId);
        }
        return list.map((bl) => {
            const client = mock_db_1.mockDb.clients.find((c) => c.id === bl.client_id);
            const order = mock_db_1.mockDb.orders.find((o) => o.id === bl.order_id);
            const invoice = mock_db_1.mockDb.invoices.find((i) => i.id === bl.invoice_id);
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
            bl_number: values[0],
            client_id: values[1],
            order_id: values[2],
            invoice_id: values[3] || null,
            delivery_date: values[4] || new Date().toISOString().split("T")[0],
            carrier_name: values[5] || null,
            driver_name: values[6] || null,
            vehicle_plate: values[7] || null,
            receiver_name: values[8] || null,
            status: "PREPARED",
            notes: values[10] || null,
            cancellation_reason: null,
            created_by: values[11],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mock_db_1.mockDb.deliveryNotes.unshift(newBl);
        return [{ id: newBl.id, blNumber: newBl.bl_number }];
    }
    if (lowerQ.startsWith("update delivery_notes set status =")) {
        const status = values[0];
        const reason = values[1];
        const id = values[2];
        const bl = mock_db_1.mockDb.deliveryNotes.find((d) => d.id === id);
        if (bl) {
            bl.status = status;
            if (reason)
                bl.cancellation_reason = reason;
            bl.updated_at = new Date().toISOString();
        }
        return [];
    }
    // 12. Invoices & Invoice Items
    if (lowerQ.startsWith("insert into invoices")) {
        const newInv = {
            id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            invoice_number: values[0],
            client_id: values[1],
            order_id: values[2] || null,
            quotation_id: values[3] || null,
            issue_date: values[4] || new Date().toISOString().split("T")[0],
            due_date: values[5] || new Date().toISOString().split("T")[0],
            status: values[6] || "ISSUED",
            currency: values[7] || "USD",
            subtotal: Number(values[8]),
            vat_rate: Number(values[9] || 16.0),
            vat_amount: Number(values[10]),
            total: Number(values[11]),
            paid_amount: Number(values[12] || 0),
            balance_due: Number(values[13]),
            payment_terms: "30_DAYS",
            notes: values[14] || null,
            cancellation_reason: null,
            created_by: values[15],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mock_db_1.mockDb.invoices.unshift(newInv);
        return [{ id: newInv.id }];
    }
    if (lowerQ.includes("from invoice_items") && (lowerQ.includes("invoice_id =") || lowerQ.includes("ii.invoice_id ="))) {
        const invId = values[0];
        return mock_db_1.mockDb.invoiceItems.filter((i) => i.invoice_id === invId).map((i) => ({
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
            invoice_id: values[0],
            order_item_id: values[1] || null,
            item_id: values[2] || null,
            line_number: Number(values[3]),
            description_snapshot: values[4],
            unit_snapshot: values[5],
            quantity: Number(values[6]),
            unit_price_snapshot: Number(values[7]),
            line_subtotal: Number(values[8]),
            brand_snapshot: values[9] || null,
            discount_percent_snapshot: Number(values[10] || 0),
        };
        mock_db_1.mockDb.invoiceItems.push(newIi);
        return [{ id: newIi.id }];
    }
    if (lowerQ.startsWith("update invoices set normalized_invoice_number =")) {
        const val = values[0] || null;
        const id = values[2];
        const inv = mock_db_1.mockDb.invoices.find((i) => i.id === id);
        if (inv) {
            inv.normalized_invoice_number = val;
            inv.updated_at = new Date().toISOString();
        }
        return [{ id }];
    }
    if (lowerQ.includes("from invoices") && lowerQ.includes("i.balance_due > 0")) {
        const clientId = values[0];
        const startFilter = values[1] || null;
        const endFilter = values[2] || null;
        let list = mock_db_1.mockDb.invoices.filter((i) => i.client_id === clientId &&
            i.status !== "CANCELLED" &&
            i.status !== "DRAFT" &&
            ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status) &&
            i.balance_due > 0);
        if (startFilter) {
            list = list.filter((i) => i.issue_date >= startFilter);
        }
        if (endFilter) {
            list = list.filter((i) => i.issue_date <= endFilter);
        }
        list.sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());
        return list.map((inv) => {
            const order = mock_db_1.mockDb.orders.find((o) => o.id === inv.order_id);
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
        const totalInvoiced = mock_db_1.mockDb.invoices.reduce((s, i) => s + (i.status !== "CANCELLED" ? i.total : 0), 0);
        const receivables = mock_db_1.mockDb.invoices.reduce((s, i) => s + (i.status !== "CANCELLED" ? i.balance_due : 0), 0);
        const unpaid = mock_db_1.mockDb.invoices.filter((i) => i.balance_due > 0).length;
        return [{ total: mock_db_1.mockDb.invoices.length, total_invoiced: totalInvoiced, total_receivables: receivables, unpaid_count: unpaid }];
    }
    if (lowerQ.includes("from invoices") && (lowerQ.includes("where i.id =") || lowerQ.includes("i.id::text ="))) {
        const id = values[0];
        const inv = mock_db_1.mockDb.invoices.find((i) => i.id === id || i.invoice_number === id || i.normalized_invoice_number === id);
        if (!inv)
            return [];
        const client = mock_db_1.mockDb.clients.find((c) => c.id === inv.client_id);
        const order = mock_db_1.mockDb.orders.find((o) => o.id === inv.order_id);
        const quote = order ? mock_db_1.mockDb.quotations.find((q) => q.id === order.quotation_id) : null;
        const bl = mock_db_1.mockDb.deliveryNotes.find((d) => d.invoice_id === inv.id);
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
        const qId = values[0];
        return mock_db_1.mockDb.invoices
            .filter((i) => i.quotation_id === qId)
            .slice(0, 1)
            .map((i) => ({ id: i.id }));
    }
    if (lowerQ.includes("from invoices")) {
        return mock_db_1.mockDb.invoices.map((inv) => {
            const client = mock_db_1.mockDb.clients.find((c) => c.id === inv.client_id);
            const order = mock_db_1.mockDb.orders.find((o) => o.id === inv.order_id);
            const quote = mock_db_1.mockDb.quotations.find((q) => q.id === inv.quotation_id);
            const bl = mock_db_1.mockDb.deliveryNotes.find((d) => d.invoice_id === inv.id);
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
        const collected = mock_db_1.mockDb.payments.reduce((s, p) => s + p.amount, 0);
        return [{ total: mock_db_1.mockDb.payments.length, total_collected: collected }];
    }
    if (lowerQ.includes("from payments")) {
        return mock_db_1.mockDb.payments.map((p) => {
            const client = mock_db_1.mockDb.clients.find((c) => c.id === p.client_id);
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
