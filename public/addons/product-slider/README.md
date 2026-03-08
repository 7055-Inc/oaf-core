## Product Slider Addon

Convert product grids into horizontal carousels with navigation arrows and touch/swipe support.

## Features

✅ **Horizontal carousel** - Slides products horizontally instead of grid rows  
✅ **Navigation arrows** - Previous/Next buttons with smooth transitions  
✅ **Touch/swipe support** - Mobile-friendly drag navigation  
✅ **Responsive design** - Adapts slides visible based on screen size  
✅ **Auto-play** - Optional automatic sliding  
✅ **Keyboard navigation** - Arrow keys support  
✅ **Loop mode** - Continuous carousel or stop at ends  
✅ **Pagination dots** - Optional dot indicators  
✅ **Configurable** - Slides visible, speed, gaps, and more  
✅ **Accessibility** - ARIA labels, keyboard navigation, reduced motion support

## Tier Requirements

**Tier:** Basic ($9.99/month)

## Technical Details

### Files

- `script.js` - Carousel logic, navigation, touch support (~480 lines)
- `styles.css` - Horizontal layout, animations, responsive design (~330 lines)
- `README.md` - This documentation

### JavaScript Features

1. **Opt-in Activation**
   - Add `data-slider-enabled="true"` or class `slider-enabled` to product grid
   - Converts grid to slider automatically
   - Multiple sliders per page supported

2. **Responsive Slides**
   - Desktop: 4 products visible (configurable)
   - Tablet: 3 products visible
   - Mobile: 2 products visible

3. **Navigation**
   - Previous/Next arrow buttons
   - Keyboard arrows (← →)
   - Touch/swipe gestures
   - Optional pagination dots

4. **Configuration**
   ```javascript
   window.productSliderConfig = {
     slidesVisible: 4,          // Desktop slides
     slidesVisibleTablet: 3,    // Tablet slides
     slidesVisibleMobile: 2,    // Mobile slides
     slideBy: 1,                // Slides to move per click
     autoPlay: false,           // Enable auto-play
     autoPlayInterval: 5000,    // Auto-play speed (ms)
     loop: true,                // Loop back to start
     showArrows: true,          // Show navigation arrows
     showDots: false,           // Show pagination dots
     pauseOnHover: true,        // Pause auto-play on hover
     transition: 'slide',       // Transition type
     transitionSpeed: 500,      // Transition duration (ms)
     gap: 20,                   // Gap between slides (px)
     enableTouch: true          // Enable touch/swipe
   };
   ```

5. **Dynamic API**
   ```javascript
   // Refresh all sliders
   window.ProductSliderAddon.refresh();
   
   // Update configuration
   window.ProductSliderAddon.setConfig({
     autoPlay: true,
     slidesVisible: 5
   });
   
   // Get current configuration
   const config = window.ProductSliderAddon.getConfig();
   ```

### CSS Features

1. **Arrow Positioning**
   - Desktop: Outside container (-24px)
   - Tablet: Closer (-20px)
   - Mobile: Inside container (8px)

2. **Smooth Transitions**
   - CSS transforms (hardware-accelerated)
   - Configurable transition speed
   - Respects reduced motion preferences

3. **Responsive Breakpoints**
   - Desktop (>1024px): Full layout
   - Tablet (≤1024px): 3 slides, adjusted arrows
   - Mobile (≤768px): 2 slides, inside arrows
   - Small mobile (≤480px): Compact layout

## Usage Examples

### Example 1: Basic Slider

```html
<!-- Add data attribute to existing product grid -->
<div class="product-grid" data-slider-enabled="true">
  <!-- Products render here -->
</div>
```

Or via class:

```html
<div class="product-grid slider-enabled">
  <!-- Products render here -->
</div>
```

### Example 2: With Auto-Play

```javascript
window.productSliderConfig = {
  autoPlay: true,
  autoPlayInterval: 3000,  // 3 seconds
  pauseOnHover: true,
  loop: true
};
```

```html
<div class="product-grid" data-slider-enabled="true">
  <!-- Products -->
</div>
```

### Example 3: Custom Slides Visible

```javascript
window.productSliderConfig = {
  slidesVisible: 5,          // 5 products on desktop
  slidesVisibleTablet: 3,    // 3 on tablet
  slidesVisibleMobile: 1,    // 1 on mobile
  gap: 30                    // 30px gap
};
```

### Example 4: With Pagination Dots

```javascript
window.productSliderConfig = {
  showDots: true,
  showArrows: false,  // Hide arrows, only dots
  loop: true
};
```

### Example 5: Data Attributes Configuration

```html
<body 
  data-slider-slides-visible="5"
  data-slider-auto-play="true"
  data-slider-show-arrows="true">
  
  <div class="product-grid slider-enabled">
    <!-- Products -->
  </div>
</body>
```

## Template Integration

### Automatic Detection

The addon automatically finds and converts any product grid with:
- `data-slider-enabled="true"` attribute
- `.slider-enabled` class

### Product Grid Selectors

Looks for these elements:
- `.product-grid`
- `.products-grid`
- `.productsGrid`

