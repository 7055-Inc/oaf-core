# WordPress to Brakebee Migration - Final Verification

## Project Overview
Migrating from Online Art Festival (WordPress/OAF) to Brakebee (Next.js).
Goal: Verify all data migrated, create redirects, welcome modal for incoming users.

---

## Server Credentials

### WordPress Server (Live - Google Cloud)
- **External IP**: 35.224.2.248
- **SSH User**: cursor_temp
- **SSH Password**: CursorTemp2026!
- **Database Host**: 127.0.0.1 (localhost on WP server)
- **Database Name**: oaf_wp
- **Database User**: oaf_admin
- **Database Password**: Fjkfask(1kwof981!

### Brakebee Server
- **Host**: 10.128.0.31
- **Database Name**: oaf (Brakebee data)
- **Database User**: oafuser
- **Database Password**: oafpass

### Old WordPress Site
- **URL**: https://onlineartfestival.com

### New Brakebee Site
- **URL**: https://brakebee.com

---

## Migration Verification Process (Repeatable Template)

### Step 1: Identify Tables/Data Structures

**WordPress side** (via SSH):
```bash
sshpass -p 'CursorTemp2026!' ssh cursor_temp@35.224.2.248 "mysql -u oaf_admin -p'Fjkfask(1kwof981!' oaf_wp -e \"
  -- Find post types
  SELECT DISTINCT post_type, COUNT(*) FROM wp_posts GROUP BY post_type;
  -- Find meta keys for a post type
  SELECT DISTINCT meta_key FROM wp_postmeta WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type='YOUR_TYPE');
\""
```

**Brakebee side**:
```bash
mysql -h 10.128.0.31 -u oafuser -poafpass -e "SHOW TABLES FROM oaf LIKE '%keyword%';"
mysql -h 10.128.0.31 -u oafuser -poafpass -e "DESCRIBE oaf.table_name;"
```

### Step 2: Create Field Mapping

Document ALL fields from both sides. Ask user to confirm:
- Which WP fields map to which BB fields
- Which fields to ignore
- How to match records (by title, wp_id, or other key)

### Step 3: Match Records by Title

Export titles from both systems and compare:
```bash
# WordPress titles
sshpass -p '...' ssh ... "mysql ... -N -e \"SELECT ID, post_title FROM wp_posts WHERE post_type='TYPE' AND post_status='publish';\"" > /tmp/wp_items.txt

# Brakebee titles  
mysql -h 10.128.0.31 -u oafuser -poafpass -N -e "SELECT id, title FROM oaf.table;" > /tmp/bb_items.txt

# Find matches and differences
comm -12 <(cut -f2- /tmp/wp_items.txt | sort) <(cut -f2- /tmp/bb_items.txt | sort)
```

### Step 4: Field-by-Field Comparison

For each mapped field:
1. Query both databases for matched records
2. Normalize values (decode HTML entities, format dates/money)
3. Compare and categorize differences:
   - Format differences (NULL vs empty, &amp; vs &) - usually ignore
   - Real content differences - investigate

### Step 5: Resolve Differences

For each field with real differences, ask user:
- Is WordPress or Brakebee the source of truth?
- Should we update Brakebee from WordPress, or leave BB as-is?

Apply updates via SQL:
```sql
UPDATE oaf.table SET field = 'value', updated_at = NOW() WHERE id = X;
```

### Step 6: Build Redirects

Map old WP URLs to new BB URLs for all matched records.

---

## Events Migration (COMPLETED 2026-01-06)

### WordPress Event Structure
- **Post type**: `7055_event`
- **Published events**: 174
- **Brakebee events**: 205 (includes new events added post-migration)
- **Matched by title**: 173 (100% of WP events accounted for)

### Field Mapping (Events)

| WordPress Field | Brakebee Field | Status |
|-----------------|----------------|--------|
| `post_title` | `title` | ✓ Matched by |
| `post_content` | `description` | ✓ BB updated |
| `post_excerpt` | `short_description` | ✓ Checked |
| `post_status` | `event_status` | ✓ Correct |
| `_event_start` | `start_date` | ✓ Correct |
| `_event_end` | `end_date` | ✓ Correct |
| `_event_venue` | `venue_name` | ✓ BB updated |
| `_event_address` | `venue_address` | ✓ BB updated |
| `_event_city` | `venue_city` | ✓ BB updated |
| `_event_state` | `venue_state` | ✓ BB updated |
| `_event_zip` | `venue_zip` | ✓ BB updated |
| `_event_country` | `venue_country` | ✓ Ignore (USA vs United States) |
| `_event_cost` | `admission_fee` | ✓ BB updated |
| `_event_ei_booth_fee` | `booth_fee` | ✓ Updated 2 events |
| `_event_ei_jury_fee` | `jury_fee` | ✓ Correct (NULL=0) |
| `_event_ei_due_date` | `application_deadline` | ✓ Updated 2 events |
| `_event_claim_status` | `claim_status` | ✓ Correct (translation) |
| `_event_url` | `event_url` | ⚠️ NEW COLUMN NEEDED |
| `_yoast_wpseo_title` | `seo_title` | ✓ BB has WP-{id} pattern |
| `_yoast_wpseo_metadesc` | `meta_description` | ✓ Copied 86 records |

### Ignored WordPress Fields
- `_event_address2`, `_event_claim_time`, `_event_conference_url`
- `_event_currency`, `_event_currency_symbol`
- `_event_ei_details`, `_event_ei_files`, `_event_location`
- `_event_organizers`, `_event_phone`, `_event_promoter_email`
- `_event_sponsors`, `_event_tmp_author`, `_thumbnail_id`

### Changes Applied
| Action | Details |
|--------|---------|
| booth_fee | Tubac AZ updated to $635 (2 event instances) |
| application_deadline | Kierland Commons → 2024-01-01, Tubac AZ → 2024-10-01 |
| meta_description | Copied 64 WP values → 86 BB records |

### Common Difference Patterns (for future reference)
- `NULL` vs `empty string` → Same, ignore
- `NULL` vs `0.00` for fees → Same, ignore
- `&amp;` vs `&` in titles → Encoding, titles still match
- Country: "United States" vs "USA" → Ignore
- Dates format differences → Usually same data, check actual values

---

## Migration Plan Status

### Phase 1: Data Verification
- [x] Events - COMPLETE
- [ ] Products
- [x] Users/Artists/Vendors - COMPLETE
- [ ] Orders

### Phase 2: Redirects
- [x] Events redirect file - COMPLETE (173 events)
- [x] Profile redirect file - COMPLETE (48 profiles)
- [ ] Products redirect file
- [x] WordPress server nginx redirects - COMPLETE

#### Event Redirect Implementation (2026-01-06)

**Files on Brakebee server:**
- `/var/www/main/event_redirects.csv` - Mapping spreadsheet
- `/var/www/main/event_redirects_htaccess.txt` - Apache format (for reference)
- `/var/www/main/nginx-configs/onlineartfestival.com` - Full nginx config for future domain switch
- `/var/www/main/nginx-configs/event-redirects.conf` - Include file with just redirects

**Files on WordPress server (35.224.2.248):**
- `/etc/nginx/conf.d/event-redirects.inc` - Include file with 346 redirect rules
- `/etc/nginx/conf.d/oaf.conf` - Main nginx config (includes event-redirects.inc)
- `/etc/nginx/conf.d/oaf-www.conf` - WWW subdomain config (includes event-redirects.inc)
- Backups: `/etc/nginx/conf.d/*.backup*` and `/var/www/oaf/public/.htaccess.backup.*`

**Redirect format:**
```
https://onlineartfestival.com/events/{slug}/ → https://brakebee.com/events/{id}?from=oaf
```

**Key details:**
- HTTP 301 (Moved Permanently) for SEO
- Handles both trailing and non-trailing slash URLs
- `?from=oaf` parameter for welcome modal detection
- Both onlineartfestival.com and www.onlineartfestival.com configured

### Phase 3: Welcome Experience
- [x] Build welcome modal component - COMPLETE
- [x] Detect incoming redirects via URL parameter (?from=oaf) - COMPLETE
- [x] Show modal once per browser (localStorage) - COMPLETE

#### Welcome Modal Implementation (2026-01-06)

**Component:** `/var/www/main/components/WelcomeBanner.js`

**Behavior:**
- Detects `?from=oaf` URL parameter on page load
- Shows simple modal: "Online Art Festival has moved to Brakebee. Please update your bookmarks."
- Dismisses on button click or overlay click
- Stores `oaf_welcome_dismissed` in localStorage to prevent repeat shows
- Cleans up URL parameter after dismissal
- Uses global modal styles from `global.css` (`.modal-overlay`, `.modal-content`, `.modal-title`, `.modal-actions`, `.modal-close`)

**Added to:** `pages/_app.js` (renders on all pages)

---

## Progress Log

### 2026-01-06
- Established SSH access to WordPress server
- Found live WordPress DB credentials
- **Events migration verified complete**:
  - 173/174 WordPress events matched to Brakebee
  - Field-by-field comparison completed
  - Updated booth_fee (2 events), application_deadline (2 events)
  - Copied meta_descriptions (64 WP → 86 BB)
  - All venue fields verified (BB is source of truth)
- Created repeatable process template
- **Event redirects deployed**:
  - Generated 346 redirect rules (173 events × 2 for trailing/non-trailing slash)
  - Deployed to WordPress nginx server (oaf.conf + oaf-www.conf)
  - Tested: 301 redirects working for both domains
  - Created nginx template for future domain switch to Brakebee server
- **Welcome modal deployed**:
  - Simple message about OAF moving to Brakebee
  - One-time display per browser via localStorage
- **Users/Artists/Vendors migration verified complete**:
  - Artists/Vendors: 36 WP → 32 BB artists (5 test accounts, 3 converted to community)
  - Updated 17 business names, 2 emails, 15 addresses from WP
  - Promoters: Updated 2 names + 4 locations, created 2 missing profiles
  - Community: 338 WP → 395 BB, no updates needed
  - Dokan data verified - store names match business_name
- **Profile redirects deployed**:
  - Generated 96 redirect rules (48 profiles × 2)
  - Deployed to WordPress nginx server
  - Added to local nginx config template
  - Tested: 301 redirects working
- **Users/Artists/Vendors migration verified complete**:
  - Artists/Vendors: 36 WP → 32 BB (5 test accounts ignored, 3 converted to community)
  - Updated 17 business names, 2 emails, 15 addresses
  - Promoters: 17 WP → 18 BB, updated 2 names + 4 locations
  - Community: 338 WP → 395 BB, no updates needed
  - Dokan data checked - store names match
- **Profile redirects deployed**:
  - Generated 96 redirect rules (48 profiles × 2 for trailing/non-trailing slash)
  - `/artists/{nicename}` → `/profile/{bb_id}?from=oaf`
  - Deployed to WordPress nginx server

---

## Users/Artists/Vendors Migration (COMPLETED 2026-01-06)

### User Type Mapping
| WP Role | BB user_type | BB Profile Table |
|---------|--------------|------------------|
| `7055_vendor` / `OAF_Artist` | `artist` | `artist_profiles` + `vendor_settings` |
| `7055_promoter` | `promoter` | `promoter_profiles` |
| `customer` | `community` | `community_profiles` |

### Field Mapping (Users)

**Core User Fields (all users):**
| WordPress Field | → | Brakebee Field |
|-----------------|---|----------------|
| `ID` | → | `users.wp_id` |
| `user_email` | → | `users.username` |
| `first_name` | → | `user_profiles.first_name` |
| `last_name` | → | `user_profiles.last_name` |

**Business Fields (artists → artist_profiles, promoters → promoter_profiles):**
| WordPress Field | → | Artist Profile | → | Promoter Profile |
|-----------------|---|----------------|---|------------------|
| `business_name` | → | `business_name` | → | `business_name` |
| `business_email` | → | `customer_service_email` | → | (no field) |
| `business_address` | → | `studio_address_line1` | → | `office_address_line1` |
| `business_city` | → | `studio_city` | → | `office_city` |
| `business_state` | → | `studio_state` | → | `office_state` |
| `business_zip` | → | `studio_zip` | → | `office_zip` |

### Ignored Fields
- `user_login`, `business_country`, `business_intro`
- `business_logo`, `business_cover`, `business_gallery` (images handled separately)
- `business_enabled`, `business_suspended`, `business_policy`, `business_terms`
- `billing_*`, `shipping_*` (WooCommerce customer data)
- Dokan social/phone for community users (intentional - they're not vendors anymore)

### Changes Applied
| Action | Count | Details |
|--------|-------|---------|
| business_name | 17 | Replaced placeholder "username's Art" with real names |
| business_email | 2 | WP 243, 388 |
| addresses | 15 | Copied city/state/zip from WP |
| promoter business_name | 2 | WP 3313 (ArtBurst), 4224 (Kevins art attack) |
| promoter locations | 4 | WP 14, 54, 3313, 4224 |
| user_type corrections | 3 | WP 6339, 6411, 6472 → community (inactive artists) |

### Profile Redirect Implementation (2026-01-06)

**Files on Brakebee server:**
- `/var/www/main/nginx-configs/profile-redirects.inc` - Include file with 96 redirect rules
- `/var/www/main/nginx-configs/onlineartfestival.com` - Full nginx config (includes profile redirects for future domain switch)

**Files on WordPress server (35.224.2.248):**
- `/etc/nginx/conf.d/profile-redirects.inc` - Include file
- Included in `oaf.conf` and `oaf-www.conf`

**Redirect format:**
```
https://onlineartfestival.com/artists/{nicename}/ → https://brakebee.com/profile/{bb_id}?from=oaf
```

**URL Mapping:**
- WP profile URLs: `/artists/{user_nicename}/` (dokan store URL with custom_store_url = "artists")
- BB profile URLs: `/profile/{user_id}` (found in `pages/profile/[id].js`)
- Match key: `users.wp_id` in Brakebee maps to `wp_users.ID` in WordPress

**Tested:** `curl -sI "https://onlineartfestival.com/artists/meyerdirk-art/"` returns 301 to `https://brakebee.com/profile/1234568006?from=oaf`

---

## Notes
- **DO NOT USE `wordpress_import` database** - that is stale snapshot data
- Always use LIVE WordPress DB (oaf_wp on 35.224.2.248 via SSH)
- Both sites have been running in parallel - Brakebee is generally the source of truth for updated data
- WordPress has the source of truth for data that wasn't migrated (like meta_descriptions)
- Temporary user `cursor_temp` to be deleted after migration complete
- For fees: use the HIGHER value when in doubt (prices may have increased)
- For dates: pull from WordPress even if in past (archive accuracy)
