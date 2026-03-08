# Template-Specific Customization Variables

**Last Updated:** 2026-02-07  
**Audience:** Template Developers  
**Context:** Artist Sites Template System

---

## Overview

This document explains how to define and use **TEMPLATE-SPECIFIC** customization variables in the Artist Sites system. Template-specific variables allow each template to define its own unique fields (e.g., hero video URL, gallery layout, custom text blocks) while preserving user data across template switches.

For **GLOBAL** customization variables (colors, fonts, etc.) available to all templates, see [SITE_CUSTOMIZATION_VARIABLES.md](./SITE_CUSTOMIZATION_VARIABLES.md).

---

## Architecture

### Key Concepts

1. **Separate Storage:** Template-specific data is stored in the `site_template_data` table, NOT in `site_customizations`
2. **Data Preservation:** When users switch templates, previous template data remains in the database
3. **Schema-Driven:** Each template defines its fields via a `schema.json` file
4. **Dynamic Rendering:** The frontend automatically generates UI fields based on the schema
5. **Tier Enforcement:** Fields can require specific subscription tiers

### Data Flow

```
Template defines schema.json
    ↓
User selects template for their site
    ↓
SiteCustomizer reads schema and renders fields dynamically
    ↓
User fills out template-specific fields
    ↓
Data saved to site_template_data table (site_id, template_id, field_key, field_value)
    ↓
TemplateLoader loads template-specific data
    ↓
Variables injected as CSS variables or data attributes
    ↓
Template CSS/JS uses the variables
```

### Database Storage

**Table:** `site_template_data`  
**Structure:**
- `id` - Primary key
- `site_id` - Foreign key to `sites.id`
- `template_id` - Foreign key to `website_templates.id`
- `field_key` - The field identifier (e.g., `hero_video_url`)
- `field_value` - The field value (stored as TEXT)
- `created_at`, `updated_at` - Timestamps

**Key Features:**
- One row per site, per template, per field
- Unique constraint on `(site_id, template_id, field_key)` prevents duplicates
- Indexed for fast lookups by `site_id` and `template_id`
- Foreign keys with CASCADE delete (site/template deletion removes data)

---

## Supported Field Types

The system supports the following field types:

| Type | Description | Input Widget | Validation |
|------|-------------|--------------|------------|
| `text` | Short text input | `<input type="text">` | Max 255 chars |
| `textarea` | Multi-line text | `<textarea>` | Max 10,000 chars |
| `url` | Generic URL | `<input type="url">` | URL format validation |
| `video_url` | Video URL | `<input type="url">` | URL format + video host check |
| `image_url` | Image URL | `<input type="url">` | URL format + image extension check |
| `color` | Color picker | `<input type="color">` | Hex color format |
| `number` | Numeric input | `<input type="number">` | Numeric validation |
| `select` | Dropdown selector | `<select>` | Must match option values |

---

## Schema Definition

### File Location

Each template must have a `schema.json` file:

```
/public/templates/[template-slug]/
├── styles.css        # Template CSS
├── schema.json       # Template field definitions ← THIS FILE
├── preview.jpg       # Template preview image
└── README.md         # Template documentation
```

### Schema Structure

```json
{
  "template_slug": "video-hero",
  "template_name": "Video Hero",
  "description": "Modern template with full-screen video background",
  "version": "1.0.0",
  "custom_fields": [
    {
      "key": "hero_video_url",
      "label": "Hero Background Video URL",
      "type": "video_url",
      "description": "URL to MP4 video for hero background (recommended: under 5MB)",
      "required": false,
      "default_value": "",
      "tier_required": "professional",
      "placeholder": "https://example.com/video.mp4"
    },
    {
      "key": "gallery_layout",
      "label": "Gallery Layout Style",
      "type": "select",
      "description": "Choose how to display your artwork gallery",
      "required": true,
      "default_value": "masonry",
      "tier_required": "basic",
      "options": [
        { "value": "masonry", "label": "Masonry Grid" },
        { "value": "grid", "label": "Regular Grid" },
        { "value": "carousel", "label": "Carousel Slider" }
      ]
    },
    {
      "key": "hero_tagline",
      "label": "Hero Tagline",
      "type": "textarea",
      "description": "Short tagline displayed in hero section",
      "required": false,
      "default_value": "",
      "tier_required": "basic",
      "max_length": 200
    }
  ]
}
```

