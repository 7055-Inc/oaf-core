# Back-to-Top Button Addon

A floating button that appears when users scroll down the page, providing quick navigation back to the top.

## Features

✅ **Automatic visibility** - Appears after scrolling 300px (configurable)  
✅ **Smooth scroll animation** - Eased scroll-to-top with configurable duration  
✅ **Customizable positioning** - Bottom-right or bottom-left  
✅ **Responsive design** - Adapts to mobile screens  
✅ **Accessibility** - ARIA labels, keyboard navigation, focus states  
✅ **Theme integration** - Uses global CSS variables for colors  
✅ **Performance optimized** - Debounced scroll events, requestAnimationFrame  
✅ **Dark mode support** - Adapts to user's color scheme preference  
✅ **Reduced motion support** - Respects prefers-reduced-motion setting

## Tier Requirements

**Tier:** Free (included with all artist sites)

## Technical Details

### Files

- `script.js` - Button logic and scroll handling (~200 lines)
- `styles.css` - Button appearance and responsive styles
- `README.md` - This documentation

### JavaScript Features

1. **Scroll Detection**
   - Monitors scroll position with debounced event handler
   - Shows button after threshold is exceeded
   - Smooth fade in/out transitions

2. **Smooth Scrolling**
   - Uses requestAnimationFrame for 60fps animation
   - Easing function (easeInOutCubic) for natural motion
   - Configurable duration (default: 800ms)

3. **Customization via Data Attributes**
   ```html
   <body 
     data-back-to-top-threshold="500"
     data-back-to-top-position="bottom-left"
     data-back-to-top-duration="1000">
   ```

### CSS Features

1. **CSS Variables Used**
   - `--button-color` - Button background color
   - `--accent-color` - Hover state color

2. **Responsive Breakpoints**
   - Desktop: 48px × 48px button
   - Mobile (≤768px): 44px × 44px button, adjusted positioning

3. **Accessibility**
   - Focus ring for keyboard navigation
   - Reduced motion support
   - High contrast hover states
   - Touch-friendly tap targets

## Configuration

### Default Settings

```javascript
{
  scrollThreshold: 300,        // Show after scrolling 300px
  buttonPosition: 'bottom-right',
  scrollDuration: 800,         // 800ms smooth scroll
  fadeSpeed: 200,              // 200ms fade in/out
  zIndex: 9999                 // Stay on top
}
```

### Custom Configuration

Add data attributes to `<body>` tag:

```html
<!-- Show button after scrolling 500px -->
<body data-back-to-top-threshold="500">

<!-- Position button on bottom-left -->
<body data-back-to-top-position="bottom-left">

<!-- Slower scroll animation (1 second) -->
<body data-back-to-top-duration="1000">
```

## Template Integration

### Automatic Integration

No template modifications needed! The addon:
1. Injects itself into the page automatically
2. Positions itself with fixed positioning
3. Works with any template layout

### Styling Customization

Templates can customize the button appearance via CSS variables:

```css
:root {
  --button-color: #ff5722;    /* Custom button color */
  --accent-color: #ff7043;    /* Custom hover color */
}
```

Or override specific styles:

```css
.back-to-top-button {
  background-color: #custom-color;
  border-radius: 8px;         /* Square with rounded corners */
  width: 56px;                /* Larger button */
  height: 56px;
}
```

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Fallbacks:**
- Uses `pageYOffset` fallback for older browsers
- Standard scroll fallback if smooth scroll not supported

## Performance

- **Debounced scroll events** - Runs check every 50ms max
- **RequestAnimationFrame** - GPU-accelerated smooth scrolling
- **CSS transitions** - Hardware-accelerated fade in/out
- **Minimal DOM manipulation** - Button created once, visibility toggled via CSS

## Accessibility

1. **ARIA Labels**
   - `aria-label="Scroll to top"`
   - `title="Back to top"`

2. **Keyboard Navigation**
   - Focusable via Tab key
   - Activates with Enter/Space

3. **Motion Preferences**
   - Respects `prefers-reduced-motion`
   - Disables animation if user prefers

4. **Screen Readers**
   - Semantic `<button>` element
   - Clear descriptive labels

## Testing Checklist

- [ ] Button appears after scrolling past threshold
- [ ] Button smoothly fades in/out
- [ ] Clicking button scrolls to top
- [ ] Smooth scroll animation works
- [ ] Button positioned correctly (bottom-right)
- [ ] Mobile responsive (smaller size, adjusted position)
- [ ] Hover effects work
- [ ] Focus states visible (keyboard navigation)
- [ ] Works with custom data attributes
- [ ] Uses template's CSS variables for colors
- [ ] No console errors

## Future Enhancements

Potential additions for premium tiers:
- Progress indicator (circular progress ring)
- Custom icon options
- Animation styles (bounce, slide, etc.)
- Multiple trigger points (show different buttons)
- Configurable via admin UI (no code needed)

## Version History

- **1.0.0** (2026-02-08) - Initial release
  - Core scroll-to-top functionality
  - Responsive design
  - Accessibility features
  - Theme integration
