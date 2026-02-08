# Slide Gallery Template

**Version:** 1.0.0  
**Author:** Artist Sites  
**Tier Required:** Professional (Premium)

## Overview

The Slide Gallery template is a premium, interactive single-page design inspired by classic Flash-era websites. It transforms your artist site into an immersive, slide-based experience where each section smoothly transitions horizontally, creating a memorable and engaging portfolio presentation.

## Target Audience

- Contemporary digital artists
- Creative professionals seeking unique presentation
- Artists wanting an immersive, story-driven portfolio
- Photographers with sequential narrative work
- Designers and illustrators with strong visual brands

## Design Philosophy

- **Immersive Experience:** Full-screen slides that focus visitor attention
- **Smooth Transitions:** Fluid horizontal animations between sections
- **Interactive Navigation:** Multiple ways to explore (menu, dots, keyboard)
- **Modern Flash Feel:** Nostalgic yet contemporary interactive design
- **Premium Quality:** Advanced interactions for professional tier

## Key Features

### ✨ Interactive Slide System
- **Horizontal Slide Navigation** - Smooth left/right transitions between sections
- **Navigation Dots** - Visual indicator on the right side showing current position
- **Keyboard Support** - Arrow keys, Page Up/Down, Home/End navigation
- **URL Hash Support** - Direct links to specific slides (`#gallery`, `#about`)
- **Auto-Generated Menu** - Sections automatically populate navigation

### 🎨 Customizable Hero Landing
- Full-screen hero section with gradient background
- Custom title and description text
- Optional featured image
- Optional call-to-action button
- Customizable background color

### 📱 Mobile Responsive
- **Stack Mode** (default): Traditional vertical scroll on mobile
- **Slide Mode** (optional): Maintains horizontal slides on mobile
- Adapts navigation for touch devices

### ⚡ Performance Optimized
- CSS-based animations (GPU accelerated)
- Deferred JavaScript loading
- Smooth 60fps transitions
- Efficient DOM manipulation

## Custom Fields

This template includes **8 template-specific customization fields**:

### 1. Hero Section Title (`hero_title`)
- **Type:** Text input
- **Max Length:** 100 characters
- **Required:** No
- **Tier:** Professional
- **Description:** Main title displayed on your landing hero section
- **Example:** "Welcome to My Gallery" or "John Doe - Artist"

### 2. Hero Section Description (`hero_text`)
- **Type:** Textarea
- **Max Length:** 500 characters
- **Required:** No
- **Tier:** Professional
- **Description:** Descriptive text displayed below the hero title
- **Example:** "Explore my collection of contemporary artworks spanning painting, sculpture, and digital media."

### 3. Hero Button Text (`hero_button_text`)
- **Type:** Text input
- **Max Length:** 30 characters
- **Required:** No
- **Tier:** Professional
- **Description:** Text for optional CTA button (leave empty to hide button)
- **Example:** "View Gallery", "Explore", "Enter"

### 4. Hero Button URL (`hero_button_url`)
- **Type:** Text input
- **Max Length:** 200 characters
- **Required:** No
- **Tier:** Professional
- **Description:** URL or anchor for the button
- **Examples:** 
  - `#gallery` (navigates to gallery slide)
  - `/shop` (internal page)
  - `https://external-site.com` (external URL)

### 5. Hero Background Color (`hero_background_color`)
- **Type:** Color picker
- **Default:** `#667eea` (blue-purple)
- **Required:** No
- **Tier:** Professional
- **Description:** Background color for hero section (creates gradient with secondary color)
- **Tip:** Choose colors that contrast well with white text

### 6. Hero Focus Image URL (`hero_focus_image`)
- **Type:** Image URL input
- **Required:** No
- **Tier:** Professional
- **Description:** Main hero image displayed prominently
- **Recommended Size:** 1200x800px or larger
- **Format:** JPEG or PNG
- **Example:** `https://yourdomain.com/images/hero-artwork.jpg`

