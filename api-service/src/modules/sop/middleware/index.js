/**
 * SOP Middleware Index
 */

const { getToken, requireSopAuth, requireTop } = require('./sopAuth');

module.exports = {
  getToken,
  requireSopAuth,
  requireTop,
};
