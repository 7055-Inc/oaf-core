/**
 * Brakebee Behavior Tracker
 * 
 * Comprehensive client-side tracking for user behavior analytics.
 * Captures page views, engagement, frustration signals, and device info.
 * Sends events to /api/v2/behavior/track
 */

// Always track against production — no value in tracking staging traffic
const TRACKER_API_BASE = 'https://api.brakebee.com';

const getApiBase = () => {
  if (typeof window === 'undefined') return null;
  return TRACKER_API_BASE;
};

const API_ENDPOINT = () => {
  const base = getApiBase();
  return base ? `${base}/api/v2/behavior/track` : null;
};

const BATCH_ENDPOINT = () => {
  const base = getApiBase();
  return base ? `${base}/api/v2/behavior/track/batch` : null;
};

/**
 * URL Pattern Definitions for page type detection
 */
const PAGE_PATTERNS = [
  // Products & Commerce
  { pattern: /^\/products\/(\d+)/, type: 'product_view', category: 'commerce', idKey: 'product_id' },
  { pattern: /^\/products\/?$/, type: 'product_listing', category: 'navigation' },
  { pattern: /^\/new-arrivals/, type: 'new_arrivals', category: 'navigation' },
  { pattern: /^\/marketplace/, type: 'marketplace', category: 'navigation' },
  { pattern: /^\/collections/, type: 'collections', category: 'navigation' },
  
  // User Profiles
  { pattern: /^\/profile\/(\d+)/, type: 'profile_view', category: 'engagement', idKey: 'user_id' },
  { pattern: /^\/profile\/edit/, type: 'profile_edit', category: 'account' },
  
  // Artists
  { pattern: /^\/artist\/(\d+)\/products/, type: 'artist_products', category: 'engagement', idKey: 'artist_id' },
  { pattern: /^\/artists\/?$/, type: 'artist_listing', category: 'navigation' },
  
  // Promoters
  { pattern: /^\/promoters\/?$/, type: 'promoter_listing', category: 'navigation' },
  
  // Events
  { pattern: /^\/events\/(\d+)/, type: 'event_view', category: 'commerce', idKey: 'event_id' },
  { pattern: /^\/events\/?$/, type: 'event_listing', category: 'navigation' },
  { pattern: /^\/event-payment/, type: 'event_payment', category: 'commerce' },
  
  // Articles
  { pattern: /^\/articles\/author\/([^\/]+)/, type: 'author_articles', category: 'engagement', idKey: 'author_username' },
  { pattern: /^\/articles\/tag\/([^\/]+)/, type: 'tag_articles', category: 'engagement', idKey: 'tag_slug' },
  { pattern: /^\/articles\/([^\/]+)/, type: 'article_view', category: 'engagement', idKey: 'article_slug' },
  { pattern: /^\/articles\/?$/, type: 'article_listing', category: 'navigation' },
  
  // Topics & Series
  { pattern: /^\/topics\/([^\/]+)/, type: 'topic_view', category: 'engagement', idKey: 'topic_slug' },
  { pattern: /^\/series\/([^\/]+)/, type: 'series_view', category: 'engagement', idKey: 'series_slug' },
  
  // Categories
  { pattern: /^\/category\/(\d+)/, type: 'category_view', category: 'navigation', idKey: 'category_id' },
  
  // Search
  { pattern: /^\/search/, type: 'search_results', category: 'navigation' },
  
  // Cart & Checkout
  { pattern: /^\/cart/, type: 'cart_view', category: 'commerce' },
  { pattern: /^\/checkout\/success/, type: 'checkout_success', category: 'commerce' },
  { pattern: /^\/checkout/, type: 'checkout', category: 'commerce' },
  
  // Help Center
  { pattern: /^\/help\/tickets\/(\d+)/, type: 'ticket_view', category: 'support', idKey: 'ticket_id' },
  { pattern: /^\/help\/contact/, type: 'contact_page', category: 'support' },
  { pattern: /^\/help/, type: 'help_center', category: 'support' },
  
  // Dashboard
  { pattern: /^\/dashboard\/catalog/, type: 'dashboard_catalog', category: 'dashboard' },
  { pattern: /^\/dashboard\/commerce/, type: 'dashboard_commerce', category: 'dashboard' },
  { pattern: /^\/dashboard\/events/, type: 'dashboard_events', category: 'dashboard' },
  { pattern: /^\/dashboard\/users/, type: 'dashboard_account', category: 'dashboard' },
  { pattern: /^\/dashboard\/leo/, type: 'dashboard_leo', category: 'dashboard' },
  { pattern: /^\/dashboard/, type: 'dashboard_home', category: 'dashboard' },
  
  // Auth & Onboarding
  { pattern: /^\/login/, type: 'login_page', category: 'auth' },
  { pattern: /^\/signup/, type: 'signup_page', category: 'auth' },
  { pattern: /^\/logout/, type: 'logout', category: 'auth' },
  { pattern: /^\/forgot-password/, type: 'forgot_password', category: 'auth' },
  { pattern: /^\/user-type-selection/, type: 'user_type_selection', category: 'onboarding' },
  
  // Landing pages
  { pattern: /^\/makers/, type: 'makers_landing', category: 'marketing' },
  { pattern: /^\/promoter/, type: 'promoter_landing', category: 'marketing' },
  
  // Legal
  { pattern: /^\/policies/, type: 'policy_view', category: 'legal' },
  { pattern: /^\/terms/, type: 'terms_page', category: 'legal' },
  
  // Static
  { pattern: /^\/about/, type: 'about_page', category: 'navigation' },
  
  // Homepage (must be last)
  { pattern: /^\/$/, type: 'homepage', category: 'navigation' },
];

