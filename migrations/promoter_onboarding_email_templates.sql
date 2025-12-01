-- ============================================================================
-- PROMOTER ONBOARDING EMAIL TEMPLATES
-- ============================================================================
-- Email templates for promoter claim invitation and drip campaign onboarding
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROMOTER CLAIM INVITATION EMAIL
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'promoter_claim_invitation',
  'Promoter Event Claim Invitation',
  1,
  0,
  1,
  'You\'ve Been Added to Brakebee! Claim Your Event: #{event_title}',
  '<h1>Welcome to Brakebee, #{promoter_first_name}!</h1>

<p>Great news! You\'ve been added to Brakebee, the premier platform for managing art fairs and events.</p>

<h2>Your Event Has Been Created</h2>

<p>We\'ve pre-created an event for you:</p>

<div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0;">
  <h3 style="margin-top: 0;">#{event_title}</h3>
  <p style="margin: 8px 0;"><strong>Dates:</strong> #{event_start_date} - #{event_end_date}</p>
  <p style="margin: 8px 0;"><strong>Venue:</strong> #{venue_name}</p>
  <p style="margin: 8px 0;"><strong>Location:</strong> #{venue_city}, #{venue_state}</p>
</div>

<h2>What\'s Next?</h2>

<p>To activate your account and claim your event, simply click the button below. You\'ll be able to:</p>

<ul>
  <li>✅ Set your password and secure your account</li>
  <li>✅ Complete your event details</li>
  <li>✅ Start accepting artist applications</li>
  <li>✅ Manage ticket sales and booth assignments</li>
  <li>✅ Access powerful event management tools</li>
