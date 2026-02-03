/**
 * Websites module - domains service
 * Custom domain status, validation, remove.
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const db = require('../../../../config/db');

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const DOMAIN_MANAGER_PATH = '/opt/oaf-ssl-automation/domain-manager.js';

async function getStatus(userId, siteId) {
  const [sites] = await db.execute(
    `SELECT s.id, s.custom_domain, s.domain_validation_key, s.domain_validation_status,
     s.domain_validation_expires, s.custom_domain_active, s.domain_validation_error,
     s.domain_validation_attempted_at, s.user_id
     FROM sites s WHERE s.id = ?`,
    [siteId]
  );
  if (!sites[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.execute('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (sites[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  const site = sites[0];
  return {
    siteId: site.id,
    customDomain: site.custom_domain,
    validationStatus: site.domain_validation_status,
    validationKey: site.domain_validation_key,
    expiresAt: site.domain_validation_expires,
    isActive: site.custom_domain_active,
    error: site.domain_validation_error,
    lastAttempt: site.domain_validation_attempted_at,
    dnsInstructions: site.domain_validation_key
      ? `Add DNS TXT record: _oaf-site-verification.${site.custom_domain} = ${site.domain_validation_key}`
      : null
  };
}

async function checkAvailability(userId, domain) {
  if (!domain) {
    const err = new Error('Domain parameter is required');
    err.statusCode = 400;
    throw err;
  }
  if (!DOMAIN_REGEX.test(domain)) {
    return { available: false, error: 'Invalid domain format' };
  }
  const [existingDomain] = await db.execute('SELECT id, subdomain FROM sites WHERE custom_domain = ?', [domain]);
  if (existingDomain.length > 0) {
    return { available: false, error: 'Domain already in use', usedBy: existingDomain[0].subdomain };
  }
  return { available: true };
}

async function startValidation(userId, siteId, customDomain) {
  if (!siteId || !customDomain) {
    const err = new Error('siteId and customDomain are required');
    err.statusCode = 400;
    throw err;
  }
  if (!DOMAIN_REGEX.test(customDomain)) {
    const err = new Error('Invalid domain format');
    err.statusCode = 400;
    throw err;
  }
  const [sites] = await db.execute('SELECT id, user_id FROM sites WHERE id = ?', [siteId]);
  if (!sites[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.execute('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (sites[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  const [existingDomain] = await db.execute('SELECT id FROM sites WHERE custom_domain = ? AND id != ?', [customDomain, siteId]);
  if (existingDomain.length > 0) {
    const err = new Error('Domain already in use');
    err.statusCode = 400;
    throw err;
  }
  await db.execute('UPDATE sites SET custom_domain = ? WHERE id = ?', [customDomain, siteId]);
  try {
    const { stdout } = await execAsync(`sudo node ${DOMAIN_MANAGER_PATH} start-validation ${siteId} ${customDomain}`);
    const lines = stdout.split('\n');
    const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
    const jsonEndIndex = lines.findIndex((line, index) => index > jsonStartIndex && line.trim() === '}');
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error('No complete JSON response from domain manager');
    }
    const jsonString = lines.slice(jsonStartIndex, jsonEndIndex + 1).join('\n');
    const result = JSON.parse(jsonString);
    if (result.success) {
      return {
        success: true,
        message: 'Domain validation started',
        validationKey: result.validationKey,
        expiresAt: result.expiresAt,
        instructions: result.instructions
      };
    }
    const err = new Error(result.error || 'Failed to start validation');
    err.statusCode = 500;
    throw err;
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('START-VALIDATION: Domain manager error:', error);
    const err = new Error('Failed to start domain validation');
    err.statusCode = 500;
    throw err;
  }
}

async function retryValidation(userId, siteId) {
  const [sites] = await db.execute('SELECT id, user_id, custom_domain FROM sites WHERE id = ?', [siteId]);
  if (!sites[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.execute('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (sites[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  if (!sites[0].custom_domain) {
    const err = new Error('No custom domain set for this site');
    err.statusCode = 400;
    throw err;
  }
  try {
    const { stdout } = await execAsync(`sudo node ${DOMAIN_MANAGER_PATH} process-domain ${siteId}`);
    const lines = stdout.split('\n');
    const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
    const jsonEndIndex = lines.findIndex((line, index) => index > jsonStartIndex && line.trim() === '}');
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error('No complete JSON response from domain manager');
    }
    const result = JSON.parse(lines.slice(jsonStartIndex, jsonEndIndex + 1).join('\n'));
    if (result.success) {
      return { success: true, message: 'Domain validation processing started' };
    }
    const err = new Error(result.error || 'Failed to retry');
    err.statusCode = 500;
    throw err;
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('RETRY-VALIDATION: Domain manager error:', error);
    const err = new Error('Failed to retry domain validation');
    err.statusCode = 500;
    throw err;
  }
}

async function cancelValidation(userId, siteId) {
  const [sites] = await db.execute('SELECT id, user_id, custom_domain FROM sites WHERE id = ?', [siteId]);
  if (!sites[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.execute('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (sites[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  await db.execute(`
    UPDATE sites SET
     domain_validation_status = NULL,
     domain_validation_key = NULL,
     domain_validation_expires = NULL,
     domain_validation_error = NULL,
     domain_validation_attempted_at = NULL
    WHERE id = ?
  `, [siteId]);
  return { success: true, message: 'Domain validation cancelled successfully' };
}

async function remove(userId, siteId) {
  const [sites] = await db.execute('SELECT id, user_id, custom_domain FROM sites WHERE id = ?', [siteId]);
  if (!sites[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.execute('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (sites[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  await db.execute(`
    UPDATE sites SET
     custom_domain = NULL,
     domain_validation_key = NULL,
     domain_validation_status = 'pending',
     domain_validation_expires = NULL,
     custom_domain_active = FALSE,
     domain_validation_attempted_at = NULL,
     domain_validation_error = NULL
    WHERE id = ?
  `, [siteId]);
  return { success: true, message: 'Custom domain removed' };
}

// ============================================================================
// ADMIN: List all domains
// ============================================================================

async function listAllDomains() {
  const [domains] = await db.execute(`
    SELECT s.id, s.subdomain, s.custom_domain, s.domain_validation_status,
           s.custom_domain_active, s.domain_validation_expires, s.domain_validation_error,
           u.username
    FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE s.custom_domain IS NOT NULL
    ORDER BY s.created_at DESC
  `);
  return domains;
}

module.exports = {
  getStatus,
  checkAvailability,
  startValidation,
  retryValidation,
  cancelValidation,
  remove,
  listAllDomains
};
