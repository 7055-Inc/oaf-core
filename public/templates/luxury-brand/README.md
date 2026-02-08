# Luxury Brand Template

**Version:** 1.0.0  
**Author:** Artist Sites  
**Tier Required:** Professional

## Overview

Luxury Brand is a premium dark-themed template inspired by modern e-commerce and high-end brand sites. With sophisticated dark styling, multiple hero sections, and support for video backgrounds, this template creates a luxurious, professional presentation perfect for premium artists and galleries.

## Target Audience

- High-end artists and galleries
- Luxury brands
- Premium product showcases
- Fashion-forward creatives
- Artists selling high-value work

## Design Philosophy

- **Dark & Sophisticated:** Premium dark theme with high contrast
- **Modern Commerce:** Inspired by luxury e-commerce sites
- **Video Support:** Full video background sections
- **Multi-Section Layout:** Hero → Products → Categories → Video → Blog → Footer
- **High Impact:** Bold typography, large images, dramatic styling

## Key Features

### ✨ Premium Design Elements
- **Dark Theme** - Sophisticated black background with white text
- **Transparent Header** - Glass-morphism header that becomes solid on scroll
- **Full-Screen Hero** - Large background image with overlay text
- **Video Hero Section** - Full-width video background with dual CTAs
- **Category Grid** - Large image-based category blocks
- **Blog Grid** - 3-column article layout with featured images
- **Advanced Footer** - Multi-column with social icons

### 🎯 JavaScript Features
- **Header Scroll Transitions** - Transparent to solid on scroll
- **Back-to-Top Button** - Floating button appears after scrolling
- **Smooth Scroll** - Anchor link animations
- **Viewport Animations** - Fade-in effects for cards
- **Category Interactions** - Click handlers for category navigation

### 🔌 Recommended Addons (Future Integration)

This template is designed to work **standalone** but reaches its **full potential** with these addons:

1. **Announcement Bar Addon** 🎯 **HIGHLY RECOMMENDED**
   - Adds top banner with countdown timer
   - "WELCOME TO OUR STORE" + "ENDS IN 22D | 22H | 55M | 45S"
   - Dismissible with localStorage persistence

2. **Product Slider Addon** 🎯 **HIGHLY RECOMMENDED**
   - Transforms product grid into horizontal carousel
   - "Just arrived" section becomes slideable
   - Arrow navigation + touch swipe support

3. **Video Background Addon**
   - Enhances video hero section with auto-play video
   - Muted playback with poster fallback
   - Mobile optimization

4. **Mega Menu Addon**
   - Multi-level dropdown navigation
   - Accordion mobile menu
   - Perfect for complex navigation structures

5. **Menu Icons Addon**
   - Add icons to navigation items
   - Enhances visual navigation

6. **Back-to-Top Button Addon**
   - Enhanced version with more options
   - (Basic version included in template)

**Note:** Template functions perfectly without addons. Addons enhance the experience but are optional.

## Custom Fields (15 Total)

### Hero Section (5 fields)
1. **Hero Label Text** (`hero_label`) - Small text above title
2. **Hero Main Title** (`hero_title`) - Main heading
3. **Hero Button Text** (`hero_button_text`) - CTA button text
4. **Hero Button URL** (`hero_button_url`) - Button link
5. **Hero Background Image** (`hero_background_image`) - Full-screen background

### Products Section (1 field)
6. **Products Section Title** (`products_section_title`) - "Just arrived" or custom

### Video Hero Section (7 fields)
7. **Video Section Tagline** (`video_section_tagline`) - Small text above title
8. **Video Section Title** (`video_section_title`) - Main video section heading
9. **Video Section Background** (`video_section_url`) - Video file URL
10. **Video Primary Button** (`video_button_primary_text`) - First button text
11. **Primary Button URL** (`video_button_primary_url`) - First button link
12. **Video Secondary Button** (`video_button_secondary_text`) - Second button text
13. **Secondary Button URL** (`video_button_secondary_url`) - Second button link

### Blog & Footer (2 fields)
14. **Blog Section Title** (`blog_section_title`) - Blog/articles heading
15. **Footer Description** (`footer_description`) - Brand description in footer

## Global CSS Variables Used

This template fully supports all global customization variables:

### Colors
- `--text-color` - Main text color (used for light sections)
- `--main-color` - Primary brand color (accents, hovers)
- `--secondary-color` - Secondary brand color
- `--accent-color` - Accent highlights
- `--background-color` - Light section backgrounds
- `--button-color` - Button colors

