# Addons API

## Overview
The Beemeeart Addons API provides extensible functionality for individual sites through a modular addon system. This API enables sites to enhance their functionality with features like contact forms, email collection, and social media integration. All addons are site-specific and can be enabled/disabled based on subscription tiers and site requirements.

## Authentication
Addon endpoints are primarily public-facing and do not require authentication. Rate limiting is applied to prevent abuse while allowing reasonable usage for legitimate site visitors.

## Base URL
```
https://api.beemeeart.com/addons
```

## Addon System Architecture

The addon system follows a modular architecture where:
- **Master Registry:** Central registry of all available addons
- **Site-Specific Activation:** Individual sites enable/disable specific addons
- **Tier-Based Access:** Some addons require specific subscription tiers
- **Rate Limiting:** Protection against spam and abuse
- **Extensible Framework:** Easy addition of new addon types

## Addon Discovery

### Get Site Addons
`GET /api/addons/sites/:id/addons`

Get all active addons for a specific site. This is the master endpoint that returns addon configuration and availability.

**Authentication:** None required (public endpoint)

**Path Parameters:**
- `id` (string): Site ID to get addons for

**Response (200 OK):**
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
  },
  {
    "id": 2,
    "site_id": 123,
    "addon_id": 7,
    "is_active": 1,
    "configuration": "{\"popup_delay\": 5000}",
    "created_at": "2024-01-15T10:30:00Z",
    "addon_name": "Email Collection",
    "addon_slug": "email-collection",
    "addon_script_path": "/js/addons/email-collection.js",
    "tier_required": "pro",
    "monthly_price": 9.99
  }
]
```

**Use Cases:**
- Site initialization and addon discovery
- Frontend script loading based on active addons
- Addon configuration and pricing display
- Feature availability checking

## Contact Form Addon

### Submit Contact Form
`POST /api/addons/contact/submit`

Submit a contact form message through the site addon system. Validates input, stores the submission, and sends notification email to the site owner.

**Authentication:** None required (public endpoint)

**Rate Limiting:** 20 requests per 15 minutes per IP address

**Request Body:**
```json
{
  "siteId": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-123-4567",
  "message": "I'm interested in your artwork and would like to know more about pricing and availability."
}
```

**Field Requirements:**
- `siteId` (number, required): Site ID for the contact form
- `name` (string, required): Sender's name (max 100 characters)
- `email` (string, required): Valid email address
- `phone` (string, optional): Phone number (max 20 characters)
- `message` (string, required): Message content (10-2000 characters)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your message has been sent successfully"
}
```

**Features:**
- **Input Validation:** Comprehensive validation of all fields
- **Spam Protection:** Rate limiting and input sanitization
- **Email Notifications:** Automatic notification to site owner
- **Reply Functionality:** Site owner can reply directly to sender
- **Addon Verification:** Ensures contact form is enabled for the site

### Contact Form Integration Example
```javascript
// Frontend contact form implementation
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
      showSuccessMessage(result.message);
      clearForm();
    } else {
      showErrorMessage(result.error);
    }
    
    return result;
  } catch (error) {
    showErrorMessage('Failed to submit contact form. Please try again.');
    throw error;
  }
};

// Example form submission
const contactData = {
  siteId: 123,
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "555-0123",
  message: "I love your art style! Do you take custom commissions?"
};

await submitContactForm(contactData);
```

## Email Collection Addon

### Subscribe to Newsletter
`POST /api/addons/email-collection/subscribe`

Subscribe to newsletter and email marketing lists. This addon is currently in development.

**Authentication:** None required (public endpoint)

**Rate Limiting:** 20 requests per 15 minutes per IP address

**Status:** 501 Not Implemented (Future Implementation)

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

**Planned Features:**
- Newsletter subscription management
- Double opt-in confirmation
- Email marketing integration
- Subscriber segmentation
- Unsubscribe handling
- Analytics and tracking

## Social Posting Addon

### Connect Social Media Account
`POST /api/addons/social-posting/connect`

Connect social media accounts for automated posting. This addon is currently in development.

**Authentication:** None required (public endpoint)

**Rate Limiting:** 20 requests per 15 minutes per IP address

**Status:** 501 Not Implemented (Future Implementation)

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

