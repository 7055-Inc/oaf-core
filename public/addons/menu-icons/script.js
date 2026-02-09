// Menu Icons Addon
// Adds customizable icons to navigation menu items
(function() {
  'use strict';
  
  console.log('[Addon] Menu Icons loaded');
  
  // Load styles
  const loadStyles = function() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/addons/menu-icons/styles.css';
    document.head.appendChild(link);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStyles);
  } else {
    loadStyles();
  }
  
  // Configuration
  const CONFIG = {
    iconPosition: 'left',        // 'left' or 'right' of text
    iconSize: '18px',            // Default icon size
    iconSpacing: '8px',          // Space between icon and text
    animateOnHover: true,        // Enable hover animations
    defaultIconLibrary: 'emoji'  // 'emoji', 'fontawesome', 'svg', 'url'
  };
  
  // Icon configurations - can be overridden via window.menuIconsConfig
  let iconConfigs = {
    // Default configurations (examples)
    'Home': { icon: '🏠', position: 'left' },
    'Gallery': { icon: '🎨', position: 'left' },
    'Shop': { icon: '🛍️', position: 'left' },
    'About': { icon: 'ℹ️', position: 'left' },
    'Contact': { icon: '✉️', position: 'left' },
    'Blog': { icon: '📝', position: 'left' },
    'Cart': { icon: '🛒', position: 'left' }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Load custom configuration if provided
    loadCustomConfig();
    
    // Find navigation elements
    const navSelectors = [
      '.navigation',
      '.site-nav',
      'nav.nav',
      'header nav',
      '.menu',
      '[role="navigation"]'
    ];
    
    let navElement = null;
    for (const selector of navSelectors) {
      navElement = document.querySelector(selector);
      if (navElement) break;
    }
    
    if (!navElement) {
      console.warn('[Addon] Menu Icons: Navigation element not found');
      return;
    }
    
    // Apply icons to menu items
    applyIconsToMenu(navElement);
    
    console.log('[Addon] Menu Icons initialized');
  }
  
  function loadCustomConfig() {
    // Check for global configuration
    if (window.menuIconsConfig) {
      iconConfigs = { ...iconConfigs, ...window.menuIconsConfig };
      console.log('[Addon] Menu Icons: Custom config loaded');
    }
    
    // Check for data attributes on body
    const body = document.body;
    
    if (body.dataset.menuIconPosition) {
      CONFIG.iconPosition = body.dataset.menuIconPosition;
    }
    
    if (body.dataset.menuIconSize) {
      CONFIG.iconSize = body.dataset.menuIconSize;
    }
    
    if (body.dataset.menuIconSpacing) {
      CONFIG.iconSpacing = body.dataset.menuIconSpacing;
    }
    
    // Check for JSON config in meta tag
    const metaConfig = document.querySelector('meta[name="menu-icons-config"]');
    if (metaConfig && metaConfig.content) {
      try {
        const jsonConfig = JSON.parse(metaConfig.content);
        iconConfigs = { ...iconConfigs, ...jsonConfig };
        console.log('[Addon] Menu Icons: Meta config loaded');
      } catch (e) {
        console.error('[Addon] Menu Icons: Failed to parse meta config', e);
      }
    }
  }
  
  function applyIconsToMenu(navElement) {
    const links = navElement.querySelectorAll('a');
    
    links.forEach(link => {
      const linkText = link.textContent.trim();
      const config = findIconConfig(linkText, link);
      
      if (config && config.icon) {
        addIconToLink(link, config);
      }
    });
  }
  
  function findIconConfig(linkText, link) {
    // Check data attribute first
    if (link.dataset.icon) {
      return {
        icon: link.dataset.icon,
        position: link.dataset.iconPosition || CONFIG.iconPosition,
        type: link.dataset.iconType || 'emoji'
      };
    }
    
    // Check exact match
    if (iconConfigs[linkText]) {
      return iconConfigs[linkText];
    }
    
    // Check case-insensitive match
    const lowerText = linkText.toLowerCase();
    for (const [key, config] of Object.entries(iconConfigs)) {
      if (key.toLowerCase() === lowerText) {
        return config;
      }
    }
    
    // Check partial match
    for (const [key, config] of Object.entries(iconConfigs)) {
      if (lowerText.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerText)) {
        return config;
      }
    }
    
    return null;
  }
  
  function addIconToLink(link, config) {
    const icon = config.icon;
    const position = config.position || CONFIG.iconPosition;
    const type = config.type || detectIconType(icon);
    
    // Create icon element
    const iconElement = createIconElement(icon, type);
    
    if (!iconElement) return;
    
    // Add class to link
    link.classList.add('has-menu-icon', `icon-${position}`);
    
    // Insert icon
    if (position === 'right') {
      link.appendChild(iconElement);
    } else {
      link.insertBefore(iconElement, link.firstChild);
    }
  }
  
  function detectIconType(icon) {
    if (icon.startsWith('fa-') || icon.startsWith('fas ') || icon.startsWith('far ')) {
      return 'fontawesome';
    } else if (icon.startsWith('<svg')) {
      return 'svg';
    } else if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
      return 'url';
    } else {
      return 'emoji';
    }
  }
  
  function createIconElement(icon, type) {
    let element;
    
    switch (type) {
      case 'emoji':
        element = document.createElement('span');
        element.className = 'menu-icon menu-icon-emoji';
        element.textContent = icon;
        element.setAttribute('aria-hidden', 'true');
        break;
        
      case 'fontawesome':
        element = document.createElement('i');
        element.className = `menu-icon menu-icon-fa ${icon}`;
        element.setAttribute('aria-hidden', 'true');
        break;
        
      case 'svg':
        const wrapper = document.createElement('span');
        wrapper.className = 'menu-icon menu-icon-svg';
        wrapper.innerHTML = icon;
        wrapper.setAttribute('aria-hidden', 'true');
        element = wrapper;
        break;
        
      case 'url':
        element = document.createElement('img');
        element.className = 'menu-icon menu-icon-image';
        element.src = icon;
        element.alt = '';
        element.setAttribute('aria-hidden', 'true');
        break;
        
      default:
        console.warn('[Addon] Menu Icons: Unknown icon type', type);
        return null;
    }
    
    return element;
  }
  
  // Export API for dynamic updates
  window.MenuIconsAddon = {
    refresh: function() {
      const nav = document.querySelector('.navigation, .site-nav, nav.nav, header nav, .menu');
      if (nav) {
        // Remove existing icons
        nav.querySelectorAll('.menu-icon').forEach(icon => icon.remove());
        nav.querySelectorAll('.has-menu-icon').forEach(link => {
          link.classList.remove('has-menu-icon', 'icon-left', 'icon-right');
        });
        // Reapply icons
        applyIconsToMenu(nav);
      }
    },
    setConfig: function(newConfig) {
      iconConfigs = { ...iconConfigs, ...newConfig };
      this.refresh();
    },
    getConfig: function() {
      return { ...iconConfigs };
    }
  };
  
})();
