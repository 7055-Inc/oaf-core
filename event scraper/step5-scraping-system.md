# Step 5: Event Scraping System - Complete Specification

## Overview

Build a fully autonomous event scraping system with admin controls, configurable filters, and integration with your existing infrastructure.

**Key Features:**
- Admin dashboard toggle (default: OFF)
- Configurable geographic/date/keyword filters
- 10 events per day limit
- Eventbrite API integration
- Automatic event creation and email triggers
- Kill switch protection
- Comprehensive logging

---

## PART 1: Database - Scraper Settings Table

### 1.1 Create `scraper_settings` Table

```sql
CREATE TABLE `scraper_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL UNIQUE,
  `setting_value` text,
  `setting_type` enum('boolean','string','number','json') DEFAULT 'string',
  `description` varchar(500) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_setting_key` (`setting_key`),
  KEY `fk_scraper_updated_by` (`updated_by`),
  CONSTRAINT `fk_scraper_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Configuration settings for event scraper system';
```

### 1.2 Insert Default Settings

```sql
-- Main kill switch
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_enabled', 'false', 'boolean', 'Master on/off toggle for event scraper');

-- Daily quota
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_daily_limit', '10', 'number', 'Maximum events to scrape per day');

-- Geographic filter
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_geographic_filter', '', 'string', 'Geographic restrictions (e.g., "Arizona", "Phoenix, AZ", leave empty for all)');

-- Date filter
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_date_filter', '', 'string', 'Date restrictions (e.g., "July 2025", "Summer 2025", leave empty for all)');

-- Event type filter
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_event_type', '', 'string', 'Event type filter (e.g., "Art Fair", "Craft Fair", leave empty for all)');

-- Keywords to include
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_keywords_include', 'art fair,craft fair,maker market,artisan market,art festival', 'string', 'Comma-separated keywords to include');

-- Keywords to exclude
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_keywords_exclude', 'food,music,beer,wine,film,concert', 'string', 'Comma-separated keywords to exclude');

-- Last run timestamp
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_last_run', '', 'string', 'Timestamp of last successful scraper run');

-- Stats
INSERT INTO scraper_settings (setting_key, setting_value, setting_type, description)
VALUES ('scraper_stats', '{}', 'json', 'Scraper statistics (events found, created, errors)');
```

---

## PART 2: Admin Dashboard UI

### 2.1 Add Menu Item

**File:** `/var/www/main/components/dashboard/manage-system/ManageSystemMenu.js`

**Add to menu items array:**

```javascript
<button 
  className={styles.sidebarLink}
  onClick={() => openSlideIn('manage-events-scraper', { title: 'Events Scraper' })}
>
  Events Scraper
</button>
```

### 2.2 Create Admin Component

**File:** `/var/www/main/components/dashboard/manage-system/components/ManageEventsScraper.js`

```javascript
import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import { getAuthToken } from '../../../../lib/auth';
import styles from '../ManageSystem.module.css';

