import { apiFetch, getApiUrl } from './api';
import { auth } from '../firebase';

// Move the cache to module scope so it's shared across all instances
const tokenCache = new Map();
const lastRefreshTime = new Map();
const refreshInProgress = new Map();
let exchangeInProgress = false;
let exchangePromise = null;
let exchangeLock = Promise.resolve();

class TokenService {
  constructor() {
    if (TokenService.instance) {
      return TokenService.instance;
    }
    TokenService.instance = this;
    
    // Initialize from localStorage if available
    const storedToken = localStorage.getItem('api2_token');
    if (storedToken) {
      try {
        const { token, expiresAt } = JSON.parse(storedToken);
        if (expiresAt > Date.now()) {
          tokenCache.set('api2', { token, expiresAt });
        } else {
          localStorage.removeItem('api2_token');
        }
      } catch (e) {
        localStorage.removeItem('api2_token');
      }
    }
  }

  isExchanging() {
    return exchangeInProgress;
  }

  async exchangeToken(user, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // Use a lock to ensure only one exchange happens at a time
    await exchangeLock;
    
    // If an exchange is already in progress, return its promise
    if (exchangeInProgress && exchangePromise) {
      return exchangePromise;
    }

    // Create a new lock for this exchange
    let resolveLock;
    exchangeLock = new Promise(resolve => {
      resolveLock = resolve;
    });

    try {
      exchangeInProgress = true;
      console.log('TokenService: Starting token exchange');
      
      // Create a new promise for this exchange
      exchangePromise = (async () => {
        // Ensure we have a valid Firebase token
        const firebaseToken = await user.getIdToken(true); // Force refresh
        if (!firebaseToken) {
          throw new Error('No valid Firebase token available');
        }
        
        // Use the getApiUrl function to construct the correct URL
        const response = await fetch(getApiUrl('/tokens/exchange'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`
          },
          body: JSON.stringify({ 
            service: 'api2'
          }),
          timeout: 30000 // 30 second timeout
        });

        if (!response.ok) {
          console.error('TokenService: Token exchange failed:', response.status);
          throw new Error(`Token exchange failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('TokenService: Token exchange response:', data);
        console.log('TokenService: Token exchange successful');
        
        // Store the token in cache and localStorage
        const tokenData = {
          token: data.token,
          expiresAt: new Date(data.expires_at).getTime(), // Convert ISO string to timestamp
          user: {
            id: data.userId || data.user?.id || user.uid, // Try multiple possible user ID sources
            email: user.email
          }
        };
        console.log('TokenService: Storing token data:', tokenData);
        tokenCache.set('api2', tokenData);
        localStorage.setItem('api2_token', JSON.stringify(tokenData));
        
        return data.token;
      })();

      return await exchangePromise;
    } catch (error) {
      console.error('TokenService: Exchange error:', error);
      throw error;
    } finally {
      // Reset the exchange state and release the lock
      exchangeInProgress = false;
      exchangePromise = null;
      resolveLock();
    }
  }

  async getApi2Token() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('TokenService: No current user');
      return null;
    }

    // Check if we have a valid cached token
    const cachedToken = tokenCache.get('api2');
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token;
    }

    // If no valid cached token, do a new exchange
    return await this.exchangeToken(currentUser);
  }

  getCachedToken() {
    const cachedToken = tokenCache.get('api2');
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token;
    }
    return null;
  }

  async refreshApi2Token() {
    // Check if we're already refreshing
    if (refreshInProgress.get('api2')) {
      // Wait for the in-progress refresh to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getApi2Token();
    }

    try {
      refreshInProgress.set('api2', true);

      const cachedRefreshToken = this.tokenCache.get('api2')?.refreshToken;
      if (!cachedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiFetch('/token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          service: 'api2',
          refresh_token: cachedRefreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Cache the token
      this.tokenCache.set('api2', {
        token: data.token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
      });

      return data.token;
    } finally {
      refreshInProgress.set('api2', false);
    }
  }

  clearCache() {
    tokenCache.clear();
    lastRefreshTime.clear();
    refreshInProgress.clear();
    exchangeInProgress = false;
    exchangePromise = null;
    localStorage.removeItem('api2_token');
  }
}

// Export a single instance of the service
const tokenService = new TokenService();
export { tokenService }; 