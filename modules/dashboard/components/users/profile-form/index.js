/**
 * Profile Form - Accordion-based Profile Editor
 * 
 * Uses the same pattern as Product Form:
 * - AccordionSection for collapsible sections
 * - Context provider for state management
 * - Section-based architecture
 * 
 * @module modules/dashboard/components/users/profile-form
 */

import { ProfileFormProvider, useProfileForm } from './ProfileFormContext';
import { AccordionSection } from '../../shared';

// Section components
import {
  PersonalInfoSection, getPersonalInfoSummary,
  AddressSection, getAddressSummary,
  SocialMediaSection, getSocialMediaSummary,
  ProfileImagesSection, getImagesSummary,
  AdditionalInfoSection, getAdditionalInfoSummary,
  ArtistProfileSection, getArtistSummary,
  PromoterProfileSection, getPromoterSummary,
  CommunityPreferencesSection, getCommunitySummary
} from './sections';

// Main form content (uses context)
function ProfileFormContent() {
  const {
    formData,
    imageFiles,
    sectionStatus,
    activeSection,
    completeSection,
    openSection,
    canEditArtist,
    canEditPromoter,
    canEditCommunity,
    saving,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    saveProfile
  } = useProfileForm();

  // Define sections
  const sections = [
    {
      id: 'personalInfo',
      title: 'Personal Information',
      icon: 'fa-user',
      component: PersonalInfoSection,
      getSummary: () => getPersonalInfoSummary(formData),
      show: true,
      nextSection: 'address'
    },
    {
      id: 'address',
      title: 'Billing Address',
      icon: 'fa-map-marker-alt',
      component: AddressSection,
      getSummary: () => getAddressSummary(formData),
      show: true,
      nextSection: 'socialMedia'
    },
    {
      id: 'socialMedia',
      title: 'Personal Social Media',
      icon: 'fa-share-alt',
      component: SocialMediaSection,
      getSummary: () => getSocialMediaSummary(formData),
      show: true,
      nextSection: 'profileImages'
    },
    {
      id: 'profileImages',
      title: 'Profile Images',
      icon: 'fa-camera',
      component: ProfileImagesSection,
      getSummary: () => getImagesSummary(formData, imageFiles),
      show: true,
      nextSection: 'additionalInfo'
    },
    {
      id: 'additionalInfo',
      title: 'Additional Information',
      icon: 'fa-info-circle',
      component: AdditionalInfoSection,
      getSummary: () => getAdditionalInfoSummary(formData),
      show: true,
      nextSection: canEditArtist ? 'artistProfile' : (canEditPromoter ? 'promoterProfile' : (canEditCommunity ? 'communityPreferences' : null))
    },
    {
      id: 'artistProfile',
      title: 'Artist Profile',
      icon: 'fa-palette',
      component: ArtistProfileSection,
      getSummary: () => getArtistSummary(formData),
      show: canEditArtist,
      nextSection: canEditPromoter ? 'promoterProfile' : (canEditCommunity ? 'communityPreferences' : null)
    },
    {
      id: 'promoterProfile',
      title: 'Promoter Profile',
      icon: 'fa-bullhorn',
      component: PromoterProfileSection,
      getSummary: () => getPromoterSummary(formData),
      show: canEditPromoter,
      nextSection: canEditCommunity ? 'communityPreferences' : null
    },
    {
      id: 'communityPreferences',
      title: 'Art Preferences',
      icon: 'fa-heart',
      component: CommunityPreferencesSection,
      getSummary: () => getCommunitySummary(formData),
      show: canEditCommunity,
      nextSection: null
    }
  ];

  const visibleSections = sections.filter(s => s.show);

  const handleNext = (section) => {
    completeSection(section.id, section.nextSection);
  };

  const handleSave = async () => {
    const success = await saveProfile();
    if (success) {
      // Optionally reload page to refresh data
      // window.location.reload();
    }
  };

  return (
    <div className="profile-form">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {/* Success Alert */}
      {successMessage && (
        <div className="alert alert-success">
          <span>{successMessage}</span>
          <button className="alert-close" onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      {/* Accordion Sections */}
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {visibleSections.map((section, index) => {
          const SectionComponent = section.component;
          const isLast = index === visibleSections.length - 1;
          
          return (
            <AccordionSection
              key={section.id}
              id={section.id}
              title={section.title}
              icon={section.icon}
              status={sectionStatus[section.id]}
              isOpen={activeSection === section.id}
              summary={section.getSummary()}
              onToggle={() => openSection(section.id)}
              onNext={() => handleNext(section)}
              showNext={!isLast}
              isLast={isLast}
            >
              <SectionComponent />
            </AccordionSection>
          );
        })}

        {/* Save Button */}
        <div className="form-submit-section">
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Main export - wrapped with provider
export default function ProfileForm({ userData }) {
  if (!userData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <ProfileFormProvider userData={userData}>
      <ProfileFormContent />
    </ProfileFormProvider>
  );
}

// Re-export context for advanced usage
export { ProfileFormProvider, useProfileForm } from './ProfileFormContext';
