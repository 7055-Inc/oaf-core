/**
 * Broken Grid Template - Random Chaos Generator
 * Version: 1.0.0
 * Adds random rotations and positions to create collage effect
 */

(function() {
  'use strict';
  
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    const rotationRange = getRotationRange();
    const chaosLevel = getChaosLevel();
    
    applyRandomRotations(rotationRange, chaosLevel);
    
    console.log('Broken Grid: Chaos applied');
  }
  
  /**
   * Get rotation range from custom field
   */
  function getRotationRange() {
    const storefront = document.querySelector('.storefront');
    const range = storefront?.dataset.rotationRange || '5deg';
    return parseInt(range);
  }
  
  /**
   * Get chaos level from custom field
   */
  function getChaosLevel() {
    const storefront = document.querySelector('.storefront');
    return storefront?.dataset.chaosLevel || 'medium';
  }
  
  /**
   * Apply random rotations to cards
   */
  function applyRandomRotations(maxDegrees, chaosLevel) {
    const cards = document.querySelectorAll('.productCard, .addon-product-card, .addon-blog-card-small');
    
    cards.forEach((card, index) => {
      // Skip if already has rotation from CSS (respect CSS defaults)
      const currentTransform = window.getComputedStyle(card).transform;
      if (currentTransform && currentTransform !== 'none') {
        // CSS rotation exists, enhance it slightly
        const randomExtra = (Math.random() - 0.5) * 2; // ±1 degree
        const currentRotation = parseFloat(card.style.transform || '0');
        card.style.transform = `rotate(${currentRotation + randomExtra}deg)`;
        return;
      }
      
      // Generate random rotation
      let rotation = (Math.random() - 0.5) * 2 * maxDegrees;
      
      // Adjust for chaos level
      if (chaosLevel === 'subtle') {
        rotation = rotation * 0.3;
      } else if (chaosLevel === 'wild') {
        rotation = rotation * 1.5;
      }
      
      // Random slight translation for overlap effect
      const translateX = chaosLevel === 'wild' ? (Math.random() - 0.5) * 20 : 0;
      const translateY = chaosLevel === 'wild' ? (Math.random() - 0.5) * 20 : 0;
      
      card.style.transform = `rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`;
    });
  }
  
  /**
   * Hover effect - straighten card
   */
  function setupHoverEffects() {
    const cards = document.querySelectorAll('.productCard, .addon-product-card');
    
    cards.forEach(card => {
      const originalTransform = card.style.transform || card.getAttribute('style') || '';
      
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'rotate(0deg) scale(1.05)';
        this.style.zIndex = '100';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = originalTransform;
        this.style.zIndex = '1';
      });
    });
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      setupHoverEffects();
    });
  } else {
    init();
    setupHoverEffects();
  }
  
})();
