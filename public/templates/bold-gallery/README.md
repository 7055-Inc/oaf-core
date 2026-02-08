# Bold Gallery Template

**Version:** 1.0.0  
**Author:** Artist Sites  
**Tier Required:** Basic

## Overview

The Bold Gallery template is designed for painters, illustrators, and visual artists who want to make a statement. With confident typography, vibrant gradients, bold colors, and a grid-focused layout, this template creates an energetic, professional showcase that commands attention.

## Target Audience

- Painters
- Illustrators
- Vibrant visual artists
- Creatives who want bold, colorful presentation
- Artists with strong visual brands

## Design Philosophy

- **Confident & Bold:** Large typography, vibrant colors, strong visual hierarchy
- **Grid-Focused:** Structured gallery layouts with clear organization
- **High Impact:** Hover effects, overlays, and dynamic interactions
- **Color-Forward:** Embrace gradients and vibrant color palettes
- **Professional:** Polished, modern design that takes your work seriously

## Custom Fields

This template includes three template-specific customization fields:

### 1. Featured Artwork Product ID (`featured_work_id`)
- **Type:** Text input
- **Max Length:** 20 characters
- **Required:** No
- **Tier:** Basic
- **Description:** Enter the product ID of artwork you want to feature prominently at the top of your gallery. This creates a hero-style featured section with a large image and detailed description.
- **Example:** "123" or "artwork-456"
- **Use Case:** Highlight your latest work, best-selling piece, or a special commission

### 2. Gallery Grid Columns (`grid_columns`)
- **Type:** Select dropdown
- **Options:**
  - **2 Columns (Large):** Fewer, larger images - perfect for detailed paintings or large-format work
  - **3 Columns (Medium):** Balanced grid - works for most artwork types
  - **4 Columns (Compact):** More compact, fits more artwork above the fold
- **Default:** 3 Columns
- **Required:** No
- **Tier:** Basic
- **Description:** Control the number of columns in your product gallery grid. This dynamically adjusts the layout to match your artistic style and the nature of your work.

### 3. Display Artist Bio Section (`show_artist_bio`)
- **Type:** Select dropdown
- **Options:**
  - **Show Bio:** Display the about/bio section
  - **Hide Bio:** Hide the about/bio section entirely
- **Default:** Show Bio
- **Required:** No
- **Tier:** Basic
- **Description:** Toggle the visibility of your artist bio section. Hide it if you want a purely visual, gallery-focused site, or show it to connect with visitors and share your story.

## Global CSS Variables Used

This template fully supports all global customization variables:

### Colors
- `--text-color` - Main text color
- `--main-color` - Primary brand color (used extensively in gradients, buttons, accents)
- `--secondary-color` - Secondary brand color (paired with main color in gradients)
- `--accent-color` - Accent color for special highlights
- `--background-color` - Page background color
- `--button-color` - Button background color

### Fonts
- `--body-font` - Main body text font
- `--header-font` - Heading font (bold, uppercase styling)
- `--h1-font` - H1-specific font override
- `--h2-font` - H2-specific font override
- `--h3-font` - H3-specific font override
- `--h4-font` - H4-specific font override

### Spacing
- `--border-radius` - Border radius for cards, buttons, images
- `--spacing-scale` - Global spacing multiplier

## Page Sections Styled

The template includes complete styling for all major page sections:

1. **Site Header** - Bold sticky header with thick colored border
2. **Hero Section** - Full-screen gradient hero with diagonal accent shape
3. **Featured Artwork** - Large showcase section for highlighted work (if featured_work_id is set)
4. **About/Bio Section** - Two-column layout with image and text (toggleable)
5. **Product Grid** - Configurable columns (2/3/4) with hover overlays
6. **Product Cards** - Bold cards with gradient overlays on hover
7. **Articles/Blog** - Two-column blog grid with large images
8. **Footer** - Vibrant gradient footer with multi-column layout

## Customization Tips

### Color Palette Recommendations
This template works best with bold, vibrant colors:
- **Complementary Colors:** Use opposite colors (e.g., blue + orange, purple + yellow)
- **Analogous Gradients:** Adjacent colors create smooth transitions (e.g., red > orange > yellow)
- **High Contrast:** Ensure text is readable against your colorful backgrounds
- **Embrace Vibrancy:** Don't be afraid of saturated colors - this template celebrates them!

### Font Pairing Suggestions
This template uses bold, uppercase styling:
- **Modern Sans:** Bold sans-serif works perfectly (e.g., Montserrat, Poppins, Raleway)
- **Display Fonts:** Dramatic display fonts for headers (e.g., Anton, Bebas Neue, Oswald)
- **Contrast Pairing:** Bold headers + clean body font (e.g., Impact + Roboto)

### Grid Layout Strategy
- **2 Columns:** Best for large paintings, detailed illustrations, landscape artworks
- **3 Columns:** Versatile, works for most artwork types and sizes
- **4 Columns:** Great for smaller works, prints, or large product catalogs

### Featured Artwork Strategy
Use the featured artwork to:
- Showcase your latest creation
- Highlight a commission or special piece
- Feature seasonal or thematic work
- Promote a limited edition or sale item

## Technical Details

### File Structure
```
/public/templates/bold-gallery/
├── styles.css        # Complete template CSS (~1100 lines)
├── schema.json       # Template-specific field definitions
├── preview.jpg       # Template preview image
└── README.md         # This file
```

### CSS Architecture
- **BEM naming convention** for class names
- **Zero inline styles** - all styling in CSS file
- **Mobile-first responsive design**
- **Breakpoints:** 1200px, 768px, 480px
- **Print styles included** for portfolio printing

### Special Features
- **Gradient Backgrounds:** Hero and footer use CSS gradients
- **Hover Overlays:** Product cards show gradient overlays on hover
- **Dynamic Grid:** Grid columns controlled by template variable
- **Conditional Display:** Bio section can be toggled on/off
- **Bold Typography:** Uppercase, heavy fonts for maximum impact

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Features
- CSS-only animations (GPU-accelerated)
- CSS Grid for efficient layouts
- No JavaScript required for customization
- Optimized hover effects with `transform` and `opacity`

## Responsive Behavior

### Desktop (>1200px)
- Full grid columns as configured (2/3/4)
- Three-column footer
- Large hero text
- Two-column article grid
- Two-column featured artwork layout

### Tablet (768px - 1200px)
- Force 2-column product grid (regardless of setting)
- Two-column footer
- Single-column article grid
- Single-column featured artwork
- Medium-sized hero text

### Mobile (<768px)
- Single-column product grid
- Single-column footer
- Stacked navigation
- Smaller hero text
- Optimized padding/spacing

## Visual Identity

This template creates a **bold, confident, energetic** brand identity:

✅ **Best For:**
- Artists with vibrant, colorful work
- Illustrators with bold styles
- Painters with dramatic compositions
- Creatives who want to stand out
- Artists with strong personal brands

❌ **Not Ideal For:**
- Minimalist or monochromatic artists (use Modern Minimalist)
- Photography portfolios seeking subtlety
- Classical or traditional art requiring quiet elegance
- Artists who prefer understated presentation

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
