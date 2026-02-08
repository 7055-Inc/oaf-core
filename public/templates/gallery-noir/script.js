/**
 * Gallery Noir Template - Spotlight Effects & Smooth Interactions
 * Version: 1.0.0
 * Enhanced museum-quality interactions
 */

(function() {
  'use strict';
  
  function init() {
    setupSpotlightTracking();
    setupSmoothScrollEffects();
    
    console.log('Gallery Noir: Template initialized');
  }
  
  /**
   * Track mouse for spotlight effects
   */
  function setupSpotlightTracking() {
    const cards = document.querySelectorAll('.productCard, .addon-product-card');
    
    cards.forEach(card => {
      card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Create subtle follow-spot effect
        const spotlight = this.querySelector('::before') || this;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const deltaX = (x - centerX) / centerX;
        const deltaY = (y - centerY) / centerY;
        
        this.style.setProperty('--spotlight-x', `${50 + deltaX * 10}%`);
        this.style.setProperty('--spotlight-y', `${50 + deltaY * 10}%`);
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.setProperty('--spotlight-x', '50%');
        this.style.setProperty('--spotlight-y', '50%');
      });
    });
  }
  
  /**
   * Smooth scroll reveal effects
   */
  function setupSmoothScrollEffects() {
    const cards = document.querySelectorAll('.productCard, .addon-product-card, .addon-blog-card-small');
    
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, index * 50);
        }
      });
    }, observerOptions);
    
    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      observer.observe(card);
    });
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
