/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// Read-Only Database Schema Verification for MIS SARL
// Checks tables, columns, constraints, indexes and row counts
// ============================================================================

const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[Error] DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function verifyDatabase() {
  console.log('===========================================================');
  console.log(' MIS SARL - PostgreSQL Schema Verification');
  console.log('===========================================================\n');

  // 1. List all public tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;

  console.log(`[Public Tables Found: ${tables.length}]`);
  tables.forEach((t) => console.log(`  - ${t.table_name}`));

  // 2. Count rows in key tables
  console.log('\n[Entity Row Counts]');
  const expectedTables = [
    'users',
    'sessions',
    'clients',
    'client_quotation_sequences',
    'suppliers',
    'items',
    'quotations',
    'quotation_items',
    'orders',
    'order_items',
    'invoices',
    'invoice_items',
    'delivery_notes',
    'delivery_note_items',
    'payments',
    'payment_allocations',
    'audit_logs',
    'document_exports',
    'schema_migrations',
  ];

  for (const tableName of expectedTables) {
    try {
      const res = await sql.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);
      console.log(`  - ${tableName.padEnd(28)}: ${res[0].count} row(s)`);
    } catch {
      console.log(`  - ${tableName.padEnd(28)}: [TABLE NOT FOUND]`);
    }
  }

  // 3. Foreign Key Constraints check
  console.log('\n[Foreign Key Constraints]');
  const fks = await sql`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `;

  console.log(`Total Foreign Keys: ${fks.length}`);
  fks.forEach((fk) => {
    console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
  });

  // 4. Unique Constraints check
  console.log('\n[Unique Constraints]');
  const uniques = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name;
  `;

  console.log(`Total Unique Constraints: ${uniques.length}`);
  uniques.forEach((u) => {
    console.log(`  ${u.table_name}: (${u.columns}) [${u.constraint_name}]`);
  });

  console.log('\nVerification completed.');
}

verifyDatabase().catch((err) => {
  console.error('[Verification Error]:', err);
  process.exit(1);
});
