# Announcement Bar Addon

Top or bottom message strip with optional countdown timer and dismissible functionality.

## Features

✅ **Customizable message** - Set any announcement text  
✅ **Countdown timer** - Show time remaining until offer ends (format: `22D | 22H | 55M | 45S`)  
✅ **Dismissible** - Users can close the bar  
✅ **Persistent dismiss** - Remembers dismissal via localStorage  
✅ **Optional link/CTA** - Add a clickable button  
✅ **Flexible positioning** - Top or bottom of page  
✅ **Sticky or static** - Choose positioning behavior  
✅ **Custom colors** - Background, text, button colors  
✅ **Responsive design** - Adapts to mobile screens  
✅ **Slide-in animation** - Smooth entrance effect  
✅ **Accessibility** - ARIA labels, keyboard navigation, reduced motion support

## Tier Requirements

**Tier:** Basic ($9.99/month)

## Technical Details

### Files

- `script.js` - Bar logic, countdown, dismiss handling (~380 lines)
- `styles.css` - Styling, animations, responsive design (~300 lines)
- `README.md` - This documentation

### JavaScript Features

1. **Message Display**
   - Plain text announcement
   - Optional link/button with custom text
   - Auto-adjusts body padding for sticky bars

2. **Countdown Timer**
   - Configurable end date
   - Real-time updates (every second)
   - Custom format string
   - Auto-hide when countdown ends (optional)
   - Format: `{d}D | {h}H | {m}M | {s}S`

3. **Dismiss Functionality**
   - Close button (X)
   - localStorage persistence
   - Slide-out animation
   - Configurable dismiss key

4. **Configuration Methods**
   ```javascript
   // Method 1: Global config object
   window.announcementBarConfig = {
     message: 'Flash Sale - 50% Off Everything!',
     link: '/shop',
     linkText: 'Shop Now',
     backgroundColor: '#ff5722',
     textColor: '#ffffff',
     showCountdown: true,
     countdownEndDate: '2026-12-31T23:59:59',
     dismissible: true,
     persistDismiss: true
   };
   ```
   
   ```html
   <!-- Method 2: Data attributes -->
   <body 
     data-announcement-message="Special offer ends soon!"
     data-announcement-link="/promo"
     data-announcement-link-text="Learn More"
     data-announcement-bg-color="#055474"
     data-announcement-text-color="#ffffff"
     data-announcement-countdown-end="2026-03-01T00:00:00"
     data-announcement-dismissible="true">
   ```

5. **Dynamic API**
   ```javascript
   // Show bar
   window.AnnouncementBarAddon.show();
   
   // Hide bar
   window.AnnouncementBarAddon.hide();
   
   // Clear dismissed state (show again)
   window.AnnouncementBarAddon.clearDismissed();
   
   // Update message dynamically
   window.AnnouncementBarAddon.updateMessage('New message!');
   
   // Update full configuration
   window.AnnouncementBarAddon.setConfig({
     message: 'Updated message',
     backgroundColor: '#333'
   });
   
   // Get current configuration
   const config = window.AnnouncementBarAddon.getConfig();
   ```

### CSS Features

1. **Position Options**
   - `.announcement-top` - Top of page
   - `.announcement-bottom` - Bottom of page
   - `.announcement-sticky` - Fixed positioning

2. **Animations**
   - Slide-in from top/bottom
   - Slide-out on dismiss
   - Optional urgent pulse animation
   - Optional countdown pulse animation

3. **Responsive Breakpoints**
   - Desktop: Full layout with horizontal content
   - Tablet (≤768px): Stacked content, adjusted padding
   - Mobile (≤480px): Compact layout, smaller fonts

4. **Style Variants**
   - `.urgent` - Pulsing animation for urgency
   - `.sale` - Countdown pulse animation

## Configuration Examples

### Example 1: Simple Message

```javascript
window.announcementBarConfig = {
  message: 'Free shipping on all orders over $50!',
  backgroundColor: '#055474',
  textColor: '#ffffff',
  dismissible: true
};
```

### Example 2: With Link/CTA

```javascript
window.announcementBarConfig = {
  message: 'New collection just dropped!',
  link: '/collections/new',
  linkText: 'Shop Now',
  backgroundColor: '#000000',
  textColor: '#ffffff',
  buttonColor: '#ffffff',
  buttonTextColor: '#000000',
  position: 'top',
  sticky: true
};
```

### Example 3: With Countdown Timer

```javascript
window.announcementBarConfig = {
  message: 'Flash Sale Ends In:',
  link: '/sale',
  linkText: 'Shop Sale',
  backgroundColor: '#ff5722',
  textColor: '#ffffff',
  showCountdown: true,
  countdownEndDate: '2026-12-31T23:59:59', // ISO 8601 format
  countdownFormat: '{d}D | {h}H | {m}M | {s}S',
  hideAfterCountdown: true,
  dismissible: true,
  persistDismiss: true
};
```

