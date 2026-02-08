/**
 * Split Screen Template - Interactive Divider System
 * Version: 1.0.0
 * Author: Artist Sites
 * 
 * Handles draggable split divider for dual-panel layout
 */

(function() {
  'use strict';
  
  let isDragging = false;
  let splitContainer = null;
  let divider = null;
  let leftPanel = null;
  let rightPanel = null;
  let orientation = 'vertical';
  let allowResize = true;
  
  /**
   * Initialize split screen system
   */
  function init() {
    const storefront = document.querySelector('.storefront');
    if (!storefront) return;
    
    // Get settings
    orientation = storefront.getAttribute('data-split-orientation') || 'vertical';
    allowResize = storefront.getAttribute('data-allow-resize') !== 'no';
    const defaultSplit = parseInt(storefront.getAttribute('data-default-split')) || 50;
    
    // Build split structure
    buildSplitLayout();
    
    // Set initial split position
    setSplitPosition(defaultSplit);
    
    // Setup drag handlers if allowed
    if (allowResize) {
      setupDragHandlers();
    }
    
    console.log('Split Screen: Layout initialized');
  }
  
  /**
   * Build split layout structure
   */
  function buildSplitLayout() {
    const storefront = document.querySelector('.storefront');
    const header = storefront.querySelector('.header');
    
    // Create split container
    splitContainer = document.createElement('div');
    splitContainer.className = 'split-container';
    
    // Create left/top panel
    leftPanel = document.createElement('div');
    leftPanel.className = 'split-panel split-panel-left split-panel-primary';
    
    // Create divider
    divider = document.createElement('div');
    divider.className = 'split-divider';
    
    // Create right/bottom panel
    rightPanel = document.createElement('div');
    rightPanel.className = 'split-panel split-panel-right split-panel-secondary';
    
    // Move existing content into panels
    const allContent = Array.from(storefront.children).filter(child => 
      child !== header && child.className !== 'split-container'
    );
    
    // Split content between panels (first half to left, second half to right)
    const midpoint = Math.ceil(allContent.length / 2);
    allContent.forEach((child, index) => {
      if (index < midpoint) {
        leftPanel.appendChild(child);
      } else {
        rightPanel.appendChild(child);
      }
    });
    
    // Assemble split container
    splitContainer.appendChild(leftPanel);
    splitContainer.appendChild(divider);
    splitContainer.appendChild(rightPanel);
    
    // Add to storefront
    if (header) {
      storefront.insertBefore(splitContainer, header.nextSibling);
    } else {
      storefront.appendChild(splitContainer);
    }
  }
  
  /**
   * Set split position (percentage)
   */
  function setSplitPosition(percent) {
    if (!leftPanel || !rightPanel) return;
    
    // Clamp between 20-80%
    percent = Math.max(20, Math.min(80, percent));
    
    if (orientation === 'vertical') {
      leftPanel.style.width = `${percent}%`;
      rightPanel.style.width = `${100 - percent}%`;
    } else {
      leftPanel.style.height = `${percent}%`;
      rightPanel.style.height = `${100 - percent}%`;
    }
  }
  
  /**
   * Setup drag event handlers
   */
  function setupDragHandlers() {
    if (!divider) return;
    
    divider.addEventListener('mousedown', startDrag);
    divider.addEventListener('touchstart', startDrag, { passive: false });
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
  }
  
  /**
   * Start dragging
   */
  function startDrag(e) {
    if (!allowResize) return;
    
    e.preventDefault();
    isDragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = orientation === 'vertical' ? 'ew-resize' : 'ns-resize';
    
    // Disable text selection
    document.body.style.userSelect = 'none';
  }
  
  /**
   * Handle dragging
   */
  function drag(e) {
    if (!isDragging || !splitContainer) return;
    
    e.preventDefault();
    
    const rect = splitContainer.getBoundingClientRect();
    let percent;
    
    if (orientation === 'vertical') {
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      percent = (x / rect.width) * 100;
    } else {
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      percent = (y / rect.height) * 100;
    }
    
    setSplitPosition(percent);
  }
  
  /**
   * Stop dragging
   */
  function stopDrag() {
    if (!isDragging) return;
    
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
  
  /**
   * Handle window resize
   */
  function handleResize() {
    // Re-calculate on window resize if needed
    if (window.innerWidth <= 768) {
      // Mobile mode - disable drag
      isDragging = false;
      divider.classList.remove('dragging');
    }
  }
  
  window.addEventListener('resize', handleResize);
  
  /**
   * Keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (!allowResize) return;
      
      // Arrow keys to adjust split (Ctrl/Cmd + Arrow)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const currentPercent = getCurrentSplitPercent();
          setSplitPosition(currentPercent - 5);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const currentPercent = getCurrentSplitPercent();
          setSplitPosition(currentPercent + 5);
        } else if (e.key === '0') {
          // Reset to 50/50
          e.preventDefault();
          setSplitPosition(50);
        }
      }
    });
  }
  
  /**
   * Get current split percentage
   */
  function getCurrentSplitPercent() {
    if (!leftPanel || !splitContainer) return 50;
    
    const containerRect = splitContainer.getBoundingClientRect();
    const panelRect = leftPanel.getBoundingClientRect();
    
    if (orientation === 'vertical') {
      return (panelRect.width / containerRect.width) * 100;
    } else {
      return (panelRect.height / containerRect.height) * 100;
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      setupKeyboardShortcuts();
    });
  } else {
    init();
    setupKeyboardShortcuts();
  }
  
})();
