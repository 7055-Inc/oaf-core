# Adding Global Customization Variables

**Last Updated:** 2026-02-07  
**Audience:** Developers  
**Context:** Artist Sites Customization System

---

## Overview

This guide provides step-by-step instructions for adding **NEW GLOBAL** customization variables to the Artist Sites system. Global variables are available to ALL templates and stored in the `site_customizations` table.

For adding **template-specific** variables, see [TEMPLATE_SPECIFIC_VARIABLES.md](./TEMPLATE_SPECIFIC_VARIABLES.md).

---

## When to Add a Global Variable

Add a **GLOBAL** variable when:
- ✅ The customization applies to ALL templates
- ✅ It's a fundamental design element (colors, fonts, spacing)
- ✅ Multiple templates will use the same value

Use a **TEMPLATE-SPECIFIC** variable when:
- ❌ Only certain templates need this customization
- ❌ It's template-specific content (hero video URL, gallery layout)
- ❌ Different templates would use it differently

---

## Step-by-Step Guide

### Step 1: Database Migration

**Location:** `/api-service/migrations/###_descriptive_name.sql`

Create a new migration file with the next sequential number. Use `ALTER TABLE` to add the new column to `site_customizations`.

**Example: Adding a "Link Underline Style" Variable**

```sql
-- Migration 015: Add Link Underline Style Customization
-- Adds link_underline_style option to site_customizations table
-- Sprint X: Custom Link Styling

-- Add new column to site_customizations table
ALTER TABLE site_customizations
ADD COLUMN link_underline_style ENUM('none', 'solid', 'dotted', 'on-hover') DEFAULT 'on-hover'
  COMMENT 'Link underline style preference'
  AFTER footer_text;

-- Add index if frequently queried
ALTER TABLE site_customizations
ADD INDEX idx_link_underline_style (link_underline_style);

-- Migration completed successfully
```

**Column Definition Guidelines:**
- Use appropriate data type:
  - `VARCHAR(7)` for hex colors
  - `VARCHAR(255)` for font names, URLs
  - `TEXT` for longer content
  - `ENUM()` for predefined options
  - `JSON` for arrays/objects
- Set sensible `DEFAULT` values
- Add `COMMENT` describing the purpose
- Place `AFTER` appropriate column (keep related fields together)
- Consider indexes for frequently queried fields

**Run the migration:**
```bash
mysql -h 10.128.0.31 -u oafuser -p wordpress_import < /var/www/staging/api-service/migrations/015_add_link_underline.sql
```

---

### Step 2: Update Backend Service

**Location:** `/api-service/src/modules/websites/services/sites.js`

Update relevant service functions to handle the new variable.

#### 2a. Update `getSiteCustomizations()`

Usually no change needed - it returns all columns from `site_customizations` table.

#### 2b. Update `updateSiteCustomizations()`

Add the new field to the function's parameter handling and SQL query.

**Example:**

