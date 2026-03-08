#!/usr/bin/env node

/**
 * One-time migration: Encrypt existing plaintext OAuth tokens
 * 
 * Encrypts access_token, refresh_token, and provider_token fields
 * across all tables that store OAuth credentials.
 * 
 * Safe to run multiple times (idempotent) — skips values already encrypted.
 * 
 * Usage:
 *   node database/migrations/014_encrypt_existing_tokens.js [--dry-run]
 * 
 * Requires ENCRYPTION_KEY in environment (loaded from api-service/.env).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../api-service/.env') });

const mysql = require('mysql2/promise');
const { encrypt, isEncrypted } = require('../../api-service/src/utils/encryption');

const dryRun = process.argv.includes('--dry-run');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  timezone: '-07:00'
};

const TABLES = [
  {
    name: 'etsy_user_shops',
    pk: 'id',
    tokenColumns: ['access_token', 'refresh_token']
  },
  {
    name: 'tiktok_user_shops',
    pk: 'id',
    tokenColumns: ['access_token', 'refresh_token']
  },
  {
    name: 'social_connections',
    pk: 'id',
    tokenColumns: ['access_token', 'refresh_token']
  },
  {
    name: 'user_logins',
    pk: 'id',
    tokenColumns: ['provider_token']
  }
];

async function migrateTable(db, table) {
  const { name, pk, tokenColumns } = table;
  const selectCols = [pk, ...tokenColumns].join(', ');

  console.log(`\n--- ${name} ---`);

  const [rows] = await db.execute(`SELECT ${selectCols} FROM ${name}`);
  console.log(`  Total rows: ${rows.length}`);

  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const updates = {};

    for (const col of tokenColumns) {
      const value = row[col];
      if (value == null || value === '') {
        continue;
      }
      if (isEncrypted(value)) {
        skipped++;
        continue;
      }
      updates[col] = encrypt(value);
    }

    if (Object.keys(updates).length === 0) {
      continue;
    }

    const setClauses = Object.keys(updates).map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(updates), row[pk]];

    if (dryRun) {
      console.log(`  [DRY RUN] Would encrypt ${Object.keys(updates).join(', ')} for ${pk}=${row[pk]}`);
      encrypted += Object.keys(updates).length;
      continue;
    }

    try {
      await db.execute(
        `UPDATE ${name} SET ${setClauses} WHERE ${pk} = ?`,
        values
      );
      encrypted += Object.keys(updates).length;
    } catch (err) {
      console.error(`  ERROR encrypting ${pk}=${row[pk]}: ${err.message}`);
      errors++;
    }
  }

  console.log(`  Encrypted: ${encrypted} fields`);
  console.log(`  Already encrypted (skipped): ${skipped}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

async function main() {
  console.log('=== OAuth Token Encryption Migration ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Database: ${dbConfig.host}/${dbConfig.database}`);
  console.log('');

  const db = await mysql.createConnection(dbConfig);

  try {
    for (const table of TABLES) {
      await migrateTable(db, table);
    }
    console.log('\n=== Migration complete ===');
  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
