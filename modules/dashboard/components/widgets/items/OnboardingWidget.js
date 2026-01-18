import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../../lib/apiUtils';
import CompleteProfileSuggestion from './onboarding/CompleteProfileSuggestion';
import WebsiteSuggestion from './onboarding/WebsiteSuggestion';
import MarketplaceSuggestion from './onboarding/MarketplaceSuggestion';
import VerifiedSuggestion from './onboarding/VerifiedSuggestion';
import ShippingSuggestion from './onboarding/ShippingSuggestion';
import styles from './onboarding/onboarding.module.css';

/**
 * Get missing profile fields based on user type
 * Returns array of { field, label } objects
 */
const getMissingFields = (user) => {
  const missing = [];
  
  // Core profile fields (all users)
  if (!user.profile_image_path) missing.push({ field: 'profile_image_path', label: 'Profile Photo' });
  if (!user.bio) missing.push({ field: 'bio', label: 'Bio' });
  
  // Check for at least one social link
  const hasSocialLink = user.social_facebook || user.social_instagram || user.social_tiktok || 
                        user.social_twitter || user.social_pinterest || user.website;
  if (!hasSocialLink) missing.push({ field: 'social', label: 'Social Link' });
  
  // Artist-specific fields
  if (user.user_type === 'artist') {
    if (!user.artist_biography) missing.push({ field: 'artist_biography', label: 'Artist Bio' });
    if (!user.art_categories || user.art_categories?.length === 0) missing.push({ field: 'art_categories', label: 'Art Categories' });
    if (!user.art_mediums || user.art_mediums?.length === 0) missing.push({ field: 'art_mediums', label: 'Art Mediums' });
    if (!user.logo_path) missing.push({ field: 'logo_path', label: 'Business Logo' });
  }
  
  // Promoter-specific fields
  if (user.user_type === 'promoter') {
    if (!user.logo_path) missing.push({ field: 'logo_path', label: 'Organization Logo' });
  }
  
  // Community-specific fields
  if (user.user_type === 'community') {
    if (!user.art_interests || user.art_interests?.length === 0) missing.push({ field: 'art_interests', label: 'Art Interests' });
  }
  
  return missing;
};

// Suggestion configuration - ordered by priority
const SUGGESTIONS = [
  {
    id: 'complete-profile',
    condition: (user) => getMissingFields(user).length > 0,
    cooldownHours: 48,
    Component: CompleteProfileSuggestion,
    getData: (user) => ({ missingFields: getMissingFields(user) }),
    needsSlideIn: true
  },
  {
    id: 'website-subscription',
    // Show to artists/promoters/admins who don't have sites permission
    condition: (user) => ['artist', 'promoter', 'admin'].includes(user.user_type) && !user.permissions?.includes('sites'),
    cooldownHours: 168, // 1 week
    Component: WebsiteSuggestion,
    needsSlideIn: true
  },
  {
    id: 'marketplace-access',
    // Artists only - sell your products
    condition: (user) => user.user_type === 'artist' && !user.permissions?.includes('marketplace'),
    cooldownHours: 168,
    Component: MarketplaceSuggestion,
    needsSlideIn: true
  },
  {
    id: 'verified-artist',
    // Artists only - become verified
    condition: (user) => user.user_type === 'artist' && !user.permissions?.includes('verified'),
    cooldownHours: 168,
    Component: VerifiedSuggestion,
    needsSlideIn: true
  },
  {
    id: 'shipping-discount',
    // Artists only - discount shipping
    condition: (user) => user.user_type === 'artist' && !user.permissions?.includes('shipping'),
    cooldownHours: 168,
    Component: ShippingSuggestion,
    needsSlideIn: true
  },
];

// Check if a suggestion is snoozed
const isSnoozed = (suggestionId) => {
  if (typeof window === 'undefined') return false;
  const snoozedUntil = localStorage.getItem(`onboarding_snooze_${suggestionId}`);
  if (!snoozedUntil) return false;
  return Date.now() < parseInt(snoozedUntil, 10);
};

// Snooze a suggestion
const snooze = (suggestionId, hours) => {
  if (typeof window === 'undefined') return;
  const snoozedUntil = Date.now() + (hours * 60 * 60 * 1000);
  localStorage.setItem(`onboarding_snooze_${suggestionId}`, snoozedUntil.toString());
};

/**
 * OnboardingBanner - Shows contextual suggestions above the dashboard grid
 * Renders the first matching (non-snoozed) suggestion, or nothing if all complete
 * 
 * @param {Object} userData - User data from dashboard (includes permissions array)
 * @param {Function} openSlideIn - Function to open slide-in panels
 */
export default function OnboardingBanner({ userData: dashboardUserData, openSlideIn }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snoozedIds, setSnoozedIds] = useState([]);

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
    // Check which suggestions are snoozed
    const snoozed = SUGGESTIONS.filter(s => isSnoozed(s.id)).map(s => s.id);
    setSnoozedIds(snoozed);
  }, []);

  const loadProfileData = async () => {
    try {
      // Fetch full user profile from /users/me (for profile fields)
      const response = await authApiRequest('users/me');

      if (!response.ok) {
        throw new Error('Failed to load user data');
      }

      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      console.error('OnboardingBanner - Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Merge dashboard userData (has permissions) with profile data (has all fields)
  const mergedUserData = profileData ? {
    ...profileData,
    permissions: dashboardUserData?.permissions || []
  } : null;

  const handleSnooze = (suggestionId, hours) => {
    snooze(suggestionId, hours);
    setSnoozedIds(prev => [...prev, suggestionId]);
  };

  const handleComplete = () => {
    // Refresh data after user completes an action
    loadProfileData();
  };

  // Find the first matching suggestion that's not snoozed
  const getActiveSuggestion = () => {
    if (!mergedUserData) return null;

    for (const suggestion of SUGGESTIONS) {
      // Skip if snoozed
      if (snoozedIds.includes(suggestion.id)) continue;
      
      // Check condition
      if (suggestion.condition(mergedUserData)) {
        return suggestion;
      }
    }
    return null;
  };

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Don't render on error - fail silently
  if (error) {
    return null;
  }

  const activeSuggestion = getActiveSuggestion();

  // All done! Don't show anything
  if (!activeSuggestion) {
    return null;
  }

  const { Component, id, cooldownHours, getData, needsSlideIn } = activeSuggestion;
  const suggestionData = getData ? getData(mergedUserData) : {};

  return (
    <div className={styles.banner}>
      <Component 
        userData={mergedUserData}
        suggestionData={suggestionData}
        onSnooze={() => handleSnooze(id, cooldownHours)}
        onComplete={handleComplete}
        openSlideIn={needsSlideIn ? openSlideIn : undefined}
      />
    </div>
  );
}

