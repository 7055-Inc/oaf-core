/**
 * Wholesale Applications Service (v2)
 * Business logic for wholesale buyer application management
 */

const db = require('../../../../config/db');

/**
 * Get wholesale applications by status
 */
async function listApplications({ status }) {
  let query = `
    SELECT 
      wa.*,
      u.username,
      CONCAT(u.first_name, ' ', u.last_name) as user_full_name
    FROM wholesale_applications wa
    JOIN users u ON wa.user_id = u.id
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
      CONCAT(u.first_name, ' ', u.last_name) as user_full_name
    FROM wholesale_applications wa
    JOIN users u ON wa.user_id = u.id
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

    // Grant wholesale permission by updating user_type
    await db.execute(`
      UPDATE users 
      SET user_type = 'wholesale' 
      WHERE id = ?
    `, [userId]);

    // Also add to user_permissions if the table exists
    try {
      await db.execute(`
        INSERT INTO user_permissions (user_id, wholesale) 
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE wholesale = 1
      `, [userId]);
    } catch (permError) {
      console.log('Note: Could not update user_permissions table:', permError.message);
    }

    await db.execute('COMMIT');
    return { success: true };

  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Deny wholesale application
 */
async function denyApplication(id, adminUserId, adminNotes, denialReason) {
  if (!denialReason) {
    throw new Error('Denial reason is required');
  }

  await db.execute(`
    UPDATE wholesale_applications 
    SET status = 'denied', 
        reviewed_by = ?, 
        review_date = NOW(), 
        admin_notes = ?,
        denial_reason = ?
    WHERE id = ?
  `, [adminUserId, adminNotes || 'Application denied', denialReason, id]);

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
    SELECT id, status FROM wholesale_applications 
    WHERE user_id = ? AND status IN ('pending', 'approved', 'under_review')
  `, [userId]);

  if (existingApp.length > 0) {
    const status = existingApp[0].status;
    throw new Error(`You already have a ${status} wholesale application`);
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

  return { application_id: result.insertId };
}

/**
 * Check user's application status
 */
async function getUserApplicationStatus(userId) {
  const [applications] = await db.execute(`
    SELECT id, status, created_at, review_date, denial_reason
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
