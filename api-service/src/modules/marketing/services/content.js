/**
 * Marketing Content Service
 * Handles user-submitted marketing content (images, videos)
 */

const db = require('../../../../config/db');

/**
 * Create a new marketing content submission
 */
async function createSubmission(data) {
  const {
    userId,
    email,
    firstName,
    lastName,
    businessName,
    ipAddress,
    description,
    consentGiven
  } = data;

  const [result] = await db.execute(
    `INSERT INTO marketing_content_submissions 
     (user_id, email, first_name, last_name, business_name, ip_address, description, consent_given)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, firstName, lastName, businessName || null, ipAddress, description, consentGiven ? 1 : 0]
  );

  return result.insertId;
}

/**
 * Add media to a submission
 */
async function addMediaToSubmission(submissionId, mediaFiles) {
  const insertPromises = mediaFiles.map(file => {
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    const imagePath = `/temp_images/marketing/${file.filename}`;
    
    return db.execute(
      `INSERT INTO marketing_content_media 
       (submission_id, image_path, original_filename, media_type, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [submissionId, imagePath, file.originalname, mediaType, file.mimetype, file.size]
    );
  });

  await Promise.all(insertPromises);
}

/**
 * Get submissions for a specific user
 */
async function getUserSubmissions(userId) {
  const [submissions] = await db.execute(
    `SELECT s.*, 
            GROUP_CONCAT(m.id) as media_ids,
            GROUP_CONCAT(m.image_path) as media_paths,
            GROUP_CONCAT(m.original_filename) as media_filenames,
            GROUP_CONCAT(m.media_type) as media_types
     FROM marketing_content_submissions s
     LEFT JOIN marketing_content_media m ON s.id = m.submission_id
     WHERE s.user_id = ?
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return submissions.map(formatSubmission);
}

/**
 * Get all submissions (admin)
 */
async function getAllSubmissions(filters = {}) {
  let query = `
    SELECT s.*, 
           GROUP_CONCAT(m.id) as media_ids,
           GROUP_CONCAT(m.image_path) as media_paths,
           GROUP_CONCAT(m.original_filename) as media_filenames,
           GROUP_CONCAT(m.media_type) as media_types
    FROM marketing_content_submissions s
    LEFT JOIN marketing_content_media m ON s.id = m.submission_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (filters.status) {
    conditions.push('s.status = ?');
    params.push(filters.status);
  }
  
  if (filters.userId) {
    conditions.push('s.user_id = ?');
    params.push(filters.userId);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY s.id ORDER BY s.created_at DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  if (filters.offset) {
    query += ' OFFSET ?';
    params.push(parseInt(filters.offset));
  }
  
  const [submissions] = await db.execute(query, params);
  
  return submissions.map(formatSubmission);
}

/**
 * Get a single submission by ID
 */
async function getSubmissionById(submissionId) {
  const [submissions] = await db.execute(
    `SELECT s.*, 
            GROUP_CONCAT(m.id) as media_ids,
            GROUP_CONCAT(m.image_path) as media_paths,
            GROUP_CONCAT(m.original_filename) as media_filenames,
            GROUP_CONCAT(m.media_type) as media_types
     FROM marketing_content_submissions s
     LEFT JOIN marketing_content_media m ON s.id = m.submission_id
     WHERE s.id = ?
     GROUP BY s.id`,
    [submissionId]
  );

  if (submissions.length === 0) {
    return null;
  }

  return formatSubmission(submissions[0]);
}

/**
 * Update admin notes on a submission
 */
async function updateAdminNotes(submissionId, adminNotes) {
  await db.execute(
    'UPDATE marketing_content_submissions SET admin_notes = ? WHERE id = ?',
    [adminNotes, submissionId]
  );
}

/**
 * Update submission status
 */
async function updateStatus(submissionId, status) {
  await db.execute(
    'UPDATE marketing_content_submissions SET status = ? WHERE id = ?',
    [status, submissionId]
  );
}

/**
 * Get media item by ID
 */
async function getMediaById(mediaId) {
  const [media] = await db.execute(
    'SELECT * FROM marketing_content_media WHERE id = ?',
    [mediaId]
  );
  
  return media.length > 0 ? media[0] : null;
}

/**
 * Delete a submission and its media
 */
async function deleteSubmission(submissionId) {
  // Media will be cascade deleted due to FK constraint
  await db.execute(
    'DELETE FROM marketing_content_submissions WHERE id = ?',
    [submissionId]
  );
}

/**
 * Format submission with parsed media arrays
 */
function formatSubmission(submission) {
  const media = [];
  
  if (submission.media_ids) {
    const ids = submission.media_ids.split(',');
    const paths = submission.media_paths.split(',');
    const filenames = submission.media_filenames.split(',');
    const types = submission.media_types.split(',');
    
    for (let i = 0; i < ids.length; i++) {
      media.push({
        id: parseInt(ids[i]),
        image_path: paths[i],
        original_filename: filenames[i],
        media_type: types[i]
      });
    }
  }
  
  return {
    id: submission.id,
    user_id: submission.user_id,
    email: submission.email,
    first_name: submission.first_name,
    last_name: submission.last_name,
    business_name: submission.business_name,
    ip_address: submission.ip_address,
    description: submission.description,
    consent_given: submission.consent_given === 1,
    admin_notes: submission.admin_notes,
    status: submission.status,
    created_at: submission.created_at,
    updated_at: submission.updated_at,
    media
  };
}

module.exports = {
  createSubmission,
  addMediaToSubmission,
  getUserSubmissions,
  getAllSubmissions,
  getSubmissionById,
  updateAdminNotes,
  updateStatus,
  getMediaById,
  deleteSubmission
};