**Planned Features:**
- Multi-platform social media integration
- Automated posting and scheduling
- Cross-posting functionality
- Analytics and engagement tracking
- Content optimization per platform
- OAuth integration

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (invalid input, missing required fields)
- `403` - Forbidden (addon not enabled for site)
- `404` - Not Found (site not found or inactive)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (system error)
- `501` - Not Implemented (addon not yet available)

### Contact Form Validation Errors
- **Missing required fields:** "Missing required fields: name, email, message, siteId"
- **Invalid name:** "Name is required and must be less than 100 characters"
- **Invalid email:** "Please provide a valid email address"
- **Invalid phone:** "Phone number must be less than 20 characters"
- **Invalid message:** "Message must be between 10 and 2000 characters"
- **Invalid site ID:** "Valid site ID is required"
- **Addon not enabled:** "Contact form not available for this site"

## Rate Limits
- **All addon endpoints:** 20 requests per 15 minutes per IP address
- **Headers included:** Standard rate limit headers in responses
- **Protection scope:** Applies to all user input endpoints

## Integration Examples

### Complete Addon System Integration
```javascript
// Addon discovery and initialization
class AddonSystem {
  constructor(siteId) {
    this.siteId = siteId;
    this.activeAddons = [];
  }
  
  async initialize() {
    try {
      // Discover available addons
      const response = await fetch(`/api/addons/sites/${this.siteId}/addons`);
      this.activeAddons = await response.json();
      
      console.log(`Loaded ${this.activeAddons.length} addons for site ${this.siteId}`);
      
      // Initialize each addon
      this.activeAddons.forEach(addon => {
        this.initializeAddon(addon);
      });
      
    } catch (error) {
      console.error('Failed to initialize addon system:', error);
    }
  }
  
  initializeAddon(addon) {
    switch (addon.addon_slug) {
      case 'contact-form':
        this.initializeContactForm(addon);
        break;
      case 'email-collection':
        this.initializeEmailCollection(addon);
        break;
      case 'social-posting':
        this.initializeSocialPosting(addon);
        break;
      default:
        console.warn(`Unknown addon: ${addon.addon_slug}`);
    }
  }
  
  initializeContactForm(addon) {
    // Load contact form functionality
    if (addon.addon_script_path) {
      this.loadScript(addon.addon_script_path);
    }
    
    // Initialize contact form handlers
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('.contact-form');
      forms.forEach(form => {
        this.setupContactForm(form);
      });
    });
  }
  
  setupContactForm(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {
        siteId: this.siteId,
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        message: formData.get('message')
      };
      
      await this.submitContactForm(data, form);
    });
  }
  
  async submitContactForm(data, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
      // Show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
      
      const response = await fetch('/api/addons/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        this.showMessage('success', result.message);
        form.reset();
      } else {
        this.showMessage('error', result.error);
      }
      
    } catch (error) {
      console.error('Contact form error:', error);
      this.showMessage('error', 'Failed to send message. Please try again.');
    } finally {
      // Restore button state
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
  
  initializeEmailCollection(addon) {
    // Future implementation
    console.log('Email collection addon ready for implementation');
  }
  
  initializeSocialPosting(addon) {
    // Future implementation
    console.log('Social posting addon ready for implementation');
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  showMessage(type, message) {
    // Create or update message display
    let messageEl = document.querySelector('.addon-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.className = 'addon-message';
      document.body.appendChild(messageEl);
    }
    
    messageEl.className = `addon-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }
  
  getAddon(slug) {
    return this.activeAddons.find(addon => addon.addon_slug === slug);
  }
  
  isAddonActive(slug) {
    return this.activeAddons.some(addon => addon.addon_slug === slug && addon.is_active);
  }
}

// Initialize addon system
window.addEventListener('DOMContentLoaded', () => {
  const siteId = window.SITE_CONFIG?.siteId;
  if (siteId) {
    const addonSystem = new AddonSystem(siteId);
    addonSystem.initialize();
    
    // Make addon system globally available
    window.AddonSystem = addonSystem;
  }
});
```

### Advanced Contact Form with Validation
```javascript
// Enhanced contact form with real-time validation
class ContactFormValidator {
  constructor(form, siteId) {
    this.form = form;
    this.siteId = siteId;
    this.errors = {};
    this.init();
  }
  