```javascript
async function updateSiteCustomizations(siteId, customizations) {
  // Validate tier access
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  const userId = site[0].user_id;
  const [subscription] = await db.query(
    'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active"',
    [userId]
  );
  const userTier = subscription[0]?.tier || 'free';
  const limits = getTierLimits(userTier);
  
  // Build update object
  const updates = {};
  
  // Color variables (Basic+)
  if (customizations.text_color !== undefined) updates.text_color = customizations.text_color;
  if (customizations.primary_color !== undefined) updates.primary_color = customizations.primary_color;
  if (customizations.secondary_color !== undefined) updates.secondary_color = customizations.secondary_color;
  if (customizations.accent_color !== undefined) updates.accent_color = customizations.accent_color;
  if (customizations.background_color !== undefined) updates.background_color = customizations.background_color;
  if (customizations.button_color !== undefined) updates.button_color = customizations.button_color;
  
  // Font variables (Basic+)
  if (customizations.body_font !== undefined) updates.body_font = customizations.body_font;
  if (customizations.header_font !== undefined) updates.header_font = customizations.header_font;
  
  // Layout variables (Basic+)
  if (customizations.button_style !== undefined) updates.button_style = customizations.button_style;
  if (customizations.hero_style !== undefined) updates.hero_style = customizations.hero_style;
  if (customizations.navigation_style !== undefined) updates.navigation_style = customizations.navigation_style;
  if (customizations.footer_text !== undefined) updates.footer_text = customizations.footer_text;
  
  // ADD YOUR NEW VARIABLE HERE (with appropriate tier check)
  // Example: Link underline style (Basic+)
  if (customizations.link_underline_style !== undefined) {
    if (!limits.allow_basic_customization) {
      const err = new Error('Link underline customization requires Basic or higher tier');
      err.statusCode = 403;
      throw err;
    }
    updates.link_underline_style = customizations.link_underline_style;
  }
  
  // Advanced variables (Professional only)
  if (customizations.border_radius !== undefined) {
    if (!limits.allow_advanced_customization) {
      const err = new Error('Border radius customization requires Professional tier');
      err.statusCode = 403;
      throw err;
    }
    updates.border_radius = customizations.border_radius;
  }
  
  // Custom CSS (Professional only)
  if (customizations.custom_css !== undefined) {
    if (!limits.allow_custom_css) {
      const err = new Error('Custom CSS requires Professional tier');
      err.statusCode = 403;
      throw err;
    }
    const sanitized = sanitizeCSS(customizations.custom_css);
    updates.custom_css = sanitized;
  }
  
  // Perform upsert
  const columns = Object.keys(updates);
  const values = Object.values(updates);
  
  if (columns.length === 0) {
    return { success: true, message: 'No changes to apply' };
  }
  
  const setClause = columns.map(col => `${col} = ?`).join(', ');
  const sql = `INSERT INTO site_customizations (site_id, ${columns.join(', ')}) 
               VALUES (?, ${values.map(() => '?').join(', ')}) 
               ON DUPLICATE KEY UPDATE ${setClause}`;
  
  await db.query(sql, [siteId, ...values, ...values]);
  
  // Invalidate cache
  await deleteCache(`site:${siteId}:customizations`);
  await deleteCachePattern(`subdomain:*`);
  
  return { success: true };
}
```

---

### Step 3: Update Frontend State Management

**Location:** `/modules/websites/components/SiteCustomizer.js`

#### 3a. Add to Initial State

```javascript
const [customizations, setCustomizations] = useState({
  textColor: '#374151',
  mainColor: '#667eea',
  secondaryColor: '#764ba2',
  bodyFont: '',
  headerFont: '',
  buttonStyle: 'rounded',
  buttonColor: '',
  borderRadius: '4px',
  spacingScale: 'normal',
  heroStyle: 'gradient',
  navigationStyle: 'horizontal',
  footerText: '',
  // ADD YOUR NEW VARIABLE HERE
  linkUnderlineStyle: 'on-hover'  // ← New variable
});
```

#### 3b. Add to Load Function

```javascript
const loadSiteCustomizations = async () => {
  try {
    const data = await fetchSiteCustomizations(site.id);
    const cust = data?.customizations ?? data;
    if (cust && typeof cust === 'object') {
      setCustomizations(prev => ({
        ...prev,
        textColor: cust.text_color || '#374151',
        mainColor: cust.main_color || '#667eea',
        secondaryColor: cust.secondary_color || '#764ba2',
        bodyFont: cust.body_font || prev.bodyFont,
        headerFont: cust.header_font || prev.headerFont,
        buttonStyle: cust.button_style || 'rounded',
        buttonColor: cust.button_color || '',
        borderRadius: cust.border_radius || '4px',
        spacingScale: cust.spacing_scale || 'normal',
        heroStyle: cust.hero_style || 'gradient',
        navigationStyle: cust.navigation_style || 'horizontal',
        footerText: cust.footer_text || '',
        // ADD YOUR NEW VARIABLE HERE
        linkUnderlineStyle: cust.link_underline_style || 'on-hover'  // ← New variable
      }));
    }
  } catch (err) {
    console.error('Error loading customizations:', err);
    setError('Failed to load customizations');
  }
};
```

#### 3c. Add to Save Function

