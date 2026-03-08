#!/usr/bin/env node

/**
 * One-time script to seed secrets from .env files into GCP Secret Manager.
 * 
 * Usage:
 *   node api-service/scripts/seed-secrets.js [--dry-run]
 * 
 * Reads the api-service/.env and root .env, extracts secret keys,
 * and uploads them as a single JSON secret to GCP Secret Manager.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const GCP_PROJECT_ID = 'onlineartfestival-com';
const dryRun = process.argv.includes('--dry-run');

const { SECRET_KEYS } = require('../src/utils/loadSecrets');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = dotenv.parse(content);
  return parsed;
}

async function main() {
  const apiEnv = parseEnvFile(path.join(__dirname, '../.env'));
  const rootEnv = parseEnvFile(path.join(__dirname, '../../.env'));

  const merged = { ...rootEnv, ...apiEnv };

  const secrets = {};
  for (const key of SECRET_KEYS) {
    if (merged[key] !== undefined && merged[key] !== '') {
      secrets[key] = merged[key];
    }
  }

  const instance = apiEnv.API_INSTANCE || 'staging';
  const secretName = `${instance}-env-secrets`;

  console.log(`Secret name: ${secretName}`);
  console.log(`Project: ${GCP_PROJECT_ID}`);
  console.log(`Keys to store: ${Object.keys(secrets).length}`);
  console.log('');

  for (const key of Object.keys(secrets).sort()) {
    const preview = secrets[key].length > 20
      ? secrets[key].substring(0, 8) + '...' + secrets[key].substring(secrets[key].length - 4)
      : '****';
    console.log(`  ${key} = ${preview}`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would create/update secret. No changes made.');
    return;
  }

  console.log('\nUploading to GCP Secret Manager...');

  const client = new SecretManagerServiceClient();
  const parent = `projects/${GCP_PROJECT_ID}`;
  const payload = JSON.stringify(secrets, null, 2);

  try {
    await client.getSecret({ name: `${parent}/secrets/${secretName}` });
    console.log('Secret already exists, adding new version...');
  } catch (err) {
    if (err.code === 5) {
      console.log('Creating new secret...');
      await client.createSecret({
        parent,
        secretId: secretName,
        secret: { replication: { automatic: {} } },
      });
    } else {
      throw err;
    }
  }

  const [version] = await client.addSecretVersion({
    parent: `${parent}/secrets/${secretName}`,
    payload: { data: Buffer.from(payload, 'utf8') },
  });

  console.log(`Secret version created: ${version.name}`);
  console.log('Done.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
