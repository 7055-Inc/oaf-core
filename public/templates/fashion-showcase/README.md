# Fashion Showcase Template

**Version:** 1.0.0  
**Author:** Artist Sites  
**Tier Required:** Basic

## Overview

Fashion Showcase is a modern template inspired by contemporary fashion e-commerce sites. It features circular category showcases (Instagram stories style), a split hero section with video support, and **introduces a modular addon architecture** that allows Sprint 12 addons to integrate seamlessly across multiple templates.

## 🎯 Target Audience

- Fashion brands and retailers
- Lifestyle artists
- Modern product showcases
- Contemporary galleries
- E-commerce focused artists

## 🌟 Key Design Features

### 1. **Wide Horizontal Menu Bar**
- Clean, spacious navigation
- Centered menu items
- Search, account, cart icons
- Sticky header with subtle shadow on scroll

### 2. **Circular Category Showcase**
- Instagram stories-style circular images
- Gold/tan accent borders
- Optional category names below circles
- Horizontal scrolling on mobile
- Configurable number of circles (6, 8, or 10)

### 3. **Split Hero Section**
- **Left Side:** Vertical video with text overlay
  - "Shop the look" style messaging
  - Discount/promotion text
  - Supports MP4 video backgrounds
- **Right Side:** Product images (1-2 images)
  - Primary large image
  - Optional secondary image below

### 4. **Modular Addon Sections** 🚀
- Category Products Showcase
- Instagram Feed Integration  
- Featured Quote Section
- Blog Cards (Wide or Small grid)

## 🔌 **MODULAR ADDON ARCHITECTURE**

### What Is This?

This template is the **first to implement a standardized addon architecture** where:

1. **Template provides styling** via CSS classes
2. **Addons provide functionality** (data fetching, interactions)
3. **Automatic integration** - no template-specific code needed in addons

### How It Works

```
┌─────────────────────────────────────────────────┐
│  Template (Fashion Showcase)                    │
│  - Defines CSS classes: .addon-instagram-feed   │
│  - Provides visual styling                      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Addon (Instagram Feed - Sprint 12)             │
│  - Detects .addon-instagram-feed class          │
│  - Fetches Instagram data                       │
│  - Injects HTML into section                    │
│  - Template styling automatically applies       │
└─────────────────────────────────────────────────┘
```

### Standardized Addon Classes

This template defines these addon integration points:

#### **1. Category Products Showcase**
```css
.addon-category-showcase       /* Container */
.addon-section-header          /* Section header */
.addon-section-title           /* "Last ones!" title */
.addon-products-grid           /* Product grid (4 columns) */
.addon-product-card            /* Individual product */
.addon-product-image-wrapper   /* Image container */
.addon-product-badge           /* "SALE", "NEW" badges */
.addon-product-info            /* Name + price */
```

**Addon Responsibility:** Fetch products for selected category, render cards

#### **2. Instagram Feed**
```css
.addon-instagram-feed          /* Container */
.addon-instagram-header        /* "Social stories" header */
.addon-instagram-grid          /* Grid (3-5 columns, configurable) */
.addon-instagram-item          /* Single Instagram post */
.addon-instagram-overlay       /* Hover overlay with likes/comments */
```

**Addon Responsibility:** Connect to Instagram API, render posts

#### **3. Featured Quote**
```css
.addon-quote-section           /* Container */
.addon-quote-label             /* "INTERVIEW" label */
.addon-quote-text              /* Quote text (italic) */
```

**Addon Responsibility:** Pull quote from custom field, render

#### **4. Blog Cards**
```css
.addon-blog-cards              /* Container */
.addon-blog-grid-wide          /* Wide cards layout */
.addon-blog-grid-small         /* Small cards layout */
.addon-blog-card-wide          /* Full-width blog card */
.addon-blog-card-small         /* Grid blog card */
.addon-blog-badge              /* "NEW", "FEATURED" badges */
```

**Addon Responsibility:** Fetch blog posts, render cards based on style setting

