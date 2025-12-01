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
      
      // Skip non-product images (logos, UI elements, profile images, carousels)
      const src = img.src || '';
      const alt = img.alt || '';
      const className = img.className || '';
      
      // Skip header/footer logos
      if (src.includes('logo') || alt.toLowerCase().includes('logo')) {
        img.dataset.protected = 'skip';
        return;
      }
      
      // Skip profile images
      if (src.includes('/profiles/') || className.includes('profile') || alt.toLowerCase().includes('profile')) {
        img.dataset.protected = 'skip';
        return;
      }
      
      // Skip carousel/artist images (not product detail pages)
      if (className.includes('carousel') || className.includes('artist')) {
        img.dataset.protected = 'skip';
        return;
      }
      
      // Skip images in header/footer
      const inHeader = img.closest('header') !== null;
      const inFooter = img.closest('footer') !== null;
      if (inHeader || inFooter) {
        img.dataset.protected = 'skip';
        return;
      }
      
      // Mark as processed
      img.dataset.protected = 'true';
      
      // Get the parent element
      const parent = img.parentElement;
      
      // Create a wrapper for the image that will contain both the image and overlay
      const wrapper = document.createElement('div');
      wrapper.className = 'image-protection-wrapper';
      wrapper.dataset.imageProtection = 'true';
      
      // Wrapper should fill parent and not constrain the image layout
      wrapper.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        line-height: 0;
      `;
      
      // Insert wrapper before the image and move image into wrapper
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      
      // Create invisible overlay
      const overlay = document.createElement('div');
      overlay.className = 'image-protection-overlay';
      overlay.dataset.imageProtection = 'true';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        z-index: 10;
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
      
      // Add overlay to wrapper (after image)
      wrapper.appendChild(overlay);
      
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
  let hasBeenVisible = !document.hidden; // Track if page has been visible
  
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
    // Only block context menu on images or image protection overlays
    if (e.target.tagName === 'IMG' || 
        e.target.dataset.imageProtection === 'true' ||
        e.target.closest('[data-image-protection="true"]')) {
      e.preventDefault();
      return false;
    }
    // Allow context menu on all other elements
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
