/**
 * CRM Tier Enforcement Utility
 * Checks and enforces subscriber, email, and campaign limits based on user's CRM tier
 */

const db = require('../../../../config/db');

// Import tier limits from shared config
const { getTierLimits } = require('../../../../../lib/crm/tierConfig');

/**
 * Get user's current CRM tier and limits (including addon bonuses)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { tier, limits }
 */
async function getUserTierLimits(userId) {
  const [subscriptions] = await db.execute(
    `SELECT tier FROM user_subscriptions 
     WHERE user_id = ? AND subscription_type = 'crm' AND status IN ('active', 'incomplete')
     LIMIT 1`,
    [userId]
  );
  
  if (subscriptions.length === 0) {
    throw new Error('No active CRM subscription found');
  }
  
  const tier = subscriptions[0].tier;
  const baseLimits = getTierLimits(tier);
  
  // Get extra drip campaigns from addons
  const [addonResult] = await db.execute(
    `SELECT COALESCE(SUM(quantity), 0) as extra_drips 
     FROM crm_subscription_addons 
     WHERE user_id = ? AND addon_type = 'extra_drip_campaign' AND is_active = 1`,
    [userId]
  );
  
  const extraDrips = addonResult[0]?.extra_drips || 0;
  
  // Apply addon bonuses
  const limits = {
    ...baseLimits,
    max_drip_campaigns: baseLimits.max_drip_campaigns + extraDrips,
    extra_drip_campaigns_purchased: extraDrips
  };
  
  return { tier, limits };
}

/**
 * Check if user can add more subscribers
 * @param {number} userId - User ID
 * @param {number} addCount - Number of subscribers to add (default 1)
 * @returns {Promise<Object>} { allowed: boolean, current: number, limit: number, tier: string }
 */
async function checkSubscriberLimit(userId, addCount = 1) {
  const { tier, limits } = await getUserTierLimits(userId);
  
  // Count current active subscribers
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM user_email_lists 
     WHERE user_id = ? AND status = 'subscribed'`,
    [userId]
  );
  
  const currentCount = countResult[0].total;
  const newTotal = currentCount + addCount;
  const allowed = newTotal <= limits.max_subscribers;
  
  return {
    allowed,
    current: currentCount,
    limit: limits.max_subscribers,
    tier,
    wouldBe: newTotal
  };
}

/**
 * Check if user can send campaign (based on monthly email limit)
 * Counts single blast sends (email_campaign_analytics) + drip campaign sends (drip_events)
 * @param {number} userId - User ID
 * @param {number} recipientCount - Number of recipients for this campaign
 * @returns {Promise<Object>} { allowed: boolean, current: number, limit: number, tier: string }
 */
async function checkEmailLimit(userId, recipientCount = 0) {
  const { tier, limits } = await getUserTierLimits(userId);
  
  const monthStart = "DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')";
  const monthEnd = "DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01 00:00:00')";

  // Count single blast emails (from email_campaign_analytics via user_email_lists)
  // Plus drip campaign emails (from drip_events via drip_enrollments)
  const [countResult] = await db.execute(
    `SELECT (
      SELECT COUNT(*) FROM email_campaign_analytics eca
      JOIN user_email_lists uel ON eca.user_list_id = uel.id
      WHERE uel.user_id = ?
      AND eca.sent_at >= ${monthStart}
      AND eca.sent_at < ${monthEnd}
    ) + (
      SELECT COUNT(*) FROM drip_events de
      JOIN drip_enrollments den ON de.enrollment_id = den.id
      WHERE den.user_id = ? AND de.event_type = 'sent'
      AND de.created_at >= ${monthStart}
      AND de.created_at < ${monthEnd}
    ) as total`,
    [userId, userId]
  );
  
  const currentCount = Number(countResult[0]?.total ?? 0);
  const newTotal = currentCount + recipientCount;
  const allowed = newTotal <= limits.max_emails_per_month;
  
  return {
    allowed,
    current: currentCount,
    limit: limits.max_emails_per_month,
    tier,
    wouldBe: newTotal
  };
}

/**
 * Check if user can create more drip campaigns
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { allowed: boolean, current: number, limit: number, tier: string }
 */
async function checkDripCampaignLimit(userId) {
  const { tier, limits } = await getUserTierLimits(userId);
  
  // Count active drip campaigns created by user (excluding single blasts)
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM drip_campaigns 
     WHERE created_by = ? AND is_active = 1 
     AND campaign_type != 'single_blast'`,
    [userId]
  );
  
  const currentCount = countResult[0].total;
  const allowed = currentCount < limits.max_drip_campaigns;
  
  return {
    allowed,
    current: currentCount,
    limit: limits.max_drip_campaigns,
    tier,
    extra_purchased: limits.extra_drip_campaigns_purchased || 0,
    can_purchase_more: limits.addon_drip_price > 0
  };
}

/**
 * Enforce subscriber limit (throws error if exceeded)
 * @param {number} userId - User ID
 * @param {number} addCount - Number to add
 * @throws {Error} If limit would be exceeded
 */
async function enforceSubscriberLimit(userId, addCount = 1) {
  const check = await checkSubscriberLimit(userId, addCount);
  
  if (!check.allowed) {
    const error = new Error(
      `Subscriber limit reached. Your ${check.tier} plan allows ${check.limit} subscribers. ` +
      `You currently have ${check.current} and are trying to add ${addCount}. ` +
      `Please upgrade your plan to add more subscribers.`
    );
    error.statusCode = 403;
    error.code = 'SUBSCRIBER_LIMIT_EXCEEDED';
    throw error;
  }
  
  return check;
}

