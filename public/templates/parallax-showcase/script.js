/**
 * Parallax Showcase Template - Scroll Effects System
 * Version: 1.0.0
 * Author: Artist Sites
 * 
 * Handles parallax scrolling effects and viewport-based animations
 */

(function() {
  'use strict';
  
  let parallaxIntensity = 0.5; // Default medium
  let scrollAnimEnabled = true;
  let ticking = false;
  
  /**
   * Initialize parallax system
   */
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    // Get settings
    const intensity = storefront.getAttribute('data-parallax-intensity') || 'medium';
    const animations = storefront.getAttribute('data-scroll-animation') || 'yes';
    
    // Set intensity multiplier
    if (intensity === 'subtle') parallaxIntensity = 0.3;
    else if (intensity === 'dramatic') parallaxIntensity = 0.8;
    
    scrollAnimEnabled = animations === 'yes';
    
    // Setup parallax elements
    setupParallax();
    
    // Setup scroll animations
    if (scrollAnimEnabled) {
      setupScrollAnimations();
    }
    
    // Setup scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Initial check
    onScroll();
    
    // Auto-hide header on scroll
    setupHeaderHide();
    
    console.log('Parallax Showcase: Effects initialized');
  }
  
  /**
   * Setup parallax elements
   */
  function setupParallax() {
    // Find all images that should have parallax
    const hero = document.querySelector('.hero, .hero-section');
    if (hero) {
      const heroImage = hero.querySelector('.heroImage, .hero-image, img');
      if (heroImage) {
        heroImage.classList.add('parallax-bg');
      }
    }
    
    // Add parallax to other background images
    const sections = document.querySelectorAll('.parallax-layer');
    sections.forEach(section => {
      const bg = section.querySelector('img, .background');
      if (bg) {
        bg.classList.add('parallax-bg');
      }
    });
  }
  
  /**
   * Setup scroll-triggered animations
   */
  function setupScrollAnimations() {
    // Mark elements for animation
    const animatableElements = document.querySelectorAll(
      '.productCard, .about, .section-title, h2, h3'
    );
    
    animatableElements.forEach(el => {
      if (!el.classList.contains('scroll-animate')) {
        el.classList.add('scroll-animate');
      }
    });
  }
  
  /**
   * Handle scroll event
   */
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        updateParallax();
        if (scrollAnimEnabled) {
          updateScrollAnimations();
        }
        ticking = false;
      });
      ticking = true;
    }
  }
  
  /**
   * Update parallax positions
   */
  function updateParallax() {
    const scrollY = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax-bg');
    
    parallaxElements.forEach(el => {
      const rect = el.parentElement.getBoundingClientRect();
      const elementTop = rect.top + scrollY;
      const elementHeight = rect.height;
      
      // Calculate parallax offset
      const viewportMid = scrollY + (window.innerHeight / 2);
      const elementMid = elementTop + (elementHeight / 2);
      const distance = viewportMid - elementMid;
      const offset = distance * parallaxIntensity;
      
      // Apply transform
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
  }
  
  /**
   * Update scroll-triggered animations
   */
  function updateScrollAnimations() {
    const animElements = document.querySelectorAll('.scroll-animate:not(.is-visible)');
    const windowHeight = window.innerHeight;
    const triggerPoint = windowHeight * 0.85;
    
    animElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      
      if (rect.top < triggerPoint) {
        el.classList.add('is-visible');
      }
    });
  }
  
  /**
   * Setup auto-hiding header
   */
  function setupHeaderHide() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    let lastScrollY = window.pageYOffset;
    let scrollThreshold = 100;
    
    window.addEventListener('scroll', function() {
      const currentScrollY = window.pageYOffset;
      
      if (currentScrollY < scrollThreshold) {
        header.classList.remove('header-hidden');
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        header.classList.add('header-hidden');
      } else {
        // Scrolling up
        header.classList.remove('header-hidden');
      }
      
      lastScrollY = currentScrollY;
    }, { passive: true });
  }
  
  /**
   * Debounce utility for resize
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Handle window resize
   */
  const handleResize = debounce(function() {
    // Recalculate on resize
    updateParallax();
    if (scrollAnimEnabled) {
      updateScrollAnimations();
    }
  }, 250);
  
  window.addEventListener('resize', handleResize);
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
