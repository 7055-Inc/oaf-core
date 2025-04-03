// client/src/user-management/registration-parts/RegistrationContainer.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navigation from './Navigation';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import Step7 from './Step7';
import './Registration.css';
// Ensure we're only using one set of styling to avoid conflicts
// import './Step.css'; // Import step styles to ensure consistent styling

const STEPS = [
  { id: 'account', title: 'Account Setup', component: Step1, path: '/register' },
  { id: 'user_type', title: 'Choose Your Path', component: Step2, path: '/register/user-type' },
  { id: 'basicProfile', title: 'Basic Profile', component: Step3, path: '/register/basic-profile' },
  { id: 'specificProfile', title: 'Profile Information', component: Step4, path: '/register/specific-profile' },
  { id: 'photos', title: 'Photos', component: Step5, path: '/register/photos' },
  { id: 'verify', title: 'Verify Email', component: Step6, path: '/register/verify' },
  { id: 'complete', title: 'Complete', component: Step7, path: '/register/complete' },
];

const ErrorPopup = ({ error, setError, fetchRegistrationDraft }) => {
  if (!error) return null;
  return (
    <div className="error-popup">
      <div className="error-content">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => setError(null)}>Close</button>
        <button onClick={fetchRegistrationDraft}>Retry</button>
      </div>
    </div>
  );
};

