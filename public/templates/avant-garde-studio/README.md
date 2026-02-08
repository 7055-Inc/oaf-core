# Avant-Garde Studio Template

**Version:** 1.0.0  
**Author:** Artist Sites  
**Tier Required:** Professional

## Overview

Avant-Garde Studio is an unconventional, fashion-forward template inspired by high-end runway presentations. With its asymmetric layout, side navigation, full-page hero slideshow, and fluid design elements, this template breaks traditional web design conventions to create a memorable, avant-garde experience.

## 🎯 Target Audience

- High-fashion brands
- Avant-garde designers
- Runway collections
- Contemporary fashion houses
- Editorial fashion presentations
- Experimental artists

## 🌟 Revolutionary Design Features

### 1. **Unconventional Three-Column Layout**
- **Left:** Fixed side menu (overlays hero)
- **Center:** Scrolling content (off-center illusion)
- **Right:** Vertical footer sidebar

### 2. **Full-Page Hero Slideshow**
- Auto-advancing slideshow (5s intervals)
- Multiple slide support with transitions
- Arrow controls + pagination
- Keyboard navigation (left/right arrows)
- Pause on hover

### 3. **Side Navigation Menu**
- Overlays hero background
- Transparent default, white on hover
- Social media icons at bottom
- Smooth hover transitions

### 4. **Vertical Side Footer**
- Fixed on right edge
- Vertical text orientation
- Icon navigation
- Can switch to traditional bottom footer

### 5. **Side-Clipped Note/Tab**
- Floating yellow tab (customizable color)
- Rotated text on left edge
- Hover slide effect
- Perfect for announcements

### 6. **Circular Category Buttons**
- Instagram-style circular images
- "New in", "Sale", "Featured" sections
- Hover animations
- Optional (can disable)

### 7. **Fluid, Asymmetric Layout**
- Fixed sidebars, scrolling center
- Off-center content illusion
- Unconventional spacing
- Unpredictable yet fluid

## Custom Fields (14 Total)

### Hero Slideshow (8 fields)
1. **Slide 1 Image** (`hero_slide_1_image`) - image_url
2. **Slide 1 Title** (`hero_slide_1_title`) - text
3. **Slide 1 Button** (`hero_slide_1_cta`) - text
4. **Slide 2 Image** (`hero_slide_2_image`) - image_url
5. **Slide 2 Title** (`hero_slide_2_title`) - text
6. **Slide 2 Subtitle** (`hero_slide_2_subtitle`) - text
7. **Slide 2 Primary Button** (`hero_slide_2_cta_primary`) - text
8. **Slide 2 Secondary Button** (`hero_slide_2_cta_secondary`) - text

### Layout Customization (4 fields)
9. **Menu Hover Color** (`menu_hover_color`) - color
10. **Side Note Text** (`side_note_text`) - text
11. **Side Note Color** (`side_note_color`) - color
12. **Footer Position** (`footer_position`) - select: right/bottom

### Content (2 fields)
13. **Show Category Circles** (`show_category_circles`) - select: yes/no
14. **Content Tagline** (`content_tagline`) - textarea

## Global CSS Variables Used

### Colors
- `--text-color` - Main text color
- `--main-color` - Primary brand color
- `--secondary-color` - Secondary brand color
- `--accent-color` - Accent highlights
- `--background-color` - Page background
- `--button-color` - Button colors

### Fonts
- `--body-font` - Main body text
- `--header-font` - Heading font

### Spacing
- `--border-radius` - Border radius for elements
- `--spacing-scale` - Global spacing multiplier

## 🚀 NEW ADDONS REQUIRED (Sprint 12)

This template introduces several advanced addon concepts:

### **1. Hero Slideshow Addon** 🎬 **[HIGH PRIORITY]**
**Purpose:** Full-page hero slideshow with video/image support

**Features:**
- Support for images AND videos
- Auto-advance with configurable timing
- Fade transitions
- Arrow navigation + dots
- Keyboard controls
- Pause on hover
- Multiple slides per page

**Reusability:** Can be used on main site homepage!

**Integration:** Detects `.hero-slideshow` class, manages slides

---