**Note:** Template has dark base (#0a0a0a) but uses variables for accents and light sections.

### Fonts
- `--body-font` - Main body text font
- `--header-font` - Heading font
- `--h1-font` through `--h4-font` - Specific heading overrides

### Spacing
- `--border-radius` - Border radius for cards, buttons (default: 12px)
- `--spacing-scale` - Global spacing multiplier

## Page Sections

### 1. Announcement Bar (Addon Placeholder)
- Top banner for messages and countdown
- **Requires:** Announcement Bar Addon

### 2. Header
- Fixed position with transparency effect
- Logo/brand name
- Navigation menu
- Icons: Search, Account, Cart (placeholders)
- Country selector placeholder

### 3. Hero Section
- Full-screen background image
- Label + Title + Button
- Dark overlay for text readability

### 4. Products Gallery
- Grid layout (4 columns desktop)
- Styled for slider addon compatibility
- "VIEW ALL" navigation header
- Light background (#f5f5f5)

### 5. Category Grid
- Large image-based category blocks
- First item spans 2x2 for emphasis
- Text overlay with category name
- Hover effects

### 6. Video Hero
- Full-width video background section
- Tagline + Title
- Dual CTA buttons (primary + secondary)
- Dark overlay

### 7. Blog/Articles Grid
- 3-column layout
- Large featured images (300px height)
- Title + meta + excerpt
- Dark cards on dark background

### 8. Advanced Footer
- Multi-column layout (4 columns)
- Brand column with logo + description
- Social media icons
- Links columns
- Copyright + powered by

## Technical Details

### File Structure
```
/public/templates/luxury-brand/
├── styles.css        # Complete template CSS (~1100 lines)
├── script.js         # JavaScript for interactions (~250 lines)
├── schema.json       # 15 custom field definitions
├── preview.jpg       # Template preview image
└── README.md         # This file
```

### JavaScript Features
- Header transparency transitions
- Back-to-top button with fade-in
- Smooth scroll for anchor links
- Viewport-based fade animations
- Category click handling
- Debounced resize handling

### CSS Architecture
- **BEM-inspired naming** for class names
- **Dark base theme** (#0a0a0a background, white text)
- **Light section contrasts** (#f5f5f5 for products)
- **Responsive grid system** (4→3→2→1 columns)
- **Glass-morphism effects** (backdrop-filter)
- **GPU-accelerated animations**

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Requires JavaScript enabled**

### Performance Features
- Deferred JavaScript loading
- CSS transforms (GPU accelerated)
- IntersectionObserver for animations
- Passive scroll listeners
- Debounced event handlers

## Responsive Behavior

### Desktop (>1200px)
- 4-column product grid
- 4-column category grid (first item 2x2)
- 3-column blog grid
- 4-column footer
- Full navigation visible

### Tablet (768px - 1200px)
- 3-column product grid
- 2-column category grid
- 3-column blog grid
- 2-column footer
- Condensed navigation

### Mobile (<768px)
- 2-column product grid
- 1-column category grid
- 1-column blog grid
- 1-column footer
- Mobile menu (requires addon)

### Small Mobile (<480px)
- 1-column product grid
- Single-column layouts throughout
- Stacked buttons
- Optimized spacing

## Customization Tips

### Color Strategy
Since this is a dark-themed template:
- **Use bright accent colors** for the `--main-color` (teal, cyan, neon colors work great)
- **High contrast** ensures readability
- **White or light colors** for text on dark backgrounds
- **Avoid dark accent colors** - they'll disappear on black background

### Content Strategy
- **Strong Hero Image** - High-quality, dramatic photography
- **Video Section** - Keep videos under 10MB, use poster image fallback
- **Category Images** - Bold, clear images with strong visual identity
- **Product Photography** - Clean, well-lit shots on neutral backgrounds

### Typography Recommendations
- **Modern Sans-Serif** works best (Inter, Poppins, Montserrat)
- **Bold weights** for impact (700-900)
- **Uppercase for labels** creates luxury feel
- **Lowercase logo** for modern brand aesthetic (like "release")

## Modular Addon Support

**Updated:** This template has been refactored to use standardized addon integration classes.

### Addon Sections Included:

1. **Category Products Showcase** (`.addon-category-showcase`)
   - Backward compatible with `.productsGrid`
   - Support for Product Slider addon via `.slider-enabled` class
   - 4-column grid (responsive)

2. **Blog Cards** (`.addon-blog-cards`)
   - Backward compatible with `.articles-section`
   - 3-column dark-themed cards
   - White badges on dark background

### Legacy Support

Template maintains backward compatibility:
- Original class names still work (`.productsGrid`, `.articles-section`)
- New addon class names added alongside (`.addon-products-grid`, `.addon-blog-cards`)
- Existing sites won't break with this update

### Product Slider Integration
When Product Slider addon is installed:
```css
.addon-products-grid.slider-enabled,
.productsGrid.slider-enabled {
  display: flex;
  overflow-x: auto;
  /* Template provides styling for both class patterns */
}
```

### Announcement Bar Integration
Template includes `.announcement-bar` styling:
- Addon controls content and timer
- Template provides visual design
- Seamless integration (Future Sprint 12 addon)

### Video Background Integration
Template provides styling for `.video-background`:
- Addon handles video playback (Future Sprint 12 addon)
- Template positions and styles
- Mobile fallback support

## Use Cases

### ✅ Ideal For:

1. **Premium Art Sales**
   - High-value artwork
   - Limited editions
   - Luxury collectibles

2. **Gallery Representation**
   - Professional galleries
   - Curated collections
   - Exhibition showcases

3. **Brand-Focused Artists**
   - Strong visual identity
   - Fashion/lifestyle art
   - Commercial artists

4. **Modern Presentations**
   - Contemporary work
   - Digital art
   - Photography portfolios

### ❌ Not Ideal For:

1. **Traditional Artists** - Use Vintage Gallery instead
2. **Minimal Aesthetics** - Use Modern Minimalist instead
3. **Light Theme Preference** - Use other templates
4. **Simple Portfolios** - Use Portfolio Grid or Classic Gallery

## Accessibility Notes

- Ensure sufficient contrast (white text on dark backgrounds)
- Respects `prefers-reduced-motion` for animations
- Keyboard navigation supported
- Screen reader friendly with semantic HTML
- ARIA labels should be added for icons

## Updates & Versioning

**Current Version:** 1.0.0

### Version History
- **1.0.0** (2026-02-07) - Initial release

### Planned Enhancements (via Addons)
- Announcement bar with countdown
- Product horizontal slider
- Mega menu navigation
- Menu icons
- Enhanced video controls

## Support

For issues or questions about this template:
1. Check the [Template-Specific Variables Documentation](../../docs/Sites/TEMPLATE_SPECIFIC_VARIABLES.md)
2. Review addon documentation (when available)
3. Test with recommended addons for full experience
4. Contact support

## License

Copyright © 2026 Artist Sites. All rights reserved.