### Example 4: Bottom Sticky Bar

```javascript
window.announcementBarConfig = {
  message: 'Get 10% off your first order!',
  link: '/signup',
  linkText: 'Sign Up',
  position: 'bottom',
  sticky: true,
  backgroundColor: '#4CAF50',
  textColor: '#ffffff'
};
```

### Example 5: Urgent Announcement

```javascript
window.announcementBarConfig = {
  message: '🔥 Last Chance - Sale Ends Tonight!',
  link: '/clearance',
  linkText: 'Shop Now',
  backgroundColor: '#d32f2f',
  textColor: '#ffffff',
  showCountdown: true,
  countdownEndDate: '2026-02-09T00:00:00',
  dismissible: false // Force visibility
};
```

## Template Integration

### Automatic Integration

The addon automatically:
1. Creates the announcement bar
2. Positions it at top or bottom
3. Adjusts body padding if sticky
4. Manages dismiss state via localStorage

### Manual Setup via Data Attributes

```html
<!DOCTYPE html>
<html>
<head>
  <!-- ... -->
</head>
<body 
  data-announcement-message="Special offer - 20% off!"
  data-announcement-link="/shop"
  data-announcement-link-text="Shop Now"
  data-announcement-bg-color="#055474"
  data-announcement-countdown-end="2026-03-15T23:59:59">
  <!-- Your content -->
</body>
</html>
```

### Custom Styling

Override styles via CSS:

```css
/* Custom bar height */
.announcement-bar {
  padding: 16px 20px;
}

/* Custom button style */
.announcement-button {
  border-radius: 20px;
  font-weight: 700;
  text-transform: uppercase;
}

/* Custom countdown style */
.announcement-countdown {
  font-family: monospace;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.3);
}
```

## Countdown Format Options

The countdown format string supports these placeholders:

- `{d}` - Days remaining
- `{h}` - Hours (00-23, zero-padded)
- `{m}` - Minutes (00-59, zero-padded)
- `{s}` - Seconds (00-59, zero-padded)

**Examples:**
- `{d}D | {h}H | {m}M | {s}S` → `5D | 12H | 34M | 56S`
- `{d} days {h}:{m}:{s}` → `5 days 12:34:56`
- `{h}h {m}m remaining` → `12h 34m remaining`
- `Ends in {d}d {h}h` → `Ends in 5d 12h`

## localStorage Keys

The addon uses localStorage to persist dismiss state:

**Default key:** `announcement-bar-dismissed`

**Custom key:**
```javascript
window.announcementBarConfig = {
  dismissKey: 'my-custom-key-2026-sale'
};
```

This allows you to create multiple announcements that are dismissed independently.

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

**localStorage support required for persistent dismiss.**

## Performance

- **Minimal overhead** - Runs once on page load
- **Efficient countdown** - Updates every 1 second only if visible
- **CSS animations** - Hardware-accelerated
- **No continuous polling** - Uses setInterval only for countdown
- **Cleanup on dismiss** - Stops interval, removes DOM

## Accessibility

1. **ARIA Attributes**
   - Close button has `aria-label="Close announcement"`
   - Semantic HTML structure

2. **Keyboard Navigation**
   - Close button focusable via Tab
   - Link/button fully keyboard accessible

3. **Screen Readers**
   - Announcement text read aloud
   - Link/button properly announced

4. **Reduced Motion**
   - Respects `prefers-reduced-motion`
   - Disables slide animations if user prefers
   - Uses fade instead

## Testing Checklist

- [ ] Bar appears at top/bottom as configured
- [ ] Message displays correctly
- [ ] Link/button works and opens correctly
- [ ] Countdown timer updates every second
- [ ] Countdown format displays correctly
- [ ] Bar hides when countdown ends (if configured)
- [ ] Close button dismisses bar
- [ ] Dismiss persists across page reloads
- [ ] Body padding adjusted for sticky bar
- [ ] Mobile responsive (stacked layout)
- [ ] Slide-in animation works
- [ ] Slide-out animation on dismiss
- [ ] No console errors
- [ ] localStorage saves dismiss state
- [ ] Custom colors apply correctly

## Future Enhancements

Potential additions for premium tiers:
- Multiple announcements rotation
- Dashboard UI for configuration (no code needed)
- Scheduled start/end times
- Visitor targeting (new vs. returning)
- Page-specific announcements
- A/B testing variants
- Analytics tracking
- Email collection integration
- Cookie consent integration

## Version History

- **1.0.0** (2026-02-08) - Initial release
  - Core announcement functionality
  - Countdown timer support
  - Dismiss with localStorage
  - Responsive design
  - Accessibility features
