# SOP Catalog Process — Context & Spec

**Process name:** SOPS (digital SOP catalog)  
**Purpose:** Single source of truth for this document. Regroup here before implementation.

---

## 1. Access & data

- **Access:** Custom subdomain (like existing sites system). Brakebee login carries over; SOP app authenticates via Brakebee JWT (cookie or Authorization header) and uses only the new DB for SOP data.
- **DB:** New database on same server (`brakebee_sop`). Credentials in api-service `.env` as `SOP_DB_*`.
- **Isolation:** No Brakebee business data in this DB; manual enrollment prevents unauthorized access.

**Current deployment (as of last update):**
- **URL that works:** `https://sop.brakebee.com` — nginx has a server block for it (proxy to Node on port 3005), wildcard SSL (brakebee.com cert), and `sop.` is excluded from the wildcard so this block handles it.
- **URL that does not work:** `https://sop.staging.brakebee.com` — there is **no nginx server block** for it. Requests to that host are not routed to the SOP app. To use it you must add an nginx block for `sop.staging.brakebee.com` (and ensure auth cookie domain matches, e.g. login on staging.brakebee.com).
- **Auth:** Cookie is only sent when the SOP host shares the same parent domain as the main app where the user logged in. So `sop.brakebee.com` works with brakebee.com login; `sop.staging.brakebee.com` would work with staging.brakebee.com login only if an nginx block for it exists.

---

## 2. User model (SOP app only)

- **Enrollment:** Top-only dashboard page “Edit users.” Top searches Brakebee users (name/email) and adds via button → enrolls user in this process. Only enrolled users can access.
- **Storage:** New DB stores enrolled users: identifier from Brakebee (for search/link), **local user ID** (primary key), user type, optional feature overrides.
- **User types:** Frontline, Manage, Top.
- **Features (by type):**
  - **Frontline:** view, **propose**
  - **Manage:** view, propose
  - **Top:** view, propose, publish, edit, manage outline (folders), manage users
- **Audit / display:** All change logs and “changed by” use **local DB user ID** only (never email or Brakebee username on front) so editor identity stays non-public.

---

## 3. Post types: Folder & SOP

**Folder**

- Title + parent only. Grouping/navigation.
- Parent: **Folder or root** (null). Unlimited nesting.

**SOP**

- Full document (fields below).
- Parent: **Folder or root** (null). Same parent model as Folder.

Both post types use the same parent rule: parent is a Folder (id) or root (null).

---

## 4. Outline & breadcrumbs

- Outline = tree of **Folder** posts (create/edit/move/delete by Top).
- SOPs live under one Folder or at root.
- **Breadcrumbs:** Computed on read from parent chain (not stored).

---

## 5. SOP document fields

| Field | Type | Notes |
|-------|------|--------|
| ID | DB only | Not displayed in form |
| Title | text | |
| Date last updated | auto | Set on create/update |
| Breadcrumb path | — | Computed on read |
| Status | enum | draft, proposed, active, deprecated, deleted |
| Owner role | free text | e.g. job title of who executes |
| Change notes | text | |
| Purpose / Expected outcome | text | |
| When to use | text | |
| When not to use | text | |
| Standard workflow | WYSIWYG blocks | Reuse article block editor |
| Exit points | WYSIWYG blocks | |
| Escalation | WYSIWYG blocks | |
| Transfer | WYSIWYG blocks | |
| Related SOPs | list of SOP IDs | |
| Additional information | WYSIWYG blocks | |

**Status:** draft | proposed | active | deprecated | **deleted** (soft: hide from normal views; keep in DB). Only Top can change status. “Deleted” is a status, not hard delete.

**Spelling:** Use **deprecated** everywhere (not “depreciated”).

---

## 6. Version history

- Every change saved with: **timestamp**, **“Changed from: — , to — by [local user ID]”**.
- Store in versions/audit table keyed by local DB user ID (no editor email on front).

---

## 7. Layout

- **Header / footer / main:** App-wide template (one header, one footer for the whole SOP app). Single template/layout config.

---

## 8. Workflow & permissions

- **Propose:** **Anyone** (Frontline, Manage, Top) can propose.
  - “Propose new SOP” and “Propose edit” when viewing a specific SOP (and from dashboard as needed).
  - Creates/updates **draft** with “submitted by” (stored as local user ID).
- **Publish / status:** Only **Top** can publish (draft/proposed → active) and set status (active, deprecated, deleted).
- **Edit/create:** Only **Top** can create/edit SOPs and Folders directly; others read-only except propose.

---

## 9. Discovery

- **Navigation:** Tree (Folders + SOPs by parent).
- **Search:** SOPs (and Folders if useful) searchable by title/content.

---

## 10. Integration

- **App:** Contained process in repo at `sop/` (own Node server, DB pool, routes, static UI). Not inside api-service. See `docs/MODULE_ARCHITECTURE.md` for patterns; this one is self-contained like Leo/Luca.
- **URL:** Served at its own subdomain via nginx (see “Current deployment” in §1). Nginx config in repo was `nginx-configs/sop.brakebee.com` (may have been removed); live config is in `/etc/nginx/sites-available/sop.brakebee.com`.
- **Editor:** Reuse existing WYSIWYG block editor (articles); same block format in DB.

---

## 11. Summary of updates (this pass)

- Frontline **can** propose (in addition to Manage and Top).
- SOP and Folder **both** have parent = **Folder or root** (same rule for both).
- Log uses **local DB user ID** (not email) so editor email is not shown on front.

---

## 12. Implementation status

**Done:**
- DB: `brakebee_sop` with `sop_users`, `sop_folders`, `sop_sops`, `sop_versions`, `sop_layout`.
- SOP app in `sop/`: Node/Express server (port 3005), MySQL pool, Brakebee JWT + enrollment auth.
- API: `/api/auth/me`, `/api/users` (Top), `/api/folders` (tree/flat, CRUD), `/api/sops` (list/get/create/update, versions), `/api/config`, `/api/layout`.
- Frontend: login gate (redirect to Brakebee), dashboard, “Manage users” (Top: list, change type, remove, search Brakebee & add).
- Nginx: `sop.brakebee.com` → proxy to Node (live config in `/etc/nginx/sites-available/sop.brakebee.com`).

**Also done:**
- Folder tree (outline nav; Root + folders; Top add/edit/delete), SOP list (by folder, View / Edit or Propose edit), SOP view (read-only, breadcrumb, all fields), SOP form (create/edit/propose with Editor.js block fields), version history on create/update.
- Block editor: from `sop/` run `npm run build` (or from root `npm run build:sop-editor`) → `sop/public/js/block-editor.bundle.js`. No CDN; uses root's npm packages.

---

*Ready to test. Optional later: search, status filter in list.*
