/**
 * Minimalist Luxe Template - Smooth Reveal Effects
 * Version: 1.0.0
 */

(function() {
  'use strict';
  
  function init() {
    setupSmoothReveal();
    console.log('Minimalist Luxe: Template initialized');
  }
  
  function setupSmoothReveal() {
    const elements = document.querySelectorAll('.productCard, .addon-product-card, .addon-blog-card-small');
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.2 });
    
    elements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(60px)';
      el.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
      observer.observe(el);
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
