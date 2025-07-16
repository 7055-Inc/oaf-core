import AsyncStorage from '@react-native-async-storage/async-storage';

// Auto-refresh tokens before they expire
let refreshTimer = null;

export const setupAutoRefresh = () => {
  // Refresh token every 50 minutes (tokens expire in 1 hour)
  if (refreshTimer) clearInterval(refreshTimer);
  
  refreshTimer = setInterval(async () => {
    await refreshAuthToken();
  }, 50 * 60 * 1000); // 50 minutes
};

export const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

export const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.log('No refresh token available');
      return false;
    }

    const response = await fetch('https://api2.onlineartfestival.com/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      console.error('Token refresh failed');
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
      return false;
    }

    const data = await response.json();
    
    // Update tokens
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    
    console.log('Token refreshed successfully');
    return true;
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
    return false;
  }
};

export const makeAuthenticatedRequest = async (url, options = {}) => {
  let token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  let response = await fetch(url, {
    ...options,
    headers
  });

  // If 401, try to refresh token and retry
  if (response.status === 401) {
    const refreshed = await refreshAuthToken();
    
    if (refreshed) {
      token = await AsyncStorage.getItem('token');
      headers.Authorization = `Bearer ${token}`;
      
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }

  return response;
}; 