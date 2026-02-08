/**
 * Dark Mode Gallery Template - Theme Toggle System
 * Version: 1.0.0
 * Author: Artist Sites
 * 
 * Handles automatic theme detection, manual theme toggle, and theme persistence
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'artist-site-theme';
  const THEME_ATTR = 'data-theme';
  
  /**
   * Initialize theme system
   */
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    // Get default theme from template settings
    const defaultTheme = storefront.getAttribute('data-default-theme') || 'dark';
    
    // Determine initial theme
    let theme;
    if (defaultTheme === 'auto') {
      theme = getSystemPreference();
    } else {
      // Check localStorage first, then use default
      theme = localStorage.getItem(STORAGE_KEY) || defaultTheme;
    }
    
    // Apply initial theme
    applyTheme(theme);
    
    // Create theme toggle button
    createToggleButton();
    
    // Listen for system theme changes if auto mode
    if (defaultTheme === 'auto') {
      watchSystemPreference();
    }
    
    console.log('Dark Mode Gallery: Theme system initialized');
  }
  
  /**
   * Get system color scheme preference
   */
  function getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  
  /**
   * Apply theme to storefront
   */
  function applyTheme(theme) {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    storefront.setAttribute(THEME_ATTR, theme);
    
    // Update meta theme-color for mobile browsers
    updateMetaTheme(theme);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, theme);
    
    // Update toggle button icon
    updateToggleIcon(theme);
  }
  
  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    const currentTheme = storefront.getAttribute(THEME_ATTR) || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme(newTheme);
  }
  
  /**
   * Create floating theme toggle button
   */
  function createToggleButton() {
    // Check if button already exists
    if (document.querySelector('.theme-toggle')) return;
    
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle theme');
    button.setAttribute('title', 'Toggle light/dark mode');
    
    // Set initial icon
    const storefront = document.querySelector('.storefront');
    const currentTheme = storefront ? storefront.getAttribute(THEME_ATTR) : 'dark';
    button.innerHTML = getThemeIcon(currentTheme);
    
    // Add click handler
    button.addEventListener('click', toggleTheme);
    
    // Add to page
    document.body.appendChild(button);
  }
  
  /**
   * Get icon for theme
   */
  function getThemeIcon(theme) {
    if (theme === 'dark') {
      return '☀️'; // Sun icon for switching to light
    }
    return '🌙'; // Moon icon for switching to dark
  }
  
  /**
   * Update toggle button icon
   */
  function updateToggleIcon(theme) {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    
    button.innerHTML = getThemeIcon(theme);
    button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
  
  /**
   * Update meta theme-color for mobile browsers
   */
  function updateMetaTheme(theme) {
    let metaTag = document.querySelector('meta[name="theme-color"]');
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTag);
    }
    
    const color = theme === 'dark' ? '#0a0a0a' : '#ffffff';
    metaTag.setAttribute('content', color);
  }
  
  /**
   * Watch for system theme preference changes
   */
  function watchSystemPreference() {
    if (!window.matchMedia) return;
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Modern browsers
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
      });
    }
    // Older browsers
    else if (darkModeQuery.addListener) {
      darkModeQuery.addListener((e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
      });
    }
  }
  
  /**
   * Add keyboard shortcut (Ctrl/Cmd + Shift + D)
   */
  function setupKeyboardShortcut() {
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + Shift + D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      setupKeyboardShortcut();
    });
  } else {
    init();
    setupKeyboardShortcut();
  }
  
})();