### **2. Side Clipped Note Addon** 📌 **[NEW CONCEPT]**
**Purpose:** Floating tab/note on side of page

**Features:**
- Rotated tab on left/right edge
- Customizable text and color
- Hover slide-in effect
- Click action (scroll, modal, link)
- Perfect for announcements, countdowns, promotions

**Integration:** Detects `.side-clipped-note` class

---

### **3. Video Product Carousel Addon** 🎥 **[ADVANCED - REQUIRES SYSTEM BUILDOUT]**
**Purpose:** Product carousel that only shows products with videos, displays video instead of image

**System Requirements:**
- **Database:** Add `product_video_url` field to products table
- **Upload:** Video upload functionality in product editor
- **Storage:** Video file storage solution
- **API:** Endpoint to fetch products with videos

**Features:**
- Filters products: only those with videos
- Displays video preview instead of image
- Autoplay on hover (muted)
- Click to play with sound
- Mobile-optimized (poster image fallback)

**Integration:** Detects `.addon-video-carousel` class, fetches video products

**Complexity:** **HIGH** - requires backend work

---

### **4. Social Media Sidebar Addon** 📱 **[MODERATE]**
**Purpose:** Social media icons in sidebar/footer areas

**Features:**
- Configurable social platforms
- Icon positioning (sidebar, footer, floating)
- Hover effects
- Share functionality
- Follow links

**Integration:** Detects `.sidebar-social`, `.footer-social` classes

---

### **5. Fixed Sidebar Layout Addon** 🔒 **[LAYOUT ENHANCEMENT]**
**Purpose:** Keeps sidebars fixed while center content scrolls

**Features:**
- JavaScript-enhanced fixed positioning
- Smooth scroll sync
- Mobile breakpoint handling
- Off-center content illusion

**Integration:** Applied automatically to templates with `.sidebar-menu` + `.sidebar-footer`

---

### **6. Circular Category Showcase Addon** ⭕ **[MODERATE]**
**Purpose:** Instagram-style circular category buttons

**Features:**
- Fetches top categories
- Circular image cropping
- Hover animations
- Category filtering on click
- Configurable count (3-10 circles)

**Integration:** Detects `.category-circles-section` class

## Modular Addon Support

This template includes standardized addon integration points:

### **Standard Addon Classes:**
- `.addon-products-grid` - Product showcase (3-column)
- `.addon-blog-cards` - Blog cards (2-column)

### **New Addon Classes (Introduced by this template):**
- `.hero-slideshow` - Full-page slideshow
- `.side-clipped-note` - Floating side tab
- `.addon-video-carousel` - Video products
- `.sidebar-social` - Social media icons
- `.category-circles-section` - Circular categories

## Page Structure

### 1. **Side Menu (Left) - Fixed**
- Brand logo
- Navigation links
- Utility links (currency, language)
- Social media icons
- Transparent, reveals white on hover

### 2. **Hero Slideshow - Full Page**
- Multiple slides with images/videos
- Title + subtitle + CTA buttons
- Auto-advance (5s)
- Navigation arrows
- Pagination indicator

### 3. **Side Clipped Note - Floating**
- Rotated tab on left edge
- Yellow background (customizable)
- Announcement/promo text

### 4. **Main Content - Scrolling**
- Circular category buttons
- Content tagline section
- Product grid (addon)
- Video carousel (addon)
- Blog cards (addon)
- Quasi-footer (bottom categories/menu)

### 5. **Side Footer (Right) - Fixed**
- Vertical orientation
- Text rotated 90°
- Icon navigation
- Dark background

## Technical Details

### File Structure
```
/public/templates/avant-garde-studio/
├── styles.css        # Complex asymmetric layout (~1,100 lines)
├── script.js         # Slideshow + interactions (~280 lines)
├── schema.json       # 14 custom field definitions
├── preview.svg       # Template preview image
└── README.md         # This file
```

### CSS Architecture
- **Three-column grid** layout (sidebar | content | footer)
- **Fixed positioning** for sidebars
- **CSS Grid** for main structure
- **Flexbox** for sidebar internals
- **Responsive breakpoints** (1024px, 768px)
- **Mobile fallback** to traditional layout

