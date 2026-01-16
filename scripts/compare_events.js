/**
 * Event Field Comparison Script
 * Compares WordPress events (live oaf_wp) with Brakebee events
 * Reports field-by-field differences
 */

const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

// Brakebee DB config
const brakebeeConfig = {
  host: '10.128.0.31',
  user: 'oafuser',
  password: 'oafpass',
  database: 'oaf'
};

// Field mapping: WordPress -> Brakebee
const FIELD_MAPPING = {
  // Core post fields
  'post_title': 'title',
  'post_content': 'description',
  'post_excerpt': 'short_description',
  'post_status': 'event_status',
  'post_date': 'created_at',
  'post_modified': 'updated_at',
  
  // Meta fields
  '_event_start': 'start_date',
  '_event_end': 'end_date',
  '_event_venue': 'venue_name',
  '_event_address': 'venue_address',
  '_event_city': 'venue_city',
  '_event_state': 'venue_state',
  '_event_zip': 'venue_zip',
  '_event_country': 'venue_country',
  '_event_cost': 'admission_fee',
  '_event_ei_booth_fee': 'booth_fee',
  '_event_ei_jury_fee': 'jury_fee',
  '_event_ei_due_date': 'application_deadline',
  '_event_claim_status': 'claim_status',
  '_yoast_wpseo_title': 'seo_title',
  '_yoast_wpseo_metadesc': 'meta_description'
  // _event_url -> event_url (column doesn't exist in Brakebee yet)
};

// Status mapping
const STATUS_MAP = {
  'publish': 'active',
  'draft': 'draft',
  'pending': 'draft',
  'private': 'draft'
};

async function getWordPressEvents() {
  // Query WordPress via SSH
  const query = `
    SELECT 
      p.ID as wp_id,
      p.post_title,
      p.post_content,
      p.post_excerpt,
      p.post_status,
      p.post_date,
      p.post_modified,
      p.post_author
    FROM wp_posts p
    WHERE p.post_type='7055_event' 
    AND p.post_status='publish'
    ORDER BY p.post_title;
  `;
  
  const cmd = `sshpass -p 'CursorTemp2026!' ssh -o StrictHostKeyChecking=no cursor_temp@35.224.2.248 "mysql -u oaf_admin -p'Fjkfask(1kwof981!' oaf_wp -N -e \\"${query.replace(/\n/g, ' ')}\\""`;
  
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const events = [];
  
  for (const line of result.trim().split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    events.push({
      wp_id: parts[0],
      post_title: parts[1],
      post_content: parts[2] || '',
      post_excerpt: parts[3] || '',
      post_status: parts[4],
      post_date: parts[5],
      post_modified: parts[6],
      post_author: parts[7]
    });
  }
  
  return events;
}

async function getWordPressEventMeta(wpIds) {
  const idsStr = wpIds.join(',');
  const query = `
    SELECT post_id, meta_key, meta_value 
    FROM wp_postmeta 
    WHERE post_id IN (${idsStr})
    AND meta_key IN (
      '_event_start', '_event_end', '_event_venue', '_event_address',
      '_event_city', '_event_state', '_event_zip', '_event_country',
      '_event_cost', '_event_ei_booth_fee', '_event_ei_jury_fee',
      '_event_ei_due_date', '_event_claim_status', '_event_url',
      '_yoast_wpseo_title', '_yoast_wpseo_metadesc'
    );
  `;
  
  const cmd = `sshpass -p 'CursorTemp2026!' ssh -o StrictHostKeyChecking=no cursor_temp@35.224.2.248 "mysql -u oaf_admin -p'Fjkfask(1kwof981!' oaf_wp -N -e \\"${query.replace(/\n/g, ' ')}\\""`;
  
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const metaByPost = {};
  
  for (const line of result.trim().split('\n')) {
    if (!line) continue;
    const [postId, metaKey, metaValue] = line.split('\t');
    if (!metaByPost[postId]) metaByPost[postId] = {};
    metaByPost[postId][metaKey] = metaValue || '';
  }
  
  return metaByPost;
}

async function getBrakebeeEvents(conn) {
  const [rows] = await conn.execute(`
    SELECT 
      id, title, description, short_description, event_status,
      created_at, updated_at, promoter_id,
      start_date, end_date, venue_name, venue_address,
      venue_city, venue_state, venue_zip, venue_country,
      admission_fee, booth_fee, jury_fee, application_deadline,
      claim_status, seo_title, meta_description
    FROM events
    WHERE event_status IN ('active', 'draft', 'archived', 'unclaimed')
    ORDER BY title
  `);
  
  return rows;
}