### Field Definition Properties

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `key` | ✅ Yes | string | Unique identifier for the field (snake_case) |
| `label` | ✅ Yes | string | Display label for the UI field |
| `type` | ✅ Yes | string | Field type (see supported types above) |
| `description` | ❌ No | string | Help text shown below the field |
| `required` | ❌ No | boolean | Whether field is required (default: false) |
| `default_value` | ❌ No | string | Default value if not set |
| `tier_required` | ❌ No | string | Minimum tier required (`basic`, `professional`) |
| `placeholder` | ❌ No | string | Placeholder text for input fields |
| `options` | ❌ No | array | For `select` type - array of `{value, label}` objects |
| `min` | ❌ No | number | For `number` type - minimum value |
| `max` | ❌ No | number | For `number` type - maximum value |
| `max_length` | ❌ No | number | For `text`/`textarea` - max character length |

---

## Example: Creating a Template with Custom Fields

### Step 1: Create Schema File

Create `/public/templates/modern-portfolio/schema.json`:

```json
{
  "template_slug": "modern-portfolio",
  "template_name": "Modern Portfolio",
  "description": "Clean portfolio template with customizable hero and gallery",
  "version": "1.0.0",
  "custom_fields": [
    {
      "key": "hero_background_image",
      "label": "Hero Background Image URL",
      "type": "image_url",
      "description": "Full-width hero background image (recommended: 1920x1080px)",
      "required": false,
      "tier_required": "basic",
      "placeholder": "https://example.com/hero-bg.jpg"
    },
    {
      "key": "hero_overlay_opacity",
      "label": "Hero Overlay Opacity",
      "type": "number",
      "description": "Dark overlay opacity over hero image (0-100)",
      "required": false,
      "default_value": "50",
      "tier_required": "basic",
      "min": 0,
      "max": 100
    },
    {
      "key": "portfolio_columns",
      "label": "Portfolio Grid Columns",
      "type": "select",
      "description": "Number of columns in portfolio grid",
      "required": true,
      "default_value": "3",
      "tier_required": "basic",
      "options": [
        { "value": "2", "label": "2 Columns" },
        { "value": "3", "label": "3 Columns" },
        { "value": "4", "label": "4 Columns" }
      ]
    },
    {
      "key": "show_project_descriptions",
      "label": "Show Project Descriptions",
      "type": "select",
      "description": "Display descriptions on portfolio items",
      "required": false,
      "default_value": "on-hover",
      "tier_required": "basic",
      "options": [
        { "value": "always", "label": "Always Show" },
        { "value": "on-hover", "label": "Show on Hover" },
        { "value": "never", "label": "Never Show" }
      ]
    },
    {
      "key": "contact_cta_text",
      "label": "Contact CTA Text",
      "type": "text",
      "description": "Call-to-action text for contact button",
      "required": false,
      "default_value": "Get in touch",
      "tier_required": "basic",
      "max_length": 50
    }
  ]
}
```

### Step 2: Use Variables in Template CSS

Create `/public/templates/modern-portfolio/styles.css`:

