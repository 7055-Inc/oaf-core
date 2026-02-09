# Menu Icons Addon

Add customizable icons to navigation menu items to enhance visual appeal and improve user experience.

## Features

✅ **Multiple icon types** - Emojis, Font Awesome, SVG, or image URLs  
✅ **Flexible positioning** - Icons left or right of text  
✅ **Configurable** - JSON config, data attributes, or global object  
✅ **Responsive design** - Adapts to mobile screens  
✅ **Hover animations** - Scale, bounce, rotate, or pulse effects  
✅ **Accessibility** - ARIA attributes, reduced motion support  
✅ **Auto-detection** - Matches menu items by text content  
✅ **Dynamic API** - Programmatically update icons  
✅ **Theme integration** - CSS variables for customization

## Tier Requirements

**Tier:** Basic ($9.99/month)

## Technical Details

### Files

- `script.js` - Icon detection and application logic (~280 lines)
- `styles.css` - Icon styling and animations (~220 lines)
- `README.md` - This documentation

### JavaScript Features

1. **Auto-Detection**
   - Finds navigation elements automatically
   - Matches menu items by text (exact, case-insensitive, partial)
   - Supports data attributes for manual configuration

2. **Icon Types Supported**
   - **Emoji** - `🏠` Unicode emojis
   - **Font Awesome** - `fas fa-home` class names
   - **SVG** - Inline SVG code
   - **Image URL** - `/path/to/icon.png` or external URLs

3. **Configuration Methods**
   ```javascript
   // Method 1: Global config object
   window.menuIconsConfig = {
     'Home': { icon: '🏠', position: 'left' },
     'Shop': { icon: '🛍️', position: 'left' },
     'Contact': { icon: '✉️', position: 'right' }
   };
   ```
   
   ```html
   <!-- Method 2: Data attributes -->
   <a href="/" data-icon="🏠" data-icon-position="left">Home</a>
   
   <!-- Method 3: Meta tag config -->
   <meta name="menu-icons-config" content='{"Home": {"icon": "🏠"}}'>
   
   <!-- Method 4: Body data attributes (global settings) -->
   <body 
     data-menu-icon-position="left"
     data-menu-icon-size="20px"
     data-menu-icon-spacing="10px">
   ```

4. **Dynamic API**
   ```javascript
   // Refresh icons after menu changes
   window.MenuIconsAddon.refresh();
   
   // Update configuration
   window.MenuIconsAddon.setConfig({
     'New Page': { icon: '📄', position: 'left' }
   });
   
   // Get current configuration
   const config = window.MenuIconsAddon.getConfig();
   ```

### CSS Features

1. **CSS Variables**
   - `--menu-icon-size` - Icon size (default: 18px)
   - `--menu-icon-size-mobile` - Mobile icon size (default: 16px)
   - `--menu-icon-spacing` - Gap between icon and text (default: 8px)
   - `--menu-icon-spacing-mobile` - Mobile spacing (default: 6px)

2. **Animation Classes**
   - `.icon-animate-bounce` - Bounce on hover
   - `.icon-animate-rotate` - 360° rotation on hover
   - `.icon-animate-pulse` - Pulse/scale on hover

3. **Size Variations**
   - `.icon-size-small` - 14px icons
   - `.icon-size-large` - 24px icons

4. **Spacing Variations**
   - `.icon-spacing-tight` - 4px gap
   - `.icon-spacing-normal` - 8px gap
   - `.icon-spacing-loose` - 12px gap

## Configuration Examples

### Example 1: Emoji Icons

```javascript
window.menuIconsConfig = {
  'Home': { icon: '🏠' },
  'Gallery': { icon: '🎨' },
  'Shop': { icon: '🛍️' },
  'About': { icon: 'ℹ️' },
  'Contact': { icon: '✉️' },
  'Blog': { icon: '📝' }
};
```

### Example 2: Font Awesome Icons

```javascript
// Include Font Awesome in your page first
window.menuIconsConfig = {
  'Home': { icon: 'fas fa-home', type: 'fontawesome' },
  'Shop': { icon: 'fas fa-shopping-cart', type: 'fontawesome' },
  'User': { icon: 'far fa-user', type: 'fontawesome' }
};
```

