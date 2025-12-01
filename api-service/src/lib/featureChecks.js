const db = require('../../config/db');

/**
 * @fileoverview Feature Check Functions for Drip Campaign
 * 
 * These functions check if a user has completed specific features/actions
 * Used to conditionally skip drip campaign emails
 */

/**
 * Check if user has published any events
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user has published events
 */
async function event_is_published(userId) {
  try {
    const [events] = await db.execute(`
      SELECT id FROM events 
      WHERE promoter_id = ? AND event_status = 'active'
      LIMIT 1
    `, [userId]);
    
    return events.length > 0;
  } catch (error) {
    console.error('Error checking if event is published:', error);
    return false; // If error, send the email anyway
  }
}

/**
 * Check if user's events have photos
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if any event has photos
 */
async function event_has_photos(userId) {
  try {
    const [photos] = await db.execute(`
      SELECT ep.id 
      FROM event_photos ep
      JOIN events e ON ep.event_id = e.id
      WHERE e.promoter_id = ?
      LIMIT 1
    `, [userId]);
    
    return photos.length > 0;
  } catch (error) {
    console.error('Error checking if event has photos:', error);
    return false;
  }
}

/**
 * Check if user is accepting applications
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if any event is accepting applications
 */
async function event_accepting_applications(userId) {
  try {
    const [events] = await db.execute(`
      SELECT id FROM events 
      WHERE promoter_id = ? 
        AND allow_applications = 1 
        AND application_status IN ('accepting', 'jurying')
      LIMIT 1
    `, [userId]);
    
    return events.length > 0;
  } catch (error) {
    console.error('Error checking if accepting applications:', error);
    return false;
  }
}

/**
 * Check if user's events have ticket tiers
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if any event has tickets
 */
async function event_has_tickets(userId) {
  try {
    const [tickets] = await db.execute(`
      SELECT tt.id 
      FROM ticket_tiers tt
      JOIN events e ON tt.event_id = e.id
      WHERE e.promoter_id = ?
      LIMIT 1
    `, [userId]);
    
    return tickets.length > 0;
  } catch (error) {
    console.error('Error checking if event has tickets:', error);
    return false;
  }
}

/**
 * Check if promoter has reviewed any applications
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if promoter has reviewed applications
 */
async function promoter_has_reviewed_applications(userId) {
  try {
    const [applications] = await db.execute(`
      SELECT ea.id 
      FROM event_applications ea
      JOIN events e ON ea.event_id = e.id
      WHERE e.promoter_id = ? 
        AND ea.status IN ('accepted', 'rejected', 'waitlisted')
      LIMIT 1
    `, [userId]);
    
    return applications.length > 0;
  } catch (error) {
    console.error('Error checking if promoter reviewed applications:', error);
    return false;
  }
}

/**
 * Generic feature check dispatcher
 * @param {string} functionName - Name of the feature check function
 * @param {number} userId - User ID
 * @param {Object} params - Additional parameters (not used currently but available)
 * @returns {Promise<boolean>} Result of feature check
 */
async function checkFeature(functionName, userId, params = {}) {
  const featureCheckFunctions = {
    event_is_published,
    event_has_photos,
    event_accepting_applications,
    event_has_tickets,
    promoter_has_reviewed_applications
  };

  if (typeof featureCheckFunctions[functionName] === 'function') {
    return await featureCheckFunctions[functionName](userId, params);
  }

  console.warn(`Feature check function '${functionName}' not found`);
  return false; // If function doesn't exist, send email anyway
}

module.exports = {
  event_is_published,
  event_has_photos,
  event_accepting_applications,
  event_has_tickets,
  promoter_has_reviewed_applications,
  checkFeature
};

