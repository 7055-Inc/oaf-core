import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { FormSection } from './FormSection';
import { profileService } from '../../services/profileService';
import './ProfileManagement.css';

export const ProfileManagement = ({ isInitialSetup = false }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    // Load existing profile data
    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        if (profile) {
          // Update sectionData with existing values
          setSectionData(prev => ({
            ...prev,
            personal: {
              ...prev.personal,
              fields: prev.personal.fields.map(field => ({
                ...field,
                value: profile[field.label.toLowerCase().replace(' ', '_')] || ''
              }))
            },
            // ... similar updates for other sections
          }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, []);

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
      const sectionDataToSubmit = sectionData[section].fields.reduce((acc, field) => {
        acc[field.label.toLowerCase().replace(' ', '_')] = field.value;
        return acc;
      }, {});

      await profileService.updateProfileSection(section, sectionDataToSubmit);
      setEditingSections(prev => ({ ...prev, [section]: false }));
    } catch (error) {
      console.error(`Error updating ${section}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProfile = async () => {
    setIsSubmitting(true);
    try {
      // Get all sections that are being edited
      const sectionsToUpdate = Object.entries(editingSections)
        .filter(([_, isEditing]) => isEditing)
        .map(([section]) => section);

      if (sectionsToUpdate.length > 0) {
        // Submit all edited sections
        await Promise.all(
          sectionsToUpdate.map(section => handleSectionSubmit(section))
        );
      }

      // Check if user is active
      const userStatus = await profileService.getUserStatus();
      if (!userStatus.isActive) {
        await profileService.activateUser();
      }

      // Navigate based on context
      if (isInitialSetup) {
        navigate('/dashboard');
      } else {
        navigate('/checklist');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-management">
      {isSubmitting && <LoadingOverlay />}
      <div className="profile-header">
        <h1>{isInitialSetup ? 'Complete Your Profile' : 'Profile Management'}</h1>
        <p>{isInitialSetup ? 'Please review and complete your profile information' : 'Manage your account settings and preferences'}</p>
      </div>

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
        className="complete-profile"
        onClick={handleCompleteProfile}
        disabled={isSubmitting}
      >
        {isInitialSetup ? 'Complete Registration' : 'Save All Changes'}
      </button>
    </div>
  );
}; 