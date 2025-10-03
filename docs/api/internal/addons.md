# addons.js - Internal Documentation

## Overview
Comprehensive addon system for the Beemeeart platform that provides extensible functionality for individual sites. Handles site-specific addons including contact forms, email collection, and social posting. The system supports a modular architecture where addons can be enabled/disabled per site with tier-based pricing and configuration management.

## Architecture
- **Type:** Route Layer (API Endpoints) - Addon System
- **Dependencies:** express, database connection, rate limiting, JWT authentication, permissions middleware, EmailService
- **Database Tables:**
  - `site_addons` - Site-specific addon configurations and activation status
  - `website_addons` - Master addon definitions with pricing and requirements
  - `contact_submissions` - Contact form submissions with metadata
  - `sites` - Site information for addon validation
  - `users` - Site owners for notification emails
- **External Services:** EmailService for transactional notifications

## Addon Architecture

### Addon System Design
- **Master Addon Registry:** Central registry of all available addons with pricing and requirements
- **Site-Specific Activation:** Individual sites can enable/disable specific addons
- **Tier-Based Access:** Addons may require specific subscription tiers
- **Rate Limiting:** Protection against abuse with configurable limits
- **Extensible Framework:** Easy addition of new addon types

### Current Addon Types
- **Contact Form:** Fully implemented with email notifications
- **Email Collection:** Placeholder for future newsletter/marketing functionality
- **Social Posting:** Placeholder for future social media automation

### Data Flow
1. **Addon Discovery:** Sites query available addons via master endpoint
2. **Addon Validation:** System verifies addon is enabled for specific site
3. **Functionality Execution:** Addon-specific logic processes requests
4. **Notification System:** Email notifications sent for transactional events
5. **Data Storage:** Submissions and interactions stored for site owners

## Master Addon Endpoint

### GET /api/addons/sites/:id/addons
**Purpose:** Get active addons for a site - Master endpoint that triggers all addon functionality

**Authentication:** None required (public endpoint)

**Parameters:**
- `id` (path parameter): Site ID to get addons for

**Database Query:**
```sql
SELECT sa.*, wa.addon_name, wa.addon_slug, wa.addon_script_path, 
       wa.tier_required, wa.monthly_price
FROM site_addons sa 
JOIN website_addons wa ON sa.addon_id = wa.id 
WHERE sa.site_id = ? AND sa.is_active = 1 AND wa.is_active = 1
ORDER BY wa.display_order ASC
```

**Response Structure:**
```json
[
  {
    "id": 1,
    "site_id": 123,
    "addon_id": 5,
    "is_active": 1,
    "configuration": "{}",
    "created_at": "2024-01-15T10:30:00Z",
    "addon_name": "Contact Form",
    "addon_slug": "contact-form",
    "addon_script_path": "/js/addons/contact-form.js",
    "tier_required": "basic",
    "monthly_price": 0.00
  }
]
```

**Use Cases:**
- **Site Loading:** Frontend queries available addons during site initialization
- **Addon Discovery:** Determine which addons are active for a specific site
- **Configuration Loading:** Get addon-specific configuration and pricing
- **Script Loading:** Determine which addon scripts to load on the frontend

## Contact Form Addon

### Email Validation Helper
**Function:** `isValidEmail(email)`
**Purpose:** Validates email format using standard regex pattern

**Implementation:**
```javascript
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Validation Rules:**
- Must contain @ symbol
- Must have domain with at least one dot
- No spaces allowed
- Basic format validation (not comprehensive)

### POST /api/addons/contact/submit
**Purpose:** Submit a contact form message through site addon system

**Authentication:** None required (public endpoint with rate limiting)

**Rate Limiting:** 20 requests per 15 minutes per IP address

**Request Body:**
```json
{
  "siteId": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-123-4567",
  "message": "I'm interested in your artwork..."
}
```

**Validation Rules:**
```javascript
// Required fields
if (!name || !email || !message || !siteId) {
  return res.status(400).json({ error: 'Missing required fields: name, email, message, siteId' });
}

// Name validation
if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
  return res.status(400).json({ error: 'Name is required and must be less than 100 characters' });
}

