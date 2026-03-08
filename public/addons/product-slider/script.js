// Product Slider Addon
// Horizontal product carousel with navigation and touch support
(function() {
  'use strict';
  
  console.log('[Addon] Product Slider loaded');
  
  // Load styles
  const loadStyles = function() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/addons/product-slider/styles.css';
    document.head.appendChild(link);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStyles);
  } else {
    loadStyles();
  }
  
  // Configuration
  const CONFIG = {
    slidesVisible: 4,          // Number of products visible at once
    slidesVisibleTablet: 3,    // Tablet breakpoint
    slidesVisibleMobile: 2,    // Mobile breakpoint
    slideBy: 1,                // How many slides to move per navigation
    autoPlay: false,           // Enable auto-play
    autoPlayInterval: 5000,    // Auto-play interval in ms
    loop: true,                // Loop back to start
    showArrows: true,          // Show navigation arrows
    showDots: false,           // Show pagination dots
    pauseOnHover: true,        // Pause auto-play on hover
    transition: 'slide',       // 'slide' or 'fade'
    transitionSpeed: 500,      // Transition duration in ms
    gap: 20,                   // Gap between slides in px
    enableTouch: true          // Enable touch/swipe
  };
  
  let sliders = [];
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Load custom configuration
    loadCustomConfig();
    
    // Find all product grids and convert to sliders
    const productGrids = document.querySelectorAll('.product-grid, .products-grid, .productsGrid');
    
    productGrids.forEach(grid => {
      // Check if slider is enabled for this grid
      if (shouldEnableSlider(grid)) {
        convertToSlider(grid);
      }
    });
    
    if (sliders.length > 0) {
      console.log(`[Addon] Product Slider initialized (${sliders.length} slider${sliders.length > 1 ? 's' : ''})`);
    }
  }
  
  function loadCustomConfig() {
    // Check for global configuration
    if (window.productSliderConfig) {
      Object.assign(CONFIG, window.productSliderConfig);
      console.log('[Addon] Product Slider: Custom config loaded');
    }
    
    // Check for data attributes on body
    const body = document.body;
    
    if (body.dataset.sliderSlidesVisible) {
      CONFIG.slidesVisible = parseInt(body.dataset.sliderSlidesVisible, 10);
    }
    
    if (body.dataset.sliderAutoPlay !== undefined) {
      CONFIG.autoPlay = body.dataset.sliderAutoPlay === 'true';
    }
    
    if (body.dataset.sliderShowArrows !== undefined) {
      CONFIG.showArrows = body.dataset.sliderShowArrows === 'true';
    }
  }
  
  function shouldEnableSlider(grid) {
    // Check for explicit enable/disable
    if (grid.dataset.sliderEnabled === 'false') {
      return false;
    }
    
    if (grid.dataset.sliderEnabled === 'true') {
      return true;
    }
    
    // Check for class-based enable
    if (grid.classList.contains('slider-enabled')) {
      return true;
    }
    
    // Default: don't enable (opt-in)
    return false;
  }
  
  function convertToSlider(grid) {
    const products = Array.from(grid.children);
    
    if (products.length === 0) {
      return;
    }
    
    // Create slider structure
    const slider = createSliderStructure(grid, products);
    
    // Replace grid with slider
    grid.parentNode.replaceChild(slider.container, grid);
    
    // Initialize slider functionality
    initSlider(slider);
    
    sliders.push(slider);
  }
  
  function createSliderStructure(originalGrid, products) {
    // Create container
    const container = document.createElement('div');
    container.className = 'product-slider-container';
    
    // Copy data attributes from original grid
    Array.from(originalGrid.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        container.setAttribute(attr.name, attr.value);
      }
    });
    
    // Create track wrapper (for overflow hidden)
    const wrapper = document.createElement('div');
    wrapper.className = 'product-slider-wrapper';
    
    // Create track (slides container)
    const track = document.createElement('div');
    track.className = 'product-slider-track';
    
    // Wrap each product in a slide
    products.forEach(product => {
      const slide = document.createElement('div');
      slide.className = 'product-slider-slide';
      slide.appendChild(product);
      track.appendChild(slide);
    });
    
    wrapper.appendChild(track);
    container.appendChild(wrapper);
    
    // Add navigation arrows
    if (CONFIG.showArrows) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'product-slider-arrow product-slider-prev';
      prevBtn.setAttribute('aria-label', 'Previous products');
      prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
      
      const nextBtn = document.createElement('button');
      nextBtn.className = 'product-slider-arrow product-slider-next';
      nextBtn.setAttribute('aria-label', 'Next products');
      nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      
      container.appendChild(prevBtn);
      container.appendChild(nextBtn);
    }
    
    // Add pagination dots
    if (CONFIG.showDots) {
      const dots = document.createElement('div');
      dots.className = 'product-slider-dots';
      container.appendChild(dots);
    }
    
    return {
      container,
      wrapper,
      track,
      slides: Array.from(track.children),
      currentIndex: 0,
      autoPlayTimer: null,
      isPaused: false
    };
  }
  
  function initSlider(slider) {
    const { container, track, slides } = slider;
    
    // Set initial slide widths
    updateSlideWidths(slider);
    
    // Add navigation event listeners
    if (CONFIG.showArrows) {
      const prevBtn = container.querySelector('.product-slider-prev');
      const nextBtn = container.querySelector('.product-slider-next');
      
      prevBtn.addEventListener('click', () => slidePrev(slider));
      nextBtn.addEventListener('click', () => slideNext(slider));
    }
    
    // Add touch/swipe support
    if (CONFIG.enableTouch) {
      addTouchSupport(slider);
    }
    
    // Add keyboard navigation
    container.setAttribute('tabindex', '0');
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        slidePrev(slider);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        slideNext(slider);
      }
    });
    
    // Update dots if enabled
    if (CONFIG.showDots) {
      updateDots(slider);
    }
    
    // Update navigation state
    updateNavigationState(slider);
    
    // Start auto-play if enabled
    if (CONFIG.autoPlay) {
      startAutoPlay(slider);
      
      // Pause on hover if configured
      if (CONFIG.pauseOnHover) {
        container.addEventListener('mouseenter', () => pauseAutoPlay(slider));
        container.addEventListener('mouseleave', () => resumeAutoPlay(slider));
      }
    }
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateSlideWidths(slider);
        goToSlide(slider, slider.currentIndex, false);
      }, 150);
    });
  }
  
  function updateSlideWidths(slider) {
    const { wrapper, slides } = slider;
    const wrapperWidth = wrapper.offsetWidth;
    const slidesVisible = getSlidesVisible();
    const gap = CONFIG.gap;
    
    const slideWidth = (wrapperWidth - (gap * (slidesVisible - 1))) / slidesVisible;
    
    slides.forEach(slide => {
      slide.style.width = `${slideWidth}px`;
      slide.style.marginRight = `${gap}px`;
    });
    
    // Remove margin from last slide
    if (slides.length > 0) {
      slides[slides.length - 1].style.marginRight = '0';
    }
  }
  
  function getSlidesVisible() {
    const width = window.innerWidth;
    
    if (width <= 768) {
      return CONFIG.slidesVisibleMobile;
    } else if (width <= 1024) {
      return CONFIG.slidesVisibleTablet;
    } else {
      return CONFIG.slidesVisible;
    }
  }
  
  function slidePrev(slider) {
    const newIndex = slider.currentIndex - CONFIG.slideBy;
    
    if (newIndex < 0) {
      if (CONFIG.loop) {
        goToSlide(slider, slider.slides.length - getSlidesVisible());
      }
    } else {
      goToSlide(slider, newIndex);
    }
    
    resetAutoPlay(slider);
  }
  
  function slideNext(slider) {
    const slidesVisible = getSlidesVisible();
    const maxIndex = slider.slides.length - slidesVisible;
    const newIndex = slider.currentIndex + CONFIG.slideBy;
    
    if (newIndex > maxIndex) {
      if (CONFIG.loop) {
        goToSlide(slider, 0);
      }
    } else {
      goToSlide(slider, newIndex);
    }
    
    resetAutoPlay(slider);
  }
  
  function goToSlide(slider, index, animate = true) {
    const { track, slides } = slider;
    const slidesVisible = getSlidesVisible();
    const maxIndex = slides.length - slidesVisible;
    
    // Clamp index
    index = Math.max(0, Math.min(index, maxIndex));
    
    slider.currentIndex = index;
    
    // Calculate offset
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += slides[i].offsetWidth + CONFIG.gap;
    }
    
    // Apply transition
    if (animate) {
      track.style.transition = `transform ${CONFIG.transitionSpeed}ms ease`;
    } else {
      track.style.transition = 'none';
    }
    
    track.style.transform = `translateX(-${offset}px)`;
    
    // Remove transition after animation
    if (animate) {
      setTimeout(() => {
        track.style.transition = '';
      }, CONFIG.transitionSpeed);
    }
    
    // Update navigation state
    updateNavigationState(slider);
    
    // Update dots
    if (CONFIG.showDots) {
      updateDots(slider);
    }
  }
  
  function updateNavigationState(slider) {
    if (!CONFIG.showArrows) return;
    
    const { container } = slider;
    const prevBtn = container.querySelector('.product-slider-prev');
    const nextBtn = container.querySelector('.product-slider-next');
    
    if (!prevBtn || !nextBtn) return;
    
    const slidesVisible = getSlidesVisible();
    const maxIndex = slider.slides.length - slidesVisible;
    
    // Disable/enable buttons based on position
    if (!CONFIG.loop) {
      prevBtn.disabled = slider.currentIndex === 0;
      nextBtn.disabled = slider.currentIndex >= maxIndex;
    } else {
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    }
  }
  
  function updateDots(slider) {
    const { container, slides } = slider;
    const dotsContainer = container.querySelector('.product-slider-dots');
    
    if (!dotsContainer) return;
    
    const slidesVisible = getSlidesVisible();
    const numDots = Math.ceil(slides.length / slidesVisible);
    
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < numDots; i++) {
      const dot = document.createElement('button');
      dot.className = 'product-slider-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      
      if (i === Math.floor(slider.currentIndex / slidesVisible)) {
        dot.classList.add('active');
      }
      
      dot.addEventListener('click', () => {
        goToSlide(slider, i * slidesVisible);
        resetAutoPlay(slider);
      });
      
      dotsContainer.appendChild(dot);
    }
  }
  
  function addTouchSupport(slider) {
    const { wrapper, track } = slider;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let startTransform = 0;
    
    wrapper.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      
      const transform = track.style.transform;
      const match = transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
      startTransform = match ? parseFloat(match[1]) : 0;
      
      track.style.transition = 'none';
    }, { passive: true });
    
    wrapper.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      
      track.style.transform = `translateX(${startTransform + diff}px)`;
    }, { passive: true });
    
    wrapper.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      
      const diff = currentX - startX;
      const threshold = 50;
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          slidePrev(slider);
        } else {
          slideNext(slider);
        }
      } else {
        // Snap back
        goToSlide(slider, slider.currentIndex, true);
      }
    });
  }
  
  function startAutoPlay(slider) {
    if (slider.autoPlayTimer) return;
    
    slider.autoPlayTimer = setInterval(() => {
      if (!slider.isPaused) {
        slideNext(slider);
      }
    }, CONFIG.autoPlayInterval);
  }
  
  function pauseAutoPlay(slider) {
    slider.isPaused = true;
  }
  
  function resumeAutoPlay(slider) {
    slider.isPaused = false;
  }
  
  function resetAutoPlay(slider) {
    if (!CONFIG.autoPlay) return;
    
    clearInterval(slider.autoPlayTimer);
    slider.autoPlayTimer = null;
    startAutoPlay(slider);
  }
  
  // Export API
  window.ProductSliderAddon = {
    refresh: function() {
      // Clean up existing sliders
      sliders.forEach(slider => {
        if (slider.autoPlayTimer) {
          clearInterval(slider.autoPlayTimer);
        }
      });
      sliders = [];
      
      // Re-initialize
      init();
    },
    setConfig: function(newConfig) {
      Object.assign(CONFIG, newConfig);
      this.refresh();
    },
    getConfig: function() {
      return { ...CONFIG };
    }
  };
  
})();
