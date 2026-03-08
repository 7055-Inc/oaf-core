import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/router';

/**
 * Affiliate Context Hook
 * 
 * Manages affiliate attribution for the referral program.
 * Attribution is captured from URL params or promoter sites and stored in localStorage.
 * The affiliate context is attached to cart items at add-to-cart time (permanent attribution).
 * 
 * Usage:
 * - Wrap app with AffiliateProvider
 * - Use useAffiliateContext() in components to get current affiliate context
 * - Pass getAffiliateData() result when adding items to cart
 */

const STORAGE_KEY = 'brakebee_affiliate';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Create context
const AffiliateContext = createContext(null);

/**
 * Affiliate Provider Component
 * Wraps the app to provide affiliate context to all components
 */
export function AffiliateProvider({ children, siteId = null }) {
  const router = useRouter();
  const [affiliateData, setAffiliateData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Resolve affiliate code to affiliate ID via API
   */
  const resolveAffiliateCode = useCallback(async (code) => {
    try {
      const response = await fetch(`${API_BASE}/api/affiliates/resolve/${code}`);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        affiliate_id: data.affiliate_id,
        affiliate_code: data.affiliate_code,
        affiliate_type: data.affiliate_type,
        source: 'link'
      };
    } catch (error) {
      console.error('Failed to resolve affiliate code:', error);
      return null;
    }
  }, []);

  /**
   * Resolve promoter site to affiliate ID via API
   */
  const resolvePromoterSite = useCallback(async (siteId) => {
    try {
      const response = await fetch(`${API_BASE}/api/affiliates/resolve-site/${siteId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        affiliate_id: data.affiliate_id,
        affiliate_code: data.affiliate_code,
        affiliate_type: data.affiliate_type,
        promoter_site_id: data.promoter_site_id,
        source: 'promoter_site'
      };
    } catch (error) {
      console.error('Failed to resolve promoter site:', error);
      return null;
    }
  }, []);

  /**
   * Track the visit for analytics (non-blocking)
   */
  const trackVisit = useCallback(async (affiliateInfo) => {
    try {
      await fetch(`${API_BASE}/api/affiliates/track-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_code: affiliateInfo.affiliate_code,
          promoter_site_id: affiliateInfo.promoter_site_id,
          source_type: affiliateInfo.source,
          landing_url: window.location.href,
          referrer_url: document.referrer || null,
          session_id: getSessionId()
        })
      });
    } catch (error) {
      // Non-blocking, just log
      console.error('Failed to track affiliate visit:', error);
    }
  }, []);

  /**
   * Save affiliate data to localStorage
   */
  const saveToStorage = useCallback((data) => {
    if (typeof window !== 'undefined' && data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    }
  }, []);

  /**
   * Load affiliate data from localStorage
   */
  const loadFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const data = JSON.parse(stored);
      // Data is valid as long as it exists (attribution is per-item, not time-limited)
      return data;
    } catch {
      return null;
    }
  }, []);

  /**
   * Initialize affiliate context on mount
   */
  useEffect(() => {
    const initializeAffiliate = async () => {
      setIsLoading(true);
      
      // Check for ?ref= URL parameter
      const refCode = router.query.ref;
      
      if (refCode) {
        // New affiliate link clicked - resolve and save
        const resolved = await resolveAffiliateCode(refCode);
        if (resolved) {
          setAffiliateData(resolved);
          saveToStorage(resolved);
          trackVisit(resolved);
          
          // Clean URL without triggering navigation
          const url = new URL(window.location.href);
          url.searchParams.delete('ref');
          window.history.replaceState({}, '', url.toString());
        }
      } else if (siteId) {
        // We're on a promoter site - check if we need to resolve
        const stored = loadFromStorage();
        if (!stored || stored.promoter_site_id !== siteId) {
          // New promoter site or different site - resolve
          const resolved = await resolvePromoterSite(siteId);
          if (resolved) {
            setAffiliateData(resolved);
            saveToStorage(resolved);
            trackVisit(resolved);
          }
        } else {
          // Same promoter site, use stored data
          setAffiliateData(stored);
        }
      } else {
        // No new affiliate context, load from storage
        const stored = loadFromStorage();
        setAffiliateData(stored);
      }
      
      setIsLoading(false);
    };

    // Wait for router to be ready
    if (router.isReady) {
      initializeAffiliate();
    }
  }, [router.isReady, router.query.ref, siteId, resolveAffiliateCode, resolvePromoterSite, saveToStorage, loadFromStorage, trackVisit]);

  /**
   * Get affiliate data for cart operations
   * This is what gets attached to cart items
   */
  const getAffiliateData = useCallback(() => {
    if (!affiliateData) {
      return {
        affiliate_id: null,
        affiliate_source: 'direct'
      };
    }
    return {
      affiliate_id: affiliateData.affiliate_id,
      affiliate_source: affiliateData.source
    };
  }, [affiliateData]);

  /**
   * Clear affiliate context (for testing/admin purposes)
   */
  const clearAffiliateContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setAffiliateData(null);
  }, []);

  /**
   * Manually set affiliate context (for testing/admin purposes)
   */
  const setAffiliateCode = useCallback(async (code) => {
    const resolved = await resolveAffiliateCode(code);
    if (resolved) {
      setAffiliateData(resolved);
      saveToStorage(resolved);
      return true;
    }
    return false;
  }, [resolveAffiliateCode, saveToStorage]);

  const value = {
    // Current affiliate data
    affiliateData,
    isLoading,
    
    // For cart operations
    getAffiliateData,
    
    // Utility functions
    clearAffiliateContext,
    setAffiliateCode,
    
    // Status helpers
    hasAffiliate: !!affiliateData?.affiliate_id,
    affiliateSource: affiliateData?.source || 'direct',
    affiliateCode: affiliateData?.affiliate_code || null
  };

  return (
    <AffiliateContext.Provider value={value}>
      {children}
    </AffiliateContext.Provider>
  );
}

/**
 * Hook to access affiliate context
 */
export function useAffiliateContext() {
  const context = useContext(AffiliateContext);
  if (!context) {
    // Return a default context if not wrapped in provider
    // This allows the hook to work without the provider for backwards compatibility
    return {
      affiliateData: null,
      isLoading: false,
      getAffiliateData: () => ({ affiliate_id: null, affiliate_source: 'direct' }),
      clearAffiliateContext: () => {},
      setAffiliateCode: async () => false,
      hasAffiliate: false,
      affiliateSource: 'direct',
      affiliateCode: null
    };
  }
  return context;
}

/**
 * Generate or retrieve session ID for analytics
 */
function getSessionId() {
  if (typeof window === 'undefined') return null;
  
  let sessionId = sessionStorage.getItem('brakebee_session');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('brakebee_session', sessionId);
  }
  return sessionId;
}

/**
 * Standalone function to get affiliate data without hook
 * Useful for API calls outside of React components
 */
export function getStoredAffiliateData() {
  if (typeof window === 'undefined') {
    return { affiliate_id: null, affiliate_source: 'direct' };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { affiliate_id: null, affiliate_source: 'direct' };
    }
    const data = JSON.parse(stored);
    return {
      affiliate_id: data.affiliate_id || null,
      affiliate_source: data.source || 'direct'
    };
  } catch {
    return { affiliate_id: null, affiliate_source: 'direct' };
  }
}

export default useAffiliateContext;
