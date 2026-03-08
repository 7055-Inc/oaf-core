/**
 * Avant-Garde Studio Template - Interactive Features
 * Version: 1.0.0
 * Author: Artist Sites
 * 
 * Handles hero slideshow, sidebar interactions, and unconventional layout behaviors
 */

(function() {
  'use strict';
  
  let currentSlide = 0;
  let slideInterval = null;
  const SLIDE_DURATION = 5000; // 5 seconds per slide
  
  /**
   * Initialize template features
   */
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    // Setup hero slideshow
    setupHeroSlideshow();
    
    // Setup sidebar interactions
    setupSidebarInteractions();
    
    // Setup side clipped note
    setupSideClippedNote();
    
    // Setup smooth scroll
    setupSmoothScroll();
    
    console.log('Avant-Garde Studio: Template initialized');
  }
  
  /**
   * Hero Slideshow Functionality
   */
  function setupHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides || slides.length === 0) return;
    
    const prevArrow = document.querySelector('.hero-slideshow-arrow.prev');
    const nextArrow = document.querySelector('.hero-slideshow-arrow.next');
    const pagination = document.querySelector('.hero-slideshow-pagination');
    
    // Show first slide
    if (slides.length > 0) {
      slides[0].classList.add('active');
    }
    
    // Update pagination
    function updatePagination() {
      if (pagination && slides.length > 0) {
        pagination.textContent = `${currentSlide + 1} / ${slides.length}`;
      }
    }
    
    // Go to specific slide
    function goToSlide(index) {
      // Remove active from all slides
      slides.forEach(slide => slide.classList.remove('active'));
      
      // Set new slide
      currentSlide = index;
      if (currentSlide >= slides.length) currentSlide = 0;
      if (currentSlide < 0) currentSlide = slides.length - 1;
      
      // Activate new slide
      slides[currentSlide].classList.add('active');
      updatePagination();
    }
    
    // Next slide
    function nextSlide() {
      goToSlide(currentSlide + 1);
    }
    
    // Previous slide
    function prevSlide() {
      goToSlide(currentSlide - 1);
    }
    
    // Arrow click handlers
    if (nextArrow) {
      nextArrow.addEventListener('click', () => {
        nextSlide();
        resetAutoplay();
      });
    }
    
    if (prevArrow) {
      prevArrow.addEventListener('click', () => {
        prevSlide();
        resetAutoplay();
      });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        resetAutoplay();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        resetAutoplay();
      }
    });
    
    // Auto-advance slideshow
    function startAutoplay() {
      if (slides.length <= 1) return;
      
      slideInterval = setInterval(() => {
        nextSlide();
      }, SLIDE_DURATION);
    }
    
    function stopAutoplay() {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    }
    
    function resetAutoplay() {
      stopAutoplay();
      startAutoplay();
    }
    
    // Initialize pagination
    updatePagination();
    
    // Start autoplay
    startAutoplay();
    
    // Pause on hover
    const heroSlideshow = document.querySelector('.hero-slideshow');
    if (heroSlideshow) {
      heroSlideshow.addEventListener('mouseenter', stopAutoplay);
      heroSlideshow.addEventListener('mouseleave', startAutoplay);
    }
  }
  
  /**
   * Sidebar Interactions
   */
  function setupSidebarInteractions() {
    const sidebar = document.querySelector('.sidebar-menu');
    if (!sidebar) return;
    
    // Enhance hover effect with custom data
    sidebar.addEventListener('mouseenter', () => {
      sidebar.style.transition = 'background-color 0.3s ease';
    });
    
    // Active link tracking
    const navLinks = sidebar.querySelectorAll('.sidebar-nav-link');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      }
    });
  }
  
  /**
   * Side Clipped Note Interactions
   */
  function setupSideClippedNote() {
    const note = document.querySelector('.side-clipped-note');
    if (!note) return;
    
    // Click handler (can be customized)
    note.addEventListener('click', () => {
      // Default: scroll to top or open modal
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    // Pulse animation on page load
    setTimeout(() => {
      note.style.animation = 'pulse 2s ease-in-out';
    }, 1000);
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
        if (href === '#') {
          e.preventDefault();
          return;
        }
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          
          // Calculate offset
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
  
  /**
   * Reveal animations on scroll
   */
  function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll(
      '.addon-product-card, .addon-blog-card-small, .category-circle-button'
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
    
    animatedElements.forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = `opacity 0.6s ease ${index * 0.05}s, transform 0.6s ease ${index * 0.05}s`;
      observer.observe(el);
    });
  }
  
  /**
   * Category Circle Interactions
   */
  function setupCategoryCircles() {
    const circles = document.querySelectorAll('.category-circle-button');
    
    circles.forEach(circle => {
      circle.addEventListener('click', function() {
        const label = this.querySelector('.category-circle-label');
        if (label) {
          console.log('Category clicked:', label.textContent);
          // Category filtering handled by addon or routing
        }
      });
    });
  }
  
  /**
   * Responsive handling
   */
  function handleResize() {
    const width = window.innerWidth;
    
    // Mobile: disable autoplay
    if (width <= 768) {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    }
  }
  
  // Debounce utility
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
  
  window.addEventListener('resize', debounce(handleResize, 250));
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      setupScrollAnimations();
      setupCategoryCircles();
    });
  } else {
    init();
    setupScrollAnimations();
    setupCategoryCircles();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (slideInterval) {
      clearInterval(slideInterval);
    }
  });
  
})();
