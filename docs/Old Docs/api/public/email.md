# Email API

## Authentication
All email endpoints require API key authentication.

## Overview
The Beemeeart email system provides template-based email delivery with user preference management, bounce handling, and queue processing. Supports both immediate and scheduled delivery based on user preferences.

## Email Templates

### Template System
- **Template Variables:** Use `#{variable}` syntax for dynamic content
- **Layout Support:** Default Beemeeart branding or custom artist site branding
- **Multi-tenant:** Automatic artist site customization for branded emails

### Available Templates
Common template keys include:
- `welcome` - Welcome email for new users
- `order_confirmation` - Order confirmation emails
- `shipping_notification` - Shipping updates
- `newsletter` - Marketing newsletters
- `password_reset` - Password reset emails (transactional)

## User Preferences

### Email Frequency Options
- **live** - Immediate delivery
- **hourly** - Batched at top of each hour
- **daily** - Daily digest at 8 AM
- **weekly** - Weekly digest on Monday at 8 AM

### Transactional vs Marketing
- **Transactional emails** (order confirmations, password resets) bypass frequency preferences
- **Marketing emails** respect user frequency and category preferences
- **Automatic unsubscribe** links included in all non-transactional emails

## Bounce Management

### Automatic Blacklisting
- **Hard bounces:** Blacklisted after 3 attempts (invalid addresses)
- **Soft bounces:** Blacklisted after 5 attempts (temporary failures)
- **Blacklisted addresses:** Automatically rejected to protect sender reputation

### Bounce Types
- **Hard Bounce:** Permanent delivery failure (invalid email, domain doesn't exist)
- **Soft Bounce:** Temporary failure (mailbox full, server temporarily unavailable)

## Artist Site Integration

### Custom Branding
Artist sites can have custom email branding including:
- Custom business name and logo
- Artist contact information
- Custom domain links
- Personalized footer information

### Multi-tenant Support
- Automatic detection of artist site context
- Custom domain vs subdomain handling
- Fallback to default Beemeeart branding

## Rate Limiting and Delivery

### Queue Processing
- **Batch Processing:** Emails processed in configurable batches
- **Priority Levels:** High priority for transactional emails
- **Scheduled Delivery:** Based on user frequency preferences
- **Retry Logic:** Failed sends automatically retried

### Delivery Monitoring
- **Send Tracking:** Complete audit trail of all email attempts
- **Event Tracking:** Open and click tracking (where supported)
- **Bounce Monitoring:** Automatic bounce detection and handling
- **Performance Metrics:** Delivery rates and timing statistics

## Error Handling

### Common Error Scenarios
- **User Not Found:** Invalid user ID provided
- **Template Missing:** Requested template doesn't exist
- **Blacklisted Address:** Email address has been blacklisted due to bounces
- **Preference Blocked:** User preferences prevent email delivery
- **SMTP Failure:** Server-side delivery issues

### Error Response Format
```json
{
  "success": false,
  "error": "Email address is blacklisted due to bounces",
  "code": "BLACKLISTED_ADDRESS"
}
```

## Best Practices

### Template Design
1. **Mobile Responsive:** All templates optimized for mobile devices
2. **Fallback Text:** Include plain text versions for accessibility
3. **Unsubscribe Links:** Required for all marketing emails
4. **Brand Consistency:** Maintain consistent branding across templates

### Delivery Optimization
1. **Respect Preferences:** Always check user preferences before sending
2. **Handle Bounces:** Monitor bounce rates and maintain clean lists
3. **Queue Non-urgent:** Use queue for marketing emails to respect frequency preferences
4. **Immediate Transactional:** Send critical emails immediately

### Performance Considerations
1. **Batch Processing:** Use queue processing for large email campaigns
2. **Template Caching:** Templates are cached for performance
3. **Connection Pooling:** SMTP connections are pooled and reused
4. **Error Recovery:** Failed sends are logged and can be retried

## Integration Examples

### Sending a Welcome Email
```javascript
// Send immediate welcome email
const result = await emailService.sendEmail(
  userId,
  'welcome',
  {
    first_name: 'John',
    site_url: 'https://johndoe.beemeeart.com'
  }
);

if (result.success) {
  console.log('Welcome email sent:', result.messageId);
}
```

### Queueing a Newsletter
```javascript
// Queue newsletter respecting user preferences
const result = await emailService.queueEmail(
  userId,
  'newsletter',
  {
    newsletter_title: 'Monthly Art Update',
    featured_products: productList
  },
  { priority: 2 }
);
```

### Processing Email Queue (Cron Job)
```javascript
// Process up to 100 emails from queue
const results = await emailService.processQueue(100);
console.log(`Processed ${results.length} emails`);
```

## Monitoring and Analytics

### Email Metrics
- **Delivery Rate:** Percentage of emails successfully delivered
- **Bounce Rate:** Percentage of emails that bounced
- **Queue Depth:** Number of emails waiting to be sent
- **Processing Speed:** Average emails processed per minute

### Logging
All email activities are logged including:
- Send attempts and results
- Bounce events and handling
- User preference changes
- Queue processing statistics