### Opt-in vs. Opt-out

**Default:** Opt-in (must explicitly enable)

To enable globally for all product grids:

```javascript
window.productSliderConfig = {
  // ... config
};

// After products load, enable sliders
document.querySelectorAll('.product-grid').forEach(grid => {
  grid.dataset.sliderEnabled = 'true';
});

window.ProductSliderAddon.refresh();
```

### Per-Grid Configuration

```html
<!-- Different config per grid -->
<div class="product-grid" 
     data-slider-enabled="true"
     data-slides-visible="3">
  <!-- Featured products -->
</div>

<div class="product-grid" 
     data-slider-enabled="true"
     data-slides-visible="6">
  <!-- All products -->
</div>
```

## Styling Customization

### Custom Arrow Colors

```css
.product-slider-arrow {
  background: rgba(5, 84, 116, 0.95);
  color: white;
}

.product-slider-arrow:hover {
  background: rgba(5, 84, 116, 1);
}
```

### Custom Arrow Position

```css
/* Always outside on all screen sizes */
.product-slider-prev {
  left: -60px !important;
}

.product-slider-next {
  right: -60px !important;
}
```

### Custom Dots Style

```css
.product-slider-dot {
  width: 12px;
  height: 12px;
  border-radius: 0; /* Square dots */
  border-color: #ff5722;
}

.product-slider-dot.active {
  background: #ff5722;
}
```

### Custom Transition

```css
.product-slider-track {
  transition: transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

## Touch/Swipe Behavior

- **Swipe threshold:** 50px
- **Direction:** Horizontal only
- **Snap back:** If swipe < threshold, returns to current slide
- **Inertia:** No momentum scrolling (controlled slides)
- **Passive events:** Optimized for performance

## Keyboard Navigation

- **Arrow Left (←):** Previous slide
- **Arrow Right (→):** Next slide
- **Tab:** Focus navigation buttons
- **Enter/Space:** Activate focused button

## Auto-Play Behavior

When `autoPlay: true`:
1. Automatically advances every `autoPlayInterval` milliseconds
2. Pauses on hover (if `pauseOnHover: true`)
3. Resets timer on manual navigation
4. Continues looping (if `loop: true`)

## Browser Compatibility

✅ Chrome/Edge 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Touch events supported on all mobile browsers.**

## Performance

- **Hardware-accelerated** - Uses CSS transforms
- **Will-change optimization** - GPU rendering hint
- **Passive touch events** - No scroll blocking
- **Debounced resize** - Efficient window resize handling
- **Cleanup on destroy** - Stops timers, removes listeners

## Accessibility

1. **ARIA Labels**
   - Navigation buttons labeled
   - Pagination dots labeled

2. **Keyboard Navigation**
   - Arrow keys for navigation
   - Tab to focus buttons
   - Enter/Space to activate

3. **Screen Readers**
   - Semantic button elements
   - Clear labeling

4. **Reduced Motion**
   - Respects `prefers-reduced-motion`
   - Disables transitions if user prefers
   - No animations

5. **Focus Management**
   - Visible focus states
   - Keyboard accessible

## Testing Checklist

- [ ] Slider converts grid to horizontal carousel
- [ ] Products slide left/right smoothly
- [ ] Previous/Next arrows work
- [ ] Arrow buttons disable at ends (if loop: false)
- [ ] Touch/swipe works on mobile
- [ ] Keyboard arrows navigate
- [ ] Auto-play advances automatically (if enabled)
- [ ] Auto-play pauses on hover (if configured)
- [ ] Responsive - correct slides visible per breakpoint
- [ ] Loop works (returns to start from end)
- [ ] Pagination dots display and work (if enabled)
- [ ] No console errors
- [ ] Multiple sliders work on same page
- [ ] Window resize updates slide widths
- [ ] Transitions are smooth (500ms default)

## Common Issues

### Products Not Sliding

**Solution:** Ensure product grid has `data-slider-enabled="true"` or class `slider-enabled`

### Arrows Not Appearing

**Solution:** Check `showArrows: true` in config, or set via `data-slider-show-arrows="true"`

### Wrong Number of Slides Visible

**Solution:** Check `slidesVisible`, `slidesVisibleTablet`, `slidesVisibleMobile` configuration

### Slider Not Initializing

**Solution:** 
1. Check if products exist in grid
2. Verify addon script loaded
3. Check console for errors
4. Ensure grid has correct class (`.product-grid`, `.products-grid`, `.productsGrid`)

## Future Enhancements

Potential additions for premium tiers:
- Vertical slider mode
- Fade transition support
- Variable width slides
- Center mode (active slide centered)
- Infinite loop (duplicate slides)
- Lazy loading images
- Thumbnail navigation
- Synced sliders
- Responsive breakpoint customization
- Progress bar indicator

## Version History

- **1.0.0** (2026-02-08) - Initial release
  - Horizontal carousel functionality
  - Touch/swipe support
  - Keyboard navigation
  - Auto-play option
  - Responsive design
  - Accessibility features
