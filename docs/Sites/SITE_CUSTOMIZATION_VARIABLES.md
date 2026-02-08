# Site Customization Variables - Global Variables Reference

**Last Updated:** 2026-02-07  
**System:** Artist Sites Customization  
**Storage:** `site_customizations` table  
**Injection:** CSS Variables via `TemplateLoader.js`

---

## Overview

This document details all **GLOBAL** customization variables available across all templates in the Artist Sites system. These variables are stored in the `site_customizations` table and are available to every template regardless of template selection.

For **template-specific** customization variables, see [TEMPLATE_SPECIFIC_VARIABLES.md](./TEMPLATE_SPECIFIC_VARIABLES.md).

---

## Architecture

### Data Flow

```
User selects customization in SiteCustomizer.js
    ↓
Saved to site_customizations table (one row per site)
    ↓
Loaded by TemplateLoader.js component
    ↓
Injected as CSS variables on .storefront element
    ↓
Available to all template CSS files
```

### Database Storage

**Table:** `site_customizations`  
**Primary Key:** `site_id` (one row per site)  
**Relationship:** Foreign key to `sites.id` with CASCADE delete

---

## Color Variables

All color variables support hex format (`#RRGGBB`). They are injected as CSS custom properties.

### Text Color

- **Database Column:** `text_color`
- **CSS Variable:** `--text-color`
- **Default:** `#374151` (gray-700)
- **Tier Required:** Basic+
- **Usage:** Main text color throughout the site
- **Example:**
  ```css
  body {
    color: var(--text-color);
  }
  ```

### Main Color

- **Database Column:** `primary_color` (mapped to main_color in frontend)
- **CSS Variable:** `--main-color`
- **Default:** `#667eea` (purple-500)
- **Tier Required:** Basic+
- **Usage:** Primary brand color, headings, primary buttons
- **Example:**
  ```css
  h1, h2, h3 {
    color: var(--main-color);
  }
  .btn-primary {
    background-color: var(--main-color);
  }
  ```

### Secondary Color

- **Database Column:** `secondary_color`
- **CSS Variable:** `--secondary-color`
- **Default:** `#764ba2` (purple-600)
- **Tier Required:** Basic+
- **Usage:** Secondary actions, gradients, highlights
- **Example:**
  ```css
  .hero {
    background: linear-gradient(135deg, var(--main-color), var(--secondary-color));
  }
  ```

### Accent Color

- **Database Column:** `accent_color`
- **CSS Variable:** `--accent-color`
- **Default:** Inherited from main color
- **Tier Required:** Basic+
- **Usage:** Links, highlights, call-to-actions
- **Example:**
  ```css
  a {
    color: var(--accent-color);
  }
  ```

### Background Color

- **Database Column:** `background_color`
- **CSS Variable:** `--background-color`
- **Default:** `#ffffff` (white)
- **Tier Required:** Basic+
- **Usage:** Page background color
- **Example:**
  ```css
  body {
    background-color: var(--background-color);
  }
  ```

### Button Color

- **Database Column:** `button_color`
- **CSS Variable:** `--button-color`
- **Default:** `null` (falls back to main color)
- **Tier Required:** Basic+
- **Usage:** Override button colors independently from main color
- **Example:**
  ```css
  .btn {
    background-color: var(--button-color, var(--main-color));
  }
  ```

---

## Typography Variables

Font variables support Google Fonts family names. The `GoogleFontsLoader` component automatically loads the fonts from Google Fonts CDN.

### Body Font

- **Database Column:** `body_font`
- **CSS Variable:** `--body-font`
- **Default:** System fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- **Tier Required:** Basic+
- **Usage:** Body text, paragraphs, general content
- **Example:**
  ```css
  body, p, span {
    font-family: var(--body-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  }
  ```

### Header Font

