# Image Protection System - Technical Reference

## Overview
The Online Art Festival platform includes a comprehensive image protection system that prevents unauthorized downloading, right-clicking, and screenshot capture of images across both the main site and multi-site artist storefronts.

## System Architecture

```
Main Site: _app.js → imageProtection.js → Always Protected
Multi-Sites: Addon System → imageProtection.js → Per-Site Protection
     ↓                ↓                    ↓              ↓
  Global Load    Database Control    Core Logic    Site-Specific
  useEffect      website_addons      Protection    Activation
```

## 1. Core Protection Features

### Client-Side Protection
- **Invisible Overlays**: Transparent divs over all images prevent direct interaction
- **Right-Click Blocking**: Context menu disabled on images only (preserves usability)
- **Drag Prevention**: Images cannot be dragged or saved via drag-and-drop
- **Screenshot Detection**: Images hidden during tab switching and window blur events
- **Keyboard Blocking**: Print Screen, Ctrl+S, F12, and other shortcuts disabled
- **Selection Prevention**: Text selection disabled on images

### SEO-Friendly Implementation
- **Bot Detection**: Automatically detects and skips protection for search engine crawlers
- **Crawler Whitelist**: Google, Bing, Facebook, Twitter, LinkedIn, WhatsApp, Telegram
- **Full Indexing**: Images remain fully accessible to search engines for SEO
- **No Impact**: Protection doesn't affect image metadata, alt text, or structured data

## 2. File Structure

### Core Protection Logic
```
/lib/imageProtection.js
├── initImageProtection()     # Main initialization function
├── addImageOverlays()        # Creates invisible overlays
├── addScreenshotProtection() # Tab/window blur detection
├── addKeyboardProtection()   # Blocks screenshot shortcuts
├── addContextMenuProtection() # Right-click prevention
└── addDragProtection()       # Drag-and-drop blocking
```

### Main Site Implementation
```
/pages/_app.js
├── Dynamic import of imageProtection.js
├── useEffect hook for client-side loading
└── SSR-safe implementation
```

### Multi-Site Addon
```
/components/sites-modules/image-protection.js
├── ImageProtectionAddon class
├── Dynamic import of core protection
├── Site-specific configuration
└── Cleanup/destroy methods
```

## 3. Main Site Protection

### Automatic Activation
The main site has image protection **always enabled** for all pages:

```javascript
// In _app.js
useEffect(() => {
  import('../lib/imageProtection').then(({ initImageProtection }) => {
    initImageProtection();
  });
}, []);
```

### Features
- ✅ Loads on every page automatically
- ✅ SEO-friendly (skips crawlers)
- ✅ SSR-safe (client-side only)
- ✅ No performance impact on server rendering

## 4. Multi-Site Addon System

### Database Configuration
```sql
-- Addon definition in website_addons table
INSERT INTO website_addons (
  addon_name, addon_slug, description, addon_script_path,
  tier_required, monthly_price, user_level, category
) VALUES (
  'Image Protection', 'image-protection', 
  'Protect images from unauthorized downloading with invisible overlays and screenshot detection',
  '/components/sites-modules/image-protection.js',
  'basic', 9.99, 0, 'site_features'
);
```

### Per-Site Activation
```sql
-- Site enables addon via dashboard or API
INSERT INTO site_addons (site_id, addon_id, is_active) 
VALUES ({site_id}, 11, 1);
```

### Addon Loading Process
1. **Artist storefront loads** → Checks `site_addons` table
2. **Addon enabled** → Loads `/components/sites-modules/image-protection.js`
3. **Addon initializes** → Imports core protection logic
4. **Protection activates** → Same features as main site

## 5. Technical Implementation

### Browser Environment Detection
```javascript
export const initImageProtection = () => {
  // Only run in browser environment (SSR-safe)
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }
  
  // SEO Protection: Skip for search engine crawlers
  const isBot = /googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram/i.test(navigator.userAgent);
  if (isBot) {
    return; // Allow crawlers full access for SEO
  }
  
  // Initialize protection systems...
};
```

### Image Overlay System
```javascript
const addImageOverlays = () => {
  const images = document.querySelectorAll('img:not([data-protected])');
  
  images.forEach(img => {
    // Create invisible overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      background: transparent; z-index: 999;
      pointer-events: all; user-select: none;
    `;
    
    // Insert overlay and protect image
    img.insertAdjacentElement('afterend', overlay);
    img.dataset.protected = 'true';
  });
};
```

### Screenshot Detection
```javascript
const addScreenshotProtection = () => {
  // Hide images during suspicious activity
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // User switched away - potential screenshot
      document.querySelectorAll('img').forEach(img => {
        img.style.visibility = 'hidden';
      });
    } else {
      // User returned - restore images after delay
      setTimeout(() => {
        document.querySelectorAll('img').forEach(img => {
          img.style.visibility = 'visible';
        });
      }, 1000);
    }
  });
};
```

## 6. Dashboard Integration

### Automatic UI Generation
The addon system automatically generates management UI in site dashboards:

```javascript
// Dashboard fetches available addons
const addonsResponse = await authenticatedApiRequest('/api/sites/addons');
setAvailableAddons(addonsData.addons || []);

