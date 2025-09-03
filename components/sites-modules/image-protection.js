/**
 * Image Protection Addon
 * Protects images from unauthorized downloading with invisible overlays and screenshot detection
 */

class ImageProtectionAddon {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
    this.initialized = false;
  }

  /**
   * Initialize the image protection addon
   */
  init() {
    if (this.initialized) return;
    
    console.log('Image Protection Addon: Initializing...');
    
    // Import and activate the core image protection system
    this.loadImageProtection();
    
    this.initialized = true;
    console.log('Image Protection Addon: Ready - Images are now protected');
  }

  /**
   * Load the core image protection functionality
   */
  async loadImageProtection() {
    try {
      // Dynamic import of the core protection logic
      const { initImageProtection } = await import('../../lib/imageProtection.js');
      
      // Initialize protection for this site
      initImageProtection();
      
    } catch (error) {
      console.error('Image Protection Addon: Failed to load protection system:', error);
    }
  }

  /**
   * Get addon status and configuration
   */
  getStatus() {
    return {
      initialized: this.initialized,
      siteId: this.siteConfig?.siteId,
      protectionActive: typeof window !== 'undefined' && window.imageProtectionInitialized
    };
  }

  /**
   * Cleanup function (called when addon is deactivated)
   */
  destroy() {
    if (typeof window !== 'undefined' && window.imageProtectionInitialized) {
      // Reset protection state
      window.imageProtectionInitialized = false;
      
      // Remove any protection overlays
      document.querySelectorAll('[data-protected]').forEach(img => {
        img.removeAttribute('data-protected');
        img.style.userSelect = '';
        img.style.webkitUserSelect = '';
        img.style.mozUserSelect = '';
        img.style.msUserSelect = '';
        img.style.pointerEvents = '';
        img.draggable = true;
      });
      
      // Remove overlays
      document.querySelectorAll('div[style*="z-index: 999"]').forEach(overlay => {
        overlay.remove();
      });
      
      console.log('Image Protection Addon: Protection removed');
    }
    
    this.initialized = false;
  }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  window.ImageProtectionAddon = ImageProtectionAddon;
}

export default ImageProtectionAddon;
