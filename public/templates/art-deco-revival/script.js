/**
 * Art Deco Revival Template - Geometric Animations
 * Version: 1.0.0
 */

(function() {
  'use strict';
  
  function init() {
    setupGeometricReveal();
    console.log('Art Deco Revival: Template initialized');
  }
  
  function setupGeometricReveal() {
    const cards = document.querySelectorAll('.productCard, .addon-product-card');
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'scale(1)';
          }, index * 100);
        }
      });
    }, { threshold: 0.2 });
    
    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(card);
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
