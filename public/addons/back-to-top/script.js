// Back-to-Top Button Addon
// Displays a floating button that scrolls the page back to the top
(function() {
  'use strict';
  
  console.log('[Addon] Back-to-Top Button loaded');
  
  // Load styles
  const loadStyles = function() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/addons/back-to-top/styles.css';
    document.head.appendChild(link);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStyles);
  } else {
    loadStyles();
  }
  
  // Configuration
  const CONFIG = {
    scrollThreshold: 300,        // Show button after scrolling this many pixels
    buttonPosition: 'bottom-right', // Options: bottom-right, bottom-left
    scrollDuration: 800,         // Smooth scroll duration in ms
    fadeSpeed: 200,              // Button fade in/out speed in ms
    zIndex: 9999                 // Ensure button stays on top
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Create the button
    const button = createButton();
    document.body.appendChild(button);
    
    // Handle scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        toggleButtonVisibility(button);
      }, 50);
    });
    
    // Handle button click
    button.addEventListener('click', function(e) {
      e.preventDefault();
      scrollToTop();
    });
    
    // Initial visibility check
    toggleButtonVisibility(button);
    
    console.log('[Addon] Back-to-Top Button initialized');
  }
  
  function createButton() {
    const button = document.createElement('button');
    button.className = 'back-to-top-button';
    button.setAttribute('aria-label', 'Scroll to top');
    button.setAttribute('title', 'Back to top');
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;
    
    // Apply positioning
    button.style.position = 'fixed';
    button.style.bottom = '30px';
    button.style.zIndex = CONFIG.zIndex;
    button.style.opacity = '0';
    button.style.visibility = 'hidden';
    button.style.transition = `opacity ${CONFIG.fadeSpeed}ms ease, visibility ${CONFIG.fadeSpeed}ms ease`;
    
    if (CONFIG.buttonPosition === 'bottom-left') {
      button.style.left = '30px';
    } else {
      button.style.right = '30px';
    }
    
    return button;
  }
  
  function toggleButtonVisibility(button) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > CONFIG.scrollThreshold) {
      button.style.opacity = '1';
      button.style.visibility = 'visible';
    } else {
      button.style.opacity = '0';
      button.style.visibility = 'hidden';
    }
  }
  
  function scrollToTop() {
    const start = window.pageYOffset || document.documentElement.scrollTop;
    const startTime = performance.now();
    
    function scroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / CONFIG.scrollDuration, 1);
      
      // Easing function (easeInOutCubic)
      const easing = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const position = start * (1 - easing);
      window.scrollTo(0, position);
      
      if (progress < 1) {
        requestAnimationFrame(scroll);
      }
    }
    
    requestAnimationFrame(scroll);
  }
  
  // Allow customization via data attributes on body or container
  function loadCustomConfig() {
    const body = document.body;
    
    if (body.dataset.backToTopThreshold) {
      CONFIG.scrollThreshold = parseInt(body.dataset.backToTopThreshold, 10);
    }
    
    if (body.dataset.backToTopPosition) {
      CONFIG.buttonPosition = body.dataset.backToTopPosition;
    }
    
    if (body.dataset.backToTopDuration) {
      CONFIG.scrollDuration = parseInt(body.dataset.backToTopDuration, 10);
    }
  }
  
  // Load custom config before init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadCustomConfig();
    });
  } else {
    loadCustomConfig();
  }
  
})();
