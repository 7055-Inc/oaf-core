/**
 * Auth Token Management
 * Handles token storage, retrieval, and expiration checking
 */

import { getCookieConfig } from '../config.js';

/**
 * Get cookie value by name (robust parsing)
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue || null;
    }
  }
  return null;
}

/**
 * Set a cookie with proper configuration
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} maxAge - Max age in seconds
 */
export function setCookie(name, value, maxAge) {
  if (typeof document === 'undefined') return;
  
  const cookieConfig = getCookieConfig();
  document.cookie = `${name}=${value}; path=/; domain=${cookieConfig.domain}; ${cookieConfig.secure ? 'secure; ' : ''}SameSite=${cookieConfig.sameSite}; max-age=${maxAge}`;
}

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 */
export function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  
  const cookieConfig = getCookieConfig();
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${cookieConfig.domain}`;
}

/**
 * Get auth token from cookies or localStorage
 * @returns {string|null} JWT token
 */
export function getAuthToken() {
  if (typeof document === 'undefined') return null;
  
  // Try cookies first (used by middleware)
  const cookieToken = getCookie('token');
  if (cookieToken) return cookieToken;
  
  // Fall back to localStorage
  if (typeof localStorage !== 'undefined') {
    const localToken = localStorage.getItem('token');
    if (localToken) {
      // Sync to cookie for middleware
      setCookie('token', localToken, 7200); // 2 hours
      return localToken;
    }
  }
  
  return null;
}

/**
 * Get refresh token from cookies or localStorage
 * @returns {string|null} Refresh token
 */
export function getRefreshToken() {
  if (typeof document === 'undefined') return null;
  
  const cookieToken = getCookie('refreshToken');
  if (cookieToken) return cookieToken;
  
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  
  return null;
}

/**
 * Store auth tokens in both localStorage and cookies
 * @param {string} token - JWT access token
 * @param {string} refreshToken - Refresh token
 */
export function storeTokens(token, refreshToken) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  // Store in cookies for middleware/SSR access
  setCookie('token', token, 7200); // 2 hours
  setCookie('refreshToken', refreshToken, 604800); // 7 days
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens() {
  // Clear localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
  
  // Clear cookies
  deleteCookie('token');
  deleteCookie('refreshToken');
  deleteCookie('csrf-token');
  deleteCookie('csrf-secret');
  
  // Dispatch custom event to notify all components about logout
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-logout'));
  }
}

/**
 * Check if JWT token is expired or about to expire
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired or expires in < 5 minutes
 */
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const expiry = payload.exp;
    
    // Consider token expired if it expires in next 5 minutes
    return !expiry || (expiry - now) < 300;
  } catch (e) {
    return true;
  }
}

/**
 * Decode JWT token payload (without verification)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
export function decodeToken(token) {
  if (!token) return null;
  
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

/**
 * Get user info from current token
 * @returns {Object|null} User info (userId, roles, permissions) or null
 */
export function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  
  const payload = decodeToken(token);
  if (!payload) return null;
  
  return {
    userId: payload.userId,
    roles: payload.roles || [],
    permissions: payload.permissions || [],
    isImpersonating: payload.isImpersonating || false,
    originalUserId: payload.originalUserId || null,
  };
}