// Email validation
if (!isValidEmail(email)) {
  return res.status(400).json({ error: 'Please provide a valid email address' });
}

// Phone validation (optional)
if (phone && (typeof phone !== 'string' || phone.length > 20)) {
  return res.status(400).json({ error: 'Phone number must be less than 20 characters' });
}

// Message validation
if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) {
  return res.status(400).json({ error: 'Message must be between 10 and 2000 characters' });
}

// Site ID validation
if (!Number.isInteger(parseInt(siteId)) || parseInt(siteId) < 1) {
  return res.status(400).json({ error: 'Valid site ID is required' });
}
```

**Input Sanitization:**
```javascript
const sanitizedName = name.trim();
const sanitizedEmail = email.toLowerCase().trim();
const sanitizedPhone = phone ? phone.trim() : null;
const sanitizedMessage = message.trim();
```

**Site Validation:**
```sql
-- Verify site exists and is active
SELECT id, user_id, site_name, subdomain, custom_domain 
FROM sites 
WHERE id = ? AND status = "active"

-- Verify contact form addon is enabled
SELECT sa.*, wa.addon_name 
FROM site_addons sa 
JOIN website_addons wa ON sa.addon_id = wa.id 
WHERE sa.site_id = ? AND wa.addon_slug = 'contact-form' AND sa.is_active = 1
```

**Data Storage:**
```sql
INSERT INTO contact_submissions 
(site_id, sender_name, sender_email, sender_phone, message, ip_address, user_agent, created_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
```

**Email Notification System:**
```javascript
const templateData = {
  sender_name: sanitizedName,
  sender_email: sanitizedEmail,
  sender_phone: sanitizedPhone || 'Not provided',
  message: sanitizedMessage,
  timestamp: new Date().toLocaleString(),
  site_name: site.site_name || `${site.first_name} ${site.last_name}'s Site`,
  site_url: site.custom_domain 
    ? `https://${site.custom_domain}` 
    : `https://${site.subdomain}.${process.env.FRONTEND_URL?.replace('https://', '') || 'beemeeart.com'}`,
  siteId: parseInt(siteId)
};

// Send transactional email with reply-to functionality
await emailService.sendEmail(
  site.user_id, 
  'contact_form_notification', 
  templateData,
  {
    replyTo: sanitizedEmail // Allow direct reply to sender
  }
);
```

**Response Structure:**
```json
{
  "success": true,
  "message": "Your message has been sent successfully"
}
```

**Error Handling:**
- **400 Bad Request:** Invalid input data or missing required fields
- **403 Forbidden:** Contact form addon not enabled for site
- **404 Not Found:** Site not found or inactive
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Database or system error

**Security Features:**
- **Rate Limiting:** Prevents spam and abuse
- **Input Validation:** Comprehensive validation of all fields
- **Input Sanitization:** Cleans and normalizes input data
- **IP Tracking:** Records IP address for abuse monitoring
- **User Agent Tracking:** Records browser information
- **Site Validation:** Ensures addon is properly enabled

## Future Addon Implementations

### Email Collection Addon
**Route:** `POST /api/addons/email-collection/subscribe`
**Status:** Placeholder (501 Not Implemented)

**Planned Features:**
- Newsletter subscription management
- Email marketing list integration
- Double opt-in confirmation
- Unsubscribe handling
- Segmentation and tagging
- Integration with email marketing platforms

**Planned Request Body:**
```json
{
  "siteId": 123,
  "email": "subscriber@example.com",
  "name": "Jane Doe",
  "interests": ["art", "crafts"],
  "source": "homepage_popup"
}
```

**Planned Functionality:**
- Validate email format and site addon status
- Store subscription with preferences
- Send confirmation email with double opt-in
- Integrate with email marketing platforms
- Track subscription sources and analytics

### Social Posting Addon
**Route:** `POST /api/addons/social-posting/connect`
**Status:** Placeholder (501 Not Implemented)

**Planned Features:**
- Social media account connection
- Automated posting to multiple platforms
- Content scheduling and management
- Cross-posting functionality
- Analytics and engagement tracking
- Platform-specific optimization

**Planned Request Body:**
```json
{
  "siteId": 123,
  "platform": "instagram",
  "accessToken": "platform_access_token",
  "accountId": "platform_account_id",
  "permissions": ["publish", "read_insights"]
}
```

**Planned Functionality:**
- OAuth integration with social platforms
- Token validation and refresh handling
- Account verification and permissions
- Posting queue management
- Content optimization per platform
- Analytics and performance tracking

## Environment Variables

### FRONTEND_URL
**Usage:** Base URL for frontend domain in site URL generation

**Implementation:**
```javascript
const siteUrl = site.custom_domain 
  ? `https://${site.custom_domain}` 
  : `https://${site.subdomain}.${process.env.FRONTEND_URL?.replace('https://', '') || 'beemeeart.com'}`;
```

**Purpose:**
- Constructs site URLs for email notifications
- Replaces hardcoded `onlineartfestival.com` with configurable domain
- Provides fallback to `beemeeart.com` if not configured
- Supports both custom domains and subdomain routing

## Security Considerations

### Rate Limiting
- **Configuration:** 20 requests per 15 minutes per IP address
- **Protection:** Prevents spam, abuse, and DoS attacks
- **Headers:** Standard rate limit headers included in responses
- **Scope:** Applied to all addon endpoints that accept user input

### Input Validation
- **Comprehensive Validation:** All input fields validated for type, length, and format
- **Sanitization:** Input data cleaned and normalized before processing
- **SQL Injection Protection:** Parameterized queries used throughout
- **XSS Prevention:** Input sanitization prevents script injection

### Data Privacy
- **IP Tracking:** IP addresses recorded for abuse monitoring
- **User Agent Tracking:** Browser information stored for analytics
- **Email Privacy:** Reply-to functionality preserves sender privacy
- **Data Retention:** Contact submissions stored for site owner access

### Access Control
- **Site Validation:** Ensures addon is enabled for specific site
- **Addon Authorization:** Verifies addon permissions before processing
- **Public Endpoints:** No authentication required for user-facing functionality
- **Error Handling:** Secure error responses without system details

## Performance Considerations

### Database Optimization
- **Indexed Queries:** Optimized on site_id, addon_id, and is_active flags
- **Efficient JOINs:** Minimal data retrieval with proper table relationships
- **Query Caching:** Potential for Redis caching on frequently accessed addon configurations
- **Connection Pooling:** Efficient database connection management

### Rate Limiting
- **Memory-Based:** Express rate limiting with in-memory storage
- **Configurable Limits:** Adjustable rate limits per addon type
- **IP-Based Tracking:** Efficient IP-based rate limiting
- **Standard Headers:** Proper rate limit headers for client handling

### Email Processing
- **Asynchronous Processing:** Email sending doesn't block request response
- **Error Isolation:** Email failures don't affect form submission success
- **Template Caching:** Email templates cached for performance
- **Transactional Priority:** Contact forms treated as high-priority transactional emails

## Error Handling

### Validation Errors
- **Field Validation:** Comprehensive validation with specific error messages
- **Type Checking:** Ensures proper data types for all fields
- **Length Validation:** Enforces character limits for all text fields
- **Format Validation:** Email format and other pattern validation

### System Errors
- **Database Errors:** Graceful handling of database connectivity issues
- **Email Errors:** Non-blocking email error handling
- **Addon Errors:** Proper error responses for disabled or missing addons
- **Rate Limit Errors:** Clear rate limiting error messages

### User Experience
- **Clear Error Messages:** User-friendly error descriptions
- **Validation Feedback:** Specific field validation errors
- **Success Confirmation:** Clear success messages for completed actions
- **Graceful Degradation:** System continues functioning despite non-critical errors

## Logging and Monitoring

### Request Logging
- **Contact Submissions:** All contact form submissions logged
- **Rate Limiting:** Rate limit violations logged for monitoring
- **Error Logging:** Comprehensive error logging with context
- **Performance Metrics:** Response times and addon usage analytics

### Security Monitoring
- **Abuse Detection:** Monitor for spam and abuse patterns
- **IP Tracking:** Track suspicious IP addresses
- **Rate Limit Monitoring:** Monitor rate limit violations
- **Input Validation:** Log validation failures for security analysis

### Business Analytics
- **Addon Usage:** Track addon usage across sites
- **Conversion Metrics:** Monitor contact form conversion rates
- **Site Performance:** Track addon performance per site
- **Feature Adoption:** Monitor adoption of new addon features

## Usage Examples

### Frontend Addon Discovery
```javascript
// Get available addons for a site
const getAvailableAddons = async (siteId) => {
  try {
    const response = await fetch(`/api/addons/sites/${siteId}/addons`);
    const addons = await response.json();
    
    console.log(`Found ${addons.length} active addons for site ${siteId}`);
    
    // Process each addon
    addons.forEach(addon => {
      console.log(`Addon: ${addon.addon_name} (${addon.addon_slug})`);
      console.log(`Price: $${addon.monthly_price}/month`);
      console.log(`Tier Required: ${addon.tier_required}`);
      
      // Load addon script if needed
      if (addon.addon_script_path) {
        loadAddonScript(addon.addon_script_path);
      }
    });
    
    return addons;
  } catch (error) {
    console.error('Failed to load addons:', error);
    return [];
  }
};

// Load addon-specific JavaScript
const loadAddonScript = (scriptPath) => {
  const script = document.createElement('script');
  script.src = scriptPath;
  script.async = true;
  document.head.appendChild(script);
};

// Initialize addons for a site
const initializeAddons = async (siteId) => {
  const addons = await getAvailableAddons(siteId);
  
  // Enable contact form if available
  const contactFormAddon = addons.find(addon => addon.addon_slug === 'contact-form');
  if (contactFormAddon) {
    initializeContactForm(siteId);
  }
  
  // Enable other addons as needed
  addons.forEach(addon => {
    switch (addon.addon_slug) {
      case 'email-collection':
        initializeEmailCollection(siteId);
        break;
      case 'social-posting':
        initializeSocialPosting(siteId);
        break;
    }
  });
};
```

### Contact Form Implementation
```javascript
// Submit contact form
const submitContactForm = async (formData) => {
  try {
    const response = await fetch('/api/addons/contact/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Contact form submitted successfully:', result.message);
      showSuccessMessage(result.message);
      clearForm();
    } else {
      console.error('Contact form error:', result.error);
      showErrorMessage(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Network error:', error);
    showErrorMessage('Failed to submit contact form. Please try again.');
    throw error;
  }
};

// Contact form with validation
const ContactForm = {
  init: function(siteId) {
    this.siteId = siteId;
    this.form = document.getElementById('contact-form');
    this.bindEvents();
  },
  
  bindEvents: function() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Real-time validation
    this.form.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
    });
  },
  
  validateField: function(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    switch (field.name) {
      case 'name':
        if (!value) {
          isValid = false;
          errorMessage = 'Name is required';
        } else if (value.length > 100) {
          isValid = false;
          errorMessage = 'Name must be less than 100 characters';
        }
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          isValid = false;
          errorMessage = 'Email is required';
        } else if (!emailRegex.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
        break;
        
      case 'phone':
        if (value && value.length > 20) {
          isValid = false;
          errorMessage = 'Phone number must be less than 20 characters';
        }
        break;
        
      case 'message':
        if (!value) {
          isValid = false;
          errorMessage = 'Message is required';
        } else if (value.length < 10) {
          isValid = false;
          errorMessage = 'Message must be at least 10 characters';
        } else if (value.length > 2000) {
          isValid = false;
          errorMessage = 'Message must be less than 2000 characters';
        }
        break;
    }
    
    this.showFieldError(field, isValid ? null : errorMessage);
    return isValid;
  },
  
  validateForm: function() {
    const fields = this.form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  },
  
  handleSubmit: async function() {
    if (!this.validateForm()) {
      return;
    }
    
    const formData = new FormData(this.form);
    const data = {
      siteId: this.siteId,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone') || null,
      message: formData.get('message')
    };
    
    this.setLoading(true);
    
    try {
      await submitContactForm(data);
    } catch (error) {
      // Error handling already done in submitContactForm
    } finally {
      this.setLoading(false);
    }
  },
  
  setLoading: function(loading) {
    const submitButton = this.form.querySelector('button[type="submit"]');
    submitButton.disabled = loading;
    submitButton.textContent = loading ? 'Sending...' : 'Send Message';
  },
  
  showFieldError: function(field, message) {
    const errorElement = field.parentNode.querySelector('.error-message');
    if (errorElement) {
      errorElement.textContent = message || '';
      errorElement.style.display = message ? 'block' : 'none';
    }
    
    field.classList.toggle('error', !!message);
  },
  
  clearForm: function() {
    this.form.reset();
    this.form.querySelectorAll('.error-message').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    this.form.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
    });
  }
};

