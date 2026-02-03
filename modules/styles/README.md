# Styles Module

## Overview

The Styles module is the central location for all global CSS and design system tokens for the Brakebee platform. **Use these classes in new and converted components** instead of component-level `.module.css` where possible (see MODULE_ARCHITECTURE.md "CSS Architecture (Global-First)").

**Status:** ✅ Phase 1 complete (split); Phase 2–3 in progress

---

## Current Structure

```
modules/styles/
├── global.css       ← Single entry (imported by _app.js). @imports sub-sheets below, then defines variables + base + typography + links + product + policy + a11y
├── forms.css        ← @import'd by global.css — form elements (inputs, selects, labels, form-card, form-grid, etc.)
├── buttons.css      ← @import'd by global.css — button variants (.secondary, .outline, .danger, .warning, .success, .small, .large)
├── tables.css       ← @import'd by global.css — .data-table, cell utilities
├── modals.css       ← @import'd by global.css — .modal-overlay, .modal-content, .modal-sm, .modal-lg
├── alerts.css       ← @import'd by global.css — .error-alert, .success-alert, .warning-alert, .info-alert, .info-banner, .toast-notification
├── states.css       ← @import'd by global.css — .loading-state, .empty-state, .spinner, .status-badge, .stat-grid, .expansion-section, etc.
├── tabs.css         ← @import'd by global.css — .tab-container, .tab, .tab.active, .tab-content, .tab-panel
└── README.md        ← This file
```

**Import chain (in `global.css`):**

```css
@import './forms.css';
@import './buttons.css';
@import './tables.css';
@import './modals.css';
@import './alerts.css';
@import './states.css';
@import './tabs.css';
```

Only `global.css` is imported in the app (`_app.js`). All sub-sheets are pulled in via these `@import`s; do not import `forms.css`, `buttons.css`, etc. directly from pages or components.

**Still defined inline in global.css (after the @imports):** CSS variables (`:root`), base (html/body/header), typography (h1–h3), links, product-card/publish-section, policy-content, accessibility (.sr-only, .skip-link).

---

## Design Tokens (CSS Variables)

### Brand Colors
```css
--primary-color: #055474;      /* Brakebee Primary Blue */
--secondary-color: #3E1C56;    /* Brakebee Accent Purple */
--text-color: #333333;         /* Dark Gray */
--background-color: #FFFFFF;   /* White */
```

### Status Colors
```css
--success-color: #198754;
--warning-color: #fd7e14;
--error-color: #dc2626;
```

### Typography
```css
--font-heading: 'Permanent Marker', cursive;
--font-body: 'Nunito Sans', sans-serif;
```

### Spacing & Sizing
```css
--border-radius-sm: 2px;
--border-radius-md: 4px;
--header-height-desktop: 80px;
--header-height-mobile: 70px;
```

---

## Usage

### Import in _app.js
```javascript
import '../modules/styles/global.css';
```

### Using CSS Variables
```css
.my-component {
  color: var(--primary-color);
  font-family: var(--font-body);
  border-radius: var(--border-radius-md);
}
```

### Global Classes (use these when converting components to module parts)

**Buttons** (`buttons.css`): `button`, `.secondary`, `.outline`, `.danger`, `.warning`, `.success`, `.small`/`.btn-sm`, `.large`/`.btn-lg`

**Forms** (`forms.css`): `input`, `select`, `textarea`, `label`, `.required`, `.form-card`, `.form-grid-1` / `.form-grid-2` / `.form-grid-3`, plus field groups and validation styles

**Tables** (`tables.css`): `.data-table`, thead/th/td, `.selected`, cell utilities

**Modals** (`modals.css`): `.modal-overlay`, `.modal-content`, `.modal-sm`, `.modal-lg`, header/footer/body classes

**Alerts** (`alerts.css`): `.error-alert`, `.success-alert`, `.warning-alert`, `.info-alert`, `.info-banner`, `.toast-notification`, `.toast-row`, `.status-completed` / `.status-failed` / `.status-processing`

**States** (`states.css`): `.loading-state`, `.empty-state`, `.error-state`, `.spinner` (`.small`, `.large`), `.status-badge` (`.active`, `.pending`, `.error`, `.inactive`, `.info`, etc.), `.status-indicator`, `.stat-grid`, `.stat-item`, `.stat-label`, `.stat-value`, `.expansion-section` / `.expansion-section-header` / `.expansion-section-content`, `.loading-inline`, `.quick-links`

**Tabs** (`tabs.css`): `.tab-container`, `.tab`, `.tab.active`, `.tab-content`, `.tab-panel`, `.tab-panel.active`

**Base** (in `global.css`): `.product-card`, `.publish-section`, `.publish-button`, `.policy-content`, `.sr-only`, `.skip-link`

**When adding new patterns:** Prefer adding to the appropriate file above (or a new file in `modules/styles/` and `@import` in `global.css`) so they are available site-wide.

---

## Migration Checklist

### Phase 1: Split global.css
- [x] Extract button styles to `buttons.css`
- [x] Extract form styles to `forms.css`
- [x] Extract modal styles to `modals.css`
- [x] Extract table styles to `tables.css`
- [x] Extract alert styles to `alerts.css`
- [x] Add `states.css`, `tabs.css`; import all in `global.css`
- [ ] Extract variables to `variables.css` (optional; currently in `global.css`)
- [ ] Extract typography/links to `typography.css` (optional)
- [ ] Create `index.css` that imports all (optional; `global.css` is current entry)

### Phase 2: Audit Components
- [ ] Find inline styles that should use global classes
- [ ] Find component CSS that duplicates global styles
- [ ] Consolidate into shared styles

### Phase 3: Documentation
- [ ] Document all available CSS classes
- [ ] Create style guide page (optional)

---

## Notes

- **Entry point:** `_app.js` imports `modules/styles/global.css` (and `modules/dashboard/styles/dashboard.css` for dashboard layout). The old `styles/global.css` is no longer the app entry.
- All new styles should use CSS variables from `:root` in `global.css`.
- **Global-first:** New and converted components use global class names (e.g. `className="secondary"`, `className="data-table"`). Only add `.module.css` for styles truly unique to one component.
- When converting a component to a module part, remove its `.module.css` and use global/dashboard classes; add new reusable patterns to `modules/styles/` if needed.
