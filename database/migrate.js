/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// Database Migration Runner for MIS SARL
// Uses direct SQL via @neondatabase/serverless without ORM
// ============================================================================

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[Error] DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const sql = neon(databaseUrl);

function splitSqlStatements(sqlContent) {
  const statements = [];
  let current = '';
  let inString = false;
  let inComment = false;

  for (let i = 0; i < sqlContent.length; i++) {
    const char = sqlContent[i];
    const nextChar = sqlContent[i + 1];

    if (!inString && char === '-' && nextChar === '-') {
      inComment = true;
      i++;
      continue;
    }

    if (inComment) {
      if (char === '\n') {
        inComment = false;
      }
      continue;
    }

    if (char === "'") {
      if (inString && nextChar === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
      current += char;
      continue;
    }

    if (char === ';' && !inString) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

async function runMigrations() {
  console.log('[Migration] Starting database migration check...');

  // 1. Ensure migrations table exists
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 2. Query applied migrations
  const appliedRows = await sql`SELECT version FROM schema_migrations ORDER BY version`;
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // 3. Read migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`[Error] Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`[Migration] Found ${files.length} migration file(s).`);

  let appliedCount = 0;

  for (const file of files) {
    const version = file.split('_')[0];
    if (appliedVersions.has(version)) {
      console.log(`[Skip] Migration ${file} is already applied.`);
      continue;
    }

    console.log(`[Applying] ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const statements = splitSqlStatements(content);

    try {
      // Execute each statement sequentially
      for (const statement of statements) {
        await sql.query(statement);
      }

      // Record applied migration
      await sql`
        INSERT INTO schema_migrations (version, name)
        VALUES (${version}, ${file})
      `;

      console.log(`[Success] Applied ${file} (${statements.length} statements)`);
      appliedCount++;
    } catch (err) {
      console.error(`[Fatal] Failed applying ${file}:`, err);
      process.exit(1);
    }
  }

  console.log(`\n[Migration Complete] ${appliedCount} migration(s) applied successfully.`);
}

runMigrations().catch((err) => {
  console.error('[Migration Runner Error]:', err);
  process.exit(1);
});
