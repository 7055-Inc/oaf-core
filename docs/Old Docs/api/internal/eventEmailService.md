# eventEmailService.js - Internal Documentation

## Overview
Specialized email service for event-related communications in the Beemeeart platform. Extends the base EmailService to provide event-specific functionality including booth fee management, payment reminders, confirmations, and automated event email workflows.

## Architecture
- **Type:** Service Layer (Business Logic) - Extends EmailService
- **Dependencies:** EmailService, database connection, StripeService (for payment cancellation)
- **Database Tables:**
  - `event_applications` - Event application data
  - `events` - Event information
  - `users` - User/artist information
  - `event_booth_fees` - Booth fee payment intents
  - `event_booth_payments` - Payment records
  - `application_email_log` - Email activity audit trail
- **External APIs:** Inherits SMTP from EmailService, Stripe API for payment cancellation

## Core Functions

### Booth Fee Management

#### sendBoothFeeInvoice(applicationId)
- **Purpose:** Send booth fee invoice when application is accepted
- **Parameters:**
  - `applicationId` (number): Event application ID
- **Returns:** Promise<Object> Email send result with success status
- **Errors:** Throws if application not found or email sending fails
- **Template:** Uses 'booth_fee_invoice' email template
- **Usage Example:** `await eventEmailService.sendBoothFeeInvoice(123)`

#### sendBoothFeeReminder(applicationId, reminderType)
- **Purpose:** Send payment deadline reminders with different urgency levels
- **Parameters:**
  - `applicationId` (number): Event application ID
  - `reminderType` (string): Type of reminder (standard, due_soon, overdue, final)
- **Returns:** Promise<Object> Email send result
- **Reminder Types:**
  - **standard:** General payment reminder
  - **due_soon:** 3 days before due date
  - **overdue:** 1 day after due date
  - **final:** 7 days after due date (final notice)
- **Usage Example:** `await eventEmailService.sendBoothFeeReminder(123, 'due_soon')`

#### sendBoothFeeConfirmation(applicationId, paymentIntentId)
- **Purpose:** Send payment confirmation after successful booth fee payment
- **Parameters:**
  - `applicationId` (number): Event application ID
  - `paymentIntentId` (string): Stripe payment intent ID
- **Returns:** Promise<Object> Email send result
- **Template:** Uses 'booth_fee_confirmation' email template
- **Usage Example:** `await eventEmailService.sendBoothFeeConfirmation(123, 'pi_123')`

### Bulk Operations

#### sendBulkReminders(eventId, applicationIds, reminderType)
- **Purpose:** Send reminder emails to multiple applications for an event
- **Parameters:**
  - `eventId` (number): Event ID for bulk processing
  - `applicationIds` (Array): Specific application IDs (optional)
  - `reminderType` (string): Type of reminder to send
- **Returns:** Promise<Object> Bulk processing results with counts
- **Usage Example:** `await eventEmailService.sendBulkReminders(456, [], 'overdue')`

### Automated Processing

#### processAutomatedReminders()
- **Purpose:** Process automated reminders based on payment due dates (cron job)
- **Parameters:** None
- **Returns:** Promise<Object> Processing results for all reminder types
- **Automation Logic:**
  - **Due Soon:** 3 days before due date
  - **Overdue:** 1 day after due date
  - **Final Notice:** 7 days after due date
- **Database Tracking:** Updates reminder flags to prevent duplicates
- **Usage Example:** `await eventEmailService.processAutomatedReminders()`

#### processAutoDecline()
- **Purpose:** Auto-decline applications overdue beyond grace period (14 days)
- **Parameters:** None
- **Returns:** Promise<Object> Auto-decline processing results
- **Actions:**
  - Updates application status to 'declined'
  - Sets decline reason to 'Payment overdue - auto-declined'
  - Cancels associated Stripe payment intents
  - Marks as processed to prevent re-processing
- **Usage Example:** `await eventEmailService.processAutoDecline()`

## Utility Methods

### Date and Currency Formatting

#### formatDateRange(startDate, endDate)
- **Purpose:** Format date range for display in email templates
- **Parameters:**
  - `startDate` (Date|string): Event start date
  - `endDate` (Date|string): Event end date
