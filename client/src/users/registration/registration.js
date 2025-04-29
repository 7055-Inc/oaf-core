import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { registrationService } from '../../services/registrationService';
import { RegistrationTimeline } from './RegistrationTimeline';
import './registration.css';
import { getApiUrl } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import { apiFetch } from '../../services/api';

const Registration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({
    email: user?.email || '',
    first_name: '',
    last_name: '',
    user_type: '',
    displayName: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    website: '',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    social_twitter: '',
    social_pinterest: '',
    social_whatsapp: '',
    birth_date: '',
    gender: '',
    nationality: '',
    languages_known: '',
    job_title: '',
    bio: '',
    education: '',
    awards: '',
    memberships: '',
    timezone: '',
    preferred_currency: '',
    profile_visibility: 'public',
    art_categories: [],
    art_mediums: [],
    artist_business_name: '',
    studio_address_line1: '',
    studio_address_line2: '',
    studio_city: '',
    studio_state: '',
    studio_zip: '',
    artist_biography: '',
    artist_business_phone: '',
    artist_business_website: '',
    artist_social_facebook: '',
    artist_social_instagram: '',
    artist_social_tiktok: '',
    artist_social_twitter: '',
    artist_social_pinterest: '',
    does_custom: 'no',
    customer_service_email: '',
    art_style_preferences: [],
    favorite_colors: [],
    promoter_business_name: '',
    promoter_business_phone: '',
    promoter_business_website: '',
    promoter_social_facebook: '',
    promoter_social_instagram: '',
    promoter_social_tiktok: '',
    promoter_social_twitter: '',
    promoter_social_pinterest: '',
    office_address_line1: '',
    office_address_line2: '',
    office_city: '',
    office_state: '',
    office_zip: '',
    is_non_profit: 'no',
    artwork_description: '',
  });

  // Base steps (always shown)
  const baseSteps = [
    { id: 'email', label: 'Email', type: 'email', readOnly: true },
    { id: 'first_name', label: 'First Name', type: 'text' },
    { id: 'last_name', label: 'Last Name', type: 'text' },
    { id: 'user_type', label: 'Account Type', type: 'select' },
    { id: 'displayName', label: 'Display Name', type: 'text' },
    { id: 'phone', label: 'Phone Number', type: 'tel' },
    { id: 'website', label: 'Website (Optional)', type: 'url', isOptional: true },
    { id: 'address_line1', label: 'Address Line 1', type: 'text' },
    { id: 'address_line2', label: 'Address Line 2 (Optional)', type: 'text', isOptional: true },
    { id: 'city', label: 'City', type: 'text' },
    { id: 'state', label: 'State / Province', type: 'text' },
    { id: 'postal_code', label: 'Postal Code', type: 'text' },
    { id: 'country', label: 'Country', type: 'text' },
    { id: 'social_facebook', label: 'Facebook URL (Optional)', type: 'url', isOptional: true },
    { id: 'social_instagram', label: 'Instagram URL (Optional)', type: 'url', isOptional: true },
    { id: 'social_tiktok', label: 'TikTok URL (Optional)', type: 'url', isOptional: true },
    { id: 'social_twitter', label: 'Twitter/X URL (Optional)', type: 'url', isOptional: true },
    { id: 'social_pinterest', label: 'Pinterest URL (Optional)', type: 'url', isOptional: true },
    { id: 'social_whatsapp', label: 'WhatsApp (Optional)', type: 'text', isOptional: true },
    { id: 'birth_date', label: 'Birth Date (Optional)', type: 'date', isOptional: true },
    { id: 'gender', label: 'Gender (Optional)', type: 'text', isOptional: true },
    { id: 'nationality', label: 'Nationality (Optional)', type: 'text', isOptional: true },
    { id: 'languages_known', label: 'Languages Known (Comma-separated, Optional)', type: 'text', isOptional: true },
    { id: 'job_title', label: 'Job Title (Optional)', type: 'text', isOptional: true },
    { id: 'bio', label: 'Bio / About You (Optional)', type: 'textarea', isOptional: true },
    { id: 'education', label: 'Education (Optional)', type: 'textarea', isOptional: true },
    { id: 'awards', label: 'Awards / Recognition (Optional)', type: 'textarea', isOptional: true },
    { id: 'memberships', label: 'Memberships / Affiliations (Optional)', type: 'textarea', isOptional: true },
    { id: 'timezone', label: 'Timezone (Optional)', type: 'text', placeholder: 'e.g., America/New_York', isOptional: true },
    { id: 'preferred_currency', label: 'Preferred Currency (Optional)', type: 'text', placeholder: 'e.g., USD, EUR', isOptional: true },
    { 
      id: 'profile_visibility', 
      label: 'Profile Visibility', 
      type: 'select', 
      options: [
        { value: 'public', label: 'Public' }, 
        { value: 'private', label: 'Private' }, 
        { value: 'connections_only', label: 'Connections Only' }
      ] 
    },
  ];

  // Type-specific steps
  const artistSteps = [
    { id: 'art_categories', label: 'Art Categories (e.g., Painting, Sculpture)', type: 'tags', isOptional: true },
    { id: 'art_mediums', label: 'Art Mediums (e.g., Oil, Acrylic, Bronze)', type: 'tags', isOptional: true },
    { id: 'artist_business_name', label: 'Business Name (Optional)', type: 'text', isOptional: true },
    { id: 'artist_biography', label: 'Artist Biography (Optional)', type: 'textarea', isOptional: true },
    { id: 'studio_address_line1', label: 'Studio Address Line 1 (Optional)', type: 'text', isOptional: true },
    { id: 'studio_address_line2', label: 'Studio Address Line 2 (Optional)', type: 'text', isOptional: true },
    { id: 'studio_city', label: 'Studio City (Optional)', type: 'text', isOptional: true },
    { id: 'studio_state', label: 'Studio State / Province (Optional)', type: 'text', isOptional: true },
    { id: 'studio_zip', label: 'Studio Postal Code (Optional)', type: 'text', isOptional: true },
    { id: 'artist_business_phone', label: 'Business Phone (Optional)', type: 'tel', isOptional: true },
    { id: 'customer_service_email', label: 'Customer Service Email (Optional)', type: 'email', isOptional: true },
    { id: 'artist_business_website', label: 'Business Website (Optional)', type: 'url', isOptional: true },
    { id: 'artist_social_facebook', label: 'Business Facebook URL (Optional)', type: 'url', isOptional: true },
    { id: 'artist_social_instagram', label: 'Business Instagram URL (Optional)', type: 'url', isOptional: true },
    { id: 'artist_social_tiktok', label: 'Business TikTok URL (Optional)', type: 'url', isOptional: true },
    { id: 'artist_social_twitter', label: 'Business Twitter/X URL (Optional)', type: 'url', isOptional: true },
    { id: 'artist_social_pinterest', label: 'Business Pinterest URL (Optional)', type: 'url', isOptional: true },
    { id: 'does_custom', label: 'Do you do custom work? (Optional)', type: 'select', options: [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}], isOptional: true },
  ];

  const communitySteps = [
    { id: 'art_style_preferences', label: 'Art Style Preferences (Optional)', type: 'tags', isOptional: true },
    { id: 'favorite_colors', label: 'Favorite Colors (Optional)', type: 'tags', isOptional: true },
  ];

  const promoterSteps = [
    { id: 'promoter_business_name', label: 'Business Name (Optional)', type: 'text', isOptional: true },
    { id: 'artwork_description', label: 'Types of Artwork You Promote (Optional)', type: 'textarea', isOptional: true },
    { id: 'office_address_line1', label: 'Office Address Line 1 (Optional)', type: 'text', isOptional: true },
    { id: 'office_address_line2', label: 'Office Address Line 2 (Optional)', type: 'text', isOptional: true },
    { id: 'office_city', label: 'Office City (Optional)', type: 'text', isOptional: true },
    { id: 'office_state', label: 'Office State / Province (Optional)', type: 'text', isOptional: true },
    { id: 'office_zip', label: 'Office Postal Code (Optional)', type: 'text', isOptional: true },
    { id: 'promoter_business_phone', label: 'Business Phone (Optional)', type: 'tel', isOptional: true },
    { id: 'promoter_business_website', label: 'Business Website (Optional)', type: 'url', isOptional: true },
    { id: 'promoter_social_facebook', label: 'Business Facebook URL (Optional)', type: 'url', isOptional: true },
    { id: 'promoter_social_instagram', label: 'Business Instagram URL (Optional)', type: 'url', isOptional: true },
    { id: 'promoter_social_tiktok', label: 'Business TikTok URL (Optional)', type: 'url', isOptional: true },
    { id: 'promoter_social_twitter', label: 'Business Twitter/X URL (Optional)', type: 'url', isOptional: true },
    { id: 'promoter_social_pinterest', label: 'Business Pinterest URL (Optional)', type: 'url', isOptional: true },
    { id: 'is_non_profit', label: 'Is this a non-profit organization? (Optional)', type: 'select', options: [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}], isOptional: true },
  ];

  // Add final review step
  const finalReviewStep = { id: 'finalReview', label: 'Final Review & Activation', type: 'review' };

  // Update steps to include final review
  const steps = React.useMemo(() => {
    let potentialSteps = [...baseSteps];
    if (userData.user_type === 'artist') {
      potentialSteps = potentialSteps.concat(artistSteps);
    } else if (userData.user_type === 'promoter') {
      potentialSteps = potentialSteps.concat(promoterSteps);
    } else if (userData.user_type === 'community') {
      potentialSteps = potentialSteps.concat(communitySteps);
    }
    potentialSteps.push({ id: 'review', label: 'Review', type: 'review' });
    potentialSteps.push(finalReviewStep);
    return potentialSteps;
  }, [userData.user_type]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const apiToken = await tokenService.getApi2Token();
        if (!apiToken) {
          throw new Error('No valid API token available');
        }

        // First check if user exists
        const checkResponse = await fetch(`/users/${user.uid}/check-user`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiToken}` }
        });
        
        if (!checkResponse.ok) {
          throw new Error('Failed to verify user');
        }
        
        // Now fetch profile data
        const profileResponse = await fetch('/user/profile', {
          headers: { 'Authorization': `Bearer ${apiToken}` }
        });
        
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await profileResponse.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message);
      }
    };
    
    fetchUserData();
  }, [user]);

  const determineStartingStep = (userTypeForSteps, data) => {
    let potentialSteps = baseSteps;
    if (userTypeForSteps === 'artist') {
      potentialSteps = [...baseSteps, ...artistSteps, finalReviewStep];
    } else if (userTypeForSteps === 'community') {
      potentialSteps = [...baseSteps, ...communitySteps, finalReviewStep];
    } else if (userTypeForSteps === 'promoter') {
      potentialSteps = [...baseSteps, ...promoterSteps, finalReviewStep];
    } else {
      // Default to base steps up to userType selection if type is unknown/null
      potentialSteps = baseSteps.slice(0, baseSteps.findIndex(s => s.id === 'user_type') + 1); 
    }

    console.log("Determine Step: User type:", userTypeForSteps, "Potential steps:", potentialSteps.map(s => s.id));

    // Find the first incomplete required step
    let startingStepIndex = 0;
    for (let i = 0; i < potentialSteps.length; i++) {
      const step = potentialSteps[i];
      if (step.type === 'review') { // Default to review if all prior steps are complete
        startingStepIndex = i;
        break;
      }

      // Check if field is missing (and not optional)
      const isMissing = (!data || data[step.id] === undefined || data[step.id] === null || data[step.id] === '');
      if (!step.isOptional && isMissing && step.id !== 'email') { // Skip email as it's prefilled
        startingStepIndex = i;
        console.log(`Determine Step: Found incomplete required step: ${step.id} at index ${i}`);
        break;
      }
      
      // If loop finishes, all required steps before review are complete
      if (i === potentialSteps.length - 2) { // -2 because review is last
        startingStepIndex = potentialSteps.length - 1; // Start at review
        console.log("Determine Step: All required steps complete, setting start index to review.");
        break; 
      }
    }
    
    setCurrentStep(startingStepIndex);
    console.log(`Determine Step: Setting current step to index ${startingStepIndex} (${potentialSteps[startingStepIndex]?.id})`);
  };

  const handleFieldSubmit = async (fieldId, value) => {
    setError(null);
    const updatedUserData = { ...userData, [fieldId]: value };
    setUserData(updatedUserData);
    const currentStepIndex = steps.findIndex(step => step.id === fieldId);

    try {
      const apiToken = await tokenService.getApi2Token();
      if (!apiToken) {
        throw new Error('No valid API token available');
      }

      // Update the user profile
      console.log(`Submit: Updating user profile for ${user.uid} with field ${fieldId}`);
      await registrationService.updateUserProfile(user.uid, fieldId, value, apiToken);
      
      // Advance Step
      let nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < steps.length) {
        console.log(`Submit: Moving from step ${currentStepIndex} (${fieldId}) to ${nextStepIndex} (${steps[nextStepIndex].id})`);
        setCurrentStep(nextStepIndex);
      } else {
        console.error('Submit: Attempted to advance beyond last step (review)');
        setCurrentStep(steps.length - 1); // Go to review step
      }

    } catch (error) {
      console.error('Error submitting field:', error);
      setError(`Failed to save ${fieldId}: ${error.message}`);
    }
  };

  const handleComplete = async (finalData) => {
    try {
      setIsLoading(true);
      // Save final data and set status to active
      const redirectPath = await registrationService.completeRegistration(user.uid, finalData);
      navigate(redirectPath);
    } catch (error) {
      console.error('Failed to complete registration:', error);
      setError('Failed to complete registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="registration-loading">Loading your registration details...</div>;
  }

  return (
    <div className="registration-container">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            background: `linear-gradient(to right, #055474, #3e1c56)`
          }}
        />
      </div>
      
      <RegistrationTimeline
        steps={steps}
        currentStep={currentStep}
        userData={userData}
        setUserData={setUserData}
        onNextStep={handleFieldSubmit}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default Registration; 