### 7. Slide Transition Speed (`transition_speed`)
- **Type:** Select dropdown
- **Options:**
  - **Fast (0.3s):** Snappy, quick transitions
  - **Medium (0.5s):** Balanced, smooth transitions (default)
  - **Slow (0.8s):** Cinematic, deliberate transitions
- **Default:** Medium
- **Required:** No
- **Tier:** Professional
- **Description:** Controls the speed of slide animations

### 8. Mobile Layout Behavior (`mobile_behavior`)
- **Type:** Select dropdown
- **Options:**
  - **Stack Vertically:** Traditional vertical scroll on mobile (recommended)
  - **Keep Slide Navigation:** Maintains horizontal slides on mobile
- **Default:** Stack Vertically
- **Required:** No
- **Tier:** Professional
- **Description:** How the template behaves on mobile devices

## Global CSS Variables Used

This template fully supports all global customization variables:

### Colors
- `--text-color` - Main text color
- `--main-color` - Primary brand color (navigation accents, dots)
- `--secondary-color` - Secondary brand color (gradient pairs with hero background)
- `--accent-color` - Accent color for special highlights
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
- `--border-radius` - Border radius for cards, buttons, images
- `--spacing-scale` - Global spacing multiplier

## How It Works

### Architecture

1. **Hero Landing Page** - The first slide, customized via template fields
2. **Dynamic Content Slides** - Auto-generated from your articles/pages
3. **Slide Container** - JavaScript creates horizontal layout
4. **Navigation System** - Menu items trigger slide transitions

### Content Management

The template automatically converts your site structure into slides:

- **Home Slide** → Hero section (customized via template fields)
- **About Slide** → About/bio section (if you have one)
- **Gallery Slide** → Products gallery (your artworks)
- **Article Slides** → Any articles/pages you create (menu type)

**To add new slides:**
1. Create a new article or page in your dashboard
2. Set it as a "menu item"
3. The template automatically adds it to navigation
4. Clicking the menu item slides to that content

### Navigation Methods

Users can navigate your slides in multiple ways:

1. **Header Menu** - Click navigation links in the header
2. **Navigation Dots** - Click dots on the right side of screen
3. **Keyboard** - Arrow keys, Page Up/Down, Home/End
4. **Direct Links** - URL hashes like `yoursite.com#gallery`

## Technical Details

### File Structure
```
/public/templates/slide-gallery/
├── styles.css        # Complete template CSS (~950 lines)
├── script.js         # Slide interaction JavaScript (~400 lines)
├── schema.json       # Template-specific field definitions
├── preview.jpg       # Template preview image
└── README.md         # This file
```

### JavaScript Features
- **Automatic initialization** on page load
- **Responsive behavior** detection and handling
- **Hash routing** for deep linking
- **Keyboard navigation** support
- **Smooth animations** with cubic-bezier easing
- **Event delegation** for efficient performance
- **Debounced resize** handling

### CSS Architecture
- **BEM naming convention** for class names
- **Zero inline styles** - all styling in CSS file
- **Mobile-first responsive design**
- **Breakpoints:** 1024px, 768px, 480px
- **GPU-accelerated animations** (transform, opacity)
- **Accessibility:** Respects prefers-reduced-motion
- **Print styles included** for portfolio printing

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Requires JavaScript enabled** - This is a JS-enhanced template

### Performance Features
- Deferred JavaScript loading (non-blocking)
- CSS transitions (GPU accelerated)
- Efficient DOM queries and caching
- Debounced event handlers
- Minimal reflows and repaints

## Responsive Behavior

### Desktop (>768px)
- Full horizontal slide system active
- Navigation dots visible on right
- Keyboard navigation enabled
- Smooth slide transitions
- 3-column product grid

### Tablet (768px - 1024px)
- Slide system remains active
- 2-column product grid
- Adjusted spacing and font sizes
- Touch-friendly navigation

### Mobile (<768px)

**Stack Mode** (default):
- Reverts to traditional vertical scroll
- No slide transitions
- Navigation dots hidden
- Better for touch navigation
- Single-column product grid

**Slide Mode** (optional):
- Maintains horizontal slides
- Touch swipe enabled
- Smaller navigation elements
- Optimized for mobile screens

