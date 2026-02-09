# Email Collection Form Addon

Standalone email signup form for collecting subscribers.

## Installation

### Option 1: HTML/Vanilla JS

Add to your HTML page:

```html
<!-- CSS -->
<link rel="stylesheet" href="/addons/email-collection/styles.css">

<!-- Form Container -->
<div data-email-form data-form-id="YOUR_FORM_ID"></div>

<!-- JavaScript -->
<script src="/addons/email-collection/script.js"></script>
```

Replace `YOUR_FORM_ID` with the form ID from your CRM dashboard.

### Option 2: React Component

```jsx
import EmailCollectionForm from '@/components/sites-modules/EmailCollectionForm';

function MyPage() {
  return <EmailCollectionForm formId={123} inline={false} />;
}
```

## Configuration

### Form ID

Get your form ID from: **Dashboard > CRM > Forms**

Each form has unique settings:
- Fields to collect (email, name)
- Auto-tags
- Double opt-in
- Redirect URL
- Styling

### Styling

The form uses default styles from `styles.css`. You can override these with your own CSS:

```css
.email-form {
  background: #ffffff;
  border: 2px solid #000;
}

.email-form-submit {
  background: #ff0000;
}
```

### Inline Mode (React)

```jsx
<EmailCollectionForm formId={123} inline={true} />
```

This renders a more compact form suitable for sidebars or footers.

## Features

- ✅ Email validation
- ✅ Loading states
- ✅ Success/error messages
- ✅ Optional name fields
- ✅ Double opt-in support (backend)
- ✅ Auto-tagging
- ✅ Redirect after signup
- ✅ Mobile responsive
- ✅ No dependencies

## API Endpoint

Forms submit to:
```
POST /api/v2/email-marketing/public/subscribe/{formId}
```

This is a **public endpoint** (no authentication required).

## Examples

### Newsletter Signup

```html
<div class="newsletter-section">
  <h2>Join Our Newsletter</h2>
  <p>Get exclusive updates and special offers.</p>
  <div data-email-form data-form-id="1"></div>
</div>
```

### Sidebar Widget

```html
<aside class="sidebar">
  <div data-email-form data-form-id="2" class="email-form-inline"></div>
</aside>
```

### Footer Form

```html
<footer>
  <div class="footer-newsletter">
    <h3>Stay Connected</h3>
    <div data-email-form data-form-id="3"></div>
  </div>
</footer>
```

## Customization

### Custom Success Message

Edit `script.js` to customize the success message:

```javascript
successDiv.innerHTML = `
  <div class="custom-success">
    <h3>Welcome!</h3>
    <p>You're now part of our community.</p>
  </div>
`;
```

### Custom Validation

Add client-side validation before submission:

```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = form.querySelector('[name="email"]').value;
  
  // Custom validation
  if (!email.includes('@')) {
    alert('Please enter a valid email');
    return;
  }
  
  // Continue with submission...
});
```

## Troubleshooting

### Form not appearing

1. Check that the form ID exists in your CRM dashboard
2. Verify the script is loaded: Check browser console
3. Ensure CSS is loaded: Check network tab

### Submissions not working

1. Check browser console for errors
2. Verify the form is active in CRM dashboard
3. Test the API endpoint directly:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  https://yoursite.com/api/v2/email-marketing/public/subscribe/YOUR_FORM_ID
```

### Styling issues

The form uses semantic class names. Override with CSS:

```css
.email-form-container {
  max-width: 600px !important;
}
```

## Support

For issues or questions:
- Check CRM > Forms in dashboard
- View form settings and submissions
- Export subscriber data

---

**Version:** 1.0.0  
**Last Updated:** February 2026
