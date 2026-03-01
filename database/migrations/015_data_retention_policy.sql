-- Data Retention Policy table
-- Follows the same structure as other policy tables (shipping_policies, privacy_policies, etc.)

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT DEFAULT NULL,
  policy_text TEXT NOT NULL,
  status ENUM('active','archived') DEFAULT 'active',
  created_by BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add deletion_approved_at column to users table for GDPR user deletion workflow
ALTER TABLE users ADD COLUMN deletion_approved_at TIMESTAMP NULL DEFAULT NULL AFTER status;
ALTER TABLE users ADD COLUMN deletion_approved_by BIGINT NULL DEFAULT NULL AFTER deletion_approved_at;

-- Seed the default data retention policy
INSERT INTO data_retention_policies (user_id, policy_text, status, created_at) VALUES (
  NULL,
  '<h2>Data Retention Policy</h2>

<p>This policy describes what personal data we collect, why we collect it, how long we retain it, and how you can request its deletion.</p>

<h3>1. User Account Data</h3>
<p>Your account information (name, email, profile details) is retained while your account is active. If you request account deletion, all associated personal information will be removed within 30 days of administrative approval. You may request deletion by contacting us or through your account settings.</p>

<h3>2. Financial &amp; Order Data</h3>
<p>Order history, transaction records, tax documents, payment receipts, and affiliate data are retained for <strong>10 years</strong> from the date of the transaction to comply with tax and accounting regulations. When a user account is deleted, financial records are kept but all personally identifiable information is removed.</p>

<h3>3. Contact Submissions</h3>
<p>Messages submitted through contact forms (including name, email, phone, and message content) are retained indefinitely as business correspondence records.</p>

<h3>4. Session &amp; Authentication Data</h3>
<p>Session tokens and refresh tokens are automatically purged <strong>30 days</strong> after expiration. Active sessions are retained while valid.</p>

<h3>5. System Logs</h3>
<p>Error logs, email delivery logs, marketplace sync logs, search queries, and bounce tracking data are retained for <strong>90 days</strong> and then automatically deleted. Administrative audit logs (such as impersonation records) are retained for <strong>1 year</strong>.</p>

<h3>6. Email Queue</h3>
<p>Unsent email queue items older than <strong>7 days</strong> are automatically purged.</p>

<h3>7. Marketing Data</h3>
<p>Campaign analytics, marketing content, and related assets are retained as long as the associated campaign exists.</p>

<h3>8. Uploaded Files</h3>
<p>Failed image uploads are automatically cleaned up after <strong>30 days</strong>. Successfully processed uploads are retained as long as the associated content (product, event, profile) exists.</p>

<h3>9. Your Rights</h3>
<p>You have the right to:</p>
<ul>
  <li>Request a copy of the personal data we hold about you</li>
  <li>Request correction of inaccurate personal data</li>
  <li>Request deletion of your personal data (subject to legal retention requirements)</li>
  <li>Withdraw consent for data processing at any time</li>
</ul>
<p>To exercise any of these rights, please contact us through your account dashboard or email our support team.</p>

<h3>10. Automated Cleanup</h3>
<p>We run automated data cleanup processes daily to enforce the retention periods described above. This ensures that data is not kept longer than necessary.</p>

<p><em>Last updated: February 2026</em></p>',
  'active',
  NOW()
);