### Example 3: SVG Icons

```javascript
window.menuIconsConfig = {
  'Home': { 
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    type: 'svg'
  }
};
```

### Example 4: Image URLs

```javascript
window.menuIconsConfig = {
  'Shop': { icon: '/images/icons/cart.png', type: 'url' },
  'Profile': { icon: 'https://example.com/user-icon.svg', type: 'url' }
};
```

### Example 5: Mixed Configuration

```javascript
window.menuIconsConfig = {
  'Home': { icon: '🏠', position: 'left' },
  'Shop': { icon: 'fas fa-shopping-bag', type: 'fontawesome', position: 'left' },
  'Contact': { icon: '✉️', position: 'right' }
};
```

## Template Integration

### Adding to Site Customization

The best way to configure menu icons is to add the configuration to your site's head section:

```html
<script>
  window.menuIconsConfig = {
    'Home': { icon: '🏠' },
    'Gallery': { icon: '🎨' },
    'Shop': { icon: '🛍️' }
  };
</script>
```

### Custom Styling

Override default styles via CSS variables:

```css
:root {
  --menu-icon-size: 20px;
  --menu-icon-spacing: 10px;
}

/* Custom hover effect */
.has-menu-icon:hover .menu-icon {
  transform: translateY(-2px);
}
```

### Template-Specific Classes

Templates can add animation classes:

```html
<nav class="navigation">
  <a href="/" class="icon-animate-bounce">Home</a>
  <a href="/shop" class="icon-animate-pulse">Shop</a>
</nav>
```

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Minimal overhead** - Runs once on page load
- **No continuous monitoring** - One-time icon injection
- **CSS-based animations** - Hardware-accelerated
- **Efficient matching** - Optimized text comparison

## Accessibility

1. **ARIA Attributes**
   - Icons marked with `aria-hidden="true"`
   - Icons don't interfere with screen readers
   - Link text remains accessible

2. **Keyboard Navigation**
   - Icons don't affect tab order
   - Links remain fully keyboard accessible

3. **Reduced Motion**
   - Respects `prefers-reduced-motion`
   - Disables animations if user prefers

4. **Semantic HTML**
   - Icons are decorative only
   - Link functionality unchanged

## Common Icon Sets

### Recommended Emoji Icons

- 🏠 Home
- 🎨 Gallery/Art
- 🛍️ Shop/Store
- 📦 Products
- 🛒 Cart
- ℹ️ About/Info
- ✉️ Contact
- 📝 Blog/Articles
- 📄 Pages
- 👤 Profile/Account
- ⚙️ Settings
- 🔍 Search
- ❤️ Favorites/Wishlist
- 📱 Social Media
- 🌐 Website/Link

### Font Awesome Classes

```
fas fa-home       - Home
fas fa-palette    - Gallery
fas fa-store      - Shop
fas fa-shopping-cart - Cart
fas fa-info-circle - About
fas fa-envelope   - Contact
fas fa-blog       - Blog
fas fa-user       - Profile
```

## Testing Checklist

- [ ] Icons appear on menu items
- [ ] Icon positioning correct (left/right)
- [ ] Hover animations work
- [ ] Mobile responsive (smaller icons)
- [ ] Works with custom configuration
- [ ] Works with data attributes
- [ ] Font Awesome icons render (if using FA)
- [ ] SVG icons display correctly
- [ ] Image URLs load
- [ ] No console errors
- [ ] Screen reader doesn't announce icons
- [ ] Keyboard navigation unaffected

## Future Enhancements

Potential additions for premium tiers:
- Visual icon picker in dashboard
- Icon color customization per item
- Badge/notification counter on icons
- Animated icon transitions
- Icon-only mobile menu option
- Custom icon upload
- Icon library browser

## Version History

- **1.0.0** (2026-02-08) - Initial release
  - Multiple icon type support
  - Flexible configuration methods
  - Responsive design
  - Accessibility features
