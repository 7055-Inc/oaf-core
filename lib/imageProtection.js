/**
 * Image Protection System
 * Provides invisible overlay protection and screenshot detection for images
 * SEO-friendly with bot detection
 */

export const initImageProtection = () => {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  // SEO Protection: Skip protection for search engine crawlers
  const isBot = /googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram/i.test(navigator.userAgent);
  if (isBot) {
    return; // Allow crawlers full access for SEO
  }

  // Check if already initialized
  if (window.imageProtectionInitialized) {
    return;
  }
  window.imageProtectionInitialized = true;

  // Initialize protection systems
  addImageOverlays();
  addScreenshotProtection();
  addKeyboardProtection();
  addContextMenuProtection();
  addDragProtection();
  // addDevToolsDetection(); // Disabled - causes bad UX with blurring
};

/**
 * Add invisible overlays to all images
 */
const addImageOverlays = () => {
  const processImages = () => {
    const images = document.querySelectorAll('img:not([data-protected])');
    
    images.forEach(img => {
      // Skip if already processed
      if (img.dataset.protected) return;
      
      // Mark as processed
      img.dataset.protected = 'true';
      
      // Ensure parent has relative positioning
      const parent = img.parentElement;
      if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      // Create invisible overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        z-index: 999;
        pointer-events: all;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      `;
      
      // Prevent all interactions on overlay
      overlay.addEventListener('contextmenu', e => e.preventDefault());
      overlay.addEventListener('dragstart', e => e.preventDefault());
      overlay.addEventListener('selectstart', e => e.preventDefault());
      
      // Insert overlay after image
      img.insertAdjacentElement('afterend', overlay);
      
      // Protect the image itself (but keep pointer events for loading)
      img.style.userSelect = 'none';
      img.style.webkitUserSelect = 'none';
      img.style.mozUserSelect = 'none';
      img.style.msUserSelect = 'none';
      img.draggable = false;
      
      // Only disable pointer events after image loads
      if (img.complete) {
        img.style.pointerEvents = 'none';
      } else {
        img.addEventListener('load', () => {
          img.style.pointerEvents = 'none';
        });
        img.addEventListener('error', () => {
          // Don't disable pointer events if image failed to load
        });
      }
    });
  };

  // Process existing images
  processImages();
  
  // Watch for new images (dynamic content)
  const observer = new MutationObserver(() => {
    processImages();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

/**
 * Screenshot protection - hide images during suspicious activity
 */
const addScreenshotProtection = () => {
  let isHidden = false;
  
  const hideImages = () => {
    if (isHidden) return;
    isHidden = true;
    
    document.querySelectorAll('img').forEach(img => {
      img.style.visibility = 'hidden';
      img.style.opacity = '0';
    });
  };
  
  const showImages = () => {
    if (!isHidden) return;
    isHidden = false;
    
    setTimeout(() => {
      document.querySelectorAll('img').forEach(img => {
        img.style.visibility = 'visible';
        img.style.opacity = '1';
      });
    }, 1000); // Delay to prevent quick screenshots
  };
  
  // Page visibility change (tab switching, alt-tab)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hideImages();
    } else {
      showImages();
    }
  });
  
  // Window blur (switching applications)
  window.addEventListener('blur', hideImages);
  window.addEventListener('focus', showImages);
  
  // Screen recording detection (modern browsers)
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = function(...args) {
      hideImages();
      return originalGetDisplayMedia.apply(this, args);
    };
  }
};

/**
 * Keyboard shortcut protection
 */
const addKeyboardProtection = () => {
  document.addEventListener('keydown', (e) => {
    // Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      hideImagesTemporarily();
      return false;
    }
    
    // Ctrl+Shift+S (Chrome screenshot)
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      hideImagesTemporarily();
      return false;
    }
    
    // Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+S (Save Page)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      return false;
    }
  });
  
  const hideImagesTemporarily = () => {
    document.querySelectorAll('img').forEach(img => {
      img.style.visibility = 'hidden';
    });
    
    setTimeout(() => {
      document.querySelectorAll('img').forEach(img => {
        img.style.visibility = 'visible';
      });
    }, 2000);
  };
};

/**
 * Context menu protection
 */
const addContextMenuProtection = () => {
  document.addEventListener('contextmenu', (e) => {
    // Allow context menu on non-image elements for usability
    if (e.target.tagName === 'IMG' || e.target.closest('[data-protected]')) {
      e.preventDefault();
      return false;
    }
  });
};

/**
 * Drag and drop protection
 */
const addDragProtection = () => {
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  });
  
  // Prevent drag on all images
  document.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
};

/**
 * Basic developer tools detection
 */
const addDevToolsDetection = () => {
  let devtools = {
    open: false,
    orientation: null
  };
  
  const threshold = 160;
  
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        // Hide images when devtools detected
        document.querySelectorAll('img').forEach(img => {
          img.style.filter = 'blur(20px)';
        });
      }
    } else {
      if (devtools.open) {
        devtools.open = false;
        // Restore images when devtools closed
        document.querySelectorAll('img').forEach(img => {
          img.style.filter = 'none';
        });
      }
    }
  }, 500);
};

// Auto-initialize if window is available (browser environment)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageProtection);
  } else {
    initImageProtection();
  }
}