function normalizeValue(val, fieldName) {
  if (val === null || val === undefined || val === 'NULL') return '';
  
  let str = String(val).trim();
  
  // Decode HTML entities
  str = str.replace(/&amp;/g, '&')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>')
           .replace(/&quot;/g, '"')
           .replace(/&#039;/g, "'");
  
  // Handle dates - extract just the date part
  if (fieldName.includes('date') || fieldName.includes('_start') || fieldName.includes('_end')) {
    const dateMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return dateMatch[1];
  }
  
  // Handle money fields
  if (fieldName.includes('fee') || fieldName.includes('cost') || fieldName.includes('admission')) {
    const num = parseFloat(str);
    if (!isNaN(num)) return num.toFixed(2);
    return '0.00';
  }
  
  return str;
}

function compareFields(wpEvent, wpMeta, bbEvent) {
  const differences = [];
  
  // Compare each mapped field
  for (const [wpField, bbField] of Object.entries(FIELD_MAPPING)) {
    let wpValue, bbValue;
    
    // Get WordPress value
    if (wpField.startsWith('_')) {
      wpValue = wpMeta[wpField] || '';
    } else {
      wpValue = wpEvent[wpField] || '';
    }
    
    // Get Brakebee value
    bbValue = bbEvent[bbField];
    
    // Normalize values
    wpValue = normalizeValue(wpValue, wpField);
    bbValue = normalizeValue(bbValue, bbField);
    
    // Special handling for status
    if (wpField === 'post_status') {
      wpValue = STATUS_MAP[wpValue] || wpValue;
    }
    
    // Skip comparison for certain fields that won't match exactly
    if (wpField === 'post_date' || wpField === 'post_modified') {
      continue; // Timestamps won't match exactly
    }
    
    // Skip empty on both sides
    if (!wpValue && !bbValue) continue;
    
    // Compare
    if (wpValue !== bbValue) {
      differences.push({
        field: `${wpField} -> ${bbField}`,
        wordpress: wpValue.substring(0, 100) + (wpValue.length > 100 ? '...' : ''),
        brakebee: String(bbValue).substring(0, 100) + (String(bbValue).length > 100 ? '...' : '')
      });
    }
  }
  
  return differences;
}

async function main() {
  console.log('=== EVENT FIELD-BY-FIELD COMPARISON ===\n');
  console.log('Fetching WordPress events...');
  
  const wpEvents = await getWordPressEvents();
  console.log(`Found ${wpEvents.length} WordPress events\n`);
  
  console.log('Fetching WordPress meta...');
  const wpIds = wpEvents.map(e => e.wp_id);
  const wpMeta = await getWordPressEventMeta(wpIds);
  console.log(`Fetched meta for ${Object.keys(wpMeta).length} events\n`);
  
  console.log('Fetching Brakebee events...');
  const conn = await mysql.createConnection(brakebeeConfig);
  const bbEvents = await getBrakebeeEvents(conn);
  console.log(`Found ${bbEvents.length} Brakebee events\n`);
  
  // Create lookup by normalized title
  const bbByTitle = {};
  for (const bb of bbEvents) {
    const normTitle = bb.title.replace(/&amp;/g, '&').trim().toLowerCase();
    bbByTitle[normTitle] = bb;
  }
  
  // Compare matched events
  let matchCount = 0;
  let diffCount = 0;
  const allDifferences = [];
  
  for (const wp of wpEvents) {
    const normTitle = wp.post_title.replace(/&amp;/g, '&').trim().toLowerCase();
    const bb = bbByTitle[normTitle];
    
    if (!bb) continue; // Skip unmatched
    
    matchCount++;
    const meta = wpMeta[wp.wp_id] || {};
    const diffs = compareFields(wp, meta, bb);
    
    if (diffs.length > 0) {
      diffCount++;
      allDifferences.push({
        wp_id: wp.wp_id,
        bb_id: bb.id,
        title: wp.post_title,
        differences: diffs
      });
    }
  }
  
  await conn.end();
  
  // Output results
  console.log('=== RESULTS ===\n');
  console.log(`Matched events: ${matchCount}`);
  console.log(`Events with differences: ${diffCount}`);
  console.log(`Events identical: ${matchCount - diffCount}\n`);
  
  if (allDifferences.length > 0) {
    console.log('=== DIFFERENCES BY EVENT ===\n');
    
    for (const event of allDifferences) {
      console.log(`--- ${event.title} (WP:${event.wp_id} / BB:${event.bb_id}) ---`);
      for (const diff of event.differences) {
        console.log(`  ${diff.field}:`);
        console.log(`    WP: "${diff.wordpress}"`);
        console.log(`    BB: "${diff.brakebee}"`);
      }
      console.log('');
    }
  }
  
  // Summary by field
  const fieldDiffCounts = {};
  for (const event of allDifferences) {
    for (const diff of event.differences) {
      fieldDiffCounts[diff.field] = (fieldDiffCounts[diff.field] || 0) + 1;
    }
  }
  
  if (Object.keys(fieldDiffCounts).length > 0) {
    console.log('=== DIFFERENCE COUNT BY FIELD ===\n');
    const sorted = Object.entries(fieldDiffCounts).sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sorted) {
      console.log(`  ${field}: ${count} events`);
    }
  }
}

main().catch(console.error);