// Filters and displays site-level addons
availableAddons.filter(addon => addon.user_level === 0).map(addon => (
  <AddonToggleButton key={addon.id} addon={addon} />
));
```

### Enable/Disable API
```javascript
// Enable addon for site
POST /api/sites/addons/{addon_id}

// Disable addon for site  
DELETE /api/sites/addons/{addon_id}
```

## 7. API Endpoints

### Addon Management
- `GET /api/sites/addons` - List available addons
- `GET /api/sites/{site_id}/addons` - Get active addons for site
- `POST /api/sites/addons/{addon_id}` - Enable addon for site
- `DELETE /api/sites/addons/{addon_id}` - Disable addon for site

### Master Addon Loader
```javascript
// Artist storefront calls this to load all active addons
GET /api/addons/sites/{site_id}/addons

// Returns active addons with script paths
[{
  "addon_id": 11,
  "addon_name": "Image Protection",
  "addon_slug": "image-protection", 
  "addon_script_path": "/components/sites-modules/image-protection.js",
  "is_active": 1
}]
```

## 8. Security Considerations

### Limitations
⚠️ **Client-side protection** - Determined users with technical knowledge can bypass  
⚠️ **Mobile screenshots** - Limited detection capabilities on mobile devices  
⚠️ **Developer tools** - Advanced users can disable JavaScript protection  
⚠️ **False positives** - Legitimate tab switching may temporarily hide images  

### Effectiveness
✅ **Casual users** - Highly effective against right-click and basic download attempts  
✅ **Screenshot deterrent** - Makes casual screenshots more difficult  
✅ **SEO preservation** - No impact on search engine indexing  
✅ **User experience** - Minimal impact on legitimate browsing  

## 9. Performance Impact

### Minimal Overhead
- **JavaScript**: ~8KB minified protection code
- **DOM modifications**: Lightweight overlay elements only
- **Event listeners**: Efficient event delegation
- **Memory usage**: Negligible impact on page performance

### Optimization Features
- **Single initialization** - Prevents duplicate loading
- **Dynamic imports** - Code splitting for better performance
- **Mutation observer** - Efficiently handles dynamic content
- **Cleanup methods** - Proper memory management when disabled

## 10. Troubleshooting

### Common Issues

**Images not loading:**
- Check if `pointer-events: none` is interfering with image loading
- Protection waits for image load before applying restrictions

**Protection not activating:**
- Verify addon is enabled in `site_addons` table
- Check browser console for JavaScript errors
- Confirm addon script path is correct

**SEO concerns:**
- Bot detection ensures crawlers have full access
- Use Google Search Console to verify image indexing
- Test with `?bot=googlebot` parameter if needed

### Debug Commands
```javascript
// Check protection status
console.log(window.imageProtectionInitialized);

// View protected images
document.querySelectorAll('[data-protected]');

// Test bot detection
navigator.userAgent = 'Googlebot'; // Won't work in production
```

## 11. Future Enhancements

### Potential Improvements
- **Server-side watermarking** - Add dynamic watermarks to images
- **Encrypted image serving** - Serve images as encrypted data
- **Canvas rendering** - Render images via JavaScript canvas
- **Progressive loading** - Split images into encrypted tiles
- **Advanced detection** - Better mobile screenshot detection

### Configuration Options
- **Protection levels** - Basic, Standard, Advanced tiers
- **Whitelist domains** - Allow specific referrers
- **Custom overlays** - Branded protection messages
- **Analytics** - Track protection bypass attempts

---

## Quick Reference

### Enable for Main Site
✅ **Already enabled** - Protection active on all main site pages

### Enable for Multi-Site
1. Site owner goes to dashboard
2. Finds "Image Protection" in addons section
3. Clicks enable (requires Basic tier, $9.99/month)
4. Protection activates immediately on their storefront

### Disable Protection
```javascript
// For testing - disable protection temporarily
window.imageProtectionInitialized = false;
```

### Check Status
```javascript
// Verify protection is active
console.log('Protection active:', !!window.imageProtectionInitialized);
```

---

*Last updated: January 2025*  
*System version: 1.0*  
*Compatible with: Next.js 15.3.5+*
