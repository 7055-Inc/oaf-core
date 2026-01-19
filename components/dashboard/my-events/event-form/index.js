import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { EventFormProvider, useEventForm } from './EventFormContext';
import { AccordionSection } from '../../../../modules/dashboard/components/shared';

// Section components
import BasicInfoSection, { getBasicInfoSummary } from './sections/BasicInfoSection';
import DatesSection, { getDatesSummary } from './sections/DatesSection';
import VenueSection, { getVenueSummary } from './sections/VenueSection';
import EventDetailsSection, { getEventDetailsSummary } from './sections/EventDetailsSection';
import SettingsSection, { getSettingsSummary } from './sections/SettingsSection';
import ApplicationSection, { getApplicationSummary } from './sections/ApplicationSection';
import SEOSection, { getSEOSummary } from './sections/SEOSection';
import ImagesSection, { getImagesSummary } from './sections/ImagesSection';

// Status Header component
function EventStatusHeader() {
  const { mode, savedEventId, formData, isClaimedEvent } = useEventForm();

  if (mode === 'create' && !savedEventId && !isClaimedEvent) {
    return null;
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {isClaimedEvent && (
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 20px',
          background: '#e3f2fd',
          border: '2px solid #2196F3',
          borderRadius: '2px',
          marginBottom: '16px'
        }}>
          <i className="fas fa-gift" style={{ fontSize: '24px', color: '#1976D2' }}></i>
          <div>
            <strong style={{ display: 'block', color: '#1976D2', marginBottom: '4px' }}>
              Event Claimed from Artist Suggestion
            </strong>
            <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
              We've pre-filled the basic details. Please review and complete all sections.
            </p>
          </div>
        </div>
      )}
      
      {savedEventId && (
        <div className="success-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <i className="fas fa-check-circle"></i>
          <span>Draft saved</span>
          {formData.title && <span style={{ color: '#1b5e20', fontWeight: '500' }}>— {formData.title}</span>}
        </div>
      )}
    </div>
  );
}

// Main form content (uses context)
function EventFormContent() {
  const router = useRouter();
  const {
    mode,
    formData,
    applicationFields,
    availableAddons,
    sectionStatus,
    activeSection,
    saving,
    error,
    loadingEvent,
    setError,
    loadEventTypes,
    completeSection,
    openSection,
    saveDraft,
    publishEvent,
    isReadyToPublish
  } = useEventForm();

  // Load event types on mount
  useEffect(() => {
    loadEventTypes();
  }, [loadEventTypes]);

  // Show loading state while fetching event data
  if (loadingEvent) {
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--primary-color)' }}></i>
        <span>Loading event...</span>
      </div>
    );
  }

  // Define sections
  const sections = [
    {
      id: 'basicInfo',
      title: 'Basic Information',
      icon: 'fa-info-circle',
      component: BasicInfoSection,
      getSummary: () => getBasicInfoSummary(formData),
      nextSection: 'dates',
      validate: () => !!formData.title && !!formData.event_type_id,
      requiresSave: false
    },
    {
      id: 'dates',
      title: 'Event Dates',
      icon: 'fa-calendar-alt',
      component: DatesSection,
      getSummary: () => getDatesSummary(formData),
      nextSection: 'venue',
      validate: () => !!formData.start_date && !!formData.end_date,
      requiresSave: true // First save point
    },
    {
      id: 'venue',
      title: 'Venue Information',
      icon: 'fa-map-marker-alt',
      component: VenueSection,
      getSummary: () => getVenueSummary(formData),
      nextSection: 'eventDetails',
      validate: () => true // Optional
    },
    {
      id: 'eventDetails',
      title: 'Event Details',
      icon: 'fa-clipboard-list',
      component: EventDetailsSection,
      getSummary: () => getEventDetailsSummary(formData),
      nextSection: 'settings',
      validate: () => true // Optional
    },
    {
      id: 'settings',
      title: 'Event Settings',
      icon: 'fa-cog',
      component: SettingsSection,
      getSummary: () => getSettingsSummary(formData),
      nextSection: formData.allow_applications ? 'applications' : 'seo',
      validate: () => true
    },
    {
      id: 'applications',
      title: 'Application Requirements',
      icon: 'fa-file-alt',
      component: ApplicationSection,
      getSummary: () => getApplicationSummary(formData, applicationFields, availableAddons),
      show: formData.allow_applications,
      nextSection: 'seo',
      validate: () => true // Optional
    },
    {
      id: 'seo',
      title: 'SEO & Discoverability',
      icon: 'fa-search',
      component: SEOSection,
      getSummary: () => getSEOSummary(formData),
      nextSection: 'images',
      validate: () => true // Optional
    },
    {
      id: 'images',
      title: 'Event Images',
      icon: 'fa-camera',
      component: ImagesSection,
      getSummary: () => getImagesSummary(formData),
      nextSection: null,
      validate: () => true // Optional but recommended
    }
  ];

  // Filter visible sections (hide applications if not enabled)
  const visibleSections = sections.filter(s => s.show !== false);

  // Handle section completion
  const handleSectionNext = async (section) => {
    if (!section.validate()) {
      setError('Please fill in all required fields before continuing.');
      return;
    }

    // Save draft if section requires it
    if (section.requiresSave !== false) {
      try {
        await saveDraft();
      } catch (err) {
        return; // Error is set in context
      }
    }

    completeSection(section.id, section.nextSection);
  };

  // Handle publish
  const handlePublish = async () => {
    const eventId = await publishEvent();
    if (eventId) {
      // Redirect to event page
      router.push(`/events/${eventId}`);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Status Header */}
      <EventStatusHeader />

      {/* Error display - uses global .error-alert class */}
      {error && (
        <div className="error-alert" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-exclamation-triangle"></i>
          <span style={{ flex: 1 }}>{error}</span>
          <button 
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Sections */}
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
            onToggle={() => openSection(activeSection === section.id ? null : section.id)}
            onNext={() => handleSectionNext(section)}
            nextLabel={saving ? 'Saving...' : 'Continue'}
            showNext={mode === 'create' || activeSection === section.id}
            isLast={isLast}
          >
            <SectionComponent />
          </AccordionSection>
        );
      })}

      {/* Publish / Create Button - uses global .publish-section, .publish-button, .publish-hint classes */}
      {(isReadyToPublish() || mode === 'edit') && (
        <div className="publish-section">
          <button
            onClick={handlePublish}
            disabled={saving}
            className="publish-button"
          >
            {saving ? 'Saving...' : (mode === 'create' ? 'Create Event' : 'Update Event')}
          </button>
          <p className="publish-hint">
            {mode === 'create' 
              ? 'Your event will be visible to artists and attendees'
              : 'Changes will be applied immediately'}
          </p>
        </div>
      )}

      {/* Draft indicator - uses global .draft-hint class */}
      {mode === 'create' && (
        <p className="draft-hint">Your progress is automatically saved as a draft</p>
      )}
    </div>
  );
}

// Wrapper component with provider
export default function EventForm({ userData, eventId = null, initialData = null, claimedEventId = null }) {
  return (
    <EventFormProvider 
      userData={userData} 
      eventId={eventId} 
      initialData={initialData}
      claimedEventId={claimedEventId}
    >
      <EventFormContent />
    </EventFormProvider>
  );
}

// Export individual components for flexibility
export { 
  EventFormProvider, 
  useEventForm,
  BasicInfoSection,
  DatesSection,
  VenueSection,
  EventDetailsSection,
  SettingsSection,
  ApplicationSection,
  SEOSection,
  ImagesSection
};

