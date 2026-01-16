/**
 * Return Policy Constants
 * Single source of truth for all return policy definitions
 */

export const RETURN_POLICIES = {
  '30_day': {
    key: '30_day',
    label: 'Returns accepted for 30 days after delivery',
    shortLabel: '30 days after delivery',
    productMessage: 'This item may be returned for up to 30 days after delivery.',
    description: 'You may return this item within 30 days of delivery for a full refund. Item must be in original, unused condition with all original packaging.',
    color: '#28a745',
    icon: '✓',
    allowsReturn: true,
    windowDays: 30
  },
  '14_day': {
    key: '14_day',
    label: 'Returns accepted for 14 days after delivery',
    shortLabel: '14 days after delivery',
    productMessage: 'This item may be returned for up to 14 days after delivery.',
    description: 'You may return this item within 14 days of delivery for a full refund. Item must be in original, unused condition with all original packaging.',
    color: '#28a745',
    icon: '✓',
    allowsReturn: true,
    windowDays: 14
  },
  'exchange_only': {
    key: 'exchange_only',
    label: 'Replace/Exchange for damage only',
    shortLabel: 'Exchange for damage only',
    productMessage: 'This item may only be exchanged if damaged during shipping.',
    description: 'This item cannot be returned for a refund. If your item arrives damaged or defective, we will replace it or offer an exchange. Please contact us within 48 hours of delivery with photos of any damage.',
    color: '#d97706',
    icon: '⟳',
    allowsReturn: false,
    windowDays: null
  },
  'no_returns': {
    key: 'no_returns',
    label: 'No refund/return/exchange - all sales final',
    shortLabel: 'All sales final',
    productMessage: 'This item may not be returned or exchanged.',
    description: 'This item cannot be returned, refunded, or exchanged. All sales are final. Please review the product description and images carefully before purchasing.',
    color: '#dc3545',
    icon: '✗',
    allowsReturn: false,
    windowDays: null
  }
};

/**
 * Get return policy by key with fallback to 30_day
 * @param {string} key - Policy key (30_day, 14_day, exchange_only, no_returns)
 * @returns {Object} Policy object with all properties
 */
export const getReturnPolicy = (key) => {
  return RETURN_POLICIES[key] || RETURN_POLICIES['30_day'];
};

/**
 * Get all policies as array (useful for dropdowns)
 * @returns {Array} Array of policy objects
 */
export const getReturnPolicyOptions = () => {
  return Object.values(RETURN_POLICIES);
};

/**
 * Check if a policy allows returns
 * @param {string} key - Policy key
 * @returns {boolean} True if returns are allowed
 */
export const policyAllowsReturn = (key) => {
  const policy = getReturnPolicy(key);
  return policy.allowsReturn;
};

/**
 * Get the return window in days (null if no returns allowed)
 * @param {string} key - Policy key
 * @returns {number|null} Days allowed for return, or null
 */
export const getReturnWindowDays = (key) => {
  const policy = getReturnPolicy(key);
  return policy.windowDays;
};

export default RETURN_POLICIES;

