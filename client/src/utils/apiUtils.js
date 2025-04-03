import axios from 'axios';

/**
 * Make an API call using axios
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object|FormData} data - Request data
 * @param {boolean} isFormData - Whether data is FormData
 * @returns {Promise<any>} API response
 */
export const apiCall = async (endpoint, method = 'GET', data = null, isFormData = false) => {
  try {
    const config = {
      url: endpoint,
      method,
      headers: {},
      withCredentials: true,
    };

    if (!isFormData) {
      config.headers['Content-Type'] = 'application/json';
    }

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API call failed: ${error}`);
    
    // Extract error message from response if available
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        throw new Error(error.response.data);
      } else if (error.response.data.error) {
        throw error.response.data;
      }
    }
    
    throw error;
  }
};
