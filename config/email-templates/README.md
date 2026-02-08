# Email Template Configs

System default email templates using Editor.js block format.

## Quick Start

**Create a new template:**

```javascript
// config/email-templates/my-template.js
module.exports = {
  template_key: 'my-template',
  name: 'My Template',
  subject_template: 'Subject: #{variable}',
  is_transactional: true,
  priority_level: 4,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'paragraph',
        data: { text: 'Hello #{firstName}!' }
      }
    ]
  },
  
  variables: ['firstName', 'variable']
};
```

**Create database record:**

```sql
INSERT INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key)
VALUES ('my-template', 'My Template', NULL, NULL, 1, 4, 'default');
```

Setting `subject_template` and `body_template` to NULL tells the system to load from this config file.

## How It Works

1. **Config file** = system default (this directory)
2. **Database NULL** = use config default
3. **Database value** = custom override

Admins can customize templates via the visual editor. Changes create database overrides. The "Reset to Default" button reverts to config.

## Template Structure

### Required Fields
- `template_key` - Unique identifier (matches DB)
- `name` - Display name
- `subject_template` - Subject with #{variables}
- `is_transactional` - Boolean (bypasses user prefs)
- `priority_level` - 1-5 (1=highest)
- `layout_key` - Layout wrapper ('default', 'artist_site')
- `body_template` - Editor.js blocks object

### Optional Fields
- `variables` - Array of variable names (documentation)

## Block Types

### Paragraph
```javascript
{
  type: 'paragraph',
  data: { text: 'Text content with <strong>HTML</strong>' }
}
```

### Header
```javascript
{
  type: 'header',
  data: {
    text: 'Heading Text',
    level: 2  // 2, 3, or 4
  }
}
```

### List
```javascript
{
  type: 'list',
  data: {
    style: 'unordered',  // or 'ordered'
    items: ['Item 1', 'Item 2', 'Item 3']
  }
}
```

### Image
```javascript
{
  type: 'image',
  data: {
    url: 'https://example.com/image.jpg',
    caption: 'Optional caption'
  }
}
```

### Quote
```javascript
{
  type: 'quote',
  data: {
    text: 'Quote text',
    caption: 'Attribution'  // optional
  }
}
```

### Warning
```javascript
{
  type: 'warning',
  data: {
    title: 'Warning Title',
    message: 'Warning message'
  }
}
```

### Delimiter
```javascript
{
  type: 'delimiter',
  data: {}
}
```

### Table
```javascript
{
  type: 'table',
  data: {
    withHeadings: true,
    content: [
      ['Header 1', 'Header 2'],
      ['Cell 1', 'Cell 2']
    ]
  }
}
```

## Variables

Use `#{variableName}` syntax:
```
Hi #{firstName}, your order #{orderNumber} is ready!
```

Document available variables in the config:
```javascript
variables: ['firstName', 'orderNumber', 'trackingLink']
```

## Available Templates

- `password-reset.js` - Password reset emails
- `welcome.js` - New user welcome
- `order-confirmation.js` - Order confirmations
- `shipping-notification.js` - Shipping updates
- `payment-received.js` - Payment confirmations
- `account-verification.js` - Email verification

## Styling

Blocks are converted to HTML with inline styles for email compatibility. The conversion happens in:
- Frontend: `TemplatesTab.js` → `blocksToEmailHtml()`
- Backend: `emailService.js` → `blocksToEmailHtml()`

Email-safe inline styles are automatically applied. No additional CSS needed.

## Testing

Send a test email:
```javascript
const emailService = require('./services/emailService');

await emailService.sendEmail(userId, 'my-template', {
  firstName: 'John',
  variable: 'test value'
});
```

## More Info

See `/docs/EMAIL_TEMPLATE_CONFIG_SYSTEM.md` for complete documentation.
