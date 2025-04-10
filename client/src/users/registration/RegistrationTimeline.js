import React, { useState, useEffect, useRef } from 'react';
import { registrationService } from '../../services/registrationService';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import './RegistrationTimeline.css';

const DISPLAY_NAME_MIN_LENGTH = 3;
const DISPLAY_NAME_MAX_LENGTH = 30;
const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

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

export const RegistrationTimeline = ({ currentStep, userData, setUserData, onNextStep }) => {
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
    try {
      const validationErrors = validateDisplayName(userData.displayName);
      if (validationErrors.length > 0) {
        setValidationErrors({ displayName: validationErrors });
        return;
      }
      setIsSubmitting(true);
      await registrationService.submitRegistration({
        ...userData,
        status: 'active'  // Explicitly set status to active
      });
      onNextStep();
    } catch (err) {
      handleError(err);
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
    switch (currentStep) {
      case 1:
        return (
          <div className="timeline-field current">
            <label htmlFor="displayName">Choose a Display Name</label>
            <input
              type="text"
              id="displayName"
              value={userData.displayName}
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
              disabled={!userData.displayName || validationErrors.displayName || isCheckingDisplayName || criticalError}
            >
              Next
            </button>
          </div>
        );
      case 2:
        return (
          <div className="timeline-field current">
            <h2>Review and Complete Your Profile</h2>
            <div className="profile-sections">
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
            </div>
            <button 
              type="button"
              className="complete-registration"
              onClick={handleSubmit}
            >
              Complete Registration
            </button>
          </div>
        );
      default:
        return null;
    }
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