```javascript
const handleSave = async () => {
  try {
    setProcessing(true);
    setError(null);

    const result = await updateSiteCustomizations(site.id, {
      text_color: customizations.textColor,
      main_color: customizations.mainColor,
      secondary_color: customizations.secondaryColor,
      body_font: customizations.bodyFont,
      header_font: customizations.headerFont,
      button_style: customizations.buttonStyle,
      button_color: customizations.buttonColor || null,
      border_radius: customizations.borderRadius,
      spacing_scale: customizations.spacingScale,
      hero_style: customizations.heroStyle,
      navigation_style: customizations.navigationStyle,
      footer_text: customizations.footerText || null,
      // ADD YOUR NEW VARIABLE HERE
      link_underline_style: customizations.linkUnderlineStyle  // ← New variable
    });

    if (result?.success !== false) {
      if (onUpdate) onUpdate();
      alert('Site customizations saved successfully!');
    } else {
      setError(result?.error || 'Failed to save customizations');
    }
  } catch (error) {
    setError(error.message || 'Error saving customizations');
    console.error('Error saving customizations:', error);
  } finally {
    setProcessing(false);
  }
};
```

#### 3d. Add UI Field

Add the appropriate form field in the component's render section:

```jsx
{/* Link Underline Style */}
<div className="customization-field">
  <label>Link Underline Style</label>
  <select
    value={customizations.linkUnderlineStyle}
    onChange={(e) => handleChange('linkUnderlineStyle', e.target.value)}
    disabled={!hasSites || processing}
  >
    <option value="none">No Underline</option>
    <option value="solid">Always Underlined</option>
    <option value="dotted">Dotted Underline</option>
    <option value="on-hover">Underline on Hover</option>
  </select>
  {!hasSites && (
    <small className="tier-notice">Requires Basic tier or higher</small>
  )}
</div>
```

**Field Types:**
- Color: `<input type="color" />`
- Text: `<input type="text" />`
- Select: `<select><option /></select>`
- Font: `<GoogleFontsPicker />` component

---

### Step 4: Update Template Loader

**Location:** `/components/sites-modules/TemplateLoader.js`

Add your new variable to the `generateCustomizationCSS()` function.

#### 4a. For CSS Variable Injection

```javascript
const generateCustomizationCSS = () => {
  const vars = [];
  
  // Existing color variables...
  if (customizations.primary_color) {
    vars.push(`--main-color: ${customizations.primary_color};`);
  }
  // ... other variables ...
  
  // ADD YOUR NEW VARIABLE HERE
  if (customizations.link_underline_style) {
    // Convert enum to CSS value
    const underlineMap = {
      'none': 'none',
      'solid': 'underline',
      'dotted': 'underline dotted',
      'on-hover': 'none'  // Handled in template CSS with :hover
    };
    const underlineValue = underlineMap[customizations.link_underline_style] || 'none';
    vars.push(`--link-underline: ${underlineValue};`);
  }
  
  // Return CSS block
  if (vars.length > 0) {
    return `.storefront {\n  ${vars.join('\n  ')}\n}`;
  }
  
  return '';
};
```

#### 4b. For Data Attribute Injection (Alternative)

If CSS variables aren't appropriate (e.g., for conditional logic), inject as data attributes:

```javascript
// In TemplateLoader return section
<div 
  className="storefront" 
  data-link-underline={customizations.link_underline_style}
>
  {children}
</div>
```

Then in template CSS:

```css
/* Use attribute selector */
.storefront[data-link-underline="none"] a {
  text-decoration: none;
}
.storefront[data-link-underline="solid"] a {
  text-decoration: underline;
}
.storefront[data-link-underline="on-hover"] a {
  text-decoration: none;
}
.storefront[data-link-underline="on-hover"] a:hover {
  text-decoration: underline;
}
```

---

### Step 5: Update Template CSS Files

**Location:** `/public/templates/*/styles.css`

Update existing templates to use the new variable.

**Example:**

```css
/* Use the new CSS variable */
a {
  color: var(--accent-color, var(--main-color));
  text-decoration: var(--link-underline, none);
}

/* If using on-hover, add hover state */
.storefront[data-link-underline="on-hover"] a:hover {
  text-decoration: underline;
}
```

