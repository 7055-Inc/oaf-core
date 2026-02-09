// Side Clipped Note Addon
// Floating tab on page edge that slides in on hover
(function() {
  'use strict';
  
  console.log('[Addon] Side Clipped Note loaded');
  
  // Load styles
  const loadStyles = function() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/addons/side-clipped-note/styles.css';
    document.head.appendChild(link);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStyles);
  } else {
    loadStyles();
  }
  
  let clippedNote = null;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  async function init() {
    // Get subdomain from URL
    const subdomain = getSubdomain();
    if (!subdomain) {
      console.warn('[Addon] Side Clipped Note: Could not determine subdomain');
      return;
    }
    
    // Fetch clipped note
    try {
      const noteData = await fetchClippedNote(subdomain);
      if (noteData && noteData.note) {
        renderClippedNote(noteData.note);
        console.log('[Addon] Side Clipped Note initialized');
      } else {
        console.log('[Addon] Side Clipped Note: No note configured');
      }
    } catch (err) {
      console.error('[Addon] Side Clipped Note: Failed to fetch note', err);
    }
  }
  
  function getSubdomain() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Check if it's a subdomain (not root domain)
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0];
    }
    
    // Check for custom domain - might be stored in meta tag
    const metaSubdomain = document.querySelector('meta[name="site-subdomain"]');
    if (metaSubdomain && metaSubdomain.content) {
      return metaSubdomain.content;
    }
    
    return null;
  }
  
  async function fetchClippedNote(subdomain) {
    const apiBase = window.location.origin;
    const response = await fetch(`${apiBase}/api/v2/websites/resolve/${subdomain}/clipped-note`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch clipped note: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  }
  
  function renderClippedNote(noteData) {
    const { title, message, position, background_color, text_color, action_type, action_value } = noteData;
    
    // Create container
    const container = document.createElement('div');
    container.className = `clipped-note clipped-note-${position}`;
    container.style.backgroundColor = background_color;
    container.style.color = text_color;
    
    // Create tab (visible when collapsed)
    const tab = document.createElement('div');
    tab.className = 'clipped-note-tab';
    tab.textContent = title;
    
    // Create content panel (slides in)
    const panel = document.createElement('div');
    panel.className = 'clipped-note-panel';
    
    // Add title to panel
    const panelTitle = document.createElement('div');
    panelTitle.className = 'clipped-note-panel-title';
    panelTitle.textContent = title;
    panel.appendChild(panelTitle);
    
    // Add message to panel
    const panelMessage = document.createElement('div');
    panelMessage.className = 'clipped-note-panel-message';
    panelMessage.textContent = message;
    panel.appendChild(panelMessage);
    
    // Add action button if configured
    if (action_type !== 'none' && action_value) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'clipped-note-action-btn';
      actionBtn.style.borderColor = text_color;
      actionBtn.style.color = text_color;
      
      switch (action_type) {
        case 'link':
          actionBtn.textContent = 'Learn More';
          actionBtn.addEventListener('click', () => {
            window.location.href = action_value;
          });
          break;
        case 'scroll':
          actionBtn.textContent = 'Go There';
          actionBtn.addEventListener('click', () => {
            const target = document.querySelector(action_value);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          });
          break;
        case 'modal':
          actionBtn.textContent = 'Read More';
          actionBtn.addEventListener('click', () => {
            showModal(title, action_value);
          });
          break;
      }
      
      panel.appendChild(actionBtn);
    }
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'clipped-note-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.color = text_color;
    closeBtn.setAttribute('aria-label', 'Close note');
    closeBtn.addEventListener('click', () => {
      container.classList.remove('open');
    });
    panel.appendChild(closeBtn);
    
    // Assemble container
    container.appendChild(tab);
    container.appendChild(panel);
    
    // Add event listeners
    tab.addEventListener('click', () => {
      container.classList.toggle('open');
    });
    
    // Hover to expand (desktop only)
    if (window.matchMedia('(min-width: 769px)').matches) {
      container.addEventListener('mouseenter', () => {
        container.classList.add('open');
      });
      
      container.addEventListener('mouseleave', () => {
        container.classList.remove('open');
      });
    }
    
    // Insert into page
    document.body.appendChild(container);
    
    clippedNote = container;
  }
  
  function showModal(title, content) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'clipped-note-modal-overlay';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'clipped-note-modal';
    
    // Modal title
    const modalTitle = document.createElement('h3');
    modalTitle.className = 'clipped-note-modal-title';
    modalTitle.textContent = title;
    modal.appendChild(modalTitle);
    
    // Modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'clipped-note-modal-content';
    modalContent.textContent = content;
    modal.appendChild(modalContent);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'clipped-note-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
    modal.appendChild(closeBtn);
    
    // Assemble and add to page
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Export API for dynamic updates
  window.SideClippedNoteAddon = {
    refresh: async function() {
      if (clippedNote && clippedNote.parentNode) {
        clippedNote.parentNode.removeChild(clippedNote);
        clippedNote = null;
      }
      await init();
    },
    show: function() {
      if (clippedNote) {
        clippedNote.classList.add('open');
      }
    },
    hide: function() {
      if (clippedNote) {
        clippedNote.classList.remove('open');
      }
    },
    toggle: function() {
      if (clippedNote) {
        clippedNote.classList.toggle('open');
      }
    }
  };
  
})();
