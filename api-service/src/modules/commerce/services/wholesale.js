/**
 * Wholesale Applications Service (v2)
 * Business logic for wholesale buyer application management
 */

const db = require('../../../../config/db');
const EmailService = require('../../../services/emailService');

const emailService = new EmailService();
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://brakebee.com';

/**
 * Get wholesale applications by status
 */
async function listApplications({ status }) {
  let query = `
    SELECT 
      wa.*,
      u.username,
      COALESCE(CONCAT(up.first_name, ' ', up.last_name), u.username) as user_full_name
    FROM wholesale_applications wa
    JOIN users u ON wa.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
  `;
  
  const params = [];
  
  if (status) {
    query += ' WHERE wa.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY wa.created_at DESC';
  
  const [applications] = await db.execute(query, params);
  return applications;
}

/**
 * Get single application by ID
 */
async function getApplication(id) {
  const [applications] = await db.execute(`
    SELECT 
      wa.*,
      u.username,
      COALESCE(CONCAT(up.first_name, ' ', up.last_name), u.username) as user_full_name
    FROM wholesale_applications wa
    JOIN users u ON wa.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE wa.id = ?
  `, [id]);
  
  return applications[0] || null;
}

/**
 * Get application statistics
 */
async function getStats() {
  const [stats] = await db.execute(`
    SELECT 
      COUNT(*) as total_applications,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_count,
      SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_count
    FROM wholesale_applications
  `);
  
  return stats[0];
}

/**
 * Approve wholesale application
 */
async function approveApplication(id, adminUserId, adminNotes) {
  // Get the application
  const [application] = await db.execute(
    'SELECT user_id, business_name FROM wholesale_applications WHERE id = ?',
    [id]
  );

  if (application.length === 0) {
    throw new Error('Application not found');
  }

  const userId = application[0].user_id;

  // Start transaction
  await db.execute('START TRANSACTION');

  try {
    // Update application status
    await db.execute(`
      UPDATE wholesale_applications 
      SET status = 'approved', 
          reviewed_by = ?, 
          review_date = NOW(), 
          admin_notes = ?
      WHERE id = ?
    `, [adminUserId, adminNotes || 'Application approved', id]);

    // Grant wholesale permission
    await db.execute(`
      INSERT INTO user_permissions (user_id, wholesale) 
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE wholesale = 1
    `, [userId]);

    await db.execute('COMMIT');

    try {
      await emailService.queueEmail(userId, 'wholesale_application_approved', {
        contactName: application[0].business_name,
        businessName: application[0].business_name,
        dashboardLink: `${FRONTEND_URL}/dashboard`
      }, { priority: 2 });
    } catch (emailErr) {
      console.error('Error queuing wholesale approval email:', emailErr);
    }

    return { success: true };

  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Deny wholesale application
 */
async function denyApplication(id, adminUserId, adminNotes, denialReason, reapplicationPolicy = 'allowed') {
  if (!denialReason) {
    throw new Error('Denial reason is required');
  }

  await db.execute(`
    UPDATE wholesale_applications 
    SET status = 'denied', 
        reviewed_by = ?, 
        review_date = NOW(), 
        admin_notes = ?,
        denial_reason = ?,
        reapplication_policy = ?
    WHERE id = ?
  `, [adminUserId, adminNotes || 'Application denied', denialReason, reapplicationPolicy || 'allowed', id]);

  // Get application details for email
  const [appData] = await db.execute(
    'SELECT user_id, business_name FROM wholesale_applications WHERE id = ?', [id]
  );

  if (appData.length > 0) {
    const reapplyMessages = {
      allowed: 'You are welcome to reapply with updated information at any time.',
      blocked: 'Unfortunately, reapplication is not available for this account. Please contact support if you have questions.',
      cooldown_90: 'You may submit a new application after 90 days from today.'
    };

    try {
      await emailService.queueEmail(appData[0].user_id, 'wholesale_application_denied', {
        contactName: appData[0].business_name,
        businessName: appData[0].business_name,
        denialReason,
        reapplicationMessage: reapplyMessages[reapplicationPolicy] || reapplyMessages.allowed,
        supportEmail: 'marketplace@brakebee.com'
      }, { priority: 2 });
    } catch (emailErr) {
      console.error('Error queuing wholesale denial email:', emailErr);
    }
  }

  return { success: true };
}

/**
 * Submit wholesale application (customer)
 */
async function submitApplication(userId, applicationData) {
  const {
    business_name, business_type, tax_id, business_address,
    business_city, business_state, business_zip, business_phone,
    business_email, contact_name, contact_title, years_in_business,
    business_description, product_categories, expected_order_volume,
    website_url, resale_certificate, additional_info
  } = applicationData;

  // Validate required fields
  const requiredFields = [
    'business_name', 'business_type', 'tax_id', 'business_address',
    'business_city', 'business_state', 'business_zip', 'business_phone',
    'business_email', 'contact_name', 'years_in_business', 
    'business_description', 'product_categories', 'expected_order_volume'
  ];

  for (const field of requiredFields) {
    if (!applicationData[field]) {
      throw new Error(`${field} is required`);
    }
  }

  // Check if user already has a pending or approved application
  const [existingApp] = await db.execute(`
    SELECT id, status, reapplication_policy, review_date FROM wholesale_applications 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId]);

  if (existingApp.length > 0) {
    const app = existingApp[0];

    if (['pending', 'approved', 'under_review'].includes(app.status)) {
      throw new Error(`You already have a ${app.status} wholesale application`);
    }

    // Enforce reapplication policy for denied applications
    if (app.status === 'denied') {
      if (app.reapplication_policy === 'blocked') {
        throw new Error('Reapplication is not available for this account. Please contact support.');
      }
      if (app.reapplication_policy === 'cooldown_90' && app.review_date) {
        const cooldownEnd = new Date(app.review_date);
        cooldownEnd.setDate(cooldownEnd.getDate() + 90);
        if (new Date() < cooldownEnd) {
          const dateStr = cooldownEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          throw new Error(`You may reapply after ${dateStr}.`);
        }
      }
    }
  }

  // Insert the application
  const [result] = await db.execute(`
    INSERT INTO wholesale_applications (
      user_id, business_name, business_type, tax_id, business_address,
      business_city, business_state, business_zip, business_phone, business_email,
      contact_name, contact_title, years_in_business, business_description,
      product_categories, expected_order_volume, website_url, resale_certificate,
      additional_info, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `, [
    userId, business_name, business_type, tax_id, business_address,
    business_city, business_state, business_zip, business_phone, business_email,
    contact_name, contact_title, years_in_business, business_description,
    product_categories, expected_order_volume, website_url, resale_certificate,
    additional_info
  ]);

  try {
    await emailService.queueEmail(userId, 'wholesale_application_received', {
      contactName: contact_name,
      businessName: business_name,
      applicationStatusLink: `${FRONTEND_URL}/dashboard/account/wholesale-application`
    }, { priority: 2 });
  } catch (emailErr) {
    console.error('Error queuing wholesale application received email:', emailErr);
  }

  return { application_id: result.insertId };
}

/**
 * Check user's application status
 */
async function getUserApplicationStatus(userId) {
  const [applications] = await db.execute(`
    SELECT id, status, created_at, review_date, denial_reason, reapplication_policy
    FROM wholesale_applications 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId]);

  return applications[0] || null;
}

module.exports = {
  listApplications,
  getApplication,
  getStats,
  approveApplication,
  denyApplication,
  submitApplication,
  getUserApplicationStatus
};