```css
/* Template: Modern Portfolio
 * Version: 1.0.0
 * Uses both global and template-specific customization variables
 */

/* Global variables (inherited from TemplateLoader) */
/* --text-color, --main-color, --secondary-color, --background-color */
/* --body-font, --header-font, --border-radius, --spacing-scale */

/* Template-specific variables (injected by TemplateLoader) */
/* --hero-background-image, --hero-overlay-opacity, --portfolio-columns */

/* Reset & Base */
* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body {
  font-family: var(--body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--text-color, #333);
  background-color: var(--background-color, #fff);
  line-height: 1.6;
}

/* Hero Section - Uses Template-Specific Variables */
.hero {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-image: var(--hero-background-image, linear-gradient(135deg, var(--main-color), var(--secondary-color)));
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, calc(var(--hero-overlay-opacity, 50) / 100));
  z-index: 1;
}

.hero__content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  padding: calc(2rem * var(--spacing-scale, 1));
}

.hero__title {
  font-family: var(--header-font, var(--body-font));
  font-size: calc(3rem * var(--spacing-scale, 1));
  margin-bottom: 1rem;
}

/* Portfolio Grid - Uses Template-Specific Variable */
.portfolio {
  padding: calc(4rem * var(--spacing-scale, 1)) calc(2rem * var(--spacing-scale, 1));
}

.portfolio__grid {
  display: grid;
  grid-template-columns: repeat(var(--portfolio-columns, 3), 1fr);
  gap: calc(2rem * var(--spacing-scale, 1));
  max-width: 1200px;
  margin: 0 auto;
}

.portfolio__item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  transition: transform 0.3s ease;
}

.portfolio__item:hover {
  transform: scale(1.05);
}

.portfolio__item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Project Descriptions - Conditional Display via Data Attribute */
.portfolio__item-description {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

/* Show always if data attribute is set */
.storefront[data-show-project-descriptions="always"] .portfolio__item-description {
  transform: translateY(0);
}

/* Show on hover */
.storefront[data-show-project-descriptions="on-hover"] .portfolio__item:hover .portfolio__item-description {
  transform: translateY(0);
}

/* Never show */
.storefront[data-show-project-descriptions="never"] .portfolio__item-description {
  display: none;
}

/* Contact CTA */
.contact-cta {
  display: inline-block;
  padding: calc(0.75rem * var(--spacing-scale, 1)) calc(2rem * var(--spacing-scale, 1));
  background-color: var(--main-color, #667eea);
  color: white;
  text-decoration: none;
  border-radius: var(--border-radius, 8px);
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.contact-cta:hover {
  background-color: var(--secondary-color, #764ba2);
}

/* Responsive */
@media (max-width: 768px) {
  .portfolio__grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .hero__title {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .portfolio__grid {
    grid-template-columns: 1fr;
  }
}
```

### Step 3: Use Variables in Template HTML/JSX

If your template needs to use the values in markup (not just CSS), access them via props:

```jsx
export default function ModernPortfolioTemplate({ siteData, templateData }) {
  return (
    <div className="storefront" data-show-project-descriptions={templateData.show_project_descriptions}>
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{siteData.site_title}</h1>
          <p className="hero__subtitle">{siteData.site_description}</p>
        </div>
      </section>
      
      <section className="portfolio">
        <div className="portfolio__grid">
          {siteData.artworks?.map(artwork => (
            <div key={artwork.id} className="portfolio__item">
              <img 
                src={artwork.image_url} 
                alt={artwork.title}
                className="portfolio__item-image"
              />
              <div className="portfolio__item-description">
                <h3>{artwork.title}</h3>
                <p>{artwork.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="contact">
        <a href="/contact" className="contact-cta">
          {templateData.contact_cta_text || 'Get in touch'}
        </a>
      </section>
    </div>
  );
}
```

---

## Backend API Reference

### Get Template Schema

**Endpoint:** `GET /api/v2/websites/templates/:templateId/schema`  
**Auth:** None (public endpoint)  
**Returns:** Template schema JSON

```bash
curl https://staging.example.com/api/v2/websites/templates/5/schema
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template_slug": "modern-portfolio",
    "template_name": "Modern Portfolio",
    "description": "Clean portfolio template with customizable hero and gallery",
    "version": "1.0.0",
    "custom_fields": [...]
  }
}
```

### Get Template Data for Site

**Endpoint:** `GET /api/v2/websites/sites/:siteId/template-data`  
**Auth:** Required (must own site)  
**Returns:** Template-specific field data for site's current template

```bash
curl -H "Authorization: Bearer TOKEN" \
  https://staging.example.com/api/v2/websites/sites/123/template-data
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hero_background_image": "https://example.com/hero.jpg",
    "hero_overlay_opacity": "60",
    "portfolio_columns": "3",
    "show_project_descriptions": "on-hover",
    "contact_cta_text": "Hire me"
  }
}
```

### Update Template Data for Site

**Endpoint:** `PUT /api/v2/websites/sites/:siteId/template-data`  
**Auth:** Required (must own site)  
**Body:** Object with field_key: field_value pairs

```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hero_background_image": "https://example.com/new-hero.jpg",
    "portfolio_columns": "4"
  }' \
  https://staging.example.com/api/v2/websites/sites/123/template-data
```

**Response:**
```json
{
  "success": true,
  "message": "Template data updated successfully"
}
```

**Validation:**
- Validates against template schema (required fields, types)
- Enforces tier requirements
- Returns 403 if user's tier is insufficient for a field
- Returns 400 if validation fails

---

## Frontend Integration

The `SiteCustomizer.js` component automatically handles template-specific fields:

1. **Loads Schema:** Fetches schema when component mounts or template changes
2. **Renders Fields:** Dynamically creates form fields based on schema
3. **Tier Enforcement:** Disables/hides fields user can't access
4. **Saves Data:** Sends to API endpoint with validation

**No manual coding required** - just create the `schema.json` file and the UI updates automatically!

---

## Data Preservation Example

```
User creates Site #42 with "Classic Gallery" template
  → site_template_data rows:
    (42, 1, 'gallery_spacing', 'normal')
    (42, 1, 'show_titles', 'true')

User switches Site #42 to "Modern Portfolio" template (template_id: 5)
  → Previous rows remain in database
  → User fills out Modern Portfolio fields:
    (42, 5, 'hero_background_image', 'https://...')
    (42, 5, 'portfolio_columns', '3')

User switches Site #42 BACK to "Classic Gallery" template
  → System loads: (42, 1, 'gallery_spacing', 'normal')
  → Data is still there! No data loss.
```

---

## Best Practices

### Schema Design

1. **Use Clear Labels:** Users should understand what each field does
2. **Provide Descriptions:** Include helpful descriptions for complex fields
3. **Set Sensible Defaults:** Provide default values so sites work out-of-the-box
4. **Use Appropriate Types:** Choose the most specific type (e.g., `video_url` not `text`)
5. **Don't Over-Customize:** Only add fields that significantly impact the template

### Field Naming

- Use `snake_case` for field keys
- Be descriptive: `hero_video_url` not `video`
- Prefix by section: `hero_background_image`, `gallery_layout`, `footer_cta_text`

### Tier Assignment

- **Basic Tier:** Most template-specific fields (colors, layouts, content)
- **Professional Tier:** Advanced features (videos, complex animations, premium layouts)
- **Keep Essential Free:** Don't tier-lock fields required for template to function

### CSS Variable Naming

Convert field keys to CSS variable format:
- `hero_video_url` → `--hero-video-url`
- `portfolio_columns` → `--portfolio-columns`

### Performance

- **Limit Field Count:** Keep schemas under 10-15 fields
- **Optimize Images:** Document recommended image sizes
- **Cache Schemas:** Schemas are cached on backend for performance

---

## Testing Checklist

- [ ] Schema JSON is valid and loads without errors
- [ ] All fields render correctly in SiteCustomizer
- [ ] Fields save and load correctly
- [ ] Tier enforcement works (disable fields for lower tiers)
- [ ] Template CSS uses variables correctly
- [ ] Data persists when switching templates
- [ ] Required fields are enforced
- [ ] Field validation works (URLs, numbers, max length)
- [ ] Multiple sites can have different values for same template
- [ ] Template works with default values (new site)

---

## Troubleshooting

### Schema not loading

**Check:**
- File path: `/public/templates/[slug]/schema.json`
- JSON is valid (use JSON validator)
- Template slug in schema matches directory name
- Template exists in `website_templates` database table

### Fields not rendering

**Check:**
- Browser console for JavaScript errors
- Schema has `custom_fields` array
- Field definitions have required properties (key, label, type)
- SiteCustomizer is correctly fetching schema

### Data not saving

**Check:**
- User owns the site
- User's tier allows the field
- Field key matches schema definition
- Backend logs for validation errors

### Variables not appearing in CSS

**Check:**
- TemplateLoader is updated to inject template-specific variables
- CSS variable naming matches (`hero_video_url` → `--hero-video-url`)
- Browser DevTools shows CSS variables on `.storefront` element

---

## Migration Guide: Moving Fields from Global to Template-Specific

If you have a global customization that should be template-specific:

1. **Don't Delete Global Field:** Leave it for backward compatibility
2. **Add Template-Specific Field:** Create schema with new field
3. **Migrate Data:** Write migration script to copy data to new table
4. **Update Templates:** Update templates to use template-specific field
5. **Deprecate Global:** Eventually remove global field after full migration

---

## See Also

- [SITE_CUSTOMIZATION_VARIABLES.md](./SITE_CUSTOMIZATION_VARIABLES.md) - Global variables reference
- [ADDING_GLOBAL_VARIABLES.md](./ADDING_GLOBAL_VARIABLES.md) - Guide to adding global variables
- [ARTIST_SITES_SYSTEM_SPEC.md](./ARTIST_SITES_SYSTEM_SPEC.md) - Full system architecture
