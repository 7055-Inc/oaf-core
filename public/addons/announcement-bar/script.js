// Announcement Bar Addon
// Top message strip with optional countdown timer and dismissible functionality
(function() {
  'use strict';
  
  console.log('[Addon] Announcement Bar loaded');
  
  // Load styles
  const loadStyles = function() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/addons/announcement-bar/styles.css';
    document.head.appendChild(link);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStyles);
  } else {
    loadStyles();
  }
  
  // Configuration
  const CONFIG = {
    message: 'Special offer - Free shipping on all orders!',
    link: null,                    // Optional link URL
    linkText: 'Shop Now',          // Link button text
    backgroundColor: '#055474',    // Bar background color
    textColor: '#ffffff',          // Text color
    buttonColor: '#ffffff',        // Button/link color
    buttonTextColor: '#055474',    // Button text color
    position: 'top',               // 'top' or 'bottom'
    sticky: true,                  // Sticky positioning
    dismissible: true,             // Show close button
    persistDismiss: true,          // Remember dismiss across sessions
    dismissKey: 'announcement-bar-dismissed', // localStorage key
    showCountdown: false,          // Show countdown timer
    countdownEndDate: null,        // Date string (e.g., '2026-12-31T23:59:59')
    countdownFormat: '{d}D | {h}H | {m}M | {s}S', // Timer format
    hideAfterCountdown: true,      // Hide bar when countdown ends
    animateIn: true,               // Slide in animation
    animationDuration: 500         // Animation duration in ms
  };
  
  let countdownInterval = null;
  let announcementBar = null;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Load custom configuration
    loadCustomConfig();
    
    // Check if dismissed
    if (CONFIG.dismissible && CONFIG.persistDismiss && isDismissed()) {
      console.log('[Addon] Announcement Bar: Previously dismissed');
      return;
    }
    
    // Check if countdown has ended
    if (CONFIG.showCountdown && CONFIG.countdownEndDate && hasCountdownEnded()) {
      if (CONFIG.hideAfterCountdown) {
        console.log('[Addon] Announcement Bar: Countdown ended');
        return;
      }
    }
    
    // Create and render announcement bar
    announcementBar = createAnnouncementBar();
    document.body.appendChild(announcementBar);
    
    // Adjust body padding if sticky
    if (CONFIG.sticky) {
      adjustBodyPadding();
    }
    
    // Start countdown if enabled
    if (CONFIG.showCountdown && CONFIG.countdownEndDate) {
      startCountdown();
    }
    
    console.log('[Addon] Announcement Bar initialized');
  }
  
  function loadCustomConfig() {
    // Check for global configuration
    if (window.announcementBarConfig) {
      Object.assign(CONFIG, window.announcementBarConfig);
      console.log('[Addon] Announcement Bar: Custom config loaded');
    }
    
    // Check for data attributes on body
    const body = document.body;
    
    if (body.dataset.announcementMessage) {
      CONFIG.message = body.dataset.announcementMessage;
    }
    
    if (body.dataset.announcementLink) {
      CONFIG.link = body.dataset.announcementLink;
    }
    
    if (body.dataset.announcementLinkText) {
      CONFIG.linkText = body.dataset.announcementLinkText;
    }
    
    if (body.dataset.announcementBgColor) {
      CONFIG.backgroundColor = body.dataset.announcementBgColor;
    }
    
    if (body.dataset.announcementTextColor) {
      CONFIG.textColor = body.dataset.announcementTextColor;
    }
    
    if (body.dataset.announcementCountdownEnd) {
      CONFIG.showCountdown = true;
      CONFIG.countdownEndDate = body.dataset.announcementCountdownEnd;
    }
    
    if (body.dataset.announcementDismissible !== undefined) {
      CONFIG.dismissible = body.dataset.announcementDismissible === 'true';
    }
  }
  
  function createAnnouncementBar() {
    const bar = document.createElement('div');
    bar.className = 'announcement-bar';
    bar.classList.add(`announcement-${CONFIG.position}`);
    
    if (CONFIG.sticky) {
      bar.classList.add('announcement-sticky');
    }
    
    if (CONFIG.animateIn) {
      bar.classList.add('announcement-animate-in');
    }
    
    // Apply custom colors
    bar.style.backgroundColor = CONFIG.backgroundColor;
    bar.style.color = CONFIG.textColor;
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'announcement-content';
    
    // Add message
    const message = document.createElement('span');
    message.className = 'announcement-message';
    message.textContent = CONFIG.message;
    content.appendChild(message);
    
    // Add countdown if enabled
    if (CONFIG.showCountdown && CONFIG.countdownEndDate) {
      const countdown = document.createElement('span');
      countdown.className = 'announcement-countdown';
      countdown.id = 'announcement-countdown';
      content.appendChild(countdown);
    }
    
    // Add link/button if provided
    if (CONFIG.link) {
      const link = document.createElement('a');
      link.href = CONFIG.link;
      link.className = 'announcement-button';
      link.textContent = CONFIG.linkText;
      link.style.backgroundColor = CONFIG.buttonColor;
      link.style.color = CONFIG.buttonTextColor;
      content.appendChild(link);
    }
    
    bar.appendChild(content);
    
    // Add close button if dismissible
    if (CONFIG.dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'announcement-close';
      closeBtn.setAttribute('aria-label', 'Close announcement');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.color = CONFIG.textColor;
      closeBtn.addEventListener('click', dismissBar);
      bar.appendChild(closeBtn);
    }
    
    return bar;
  }
  
  function adjustBodyPadding() {
    // Wait for bar to render to get actual height
    requestAnimationFrame(() => {
      if (!announcementBar) return;
      
      const barHeight = announcementBar.offsetHeight;
      const property = CONFIG.position === 'top' ? 'paddingTop' : 'paddingBottom';
      const currentPadding = parseInt(window.getComputedStyle(document.body)[property]) || 0;
      document.body.style[property] = `${currentPadding + barHeight}px`;
      
      // Store original padding for cleanup
      announcementBar.dataset.originalPadding = currentPadding;
    });
  }
  
  function removeBodyPadding() {
    if (!announcementBar) return;
    
    const property = CONFIG.position === 'top' ? 'paddingTop' : 'paddingBottom';
    const originalPadding = parseInt(announcementBar.dataset.originalPadding) || 0;
    document.body.style[property] = `${originalPadding}px`;
  }
  
  function dismissBar() {
    if (!announcementBar) return;
    
    // Animate out
    announcementBar.classList.add('announcement-dismiss');
    
    // Remove after animation
    setTimeout(() => {
      if (announcementBar && announcementBar.parentNode) {
        announcementBar.parentNode.removeChild(announcementBar);
        removeBodyPadding();
      }
      
      // Stop countdown
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    }, 300);
    
    // Save dismiss state
    if (CONFIG.persistDismiss) {
      setDismissed();
    }
  }
  
  function isDismissed() {
    try {
      return localStorage.getItem(CONFIG.dismissKey) === 'true';
    } catch (e) {
      return false;
    }
  }
  
  function setDismissed() {
    try {
      localStorage.setItem(CONFIG.dismissKey, 'true');
    } catch (e) {
      console.warn('[Addon] Announcement Bar: localStorage not available');
    }
  }
  
  function hasCountdownEnded() {
    const endDate = new Date(CONFIG.countdownEndDate);
    return new Date() >= endDate;
  }
  
  function startCountdown() {
    updateCountdown(); // Update immediately
    
    countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);
  }
  
  function updateCountdown() {
    const countdownEl = document.getElementById('announcement-countdown');
    if (!countdownEl) return;
    
    const endDate = new Date(CONFIG.countdownEndDate);
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
      // Countdown ended
      clearInterval(countdownInterval);
      countdownEl.textContent = 'Offer Ended';
      
      if (CONFIG.hideAfterCountdown) {
        setTimeout(() => dismissBar(), 2000);
      }
      return;
    }
    
    // Calculate time units
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Format countdown
    let formatted = CONFIG.countdownFormat
      .replace('{d}', days)
      .replace('{h}', String(hours).padStart(2, '0'))
      .replace('{m}', String(minutes).padStart(2, '0'))
      .replace('{s}', String(seconds).padStart(2, '0'));
    
    countdownEl.textContent = formatted;
  }
  
  // Export API for dynamic updates
  window.AnnouncementBarAddon = {
    show: function() {
      if (!announcementBar || announcementBar.parentNode) {
        init();
      }
    },
    hide: function() {
      dismissBar();
    },
    clearDismissed: function() {
      try {
        localStorage.removeItem(CONFIG.dismissKey);
      } catch (e) {
        console.warn('[Addon] Announcement Bar: localStorage not available');
      }
    },
    updateMessage: function(message) {
      CONFIG.message = message;
      if (announcementBar) {
        const messageEl = announcementBar.querySelector('.announcement-message');
        if (messageEl) messageEl.textContent = message;
      }
    },
    setConfig: function(newConfig) {
      Object.assign(CONFIG, newConfig);
      if (announcementBar && announcementBar.parentNode) {
        dismissBar();
        setTimeout(() => init(), 400);
      }
    },
    getConfig: function() {
      return { ...CONFIG };
    }
  };
  
})();
