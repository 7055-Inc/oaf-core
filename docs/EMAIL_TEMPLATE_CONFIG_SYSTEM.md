# Email Template Config System

## Overview

The email template system uses a **hybrid config + database architecture** that combines the benefits of version-controlled defaults with runtime customization capabilities.

## Architecture

### Config Files = System Defaults
- Located in `/config/email-templates/`
- Version controlled
- Provide sensible defaults for all templates
- Easy to update and deploy

### Database = Overrides
- Template records in `email_templates` table
- `NULL` values = use config default
- Non-null values = custom override
- User customizations via visual block editor

### Lookup Flow

```
1. Load template from database by template_key
2. If body_template is NULL → Load from config file
3. If body_template has value → Use database value (customized)
4. Return merged template object
```

## How It Works

### For Developers

**Creating a New Template:**

1. Create config file: `/config/email-templates/your-template.js`
```javascript
module.exports = {
  template_key: 'your-template',
  name: 'Your Template Name',
  subject_template: 'Subject with #{variables}',
  is_transactional: true,
  priority_level: 4,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'paragraph',
        data: { text: 'Email content...' }
      }
    ]
  },
  
  variables: ['var1', 'var2']
};
```

2. Create database record with NULL body:
```sql
INSERT INTO email_templates (
  template_key, name, subject_template, body_template,
  is_transactional, priority_level, layout_key
) VALUES (
  'your-template', 'Your Template Name', NULL, NULL,
  1, 4, 'default'
);
```

3. Template is now ready to use and will load from config by default

**Updating System Defaults:**

1. Edit the config file
2. Commit and deploy
3. Templates using defaults will automatically get the update
4. Customized templates remain unchanged

### For Admin Users

**Using Default Templates:**

- Templates show "📄 Using System Default" indicator
- Edit and save to create customized version
- Once saved, your changes override the default

**Customizing Templates:**

1. Open template in admin interface
2. Edit content using visual block editor
3. Save changes (creates database override)
4. Template now uses your custom version

**Resetting to Default:**

1. Click "Reset to Default" button
2. Confirm the action
3. Custom changes are discarded
4. Template reverts to config default

## File Structure

```
/config/email-templates/
├── index.js                      # Template loader
├── password-reset.js             # Password reset template
├── welcome.js                    # Welcome email
├── order-confirmation.js         # Order confirmation
├── shipping-notification.js      # Shipping notification
├── payment-received.js           # Payment confirmation
└── account-verification.js       # Email verification
```

## Template Format

### Config File Structure

```javascript
module.exports = {
  // Unique identifier (required)
  template_key: 'template-key',
  
  // Human-readable name (required)
  name: 'Template Name',
  
  // Subject line template with #{variable} syntax (required)
  subject_template: 'Subject: #{variable}',
  
  // Transactional emails bypass user preferences (required)
  is_transactional: true,
  
  // Priority 1-5 (1=highest, 5=lowest) (required)
  priority_level: 4,
  
  // Layout wrapper key (required)
  layout_key: 'default',
  
  // Editor.js blocks format (required)
  body_template: {
    blocks: [
      // Array of Editor.js blocks
    ]
  },
  
  // Available variables for this template (optional, documentation)
  variables: ['var1', 'var2', 'var3']
};
```

### Supported Block Types

- **paragraph**: Regular text paragraph
- **header**: H2, H3, or H4 heading
- **list**: Ordered or unordered list
- **image**: Image with optional caption
- **quote**: Blockquote with optional attribution
- **table**: Data table with optional header row
- **warning**: Highlighted warning/notice box
- **delimiter**: Horizontal rule separator

## Database Schema

```sql
CREATE TABLE email_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject_template TEXT NULL,        -- NULL = use config
  body_template LONGTEXT NULL,       -- NULL = use config
  is_transactional TINYINT(1) DEFAULT 0,
  priority_level INT DEFAULT 3,
  layout_key VARCHAR(50) DEFAULT 'default',
  can_compile TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Get Template
```
GET /api/v2/email/templates/:id
```
Returns template with config defaults merged in.

### Get Template Default
```
GET /api/v2/email/templates/:id/default
```
Returns the raw config default for a template.

### Update Template
```
PUT /api/v2/email/templates/:id
```
Saves custom template (creates database override).

### Reset to Default
```
POST /api/v2/email/templates/:id/reset
```
Sets body_template and subject_template to NULL to revert to config default.

## Variable Syntax

Templates use `#{variableName}` syntax for dynamic content:

```
Subject: Reset Your Password - #{siteName}

Hi #{firstName},

Your order #{orderNumber} has been confirmed.
```

Variables are replaced when the email is sent:
```javascript
emailService.sendEmail(userId, 'order-confirmation', {
  firstName: 'John',
  orderNumber: 'ORD-12345',
  siteName: 'Brakebee'
});
```

## Benefits

### Version Control
- ✅ System defaults in git
- ✅ Easy to review changes
- ✅ Rollback capability
- ✅ Deployment consistency

### Customization
- ✅ Visual block editor
- ✅ Per-tenant overrides ready
- ✅ Non-destructive changes
- ✅ Easy reset to default

### Scalability
- ✅ Minimal database storage
- ✅ Fast template loading
- ✅ Config caching possible
- ✅ Multi-tenant ready

### Developer Experience
- ✅ Edit templates as code
- ✅ No database queries to update defaults
- ✅ Clear separation of concerns
- ✅ Type-safe with good IDE support

## Multi-Tenant Considerations

This system is designed to support multi-tenant customization in the future:

1. Add `tenant_id` column to `email_templates`
2. Each tenant can override any template
3. Lookup order: Tenant DB → Global DB → Config
4. Subscription tiers can control which templates are customizable

## Migration Strategy

### Converting Existing Templates

Run migration to reset templates to config defaults:
```bash
mysql < database/migrations/011_email_template_config_system.sql
```

### Preserving Custom Templates

Templates with custom content can be preserved by:
1. Not including them in the reset migration
2. Creating config files from their existing content
3. Manual review and selective reset

## Troubleshooting

### Template Not Loading
- Check config file exists: `/config/email-templates/[key].js`
- Verify module.exports syntax is correct
- Check template_key matches database record
- Restart server to reload config cache

### Config Changes Not Appearing
- Ensure database body_template is NULL
- Restart server to reload config
- Clear any config caching
- Check file syntax for errors

### Reset Button Not Showing
- Template must have config file
- Button only shows for customized templates
- Check `hasDefaultConfig` state in UI

## Best Practices

1. **Always create config files first** before database records
2. **Use descriptive template_keys** (kebab-case recommended)
3. **Document variables** in config file comments
4. **Test templates** after config changes
5. **Keep configs simple** - complex logic belongs in service layer
6. **Version control** all config changes
7. **Use migrations** for database structure changes

## Future Enhancements

- [ ] Template preview in admin UI
- [ ] Variable validation
- [ ] Template versioning/history
- [ ] A/B testing support
- [ ] Multi-language templates
- [ ] Template categories/tags
- [ ] Usage analytics per template
- [ ] Scheduled template updates