- **Database Column:** `header_font`
- **CSS Variable:** `--header-font`
- **Default:** Inherits from body font
- **Tier Required:** Basic+
- **Usage:** All heading elements (h1-h6)
- **Example:**
  ```css
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--header-font, var(--body-font));
  }
  ```

### Heading-Specific Fonts

- **Database Columns:** `h1_font`, `h2_font`, `h3_font`, `h4_font`
- **CSS Variables:** `--h1-font`, `--h2-font`, `--h3-font`, `--h4-font`
- **Default:** Inherits from header font
- **Tier Required:** Professional+
- **Usage:** Individual heading level customization
- **Example:**
  ```css
  h1 { font-family: var(--h1-font, var(--header-font)); }
  h2 { font-family: var(--h2-font, var(--header-font)); }
  ```

---

## Layout & Style Variables

### Button Style

- **Database Column:** `button_style`
- **Type:** `ENUM('rounded', 'square', 'pill')`
- **Default:** `'rounded'`
- **Tier Required:** Basic+
- **Usage:** Button corner style - NOT a CSS variable, requires conditional logic
- **Values:**
  - `rounded` - Moderate border radius (8px)
  - `square` - No border radius (0px)
  - `pill` - Full border radius (999px)
- **Implementation:**
  ```css
  .btn.rounded { border-radius: 8px; }
  .btn.square { border-radius: 0; }
  .btn.pill { border-radius: 999px; }
  ```

### Border Radius

- **Database Column:** `border_radius`
- **CSS Variable:** `--border-radius`
- **Default:** `'4px'`
- **Tier Required:** Professional+
- **Usage:** Global border radius for cards, images, containers
- **Example:**
  ```css
  .card, .image-container {
    border-radius: var(--border-radius);
  }
  ```

### Spacing Scale

- **Database Column:** `spacing_scale`
- **Type:** `ENUM('compact', 'normal', 'relaxed')`
- **CSS Variable:** `--spacing-scale` (numeric multiplier)
- **Default:** `'normal'` (1.0)
- **Tier Required:** Professional+
- **Usage:** Multiplier for all spacing values
- **Values:**
  - `compact` → `0.75` (tighter spacing)
  - `normal` → `1.0` (default spacing)
  - `relaxed` → `1.25` (looser spacing)
- **Example:**
  ```css
  .section {
    padding: calc(2rem * var(--spacing-scale, 1));
  }
  ```

### Hero Style

- **Database Column:** `hero_style`
- **Type:** `ENUM('gradient', 'solid', 'image', 'minimal')`
- **Default:** `'gradient'`
- **Tier Required:** Basic+
- **Usage:** Hero section visual style - NOT a CSS variable, requires conditional rendering
- **Values:**
  - `gradient` - Gradient background using main + secondary colors
  - `solid` - Solid color background using main color
  - `image` - Background image (requires separate image field)
  - `minimal` - Minimal styling, mostly transparent

### Navigation Style

- **Database Column:** `navigation_style`
- **Type:** `ENUM('horizontal', 'centered', 'minimal', 'sidebar')`
- **Default:** `'horizontal'`
- **Tier Required:** Basic+
- **Usage:** Navigation layout style - NOT a CSS variable, requires conditional rendering
- **Values:**
  - `horizontal` - Standard horizontal nav bar
  - `centered` - Centered logo with navigation on sides
  - `minimal` - Minimalist navigation
  - `sidebar` - Vertical sidebar navigation

---

## Content Variables

### Footer Text

- **Database Column:** `footer_text`
- **Type:** `TEXT`
- **Default:** `null`
- **Tier Required:** Basic+
- **Usage:** Custom footer text content - NOT a CSS variable, rendered as HTML
- **Example:**
  ```jsx
  {customizations.footer_text && (
    <footer dangerouslySetInnerHTML={{ __html: customizations.footer_text }} />
  )}
  ```

---

## Advanced Customization

### Custom CSS

