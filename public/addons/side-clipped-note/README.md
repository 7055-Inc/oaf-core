# Side Clipped Note Addon

Floating tab on page edge that slides in on hover to reveal a message or announcement.

## Features

✅ **Floating edge tab** - Left or right side of page  
✅ **Rotated title** - Visible when collapsed  
✅ **Hover to expand** - Slides in to show full message  
✅ **Click action** - Optional button with link, scroll, or modal  
✅ **Custom colors** - Background and text colors  
✅ **Responsive design** - Adapts to mobile screens  
✅ **Modal support** - Show expanded content in modal  
✅ **API-driven** - Fetch note from database  
✅ **Per-site configuration** - Each site can have its own note  
✅ **Accessibility** - ARIA labels, keyboard navigation

## Tier Requirements

**Tier:** Professional ($19.99/month)

## Technical Details

### Files

- `script.js` - Fetches and displays the clipped note (~260 lines)
- `styles.css` - Floating tab styling and animations (~380 lines)
- `README.md` - This documentation

### Database Table

**Table:** `site_clipped_notes`

```sql
CREATE TABLE site_clipped_notes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  site_id BIGINT NOT NULL,
  title VARCHAR(100) DEFAULT 'Note',
  message TEXT NOT NULL,
  position ENUM('left', 'right') DEFAULT 'left',
  background_color VARCHAR(20) DEFAULT '#055474',
  text_color VARCHAR(20) DEFAULT '#ffffff',
  action_type ENUM('none', 'scroll', 'modal', 'link') DEFAULT 'none',
  action_value VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
```

### API Endpoints

**Public (Storefront):**
```
GET /api/v2/websites/resolve/:subdomain/clipped-note
```

Returns:
```json
{
  "success": true,
  "note": {
    "title": "New Collection",
    "message": "Check out our latest artworks!",
    "position": "right",
    "background_color": "#055474",
    "text_color": "#ffffff",
    "action_type": "link",
    "action_value": "/collections/new"
  }
}
```

**Authenticated (Dashboard):**
```
GET /api/v2/websites/sites/:siteId/clipped-note
PUT /api/v2/websites/sites/:siteId/clipped-note
```

PUT Request Body:
```json
{
  "title": "Special Offer",
  "message": "Limited time - 20% off all prints!",
  "position": "left",
  "background_color": "#ff5722",
  "text_color": "#ffffff",
  "action_type": "link",
  "action_value": "/shop",
  "is_active": 1
}
```

### JavaScript Features

1. **Auto-Detection**
   - Detects subdomain from URL
   - Fetches note via API
   - Only displays if note exists and is active

2. **Interaction Modes**
   - **Desktop:** Hover to expand
   - **Mobile:** Click tab to toggle
   - **Click:** Tab click always toggles (desktop + mobile)

3. **Action Types**
   - `none` - No action button
   - `link` - Navigate to URL (action_value = URL)
   - `scroll` - Scroll to element (action_value = CSS selector)
   - `modal` - Show modal (action_value = extended content)

4. **Dynamic API**
   ```javascript
   // Refresh note (re-fetch from API)
   window.SideClippedNoteAddon.refresh();
   
   // Show note (expand panel)
   window.SideClippedNoteAddon.show();
   
   // Hide note (collapse panel)
   window.SideClippedNoteAddon.hide();
   
   // Toggle note
   window.SideClippedNoteAddon.toggle();
   ```

### CSS Features

1. **Position Options**
   - `.clipped-note-left` - Tab on left edge
   - `.clipped-note-right` - Tab on right edge

2. **Animations**
   - Slide-in/out transitions
   - Hover expand (desktop only)
   - Modal fade-in and slide-up

3. **Responsive Breakpoints**
   - Desktop: Full size panel (320px)
   - Tablet (≤768px): Smaller panel (280px)
   - Mobile (≤480px): Nearly full-width

## Configuration Examples

### Example 1: Simple Announcement

```json
{
  "title": "NEW!",
  "message": "Check out our latest collection of artworks.",
  "position": "right",
  "background_color": "#055474",
  "text_color": "#ffffff",
  "action_type": "none"
}
```

### Example 2: With Link Action

