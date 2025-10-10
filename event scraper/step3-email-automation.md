# Step 3: Email Sequence Automation

## Objective
Create automated email sequences for unclaimed events, sending 4 emails over 30 days to encourage promoters to claim their events.

## Overview

We're building on your existing email infrastructure:
- ✅ Email queue system (`email_queue` table)
- ✅ Template system (`email_templates` table)
- ✅ EmailService class
- ✅ Cron job framework
- ✅ Logging infrastructure

**What we're adding:**
1. New database table to track email sequences
2. Four new email templates for promoter outreach
3. New cron job to manage sequence progression
4. API endpoints for manual sequence control

---

## PART 1: Database Changes

### 1.1 Create `promoter_email_sequences` Table

```sql
CREATE TABLE `promoter_email_sequences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `promoter_email` varchar(255) NOT NULL,
  `promoter_user_id` bigint DEFAULT NULL COMMENT 'User ID if promoter has account',
  `sequence_status` enum('active','paused','completed','stopped') DEFAULT 'active',
  `current_step` tinyint NOT NULL DEFAULT 1 COMMENT '1=initial, 2=day7, 3=day14, 4=day30',
  `last_email_sent` timestamp NULL DEFAULT NULL,
  `next_email_due` timestamp NULL DEFAULT NULL,
  `email_1_sent_at` timestamp NULL DEFAULT NULL,
  `email_2_sent_at` timestamp NULL DEFAULT NULL,
  `email_3_sent_at` timestamp NULL DEFAULT NULL,
  `email_4_sent_at` timestamp NULL DEFAULT NULL,
  `stopped_reason` enum('claimed','removed','bounced','unsubscribed','manual') DEFAULT NULL,
  `stopped_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_sequence` (`event_id`),
  KEY `idx_next_email_due` (`next_email_due`,`sequence_status`),
  KEY `idx_promoter_email` (`promoter_email`),
  KEY `fk_sequence_event_id` (`event_id`),
  KEY `fk_sequence_promoter_id` (`promoter_user_id`),
  CONSTRAINT `fk_sequence_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sequence_promoter_id` FOREIGN KEY (`promoter_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Tracks automated email sequences for unclaimed events';
```

**Field Explanations:**
- `current_step`: Which email in sequence (1-4)
- `next_email_due`: When to send next email (indexed for cron queries)
- `email_N_sent_at`: Timestamp for each email (for reporting)
- `stopped_reason`: Why sequence ended (for analytics)
- `sequence_status`: Controls whether emails continue

---

## PART 2: Email Templates

### 2.1 Insert Email Templates

```sql
-- Template 1: Initial Claim Request (Day 0)
INSERT INTO email_templates (
  template_key, 
  name, 
  priority_level, 
  is_transactional,
  subject_template, 
  body_template,
  layout_key
) VALUES (
  'promoter_claim_initial',
  'Promoter - Initial Claim Request',
  2,
  1,
  'Complete your listing for {{event_name}}',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi {{promoter_first_name|default:"Event Organizer"}},</p>
  
  <p>Your event <strong>{{event_name}}</strong> was added to Brakebee based on a user suggestion, but we\'re missing some critical information that artists need:</p>
  
  <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
    <strong>Current listing:</strong><br>
    • Dates: {{event_dates}}<br>
    • Location: {{event_location}}<br>
    • <strong>Booth fees:</strong> Not available ⚠️<br>
    • <strong>Application deadline:</strong> Missing<br>
    • <strong>Application requirements:</strong> Missing
  </div>
  
  <p><strong>Why we need your help:</strong><br>
  We only display booth fees from verified event organizers to ensure artists have 100% accurate pricing for business decisions. Currently, artists viewing your event can\'t see this essential information.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{claim_url}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Event (2 minutes)</a>
  </div>
  
  <p><strong>Once you claim your event, you\'ll be able to:</strong></p>
  <ul>
    <li>Add booth fees and application details</li>
    <li>See which artists are tracking your event</li>
    <li>Accept applications through our platform (optional)</li>
    <li>Earn affiliate commission on artist sales (optional)</li>
  </ul>
  
  <p>Artists are using Brakebee to discover festivals and track application deadlines. Help them find accurate information about {{event_name}}.</p>
  
  <p style="margin-top: 30px;">
    <a href="{{claim_url}}">Claim your event here</a>
  </p>
  
  <p style="font-size: 12px; color: #666; margin-top: 30px;">
    Or, if this event is no longer running, you can <a href="{{remove_url}}">request removal here</a>.
  </p>
  
  <p>Best,<br>{{sender_name}}<br>Founder, Brakebee</p>
  
  <p style="font-size: 12px; color: #999;">P.S. - Brakebee is free for event organizers. We built this to make festival management easier for everyone.</p>
</body>
</html>',
  'default'
);

-- Template 2: Artist Interest (Day 7)
INSERT INTO email_templates (
  template_key, 
  name, 
  priority_level,
  is_transactional,
  subject_template, 
  body_template,
  layout_key
) VALUES (
  'promoter_claim_day7',
  'Promoter - Day 7 Follow-up',
  2,
  1,
  'Artists are asking about {{event_name}}',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi {{promoter_first_name|default:"there"}},</p>
  
  <p>Just a quick follow-up—artists are saving <strong>{{event_name}}</strong> to track your application deadline, but we still don\'t have complete details listed.</p>
  
  <div style="background: #e3f2fd; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3;">
    <strong>{{artist_count|default:"Artists are"}} tracking your event</strong> to see when applications open and what booth fees are.
  </div>
  
  <p>To help them find accurate information (and connect with interested artists), claim your event listing:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{claim_url}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Event</a>
  </div>
  
  <p><strong>Once claimed, you\'ll be able to:</strong></p>
  <ul>
    <li>Update all event details</li>
    <li>See which artists are interested</li>
    <li>Accept applications through the platform (no more email chaos)</li>
    <li>Earn commission on sales through your event site</li>
  </ul>
  
  <p>Takes 2 minutes: <a href="{{claim_url}}">{{claim_url}}</a></p>
  
  <p>Best,<br>{{sender_name}}</p>
  
  <p style="font-size: 12px; color: #666; margin-top: 30px;">
    P.S. - Not organizing {{event_name}}? <a href="{{remove_url}}">Request removal here</a>.
  </p>
</body>
</html>',
  'default'
);

-- Template 3: Deadline Pressure (Day 14)
INSERT INTO email_templates (
  template_key, 
  name, 
  priority_level,
  is_transactional,
  subject_template, 
  body_template,
  layout_key
) VALUES (
  'promoter_claim_day14',
  'Promoter - Day 14 Follow-up',
  2,
  1,
  'Last call: {{event_name}} application season approaching',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi {{promoter_first_name|default:"there"}},</p>
  
  <p>Application season for {{event_season|default:"upcoming"}} festivals is heating up, and <strong>{{event_name}}</strong> still has an incomplete listing on Brakebee.</p>
  
  <p>Artists are planning which festivals to apply to <strong>right now</strong>. Make sure they have your complete information—especially booth fees and application deadlines.</p>
  
  <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <strong>Critical missing information:</strong><br>
    ❌ Booth fees (we only show fees from verified organizers)<br>
    ❌ Application deadline<br>
    ❌ Application requirements
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{claim_url}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Event</a>
  </div>
  
  <p><strong>Or, if you\'re not organizing this event:</strong><br>
  If {{event_name}} isn\'t running this year or you\'re not involved, please <a href="{{remove_url}}">request removal here</a>.</p>
  
  <p>All the best,<br>{{sender_name}}</p>
</body>
</html>',
  'default'
);

-- Template 4: Final Notice (Day 30)
INSERT INTO email_templates (
  template_key, 
  name, 
  priority_level,
  is_transactional,
  subject_template, 
  body_template,
  layout_key
) VALUES (
  'promoter_claim_day30',
  'Promoter - Final Notice',
  2,
  1,
  'Should I remove {{event_name}}?',
  '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi {{promoter_first_name|default:"there"}},</p>
  
  <p>I haven\'t heard back about the <strong>{{event_name}}</strong> listing on Brakebee, so I wanted to check in.</p>
  
  <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
    <p style="margin: 0;"><strong>If you\'re organizing this event:</strong><br>
    The listing is here whenever you\'re ready to claim it and add complete details:<br>
    <a href="{{claim_url}}">{{claim_url}}</a></p>
  </div>
  
  <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
    <p style="margin: 0;"><strong>If you\'re NOT organizing this event (or it\'s not happening):</strong><br>
    Please <a href="{{remove_url}}">request removal here</a>—no problem at all.</p>
  </div>
  
  <p>Thanks for your time, and best of luck with your events!</p>
  
  <p>{{sender_name}}<br>Founder, Brakebee</p>
</body>
</html>',
  'default'
);
```

---

## PART 3: Cron Job Implementation

### 3.1 Create Cron Job File

**File:** `/var/www/main/api-service/cron/process-promoter-sequences.js`

```javascript
const db = require('../src/config/database');
const EmailService = require('../src/services/emailService');

const emailService = new EmailService();

// Email sequence timing (in days)
const SEQUENCE_SCHEDULE = {
  1: 0,   // Initial email - immediate
  2: 7,   // First follow-up - 7 days
  3: 14,  // Second follow-up - 14 days
  4: 30   // Final notice - 30 days
};

// Template keys for each step
const TEMPLATE_KEYS = {
  1: 'promoter_claim_initial',
  2: 'promoter_claim_day7',
  3: 'promoter_claim_day14',
  4: 'promoter_claim_day30'
};

async function processPromoterSequences() {
  console.log('[Promoter Sequences] Starting processing...');
  
  try {
    // Find sequences due for next email
    const [sequences] = await db.execute(`
      SELECT 
        pes.*,
        e.title as event_name,
        e.start_date,
        e.end_date,
        CONCAT(e.city, ', ', e.state) as event_location,
        e.event_status
      FROM promoter_email_sequences pes
      JOIN events e ON pes.event_id = e.id
      WHERE pes.sequence_status = 'active'
      AND pes.next_email_due <= NOW()
      AND pes.current_step <= 4
      AND e.event_status = 'unclaimed'
      ORDER BY pes.next_email_due ASC
      LIMIT 100
    `);
    
    console.log(`[Promoter Sequences] Found ${sequences.length} sequences due for email`);
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const sequence of sequences) {
      try {
        // Check blocklist before sending
        const [blocked] = await db.execute(`
          SELECT id FROM event_blocklist 
          WHERE promoter_email = ? 
          LIMIT 1
        `, [sequence.promoter_email]);
        
        if (blocked.length > 0) {
          console.log(`[Promoter Sequences] Email ${sequence.promoter_email} is blocked, stopping sequence`);
          await stopSequence(sequence.id, 'blocked');
          continue;
        }
        
        // Check if event was claimed (race condition protection)
        if (sequence.event_status !== 'unclaimed') {
          console.log(`[Promoter Sequences] Event ${sequence.event_id} is no longer unclaimed, stopping sequence`);
          await stopSequence(sequence.id, 'claimed');
          continue;
        }
        
        // Prepare template data
        const templateData = {
          event_name: sequence.event_name,
          event_dates: formatEventDates(sequence.start_date, sequence.end_date),
          event_location: sequence.event_location,
          promoter_first_name: extractFirstName(sequence.promoter_email),
          claim_url: generateClaimUrl(sequence.event_id),
          remove_url: generateRemoveUrl(sequence.event_id),
          sender_name: 'Your Name', // TODO: Make configurable
          artist_count: await getArtistTrackingCount(sequence.event_id),
          event_season: getEventSeason(sequence.start_date)
        };
        
        // Find or create promoter user (for email service)
        let promoterUserId = sequence.promoter_user_id;
        if (!promoterUserId) {
          promoterUserId = await findOrCreatePromoterContact(sequence.promoter_email);
          await db.execute(`
            UPDATE promoter_email_sequences 
            SET promoter_user_id = ? 
            WHERE id = ?
          `, [promoterUserId, sequence.id]);
        }
        
        // Send email via existing email service
        const templateKey = TEMPLATE_KEYS[sequence.current_step];
        await emailService.sendEmail(
          promoterUserId,
          templateKey,
          templateData,
          {
            replyTo: 'support@brakebee.com' // TODO: Make configurable
          }
        );
        
        console.log(`[Promoter Sequences] Sent email ${sequence.current_step} to ${sequence.promoter_email} for event ${sequence.event_id}`);
        
        // Update sequence record
        const currentStepField = `email_${sequence.current_step}_sent_at`;
        const nextStep = sequence.current_step + 1;
        const nextEmailDue = nextStep <= 4 
          ? calculateNextEmailDate(SEQUENCE_SCHEDULE[nextStep])
          : null;
        
        await db.execute(`
          UPDATE promoter_email_sequences 
          SET 
            current_step = ?,
            last_email_sent = NOW(),
            next_email_due = ?,
            ${currentStepField} = NOW(),
            sequence_status = ?,
            updated_at = NOW()
          WHERE id = ?
        `, [
          nextStep,
          nextEmailDue,
          nextStep > 4 ? 'completed' : 'active',
          sequence.id
        ]);
        
        sentCount++;
        
      } catch (error) {
        console.error(`[Promoter Sequences] Error processing sequence ${sequence.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`[Promoter Sequences] Completed: ${sentCount} sent, ${errorCount} errors`);
    
  } catch (error) {
    console.error('[Promoter Sequences] Fatal error:', error);
    throw error;
  }
}