</ul>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{claim_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Claim Your Event & Activate Account
  </a>
</div>

<p style="color: #666; font-size: 14px;">This link will expire in #{expires_days} days. If you have any questions, please reply to this email.</p>

<p>We\'re excited to have you on board!</p>

<p>
<strong>The Brakebee Team</strong><br>
<a href="https://brakebee.com">brakebee.com</a>
</p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 2. ONBOARDING EMAIL: WELCOME (DAY 0)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_welcome',
  'Promoter Onboarding: Welcome',
  2,
  0,
  0,
  'Welcome to Brakebee! Let\'s Complete Your Event',
  '<h1>Welcome to Brakebee, #{promoter_name}! 🎉</h1>

<p>Congratulations on claiming your event! We\'re thrilled to have you on board.</p>

<p>You\'ve taken the first step in creating an amazing event experience for artists and attendees. Now let\'s make your event shine!</p>

<h2>Quick Start Checklist</h2>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 10px 0;">☐ Complete your event profile</p>
  <p style="margin: 10px 0;">☐ Add event photos</p>
  <p style="margin: 10px 0;">☐ Set up ticket tiers</p>
  <p style="margin: 10px 0;">☐ Start accepting artist applications</p>
  <p style="margin: 10px 0;">☐ Publish your event</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{event_edit_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Complete Your Event Profile
  </a>
</div>

<p>Need help? Check out our <a href="#{help_url}">Event Organizer Guide</a> or reply to this email.</p>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 3. ONBOARDING EMAIL: COMPLETE EVENT (DAY 1)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_complete_event',
  'Promoter Onboarding: Complete Event Profile',
  2,
  0,
  0,
  'Complete Your Event Profile to Attract More Artists',
  '<h1>Let\'s Complete Your Event Profile</h1>

<p>Hi #{promoter_name},</p>

<p>A complete event profile attracts more artists and attendees. Here\'s what makes a great event page:</p>

<h2>Essential Elements</h2>

<ul>
  <li><strong>Detailed Description:</strong> Tell artists what makes your event special</li>
  <li><strong>Clear Schedule:</strong> Application deadlines, jury dates, event dates</li>
  <li><strong>Booth Information:</strong> Sizes, fees, and amenities</li>
  <li><strong>Application Requirements:</strong> What artists need to submit</li>
  <li><strong>Contact Information:</strong> Make it easy for artists to reach you</li>
</ul>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{event_edit_url}" style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Complete Event Profile
  </a>
</div>

<p><strong>Pro Tip:</strong> Events with complete profiles receive 3x more applications!</p>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 4. ONBOARDING EMAIL: PUBLISH EVENT (DAY 3)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_publish_event',
  'Promoter Onboarding: Publish Your Event',
  2,
  0,
  0,
  'Ready to Publish Your Event?',
  '<h1>Ready to Go Live? 🚀</h1>

<p>Hi #{promoter_name},</p>

<p>Your event is looking good! When you\'re ready to start accepting applications, publish your event to make it visible to thousands of artists on Brakebee.</p>

<h2>Before You Publish</h2>

<p>Make sure you\'ve:</p>

<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
  <p style="margin: 8px 0;">✓ Set your application deadline</p>
  <p style="margin: 8px 0;">✓ Defined booth fees and categories</p>
  <p style="margin: 8px 0;">✓ Added at least one event photo</p>
  <p style="margin: 8px 0;">✓ Reviewed your event description</p>
</div>

<p>Once published, artists can immediately start applying to your event!</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{event_edit_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Publish Event
  </a>
</div>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 5. ONBOARDING EMAIL: ADD PHOTOS (DAY 5)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_add_photos',
  'Promoter Onboarding: Add Event Photos',
  2,
  0,
  0,
  'Make Your Event Stand Out With Photos',
  '<h1>A Picture is Worth 1,000 Applications 📸</h1>

<p>Hi #{promoter_name},</p>

<p>Events with great photos receive significantly more applications. Let\'s make your event visually compelling!</p>

<h2>Photo Tips</h2>

<ul>
  <li><strong>Past Event Photos:</strong> Show artists the atmosphere and crowd</li>
  <li><strong>Venue Shots:</strong> Help artists visualize their booth space</li>
  <li><strong>Artist Action Shots:</strong> Artists selling, creating, engaging</li>
  <li><strong>Attendee Experience:</strong> Happy crowds enjoying the event</li>
</ul>

<div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
  <p style="margin: 0;"><strong>Recommended:</strong> Upload 5-10 high-quality photos showcasing different aspects of your event.</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{photos_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Upload Photos
  </a>
</div>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 6. ONBOARDING EMAIL: ACCEPT APPLICATIONS (DAY 7)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_accept_applications',
  'Promoter Onboarding: Start Accepting Applications',
  2,
  0,
  0,
  'Start Accepting Artist Applications',
  '<h1>Open the Doors to Artists! 🎨</h1>

<p>Hi #{promoter_name},</p>

<p>Ready to start building your artist roster? Let\'s open applications!</p>

<h2>Application Settings</h2>

<p>Control every aspect of your application process:</p>

<ul>
  <li><strong>Application Deadline:</strong> Set a clear cutoff date</li>
  <li><strong>Jury Settings:</strong> Configure how you\'ll review applications</li>
  <li><strong>Auto-Responses:</strong> Automatic confirmation emails to applicants</li>
  <li><strong>Application Fee:</strong> Optional fee to cover processing</li>
  <li><strong>Requirements:</strong> Specify what artists must submit</li>
</ul>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{event_settings_url}" style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Configure Applications
  </a>
</div>

<p><strong>Pro Tip:</strong> Set your deadline 2-3 months before your event to give artists time to prepare.</p>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 7. ONBOARDING EMAIL: CREATE TICKETS (DAY 10)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_create_tickets',
  'Promoter Onboarding: Set Up Ticket Sales',
  2,
  0,
  0,
  'Set Up Ticket Sales for Your Event',
  '<h1>Turn Your Event Into Revenue 💰</h1>

<p>Hi #{promoter_name},</p>

<p>Maximize attendance and revenue with Brakebee\'s integrated ticketing system.</p>

<h2>Ticketing Features</h2>

<ul>
  <li><strong>Multiple Ticket Tiers:</strong> General admission, VIP, early bird, etc.</li>
  <li><strong>Promo Codes:</strong> Create discounts for specific groups</li>
  <li><strong>Capacity Management:</strong> Set limits per tier</li>
  <li><strong>Instant Payments:</strong> Get paid immediately after sales</li>
  <li><strong>QR Code Scanning:</strong> Easy check-in at the door</li>
</ul>

<div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
  <p style="margin: 0;"><strong>Brakebee handles all payment processing - you just collect the revenue!</strong></p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{tickets_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Set Up Tickets
  </a>
</div>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 8. ONBOARDING EMAIL: REVIEW APPLICATIONS (DAY 14)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_review_applications',
  'Promoter Onboarding: Tips for Reviewing Applications',
  2,
  0,
  0,
  'Tips for Reviewing Artist Applications',
  '<h1>Master the Art of Jurying 🎯</h1>

<p>Hi #{promoter_name},</p>

<p>Reviewing applications can be overwhelming. Here are our best practices for building the perfect artist lineup:</p>

<h2>Jurying Best Practices</h2>

<ul>
  <li><strong>Set Clear Criteria:</strong> Define what makes an artist a good fit</li>
  <li><strong>Category Balance:</strong> Ensure variety across art mediums</li>
  <li><strong>Quality Over Quantity:</strong> Better to have fewer excellent artists</li>
  <li><strong>Review Portfolios:</strong> Look at past work, not just current submissions</li>
  <li><strong>Consider Experience:</strong> Mix of established and emerging artists</li>
</ul>

<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
  <p style="margin: 0;"><strong>Pro Tip:</strong> Use the bulk actions feature to process applications faster!</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{applications_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Review Applications
  </a>
</div>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 9. ONBOARDING EMAIL: MARKETING MATERIALS (DAY 21)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_marketing_materials',
  'Promoter Onboarding: Marketing Materials',
  2,
  0,
  0,
  'Boost Your Event With Marketing Materials',
  '<h1>Amplify Your Event\'s Reach 📣</h1>

<p>Hi #{promoter_name},</p>

<p>Want to increase attendance and artist applications? Professional marketing materials make all the difference.</p>

<h2>Available Marketing Tools</h2>

<ul>
  <li><strong>Social Media Graphics:</strong> Ready-to-post designs</li>
  <li><strong>Email Templates:</strong> Reach your mailing list</li>
  <li><strong>Printable Posters:</strong> For local promotion</li>
  <li><strong>Digital Ads:</strong> Facebook and Instagram ready</li>
  <li><strong>Press Release Template:</strong> Get local media coverage</li>
</ul>

<div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
  <p style="margin: 0;"><strong>New:</strong> Customizable marketing kits with your event branding!</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{marketing_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Order Marketing Materials
  </a>
</div>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ----------------------------------------------------------------------------
-- 10. ONBOARDING EMAIL: ADVANCED FEATURES (DAY 30)
-- ----------------------------------------------------------------------------

INSERT INTO `email_templates` (
  `template_key`,
  `name`,
  `priority_level`,
  `can_compile`,
  `is_transactional`,
  `subject_template`,
  `body_template`,
  `layout_key`
) VALUES (
  'onboarding_advanced_features',
  'Promoter Onboarding: Advanced Features',
  2,
  0,
  0,
  'Advanced Features: Jury Packets & More',
  '<h1>Level Up Your Event Management 🚀</h1>

<p>Hi #{promoter_name},</p>

<p>You\'ve mastered the basics! Now let\'s explore advanced features that set professional events apart:</p>

<h2>Advanced Tools</h2>

<ul>
  <li><strong>Jury Packet System:</strong> Streamlined jury review process</li>
  <li><strong>Booth Assignments:</strong> Interactive floor plan management</li>
  <li><strong>Automated Emails:</strong> Reminders, confirmations, and updates</li>
  <li><strong>Revenue Reports:</strong> Track ticket sales and booth fees</li>
  <li><strong>Artist Personas:</strong> Help artists manage multiple art styles</li>
  <li><strong>Multi-Event Management:</strong> Run multiple events simultaneously</li>
</ul>

<div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
  <p style="margin: 0;"><strong>Success Story:</strong> Events using our jury packet system save an average of 20 hours on artist selection!</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{dashboard_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
    Explore Advanced Features
  </a>
</div>

<p>Have questions or need help? Our support team is here for you - just reply to this email!</p>

<p>Best,<br><strong>The Brakebee Team</strong></p>',
  'default'
) ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `subject_template` = VALUES(`subject_template`),
  `body_template` = VALUES(`body_template`);

-- ============================================================================
-- TEMPLATES INSTALLATION COMPLETE
-- ============================================================================