class BehaviorTracker {
  constructor() {
    this.queue = [];
    this.flushInterval = 5000;
    this.maxQueueSize = 20;
    this.sessionId = null;
    this.anonymousId = null;
    this.initialized = false;
    this.scrollDepths = [25, 50, 75, 90, 100];
    this.trackedScrollDepths = new Set();
    this.pageStartTime = null;
    this.visibleTime = 0;
    this.lastVisibleStart = null;
    this.deviceInfo = null;
    
    // Rage click detection
    this.clickTimes = [];
    this.rageClickThreshold = 3; // clicks
    this.rageClickWindow = 1000; // ms
    
    // Form tracking
    this.activeForm = null;
    this.formStartTime = null;
  }

  /**
   * Initialize the tracker with all tracking features
   */
  init(options = {}) {
    if (this.initialized || typeof window === 'undefined') return;

    this.sessionId = this.getOrCreateSessionId();
    this.anonymousId = this.getOrCreateAnonymousId();
    this.deviceInfo = this.getDeviceInfo();
    this.pageStartTime = Date.now();
    this.lastVisibleStart = Date.now();
    
    // Increment session count
    this.incrementSessionCount();

    // Auto-flush queue
    if (options.autoFlush !== false) {
      setInterval(() => this.flush(), this.flushInterval);
    }

    // Core tracking
    if (options.trackPageViews !== false) this.trackPageView();
    if (options.trackScroll !== false) this.initScrollTracking();
    if (options.trackTimeOnPage !== false) this.initTimeOnPageTracking();
    
    // Enhanced tracking
    this.initVisibilityTracking();      // Tab visibility (real engagement)
    this.initOutboundLinkTracking();    // Exit destinations
    this.initRageClickTracking();       // Frustration detection
    this.initDeadClickTracking();       // UX issues
    this.initCopyTracking();            // Interest signals
    this.initPrintTracking();           // High interest
    this.initErrorTracking();           // Technical issues
    this.initFormTracking();            // Conversion tracking

    this.initialized = true;
  }

  // ==========================================
  // SESSION & IDENTITY
  // ==========================================

  getOrCreateSessionId() {
    if (typeof sessionStorage === 'undefined') return this.generateId();
    let sessionId = sessionStorage.getItem('bb_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('bb_session_id', sessionId);
    }
    return sessionId;
  }