// Helper functions

function formatEventDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', options);
  }
  
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function extractFirstName(email) {
  const name = email.split('@')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateClaimUrl(eventId) {
  return `https://brakebee.com/claim/${eventId}`;
}

function generateRemoveUrl(eventId) {
  return `https://brakebee.com/events/${eventId}/request-removal`;
}

function calculateNextEmailDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function getArtistTrackingCount(eventId) {
  // TODO: Implement if you track which artists save events
  return 'Artists are';
}

function getEventSeason(startDate) {
  const month = new Date(startDate).getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

async function findOrCreatePromoterContact(email) {
  // Check if user exists
  const [existing] = await db.execute(`
    SELECT id FROM users WHERE username = ? LIMIT 1
  `, [email]);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  // Create minimal promoter contact
  const [result] = await db.execute(`
    INSERT INTO users (username, user_type, status, email_verified)
    VALUES (?, 'promoter', 'draft', 'no')
  `, [email]);
  
  return result.insertId;
}

async function stopSequence(sequenceId, reason) {
  await db.execute(`
    UPDATE promoter_email_sequences 
    SET sequence_status = 'stopped', 
        stopped_reason = ?,
        stopped_at = NOW()
    WHERE id = ?
  `, [reason, sequenceId]);
}

// Run immediately
processPromoterSequences()
  .then(() => {
    console.log('[Promoter Sequences] Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Promoter Sequences] Process failed:', error);
    process.exit(1);
  });
```

### 3.2 Add to Crontab

**File:** `/var/www/main/api-service/setup-promoter-sequence-cron.sh`

```bash
#!/bin/bash

# Add promoter sequence cron job
# Runs every 4 hours to check for due emails

CRON_CMD="0 */4 * * * cd /var/www/main && node api-service/cron/process-promoter-sequences.js >> /var/www/main/api-service/logs/promoter-sequences.log 2>&1"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "process-promoter-sequences.js"; then
    # Add to existing crontab
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "Promoter sequence cron job added successfully"
else
    echo "Promoter sequence cron job already exists"
fi

# Create log directory if it doesn't exist
mkdir -p /var/www/main/api-service/logs

# Make the script executable
chmod +x /var/www/main/api-service/cron/process-promoter-sequences.js

echo "Setup complete"
```

**Make executable and run:**
```bash
chmod +x /var/www/main/api-service/setup-promoter-sequence-cron.sh
./api-service/setup-promoter-sequence-cron.sh
```

---

## PART 4: Sequence Initialization

### 4.1 Start Sequence When Event Published

**File:** `/var/www/main/api-service/src/routes/events.js`

**Add to event status update logic** (when changing from `pre-draft` to `unclaimed`):

```javascript
// When event status changes to unclaimed
if (event_status === 'unclaimed' && oldEvent.event_status !== 'unclaimed') {
  
  // Get promoter email from event data
  const [promoterData] = await db.execute(`
    SELECT u.username as email, u.id as user_id
    FROM events e
    LEFT JOIN users u ON e.promoter_id = u.id
    WHERE e.id = ?
  `, [eventId]);
  
  const promoterEmail = promoterData[0]?.email;
  
  if (promoterEmail) {
    // Check if sequence already exists
    const [existingSequence] = await db.execute(`
      SELECT id FROM promoter_email_sequences 
      WHERE event_id = ? 
      LIMIT 1
    `, [eventId]);
    
    if (existingSequence.length === 0) {
      // Create new sequence
      await db.execute(`
        INSERT INTO promoter_email_sequences (
          event_id,
          promoter_email,
          promoter_user_id,
          sequence_status,
          current_step,
          next_email_due
        ) VALUES (?, ?, ?, 'active', 1, NOW())
      `, [eventId, promoterEmail, promoterData[0]?.user_id]);
      
      console.log(`Started email sequence for event ${eventId}`);
    }
  } else {
    console.log(`No promoter email for event ${eventId}, cannot start sequence`);
  }
}
```

### 4.2 Stop Sequence When Event Claimed

**Add to event claim logic** (when status changes to `active` or `claimed`):

```javascript
// When event is claimed
if ((event_status === 'active' || event_status === 'claimed') && oldEvent.event_status === 'unclaimed') {
  
  // Stop email sequence
  await db.execute(`
    UPDATE promoter_email_sequences 
    SET sequence_status = 'stopped',
        stopped_reason = 'claimed',
        stopped_at = NOW()
    WHERE event_id = ? AND sequence_status = 'active'
  `, [eventId]);
  
  console.log(`Stopped email sequence for claimed event ${eventId}`);
}
```

### 4.3 Stop Sequence When Event Removed

**Add to removal logic** (when status changes to `red_flag_removal`):

```javascript
// When event is removed
if (event_status === 'red_flag_removal') {
  
  // Stop email sequence
  await db.execute(`
    UPDATE promoter_email_sequences 
    SET sequence_status = 'stopped',
        stopped_reason = 'removed',
        stopped_at = NOW()
    WHERE event_id = ? AND sequence_status = 'active'
  `, [eventId]);
  
  console.log(`Stopped email sequence for removed event ${eventId}`);
}
```

---

## PART 5: Testing & Monitoring

### 5.1 Manual Testing Commands

```bash
# Test the cron job manually
cd /var/www/main
node api-service/cron/process-promoter-sequences.js

# Check the log
tail -f /var/www/main/api-service/logs/promoter-sequences.log

# Query sequences in database
mysql -u your_user -p your_database -e "SELECT * FROM promoter_email_sequences;"

# Check email queue
mysql -u your_user -p your_database -e "SELECT * FROM email_queue WHERE template_id IN (SELECT id FROM email_templates WHERE template_key LIKE 'promoter_claim%') ORDER BY created_at DESC LIMIT 10;"
```

### 5.2 Admin Dashboard Widget

**Create widget to show sequence stats:**

```javascript
// Query for admin dashboard
const stats = await db.execute(`
  SELECT 
    COUNT(*) as total_sequences,
    SUM(CASE WHEN sequence_status = 'active' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN stopped_reason = 'claimed' THEN 1 ELSE 0 END) as claimed,
    SUM(CASE WHEN stopped_reason = 'removed' THEN 1 ELSE 0 END) as removed,
    AVG(current_step) as avg_step
  FROM promoter_email_sequences
`);
```

---

## Testing Checklist

After implementation:

- [ ] Database table created successfully
- [ ] Email templates inserted and visible in database
- [ ] Cron job added to crontab
- [ ] Can manually run cron script without errors
- [ ] Sequence starts when event status → unclaimed
- [ ] Sequence stops when event status → claimed
- [ ] Sequence stops when event status → red_flag_removal
- [ ] Emails appear in email_queue table
- [ ] Emails are sent by existing queue processor
- [ ] Sequence progresses through all 4 steps
- [ ] Blocklist checking works (doesn't send to blocked emails)
- [ ] Log file created and shows activity

---

**Implementation Time Estimate:** 2-3 hours

**Risk Level:** Low (uses existing infrastructure, minimal dependencies)

**Files Created:**
1. Database: `promoter_email_sequences` table
2. Templates: 4 new rows in `email_templates`
3. Cron: `/var/www/main/api-service/cron/process-promoter-sequences.js`
4. Setup: `/var/www/main/api-service/setup-promoter-sequence-cron.sh`
5. Updates: `/var/www/main/api-service/src/routes/events.js` (sequence triggers)
