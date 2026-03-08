/**
 * Diagonal Shift Template - Scroll Dynamics
 * Version: 1.0.0
 * Handles diagonal scroll behavior and text rotation
 */

(function() {
  'use strict';
  
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    const scrollDirection = storefront.dataset.scrollDirection || 'diagonal';
    
    if (scrollDirection === 'diagonal') {
      setupDiagonalScroll();
    }
    
    console.log('Diagonal Shift: Template initialized');
  }
  
  /**
   * Diagonal scroll behavior
   */
  function setupDiagonalScroll() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // Enhanced scroll feel
    window.addEventListener('wheel', function(e) {
      // Natural diagonal scroll with mouse wheel
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      
      // Scroll both directions proportionally
      window.scrollBy({
        top: deltaY,
        left: deltaX * 0.3, // Subtle horizontal component
        behavior: 'auto'
      });
    }, { passive: true });
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
