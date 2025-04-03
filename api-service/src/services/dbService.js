const axios = require('axios');
const config = require('config');
const crypto = require('crypto');
const https = require('https');
const { generateRequestSignature } = require('../utils/authUtils');

const DB_API_URL = config.get('database.url');
const API_KEY = config.get('database.apiKey');
const API_SECRET = config.get('database.secret');

/**
 * Execute a database query through the DB server API
 * @param {Object} queryParams - The query parameters
 * @returns {Promise<Object>} - The query results
 */
exports.executeQuery = async (queryParams) => {
  try {
    const timestamp = new Date().toISOString();
    const requestBody = JSON.stringify(queryParams.body || {});
    
    // Create HMAC signature for request
    const signature = generateRequestSignature(requestBody, timestamp, API_SECRET);
    
    // Determine if it's a GET or other request type
    const isGet = queryParams.operation === 'SELECT';
    
    // For GET requests, we don't need to send a request body
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    };
    
    // For non-GET requests, add timestamp and signature
    if (!isGet) {
      headers['X-Request-Timestamp'] = timestamp;
      headers['X-Request-Signature'] = signature;
    }
    
    console.log('Making DB API request to:', DB_API_URL);
    console.log('Method:', isGet ? 'GET' : 'PUT');
    console.log('Headers:', JSON.stringify(headers));
    console.log('Request body:', isGet ? 'None (GET request)' : requestBody);
    
    // Create an https agent that ignores SSL verification when using IP address
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !DB_API_URL.includes('10.128.0.31')
    });
    
    const response = await axios({
      method: isGet ? 'get' : 'put',
      url: DB_API_URL,
      headers,
      data: isGet ? undefined : JSON.parse(requestBody),
      timeout: config.get('server.timeouts.request'),
      httpsAgent,
      responseType: 'json'
    });
    
    console.log('DB API response:', JSON.stringify(response.data));
    
    if (response.data.success) {
      return response.data.data;
    } else {
      // Check for specific error codes
      if (response.data.error && response.data.error.code === 'no_active_message') {
        throw new Error('No active message found');
      }
      throw new Error(response.data.error?.message || 'Database operation failed');
    }
  } catch (error) {
    // If it's an Axios error with a response, check for specific error codes
    if (error.response && error.response.data && error.response.data.error) {
      if (error.response.data.error.code === 'no_active_message') {
        throw new Error('No active message found');
      }
    }
    console.error('Database service error:', error);
    throw error;
  }
}; 