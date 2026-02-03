# SOP Catalog — Database setup

**Database name:** `brakebee_sop` (new DB on same server as main app)

---

## Status (done)

- **Database created:** Run as root (e.g. from GCP serial console on the DB host):  
  `mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS brakebee_sop DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON brakebee_sop.* TO 'oafuser'@'%'; FLUSH PRIVILEGES;"`
- **Schema applied:** From project workspace:  
  `mysql -h 10.128.0.31 -P 3306 -u oafuser -p brakebee_sop < database/sop/02_schema.sql`
- **Tables present:** `sop_users`, `sop_folders`, `sop_sops`, `sop_versions`, `sop_layout`

---

## 1. Create the database (once, as root)

From project root:

```bash
mysql -h 10.128.0.31 -P 3306 -u root -p < database/sop/01_create_database.sql
```

This creates `brakebee_sop` and grants `oafuser` full access.

---

## 2. Create tables (as app user)

```bash
mysql -h 10.128.0.31 -P 3306 -u oafuser -p brakebee_sop < database/sop/02_schema.sql
```

---

## 3. API env vars

Add to `api-service/.env` (same host/user/pass/port as main DB; different database name):

```env
# SOP Catalog - separate database (same server)
SOP_DB_HOST=10.128.0.31
SOP_DB_USER=oafuser
SOP_DB_PASS=oafpass
SOP_DB_NAME=brakebee_sop
SOP_DB_PORT=3306
```

The API will use a second MySQL pool for the SOP module so main app data stays in `wordpress_import` and SOP data stays in `brakebee_sop`.

---

## 4. Tables (reference)

| Table | Purpose |
|-------|---------|
| `sop_users` | Enrolled users (email, user_type: frontline/manage/top). Audit uses `id` only on front. |
| `sop_folders` | Outline nodes (title, parent_id). Parent = folder or NULL (root). |
| `sop_sops` | SOP documents (all fields; folder_id or root; status; block JSON fields). |
| `sop_versions` | Version history: changed_at, changed_by (user id), change_summary, snapshot. |
| `sop_layout` | Single row: app-wide header_blocks, footer_blocks. |

Breadcrumbs are computed on read from folder/SOP parent chain (not stored).