```json
{
  "title": "Sale",
  "message": "Limited time offer - 30% off all prints!",
  "position": "left",
  "background_color": "#ff5722",
  "text_color": "#ffffff",
  "action_type": "link",
  "action_value": "/shop/sale"
}
```

### Example 3: With Scroll Action

```json
{
  "title": "Featured",
  "message": "See our featured artist of the month below.",
  "position": "right",
  "background_color": "#4CAF50",
  "text_color": "#ffffff",
  "action_type": "scroll",
  "action_value": "#featured-artist"
}
```

### Example 4: With Modal Action

```json
{
  "title": "Info",
  "message": "Important shipping update for holiday orders.",
  "position": "left",
  "background_color": "#2196F3",
  "text_color": "#ffffff",
  "action_type": "modal",
  "action_value": "Due to high holiday volume, orders may take 5-7 business days to ship. We appreciate your patience!"
}
```

## Usage

### Creating a Note via API

```javascript
const response = await fetch('/api/v2/websites/sites/123/clipped-note', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    title: 'Special Offer',
    message: 'Flash sale - 50% off!',
    position: 'right',
    background_color: '#ff5722',
    text_color: '#ffffff',
    action_type: 'link',
    action_value: '/sale',
    is_active: 1
  })
});

const data = await response.json();
console.log(data);
```

### Updating a Note

Same endpoint (PUT) - updates if exists, creates if doesn't exist.

### Deactivating a Note

```javascript
const response = await fetch('/api/v2/websites/sites/123/clipped-note', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    is_active: 0
  })
});
```

## Template Integration

### Automatic Integration

The addon automatically:
1. Detects subdomain
2. Fetches clipped note from API
3. Renders floating tab
4. Handles hover/click interactions

No template modifications needed!

### Custom Styling

Override styles via CSS:

```css
/* Custom colors */
.clipped-note {
  background-color: #custom-color;
  color: #custom-text-color;
}

/* Custom tab size */
.clipped-note-tab {
  font-size: 16px;
  padding: 20px 10px;
}

/* Custom panel width */
.clipped-note-panel {
  width: 400px;
}
```

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Single API call** - Fetches note once on page load
- **CSS transforms** - Hardware-accelerated animations
- **Minimal DOM** - Only creates elements if note exists
- **No polling** - Static content (refresh page to update)

## Accessibility

1. **ARIA Labels**
   - Close buttons labeled
   - Action buttons have clear text

2. **Keyboard Navigation**
   - Tab to focus elements
   - Enter/Space to activate
   - Escape to close modal

3. **Screen Readers**
   - Semantic HTML
   - Clear labeling
   - Proper focus management

4. **Reduced Motion**
   - Respects `prefers-reduced-motion`
   - Disables animations if user prefers

## Use Cases

Perfect for:
- 📢 **Announcements** - New products, events, news
- 🎉 **Promotions** - Sales, discounts, special offers
- 📅 **Events** - Upcoming shows, exhibitions
- ℹ️ **Information** - Shipping updates, policies
- 🆕 **What's New** - Latest additions, features
- 🎨 **Featured Content** - Artist of the month, featured work

## Testing Checklist

- [ ] Note fetches from API correctly
- [ ] Tab displays on correct side (left/right)
- [ ] Title shows on tab (rotated)
- [ ] Panel slides in on hover (desktop)
- [ ] Panel toggles on click (mobile)
- [ ] Message displays correctly
- [ ] Action button appears (if configured)
- [ ] Action button works (link/scroll/modal)
- [ ] Modal opens and closes (if modal action)
- [ ] Close button hides panel
- [ ] Custom colors apply
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] Accessibility features work

## Future Enhancements

Potential additions for higher tiers:
- Dashboard UI for easy editing (no API calls)
- Rich text editor for message
- Image/icon support in panel
- Multiple notes (rotation/carousel)
- Animation presets
- Schedule start/end times
- Visitor targeting
- Analytics tracking
- A/B testing variants

## Version History

- **1.0.0** (2026-02-08) - Initial release
  - Core clipped note functionality
  - API integration
  - Action types (link, scroll, modal)
  - Responsive design
  - Accessibility features
