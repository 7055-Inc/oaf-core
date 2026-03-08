/**
 * Luxury Brand Template - Interactive Features
 * Version: 1.0.0
 * Author: Artist Sites
 * 
 * Handles header transparency transitions, scroll effects, and basic interactions
 * Note: Product slider, announcement bar, and other advanced features are separate addons
 */

(function() {
  'use strict';
  
  /**
   * Initialize template features
   */
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup back-to-top button
    setupBackToTop();
    
    // Setup smooth scroll for anchor links
    setupSmoothScroll();
    
    // Setup category grid interactions
    setupCategoryGrid();
    
    console.log('Luxury Brand: Template initialized');
  }
  
  /**
   * Header transparency on scroll
   */
  function setupHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    let lastScrollY = window.pageYOffset;
    const scrollThreshold = 50;
    
    function updateHeader() {
      const currentScrollY = window.pageYOffset;
      
      if (currentScrollY < scrollThreshold) {
        header.classList.add('transparent');
      } else {
        header.classList.remove('transparent');
      }
      
      lastScrollY = currentScrollY;
    }
    
    // Initial state
    if (window.pageYOffset < scrollThreshold) {
      header.classList.add('transparent');
    }
    
    window.addEventListener('scroll', updateHeader, { passive: true });
  }
  
  /**
   * Back to top button functionality
   */
  function setupBackToTop() {
    // Check if button exists or create it
    let button = document.querySelector('.back-to-top');
    
    if (!button) {
      button = document.createElement('button');
      button.className = 'back-to-top';
      button.innerHTML = '↑';
      button.setAttribute('aria-label', 'Back to top');
      document.body.appendChild(button);
    }
    
    // Show/hide on scroll
    function updateVisibility() {
      const scrollY = window.pageYOffset;
      
      if (scrollY > 500) {
        button.classList.add('visible');
      } else {
        button.classList.remove('visible');
      }
    }
    
    window.addEventListener('scroll', updateVisibility, { passive: true });
    
    // Click handler
    button.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    // Initial check
    updateVisibility();
  }
  
  /**
   * Smooth scroll for anchor links
   */
  function setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Skip if it's just "#"
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          
          // Calculate offset for fixed header
          const header = document.querySelector('.header');
          const headerHeight = header ? header.offsetHeight : 0;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
  
  /**
   * Setup category grid interactions
   */
  function setupCategoryGrid() {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
      card.addEventListener('click', function() {
        const categoryName = this.querySelector('.category-name');
        if (categoryName) {
          console.log('Category clicked:', categoryName.textContent);
          // Category filtering can be handled by separate addon or route navigation
        }
      });
    });
  }
  
  /**
   * Setup viewport-based fade animations
   */
  function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll(
      '.productCard, .article-card, .category-card'
    );
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }
  
  /**
   * Debounce utility
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
    // Recalculate layouts if needed
    console.log('Luxury Brand: Window resized');
  }, 250);
  
  window.addEventListener('resize', handleResize);
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      setupScrollAnimations();
    });
  } else {
    init();
    setupScrollAnimations();
  }
  
})();
