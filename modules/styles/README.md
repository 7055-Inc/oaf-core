# Styles Module

## Overview

The Styles module is the central location for all global CSS and design system tokens for the Brakebee platform.

**Status:** 🔄 In Progress

---

## Current Structure

```
modules/styles/
├── global.css       ← Master stylesheet (imported by _app.js)
└── README.md        ← This file
```

## Planned Structure

```
modules/styles/
├── index.css           ← Master file (imports all below)
├── variables.css       ← CSS custom properties (colors, spacing, fonts)
├── reset.css           ← CSS reset/normalize
├── typography.css      ← Headings, body text, links
├── buttons.css         ← Button styles
├── forms.css           ← Form elements (inputs, selects, labels)
├── modals.css          ← Modal/dialog styles
├── tables.css          ← Data table styles
├── alerts.css          ← Error, success, warning alerts
├── utilities.css       ← Utility classes (.sr-only, etc.)
└── README.md
```

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

### Global Classes
- `.section-box` - Standard bordered container
- `.form-grid-1`, `.form-grid-2`, `.form-grid-3` - Form layouts
- `.error-alert`, `.success-alert`, `.warning-alert` - Alert boxes
- `.modal-overlay`, `.modal-content` - Modal structure
- `.data-table` - Data table styling
- `.status-badge` - Status indicators

---

## Migration Checklist

### Phase 1: Split global.css
- [ ] Extract variables to `variables.css`
- [ ] Extract typography to `typography.css`
- [ ] Extract button styles to `buttons.css`
- [ ] Extract form styles to `forms.css`
- [ ] Extract modal styles to `modals.css`
- [ ] Extract table styles to `tables.css`
- [ ] Extract alert styles to `alerts.css`
- [ ] Create `index.css` that imports all

### Phase 2: Audit Components
- [ ] Find inline styles that should use global classes
- [ ] Find component CSS that duplicates global styles
- [ ] Consolidate into shared styles

### Phase 3: Documentation
- [ ] Document all available CSS classes
- [ ] Create style guide page (optional)

---

## Notes

- Keep `global.css` as single file until split is complete
- All new styles should use CSS variables
- Component-specific styles stay in component `.module.css` files
- Global styles are for truly reusable patterns only
