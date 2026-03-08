/**
 * Email Collection Form - Vanilla JavaScript
 * Standalone email signup form for non-React sites.
 * 
 * Usage:
 * <div id="email-form" data-form-id="123"></div>
 * <script src="/addons/email-collection/script.js"></script>
 */

(function() {
  'use strict';

  // Find all email form containers
  const containers = document.querySelectorAll('[data-email-form]');
  
  containers.forEach(container => {
    const formId = container.dataset.formId || container.dataset.emailForm;
    
    if (!formId) {
      console.error('Email Collection Form: Missing form ID');
      return;
    }

    // Create form HTML
    container.innerHTML = `
      <div class="email-form-container">
        <form class="email-form" data-form-instance="${formId}">
          <div class="email-form-fields">
            <input 
              type="email" 
              name="email" 
              placeholder="Your email address" 
              required 
              class="email-form-input"
            />
            <input 
              type="text" 
              name="first_name" 
              placeholder="First name (optional)" 
              class="email-form-input"
            />
            <input 
              type="text" 
              name="last_name" 
              placeholder="Last name (optional)" 
              class="email-form-input"
            />
          </div>
          <button type="submit" class="email-form-submit">
            Subscribe
          </button>
          <div class="email-form-message" style="display: none;"></div>
        </form>
        <div class="email-form-success" style="display: none;">
          <div class="email-form-success-icon">✅</div>
          <h3>Thank You!</h3>
          <p>Please check your email to confirm your subscription.</p>
        </div>
      </div>
    `;

    // Get form elements
    const form = container.querySelector('.email-form');
    const successDiv = container.querySelector('.email-form-success');
    const messageDiv = container.querySelector('.email-form-message');
    const submitBtn = container.querySelector('.email-form-submit');

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        email: form.querySelector('[name="email"]').value,
        first_name: form.querySelector('[name="first_name"]').value,
        last_name: form.querySelector('[name="last_name"]').value
      };

      // Show loading state
      submitBtn.textContent = 'Subscribing...';
      submitBtn.disabled = true;
      messageDiv.style.display = 'none';

      try {
        const response = await fetch(`/api/v2/email-marketing/public/subscribe/${formId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          // Show success message
          form.style.display = 'none';
          successDiv.style.display = 'block';

          // Redirect if URL provided
          if (data.redirect_url) {
            setTimeout(() => {
              window.location.href = data.redirect_url;
            }, 2000);
          }
        } else {
          // Show error message
          messageDiv.textContent = data.message || 'Subscription failed. Please try again.';
          messageDiv.className = 'email-form-message error';
          messageDiv.style.display = 'block';
        }
      } catch (error) {
        // Show network error
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'email-form-message error';
        messageDiv.style.display = 'block';
        console.error('Email form error:', error);
      } finally {
        // Reset button
        submitBtn.textContent = 'Subscribe';
        submitBtn.disabled = false;
      }
    });
  });

  console.log('Email Collection Forms initialized');
})();
