/**
 * Profile Form Context
 * State management for the accordion-based profile editor
 * 
 * @module modules/dashboard/components/users/profile-form/ProfileFormContext
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { authApiRequest } from '../../../../../lib/apiUtils';

const ProfileFormContext = createContext(null);

export function useProfileForm() {
  const context = useContext(ProfileFormContext);
  if (!context) {
    throw new Error('useProfileForm must be used within ProfileFormProvider');
  }
  return context;
}

// USA timezones only
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (No DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

// Common languages
const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Bengali',
  'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech',
  'Hungarian', 'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Greek',
  'Turkish', 'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay',
  'Tagalog', 'Swahili', 'Yoruba', 'Zulu', 'Afrikaans', 'Amharic'
].sort();

// Education levels
const EDUCATION_LEVELS = [
  'Grade School',
  'High School/GED',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctoral Degree'
];

export function ProfileFormProvider({ children, userData, initialData = null }) {
  // Form data state
  const [formData, setFormData] = useState(() => initializeFormData(initialData || userData));
  
  // Image files (for upload)
  const [imageFiles, setImageFiles] = useState({
    profile_image: null,
    header_image: null,
    logo_image: null
  });

  // Section status tracking
  const [sectionStatus, setSectionStatus] = useState(() => getInitialSectionStatus(initialData || userData));
  
  // Active section
  const [activeSection, setActiveSection] = useState('personalInfo');
  
  // UI states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // User type checks
  const userType = userData?.user_type || 'community';
  const isAdmin = userType === 'admin';
  const canEditArtist = userType === 'artist' || isAdmin;
  const canEditPromoter = userType === 'promoter' || isAdmin;
  const canEditCommunity = userType === 'community' || isAdmin;

  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle file selection
  const handleFileChange = useCallback((fieldName, file) => {
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file && file.size > maxSize) {
      setError(`File too large. Please choose an image smaller than 5MB.`);
      return false;
    }
    setImageFiles(prev => ({ ...prev, [fieldName]: file }));
    return true;
  }, []);

  // Complete a section
  const completeSection = useCallback((sectionId, nextSectionId) => {
    setSectionStatus(prev => ({
      ...prev,
      [sectionId]: 'complete',
      [nextSectionId]: prev[nextSectionId] === 'pending' ? 'active' : prev[nextSectionId]
    }));
    if (nextSectionId) {
      setActiveSection(nextSectionId);
    }
  }, []);

  // Open a section
  const openSection = useCallback((sectionId) => {
    setSectionStatus(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === 'pending' ? 'active' : prev[sectionId]
    }));
    setActiveSection(sectionId);
  }, []);

  // Save profile
  const saveProfile = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Add image files
      if (imageFiles.profile_image) {
        formDataToSend.append('profile_image', imageFiles.profile_image);
      }
      if (imageFiles.header_image) {
        formDataToSend.append('header_image', imageFiles.header_image);
      }
      if (imageFiles.logo_image) {
        formDataToSend.append('logo_image', imageFiles.logo_image);
      }

      const endpoint = isAdmin ? 'users/admin/me' : 'users/me';
      
      const res = await authApiRequest(endpoint, {
        method: 'PATCH',
        body: formDataToSend
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      setSuccessMessage('Profile updated successfully!');
      
      // Clear file inputs after successful save
      setImageFiles({
        profile_image: null,
        header_image: null,
        logo_image: null
      });

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, imageFiles, isAdmin]);

  const value = {
    // Form data
    formData,
    updateField,
    updateFields,
    
    // Images
    imageFiles,
    handleFileChange,
    
    // Section management
    sectionStatus,
    activeSection,
    completeSection,
    openSection,
    
    // User type flags
    userType,
    isAdmin,
    canEditArtist,
    canEditPromoter,
    canEditCommunity,
    
    // UI states
    saving,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    
    // Actions
    saveProfile,
    
    // Constants
    TIMEZONES,
    LANGUAGES,
    EDUCATION_LEVELS,
  };

  return (
    <ProfileFormContext.Provider value={value}>
      {children}
    </ProfileFormContext.Provider>
  );
}

// Initialize form data from user data
function initializeFormData(userData) {
  if (!userData) return getEmptyFormData();
  
  return {
    // Base profile fields
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    display_name: userData.display_name || '',
    phone: userData.phone || '',
    address_line1: userData.address_line1 || '',
    address_line2: userData.address_line2 || '',
    city: userData.city || '',
    state: userData.state || '',
    postal_code: userData.postal_code || '',
    country: userData.country || '',
    bio: userData.bio || '',
    website: userData.website || '',
    birth_date: userData.birth_date ? userData.birth_date.split('T')[0] : '',
    gender: userData.gender || '',
    nationality: userData.nationality || '',
    languages_known: userData.languages_known || [],
    job_title: userData.job_title || '',
    education: userData.education || [],
    awards: typeof userData.awards === 'string' ? userData.awards : (Array.isArray(userData.awards) ? userData.awards.join('\n') : ''),
    memberships: typeof userData.memberships === 'string' ? userData.memberships : (Array.isArray(userData.memberships) ? userData.memberships.join('\n') : ''),
    timezone: userData.timezone || '',
    
    // Personal social media
    social_facebook: userData.social_facebook || '',
    social_instagram: userData.social_instagram || '',
    social_tiktok: userData.social_tiktok || '',
    social_twitter: userData.social_twitter || '',
    social_pinterest: userData.social_pinterest || '',
    social_whatsapp: userData.social_whatsapp || '',
    
    // Image paths (for display)
    profile_image_path: userData.profile_image_path || '',
    header_image_path: userData.header_image_path || '',
    logo_path: userData.logo_path || '',
    
    // Artist profile fields
    artist_biography: userData.artist_biography || '',
    art_categories: userData.art_categories || [],
    art_mediums: userData.art_mediums || [],
    does_custom: userData.does_custom || 'no',
    custom_details: userData.custom_details || '',
    artist_business_name: userData.business_name || '',
    artist_legal_name: userData.legal_name || '',
    artist_tax_id: userData.tax_id || '',
    customer_service_email: userData.customer_service_email || '',
    studio_address_line1: userData.studio_address_line1 || '',
    studio_address_line2: userData.studio_address_line2 || '',
    studio_city: userData.studio_city || '',
    studio_state: userData.studio_state || '',
    studio_zip: userData.studio_zip || '',
    artist_business_phone: userData.business_phone || '',
    artist_business_website: userData.business_website || '',
    artist_business_social_facebook: userData.business_social_facebook || '',
    artist_business_social_instagram: userData.business_social_instagram || '',
    artist_business_social_tiktok: userData.business_social_tiktok || '',
    artist_business_social_twitter: userData.business_social_twitter || '',
    artist_business_social_pinterest: userData.business_social_pinterest || '',
    artist_founding_date: userData.founding_date ? userData.founding_date.split('T')[0] : '',
    
    // Promoter profile fields
    is_non_profit: userData.is_non_profit || 'no',
    organization_size: userData.organization_size || '',
    sponsorship_options: userData.sponsorship_options || '',
    upcoming_events: userData.upcoming_events || '',
    office_address_line1: userData.office_address_line1 || '',
    office_address_line2: userData.office_address_line2 || '',
    office_city: userData.office_city || '',
    office_state: userData.office_state || '',
    office_zip: userData.office_zip || '',
    promoter_business_name: userData.business_name || '',
    promoter_legal_name: userData.legal_name || '',
    promoter_tax_id: userData.tax_id || '',
    promoter_business_phone: userData.business_phone || '',
    promoter_business_website: userData.business_website || '',
    promoter_business_social_facebook: userData.business_social_facebook || '',
    promoter_business_social_instagram: userData.business_social_instagram || '',
    promoter_business_social_tiktok: userData.business_social_tiktok || '',
    promoter_business_social_twitter: userData.business_social_twitter || '',
    promoter_business_social_pinterest: userData.business_social_pinterest || '',
    promoter_founding_date: userData.founding_date ? userData.founding_date.split('T')[0] : '',
    
    // Community profile fields
    art_style_preferences: userData.art_style_preferences || [],
    favorite_colors: userData.favorite_colors || [],
    art_interests: userData.art_interests || [],
    wishlist: userData.wishlist || []
  };
}

// Get empty form data
function getEmptyFormData() {
  return {
    first_name: '', last_name: '', display_name: '', phone: '',
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: '',
    bio: '', website: '', birth_date: '', gender: '', nationality: '',
    languages_known: [], job_title: '', education: [], awards: '', memberships: '', timezone: '',
    social_facebook: '', social_instagram: '', social_tiktok: '', social_twitter: '', social_pinterest: '', social_whatsapp: '',
    profile_image_path: '', header_image_path: '', logo_path: '',
    artist_biography: '', art_categories: [], art_mediums: [], does_custom: 'no', custom_details: '',
    artist_business_name: '', artist_legal_name: '', artist_tax_id: '', customer_service_email: '',
    studio_address_line1: '', studio_address_line2: '', studio_city: '', studio_state: '', studio_zip: '',
    artist_business_phone: '', artist_business_website: '',
    artist_business_social_facebook: '', artist_business_social_instagram: '', artist_business_social_tiktok: '',
    artist_business_social_twitter: '', artist_business_social_pinterest: '', artist_founding_date: '',
    is_non_profit: 'no', organization_size: '', sponsorship_options: '', upcoming_events: '',
    office_address_line1: '', office_address_line2: '', office_city: '', office_state: '', office_zip: '',
    promoter_business_name: '', promoter_legal_name: '', promoter_tax_id: '',
    promoter_business_phone: '', promoter_business_website: '',
    promoter_business_social_facebook: '', promoter_business_social_instagram: '', promoter_business_social_tiktok: '',
    promoter_business_social_twitter: '', promoter_business_social_pinterest: '', promoter_founding_date: '',
    art_style_preferences: [], favorite_colors: [], art_interests: [], wishlist: []
  };
}

// Determine initial section status based on data completeness
function getInitialSectionStatus(userData) {
  const hasPersonalInfo = userData?.first_name && userData?.last_name;
  const hasAddress = userData?.address_line1 && userData?.city;
  
  return {
    personalInfo: hasPersonalInfo ? 'complete' : 'active',
    address: hasPersonalInfo ? (hasAddress ? 'complete' : 'active') : 'pending',
    socialMedia: hasAddress ? 'active' : 'pending',
    profileImages: 'pending',
    additionalInfo: 'pending',
    artistProfile: 'pending',
    promoterProfile: 'pending',
    communityPreferences: 'pending'
  };
}