function RegistrationContainer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationData, setRegistrationData] = useState({
    account: null,
    user_type: null,
    completedSteps: [],
    updated_at: new Date().toISOString(),
  });
  const [registrationToken, setRegistrationToken] = useState(
    localStorage.getItem('registrationToken') || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [userId, setUserId] = useState(null);

  // Function to save current progress before unload (refresh/navigate away)
  const saveCurrentProgress = async () => {
    if (registrationToken && registrationData) {
      try {
        const headers = await getAuthHeaders();
        return fetch(`/users/register/update-draft/${registrationToken}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...registrationData,
            updated_at: new Date().toISOString()
          }),
        });
      } catch (err) {
        console.error('Error saving current progress:', err);
      }
    }
  };

  // Add event listener for beforeunload to save progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (registrationToken && registrationData) {
        // This won't actually save asynchronously before unload,
        // but we'll use the synchronous API to trigger our API call
        e.preventDefault();
        e.returnValue = '';
        
        // Attempt to save (won't complete before unload, but might save data)
        saveCurrentProgress();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [registrationToken, registrationData]);

  useEffect(() => {
    console.log('RegistrationContainer mounted');
    
    // Set the user ID from currentUser if available
    if (currentUser) {
      setUserId(currentUser.uid);
      console.log('Current user ID:', currentUser.uid);
    }
  }, [currentUser]);

  useEffect(() => {
    if (registrationToken) {
      fetchRegistrationDraft();
    }
    
    // Determine current step based on location path
    const currentPath = location.pathname;
    const stepIndex = STEPS.findIndex(step => step.path === currentPath);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
      
      // Initialize form validity based on the current step and data
      updateFormValidity(stepIndex, registrationData);
    }
  }, [location.pathname]);

  // Helper function to update form validity based on step and data
  const updateFormValidity = (stepIndex, data) => {
    if (stepIndex === 0) {
      // Step 1 (account): Valid if email is present
      setIsFormValid(!!data?.account?.email);
    } else if (stepIndex === 1) {
      // Step 2 (user type): Valid if user type is selected
      setIsFormValid(!!data?.user_type);
    } else if (stepIndex === 2) {
      // Step 3 (basic profile): Valid if required fields are filled
      const profile = data?.basicProfile || {};
      const isValid = 
        !!profile.firstName && 
        !!profile.lastName && 
        !!profile.displayName && 
        !!profile.city && 
        !!profile.state && 
        !!profile.country;
      setIsFormValid(isValid);
    } else if (stepIndex === 3) {
      // Step 4 (specific profile): Default to true, component will update
      setIsFormValid(true);
    } else {
      // Other steps: Default to valid
      setIsFormValid(true);
    }
  };

  const getAuthHeaders = async () => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    const token = await currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchRegistrationDraft = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('registrationToken');
      console.log('Fetching draft with token:', token);
      
      if (!token) {
        console.error('No registration token found in localStorage');
        throw new Error('Registration token not found. Please start registration again.');
      }
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(`/users/register/get-draft/${token}`, {
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch registration draft:', response.status, errorText);
        throw new Error(`Failed to fetch registration draft: ${response.status}. Please try again.`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Registration data retrieved:', data.registrationData);
        setRegistrationData(data.registrationData);
        
        // Update form validity with the retrieved data
        const stepIndex = STEPS.findIndex(step => step.path === location.pathname);
        if (stepIndex !== -1) {
          updateFormValidity(stepIndex, data.registrationData);
        }
      } else {
        console.error('API returned failure:', data.message);
        localStorage.removeItem('registrationToken');
        setRegistrationToken('');
        setError(data.message || 'Failed to load registration data');
      }
    } catch (err) {
      console.error('Error fetching registration draft:', err);
      setError(err.message || 'Unable to load your registration. Please try again.');
      
      // If token is invalid, clear it
      if (err.message && (
          err.message.includes('not found') || 
          err.message.includes('invalid token') ||
          err.message.includes('expired')
        )) {
        localStorage.removeItem('registrationToken');
        setRegistrationToken('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createRegistrationDraft = async (userType, signupMethod, firebaseUid) => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if we already have a token, meaning a draft exists
      if (registrationToken) {
        console.log('Draft already exists with token:', registrationToken);
        return true; // Draft exists, consider this a success
      }

      const headers = await getAuthHeaders();
      
      // Include account data if available
      const accountData = registrationData?.account || {};
      
      // Create data object without pre-stringifying
      const userData = {
        email: accountData.email || currentUser?.email
      };
      
      const response = await fetch('/users/register/create-draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_type: userType,
          id: firebaseUid || currentUser?.uid,
          signupMethod,
          data: userData // Pass object directly, let JSON.stringify handle it
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Registration draft creation failed:', response.status, errorText);
        throw new Error(`Failed to create registration: ${response.status}. ${errorText || ''}`);
      }

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('registrationToken', data.token);
        setRegistrationToken(data.token);
        
        // If redirected, follow the redirect
        if (data.redirect) {
          navigate(data.redirect);
        }
        
        // Fetch the draft to get full data structure
        await fetchRegistrationDraft();
        
        return true; // Successfully created draft
      } else {
        setError(data.message || 'Failed to start registration');
        return false;
      }
    } catch (err) {
      console.error('Error creating registration draft:', err);
      setError('Unable to start registration. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRegistrationSection = async (sectionId, sectionData) => {
    if (!registrationToken) {
      setError('Registration token not found. Please start over.');
      return false;
    }
    
    // Skip update if we're trying to update the same data again (prevents loops)
    if (sectionId === 'account' && 
        JSON.stringify(registrationData?.account) === JSON.stringify(sectionData)) {
      console.log('Skipping duplicate account update to prevent loop');
      return true;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`updateRegistrationSection called with sectionId: ${sectionId}, data:`, sectionData);
      
      // Create updated data with the new section
      const updatedData = {
        [sectionId]: sectionData,
        updated_at: new Date().toISOString()
      };
      
      // Add section to completedSteps if not already included
      if (!registrationData.completedSteps?.includes(sectionId)) {
        updatedData.completedSteps = [...(registrationData.completedSteps || []), sectionId];
      }
      
      // Handle user_type special case - always add it at the root level
      if (sectionId === 'user_type') {
        updatedData.user_type = sectionData;
        console.log('Setting user_type to:', sectionData);
      }
      
      console.log('Final updatedData to send to server:', updatedData);
      
      // Save to server
      const headers = await getAuthHeaders();
      const response = await fetch(`/users/register/update-draft/${registrationToken}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`Server error (${response.status}):`, responseText);
        throw new Error(`Failed to update registration: ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error('Error parsing response:', err);
        throw new Error('Server returned invalid data');
      }
      
      if (data.success) {
        console.log('Successfully updated registration data');
        // Update local state
        setRegistrationData(prev => ({
          ...prev,
          ...updatedData,
          // If user_type was updated, make sure it's set explicitly at root level
          ...(updatedData.user_type ? { user_type: updatedData.user_type } : {})
        }));
        return true;
      } else {
        setError(data.message || 'Failed to save your information');
        return false;
      }
    } catch (err) {
      console.error(`Error updating ${sectionId}:`, err);
      setError(`Unable to save your ${sectionId} information. Please try again.`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistrationProcess = async () => {
    if (!registrationToken) {
      setError('Registration token not found. Please start over.');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/users/register/complete/${registrationToken}`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to complete registration: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        localStorage.removeItem('registrationToken');
        setRegistrationToken('');
        return true;
      } else {
        setError(data.message || 'Failed to complete registration');
        return false;
      }
    } catch (err) {
      console.error('Error completing registration:', err);
      setError('Unable to complete registration. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      navigate(STEPS[currentStep - 1].path);
    }
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length - 1) {
      console.log('handleNextStep called, currentStep:', currentStep);
      
      // Get the current step component's form
      const currentStepComponent = document.querySelector('.registration-step form');
      
      if (currentStepComponent) {
        console.log('Found form element:', currentStepComponent);
        
        // Dispatch a submit event to trigger the form's validation and submission
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        currentStepComponent.dispatchEvent(submitEvent);
        
        // Note: We don't navigate here - handleStepSubmit will handle navigation
      } else {
        console.log('No form element found, proceeding directly');
        // No form to validate, proceed directly
        setCurrentStep(prev => prev + 1);
        navigate(STEPS[currentStep + 1].path);
      }
    } else if (currentStep === STEPS.length - 1) {
      // Final step - complete registration
      console.log('Final step, completing registration');
      
      // Get the current step component's form for consistency
      const currentStepComponent = document.querySelector('.registration-step form');
      
      if (currentStepComponent) {
        // Trigger form submission
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        currentStepComponent.dispatchEvent(submitEvent);
      } else {
        // Fallback if no form found
        completeRegistrationProcess().then(success => {
          if (success) {
            navigate('/');
          }
        });
      }
    }
  };

  // Check if step is available for navigation
  const canNavigateToStep = (stepIndex) => {
    const completedStepIds = registrationData?.completedSteps || [];
    if (stepIndex === 0) return true; // Always allow nav to first step
    if (stepIndex === currentStep) return true; // Current step is allowed
    if (stepIndex < currentStep) return true; // Allow going back
    
    // Check if previous step is completed
    const prevStepId = STEPS[stepIndex - 1]?.id;
    return prevStepId && completedStepIds.includes(prevStepId);
  };

  const handleStepSubmit = async (stepData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (currentStep === 0) {
        // Handle account setup (Step1)
        if (!registrationToken) {
          // Create new draft if no token exists
          const isGoogleUser = stepData.isGoogleUser || (currentUser && currentUser.providerData[0].providerId === 'google.com');
          
          // Use existing draftToken if provided (from resuming registration)
          if (stepData.draftToken) {
            localStorage.setItem('registrationToken', stepData.draftToken);
            setRegistrationToken(stepData.draftToken);
            await fetchRegistrationDraft();
          } else {
            // Create new draft
            const success = await createRegistrationDraft(
              null, 
              isGoogleUser ? 'google' : 'email', 
              currentUser?.uid
            );
            
            if (!success) {
              throw new Error('Failed to create registration draft');
            }
          }
        }
        
        // Update with account information
        const accountData = {
          email: currentUser?.email || stepData.email,
          isGoogleUser: currentUser?.providerData[0]?.providerId === 'google.com'
        };
        
        const updateSuccess = await updateRegistrationSection('account', accountData);
        if (!updateSuccess) {
          throw new Error('Failed to update account information');
        }
      } else if (currentStep === 1) {
        // Handle user type selection (Step2)
        console.log('Registration-container: Received user_type from Step2:', stepData);
        
        // stepData contains the direct user_type value (e.g., 'artist')
        const updateSuccess = await updateRegistrationSection('user_type', stepData);
        if (!updateSuccess) {
          throw new Error('Failed to update user type');
        }
        console.log('Registration-container: After updateRegistrationSection for user_type');
      } else if (currentStep === 2) {
        // Handle basic profile (Step3)
        const updateSuccess = await updateRegistrationSection('basicProfile', stepData);
        if (!updateSuccess) {
          throw new Error('Failed to update basic profile');
        }
      } else if (currentStep === 3) {
        // Handle specific profile (Step4)
        // Transform the specific profile data based on user type to match database structure
        let transformedData = { ...stepData };
        
        // If this is an artist, map the fields to match the artist_profiles table structure
        if (registrationData.user_type === 'artist') {
          // Ensure arrays are properly formatted for JSON fields
          const artCategories = Array.isArray(stepData.artCategories) ? stepData.artCategories : [];
          const artMediums = Array.isArray(stepData.artMediums) ? stepData.artMediums : [];
          
          // Map the studio address fields
          transformedData = {
            businessName: stepData.businessName,
            studio_address_line1: stepData.studioAddress?.line1,
            studio_address_line2: stepData.studioAddress?.line2,
            studio_city: stepData.studioAddress?.city,
            studio_state: stepData.studioAddress?.state,
            studio_zip: stepData.studioAddress?.zip,
            artist_biography: stepData.artistBiography,
            art_categories: artCategories,
            art_mediums: artMediums,
            business_phone: stepData.businessPhone,
            customer_service_email: stepData.customerServiceEmail,
            does_custom: stepData.doesCustom,
            
            // Map social media links to the database field names
            business_website: stepData.socialLinks?.website,
            business_social_facebook: stepData.socialLinks?.facebook,
            business_social_instagram: stepData.socialLinks?.instagram,
            business_social_twitter: stepData.socialLinks?.twitter,
            business_social_tiktok: stepData.socialLinks?.tiktok,
            business_social_pinterest: stepData.socialLinks?.pinterest,
          };
          
          console.log('Transformed artist profile data:', transformedData);
        }
        
        const updateSuccess = await updateRegistrationSection('specificProfile', transformedData);
        if (!updateSuccess) {
          throw new Error('Failed to update specific profile');
        }
      } else if (currentStep === 4) {
        // Handle photos (Step5)
        const updateSuccess = await updateRegistrationSection('photos', stepData);
        if (!updateSuccess) {
          throw new Error('Failed to update photos');
        }
      } else if (currentStep === 5) {
        // Handle verify email (Step6)
        const updateSuccess = await updateRegistrationSection('verify', stepData);
        if (!updateSuccess) {
          throw new Error('Failed to update verify email');
        }
      } else if (currentStep === 6) {
        // Handle final step (Step7)
        const updateSuccess = await updateRegistrationSection('finalDetails', stepData);
        if (!updateSuccess) {
          throw new Error('Failed to update final details');
        }
      }

      // Update completed steps tracking
      if (!registrationData.completedSteps) {
        registrationData.completedSteps = [];
      }
      
      const stepId = STEPS[currentStep].id;
      if (!registrationData.completedSteps.includes(stepId)) {
        const updatedCompletedSteps = [...registrationData.completedSteps, stepId];
        await updateRegistrationSection('completedSteps', updatedCompletedSteps);
      }

      // Navigate to next step after all updates are complete
      if (currentStep < STEPS.length - 1) {
        // Move to next step manually instead of triggering handleNextStep
        setCurrentStep(prev => prev + 1);
        navigate(STEPS[currentStep + 1].path);
      } else {
        // Handle final submission
        const success = await completeRegistrationProcess();
        if (success) {
          navigate('/');
        }
      }
    } catch (err) {
      console.error('Error in handleStepSubmit:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    const { id, component: StepComponent } = STEPS[currentStep];
    if (!StepComponent) {
      return <div>Loading step...</div>;
    }
    return (
      <StepComponent
        registrationData={registrationData}
        onSubmit={(data) => handleStepSubmit(data)}
        isLoading={isLoading}
        setIsFormValid={setIsFormValid}
      />
    );
  };

  const handleCancelRegistration = async () => {
    if (window.confirm('Are you sure you want to delete your registration? All data will be lost.')) {
      try {
        if (registrationToken) {
          const headers = await getAuthHeaders();
          await fetch(`/users/register/cancel/${registrationToken}`, {
            method: 'DELETE',
            headers
          });
        }
        
        localStorage.removeItem('registrationToken');
        navigate('/');
      } catch (error) {
        console.error('Error cancelling registration:', error);
        setError('Failed to cancel registration. Please try again.');
      }
    }
  };
  
  const handleSaveForLater = async () => {
    try {
      await saveCurrentProgress();
      alert('Your registration has been saved. You can sign in later to continue.');
      navigate('/login');
    } catch (error) {
      console.error('Error saving registration:', error);
      setError('Failed to save registration. Please try again.');
    }
  };

  return (
    <div className="registration-container registration-wizard">
      <div className="card-container">
        {(userId || registrationData?.userId) && (
          <div className="id-stamp">User ID: {userId || registrationData?.userId || 'Unknown'}</div>
        )}
        <div className="wizard-card">
          <div className="registration-header">
            <Navigation
              steps={STEPS}
              currentStep={currentStep}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              onStepClick={(index) => {
                if (canNavigateToStep(index)) {
                  setCurrentStep(index);
                  navigate(STEPS[index].path);
                }
              }}
              canNavigateToStep={canNavigateToStep}
              onComplete={async () => {
                const completed = await completeRegistrationProcess();
                if (completed) {
                  navigate('/');
                }
              }}
              completedSteps={registrationData?.completedSteps || []}
            />
          </div>
          
          <div className="registration-content">
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading...</div>
              </div>
            )}
            {error && !isLoading && <div className="error-message">{error}</div>}
            {renderCurrentStep()}
          </div>
          
          <div className="step-actions">
            {currentStep > 0 && (
              <button
                type="button"
                className="back-button"
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                Back
              </button>
            )}
            
            <div className="registration-footer-links">
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handleCancelRegistration();
              }}>
                Cancel: Delete my registration
              </a>
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handleSaveForLater();
              }}>
                Save for later: Sign-in later to finish setup
              </a>
            </div>
            
            <button
              type="button"
              className="submit-button"
              onClick={handleNextStep}
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? 'Processing...' : (currentStep === STEPS.length - 1 ? 'Complete Registration' : 'Continue')}
            </button>
          </div>
          
          <ErrorPopup error={error} setError={setError} fetchRegistrationDraft={fetchRegistrationDraft} />
        </div>
      </div>
    </div>
  );
}

export default RegistrationContainer;