  getOrCreateAnonymousId() {
    if (typeof localStorage === 'undefined') return this.generateId();
    let anonId = localStorage.getItem('bb_anonymous_id');
    if (!anonId) {
      anonId = this.generateId();
      localStorage.setItem('bb_anonymous_id', anonId);
    }
    return anonId;
  }

  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  incrementSessionCount() {
    if (typeof localStorage === 'undefined') return;
    const count = parseInt(localStorage.getItem('bb_session_count') || '0', 10);
    localStorage.setItem('bb_session_count', String(count + 1));
  }

  getSessionCount() {
    if (typeof localStorage === 'undefined') return 1;
    return parseInt(localStorage.getItem('bb_session_count') || '1', 10);
  }

  // ==========================================
  // DEVICE & BROWSER INFO
  // ==========================================

  getDeviceInfo() {
    if (typeof window === 'undefined') return {};
    
    const ua = navigator.userAgent;
    
    // Device type
    let deviceType = 'desktop';
    if (/Mobile|Android|iPhone/.test(ua)) deviceType = 'mobile';
    else if (/iPad|Tablet/.test(ua)) deviceType = 'tablet';
    
    // Browser
    let browser = 'unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'safari';
    else if (ua.includes('Firefox')) browser = 'firefox';
    else if (ua.includes('Edg')) browser = 'edge';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'ie';
    
    // OS
    let deviceOs = 'unknown';
    if (ua.includes('Windows')) deviceOs = 'windows';
    else if (ua.includes('Mac')) deviceOs = 'macos';
    else if (ua.includes('Linux') && !ua.includes('Android')) deviceOs = 'linux';
    else if (ua.includes('Android')) deviceOs = 'android';
    else if (/iPhone|iPad|iPod/.test(ua)) deviceOs = 'ios';
    
    // Connection type (if available)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const connectionType = connection?.effectiveType || 'unknown';
    
    return {
      deviceType,
      browser,
      deviceOs,
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
      viewportWidth: window.innerWidth || 0,
      viewportHeight: window.innerHeight || 0,
      pixelRatio: window.devicePixelRatio || 1,
      language: navigator.language || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      connectionType,
      sessionCount: this.getSessionCount(),
      touchSupport: 'ontouchstart' in window,
    };
  }