export default function ManageEventsScraper({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(getApiUrl('api/admin/scraper-settings'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load settings');
      
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load scraper settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await fetch(getApiUrl('api/admin/scraper-settings'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      setStatus({ type: 'success', message: 'Settings saved successfully' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save settings' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const runScraperNow = async () => {
    if (!settings.scraper_enabled) {
      setStatus({ type: 'error', message: 'Scraper is disabled. Enable it first.' });
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      const response = await fetch(getApiUrl('api/admin/scraper/run-now'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to trigger scraper');
      
      const data = await response.json();
      setStatus({ 
        type: 'success', 
        message: `Scraper triggered. Check logs in a few minutes. ${data.message || ''}` 
      });
      
      // Reload settings to get updated stats
      setTimeout(loadSettings, 2000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to trigger scraper' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return <div className={styles.loading}>Loading scraper settings...</div>;
  }

  const stats = settings.scraper_stats ? JSON.parse(settings.scraper_stats) : {};
  const lastRun = settings.scraper_last_run 
    ? new Date(settings.scraper_last_run).toLocaleString() 
    : 'Never';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Events Scraper Configuration</h2>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      {status && (
        <div className={`${styles.alert} ${styles[status.type]}`}>
          {status.message}
        </div>
      )}

      {error && (
        <div className={`${styles.alert} ${styles.error}`}>{error}</div>
      )}

      {/* Status Section */}
      <div className={styles.section}>
        <h3>Scraper Status</h3>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <label>Status:</label>
            <span className={settings.scraper_enabled ? styles.statusActive : styles.statusInactive}>
              {settings.scraper_enabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <label>Last Run:</label>
            <span>{lastRun}</span>
          </div>
          <div className={styles.statusItem}>
            <label>Events Found Today:</label>
            <span>{stats.events_found_today || 0}</span>
          </div>
          <div className={styles.statusItem}>
            <label>Events Created Today:</label>
            <span>{stats.events_created_today || 0}</span>
          </div>
        </div>
      </div>

      {/* Master Toggle */}
      <div className={styles.section}>
        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.scraper_enabled || false}
              onChange={(e) => updateSetting('scraper_enabled', e.target.checked)}
              className={styles.toggle}
            />
            <span className={styles.toggleText}>
              Enable Event Scraper
            </span>
          </label>
          <p className={styles.helpText}>
            When enabled, the scraper runs daily at 3 AM to discover new events.
          </p>
        </div>
      </div>

      {/* Configuration Section */}
      <div className={styles.section}>
        <h3>Scraper Configuration</h3>
        
        <div className={styles.formGroup}>
          <label>Daily Limit</label>
          <input
            type="number"
            min="1"
            max="50"
            value={settings.scraper_daily_limit || 10}
            onChange={(e) => updateSetting('scraper_daily_limit', e.target.value)}
            className={styles.input}
          />
          <p className={styles.helpText}>Maximum events to scrape per day (recommended: 10)</p>
        </div>

        <div className={styles.formGroup}>
          <label>Geographic Filter</label>
          <input
            type="text"
            value={settings.scraper_geographic_filter || ''}
            onChange={(e) => updateSetting('scraper_geographic_filter', e.target.value)}
            placeholder="e.g., Arizona, Phoenix AZ, Southwest US"
            className={styles.input}
          />
          <p className={styles.helpText}>
            Limit to specific location. Examples: "Arizona", "Phoenix, AZ", "Southwest". Leave empty for all locations.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Date Filter</label>
          <input
            type="text"
            value={settings.scraper_date_filter || ''}
            onChange={(e) => updateSetting('scraper_date_filter', e.target.value)}
            placeholder="e.g., July 2025, Summer 2025, 2025"
            className={styles.input}
          />
          <p className={styles.helpText}>
            Limit to specific time period. Examples: "July 2025", "Summer", "Q2 2025". Leave empty for all dates.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Event Type Filter</label>
          <input
            type="text"
            value={settings.scraper_event_type || ''}
            onChange={(e) => updateSetting('scraper_event_type', e.target.value)}
            placeholder="e.g., Art Fair, Craft Market"
            className={styles.input}
          />
          <p className={styles.helpText}>
            Limit to specific event types. Leave empty for all types.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Keywords to Include</label>
          <textarea
            value={settings.scraper_keywords_include || ''}
            onChange={(e) => updateSetting('scraper_keywords_include', e.target.value)}
            placeholder="art fair, craft fair, maker market"
            className={styles.textarea}
            rows="3"
          />
          <p className={styles.helpText}>
            Comma-separated keywords. Events must match at least one.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label>Keywords to Exclude</label>
          <textarea
            value={settings.scraper_keywords_exclude || ''}
            onChange={(e) => updateSetting('scraper_keywords_exclude', e.target.value)}
            placeholder="food, music, beer, wine"
            className={styles.textarea}
            rows="3"
          />
          <p className={styles.helpText}>
            Comma-separated keywords. Events matching these will be skipped.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={saveSettings}
          disabled={saving}
          className={styles.primaryButton}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        
        <button
          onClick={runScraperNow}
          disabled={saving || !settings.scraper_enabled}
          className={styles.secondaryButton}
        >
          Run Scraper Now (Manual)
        </button>
      </div>

      {/* Stats Section */}
      {stats && Object.keys(stats).length > 0 && (
        <div className={styles.section}>
          <h3>Recent Activity</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total_events_scraped || 0}</div>
              <div className={styles.statLabel}>Total Events Scraped</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total_events_created || 0}</div>
              <div className={styles.statLabel}>Events Created</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total_errors || 0}</div>
              <div className={styles.statLabel}>Errors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.blocked_count || 0}</div>
              <div className={styles.statLabel}>Blocked (Duplicates)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2.3 Register Component

**File:** `/var/www/main/components/dashboard/manage-system/ManageSystem.js`

**Add to component registry:**

```javascript
import ManageEventsScraper from './components/ManageEventsScraper';

// In component switch/mapping
case 'manage-events-scraper':
  return <ManageEventsScraper {...slideInProps} />;
```

---

## PART 3: Admin API Endpoints

**File:** `/var/www/main/api-service/src/routes/admin.js`

### 3.1 GET Scraper Settings

```javascript
// GET /api/admin/scraper-settings
router.get('/scraper-settings', requirePermission('manage_system'), async (req, res) => {
  try {
    const [settings] = await db.execute(`
      SELECT setting_key, setting_value, setting_type, description
      FROM scraper_settings
    `);
    
    // Convert to object format
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Type conversion
      if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'number') {
        value = parseInt(value);
      }
      
      settingsObj[setting.setting_key] = value;
    });
    
    res.json(settingsObj);
    
  } catch (error) {
    console.error('Error loading scraper settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});
```

### 3.2 PUT Update Settings

```javascript
// PUT /api/admin/scraper-settings
router.put('/scraper-settings', requirePermission('manage_system'), async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      // Convert value to string for storage
      let stringValue;
      if (typeof value === 'boolean') {
        stringValue = value.toString();
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      await db.execute(`
        UPDATE scraper_settings 
        SET setting_value = ?, updated_by = ?, updated_at = NOW()
        WHERE setting_key = ?
      `, [stringValue, userId, key]);
    }
    
    res.json({ success: true, message: 'Settings updated successfully' });
    
  } catch (error) {
    console.error('Error updating scraper settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
```

### 3.3 POST Manual Trigger

```javascript
// POST /api/admin/scraper/run-now
router.post('/scraper/run-now', requirePermission('manage_system'), async (req, res) => {
  try {
    // Check if scraper is enabled
    const [enabled] = await db.execute(`
      SELECT setting_value FROM scraper_settings WHERE setting_key = 'scraper_enabled'
    `);
    
    if (enabled[0]?.setting_value !== 'true') {
      return res.status(400).json({ 
        error: 'Scraper is disabled. Enable it in settings first.' 
      });
    }
    
    // Trigger scraper via spawn (non-blocking)
    const { spawn } = require('child_process');
    const scraperPath = '/var/www/main/api-service/cron/process-event-scraper.js';
    
    const child = spawn('node', [scraperPath], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref(); // Allow parent to exit independently
    
    res.json({ 
      success: true, 
      message: 'Scraper triggered. Check logs in /var/www/main/api-service/logs/event-scraper.log' 
    });
    
  } catch (error) {
    console.error('Error triggering scraper:', error);
    res.status(500).json({ error: 'Failed to trigger scraper' });
  }
});
```

---

## PART 4: Scraping Node Service

**File:** `/var/www/main/api-service/cron/process-event-scraper.js`

```javascript
const db = require('../src/config/database');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.beemeeart.com';
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY || '';

// Helper: Get scraper setting
async function getSetting(key) {
  const [result] = await db.execute(
    'SELECT setting_value, setting_type FROM scraper_settings WHERE setting_key = ?',
    [key]
  );
  
  if (result.length === 0) return null;
  
  const { setting_value, setting_type } = result[0];
  
  if (setting_type === 'boolean') return setting_value === 'true';
  if (setting_type === 'number') return parseInt(setting_value);
  if (setting_type === 'json') return JSON.parse(setting_value || '{}');
  
  return setting_value;
}

// Helper: Update setting
async function updateSetting(key, value) {
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await db.execute(
    'UPDATE scraper_settings SET setting_value = ? WHERE setting_key = ?',
    [stringValue, key]
  );
}

// Helper: Check if scraper should run
async function checkIfEnabled() {
  const enabled = await getSetting('scraper_enabled');
  
  if (!enabled) {
    console.log('[Event Scraper] Disabled by admin settings, exiting');
    return false;
  }
  
  return true;
}

// Helper: Check daily quota
async function checkQuota() {
  const dailyLimit = await getSetting('scraper_daily_limit') || 10;
  const stats = await getSetting('scraper_stats') || {};
  
  const today = new Date().toISOString().split('T')[0];
  const lastRun = await getSetting('scraper_last_run');
  const lastRunDate = lastRun ? new Date(lastRun).toISOString().split('T')[0] : null;
  
  // Reset daily count if new day
  if (lastRunDate !== today) {
    stats.events_found_today = 0;
    stats.events_created_today = 0;
    await updateSetting('scraper_stats', stats);
  }
  
  const remaining = dailyLimit - (stats.events_created_today || 0);
  
  console.log(`[Event Scraper] Daily quota: ${stats.events_created_today || 0}/${dailyLimit} (${remaining} remaining)`);
  
  return {
    limit: dailyLimit,
    used: stats.events_created_today || 0,
    remaining: Math.max(0, remaining)
  };
}

// Helper: Check blocklist
async function isBlocked(eventName, location, email) {
  const [blocked] = await db.execute(`
    SELECT id FROM event_blocklist 
    WHERE (LOWER(event_name) LIKE LOWER(?) AND event_location LIKE ?)
    OR promoter_email = ?
    LIMIT 1
  `, [`%${eventName}%`, `%${location}%`, email]);
  
  return blocked.length > 0;
}

// Helper: Check if event exists
async function eventExists(eventName, startDate, location) {
  const [existing] = await db.execute(`
    SELECT id FROM events 
    WHERE LOWER(title) = LOWER(?)
    AND start_date = ?
    AND (city LIKE ? OR state LIKE ?)
    LIMIT 1
  `, [eventName, startDate, `%${location}%`, `%${location}%`]);
  
  return existing.length > 0;
}

// Helper: Apply filters
function applyFilters(events, filters) {
  return events.filter(event => {
    // Geographic filter
    if (filters.geographic) {
      const location = `${event.location || ''} ${event.state || ''}`.toLowerCase();
      if (!location.includes(filters.geographic.toLowerCase())) {
        return false;
      }
    }
    
    // Date filter (basic - checks if year/month mentioned in filter matches event)
    if (filters.date) {
      const eventDate = new Date(event.start_date);
      const filterLower = filters.date.toLowerCase();
      const year = eventDate.getFullYear().toString();
      const month = eventDate.toLocaleString('default', { month: 'long' }).toLowerCase();
      
      if (!filterLower.includes(year) && !filterLower.includes(month)) {
        return false;
      }
    }
    
    // Event type filter
    if (filters.event_type) {
      const name = event.name.toLowerCase();
      if (!name.includes(filters.event_type.toLowerCase())) {
        return false;
      }
    }
    
    // Keyword inclusion filter
    if (filters.keywords_include) {
      const keywords = filters.keywords_include.split(',').map(k => k.trim().toLowerCase());
      const name = event.name.toLowerCase();
      const description = (event.description || '').toLowerCase();
      
      const hasKeyword = keywords.some(keyword => 
        name.includes(keyword) || description.includes(keyword)
      );
      
      if (!hasKeyword) return false;
    }
    
    // Keyword exclusion filter
    if (filters.keywords_exclude) {
      const keywords = filters.keywords_exclude.split(',').map(k => k.trim().toLowerCase());
      const name = event.name.toLowerCase();
      const description = (event.description || '').toLowerCase();
      
      const hasExcludedKeyword = keywords.some(keyword => 
        name.includes(keyword) || description.includes(keyword)
      );
      
      if (hasExcludedKeyword) return false;
    }
    
    return true;
  });
}

// Eventbrite Scraper
async function scrapeEventbrite(filters, quota) {
  if (!EVENTBRITE_API_KEY) {
    console.log('[Eventbrite] No API key configured, skipping');
    return [];
  }
  
  try {
    console.log('[Eventbrite] Searching for events...');
    
    // Build Eventbrite API query
    const params = {
      'q': filters.keywords_include?.split(',')[0]?.trim() || 'art fair',
      'location.address': filters.geographic || '',
      'start_date.range_start': new Date().toISOString(),
      'expand': 'venue,organizer',
      'page_size': quota * 3 // Get extra to account for filtering
    };
    
    const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
      },
      params
    });
    
    const events = response.data.events || [];
    
    console.log(`[Eventbrite] Found ${events.length} raw events`);
    
    // Convert to standard format
    const standardized = events.map(event => ({
      name: event.name?.text || '',
      description: event.description?.text || '',
      start_date: event.start?.local?.split('T')[0] || null,
      end_date: event.end?.local?.split('T')[0] || null,
      location: event.venue?.address?.city || '',
      state: event.venue?.address?.region || '',
      venue: event.venue?.name || '',
      promoter_name: event.organizer?.name || '',
      promoter_email: '', // Eventbrite doesn't provide this publicly
      website: event.url || '',
      source: 'eventbrite',
      source_url: event.url,
      confidence: 0.8
    }));
    
    return standardized;
    
  } catch (error) {
    console.error('[Eventbrite] Scraping error:', error.message);
    return [];
  }
}

// Create event via API
async function createEvent(eventData) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/admin/events/scraped`,
      {
        event_data: eventData,
        source_url: eventData.source_url,
        confidence_score: eventData.confidence
      },
      {
        headers: {
          'Content-Type': 'application/json'
          // TODO: Add admin auth token if needed
        }
      }
    );
    
    return response.data;
    
  } catch (error) {
    console.error('[API] Failed to create event:', error.message);
    return null;
  }
}

// Main scraper process
async function runScraper() {
  console.log('[Event Scraper] Starting...');
  
  try {
    // Check if enabled
    const enabled = await checkIfEnabled();
    if (!enabled) return;
    
    // Check quota
    const quota = await checkQuota();
    if (quota.remaining === 0) {
      console.log('[Event Scraper] Daily quota reached, exiting');
      return;
    }
    
    // Load filters
    const filters = {
      geographic: await getSetting('scraper_geographic_filter'),
      date: await getSetting('scraper_date_filter'),
      event_type: await getSetting('scraper_event_type'),
      keywords_include: await getSetting('scraper_keywords_include'),
      keywords_exclude: await getSetting('scraper_keywords_exclude')
    };
    
    console.log('[Event Scraper] Filters:', filters);
    
    // Scrape events
    let allEvents = [];
    
    // Eventbrite
    const eventbriteEvents = await scrapeEventbrite(filters, quota.remaining);
    allEvents = allEvents.concat(eventbriteEvents);
    
    // TODO: Add more scrapers here (HTML scrapers, other APIs)
    
    console.log(`[Event Scraper] Found ${allEvents.length} total events before filtering`);
    
    // Apply filters
    const filteredEvents = applyFilters(allEvents, filters);
    
    console.log(`[Event Scraper] ${filteredEvents.length} events after filtering`);
    
    // Process events up to quota
    let stats = await getSetting('scraper_stats') || {};
    let created = 0;
    let blocked = 0;
    let duplicates = 0;
    let errors = 0;
    
    for (const event of filteredEvents) {
      if (created >= quota.remaining) {
        console.log('[Event Scraper] Quota reached, stopping');
        break;
      }
      
      try {
        // Check if blocked
        if (await isBlocked(event.name, event.location, event.promoter_email)) {
          console.log(`[Event Scraper] Event blocked: ${event.name}`);
          blocked++;
          continue;
        }
        
        // Check if already exists
        if (await eventExists(event.name, event.start_date, event.location)) {
          console.log(`[Event Scraper] Duplicate found: ${event.name}`);
          duplicates++;
          continue;
        }
        
        // Create event
        const result = await createEvent(event);
        
        if (result && result.event_id) {
          console.log(`[Event Scraper] Created event: ${event.name} (ID: ${result.event_id})`);
          created++;
        } else {
          console.log(`[Event Scraper] Failed to create: ${event.name}`);
          errors++;
        }
        
      } catch (error) {
        console.error(`[Event Scraper] Error processing ${event.name}:`, error.message);
        errors++;
      }
    }
    
    // Update stats
    stats.events_found_today = (stats.events_found_today || 0) + filteredEvents.length;
    stats.events_created_today = (stats.events_created_today || 0) + created;
    stats.total_events_scraped = (stats.total_events_scraped || 0) + filteredEvents.length;
    stats.total_events_created = (stats.total_events_created || 0) + created;
    stats.total_errors = (stats.total_errors || 0) + errors;
    stats.blocked_count = (stats.blocked_count || 0) + blocked;
    
    await updateSetting('scraper_stats', stats);
    await updateSetting('scraper_last_run', new Date().toISOString());
    
    console.log('[Event Scraper] Completed:');
    console.log(`  - Events found: ${filteredEvents.length}`);
    console.log(`  - Events created: ${created}`);
    console.log(`  - Blocked: ${blocked}`);
    console.log(`  - Duplicates: ${duplicates}`);
    console.log(`  - Errors: ${errors}`);
    
  } catch (error) {
    console.error('[Event Scraper] Fatal error:', error);
    throw error;
  }
}

// Run the scraper
runScraper()
  .then(() => {
    console.log('[Event Scraper] Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Event Scraper] Process failed:', error);
    process.exit(1);
  });
```

---

## PART 5: Integration & Deployment

### 5.1 Environment Variables

**File:** `/var/www/main/api-service/.env`

**Add these variables:**

```bash
# Eventbrite API Configuration
EVENTBRITE_API_KEY=your_eventbrite_api_key_here

# API Base URL (for scraper to call back)
API_BASE_URL=https://api.beemeeart.com
```

**Getting Eventbrite API Key:**
1. Go to https://www.eventbrite.com/platform/api
2. Sign up for developer account
3. Create an app
4. Copy your private token
5. Add to .env file

### 5.2 Cron Job Setup

**File:** `/var/www/main/api-service/setup-event-scraper-cron.sh`

```bash
#!/bin/bash

# Setup event scraper cron job
# Runs daily at 3 AM

CRON_CMD="0 3 * * * cd /var/www/main && node api-service/cron/process-event-scraper.js >> /var/www/main/api-service/logs/event-scraper.log 2>&1"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "process-event-scraper.js"; then
    # Add to existing crontab
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "Event scraper cron job added successfully"
    echo "Schedule: Daily at 3:00 AM"
else
    echo "Event scraper cron job already exists"
fi

# Create log directory if it doesn't exist
mkdir -p /var/www/main/api-service/logs

# Make the script executable
chmod +x /var/www/main/api-service/cron/process-event-scraper.js

echo "Setup complete!"
echo ""
echo "To test manually, run:"
echo "  cd /var/www/main && node api-service/cron/process-event-scraper.js"
echo ""
echo "To view logs:"
echo "  tail -f /var/www/main/api-service/logs/event-scraper.log"
```

**Run setup:**
```bash
chmod +x /var/www/main/api-service/setup-event-scraper-cron.sh
./api-service/setup-event-scraper-cron.sh
```

### 5.3 API Endpoint for Scraped Events

**File:** `/var/www/main/api-service/src/routes/admin.js`

**Add endpoint to receive scraped events:**

```javascript
// POST /api/admin/events/scraped
router.post('/events/scraped', async (req, res) => {
  try {
    const { event_data, source_url, confidence_score } = req.body;
    
    // Validate required fields
    if (!event_data || !event_data.name) {
      return res.status(400).json({ error: 'Missing required event data' });
    }
    
    // Create event in pre-draft status
    const [result] = await db.execute(`
      INSERT INTO events (
        title,
        description,
        start_date,
        end_date,
        city,
        state,
        venue,
        event_status,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pre-draft', 1, NOW())
    `, [
      event_data.name,
      event_data.description || '',
      event_data.start_date,
      event_data.end_date || event_data.start_date,
      event_data.location || '',
      event_data.state || '',
      event_data.venue || '',
    ]);
    
    const eventId = result.insertId;
    
    // Store scraping metadata (optional - create table if needed)
    // await db.execute(`
    //   INSERT INTO event_scrape_metadata (event_id, source, source_url, confidence_score)
    //   VALUES (?, ?, ?, ?)
    // `, [eventId, event_data.source, source_url, confidence_score]);
    
    console.log(`[API] Created pre-draft event ${eventId}: ${event_data.name}`);
    
    res.json({ 
      success: true, 
      event_id: eventId,
      status: 'pre-draft',
      message: 'Event created, awaiting admin review'
    });
    
  } catch (error) {
    console.error('[API] Error creating scraped event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});
```

---

## PART 6: Testing & Monitoring

### 6.1 Manual Testing

```bash
# Test the scraper script manually
cd /var/www/main
node api-service/cron/process-event-scraper.js

# Expected output:
# [Event Scraper] Starting...
# [Event Scraper] Filters: {...}
# [Eventbrite] Searching for events...
# [Eventbrite] Found X raw events
# [Event Scraper] Found Y total events before filtering
# [Event Scraper] Z events after filtering
# [Event Scraper] Completed: ...

# View logs
tail -f /var/www/main/api-service/logs/event-scraper.log

# Check database
mysql -u user -p database -e "SELECT * FROM scraper_settings;"
mysql -u user -p database -e "SELECT id, title, event_status, created_at FROM events WHERE event_status = 'pre-draft' ORDER BY created_at DESC LIMIT 10;"
```

### 6.2 Monitoring Queries

```sql
-- Check scraper status
SELECT setting_key, setting_value 
FROM scraper_settings 
WHERE setting_key IN ('scraper_enabled', 'scraper_last_run', 'scraper_stats');

-- Pre-draft events awaiting review
SELECT id, title, city, state, start_date, created_at
FROM events 
WHERE event_status = 'pre-draft'
ORDER BY created_at DESC;

-- Events created today
SELECT COUNT(*) as events_today
FROM events
WHERE event_status = 'pre-draft'
AND DATE(created_at) = CURDATE();

-- Scraper performance
SELECT 
  JSON_EXTRACT(setting_value, '$.total_events_scraped') as total_scraped,
  JSON_EXTRACT(setting_value, '$.total_events_created') as total_created,
  JSON_EXTRACT(setting_value, '$.total_errors') as total_errors
FROM scraper_settings
WHERE setting_key = 'scraper_stats';
```

### 6.3 Admin Dashboard Monitoring

Access the admin dashboard:
1. Log in as admin
2. Navigate to **Manage System** → **Events Scraper**
3. View real-time stats
4. Adjust configuration as needed
5. Use manual trigger for testing

---

## PART 7: Extending the Scraper

### 7.1 Adding More Sources

To add additional event sources (arts council websites, other APIs):

**Create new scraper function:**

```javascript
// Example: HTML scraper for a specific site
async function scrapeArtsCouncil(filters, quota) {
  try {
    console.log('[Arts Council] Scraping events...');
    
    const response = await axios.get('https://example-arts-council.org/events');
    const html = response.data;
    
    // Parse HTML (you'd use cheerio or similar)
    // const $ = cheerio.load(html);
    // Extract event data...
    
    const events = []; // Parsed events
    
    return events;
    
  } catch (error) {
    console.error('[Arts Council] Scraping error:', error.message);
    return [];
  }
}
```

**Add to main scraper:**

```javascript
// In runScraper() function
const eventbriteEvents = await scrapeEventbrite(filters, quota.remaining);
const artsCouncilEvents = await scrapeArtsCouncil(filters, quota.remaining);
allEvents = allEvents.concat(eventbriteEvents, artsCouncilEvents);
```

### 7.2 Eventbrite API Notes

**Free tier limitations:**
- 50 requests per hour
- Public events only
- Limited to events you have permission to access

**For production:**
- Consider upgrading to paid tier if needed
- Implement rate limiting
- Cache results to minimize API calls

---

## Testing Checklist

Before enabling in production:

- [ ] Database table `scraper_settings` created
- [ ] Default settings inserted
- [ ] Admin UI accessible and displays correctly
- [ ] Can toggle scraper on/off
- [ ] Can update configuration fields
- [ ] Settings save successfully
- [ ] API endpoints respond correctly
- [ ] Scraper script runs manually without errors
- [ ] Eventbrite API key configured (if using)
- [ ] Scraper respects kill switch (exits when disabled)
- [ ] Scraper respects daily quota
- [ ] Events created in pre-draft status
- [ ] Blocklist checking works
- [ ] Duplicate detection works
- [ ] Filters apply correctly (geographic, date, keywords)
- [ ] Stats update after each run
- [ ] Cron job scheduled correctly
- [ ] Logs created and readable
- [ ] Manual trigger button works

---

## Security Considerations

1. **API Keys**: Store in .env, never commit to git
2. **Rate Limiting**: Respect external API limits
3. **Blocklist**: Always check before contacting
4. **Admin Only**: Scraper controls require `manage_system` permission
5. **Input Validation**: Sanitize all configuration inputs
6. **Error Handling**: Graceful failures, comprehensive logging

---

## Troubleshooting

### Scraper not running
- Check if enabled: `SELECT setting_value FROM scraper_settings WHERE setting_key = 'scraper_enabled';`
- Check cron job: `crontab -l | grep scraper`
- Check logs: `tail -f /var/www/main/api-service/logs/event-scraper.log`

### No events created
- Check quota: May have hit daily limit
- Check filters: May be too restrictive
- Check Eventbrite API key: May be invalid/expired
- Check blocklist: Events may be blocked

### High error rate
- Check API authentication
- Check network connectivity
- Review error logs for specific issues
- Check external API status

---

**Implementation Time Estimate:** 4-6 hours

**Complexity:** Medium (external API integration, configuration management)

**Dependencies:** Steps 1-3 complete

**Files Created:**
1. Database: `scraper_settings` table
2. Admin UI: `ManageEventsScraper.js`
3. API: 3 new endpoints in `admin.js`
4. Scraper: `process-event-scraper.js`
5. Setup: `setup-event-scraper-cron.sh`
6. Config: Environment variables in `.env`

**Status:** Ready for implementation