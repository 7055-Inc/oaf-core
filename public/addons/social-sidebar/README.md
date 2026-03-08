# Social Media Sidebar Addon

Display social media icons with links automatically pulled from user's business or personal profiles.

## Features

✅ **Auto-fetches social links** - Pulls from business profiles (artist/promoter) with personal fallback  
✅ **Multiple platforms** - Facebook, Instagram, TikTok, Twitter/X, Pinterest, WhatsApp  
✅ **Flexible positioning** - Sidebar, footer, or floating  
✅ **Multiple icon styles** - Circle, square, rounded, or plain  
✅ **Size options** - Small, medium, or large icons  
✅ **Platform colors** - Authentic brand colors for each platform  
✅ **Responsive design** - Adapts to mobile screens  
✅ **Hover animations** - Smooth scaling and color transitions  
✅ **Accessibility** - ARIA labels, focus states, reduced motion support  
✅ **Theme integration** - CSS variables for customization

## Tier Requirements

**Tier:** Basic ($9.99/month)

## Technical Details

### Files

- `script.js` - Fetches social links and renders icons (~350 lines)
- `styles.css` - Icon styling and positioning (~280 lines)
- `README.md` - This documentation

### API Integration

The addon fetches social media links from the API endpoint:

```
GET /api/v2/websites/resolve/:subdomain/socials
```

**Priority order:**
1. Business socials (from `artist_profiles` or `promoter_profiles`)
2. Personal socials (from `user_profiles`) - fallback

**Response format:**
```json
{
  "success": true,
  "socials": {
    "facebook": "https://facebook.com/username",
    "instagram": "https://instagram.com/username",
    "tiktok": "https://tiktok.com/@username",
    "twitter": "https://twitter.com/username",
    "pinterest": "https://pinterest.com/username",
    "whatsapp": "https://wa.me/1234567890"
  }
}
```

### Supported Platforms

| Platform | Business Field | Personal Field | Icon | Color |
|----------|---------------|----------------|------|-------|
| Facebook | `business_social_facebook` | `social_facebook` | ✓ | #1877F2 |
| Instagram | `business_social_instagram` | `social_instagram` | ✓ | #E4405F |
| TikTok | `business_social_tiktok` | `social_tiktok` | ✓ | #000000 |
| Twitter/X | `business_social_twitter` | `social_twitter` | ✓ | #000000 |
| Pinterest | `business_social_pinterest` | `social_pinterest` | ✓ | #E60023 |
| WhatsApp | (none) | `social_whatsapp` | ✓ | #25D366 |

### JavaScript Features

1. **Auto-Discovery**
   - Detects subdomain from URL
   - Fetches social links via API
   - Only displays platforms with configured links

2. **Configuration Options**
   ```javascript
   window.socialSidebarConfig = {
     position: 'sidebar',        // 'sidebar', 'footer', 'floating'
     iconStyle: 'circle',        // 'circle', 'square', 'rounded', 'plain'
     iconSize: 'medium',         // 'small', 'medium', 'large'
     showLabels: false,          // Show platform names
     openInNewTab: true,         // Open links in new tab
     floatingPosition: 'left'    // 'left' or 'right' (for floating)
   };
   ```

3. **Data Attributes**
   ```html
   <body 
     data-social-position="floating"
     data-social-icon-style="rounded"
     data-social-icon-size="large"
     data-social-show-labels="true">
   ```

4. **Dynamic API**
   ```javascript
   // Refresh icons after profile update
   window.SocialSidebarAddon.refresh();
   
   // Update configuration
   window.SocialSidebarAddon.setConfig({
     position: 'footer',
     iconStyle: 'plain'
   });
   
   // Get current configuration
   const config = window.SocialSidebarAddon.getConfig();
   ```

### CSS Features

