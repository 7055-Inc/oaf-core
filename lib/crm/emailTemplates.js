/**
 * CRM Email Templates - Tier-based configuration
 * Mirrors website template tier pattern: free gets basic, paid tiers get more
 *
 * Used by:
 * - Backend: API list endpoint, validation on create/send
 * - Frontend: send-campaign template dropdown
 */

const TIER_ORDER = ['free', 'beginner', 'pro'];

const CRM_EMAIL_TEMPLATES = {
  'simple-announcement': {
    template_key: 'simple-announcement',
    name: 'Simple Announcement',
    description: 'Clean, minimal layout for quick updates and news',
    tier_required: 'free',
    display_order: 1
  },
  'product-showcase': {
    template_key: 'product-showcase',
    name: 'Product Showcase',
    description: 'Highlight products with image and CTA blocks',
    tier_required: 'beginner',
    display_order: 2
  },
  'event-invitation': {
    template_key: 'event-invitation',
    name: 'Event Invitation',
    description: 'Invite subscribers to events with date and RSVP',
    tier_required: 'beginner',
    display_order: 3
  },
  'monthly-newsletter': {
    template_key: 'monthly-newsletter',
    name: 'Monthly Newsletter',
    description: 'Structured layout for recurring newsletter content',
    tier_required: 'beginner',
    display_order: 4
  },
  'special-offer': {
    template_key: 'special-offer',
    name: 'Special Offer',
    description: 'Promotional layout with hero and CTA',
    tier_required: 'pro',
    display_order: 5
  }
};

/**
 * Get tier rank for comparison (higher = more access)
 * @param {string} tierName
 * @returns {number}
 */
function getTierRank(tierName) {
  const idx = TIER_ORDER.indexOf(tierName || 'free');
  return idx >= 0 ? idx : 0;
}

/**
 * Check if user's tier allows a template
 * @param {string} userTier - User's tier (free, beginner, pro) or null
 * @param {string} templateKey
 * @returns {boolean}
 */
function canUseTemplate(userTier, templateKey) {
  const template = CRM_EMAIL_TEMPLATES[templateKey];
  if (!template) return false;
  const requiredRank = getTierRank(template.tier_required);
  const userRank = getTierRank(userTier);
  return userRank >= requiredRank;
}

/**
 * Get all templates available for a user's tier
 * @param {string} userTier - User's tier or null (treated as free)
 * @returns {Array} Templates the user can use, with tierLocked flag for display
 */
function getTemplatesForTier(userTier) {
  const userRank = getTierRank(userTier);
  return Object.values(CRM_EMAIL_TEMPLATES)
    .sort((a, b) => a.display_order - b.display_order)
    .map((t) => ({
      ...t,
      tier_locked: getTierRank(t.tier_required) > userRank
    }));
}

/**
 * Validate template_key for a user's tier (throws if invalid)
 * @param {string} userTier
 * @param {string} templateKey
 * @throws {Error} If template not allowed
 */
function validateTemplateForTier(userTier, templateKey) {
  if (!canUseTemplate(userTier, templateKey)) {
    const template = CRM_EMAIL_TEMPLATES[templateKey];
    const requiredTier = template?.tier_required || 'unknown';
    throw new Error(`This template requires ${requiredTier} tier or higher. Upgrade your CRM plan to use it.`);
  }
}

module.exports = {
  CRM_EMAIL_TEMPLATES,
  TIER_ORDER,
  getTierRank,
  canUseTemplate,
  getTemplatesForTier,
  validateTemplateForTier
};
