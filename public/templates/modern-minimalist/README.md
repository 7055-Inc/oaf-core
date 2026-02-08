# Modern Minimalist Template

**Version:** 1.0.0  
**Author:** Artist Sites  
**Tier Required:** Basic

## Overview

The Modern Minimalist template is designed for contemporary artists, photographers, and digital artists who want their artwork to take center stage. With clean lines, generous whitespace, and a minimal color palette, this template creates an elegant, distraction-free environment that lets your work speak for itself.

## Target Audience

- Contemporary artists
- Photographers
- Digital artists
- Creative professionals seeking a clean, modern aesthetic

## Design Philosophy

- **Simplicity First:** Zero unnecessary elements or decoration
- **Typography-Driven:** Beautiful, lightweight fonts with generous spacing
- **Focus on Artwork:** Minimal distractions, maximum impact
- **Responsive:** Looks stunning on all devices
- **Performance:** Lightweight and fast-loading

## Custom Fields

This template includes three template-specific customization fields:

### 1. Hero Section Tagline (`hero_tagline`)
- **Type:** Text input
- **Max Length:** 100 characters
- **Required:** No
- **Tier:** Basic
- **Description:** A short tagline displayed prominently in the hero section of your homepage. Use this to communicate your artistic vision or specialty in a concise way.
- **Example:** "Contemporary Art & Digital Illustrations"

### 2. Gallery Layout Style (`gallery_layout`)
- **Type:** Select dropdown
- **Options:**
  - **Masonry (Pinterest-style):** Dynamic grid with varying row heights, creates visual interest
  - **Regular Grid:** Clean, uniform grid with equal-sized cards
  - **Single Column Rows:** Full-width display, one artwork per row (ideal for horizontal pieces)
- **Default:** Regular Grid
- **Required:** No
- **Tier:** Basic
- **Description:** Choose how your artwork gallery is displayed. Each layout option creates a different viewing experience.

### 3. Display Product Prices (`show_prices`)
- **Type:** Select dropdown
- **Options:**
  - **Show Prices:** Display pricing on all products
  - **Hide Prices:** Hide all pricing (useful for portfolio-only sites or "contact for pricing" models)
- **Default:** Show Prices
- **Required:** No
- **Tier:** Basic
- **Description:** Control whether product prices are visible on your site.

## Global CSS Variables Used

This template fully supports all global customization variables:

### Colors
- `--text-color` - Main text color
- `--main-color` - Primary brand color (used for accents, links, buttons)
- `--secondary-color` - Secondary brand color (used for hover states)
- `--accent-color` - Accent color for special elements
- `--background-color` - Page background color
- `--button-color` - Button background color

### Fonts
- `--body-font` - Main body text font
- `--header-font` - Heading font
- `--h1-font` - H1-specific font override
- `--h2-font` - H2-specific font override
- `--h3-font` - H3-specific font override
- `--h4-font` - H4-specific font override

### Spacing
- `--border-radius` - Border radius for buttons, cards, etc.
- `--spacing-scale` - Global spacing multiplier (1 = default, 1.2 = 20% larger, etc.)

## Page Sections Styled

The template includes complete styling for all major page sections:

1. **Site Header** - Sticky navigation with minimal design
2. **Hero Section** - Large, impactful hero with title and optional tagline
3. **About/Bio Section** - Centered text layout for artist bio
4. **Product Grid** - Three layout options (masonry, grid, rows)
5. **Product Cards** - Clean product display with hover effects
6. **Articles/Blog** - Two-column blog post grid
7. **Footer** - Simple footer with links and social icons

## Customization Tips

### Color Palette Recommendations
For the cleanest minimalist look:
- Use **monochromatic** colors (shades of one color)
- Keep **high contrast** between text and background
- Use color sparingly - let one accent color pop

### Font Pairing Suggestions
- **Classic:** Serif headers + Sans-serif body (e.g., Playfair Display + Inter)
- **Modern:** Sans-serif headers + Sans-serif body (e.g., Montserrat + Open Sans)
- **Editorial:** Serif headers + Serif body (e.g., Cormorant + Lora)

### Layout Strategy
- **Grid Layout:** Best for similar-sized artworks, creates visual consistency
- **Masonry Layout:** Great for varied artwork dimensions, more dynamic feel
- **Rows Layout:** Ideal for large horizontal pieces or detailed work that needs space

### When to Hide Prices
Consider hiding prices if:
- You want to encourage contact before discussing pricing
- Prices vary significantly based on size/customization
- You're showcasing a portfolio without selling directly
- You want a pure gallery experience

## Technical Details

### File Structure
```
/public/templates/modern-minimalist/
├── styles.css        # Complete template CSS (~850 lines)
├── schema.json       # Template-specific field definitions
├── preview.jpg       # Template preview image
└── README.md         # This file
```

### CSS Architecture
- **BEM naming convention** for class names
- **Zero inline styles** - all styling in CSS file
- **Mobile-first responsive design**
- **Breakpoints:** 1024px, 768px, 480px
- **Print styles included** for portfolio printing

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Features
- CSS variables for dynamic styling (no JavaScript required for customization)
- Optimized animations with `transform` and `opacity`
- Efficient grid layouts using CSS Grid
- Lazy-loadable images (depends on implementation)

## Responsive Behavior

### Desktop (>1024px)
- 3-column product grid
- Full navigation visible
- Large hero text
- 2-column article grid

### Tablet (768px - 1024px)
- 2-column product grid
- Compressed navigation
- Medium hero text
- Single-column article grid

### Mobile (<768px)
- Single-column product grid
- Stacked navigation
- Smaller hero text
- Optimized spacing

## Updates & Versioning

**Current Version:** 1.0.0

### Version History
- **1.0.0** (2026-02-07) - Initial release

## Support

For issues or questions about this template:
1. Check the [Template-Specific Variables Documentation](../../docs/Sites/TEMPLATE_SPECIFIC_VARIABLES.md)
2. Review the [Site Customization Variables Guide](../../docs/Sites/SITE_CUSTOMIZATION_VARIABLES.md)
3. Contact support

## License

Copyright © 2026 Artist Sites. All rights reserved.