/**
 * Enforce email sending limit (throws error if exceeded)
 * @param {number} userId - User ID
 * @param {number} recipientCount - Number of recipients
 * @throws {Error} If limit would be exceeded
 */
async function enforceEmailLimit(userId, recipientCount) {
  const check = await checkEmailLimit(userId, recipientCount);
  
  if (!check.allowed) {
    const error = new Error(
      `Monthly email limit reached. Your ${check.tier} plan allows ${check.limit} emails per month. ` +
      `You have sent ${check.current} emails this month. ` +
      `This campaign would send ${recipientCount} more emails. ` +
      `Please upgrade your plan or wait until next month.`
    );
    error.statusCode = 403;
    error.code = 'EMAIL_LIMIT_EXCEEDED';
    throw error;
  }
  
  return check;
}

/**
 * Enforce drip campaign limit (throws error if exceeded)
 * @param {number} userId - User ID
 * @throws {Error} If limit would be exceeded
 */
async function enforceDripCampaignLimit(userId) {
  const check = await checkDripCampaignLimit(userId);
  
  if (!check.allowed) {
    const error = new Error(
      `Drip campaign limit reached. Your ${check.tier} plan allows ${check.limit} active drip campaigns. ` +
      `You currently have ${check.current}. ` +
      `Please upgrade your plan or deactivate an existing campaign.`
    );
    error.statusCode = 403;
    error.code = 'DRIP_CAMPAIGN_LIMIT_EXCEEDED';
    throw error;
  }
  
  return check;
}

/**
 * Check if user can send a single blast campaign
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { allowed: boolean, current: number, limit: number, credits: number, needsCredit: boolean }
 */
async function checkSingleBlastLimit(userId) {
  const { tier, limits } = await getUserTierLimits(userId);
  
  // Get current month's blast count
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM crm_single_blast_usage
     WHERE user_id = ? 
     AND sent_at >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
     AND sent_at < DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01 00:00:00')`,
    [userId]
  );
  
  const currentCount = countResult[0].total;
  const needsCredit = limits.pay_per_blast === true;
  
  // If pay-per-send tier, check available credits
  let availableCredits = 0;
  if (needsCredit) {
    const [creditsResult] = await db.execute(
      `SELECT COALESCE(SUM(credits), 0) as total FROM crm_blast_credits
       WHERE user_id = ? 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );
    availableCredits = creditsResult[0]?.total || 0;
  }
  
  const allowed = needsCredit ? availableCredits > 0 : currentCount < limits.max_single_blasts;
  
  return {
    allowed,
    current: currentCount,
    limit: limits.max_single_blasts,
    tier,
    needsCredit,
    availableCredits,
    creditPrice: limits.blast_price || 0
  };
}

/**
 * Enforce single blast limit (throws error if exceeded or no credits)
 * @param {number} userId - User ID
 * @throws {Error} If limit exceeded or no credits available
 */
async function enforceSingleBlastLimit(userId) {
  const check = await checkSingleBlastLimit(userId);
  
  if (!check.allowed) {
    if (check.needsCredit) {
      const error = new Error(
        `No blast credits available. Your ${check.tier} plan requires pay-per-send credits. ` +
        `Purchase a blast credit for $${check.creditPrice} to send this campaign.`
      );
      error.statusCode = 402; // Payment Required
      error.code = 'BLAST_CREDIT_REQUIRED';
      throw error;
    } else {
      const error = new Error(
        `Single blast limit reached. Your ${check.tier} plan allows ${check.limit} single blasts per month. ` +
        `You have sent ${check.current} this month. ` +
        `Please upgrade your plan or wait until next month.`
      );
      error.statusCode = 403;
      error.code = 'SINGLE_BLAST_LIMIT_EXCEEDED';
      throw error;
    }
  }
  
  return check;
}

/**
 * Record single blast usage and consume credit if needed
 * @param {number} userId - User ID
 * @param {number} campaignId - Campaign ID
 * @param {number} recipientCount - Number of recipients
 * @returns {Promise<Object>} Usage record
 */
async function recordSingleBlastUsage(userId, campaignId, recipientCount) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { limits } = await getUserTierLimits(userId);
    const needsCredit = limits.pay_per_blast === true;
    
    let creditRecordId = null;
    
    // If pay-per-send tier, consume a credit
    if (needsCredit) {
      // Find oldest non-expired credit
      const [credits] = await connection.execute(
        `SELECT id, credits FROM crm_blast_credits
         WHERE user_id = ? AND credits > 0
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY expires_at ASC, purchased_at ASC
         LIMIT 1`,
        [userId]
      );
      
      if (credits.length === 0) {
        throw new Error('No blast credits available');
      }
      
      creditRecordId = credits[0].id;
      
      // Decrement credit
      await connection.execute(
        `UPDATE crm_blast_credits SET credits = credits - 1 WHERE id = ?`,
        [creditRecordId]
      );
    }
    
    // Record usage
    const [result] = await connection.execute(
      `INSERT INTO crm_single_blast_usage 
       (user_id, campaign_id, recipient_count, used_credit, credit_record_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, campaignId, recipientCount, needsCredit ? 1 : 0, creditRecordId]
    );
    
    await connection.commit();
    
    return {
      id: result.insertId,
      used_credit: needsCredit,
      credit_record_id: creditRecordId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getUserTierLimits,
  checkSubscriberLimit,
  checkEmailLimit,
  checkDripCampaignLimit,
  checkSingleBlastLimit,
  enforceSubscriberLimit,
  enforceEmailLimit,
  enforceDripCampaignLimit,
  enforceSingleBlastLimit,
  recordSingleBlastUsage
};