  init() {
    // Add validation to each field
    this.form.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
    
    // Handle form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  
  validateField(field) {
    const name = field.name;
    const value = field.value.trim();
    let error = null;
    
    switch (name) {
      case 'name':
        if (!value) {
          error = 'Name is required';
        } else if (value.length > 100) {
          error = 'Name must be less than 100 characters';
        }
        break;
        
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!this.isValidEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'phone':
        if (value && value.length > 20) {
          error = 'Phone number must be less than 20 characters';
        }
        break;
        
      case 'message':
        if (!value) {
          error = 'Message is required';
        } else if (value.length < 10) {
          error = 'Message must be at least 10 characters';
        } else if (value.length > 2000) {
          error = 'Message must be less than 2000 characters';
        }
        break;
    }
    
    this.setFieldError(field, error);
    return !error;
  }
  
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
  
  setFieldError(field, error) {
    const name = field.name;
    
    if (error) {
      this.errors[name] = error;
      field.classList.add('error');
    } else {
      delete this.errors[name];
      field.classList.remove('error');
    }
    
    // Update error message display
    let errorEl = field.parentNode.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      field.parentNode.appendChild(errorEl);
    }
    
    errorEl.textContent = error || '';
    errorEl.style.display = error ? 'block' : 'none';
  }
  
  clearFieldError(field) {
    if (field.classList.contains('error')) {
      this.validateField(field);
    }
  }
  
  validateForm() {
    const fields = this.form.querySelectorAll('input, textarea');
    let isValid = true;
    
    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  async handleSubmit() {
    if (!this.validateForm()) {
      this.showFormError('Please correct the errors above');
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
    
    await this.submitForm(data);
  }
  
  async submitForm(data) {
    const submitButton = this.form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
      // Show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
      this.clearFormError();
      
      const response = await fetch('/api/addons/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        this.showSuccess(result.message);
        this.form.reset();
        this.clearAllErrors();
      } else {
        this.showFormError(result.error);
      }
      
    } catch (error) {
      console.error('Contact form submission error:', error);
      this.showFormError('Failed to send message. Please try again.');
    } finally {
      // Restore button state
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
  
  showFormError(message) {
    let errorEl = this.form.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      this.form.insertBefore(errorEl, this.form.firstChild);
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
  
  clearFormError() {
    const errorEl = this.form.querySelector('.form-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }
  
  showSuccess(message) {
    let successEl = this.form.querySelector('.form-success');
    if (!successEl) {
      successEl = document.createElement('div');
      successEl.className = 'form-success';
      this.form.insertBefore(successEl, this.form.firstChild);
    }
    
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 5000);
  }
  
  clearAllErrors() {
    this.errors = {};
    this.form.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
    });
    this.form.querySelectorAll('.field-error').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// Auto-initialize contact forms
document.addEventListener('DOMContentLoaded', () => {
  const siteId = window.SITE_CONFIG?.siteId;
  if (siteId) {
    document.querySelectorAll('.contact-form').forEach(form => {
      new ContactFormValidator(form, siteId);
    });
  }
});
```

### Addon Analytics and Monitoring
```javascript
// Addon usage analytics
class AddonAnalytics {
  constructor(siteId) {
    this.siteId = siteId;
    this.events = [];
  }
  
  trackAddonUsage(addonSlug, action, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      siteId: this.siteId,
      addonSlug: addonSlug,
      action: action,
      data: data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.events.push(event);
    this.sendAnalytics(event);
  }
  
  async sendAnalytics(event) {
    try {
      // This would be an analytics endpoint (not implemented in current file)
      await fetch('/api/analytics/addon-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }
  
  trackContactFormSubmission(success, error = null) {
    this.trackAddonUsage('contact-form', 'submission', {
      success: success,
      error: error
    });
  }
  
  trackAddonLoad(addonSlug) {
    this.trackAddonUsage(addonSlug, 'load');
  }
  
  trackAddonInteraction(addonSlug, interaction) {
    this.trackAddonUsage(addonSlug, 'interaction', {
      type: interaction
    });
  }
}

// Global analytics instance
window.AddonAnalytics = new AddonAnalytics(window.SITE_CONFIG?.siteId);
```
