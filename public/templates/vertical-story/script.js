/**
 * Vertical Story Template - Timeline & Scroll Animations
 * Version: 1.0.0
 * Handles scroll progress, reveal animations, and timeline tracking
 */

(function() {
  'use strict';
  
  let timelineProgress = null;
  let scrollRevealEnabled = true;
  
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    scrollRevealEnabled = storefront.dataset.scrollReveal !== 'no';
    
    setupTimeline();
    setupScrollReveal();
    updateTimelineProgress();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    console.log('Vertical Story: Template initialized');
  }
  
  /**
   * Setup timeline progress indicator
   */
  function setupTimeline() {
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    
    timelineProgress = document.createElement('div');
    timelineProgress.className = 'timeline-progress';
    
    timeline.appendChild(timelineProgress);
    document.body.appendChild(timeline);
  }
  
  /**
   * Update timeline progress based on scroll
   */
  function updateTimelineProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / scrollHeight) * 100;
    
    if (timelineProgress) {
      timelineProgress.style.height = `${Math.min(scrollPercent, 100)}%`;
    }
  }
  
  /**
   * Setup scroll reveal animations
   */
  function setupScrollReveal() {
    if (!scrollRevealEnabled) return;
    
    const chapters = document.querySelectorAll('.chapter');
    const products = document.querySelectorAll('.productCard, .addon-product-card');
    
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.2
    };
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);
    
    chapters.forEach(chapter => observer.observe(chapter));
    products.forEach(product => observer.observe(product));
  }
  
  /**
   * Handle scroll events
   */
  function handleScroll() {
    updateTimelineProgress();
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