### Benefits of This Architecture

✅ **Reusability** - Same addon works across multiple templates  
✅ **Flexibility** - Templates can style addons differently  
✅ **Separation of Concerns** - Templates = design, Addons = functionality  
✅ **Easy Integration** - Just add the CSS class, addon does the rest  
✅ **Future-Proof** - New templates can adopt these classes

### For Future Template Developers

When creating new templates, you can:
1. Include these standardized addon classes
2. Style them to match your template's aesthetic
3. Addons automatically work with your template

### For Future Addon Developers (Sprint 12)

When building addons, you should:
1. Look for standardized class names (`.addon-*`)
2. Inject your content into those containers
3. Use template's existing styles
4. Add addon-specific functionality only

## Custom Fields (10 Total)

### Category Circles (2 fields)
1. **Show Category Names** (`show_category_names`) - select: yes/no
2. **Number of Circles** (`category_circles_count`) - select: 6/8/10

### Split Hero (5 fields)
3. **Hero Video URL** (`hero_video_url`) - video_url
4. **Hero Video Text** (`hero_video_text`) - text (e.g., "Shop the look")
5. **Hero Discount** (`hero_video_discount`) - text (e.g., "50% off")
6. **Hero Image** (`hero_image_url`) - image_url (right side main)
7. **Hero Secondary Image** (`hero_image_alt_url`) - image_url (right side bottom)

### Addon Sections (3 fields)
8. **Blog Card Style** (`blog_card_style`) - select: small/wide
9. **Instagram Columns** (`instagram_columns`) - select: 3/4/5
10. **Featured Quote** (`quote_text`) - textarea (optional quote)

## Global CSS Variables Used