// Initialize contact form
document.addEventListener('DOMContentLoaded', () => {
  const siteId = window.SITE_CONFIG?.siteId;
  if (siteId) {
    ContactForm.init(siteId);
  }
});
```

### Addon Management Dashboard
```javascript
// Admin interface for managing site addons
const AddonManager = {
  init: function(siteId) {
    this.siteId = siteId;
    this.loadAvailableAddons();
    this.loadActiveAddons();
  },
  
  loadAvailableAddons: async function() {
    try {
      // This would be an admin endpoint (not implemented in current file)
      const response = await fetch('/api/admin/addons/available');
      const addons = await response.json();
      
      this.renderAvailableAddons(addons);
    } catch (error) {
      console.error('Failed to load available addons:', error);
    }
  },
  
  loadActiveAddons: async function() {
    try {
      const response = await fetch(`/api/addons/sites/${this.siteId}/addons`);
      const addons = await response.json();
      
      this.renderActiveAddons(addons);
    } catch (error) {
      console.error('Failed to load active addons:', error);
    }
  },
  
  renderAvailableAddons: function(addons) {
    const container = document.getElementById('available-addons');
    
    addons.forEach(addon => {
      const addonElement = document.createElement('div');
      addonElement.className = 'addon-card';
      addonElement.innerHTML = `
        <h3>${addon.addon_name}</h3>
        <p>${addon.description}</p>
        <div class="addon-price">$${addon.monthly_price}/month</div>
        <div class="addon-tier">Requires: ${addon.tier_required}</div>
        <button onclick="AddonManager.enableAddon(${addon.id})" 
                class="btn btn-primary">
          Enable Addon
        </button>
      `;
      
      container.appendChild(addonElement);
    });
  },
  
  renderActiveAddons: function(addons) {
    const container = document.getElementById('active-addons');
    
    addons.forEach(addon => {
      const addonElement = document.createElement('div');
      addonElement.className = 'addon-card active';
      addonElement.innerHTML = `
        <h3>${addon.addon_name}</h3>
        <div class="addon-status">Active</div>
        <div class="addon-price">$${addon.monthly_price}/month</div>
        <button onclick="AddonManager.configureAddon(${addon.id})" 
                class="btn btn-secondary">
          Configure
        </button>
        <button onclick="AddonManager.disableAddon(${addon.id})" 
                class="btn btn-danger">
          Disable
        </button>
      `;
      
      container.appendChild(addonElement);
    });
  },
  
  enableAddon: async function(addonId) {
    try {
      // This would be an admin endpoint (not implemented in current file)
      const response = await fetch(`/api/admin/sites/${this.siteId}/addons/${addonId}/enable`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.loadActiveAddons();
        showSuccessMessage('Addon enabled successfully');
      } else {
        const error = await response.json();
        showErrorMessage(error.message);
      }
    } catch (error) {
      console.error('Failed to enable addon:', error);
      showErrorMessage('Failed to enable addon');
    }
  },
  
  disableAddon: async function(addonId) {
    if (confirm('Are you sure you want to disable this addon?')) {
      try {
        // This would be an admin endpoint (not implemented in current file)
        const response = await fetch(`/api/admin/sites/${this.siteId}/addons/${addonId}/disable`, {
          method: 'POST'
        });
        
        if (response.ok) {
          this.loadActiveAddons();
          showSuccessMessage('Addon disabled successfully');
        } else {
          const error = await response.json();
          showErrorMessage(error.message);
        }
      } catch (error) {
        console.error('Failed to disable addon:', error);
        showErrorMessage('Failed to disable addon');
      }
    }
  },
  
  configureAddon: function(addonId) {
    // Open configuration modal or redirect to configuration page
    window.location.href = `/admin/addons/${addonId}/configure`;
  }
};
```
