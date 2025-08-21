/**
 * Contact Form Addon
 * Adds a secure contact form with spam protection to artist websites
 */

class ContactFormAddon {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
    this.initialized = false;
    this.formId = 'contact-form-addon';
  }

  /**
   * Initialize the contact form addon
   */
  init() {
    if (this.initialized) return;
    
    // Add contact form styles
    this.injectStyles();
    
    // Add contact navigation to the site menu
    this.addContactNavigation();
    
    // Handle contact page routing
    this.setupContactPageRouting();
    
    this.initialized = true;
  }

  /**
   * Inject CSS styles for the contact form
   */
  injectStyles() {
    const styles = `
      <style id="contact-form-addon-styles">
        .contact-form-addon {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .contact-form-addon h2 {
          color: var(--text-color, #374151);
          margin-bottom: 20px;
          font-size: 1.8rem;
        }
        
        .contact-form-addon .form-group {
          margin-bottom: 20px;
        }
        
        .contact-form-addon label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: var(--text-color, #374151);
        }
        
        .contact-form-addon input,
        .contact-form-addon textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s ease;
          box-sizing: border-box;
        }
        
        .contact-form-addon input:focus,
        .contact-form-addon textarea:focus {
          outline: none;
          border-color: var(--main-color, #667eea);
        }
        
        .contact-form-addon textarea {
          min-height: 120px;
          resize: vertical;
        }
        
        .contact-form-addon .submit-btn {
          background: var(--main-color, #667eea);
          color: white;
          padding: 14px 28px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .contact-form-addon .submit-btn:hover {
          background: var(--secondary-color, #764ba2);
          transform: translateY(-1px);
        }
        
        .contact-form-addon .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        
        .contact-form-addon .success-message {
          background: #10b981;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .contact-form-addon .error-message {
          background: #ef4444;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .contact-form-addon .loading {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .contact-form-addon {
            margin: 10px;
            padding: 15px;
          }
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Add contact navigation to the site menu
   */
  addContactNavigation() {
    // Find the navigation element (it uses CSS modules, so look for nav tag)
    const navigation = document.querySelector('nav');
    if (navigation) {
      const contactLink = document.createElement('a');
      contactLink.href = '#contact';
      // Copy the same CSS class as other nav links
      const existingNavLink = navigation.querySelector('a');
      if (existingNavLink) {
        contactLink.className = existingNavLink.className;
      }
      contactLink.textContent = 'Contact';
      contactLink.onclick = (e) => {
        e.preventDefault();
        this.showContactPage();
      };
      navigation.appendChild(contactLink);
    }
  }

  /**
   * Setup contact page routing
   */
  setupContactPageRouting() {
    // Listen for hash changes to show contact page
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#contact') {
          this.showContactPage();
        }
      });
      
      // Check if we're already on contact page
      if (window.location.hash === '#contact') {
        this.showContactPage();
      }
    }
  }

  /**
   * Show the contact page
   */
  showContactPage() {
    // Find the main content area - try multiple selectors due to CSS modules
    let mainContent = document.querySelector('.storefront') || 
                     document.querySelector('[class*="storefront"]') ||
                     document.querySelector('main') ||
                     document.querySelector('#__next > div > div');
    
    if (mainContent) {
      // Get the existing header element to reuse
      const existingHeader = document.querySelector('header');
      let headerHtml = '';
      
      if (existingHeader) {
        // Clone the existing header HTML to reuse
        headerHtml = existingHeader.outerHTML;
      }
      
      // Create contact page with the same header
      const contactPageHtml = `
        ${headerHtml}
        <div class="contact-page-container" style="padding: 40px 20px; min-height: 60vh;">
          <div class="container" style="max-width: 800px; margin: 0 auto;">
            <div id="contact-form-container"></div>
          </div>
        </div>
      `;
      
      // Replace main content with contact page
      mainContent.innerHTML = contactPageHtml;
      
      // Initialize the contact form
      this.createContactForm('contact-form-container');
    }
  }

  /**
   * Create and insert the contact form
   */
  createContactForm(containerId = 'contact-form-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const formHTML = `
      <div class="contact-form-addon">
        <h2>Contact Us</h2>
        <div id="contact-form-messages"></div>
        
        <form id="${this.formId}" novalidate>
          <div class="form-group">
            <label for="contact-name">Name *</label>
            <input 
              type="text" 
              id="contact-name" 
              name="name" 
              required 
              maxlength="100"
            >
          </div>
          
          <div class="form-group">
            <label for="contact-email">Email *</label>
            <input 
              type="email" 
              id="contact-email" 
              name="email" 
              required 
              maxlength="150"
            >
          </div>
          
          <div class="form-group">
            <label for="contact-phone">Phone</label>
            <input 
              type="tel" 
              id="contact-phone" 
              name="phone" 
              maxlength="20"
            >
          </div>
          
          <div class="form-group">
            <label for="contact-message">Message *</label>
            <textarea 
              id="contact-message" 
              name="message" 
              required 
              maxlength="2000"
              placeholder="Tell us how we can help you..."
            ></textarea>
          </div>
          
          <!-- Hidden honeypot for spam protection -->
          <input type="text" name="website" style="display: none;" tabindex="-1">
          
          <button type="submit" class="submit-btn" id="contact-submit">
            Send Message
          </button>
        </form>
      </div>
    `;

    container.innerHTML = formHTML;
    this.attachFormHandlers();
  }

  /**
   * Attach event handlers to the contact form
   */
  attachFormHandlers() {
    const form = document.getElementById(this.formId);
    const submitBtn = document.getElementById('contact-submit');
    const messagesDiv = document.getElementById('contact-form-messages');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear previous messages
      messagesDiv.innerHTML = '';
      
      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading"></span>Sending...';
      
      try {
        const formData = new FormData(form);
        
        // Basic validation
        const name = formData.get('name').trim();
        const email = formData.get('email').trim();
        const message = formData.get('message').trim();
        const honeypot = formData.get('website'); // Should be empty
        
        // Spam check
        if (honeypot) {
          throw new Error('Spam detected');
        }
        
        if (!name || !email || !message) {
          throw new Error('Please fill in all required fields');
        }
        
        if (!this.isValidEmail(email)) {
          throw new Error('Please enter a valid email address');
        }
        
        // Submit to backend
        const response = await fetch('https://api2.onlineartfestival.com/api/addons/contact/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siteId: this.siteConfig.siteId,
            name,
            email,
            phone: formData.get('phone').trim(),
            message,
            timestamp: new Date().toISOString()
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }
        
        // Success
        messagesDiv.innerHTML = '<div class="success-message">Thank you for contacting us! We\'ll get back to you soon.</div>';
        form.reset();
        
      } catch (error) {
        messagesDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
      } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message';
      }
    });
  }

  /**
   * Simple email validation
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a contact page (called by the storefront when contact page is accessed)
   */
  renderContactPage() {
    return `
      <div class="container" style="padding: 40px 20px;">
        <div id="contact-form-container"></div>
      </div>
    `;
  }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  window.ContactFormAddon = ContactFormAddon;
}

export default ContactFormAddon;