### JavaScript Features
- **Hero slideshow** auto-advance
- **Arrow navigation** (prev/next)
- **Keyboard shortcuts** (←/→ arrows)
- **Pause on hover**
- **Smooth scrolling**
- **Scroll animations** (fade-in)
- **Category interactions**

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

**Requires JavaScript enabled**

### Performance
- Deferred JS loading
- GPU-accelerated animations (transforms)
- Intersection Observer for scroll animations
- Debounced resize handlers
- Efficient slideshow transitions

## Responsive Behavior

### Desktop (>1024px)
- Three-column layout active
- Side menu + side footer visible
- 3-column product grid
- All unconventional features active

### Tablet (768px - 1024px)
- Narrower sidebars (220px/60px)
- 2-column product grid
- Maintains three-column structure
- Slightly compressed

### Mobile (<768px)
- **Switches to traditional layout**
- Side menu becomes top horizontal menu
- Side footer hidden, traditional footer shown
- Single-column grids
- Hero slideshow shorter (70vh)
- Side clipped note hidden

## Customization Tips

### Color Strategy
- **High contrast** recommended for readability
- **Bold accent colors** for side note tab
- **White or light menu hover** background for clarity
- **Dark footer sidebar** creates drama

### Content Strategy
- **Dramatic hero images** - runway photography, fashion editorial
- **Bold, short headlines** - all caps works well
- **Limited text** - let images speak
- **High-quality videos** for video carousel
- **Curated categories** - 3-5 circles max

### Typography Recommendations
- **Modern Sans-Serif** (Helvetica, Futura, Avenir)
- **Bold, geometric fonts** for impact
- **All caps** for labels and navigation
- **High letter-spacing** for sophistication

## Use Cases

### ✅ Ideal For:

1. **High-Fashion Brands**
   - Runway collections
   - Avant-garde designers
   - Fashion week presentations

2. **Editorial Fashion**
   - Magazine-style presentations
   - Lookbook showcases
   - Seasonal collections

3. **Experimental Artists**
   - Unconventional work
   - Installation art
   - Conceptual projects

4. **Premium Brands**
   - Luxury positioning
   - Exclusive releases
   - Limited editions

### ❌ Not Ideal For:

1. **Traditional Artists** - Use Vintage Gallery
2. **Conservative Brands** - Use Modern Minimalist
3. **Text-Heavy Sites** - Layout doesn't support long content
4. **E-commerce Focus** - Better templates for product-heavy sites

## Accessibility Notes

- Keyboard navigation for slideshow (←/→)
- ARIA labels for controls
- Semantic HTML structure
- Focus indicators
- Sufficient color contrast
- Alt text for images

**Note:** Unconventional layout may pose challenges for screen readers. Consider providing alternative navigation.

## Addon Integration Strategy

### When Sprint 12 Addons Are Built:

1. **Hero Slideshow Addon**
   - Detects `.hero-slideshow`
   - Adds video support
   - Enhanced transitions
   - Configurable timing

2. **Side Clipped Note Addon**
   - Manages note content
   - Countdown timer support
   - Click actions
   - Positioning options

3. **Video Product Carousel Addon**
   - Queries products with videos
   - Renders carousel
   - Video player controls
   - Mobile optimization

4. **Social Media Sidebar Addon**
   - Populates social icons
   - Share functionality
   - Follow links

### Template Works Without Addons
- Hero slideshow uses CSS only (no video)
- Side note is static
- Video carousel shows regular products
- Social icons are placeholders

## Updates & Versioning

**Current Version:** 1.0.0

### Version History
- **1.0.0** (2026-02-07) - Initial release
  - Unconventional three-column layout
  - Hero slideshow with JavaScript
  - Side navigation + side footer
  - Introduces 6 new addon concepts

### Future Enhancements
- Video slideshow support (addon)
- Enhanced sidebar animations
- Mega menu integration
- More slide transition effects

## Support

For issues or questions:
1. Check addon documentation (Sprint 12)
2. Review template-specific variables docs
3. Test with recommended addons
4. Contact support

## License

Copyright © 2026 Artist Sites. All rights reserved.