1. **CSS Variables**
   - `--social-gap` - Space between items (default: 12px)
   - `--social-padding` - Container padding (default: 20px)
   - `--social-background` - Container background (default: transparent)
   - `--social-icon-bg` - Icon background color (default: #f0f0f0)
   - `--text-color` - Text color (default: #333)
   - `--background-color` - Background color (default: #fff)

2. **Position Styles**
   - `.social-sidebar-sidebar` - In sidebar area
   - `.social-sidebar-footer` - In footer area
   - `.social-sidebar-floating` - Fixed floating position

3. **Icon Styles**
   - `.social-icons-circle` - Circular background
   - `.social-icons-square` - Square background
   - `.social-icons-rounded` - Rounded corners
   - `.social-icons-plain` - No background (icon only)

4. **Size Styles**
   - `.social-size-small` - 32px icons (20px SVG)
   - `.social-size-medium` - 44px icons (24px SVG)
   - `.social-size-large` - 56px icons (32px SVG)

## Configuration Examples

### Example 1: Floating Sidebar (Default)

```html
<body data-social-position="floating" data-social-icon-style="circle">
```

Result: Circular icons in a fixed floating box on the left side.

### Example 2: Footer with Labels

```javascript
window.socialSidebarConfig = {
  position: 'footer',
  iconStyle: 'rounded',
  iconSize: 'large',
  showLabels: true
};
```

Result: Large rounded icons with platform names in the footer.

### Example 3: Plain Icons in Sidebar

```javascript
window.socialSidebarConfig = {
  position: 'sidebar',
  iconStyle: 'plain',
  iconSize: 'medium'
};
```

Result: Medium icon-only style (no background) in the sidebar.

## Template Integration

### Automatic Integration

The addon automatically:
1. Detects the subdomain
2. Fetches social media links from the API
3. Renders icons based on configuration
4. Inserts into appropriate location

### Manual Positioning

For templates with specific sidebar/footer elements:

```html
<!-- Sidebar -->
<aside class="sidebar">
  <!-- Social icons will be inserted here automatically -->
</aside>

<!-- Footer -->
<footer class="site-footer">
  <!-- Or here if position is 'footer' -->
</footer>
```

### Custom Styling

Override styles via CSS variables:

```css
:root {
  --social-gap: 16px;
  --social-padding: 24px;
  --social-icon-bg: rgba(5, 84, 116, 0.1);
}

/* Custom hover effect */
.social-icon:hover {
  transform: rotate(5deg) scale(1.1);
}
```

## User Profile Setup

Users need to configure their social media links in their profile:

**For Artists/Promoters (Priority):**
- Dashboard → Profile → Business Social Media
  - Facebook URL
  - Instagram URL
  - TikTok URL
  - Twitter/X URL
  - Pinterest URL

**For All Users (Fallback):**
- Dashboard → Profile → Personal Social Media
  - Facebook URL
  - Instagram URL
  - TikTok URL
  - Twitter/X URL
  - Pinterest URL
  - WhatsApp Number

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Lazy loading** - Fetches only on page load
- **Cached API response** - Browser caches social links
- **CSS-based animations** - Hardware-accelerated
- **Minimal DOM manipulation** - One-time insertion
- **SVG icons** - Lightweight, scalable vector graphics

## Accessibility

1. **ARIA Attributes**
   - Each icon has `aria-label` with platform name
   - Icons marked with proper semantic HTML

2. **Keyboard Navigation**
   - All links focusable via Tab key
   - Clear focus states

3. **Screen Readers**
   - Platform names announced
   - Links described properly

4. **Reduced Motion**
   - Respects `prefers-reduced-motion`
   - Disables animations if user prefers

## Testing Checklist

- [ ] Icons appear with correct platform logos
- [ ] Links open to correct social profiles
- [ ] Opens in new tab (if configured)
- [ ] Hover effects work
- [ ] Floating position correct (left/right)
- [ ] Mobile responsive (smaller icons, adjusted position)
- [ ] Works with all icon styles (circle/square/rounded/plain)
- [ ] Works with all sizes (small/medium/large)
- [ ] Labels display if enabled
- [ ] No console errors
- [ ] API fetches social links successfully
- [ ] Business socials take priority over personal
- [ ] Personal socials used as fallback
- [ ] Screen reader announces platform names
- [ ] Keyboard navigation works

## Future Enhancements

Potential additions for premium tiers:
- Additional platforms (YouTube, LinkedIn, Snapchat, etc.)
- Custom icon upload
- Share buttons functionality
- Live follower counts
- Social media feed integration
- Animated hover effects library
- Icon color customization
- Custom positioning controls in dashboard

## Version History

- **1.0.0** (2026-02-08) - Initial release
  - 6 platform support
  - Business/personal fallback logic
  - 3 position options
  - 4 icon style variants
  - 3 size options
  - Responsive design
  - Accessibility features