- **Returns:** String formatted date range
- **Handles:** Single day and multi-day events
- **Format:** "Monday, January 1, 2024" or "Monday, January 1, 2024 - Friday, January 5, 2024"

#### formatDate(date)
- **Purpose:** Format single date for display in email templates
- **Parameters:**
  - `date` (Date|string): Date to format
- **Returns:** String formatted date
- **Format:** "Monday, January 1, 2024"

#### formatCurrency(amount)
- **Purpose:** Format currency amount for display in email templates
- **Parameters:**
  - `amount` (number): Amount to format
- **Returns:** String formatted currency (USD)
- **Format:** "$100.00"

### Audit and Logging

#### logApplicationEmail(applicationId, emailType, success)
- **Purpose:** Log email activity for application tracking and audit trail
- **Parameters:**
  - `applicationId` (number): Event application ID
  - `emailType` (string): Type of email sent
  - `success` (boolean): Whether email was sent successfully
- **Database:** Inserts record into `application_email_log` table
- **Usage:** Automatically called by all email sending methods

## Environment Variables
- **Inherited from EmailService:** SMTP configuration
- `FRONTEND_URL`: Frontend base URL for payment links (default: https://beemeeart.com)

## Email Templates Used
- `booth_fee_invoice`: Initial invoice when application accepted
- `booth_fee_reminder`: Standard payment reminder
- `booth_fee_overdue`: Overdue payment notice
- `booth_fee_confirmation`: Payment confirmation receipt

## Template Data Variables
### Common Variables
- `artist_name`: Full name of the artist
- `event_title`: Name of the event
- `booth_fee_amount`: Formatted booth fee amount
- `payment_url`: Direct link to payment page
- `contact_email`: Support email (support@beemeeart.com)

### Invoice-Specific Variables
- `event_dates`: Formatted event date range
- `event_location`: Venue name and location
- `due_date`: Formatted payment due date

### Reminder-Specific Variables
- `days_remaining`: Days until payment due (for upcoming reminders)
- `days_overdue`: Days past due date (for overdue reminders)
- `grace_period`: Grace period before auto-decline (7 days)

### Confirmation-Specific Variables
- `amount_paid`: Actual amount paid
- `transaction_id`: Stripe payment intent ID
- `payment_date`: Date payment was processed

## Automated Workflow

### Daily Cron Job Processing
1. **processAutomatedReminders():** Check for due dates and send appropriate reminders
2. **processAutoDecline():** Auto-decline applications beyond grace period

### Reminder Timeline
- **Application Accepted:** Booth fee invoice sent immediately
- **3 Days Before Due:** Due soon reminder (if not paid)
- **Due Date:** Standard reminder (if not paid)
- **1 Day Overdue:** Overdue reminder (if not paid)
- **7 Days Overdue:** Final notice (if not paid)
- **14 Days Overdue:** Auto-decline and payment intent cancellation

## Security Considerations
- **Authentication requirements:** Inherits from EmailService
- **Authorization levels:** Application-specific access validation
- **Input validation rules:** Application ID and payment intent validation
- **Rate limiting applied:** Inherits from parent EmailService

## Error Handling
- **Database Failures:** Comprehensive error logging and graceful degradation
- **Email Failures:** Detailed error messages with context
- **Payment Integration:** Stripe API error handling for cancellations
- **Bulk Operations:** Individual failure tracking with overall success reporting

## Performance Features
- **Bulk Processing:** Efficient batch reminder processing
- **Database Optimization:** Optimized queries for automated processing
- **Error Recovery:** Individual failure handling in bulk operations
- **Audit Trail:** Complete email activity logging

## Testing
- Unit test coverage: Date formatting, currency formatting, reminder logic
- Integration test scenarios: Email template rendering, database operations, Stripe integration
- Performance benchmarks: Bulk processing speed, automated workflow efficiency

## Monitoring and Logging
- **Email Activity:** Complete audit trail in application_email_log
- **Automated Processing:** Detailed logging of cron job results
- **Error Tracking:** Comprehensive error logging with context
- **Performance Metrics:** Processing times and success rates
