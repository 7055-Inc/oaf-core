import React, { useState, useEffect, useRef } from 'react';
import { registrationService } from '../../services/registrationService';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import './RegistrationTimeline.css';

const DISPLAY_NAME_MIN_LENGTH = 3;
const DISPLAY_NAME_MAX_LENGTH = 30;
const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

const USER_TYPES = [
  { id: 'community', label: 'Community Member', description: 'Browse and purchase artwork' },
  { id: 'artist', label: 'Artist', description: 'Create and sell your artwork' },
  { id: 'promoter', label: 'Promoter', description: 'Promote artists and events' }
];

const FormSection = ({ title, fields, isEditing, onToggleEdit, onSubmit }) => {
  return (
    <div className="form-section">
      <div className="section-header">
        <h3>{title}</h3>
        <button 
          className="edit-button"
          onClick={onToggleEdit}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      
      {isEditing ? (
        <div className="section-content editing">
          {fields.map((field, index) => (
            <div key={index} className="form-field">
              <label>{field.label}</label>
              <input 
                type="text" 
                value={field.value} 
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <button 
            className="submit-section"
            onClick={onSubmit}
          >
            Save Changes
          </button>
        </div>
      ) : (
        <div className="section-content">
          {fields.map((field, index) => (
            <div key={index} className="field-display">
              <span className="field-label">{field.label}:</span>
              <span className="field-value">{field.value || 'Not provided'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RegistrationTimeline = ({ steps, currentStep, userData, setUserData, onNextStep, onComplete }) => {
  const [error, setError] = useState(null);
  const [displayNameAlternatives, setDisplayNameAlternatives] = useState([]);
  const [isCheckingDisplayName, setIsCheckingDisplayName] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [criticalError, setCriticalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldsRef = useRef(null);
  const [editingSections, setEditingSections] = useState({});
  const [sectionData, setSectionData] = useState({
    personal: {
      title: 'Personal Information',
      fields: [
        { label: 'Full Name', value: '', onChange: (value) => updateSectionField('personal', 'fullName', value) },
        { label: 'Date of Birth', value: '', onChange: (value) => updateSectionField('personal', 'dob', value) },
        { label: 'Phone Number', value: '', onChange: (value) => updateSectionField('personal', 'phone', value) }
      ]
    },
    preferences: {
      title: 'Account Preferences',
      fields: [
        { label: 'Email Notifications', value: 'Enabled', onChange: (value) => updateSectionField('preferences', 'emailNotifications', value) },
        { label: 'Theme', value: 'Light', onChange: (value) => updateSectionField('preferences', 'theme', value) },
        { label: 'Language', value: 'English', onChange: (value) => updateSectionField('preferences', 'language', value) }
      ]
    },
    security: {
      title: 'Security Settings',
      fields: [
        { label: 'Two-Factor Authentication', value: 'Disabled', onChange: (value) => updateSectionField('security', 'twoFactor', value) },
        { label: 'Security Questions', value: 'Not set', onChange: (value) => updateSectionField('security', 'securityQuestions', value) },
        { label: 'Backup Email', value: '', onChange: (value) => updateSectionField('security', 'backupEmail', value) }
      ]
    }
  });

  useEffect(() => {
    // Only clear non-critical errors on step change
    if (!criticalError) {
      setError(null);
      setValidationErrors({});
    }
  }, [currentStep, criticalError]);

  const validateDisplayName = (name) => {
    const errors = [];
    if (name.length < DISPLAY_NAME_MIN_LENGTH) {
      errors.push(`Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters`);
    }
    if (name.length > DISPLAY_NAME_MAX_LENGTH) {
      errors.push(`Display name must be no more than ${DISPLAY_NAME_MAX_LENGTH} characters`);
    }
    if (!DISPLAY_NAME_REGEX.test(name)) {
      errors.push('Display name can only contain letters, numbers, underscores, and hyphens');
    }
    return errors;
  };

  const handleError = (error) => {
    if (error.type === 'VALIDATION_ERROR') {
      setValidationErrors(error.details);
      setError(null);
      setCriticalError(null);
    } else if (error.type === 'NETWORK_ERROR' || error.type === 'SERVER_ERROR') {
      setCriticalError(error.message);
      setError(error.message);
    } else if (error.type === 'CONFLICT_ERROR') {
      setError(error.message);
      setCriticalError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setIsSubmitting(true);

    const currentStepInfo = steps[currentStep];

    // If we're on the review or finalReview step, call onComplete
    if (currentStepInfo.id === 'review' || currentStepInfo.id === 'finalReview') {
      try {
        console.log("Submitting final registration data:", userData);
        await onComplete();
        // Success navigation is handled by the parent component's polling
      } catch (err) {
        console.error('Error in onComplete:', err);
        handleError(err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // --- Field Validation (Example for required fields) ---
    // You should add more specific validation as needed (e.g., email format, URL format)
    if (!currentStepInfo.isOptional && !userData[currentStepInfo.id]) {
      setValidationErrors({ [currentStepInfo.id]: [`${currentStepInfo.label} is required`] });
      setIsSubmitting(false);
      return;
    }
    
    // Special validation for displayName
    if (currentStepInfo.id === 'displayName') {
        const validationErrs = validateDisplayName(userData.displayName);
        if (validationErrs.length > 0) {
          setValidationErrors({ displayName: validationErrs });
          setIsSubmitting(false);
          return;
        }
        
        try {
          const isAvailable = await registrationService.checkDisplayNameAvailability(userData.displayName);
          if (!isAvailable) {
            const alternatives = await registrationService.getDisplayNameAlternatives(userData.displayName);
            setDisplayNameAlternatives(alternatives);
            setError('Display name is already taken');
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          handleError(err);
          setIsSubmitting(false);
          return;
        }
    }
    // --- End Validation ---

    // Submit the field data
    try {
      await onNextStep(currentStepInfo.id, userData[currentStepInfo.id]);
      // onNextStep in the parent (registration.js) handles saving and advancing the step
    } catch (err) {
      console.error(`Error submitting step ${currentStepInfo.id}:`, err);
      handleError(err); // Show error to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkDisplayName = async (name) => {
    if (!name) return;
    
    const validationErrors = validateDisplayName(name);
    if (validationErrors.length > 0) {
      setValidationErrors({ displayName: validationErrors });
      return;
    }

    setIsCheckingDisplayName(true);
    try {
      const isAvailable = await registrationService.checkDisplayNameAvailability(name);
      if (!isAvailable) {
        const alternatives = await registrationService.getDisplayNameAlternatives(name);
        setDisplayNameAlternatives(alternatives);
      } else {
        setDisplayNameAlternatives([]);
      }
      setValidationErrors({});
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsCheckingDisplayName(false);
    }
  };

  const handleDisplayNameChange = (e) => {
    const newName = e.target.value;
    setUserData({ ...userData, displayName: newName });
    setDisplayNameAlternatives([]);
    setValidationErrors({});
    setError(null);
    
    if (newName.length >= DISPLAY_NAME_MIN_LENGTH) {
      checkDisplayName(newName);
    }
  };

  const handleAlternativeSelect = (alternative) => {
    setUserData({ ...userData, displayName: alternative });
    setDisplayNameAlternatives([]);
    setValidationErrors({});
    setError(null);
  };

  const handleUserTypeSelect = (userType) => {
    setUserData({ ...userData, userType });
    setValidationErrors({});
  };

  const updateSectionField = (section, field, value) => {
    setSectionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        fields: prev[section].fields.map(f => 
          f.label.toLowerCase().includes(field.toLowerCase()) 
            ? { ...f, value } 
            : f
        )
      }
    }));
  };

  const toggleSectionEdit = (section) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSectionSubmit = async (section) => {
    setIsSubmitting(true);
    try {
      // Here we would typically make an API call to save the section data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      setEditingSections(prev => ({ ...prev, [section]: false }));
    } catch (err) {
      handleError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = () => {
    // Get current step info
    const currentStepInfo = steps[currentStep];
    
    if (!currentStepInfo) {
      return <div>Unknown step</div>;
    }

    // Handle specific complex steps first
    switch (currentStepInfo.id) {
      case 'email':
        return (
          <div className="timeline-field current">
            <label htmlFor="email">Your Email</label>
            <input
              type="email"
              id="email"
              value={userData.email}
              readOnly
              className="readonly"
            />
            <button 
              type="submit"
              // No onClick needed here, form submission handles it
            >
              Next
            </button>
          </div>
        );
        
      case 'userType':
        return (
          <div className="timeline-field current">
            <h2>Choose Your Account Type</h2>
            <p className="user-type-instructions">
              Select how you'd like to participate in our platform
            </p>
            
            <div className="user-type-options">
              {USER_TYPES.map(type => (
                <div 
                  key={type.id}
                  className={`user-type-option ${userData.userType === type.id ? 'selected' : ''}`}
                  onClick={() => handleUserTypeSelect(type.id)}
                >
                  <h3>{type.label}</h3>
                  <p>{type.description}</p>
                </div>
              ))}
            </div>
            
            {validationErrors.userType && (
              <div className="error-message">
                {validationErrors.userType.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
            
            <button 
              type="submit"
              disabled={!userData.userType || isSubmitting}
              // No onClick needed here, form submission handles it
            >
              Next
            </button>
          </div>
        );
        
      case 'displayName':
        return (
          <div className="timeline-field current">
            <label htmlFor="displayName">Choose a Display Name</label>
            <input
              type="text"
              id="displayName"
              value={userData.displayName || ''}
              onChange={handleDisplayNameChange}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              className={validationErrors.displayName ? 'error' : ''}
              placeholder="Enter your display name"
            />
            {validationErrors.displayName && (
              <div className="error-message">
                {validationErrors.displayName.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
            {isCheckingDisplayName && <div className="checking">Checking availability...</div>}
            {error && !criticalError && <div className="error-message">{error}</div>}
            {criticalError && <div className="error-message critical">{criticalError}</div>}
            {displayNameAlternatives.length > 0 && (
              <div className="alternatives">
                <p>Display name unavailable. Try these alternatives:</p>
                <ul>
                  {displayNameAlternatives.map((alt) => (
                    <li key={alt} onClick={() => handleAlternativeSelect(alt)}>
                      {alt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button 
              type="submit" 
              disabled={!userData.displayName || validationErrors.displayName || isCheckingDisplayName || criticalError || isSubmitting}
              // No onClick needed here, form submission handles it
            >
              Next
            </button>
          </div>
        );
        
      case 'review':
        // Keep the existing review step logic
        // We might want to enhance this later to show all collected data
        return (
          <div className="timeline-field current">
            <h2>Review and Complete Your Profile</h2>
            
            <div className="profile-review">
              {/* Display collected data - simplified for now */}
              <div className="review-section">
                <h3>Account Information</h3>
                <p>Email: {userData.email}</p>
                <p>User Type: {USER_TYPES.find(t => t.id === userData.userType)?.label || userData.userType}</p>
                <p>Display Name: {userData.displayName}</p>
              </div>
               <div className="review-section">
                <h3>Basic Information</h3>
                <p>First Name: {userData.first_name}</p>
                <p>Last Name: {userData.last_name}</p>
              </div>
              {/* Add more sections to display other collected data */} 
              {/* Example: 
              <div className="review-section">
                <h3>Contact Info</h3>
                <p>Phone: {userData.phone || 'N/A'}</p>
                <p>Website: {userData.website || 'N/A'}</p>
              </div>
              ... and so on for address, social, personal, professional, settings ...
              */}
            </div>
            
            {/* Optional: Keep FormSection if needed for edits during review, but remove for now */}
            {/* <div className="profile-sections">
              {Object.entries(sectionData).map(([key, section]) => (
                <FormSection
                  key={key}
                  title={section.title}
                  fields={section.fields}
                  isEditing={editingSections[key]}
                  onToggleEdit={() => toggleSectionEdit(key)}
                  onSubmit={() => handleSectionSubmit(key)}
                />
              ))}
            </div> */}
            <button 
              type="submit" // This will now trigger the onComplete handler via handleSubmit
              className="complete-registration"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Profile...' : 'Create My Profile'}
            </button>
          </div>
        );
        
      case 'finalReview':
        return (
          <div className="timeline-field current">
            <h2>Final Review & Account Activation</h2>
            <p>Please review all your information before activating your account.</p>
            
            <div className="final-review-container">
              {Object.entries(userData).map(([key, value]) => {
                const stepInfo = steps.find(s => s.id === key);
                if (!stepInfo) return null;
                const isEditing = editingSections[key];
                return (
                  <div key={key} className="review-item">
                    <div className="review-display">
                      <span className="field-label">{stepInfo.label}:</span>
                      <span className="field-value">{value || 'Not provided'}</span>
                      <button 
                        className="edit-field-button"
                        onClick={() => toggleSectionEdit(key)}
                      >
                        Edit
                      </button>
                    </div>
                    {isEditing && (
                      <div className="edit-field-container">
                        {stepInfo.type === 'textarea' ? (
                          <textarea
                            value={value || ''}
                            onChange={(e) => updateSectionField('finalReview', key, e.target.value)}
                            rows={4}
                          />
                        ) : stepInfo.type === 'select' && stepInfo.options ? (
                          <select
                            value={value || ''}
                            onChange={(e) => updateSectionField('finalReview', key, e.target.value)}
                          >
                            <option value="" disabled>-- Select --</option>
                            {stepInfo.options.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={stepInfo.type || 'text'}
                            value={value || ''}
                            onChange={(e) => updateSectionField('finalReview', key, e.target.value)}
                          />
                        )}
                        <button 
                          className="submit-field-edit"
                          onClick={() => handleSectionSubmit(key)}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button 
              type="submit"
              className="activate-account-button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  // Resave all profile data
                  await Promise.all(Object.entries(userData).map(([key, value]) => 
                    onNextStep(key, value)
                  ));
                  // The form submission will handle the onComplete call for finalReview
                } catch (err) {
                  handleError(err);
                }
              }}
            >
              {isSubmitting ? 'Activating Account...' : 'Activate My Account'}
            </button>
          </div>
        );
    }

    // Generic handler for simple input types
    if (['text', 'tel', 'url', 'date'].includes(currentStepInfo.type)) {
      return (
        <div className="timeline-field current">
          <label htmlFor={currentStepInfo.id}>{currentStepInfo.label}</label>
          <input
            type={currentStepInfo.type}
            id={currentStepInfo.id}
            value={userData[currentStepInfo.id] || ''} 
            onChange={(e) => setUserData({ ...userData, [currentStepInfo.id]: e.target.value })}
            className={validationErrors[currentStepInfo.id] ? 'error' : ''}
            placeholder={currentStepInfo.placeholder || `Enter your ${currentStepInfo.label.toLowerCase()}`}
          />
          {validationErrors[currentStepInfo.id] && (
            <div className="error-message">
              {validationErrors[currentStepInfo.id].map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting}
            // No onClick needed here, form submission handles it
          >
            Next
          </button>
        </div>
      );
    }

    if (currentStepInfo.type === 'textarea') {
      return (
        <div className="timeline-field current">
          <label htmlFor={currentStepInfo.id}>{currentStepInfo.label}</label>
          <textarea
            id={currentStepInfo.id}
            value={userData[currentStepInfo.id] || ''} 
            onChange={(e) => setUserData({ ...userData, [currentStepInfo.id]: e.target.value })}
            className={validationErrors[currentStepInfo.id] ? 'error' : ''}
            placeholder={currentStepInfo.placeholder || `Enter ${currentStepInfo.label.toLowerCase()}`}
            rows={4} // Default rows, adjust as needed
          />
          {validationErrors[currentStepInfo.id] && (
            <div className="error-message">
              {validationErrors[currentStepInfo.id].map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting}
            // No onClick needed here, form submission handles it
          >
            Next
          </button>
        </div>
      );
    }

    if (currentStepInfo.type === 'select' && currentStepInfo.options) {
       return (
        <div className="timeline-field current">
          <label htmlFor={currentStepInfo.id}>{currentStepInfo.label}</label>
          <select
            id={currentStepInfo.id}
            value={userData[currentStepInfo.id] || ''} 
            onChange={(e) => setUserData({ ...userData, [currentStepInfo.id]: e.target.value })}
            className={validationErrors[currentStepInfo.id] ? 'error' : ''}
          >
            <option value="" disabled>-- Select --</option>
            {currentStepInfo.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {validationErrors[currentStepInfo.id] && (
            <div className="error-message">
              {validationErrors[currentStepInfo.id].map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting}
            // No onClick needed here, form submission handles it
          >
            Next
          </button>
        </div>
      );
    }

    // Fallback for unhandled step types
    return <div>Unknown step type: {currentStepInfo.type} for ID: {currentStepInfo.id}</div>;
  };

  return (
    <div className="timeline-container">
      {isSubmitting && <LoadingOverlay />}
      <form onSubmit={handleSubmit} className="timeline-fields" ref={fieldsRef}>
        {renderFields()}
      </form>
    </div>
  );
}; 