## Use Cases & Best Practices

### ✅ Ideal For:

1. **Portfolio Presentations**
   - Sequential artwork showcases
   - Project-based portfolios
   - Story-driven presentations

2. **Immersive Galleries**
   - Photography collections
   - Digital art showcases
   - Exhibition-style displays

3. **Brand-Focused Sites**
   - Strong visual identity
   - Curated content
   - Limited but impactful sections

4. **Premium Experiences**
   - High-end artists
   - Gallery representation
   - Professional presentation

### ❌ Not Ideal For:

1. **Content-Heavy Sites** - Sites with many pages/sections
2. **E-commerce Focus** - Sites prioritizing product browsing
3. **Mobile-First Audiences** - Primarily mobile visitors (use stack mode)
4. **Quick Navigation Needs** - Users needing rapid section access
5. **Accessibility Priority** - Users requiring screen readers (vertical scroll better)

## Customization Tips

### Color Strategy
- **Hero Background:** Choose bold, saturated colors that represent your brand
- **Gradient Pairing:** Hero + Secondary color creates automatic gradient
- **Contrast:** Ensure white text is readable on hero background
- **Consistency:** Use main color for navigation accents and dots

### Content Strategy
- **Limit Slides:** 4-6 slides is optimal (Home, About, Gallery, 1-3 pages)
- **Strong Hero:** Make your landing slide compelling
- **Clear CTA:** Use hero button to guide visitors to main content
- **Focused Sections:** Each slide should have one clear purpose

### Image Guidelines
- **Hero Image:** 1200x800px minimum, high quality
- **Format:** JPEG for photos, PNG for graphics with transparency
- **File Size:** Optimize to under 500KB for performance
- **Aspect Ratio:** Landscape (16:9 or 4:3) works best

### Navigation Design
- **Keep Menu Short:** 5-7 items maximum for clean header
- **Clear Labels:** Use short, descriptive menu text
- **Logical Order:** Home → About → Gallery → Specific pages

## Accessibility Notes

### Keyboard Navigation
- Full keyboard support included
- Arrow keys navigate slides
- Home/End for first/last slide
- Tab navigation within each slide

### Reduced Motion
- Respects `prefers-reduced-motion` setting
- Disables animations for users who need it
- Instant transitions instead of animated

### Screen Readers
- Semantic HTML structure maintained
- ARIA labels can be added by user
- Consider Stack Mode for better screen reader experience

### Mobile Accessibility
- Stack Mode recommended for accessibility
- Touch-friendly navigation elements
- Large tap targets (44x44px minimum)

## Troubleshooting

### Slides Not Working

**Check:**
- JavaScript is enabled in browser
- Browser console for errors
- Template slug is correct in database
- `script.js` file exists and loads

### Navigation Not Updating

**Check:**
- Menu items have proper `href` attributes
- Hash navigation enabled in settings
- No JavaScript errors in console

### Mobile Not Stacking

**Check:**
- `mobile_behavior` field set to "stack"
- Browser width detection working
- Clear browser cache

### Slow Transitions

**Try:**
- Set transition speed to "fast"
- Reduce image file sizes
- Check browser performance
- Test on different devices

## Updates & Versioning

**Current Version:** 1.0.0

### Version History
- **1.0.0** (2026-02-07) - Initial release
  - Horizontal slide navigation
  - 8 custom fields
  - Mobile responsive modes
  - Keyboard navigation
  - Navigation dots

### Planned Features
- Touch swipe gestures
- Parallax effects option
- Vertical slide mode
- Custom slide order
- Slide-specific backgrounds

## Support

For issues or questions about this template:
1. Check the [Template-Specific Variables Documentation](../../docs/Sites/TEMPLATE_SPECIFIC_VARIABLES.md)
2. Review the [Site Customization Variables Guide](../../docs/Sites/SITE_CUSTOMIZATION_VARIABLES.md)
3. Test in different browsers
4. Check JavaScript console for errors
5. Contact support

## License

Copyright © 2026 Artist Sites. All rights reserved.
