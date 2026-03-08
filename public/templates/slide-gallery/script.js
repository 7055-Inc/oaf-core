/**
 * Slide Gallery Template - Interactive Slide Navigation
 * Version: 1.0.0
 * Author: Artist Sites
 * 
 * This script transforms the standard vertical storefront layout into a
 * horizontal sliding experience inspired by Flash-era websites.
 * 
 * Features:
 * - Horizontal slide transitions between sections
 * - Navigation dots indicator
 * - Keyboard navigation (arrow keys)
 * - URL hash support (#section-name)
 * - Mobile-responsive behavior
 * - Smooth animations
 */

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    transitionDuration: 500, // milliseconds
    enableKeyboard: true,
    enableDots: true,
    enableHash: true,
    mobileBreakpoint: 768
  };
  
  // State
  let currentSlide = 0;
  let totalSlides = 0;
  let slideContainer = null;
  let slidePanels = [];
  let navDots = null;
  let isMobile = false;
  let mobileStackMode = false;
  
  /**
   * Initialize the slide gallery
   */
  function init() {
    // Check if already initialized
    if (document.querySelector('.slide-container')) {
      return;
    }
    
    // Get storefront element
    const storefront = document.querySelector('.storefront');
    if (!storefront) {
      console.warn('Slide Gallery: .storefront element not found');
      return;
    }
    
    // Check mobile behavior setting
    const mobileBehavior = storefront.getAttribute('data-mobile-behavior') || 'stack';
    const transitionSpeed = storefront.getAttribute('data-transition-speed') || 'medium';
    
    // Check if we're on mobile
    isMobile = window.innerWidth <= CONFIG.mobileBreakpoint;
    mobileStackMode = isMobile && mobileBehavior === 'stack';
    
    // If mobile stack mode, don't initialize slides
    if (mobileStackMode) {
      console.log('Slide Gallery: Mobile stack mode active');
      return;
    }
    
    // Update transition duration based on speed setting
    if (transitionSpeed === 'fast') {
      CONFIG.transitionDuration = 300;
    } else if (transitionSpeed === 'slow') {
      CONFIG.transitionDuration = 800;
    }
    
    // Get all major sections
    const sections = getSections();
    if (sections.length === 0) {
      console.warn('Slide Gallery: No sections found to slide');
      return;
    }
    
    // Build slide structure
    buildSlideStructure(sections);
    
    // Setup navigation
    setupNavigation();
    
    // Setup navigation dots
    if (CONFIG.enableDots) {
      createNavigationDots();
    }
    
    // Setup keyboard navigation
    if (CONFIG.enableKeyboard) {
      setupKeyboardNavigation();
    }
    
    // Handle hash navigation
    if (CONFIG.enableHash) {
      handleHashNavigation();
    }
    
    // Handle window resize
    window.addEventListener('resize', debounce(handleResize, 250));
    
    console.log(`Slide Gallery: Initialized with ${totalSlides} slides`);
  }
  
  /**
   * Get all major sections to convert into slides
   */
  function getSections() {
    const storefront = document.querySelector('.storefront');
    const sections = [];
    
    // Always include the hero as first slide
    const hero = storefront.querySelector('.hero-section, .hero');
    if (hero) {
      hero.setAttribute('data-slide-name', 'home');
      sections.push(hero);
    }
    
    // Get other major sections
    const mainSections = storefront.querySelectorAll('.about, .gallery, .page-section, section');
    mainSections.forEach((section, index) => {
      // Skip if already included (hero)
      if (section === hero) return;
      
      // Skip header and footer
      if (section.classList.contains('header') || section.classList.contains('footer')) return;
      
      // Set slide name from ID or generate one
      const slideName = section.id || `section-${index}`;
      section.setAttribute('data-slide-name', slideName);
      sections.push(section);
    });
    
    return sections;
  }
  
  /**
   * Build the slide container structure
   */
  function buildSlideStructure(sections) {
    const storefront = document.querySelector('.storefront');
    const header = storefront.querySelector('.header');
    const footer = storefront.querySelector('.footer');
    
    // Create slide container
    slideContainer = document.createElement('div');
    slideContainer.className = 'slide-container';
    
    // Move sections into slide panels
    sections.forEach((section, index) => {
      const panel = document.createElement('div');
      panel.className = 'slide-panel';
      panel.setAttribute('data-slide-index', index);
      panel.setAttribute('data-slide-name', section.getAttribute('data-slide-name'));
      
      // Move section into panel
      panel.appendChild(section);
      
      // Move footer to last panel
      if (index === sections.length - 1 && footer) {
        panel.appendChild(footer);
      }
      
      slideContainer.appendChild(panel);
      slidePanels.push(panel);
    });
    
    totalSlides = slidePanels.length;
    
    // Insert slide container after header
    if (header) {
      header.parentNode.insertBefore(slideContainer, header.nextSibling);
    } else {
      storefront.insertBefore(slideContainer, storefront.firstChild);
    }
  }
  
  /**
   * Setup navigation click handlers
   */
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.navigation .navLink');
    
    navLinks.forEach((link, index) => {
      link.addEventListener('click', function(e) {
        // Check if this is a slide navigation (not external link)
        const href = this.getAttribute('href');
        if (!href || href.startsWith('http')) {
          return; // Allow default behavior for external links
        }
        
        e.preventDefault();
        
        // Determine target slide
        let targetSlide = 0;
        
        // If href is a hash, find matching slide
        if (href.startsWith('#')) {
          const hash = href.substring(1);
          const targetPanel = Array.from(slidePanels).find(panel => 
            panel.getAttribute('data-slide-name') === hash
          );
          if (targetPanel) {
            targetSlide = parseInt(targetPanel.getAttribute('data-slide-index'));
          }
        } else {
          // Map nav link index to slide (0 = home, rest are sections)
          targetSlide = index;
        }
        
        goToSlide(targetSlide);
      });
    });
  }
  
  /**
   * Create navigation dots
   */
  function createNavigationDots() {
    navDots = document.createElement('div');
    navDots.className = 'slide-nav-dots';
    
    slidePanels.forEach((panel, index) => {
      const dot = document.createElement('div');
      dot.className = 'slide-dot';
      if (index === 0) dot.classList.add('active');
      dot.setAttribute('data-slide-index', index);
      
      // Create tooltip label
      const label = document.createElement('span');
      label.className = 'slide-dot-label';
      const slideName = panel.getAttribute('data-slide-name');
      label.textContent = slideName.charAt(0).toUpperCase() + slideName.slice(1);
      dot.appendChild(label);
      
      // Click handler
      dot.addEventListener('click', () => {
        goToSlide(index);
      });
      
      navDots.appendChild(dot);
    });
    
    document.body.appendChild(navDots);
  }
  
  /**
   * Setup keyboard navigation
   */
  function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
      // Left arrow or Page Up
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      }
      // Right arrow or Page Down
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      }
      // Home key
      else if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(0);
      }
      // End key
      else if (e.key === 'End') {
        e.preventDefault();
        goToSlide(totalSlides - 1);
      }
    });
  }
  
  /**
   * Handle hash navigation
   */
  function handleHashNavigation() {
    // Check initial hash
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const targetPanel = Array.from(slidePanels).find(panel => 
        panel.getAttribute('data-slide-name') === hash
      );
      if (targetPanel) {
        const targetIndex = parseInt(targetPanel.getAttribute('data-slide-index'));
        goToSlide(targetIndex, false); // No animation on initial load
      }
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', function() {
      const hash = window.location.hash.substring(1);
      const targetPanel = Array.from(slidePanels).find(panel => 
        panel.getAttribute('data-slide-name') === hash
      );
      if (targetPanel) {
        const targetIndex = parseInt(targetPanel.getAttribute('data-slide-index'));
        if (targetIndex !== currentSlide) {
          goToSlide(targetIndex);
        }
      }
    });
  }
  
  /**
   * Go to specific slide
   */
  function goToSlide(index, animate = true) {
    // Bounds check
    if (index < 0 || index >= totalSlides) {
      return;
    }
    
    // Update current slide
    currentSlide = index;
    
    // Calculate transform
    const offset = -100 * index;
    
    // Apply transform
    if (animate) {
      slideContainer.style.transition = `transform ${CONFIG.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    } else {
      slideContainer.style.transition = 'none';
    }
    slideContainer.style.transform = `translateX(${offset}vw)`;
    
    // Update navigation dots
    if (navDots) {
      const dots = navDots.querySelectorAll('.slide-dot');
      dots.forEach((dot, i) => {
        if (i === index) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
    
    // Update nav links active state
    const navLinks = document.querySelectorAll('.navigation .navLink');
    navLinks.forEach((link, i) => {
      if (i === index) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    
    // Update URL hash
    if (CONFIG.enableHash) {
      const slideName = slidePanels[index].getAttribute('data-slide-name');
      if (slideName !== 'home') {
        history.replaceState(null, null, `#${slideName}`);
      } else {
        history.replaceState(null, null, window.location.pathname);
      }
    }
    
    // Scroll to top of panel
    slidePanels[index].scrollTop = 0;
  }
  
  /**
   * Handle window resize
   */
  function handleResize() {
    const wasDesktop = !isMobile;
    isMobile = window.innerWidth <= CONFIG.mobileBreakpoint;
    
    // Check if we need to switch modes
    const storefront = document.querySelector('.storefront');
    const mobileBehavior = storefront.getAttribute('data-mobile-behavior') || 'stack';
    const shouldStack = isMobile && mobileBehavior === 'stack';
    
    if (shouldStack !== mobileStackMode) {
      // Mode changed, reload page
      location.reload();
    }
    
    // Recalculate position
    goToSlide(currentSlide, false);
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
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