  getUtmParams() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmTerm: params.get('utm_term') || '',
      utmContent: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',  // Google Ads
      fbclid: params.get('fbclid') || '', // Facebook
    };
  }

  // ==========================================
  // PAGE TYPE DETECTION
  // ==========================================

  detectPageType(path) {
    for (const { pattern, type, category, idKey } of PAGE_PATTERNS) {
      const match = path.match(pattern);
      if (match) {
        const result = { type, category };
        if (idKey && match[1]) {
          const id = /^\d+$/.test(match[1]) ? parseInt(match[1], 10) : match[1];
          result[idKey] = id;
        }
        return result;
      }
    }
    return { type: 'page_view', category: 'navigation' };
  }

  getQueryParams() {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const result = {};
    if (params.get('q') || params.get('query') || params.get('search')) {
      result.search_query = params.get('q') || params.get('query') || params.get('search');
    }
    if (params.get('category')) result.filter_category = params.get('category');
    if (params.get('sort')) result.sort_by = params.get('sort');
    if (params.get('page')) result.page_number = parseInt(params.get('page'), 10);
    return result;
  }

  // ==========================================
  // CORE TRACKING
  // ==========================================

  track(eventType, eventData = {}, options = {}) {
    if (typeof window === 'undefined') return;

    const event = {
      eventType,
      eventCategory: options.category || '',
      eventAction: options.action || eventType,
      eventData,
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      referrer: document.referrer,
      clientTimestamp: new Date().toISOString(),
      ...this.deviceInfo,
      ...this.getUtmParams(),
    };

    if (options.immediate) {
      this.sendEvent(event);
    } else {
      this.queue.push(event);
      if (this.queue.length >= this.maxQueueSize) {
        this.flush();
      }
    }
  }

  trackPageView(pageData = {}) {
    this.trackedScrollDepths.clear();
    this.pageStartTime = Date.now();
    this.lastVisibleStart = Date.now();
    this.visibleTime = 0;
    
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const detected = this.detectPageType(path);
    const queryParams = this.getQueryParams();
    
    this.track(detected.type, {
      title: typeof document !== 'undefined' ? document.title : '',
      ...detected,
      ...queryParams,
      ...pageData
    }, { category: detected.category });
  }

  trackRouteChange(newPath) {
    // Track time on previous page with visibility-adjusted time
    if (this.pageStartTime) {
      // Add any remaining visible time
      if (this.lastVisibleStart && document.visibilityState === 'visible') {
        this.visibleTime += Date.now() - this.lastVisibleStart;
      }
      
      const totalTime = Math.round((Date.now() - this.pageStartTime) / 1000);
      const engagedTime = Math.round(this.visibleTime / 1000);
      
      if (totalTime > 1) {
        this.track('time_on_page', { 
          seconds: totalTime,
          engaged_seconds: engagedTime,
          engagement_ratio: totalTime > 0 ? (engagedTime / totalTime).toFixed(2) : 0
        }, { immediate: true });
      }
    }
    
    // Reset for new page
    this.trackedScrollDepths.clear();
    this.pageStartTime = Date.now();
    this.lastVisibleStart = Date.now();
    this.visibleTime = 0;
    
    const detected = this.detectPageType(newPath);
    const queryParams = this.getQueryParams();
    
    this.track(detected.type, {
      title: typeof document !== 'undefined' ? document.title : '',
      ...detected,
      ...queryParams
    }, { category: detected.category });
  }

  // ==========================================
  // SCROLL TRACKING
  // ==========================================

  initScrollTracking() {
    if (typeof window === 'undefined') return;
    
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
          
          for (const depth of this.scrollDepths) {
            if (scrollPercent >= depth && !this.trackedScrollDepths.has(depth)) {
              this.trackedScrollDepths.add(depth);
              this.track('scroll', { scroll_depth: depth }, { category: 'engagement' });
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  // ==========================================
  // TIME ON PAGE & VISIBILITY
  // ==========================================

  initTimeOnPageTracking() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeunload', () => {
      if (this.pageStartTime) {
        // Calculate visibility-adjusted time
        if (this.lastVisibleStart && document.visibilityState === 'visible') {
          this.visibleTime += Date.now() - this.lastVisibleStart;
        }
        
        const totalTime = Math.round((Date.now() - this.pageStartTime) / 1000);
        const engagedTime = Math.round(this.visibleTime / 1000);
        
        this.track('time_on_page', {
          seconds: totalTime,
          engaged_seconds: engagedTime,
          exit_type: 'leave'
        }, { immediate: true });
      }
    });
  }

  initVisibilityTracking() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('visibilitychange', () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (isVisible) {
        // Tab became visible - start timing
        this.lastVisibleStart = Date.now();
      } else {
        // Tab became hidden - accumulate visible time
        if (this.lastVisibleStart) {
          this.visibleTime += Date.now() - this.lastVisibleStart;
          this.lastVisibleStart = null;
        }
      }
      
      this.track('visibility_change', {
        visible: isVisible,
        accumulated_visible_time: Math.round(this.visibleTime / 1000)
      }, { category: 'engagement' });
    });
  }

  // ==========================================
  // OUTBOUND LINK TRACKING (Exit Destinations)
  // ==========================================

  initOutboundLinkTracking() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('click', (e) => {
      // Find the closest anchor tag
      const link = e.target.closest('a');
      if (!link) return;
      
      const href = link.href;
      if (!href) return;
      
      try {
        const linkUrl = new URL(href);
        const currentHost = window.location.hostname;
        
        // Check if it's an external link
        if (linkUrl.hostname && linkUrl.hostname !== currentHost && !linkUrl.hostname.includes('brakebee')) {
          this.track('outbound_click', {
            destination_url: href,
            destination_domain: linkUrl.hostname,
            link_text: link.innerText?.substring(0, 100) || '',
            link_location: this.getElementPath(link)
          }, { category: 'navigation', immediate: true });
        }
      } catch (err) {
        // Invalid URL, ignore
      }
    });
  }

  // ==========================================
  // RAGE CLICK DETECTION (Frustration)
  // ==========================================

  initRageClickTracking() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('click', (e) => {
      const now = Date.now();
      this.clickTimes.push({ time: now, x: e.clientX, y: e.clientY });
      
      // Keep only clicks within the window
      this.clickTimes = this.clickTimes.filter(c => now - c.time < this.rageClickWindow);
      
      // Check for rage clicks (multiple clicks in same area)
      if (this.clickTimes.length >= this.rageClickThreshold) {
        const firstClick = this.clickTimes[0];
        const lastClick = this.clickTimes[this.clickTimes.length - 1];
        
        // Check if clicks are in roughly the same area (within 50px)
        const distance = Math.sqrt(
          Math.pow(lastClick.x - firstClick.x, 2) + 
          Math.pow(lastClick.y - firstClick.y, 2)
        );
        
        if (distance < 50) {
          this.track('rage_click', {
            click_count: this.clickTimes.length,
            element: this.getElementPath(e.target),
            element_tag: e.target.tagName,
            element_text: e.target.innerText?.substring(0, 50) || '',
            x: e.clientX,
            y: e.clientY
          }, { category: 'frustration' });
          
          // Reset to avoid repeated triggers
          this.clickTimes = [];
        }
      }
    });
  }

  // ==========================================
  // DEAD CLICK DETECTION (UX Issues)
  // ==========================================

  initDeadClickTracking() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('click', (e) => {
      const target = e.target;
      const tagName = target.tagName.toLowerCase();
      
      // Ignore interactive elements
      const interactiveElements = ['a', 'button', 'input', 'select', 'textarea', 'label'];
      if (interactiveElements.includes(tagName)) return;
      
      // Ignore elements with click handlers or roles
      if (target.onclick || target.getAttribute('role') === 'button') return;
      if (target.closest('a, button, [role="button"], [onclick]')) return;
      
      // Check if element looks clickable but isn't
      const style = window.getComputedStyle(target);
      const looksClickable = style.cursor === 'pointer' || 
                            target.classList.contains('clickable') ||
                            target.classList.contains('btn');
      
      if (looksClickable) {
        this.track('dead_click', {
          element: this.getElementPath(target),
          element_tag: tagName,
          element_class: target.className?.substring(0, 100) || '',
          element_text: target.innerText?.substring(0, 50) || '',
          x: e.clientX,
          y: e.clientY
        }, { category: 'frustration' });
      }
    });
  }

  // ==========================================
  // COPY TRACKING (Interest Signal)
  // ==========================================

  initCopyTracking() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('copy', () => {
      const selection = window.getSelection();
      const copiedText = selection?.toString() || '';
      
      if (copiedText.length > 0) {
        this.track('copy_text', {
          text_length: copiedText.length,
          text_preview: copiedText.substring(0, 100),
          source_element: this.getElementPath(selection?.anchorNode?.parentElement)
        }, { category: 'engagement' });
      }
    });
  }

  // ==========================================
  // PRINT TRACKING (High Interest)
  // ==========================================

  initPrintTracking() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeprint', () => {
      this.track('print_attempt', {
        page_title: document.title
      }, { category: 'engagement', immediate: true });
    });
  }

  // ==========================================
  // ERROR TRACKING
  // ==========================================

  initErrorTracking() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('error', (e) => {
      this.track('js_error', {
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno,
        stack: e.error?.stack?.substring(0, 500) || ''
      }, { category: 'error' });
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      this.track('promise_rejection', {
        reason: String(e.reason).substring(0, 500)
      }, { category: 'error' });
    });
  }

  // ==========================================
  // FORM TRACKING
  // ==========================================

  initFormTracking() {
    if (typeof document === 'undefined') return;
    
    // Track form focus (start)
    document.addEventListener('focusin', (e) => {
      const form = e.target.closest('form');
      if (form && !this.activeForm) {
        this.activeForm = form;
        this.formStartTime = Date.now();
        
        this.track('form_start', {
          form_id: form.id || '',
          form_name: form.name || '',
          form_action: form.action || '',
          first_field: e.target.name || e.target.id || ''
        }, { category: 'conversion' });
      }
    });
    
    // Track form submission
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const timeSpent = this.formStartTime ? Math.round((Date.now() - this.formStartTime) / 1000) : 0;
      
      this.track('form_submit', {
        form_id: form.id || '',
        form_name: form.name || '',
        form_action: form.action || '',
        time_spent: timeSpent
      }, { category: 'conversion', immediate: true });
      
      this.activeForm = null;
      this.formStartTime = null;
    });
    
    // Track form abandonment (when leaving page with active form)
    window.addEventListener('beforeunload', () => {
      if (this.activeForm && this.formStartTime) {
        const timeSpent = Math.round((Date.now() - this.formStartTime) / 1000);
        
        this.track('form_abandon', {
          form_id: this.activeForm.id || '',
          form_name: this.activeForm.name || '',
          time_spent: timeSpent
        }, { category: 'conversion', immediate: true });
      }
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  getElementPath(element) {
    if (!element) return '';
    
    const path = [];
    let current = element;
    
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c).slice(0, 2);
        if (classes.length) selector += `.${classes.join('.')}`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  // ==========================================
  // SEND EVENTS
  // ==========================================

  async sendEvent(event) {
    if (typeof window === 'undefined') return;
    const endpoint = API_ENDPOINT();
    if (!endpoint) return;
    
    try {
      const token = this.getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon && ['time_on_page', 'form_abandon', 'form_submit'].includes(event.eventType)) {
        navigator.sendBeacon(endpoint, JSON.stringify(event));
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
          keepalive: true
        }).catch(() => {});
      }
    } catch (e) {
      // Silent fail
    }
  }

  async flush() {
    if (typeof window === 'undefined') return;
    if (this.queue.length === 0) return;
    
    const endpoint = BATCH_ENDPOINT();
    if (!endpoint) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      const token = this.getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events }),
        keepalive: true
      }).catch(() => {});
    } catch (e) {
      // Silent fail
    }
  }

  getAuthToken() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token') || null;
  }

  // ==========================================
  // CONVENIENCE METHODS (for manual tracking)
  // ==========================================

  productView(productId, data = {}) {
    this.track('product_view', { product_id: productId, ...data }, { category: 'commerce' });
  }

  addToCart(productId, quantity = 1, data = {}) {
    this.track('add_to_cart', { product_id: productId, quantity, ...data }, { category: 'commerce' });
  }

  removeFromCart(productId, data = {}) {
    this.track('remove_from_cart', { product_id: productId, ...data }, { category: 'commerce' });
  }

  purchase(orderId, total, items = [], data = {}) {
    this.track('purchase', { order_id: orderId, total, item_count: items.length, ...data }, { category: 'commerce' });
  }

  search(query, resultCount = 0, filters = {}) {
    this.track('search', { query, result_count: resultCount, filters }, { category: 'navigation' });
  }

  addToWishlist(productId, data = {}) {
    this.track('add_to_wishlist', { product_id: productId, ...data }, { category: 'engagement' });
  }

  share(contentType, contentId, platform, data = {}) {
    this.track('share', { content_type: contentType, content_id: contentId, platform, ...data }, { category: 'engagement' });
  }

  imageZoom(productId, imageIndex = 0, data = {}) {
    this.track('image_zoom', { product_id: productId, image_index: imageIndex, ...data }, { category: 'engagement' });
  }

  videoPlay(videoId, data = {}) {
    this.track('video_play', { video_id: videoId, ...data }, { category: 'engagement' });
  }

  filterApply(filterType, filterValue, data = {}) {
    this.track('filter_apply', { filter_type: filterType, filter_value: filterValue, ...data }, { category: 'navigation' });
  }
}

export const tracker = new BehaviorTracker();
export { BehaviorTracker };
