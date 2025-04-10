import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 5000,
  });

  instance.interceptors.response.use(
    response => response,
    async error => {
      const { config, response } = error;
      
      if (!config || !config.retryCount) {
        config.retryCount = 0;
      }

      if (config.retryCount >= MAX_RETRIES) {
        return Promise.reject(error);
      }

      config.retryCount += 1;
      
      // Only retry on network errors or 5xx server errors
      if (!response || response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.retryCount));
        return instance(config);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createAxiosInstance();

class RegistrationError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'RegistrationError';
    this.type = type;
    this.details = details;
  }
}

export const registrationService = {
  async checkDisplayNameAvailability(displayName) {
    try {
      const response = await api.post('/api/registration/check-display-name', { displayName });
      return response.data.available;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new RegistrationError(
              'Invalid display name format',
              'VALIDATION_ERROR',
              { field: 'displayName' }
            );
          case 409:
            return false;
          default:
            throw new RegistrationError(
              'Error checking display name availability',
              'SERVER_ERROR'
            );
        }
      }
      throw new RegistrationError(
        'Network error while checking display name',
        'NETWORK_ERROR'
      );
    }
  },

  async getDisplayNameAlternatives(displayName) {
    try {
      const response = await api.get(`/api/registration/display-name-alternatives/${displayName}`);
      return response.data.alternatives;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new RegistrationError(
              'Invalid display name format',
              'VALIDATION_ERROR',
              { field: 'displayName' }
            );
          default:
            throw new RegistrationError(
              'Error getting display name alternatives',
              'SERVER_ERROR'
            );
        }
      }
      throw new RegistrationError(
        'Network error while getting alternatives',
        'NETWORK_ERROR'
      );
    }
  },

  async submitRegistration(userData) {
    try {
      const response = await api.post('/api/registration', userData);
      return response.data;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new RegistrationError(
              'Invalid registration data',
              'VALIDATION_ERROR',
              error.response.data.errors
            );
          case 409:
            throw new RegistrationError(
              'User already exists',
              'CONFLICT_ERROR'
            );
          default:
            throw new RegistrationError(
              'Error submitting registration',
              'SERVER_ERROR'
            );
        }
      }
      throw new RegistrationError(
        'Network error while submitting registration',
        'NETWORK_ERROR'
      );
    }
  },

  async getUserStatus() {
    try {
      const response = await api.get('/v1/users/status');
      return response.data;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 404:
            return { status: 'pending' };
          default:
            console.error('Error checking user status:', error);
            return { status: 'pending' };
        }
      }
      console.error('Network error while checking user status:', error);
      return { status: 'pending' };
    }
  }
}; 