### Colors
- `--text-color` - Main text (#1a1a1a default)
- `--main-color` - Primary brand color (hovers, accents)
- `--secondary-color` - Secondary brand color
- `--accent-color` - Accent highlights
- `--background-color` - Page background (#ffffff)
- `--button-color` - Button colors

### Fonts
- `--body-font` - Main body text
- `--header-font` - Heading font

### Spacing
- `--border-radius` - Border radius for cards (default: 4px)
- `--spacing-scale` - Global spacing multiplier

## Page Sections

### 1. Header
- Logo/brand name
- Wide horizontal navigation menu
- Utility icons (search, account, cart)
- Sticky positioning with scroll effect

### 2. Circular Category Showcase
- 6-10 circular category images
- Gold/tan borders
- Optional category names
- Horizontal scrolling on mobile
- Hover lift effect

### 3. Split Hero
- **Left:** Vertical video with overlay text
- **Right:** 1-2 product images stacked
- Fully responsive (stacks on mobile)

### 4. Category Products Section (Addon)
- Section header with "View all" link
- 4-column product grid
- Sale badges, product cards
- Styled for addon integration

### 5. Instagram Feed (Addon)
- "@insta.official" handle display
- 3-5 column grid (configurable)
- Hover overlays with engagement stats
- Styled for addon integration

### 6. Featured Quote
- Centered quote with "INTERVIEW" label
- Light background section
- Optional (based on custom field)

### 7. Blog Section (Addon)
- **Wide Cards:** Full-width with large images
- **Small Cards:** 3-column grid
- Badges for "NEW" posts
- Styled for addon integration

### 8. Footer
- Multi-column layout
- Social media icons
- Newsletter, links, copyright

## Technical Details

### File Structure
```
/public/templates/fashion-showcase/
├── styles.css        # Complete responsive CSS (~1,600 lines)
├── schema.json       # 10 custom field definitions
├── preview.svg       # Template preview image
└── README.md         # This file
```

### CSS Architecture
- **BEM-inspired naming** for consistency
- **Light aesthetic** (#ffffff base, #f9f9f9 sections)
- **Modular addon classes** (`.addon-*` prefix)
- **Responsive grid system** (4→3→2→1 columns)
- **Sticky header** with scroll detection
- **No JavaScript required** (CSS-only, Basic tier)

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Features
- Pure CSS (no JavaScript overhead)
- Optimized grid layouts
- Efficient hover transitions
- Mobile-first responsive design

## Responsive Behavior

### Desktop (>1200px)
- 4-column product grids
- 4-column Instagram feed
- 3-column small blog cards
- Full navigation visible
- Split hero side-by-side

### Tablet (768px - 1200px)
- 3-column product grids
- 3-column Instagram feed
- 2-column small blog cards
- Condensed navigation
- Split hero stacks

### Mobile (<768px)
- 2-column product grids
- 2-column Instagram feed
- Single-column blog cards
- Circular categories scroll horizontally
- Mobile menu (requires addon)

### Small Mobile (<480px)
- Single-column layouts
- Smaller circular categories (75px)
- Optimized spacing

## Customization Tips

### Color Strategy
- Use **neutral main colors** (black, charcoal, navy)
- **Gold/tan accents** work well with the circular borders
- Keep backgrounds **light** for this template's aesthetic
- Use **bold accent colors** for sale badges and CTAs

### Content Strategy
- **High-quality lifestyle photography** for circles and hero
- **Vertical video** (9:16) works best for hero left side
- **Product photography** on clean backgrounds
- **Instagram-style imagery** for social proof

### Typography Recommendations
- **Modern Sans-Serif** (Inter, Montserrat, Work Sans)
- **Clean readability** for product info
- **Bold weights** for impact (600-700)
- **Uppercase** for labels and badges

## Integration with Future Addons

### When Sprint 12 Addons Are Built:

1. **Category Products Addon**
   - Detects `.addon-category-showcase`
   - Allows user to select category
   - Fetches products from that category
   - Renders into `.addon-products-grid`

2. **Instagram Feed Addon**
   - Detects `.addon-instagram-feed`
   - Connects to Instagram API
   - Renders posts into `.addon-instagram-grid`
   - Respects `instagram_columns` setting

3. **Blog Cards Addon**
   - Detects `.addon-blog-cards`
   - Fetches latest blog posts
   - Renders based on `blog_card_style` setting
   - Applies badges for new posts

### Template Works Without Addons
- All sections are styled and visible
- Placeholder content can be shown
- No broken layouts or missing features
- Addons enhance but don't break

## Use Cases

### ✅ Ideal For:

1. **Fashion Brands**
   - Clothing lines
   - Accessories
   - Lifestyle products

2. **Modern Retailers**
   - E-commerce focused
   - Instagram-driven brands
   - Social media presence

3. **Contemporary Artists**
   - Product-based art
   - Merchandise
   - Limited editions

4. **Lifestyle Brands**
   - Modern aesthetics
   - Clean presentation
   - Social proof important

### ❌ Not Ideal For:

1. **Traditional Artists** - Use Vintage Gallery instead
2. **Dark Themes** - Use Luxury Brand or Dark Mode Gallery
3. **Minimal Portfolios** - Use Modern Minimalist
4. **Video-Heavy Sites** - Use Slide Gallery or Parallax

## Accessibility Notes

- Semantic HTML structure
- Keyboard navigation supported
- ARIA labels for icons
- Sufficient color contrast
- Focus indicators on interactive elements

## Updates & Versioning

**Current Version:** 1.0.0

### Version History
- **1.0.0** (2026-02-07) - Initial release
  - First template with modular addon architecture
  - Circular category showcase
  - Split hero with video support
  - 4 standardized addon sections

### Future Enhancements
- Sprint 12 addons will activate functionality
- Mobile menu addon for navigation
- Video autoplay controls addon
- Enhanced Instagram integration

## Support

For issues or questions about this template:
1. Check the [Template-Specific Variables Documentation](../../docs/Sites/TEMPLATE_SPECIFIC_VARIABLES.md)
2. Review Sprint 12 addon documentation (when available)
3. Test addon integrations
4. Contact support

## License

Copyright © 2026 Artist Sites. All rights reserved.