- **Database Column:** `custom_css`
- **Type:** `TEXT`
- **Default:** `null`
- **Tier Required:** Professional ONLY
- **Usage:** User-provided custom CSS - sanitized before injection
- **Security:** Sanitized by `cssSanitizer.js` utility
- **Example:**
  ```jsx
  {customCSS && (
    <style dangerouslySetInnerHTML={{ __html: customCSS }} />
  )}
  ```

### Google Fonts Tracking

- **Database Column:** `google_fonts_loaded`
- **Type:** `JSON`
- **Default:** `null`
- **Usage:** Array tracking which Google Fonts are loaded for this site
- **Example:** `["Roboto", "Playfair Display", "Open Sans"]`

---

## Tier Requirements Summary

| Variable | Free | Basic | Professional |
|----------|------|-------|--------------|
| All Colors | ❌ | ✅ | ✅ |
| Body Font | ❌ | ✅ | ✅ |
| Header Font | ❌ | ✅ | ✅ |
| Heading-Specific Fonts | ❌ | ❌ | ✅ |
| Button Style | ❌ | ✅ | ✅ |
| Border Radius | ❌ | ❌ | ✅ |
| Spacing Scale | ❌ | ❌ | ✅ |
| Hero Style | ❌ | ✅ | ✅ |
| Navigation Style | ❌ | ✅ | ✅ |
| Footer Text | ❌ | ✅ | ✅ |
| Custom CSS | ❌ | ❌ | ✅ |

---

## Frontend Components

### SiteCustomizer.js

Location: `/modules/websites/components/SiteCustomizer.js`

**Purpose:** UI for users to edit customizations

**Key Functions:**
- `loadSiteCustomizations()` - Fetches existing customizations from API
- `handleChange(field, value)` - Updates state when user changes a field
- `handleSave()` - Saves customizations to API via `updateSiteCustomizations()`

### TemplateLoader.js

Location: `/components/sites-modules/TemplateLoader.js`

**Purpose:** Injects customizations as CSS variables

**Key Functions:**
- `generateCustomizationCSS()` - Converts customization object to CSS variable declarations
- `collectGoogleFonts()` - Gathers all Google Fonts to load

---

## Backend Services

### sites.js Service

Location: `/api-service/src/modules/websites/services/sites.js`

**Key Functions:**
- `getSiteCustomizations(siteId)` - Retrieves customizations for a site
- `updateSiteCustomizations(siteId, customizations)` - Updates/inserts customizations
- `resolveSubdomain(subdomain)` - Resolves site data including customizations for public storefronts

---

## Example Usage in Templates

### Basic Template CSS

```css
/* /public/templates/my-template/styles.css */

/* Use CSS variables for colors */
body {
  color: var(--text-color);
  background-color: var(--background-color);
  font-family: var(--body-font, -apple-system, BlinkMacSystemFont, sans-serif);
}

h1, h2, h3 {
  color: var(--main-color);
  font-family: var(--header-font, var(--body-font));
}

.btn-primary {
  background-color: var(--button-color, var(--main-color));
  border-radius: var(--border-radius, 4px);
  padding: calc(0.75rem * var(--spacing-scale, 1)) calc(1.5rem * var(--spacing-scale, 1));
}

.hero {
  background: linear-gradient(135deg, var(--main-color), var(--secondary-color));
  padding: calc(4rem * var(--spacing-scale, 1)) calc(2rem * var(--spacing-scale, 1));
}

a {
  color: var(--accent-color, var(--main-color));
}
```

---

## See Also

- [ADDING_GLOBAL_VARIABLES.md](./ADDING_GLOBAL_VARIABLES.md) - Guide to adding new global variables
- [TEMPLATE_SPECIFIC_VARIABLES.md](./TEMPLATE_SPECIFIC_VARIABLES.md) - Guide to template-specific customizations
- [ARTIST_SITES_SYSTEM_SPEC.md](./ARTIST_SITES_SYSTEM_SPEC.md) - Full system architecture
