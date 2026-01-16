import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

const EventFormContext = createContext(null);

export function useEventForm() {
  const context = useContext(EventFormContext);
  if (!context) {
    throw new Error('useEventForm must be used within EventFormProvider');
  }
  return context;
}

export function EventFormProvider({ children, userData, eventId = null, initialData = null, claimedEventId = null }) {
  // Mode: 'create' or 'edit'
  const mode = eventId || claimedEventId ? 'edit' : 'create';
  const isClaimedEvent = !!claimedEventId;
  
  // Loading state for fetching event data
  const [loadingEvent, setLoadingEvent] = useState(!!(eventId || claimedEventId) && !initialData);
  
  // Core event data
  const [formData, setFormData] = useState({
    // Basic Info
    title: initialData?.title || '',
    event_type_id: initialData?.event_type_id || '',
    short_description: initialData?.short_description || '',
    description: initialData?.description || '',
    admission_fee: initialData?.admission_fee || 0,
    parking_fee: initialData?.parking_fee || 0,
    
    // Dates
    start_date: initialData?.start_date ? initialData.start_date.split('T')[0] : '',
    end_date: initialData?.end_date ? initialData.end_date.split('T')[0] : '',
    
    // Venue
    venue_name: initialData?.venue_name || '',
    venue_address: initialData?.venue_address || '',
    venue_city: initialData?.venue_city || '',
    venue_state: initialData?.venue_state || '',
    venue_zip: initialData?.venue_zip || '',
    venue_capacity: initialData?.venue_capacity || '',
    parking_info: initialData?.parking_info || '',
    accessibility_info: initialData?.accessibility_info || '',
    
    // Event Details
    age_restrictions: initialData?.age_restrictions || 'all_ages',
    age_minimum: initialData?.age_minimum || '',
    dress_code: initialData?.dress_code || '',
    has_rsvp: initialData?.has_rsvp || false,
    has_tickets: initialData?.has_tickets || false,
    rsvp_url: initialData?.rsvp_url || '',
    
    // Settings
    application_status: initialData?.application_status || 'not_accepting',
    allow_applications: initialData?.allow_applications || false,
    max_artists: initialData?.max_artists || '',
    max_applications: initialData?.max_applications || '',
    
    // Application Requirements (when allow_applications is true)
    application_fee: initialData?.application_fee || 0,
    jury_fee: initialData?.jury_fee || 0,
    booth_fee: initialData?.booth_fee || 0,
    application_deadline: initialData?.application_deadline ? initialData.application_deadline.split('T')[0] : '',
    jury_date: initialData?.jury_date ? initialData.jury_date.split('T')[0] : '',
    notification_date: initialData?.notification_date ? initialData.notification_date.split('T')[0] : '',
    
    // SEO
    seo_title: initialData?.seo_title || '',
    meta_description: initialData?.meta_description || '',
    event_keywords: initialData?.event_keywords || '',
    
    // Images
    images: initialData?.images || []
  });

  // Application Fields (custom fields for artist applications)
  const [applicationFields, setApplicationFields] = useState(initialData?.applicationFields || []);

  // Basic Fields Configuration (checkboxes for standard fields)
  const [basicFields, setBasicFields] = useState(initialData?.basicFields || {
    company_name: { included: true, required: false, verifiedCanSkip: false },
    email: { included: true, required: true, verifiedCanSkip: false },
    address: { included: false, required: false, verifiedCanSkip: false },
    phone: { included: false, required: false, verifiedCanSkip: false },
    artist_statement: { included: true, required: true, verifiedCanSkip: true },
    portfolio_url: { included: true, required: false, verifiedCanSkip: false },
    additional_info: { included: true, required: false, verifiedCanSkip: false },
    additional_notes: { included: true, required: false, verifiedCanSkip: false }
  });

  // Standard Media Fields Configuration
  const [standardMediaFields, setStandardMediaFields] = useState(initialData?.standardMediaFields || {
    works_in_progress_1: { included: false, required: false, verifiedCanSkip: false },
    works_in_progress_2: { included: false, required: false, verifiedCanSkip: false },
    art_1: { included: false, required: false, verifiedCanSkip: false },
    art_2: { included: false, required: false, verifiedCanSkip: false },
    art_3: { included: false, required: false, verifiedCanSkip: false },
    booth_1: { included: false, required: false, verifiedCanSkip: false },
    booth_2: { included: false, required: false, verifiedCanSkip: false }
  });

  // Available Add-ons (booth packages, etc.)
  const [availableAddons, setAvailableAddons] = useState(initialData?.availableAddons || []);

  // Event Types (loaded from API)
  const [eventTypes, setEventTypes] = useState([]);

  // Helper to determine initial section status
  const getInitialSectionStatus = () => {
    if (mode === 'create' && !isClaimedEvent) {
      return {
        basicInfo: 'pending',
        dates: 'pending',
        venue: 'pending',
        eventDetails: 'pending',
        settings: 'pending',
        applications: 'pending',
        seo: 'pending',
        images: 'pending'
      };
    }
    
    // In edit mode or claimed event, check actual data
    const hasBasicInfo = !!(initialData?.title && initialData?.event_type_id);
    const hasDates = !!(initialData?.start_date && initialData?.end_date);
    const hasVenue = !!(initialData?.venue_name || initialData?.venue_city);
    const hasSettings = true; // Always has defaults
    
    return {
      basicInfo: hasBasicInfo ? 'complete' : 'pending',
      dates: hasDates ? 'complete' : 'pending',
      venue: hasVenue ? 'complete' : 'pending',
      eventDetails: 'complete', // Optional
      settings: hasSettings ? 'complete' : 'pending',
      applications: 'complete', // Optional
      seo: 'complete', // Optional
      images: 'complete' // Optional
    };
  };

  // Section completion status
  const [sectionStatus, setSectionStatus] = useState(getInitialSectionStatus);

  // Active section
  const getInitialActiveSection = () => {
    if (mode === 'create' && !isClaimedEvent) return 'basicInfo';
    
    // For edit/claimed, find first incomplete section
    const status = getInitialSectionStatus();
    if (status.basicInfo === 'pending') return 'basicInfo';
    if (status.dates === 'pending') return 'dates';
    if (status.venue === 'pending') return 'venue';
    
    return null; // All complete, stay closed
  };

  const [activeSection, setActiveSection] = useState(getInitialActiveSection);

  // Event ID (set after first save)
  const [savedEventId, setSavedEventId] = useState(eventId || claimedEventId);

  // Loading/error states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load event data for edit mode (when eventId/claimedEventId provided but no initialData)
  useEffect(() => {
    const targetEventId = eventId || claimedEventId;
    if (targetEventId && !initialData) {
      setLoadingEvent(true);
      authApiRequest(`api/events/${targetEventId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch event');
          return res.json();
        })
        .then(eventData => {
          // Update form data with fetched event
          setFormData({
            title: eventData.title || '',
            event_type_id: eventData.event_type_id || '',
            short_description: eventData.short_description || '',
            description: eventData.description || '',
            admission_fee: eventData.admission_fee || 0,
            parking_fee: eventData.parking_fee || 0,
            start_date: eventData.start_date ? eventData.start_date.split('T')[0] : '',
            end_date: eventData.end_date ? eventData.end_date.split('T')[0] : '',
            venue_name: eventData.venue_name || '',
            venue_address: eventData.venue_address || '',
            venue_city: eventData.venue_city || '',
            venue_state: eventData.venue_state || '',
            venue_zip: eventData.venue_zip || '',
            venue_capacity: eventData.venue_capacity || '',
            parking_info: eventData.parking_info || '',
            accessibility_info: eventData.accessibility_info || '',
            age_restrictions: eventData.age_restrictions || 'all_ages',
            age_minimum: eventData.age_minimum || '',
            dress_code: eventData.dress_code || '',
            has_rsvp: eventData.has_rsvp || false,
            has_tickets: eventData.has_tickets || false,
            rsvp_url: eventData.rsvp_url || '',
            application_status: eventData.application_status || 'not_accepting',
            allow_applications: eventData.allow_applications || false,
            max_artists: eventData.max_artists || '',
            max_applications: eventData.max_applications || '',
            application_fee: eventData.application_fee || 0,
            jury_fee: eventData.jury_fee || 0,
            booth_fee: eventData.booth_fee || 0,
            application_deadline: eventData.application_deadline ? eventData.application_deadline.split('T')[0] : '',
            jury_date: eventData.jury_date ? eventData.jury_date.split('T')[0] : '',
            notification_date: eventData.notification_date ? eventData.notification_date.split('T')[0] : '',
            seo_title: eventData.seo_title || '',
            meta_description: eventData.meta_description || '',
            event_keywords: eventData.event_keywords || '',
            images: eventData.images || []
          });
          
          // Update section statuses based on loaded data
          setSectionStatus({
            basicInfo: eventData.title && eventData.event_type_id ? 'complete' : 'pending',
            dates: eventData.start_date && eventData.end_date ? 'complete' : 'pending',
            venue: eventData.venue_name || eventData.venue_city ? 'complete' : 'pending',
            eventDetails: 'complete',
            settings: 'complete',
            applications: 'complete',
            seo: 'complete',
            images: 'complete'
          });
          
          // Set active section to first incomplete
          if (!eventData.title || !eventData.event_type_id) {
            setActiveSection('basicInfo');
          } else if (!eventData.start_date || !eventData.end_date) {
            setActiveSection('dates');
          } else {
            setActiveSection(null);
          }
        })
        .catch(err => {
          setError('Failed to load event: ' + err.message);
        })
        .finally(() => {
          setLoadingEvent(false);
        });
    }
  }, [eventId, claimedEventId, initialData]);

  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Mark section as complete and move to next
  const completeSection = useCallback((sectionKey, nextSection = null) => {
    setSectionStatus(prev => ({ ...prev, [sectionKey]: 'complete' }));
    setActiveSection(nextSection);
  }, []);

  // Open a section for editing
  const openSection = useCallback((sectionKey) => {
    setActiveSection(sectionKey);
  }, []);

  // Check if we have minimum required fields
  const hasRequiredFields = useCallback(() => {
    return formData.title && formData.event_type_id && formData.start_date && formData.end_date;
  }, [formData.title, formData.event_type_id, formData.start_date, formData.end_date]);

  // Load event types
  const loadEventTypes = useCallback(async () => {
    try {
      const response = await authApiRequest('api/events/types', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data);
      }
    } catch (err) {
      // Silent fail - not critical
    }
  }, []);

  // Save draft event
  const saveDraft = useCallback(async () => {
    if (!hasRequiredFields() && !savedEventId) {
      return null; // Not enough data yet
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        event_type_id: parseInt(formData.event_type_id),
        admission_fee: parseFloat(formData.admission_fee) || 0,
        parking_fee: parseFloat(formData.parking_fee) || 0,
        application_fee: parseFloat(formData.application_fee) || 0,
        jury_fee: parseFloat(formData.jury_fee) || 0,
        booth_fee: parseFloat(formData.booth_fee) || 0,
        max_artists: formData.max_artists ? parseInt(formData.max_artists) : null,
        max_applications: formData.max_applications ? parseInt(formData.max_applications) : null
      };

      if (savedEventId) {
        // Update existing
        const res = await authApiRequest(`api/events/${savedEventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save');
        }
        return savedEventId;
      } else {
        // Create new
        const res = await authApiRequest('api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create');
        }
        const data = await res.json();
        setSavedEventId(data.id);
        return data.id;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [formData, savedEventId, hasRequiredFields]);

  // Save application fields
  const saveApplicationFields = useCallback(async (eventId) => {
    if (!formData.allow_applications) return;
    
    try {
      let displayOrder = 0;
      
      // Save custom fields
      for (const field of applicationFields) {
        await authApiRequest(`api/events/${eventId}/application-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field_type: field.field_type,
            field_name: field.field_name,
            field_description: field.field_description,
            is_required: field.is_required,
            verified_can_skip: field.verified_can_skip,
            display_order: displayOrder++
          })
        });
      }

      // Save basic fields
      const fieldLabels = {
        company_name: 'Company/Business Name',
        email: 'Email Address',
        address: 'Mailing Address',
        phone: 'Phone Number',
        artist_statement: 'Artist Statement',
        portfolio_url: 'Portfolio URL',
        additional_info: 'Additional Information',
        additional_notes: 'Additional Notes'
      };

      for (const [fieldName, config] of Object.entries(basicFields)) {
        if (config.included || fieldName === 'email') {
          let fieldType = 'text';
          if (['artist_statement', 'additional_info', 'additional_notes'].includes(fieldName)) {
            fieldType = 'textarea';
          } else if (fieldName === 'portfolio_url') {
            fieldType = 'url';
          }

          await authApiRequest(`api/events/${eventId}/application-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              field_type: fieldType,
              field_name: fieldLabels[fieldName],
              field_description: fieldName === 'portfolio_url' ? 'Auto-filled from your profile' : '',
              is_required: config.required || fieldName === 'email',
              verified_can_skip: config.verifiedCanSkip && fieldName !== 'email',
              display_order: displayOrder++,
              is_basic_field: true
            })
          });
        }
      }

      // Save media fields
      const mediaLabels = {
        works_in_progress_1: 'Works in Progress #1',
        works_in_progress_2: 'Works in Progress #2',
        art_1: 'Art Sample #1',
        art_2: 'Art Sample #2',
        art_3: 'Art Sample #3',
        booth_1: 'Booth Setup Photo #1',
        booth_2: 'Booth Setup Photo #2'
      };

      for (const [fieldName, config] of Object.entries(standardMediaFields)) {
        if (config.included) {
          await authApiRequest(`api/events/${eventId}/application-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              field_type: 'image',
              field_name: mediaLabels[fieldName],
              field_description: '',
              is_required: config.required,
              verified_can_skip: config.verifiedCanSkip,
              display_order: displayOrder++,
              is_basic_field: true
            })
          });
        }
      }
    } catch (err) {
      // Log but don't fail the whole save
    }
  }, [formData.allow_applications, applicationFields, basicFields, standardMediaFields]);

  // Save available addons
  const saveAvailableAddons = useCallback(async (eventId) => {
    if (availableAddons.length === 0) return;
    
    try {
      for (const addon of availableAddons) {
        await authApiRequest(`api/events/${eventId}/available-addons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addon_name: addon.addon_name,
            addon_description: addon.addon_description,
            addon_price: addon.addon_price,
            display_order: addon.display_order
          })
        });
      }
    } catch (err) {
      // Log but don't fail
    }
  }, [availableAddons]);

  // Publish event (save everything and redirect)
  const publishEvent = useCallback(async () => {
    setSaving(true);
    setError(null);
    
    try {
      // First save the main event data
      const eventId = await saveDraft();
      if (!eventId) {
        throw new Error('Failed to save event');
      }

      // Save application fields if applications are enabled
      await saveApplicationFields(eventId);

      // Save available addons
      await saveAvailableAddons(eventId);

      return eventId;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [saveDraft, saveApplicationFields, saveAvailableAddons]);

  // Upload images
  const uploadImages = useCallback(async (files) => {
    setSaving(true);
    try {
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('images', file);
      });

      const res = await authApiRequest('api/events/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!res.ok) throw new Error('Failed to upload images');
      
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        images: [...(Array.isArray(prev.images) ? prev.images : []), ...(Array.isArray(data.urls) ? data.urls : [])]
      }));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Check if all required sections are complete
  const isReadyToPublish = useCallback(() => {
    const required = ['basicInfo', 'dates', 'venue'];
    return required.every(key => sectionStatus[key] === 'complete');
  }, [sectionStatus]);

  // Basic field change handler
  const handleBasicFieldChange = useCallback((fieldName, checkboxType, value) => {
    setBasicFields(prev => {
      const newState = { ...prev[fieldName] };
      
      if (checkboxType === 'included') {
        newState.included = value;
        if (!value) {
          newState.required = false;
          newState.verifiedCanSkip = false;
        }
      } else if (checkboxType === 'required') {
        newState.required = value;
        if (value) newState.included = true;
        if (!value) newState.verifiedCanSkip = false;
      } else if (checkboxType === 'verifiedCanSkip') {
        newState.verifiedCanSkip = value;
        if (value) {
          newState.included = true;
          newState.required = true;
        }
      }
      
      return { ...prev, [fieldName]: newState };
    });
  }, []);

  // Media field change handler
  const handleMediaFieldChange = useCallback((fieldName, checkboxType, value) => {
    setStandardMediaFields(prev => {
      const newState = { ...prev[fieldName] };
      
      if (checkboxType === 'included') {
        newState.included = value;
        if (!value) {
          newState.required = false;
          newState.verifiedCanSkip = false;
        }
      } else if (checkboxType === 'required') {
        newState.required = value;
        if (value) newState.included = true;
        if (!value) newState.verifiedCanSkip = false;
      } else if (checkboxType === 'verifiedCanSkip') {
        newState.verifiedCanSkip = value;
        if (value) {
          newState.included = true;
          newState.required = true;
        }
      }
      
      return { ...prev, [fieldName]: newState };
    });
  }, []);

  // Add custom application field
  const addApplicationField = useCallback((field) => {
    setApplicationFields(prev => [...prev, {
      id: Date.now(),
      ...field,
      display_order: prev.length
    }]);
  }, []);

  // Remove custom application field
  const removeApplicationField = useCallback((fieldId) => {
    setApplicationFields(prev => prev.filter(f => f.id !== fieldId));
  }, []);

  // Update custom application field
  const updateApplicationField = useCallback((fieldId, fieldName, value) => {
    setApplicationFields(prev => 
      prev.map(field => 
        field.id === fieldId ? { ...field, [fieldName]: value } : field
      )
    );
  }, []);

  // Add addon
  const addAddon = useCallback((addon) => {
    setAvailableAddons(prev => [...prev, {
      id: Date.now(),
      ...addon,
      addon_price: parseFloat(addon.addon_price),
      display_order: prev.length
    }]);
  }, []);

  // Remove addon
  const removeAddon = useCallback((addonId) => {
    setAvailableAddons(prev => prev.filter(a => a.id !== addonId));
  }, []);

  // Update addon
  const updateAddon = useCallback((addonId, field, value) => {
    setAvailableAddons(prev => 
      prev.map(addon => 
        addon.id === addonId 
          ? { ...addon, [field]: field === 'addon_price' ? parseFloat(value) : value }
          : addon
      )
    );
  }, []);

  const value = {
    // Mode
    mode,
    isClaimedEvent,
    
    // Data
    formData,
    applicationFields,
    basicFields,
    standardMediaFields,
    availableAddons,
    eventTypes,
    
    // State
    sectionStatus,
    activeSection,
    savedEventId,
    saving,
    error,
    loadingEvent,
    
    // Actions
    updateField,
    updateFields,
    completeSection,
    openSection,
    setActiveSection,
    saveDraft,
    publishEvent,
    uploadImages,
    loadEventTypes,
    isReadyToPublish,
    setError,
    
    // Application field actions
    handleBasicFieldChange,
    handleMediaFieldChange,
    addApplicationField,
    removeApplicationField,
    updateApplicationField,
    setApplicationFields,
    setBasicFields,
    setStandardMediaFields,
    
    // Addon actions
    addAddon,
    removeAddon,
    updateAddon,
    setAvailableAddons,
    
    // User data
    userData
  };

  return (
    <EventFormContext.Provider value={value}>
      {children}
    </EventFormContext.Provider>
  );
}

export default EventFormContext;

