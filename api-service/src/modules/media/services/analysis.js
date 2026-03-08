/**
 * Media module - AI analysis proxy to media backend (v2)
 */

const axios = require('axios');

const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = process.env.MEDIA_API_KEY;

async function fetchAnalysisFromBackend(mediaId) {
  if (!MEDIA_API_KEY) {
    const err = new Error('MEDIA_API_KEY is required for AI analysis');
    err.code = 'CONFIG_MISSING';
    throw err;
  }
  const response = await axios.get(`${MEDIA_BACKEND_URL}/analysis/${mediaId}`, {
    headers: { Authorization: MEDIA_API_KEY },
    timeout: 10000,
    validateStatus: (status) => status < 500
  });
  return { status: response.status, data: response.data };
}

module.exports = {
  fetchAnalysisFromBackend
};