Update at least the `classic-gallery` template and any other active templates.

---

### Step 6: Update Documentation

Update [SITE_CUSTOMIZATION_VARIABLES.md](./SITE_CUSTOMIZATION_VARIABLES.md) with your new variable:

```markdown
### Link Underline Style

- **Database Column:** `link_underline_style`
- **Type:** `ENUM('none', 'solid', 'dotted', 'on-hover')`
- **CSS Variable:** `--link-underline`
- **Default:** `'on-hover'`
- **Tier Required:** Basic+
- **Usage:** Controls link underline styling across the site
- **Values:**
  - `none` - No underline
  - `solid` - Always underlined
  - `dotted` - Dotted underline
  - `on-hover` - Underline appears on hover
- **Example:**
  ```css
  a {
    text-decoration: var(--link-underline, none);
  }
  ```
```

---

### Step 7: Testing

After implementation, test:

1. **Database:** Verify migration ran successfully
   ```bash
   mysql -h 10.128.0.31 -u oafuser -p wordpress_import
   DESC site_customizations;  # Check new column exists
   ```

2. **Backend:** Test API endpoints
   - Update a site's customizations with the new field
   - Verify it saves to the database
   - Verify tier enforcement works

3. **Frontend Customizer:** 
   - Open site customization UI
   - Change the new field value
   - Save and verify no errors

4. **Template Rendering:**
   - View the site storefront
   - Verify the customization applies correctly
   - Check browser DevTools for CSS variable injection

5. **Tier Enforcement:**
   - Test with Free tier (should be disabled if Basic+ required)
   - Test with Basic tier (should work if Basic+)
   - Test with Professional tier (should work)

6. **Restart API Service:**
   ```bash
   pm2 restart staging-api
   ```

---

## Tier Assignment Guidelines

Assign tier requirements based on complexity and value:

| Tier | When to Use |
|------|-------------|
| **Free** | Basic template selection only - no customization |
| **Basic** | Fundamental customizations (colors, fonts, basic layouts) |
| **Professional** | Advanced customizations (spacing, custom CSS, granular control) |

**Examples:**
- Primary color → **Basic** (fundamental branding)
- Body font → **Basic** (fundamental typography)
- Border radius → **Professional** (granular control)
- Custom CSS → **Professional** (advanced users only)

---

## Checklist

- [ ] Database migration created and run
- [ ] Backend service updated (`sites.js`)
- [ ] Frontend state management updated (`SiteCustomizer.js`)
- [ ] UI field added to customizer
- [ ] Template loader updated (`TemplateLoader.js`)
- [ ] Template CSS files updated
- [ ] Documentation updated
- [ ] Tier enforcement tested
- [ ] API service restarted
- [ ] Manual testing completed

---

## Common Issues

### Issue: Variable not appearing in CSS

**Solution:** Check that `TemplateLoader.js` is correctly generating the CSS variable. Inspect the page with DevTools and look for the `<style data-customizations="true">` tag.

### Issue: Changes not saving

**Solution:** Check browser console for errors. Verify API endpoint is returning success. Check database credentials in `.env`.

### Issue: Tier enforcement not working

**Solution:** Verify `getTierLimits()` is being called correctly and the tier check logic matches the tier assignment in the documentation.

### Issue: Variable not loading from database

**Solution:** Check that the column name in the database matches the field name in `loadSiteCustomizations()`. Remember: database uses snake_case (`link_underline_style`), frontend uses camelCase (`linkUnderlineStyle`).

---

## See Also

- [SITE_CUSTOMIZATION_VARIABLES.md](./SITE_CUSTOMIZATION_VARIABLES.md) - All global variables reference
- [TEMPLATE_SPECIFIC_VARIABLES.md](./TEMPLATE_SPECIFIC_VARIABLES.md) - Template-specific customization guide
- [ARTIST_SITES_SYSTEM_SPEC.md](./ARTIST_SITES_SYSTEM_SPEC.md) - Full system architecture
