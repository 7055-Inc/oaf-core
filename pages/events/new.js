'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSmartMediaUrl } from '../../lib/config';
import Header from '../../components/Header';
import { authApiRequest } from '../../lib/apiUtils';
import styles from './styles/EventForm.module.css';

export default function NewEvent() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    event_type_id: '',

    application_status: 'not_accepting',
    allow_applications: false,
    start_date: '',
    end_date: '',
    application_deadline: '',
    jury_date: '',
    notification_date: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    venue_state: '',
    venue_zip: '',

    parking_info: '',
    accessibility_info: '',
    admission_fee: 0.00,
    parking_fee: 0.00,
    parking_details: '',
    application_fee: 0.00,
    jury_fee: 0.00,
    booth_fee: 0.00,
    max_artists: '',
    max_applications: '',
    seo_title: '',
    meta_description: '',
    event_keywords: '',
    venue_capacity: '',
    age_restrictions: 'all_ages',
    age_minimum: '',
    dress_code: '',
    has_rsvp: false,
    has_tickets: false,
    rsvp_url: '',
    images: []
  });
  
  const [eventTypes, setEventTypes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [newAddon, setNewAddon] = useState({
    addon_name: '',
    addon_description: '',
    addon_price: '',
    display_order: 0
  });

  // Application Fields Management
  const [applicationFields, setApplicationFields] = useState([]);
  const [newField, setNewField] = useState({
    field_type: 'text',
    field_name: '',
    field_description: '',
    is_required: false,
    verified_can_skip: false,
    display_order: 0
  });

  // Basic Fields Management (separate checkboxes)
  const [basicFields, setBasicFields] = useState({
    company_name: { included: true, required: false, verifiedCanSkip: false }, // Default included
    email: { included: true, required: true, verifiedCanSkip: false }, // Email always required
    address: { included: false, required: false, verifiedCanSkip: false },
    phone: { included: false, required: false, verifiedCanSkip: false },
    // Default application fields that were hardcoded
    artist_statement: { included: true, required: true, verifiedCanSkip: true }, // Required but verified can skip
    portfolio_url: { included: true, required: false, verifiedCanSkip: false }, // Auto-filled, not editable
    additional_info: { included: true, required: false, verifiedCanSkip: false },
    additional_notes: { included: true, required: false, verifiedCanSkip: false }
  });

  // Standard Media Fields Management (separate checkboxes)
  const [standardMediaFields, setStandardMediaFields] = useState({
    works_in_progress_1: { included: false, required: false, verifiedCanSkip: false },
    works_in_progress_2: { included: false, required: false, verifiedCanSkip: false },
    art_1: { included: false, required: false, verifiedCanSkip: false },
    art_2: { included: false, required: false, verifiedCanSkip: false },
    art_3: { included: false, required: false, verifiedCanSkip: false },
    booth_1: { included: false, required: false, verifiedCanSkip: false },
    booth_2: { included: false, required: false, verifiedCanSkip: false }
  });
  const router = useRouter();

  useEffect(() => {
    // Check authentication and user type
    const token = document.cookie.split('token=')[1]?.split(';')[0];
    if (!token) {
      router.push('/login');
      return;
    }

    // Get user info from JWT token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userRoles = payload.roles || [];

    // Fetch user data for profile information
    authApiRequest('users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch user data');
      return res.json();
    })
    .then(data => {
      // Check if user is promoter or admin
      const isPromoter = data.user_type === 'promoter';
      const isAdmin = data.user_type === 'admin';
      
      if (!isPromoter && !isAdmin) {
        setError('Access denied. Only promoters and admins can create events.');
        return;
      }
      
      setUserData({ 
        ...data, 
        roles: userRoles 
      });
    })
    .catch(err => {
      setError(err.message);
    });

    // Fetch event types
    fetchEventTypes();
  }, [router]);

  const fetchEventTypes = async () => {
    try {
      const response = await authApiRequest('api/events/types', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch event types:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddonChange = (e) => {
    const { name, value } = e.target;
    setNewAddon(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addAddon = () => {
    if (!newAddon.addon_name || !newAddon.addon_price) {
      setError('Add-on name and price are required');
      return;
    }

    const addon = {
      id: Date.now(), // Temporary ID for new events
      ...newAddon,
      addon_price: parseFloat(newAddon.addon_price),
      display_order: availableAddons.length
    };

    setAvailableAddons(prev => [...prev, addon]);
    setNewAddon({
      addon_name: '',
      addon_description: '',
      addon_price: '',
      display_order: 0
    });
  };

  const removeAddon = (addonId) => {
    setAvailableAddons(prev => prev.filter(addon => addon.id !== addonId));
  };

  const updateAddon = (addonId, field, value) => {
    setAvailableAddons(prev => 
      prev.map(addon => 
        addon.id === addonId 
          ? { ...addon, [field]: field === 'addon_price' ? parseFloat(value) : value }
          : addon
      )
    );
  };

  // Application Fields Management Functions
  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addField = () => {
    if (!newField.field_name.trim()) {
      setError('Field name is required');
      return;
    }

    const field = {
      id: Date.now(), // Temporary ID for new events
      ...newField,
      display_order: applicationFields.length
    };

    setApplicationFields(prev => [...prev, field]);
    setNewField({
      field_type: 'text',
      field_name: '',
      field_description: '',
      is_required: false,
      verified_can_skip: false,
      display_order: 0
    });
  };

  const removeField = (fieldId) => {
    setApplicationFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const updateField = (fieldId, fieldName, value) => {
    setApplicationFields(prev => 
      prev.map(field => 
        field.id === fieldId 
          ? { ...field, [fieldName]: value }
          : field
      )
    );
  };

  // Basic Fields Checkbox Handlers
  const handleBasicFieldChange = (fieldName, checkboxType, value) => {
    setBasicFields(prev => {
      const newState = { ...prev[fieldName] };
      
      if (checkboxType === 'included') {
        newState.included = value;
        // If unchecking included, also uncheck required and verified skip
        if (!value) {
          newState.required = false;
          newState.verifiedCanSkip = false;
        }
      } else if (checkboxType === 'required') {
        newState.required = value;
        // If checking required, ensure included is also checked
        if (value) {
          newState.included = true;
        }
        // If unchecking required, also uncheck verified skip
        if (!value) {
          newState.verifiedCanSkip = false;
        }
      } else if (checkboxType === 'verifiedCanSkip') {
        newState.verifiedCanSkip = value;
        // If checking verified skip, ensure required and included are also checked
        if (value) {
          newState.included = true;
          newState.required = true;
        }
      }
      
      return { ...prev, [fieldName]: newState };
    });
  };

  // Standard Media Fields Checkbox Handlers
  const handleMediaFieldChange = (fieldName, checkboxType, value) => {
    setStandardMediaFields(prev => {
      const newState = { ...prev[fieldName] };
      
      if (checkboxType === 'included') {
        newState.included = value;
        // If unchecking included, also uncheck required and verified skip
        if (!value) {
          newState.required = false;
          newState.verifiedCanSkip = false;
        }
      } else if (checkboxType === 'required') {
        newState.required = value;
        // If checking required, ensure included is also checked
        if (value) {
          newState.included = true;
        }
        // If unchecking required, also uncheck verified skip
        if (!value) {
          newState.verifiedCanSkip = false;
        }
      } else if (checkboxType === 'verifiedCanSkip') {
        newState.verifiedCanSkip = value;
        // If checking verified skip, ensure required and included are also checked
        if (value) {
          newState.included = true;
          newState.required = true;
        }
      }
      
      return { ...prev, [fieldName]: newState };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      
      // Prepare payload with proper data types
      const payload = {
        ...formData,
        event_type_id: parseInt(formData.event_type_id),
        admission_fee: parseFloat(formData.admission_fee) || 0.00,
        parking_fee: parseFloat(formData.parking_fee) || 0.00,
        application_fee: parseFloat(formData.application_fee) || 0.00,
        jury_fee: parseFloat(formData.jury_fee) || 0.00,
        booth_fee: parseFloat(formData.booth_fee) || 0.00,
        max_artists: formData.max_artists ? parseInt(formData.max_artists) : null,
        max_applications: formData.max_applications ? parseInt(formData.max_applications) : null
      };

      const res = await authApiRequest('api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create event');
      }
      
      const result = await res.json();
      
      // Save add-ons if any were defined
      if (availableAddons.length > 0) {
        try {
          for (const addon of availableAddons) {
            await authApiRequest(`api/events/${result.id}/available-addons`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                addon_name: addon.addon_name,
                addon_description: addon.addon_description,
                addon_price: addon.addon_price,
                display_order: addon.display_order
              })
            });
          }
        } catch (addonError) {
          console.error('Failed to save add-ons:', addonError);
          // Continue with redirect even if add-ons fail
        }
      }

      // Save application fields if any were defined
      if (applicationFields.length > 0) {
        try {
          for (const field of applicationFields) {
            await authApiRequest(`api/events/${result.id}/application-fields`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                field_type: field.field_type,
                field_name: field.field_name,
                field_description: field.field_description,
                is_required: field.is_required,
                verified_can_skip: field.verified_can_skip,
                display_order: field.display_order
              })
            });
          }
        } catch (fieldError) {
          console.error('Failed to save application fields:', fieldError);
          // Continue with redirect even if fields fail
        }
      }

      // Save basic fields configuration if applications are enabled
      if (formData.allow_applications) {
        try {
          let displayOrder = applicationFields.length; // Continue numbering after custom fields
          
          // Save basic text fields
          for (const [fieldName, config] of Object.entries(basicFields)) {
            if (config.included || fieldName === 'email') { // Always save email since it's always required
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

              // Determine field type based on field name
              let fieldType = 'text';
              if (['artist_statement', 'additional_info', 'additional_notes'].includes(fieldName)) {
                fieldType = 'textarea';
              } else if (fieldName === 'portfolio_url') {
                fieldType = 'url';
              }

              await authApiRequest(`api/events/${result.id}/application-fields`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  field_type: fieldType,
                  field_name: fieldLabels[fieldName],
                  field_description: fieldName === 'portfolio_url' ? 'Auto-filled from your profile - not editable during application' : '',
                  is_required: config.required || fieldName === 'email',
                  verified_can_skip: config.verifiedCanSkip && fieldName !== 'email', // Use the checkbox value (except email)
                  display_order: displayOrder++,
                  is_basic_field: true // Mark as basic field for future reference
                })
              });
            }
          }

          // Save standard media fields
          for (const [fieldName, config] of Object.entries(standardMediaFields)) {
            if (config.included) {
              const fieldLabels = {
                works_in_progress_1: 'Works in Progress #1',
                works_in_progress_2: 'Works in Progress #2',
                art_1: 'Art Sample #1',
                art_2: 'Art Sample #2',
                art_3: 'Art Sample #3',
                booth_1: 'Booth Setup Photo #1',
                booth_2: 'Booth Setup Photo #2'
              };

              await authApiRequest(`api/events/${result.id}/application-fields`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  field_type: 'image', // All standard media fields are image uploads
                  field_name: fieldLabels[fieldName],
                  field_description: '',
                  is_required: config.required,
                  verified_can_skip: config.verifiedCanSkip, // Use the checkbox value
                  display_order: displayOrder++,
                  is_basic_field: true // Mark as basic field for future reference
                })
              });
            }
          }
        } catch (basicFieldError) {
          console.error('Failed to save basic fields:', basicFieldError);
          // Continue with redirect even if basic fields fail
        }
      }
      
      router.push(`/events/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
        <div className={styles.content}>
          <h1>Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (userData.user_type !== 'promoter' && userData.user_type !== 'admin') {
    return (
      <div>
        <Header />
        <div className={styles.container}>
        <div className={styles.content}>
          <h1>Access Denied</h1>
            <p>Only promoters and admins can create events.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={styles.container}>
      <div className={styles.content}>
        <h1>Create New Event</h1>
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            {/* Basic Information */}
            <div className={styles.formSection}>
              <h2>Basic Information</h2>
              
              <div className={styles.formGroup}>
                <label>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="e.g. Springfield Art Festival 2024"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Event Type *</label>
                <select
                  name="event_type_id"
                  value={formData.event_type_id}
                  onChange={handleChange}
                  required
                  className={styles.select}
                >
                  <option value="">Select Event Type</option>
                  {eventTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Short Description</label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength={200}
                  placeholder="Brief description for listings (200 characters max)"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Full Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows="5"
                  placeholder="Detailed event description, requirements, and information"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Admission Fee (for attendees)</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.currency}>$</span>
                    <input
                      type="number"
                      name="admission_fee"
                      value={formData.admission_fee}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Parking Fee</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.currency}>$</span>
                    <input
                      type="number"
                      name="parking_fee"
                      value={formData.parking_fee}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Event Dates */}
            <div className={styles.formSection}>
              <h2>Event Dates</h2>
              
              <div className={styles.formGroup}>
                <label>Start Date *</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>End Date *</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>


            </div>

            {/* Venue Information */}
            <div className={styles.formSection}>
              <h2>Venue Information</h2>
              
              <div className={styles.formGroup}>
                <label>Venue Name</label>
                <input
                  type="text"
                  name="venue_name"
                  value={formData.venue_name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. Central Park, Downtown Gallery"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  name="venue_address"
                  value={formData.venue_address}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Street address"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    type="text"
                    name="venue_city"
                    value={formData.venue_city}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>State</label>
                  <input
                    type="text"
                    name="venue_state"
                    value={formData.venue_state}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="e.g. IL, CA, NY"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    name="venue_zip"
                    value={formData.venue_zip}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Venue Capacity</label>
                  <input
                    type="number"
                    name="venue_capacity"
                    value={formData.venue_capacity}
                    onChange={handleChange}
                    className={styles.input}
                    min="1"
                    placeholder="Expected number of attendees"
                  />
                  <div className={styles.fieldHelp}>
                    Estimated total capacity for your event (helps with planning and promotion)
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Parking Information</label>
                <textarea
                  name="parking_info"
                  value={formData.parking_info}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Parking availability, restrictions, cost, etc."
                />
              </div>

              <div className={styles.formGroup}>
                <label>Accessibility Information</label>
                <textarea
                  name="accessibility_info"
                  value={formData.accessibility_info}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Wheelchair access, special accommodations, etc."
                />
              </div>
            </div>

            {/* Event Details */}
            <div className={styles.formSection}>
              <h2>Event Details</h2>
              <p className={styles.helpText}>
                Additional information to help attendees prepare for your event.
              </p>
              
              <div className={styles.formGroup}>
                <label>Age Restrictions</label>
                <select
                  name="age_restrictions"
                  value={formData.age_restrictions}
                    onChange={handleChange}
                    className={styles.input}
                >
                  <option value="all_ages">All Ages Welcome</option>
                  <option value="18+">18 and Over</option>
                  <option value="21+">21 and Over</option>
                  <option value="custom">Custom Age Minimum</option>
                </select>
              </div>

              {formData.age_restrictions === 'custom' && (
              <div className={styles.formGroup}>
                  <label>Minimum Age</label>
                  <input
                    type="number"
                    name="age_minimum"
                    value={formData.age_minimum}
                    onChange={handleChange}
                    className={styles.input}
                    min="1"
                    max="99"
                    placeholder="Enter minimum age"
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Dress Code</label>
                <textarea
                  name="dress_code"
                  value={formData.dress_code}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows="2"
                  placeholder="Casual, business casual, formal, costume encouraged, etc."
                />
                <div className={styles.fieldHelp}>
                  Let attendees know what to wear to your event
                </div>
              </div>

              <div className={styles.formRow}>
              <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                  <input
                      type="checkbox"
                      name="has_rsvp"
                      checked={formData.has_rsvp}
                    onChange={handleChange}
                  />
                    <span>Requires RSVP</span>
                  </label>
                  <div className={styles.fieldHelp}>
                    Attendees must RSVP before attending
                </div>
              </div>

              <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                  <input
                      type="checkbox"
                      name="has_tickets"
                      checked={formData.has_tickets}
                    onChange={handleChange}
                  />
                    <span>Ticket Sales</span>
                  </label>
                  <div className={styles.fieldHelp}>
                    Event requires paid tickets
                  </div>
                </div>
              </div>

              {formData.has_rsvp && (
              <div className={styles.formGroup}>
                  <label>RSVP Link</label>
                  <input
                    type="url"
                    name="rsvp_url"
                    value={formData.rsvp_url}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="https://eventbrite.com/your-event"
                  />
                  <div className={styles.fieldHelp}>
                    Link where people can RSVP for your event
                </div>
              </div>
              )}
            </div>

            {/* Event Settings */}
            <div className={styles.formSection}>
              <h2>Event Settings</h2>

              <div className={styles.formGroup}>
                <label>Application Status</label>
                <select
                  name="application_status"
                  value={formData.application_status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="not_accepting">Not Accepting Applications</option>
                  <option value="accepting">Accepting Applications</option>
                  <option value="closed">Applications Closed</option>
                  <option value="jurying">In Jury Review</option>
                  <option value="artists_announced">Artists Announced</option>
                  <option value="event_completed">Event Completed</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="allow_applications"
                    checked={formData.allow_applications}
                    onChange={handleChange}
                    className={styles.checkbox}
                  />
                  Allow Artists to Apply Online
                </label>
              </div>

              <div className={styles.formGroup}>
                <label>Maximum Artists</label>
                <input
                  type="number"
                  name="max_artists"
                  value={formData.max_artists}
                  onChange={handleChange}
                  min="1"
                  className={styles.input}
                  placeholder="Leave blank for unlimited"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Maximum Applications</label>
                <input
                  type="number"
                  name="max_applications"
                  value={formData.max_applications}
                  onChange={handleChange}
                  min="1"
                  className={styles.input}
                  placeholder="Leave blank for unlimited"
                />
              </div>
            </div>

            {/* Application Requirements - Only show if applications allowed */}
            {formData.allow_applications && (
            <div className={styles.formSection}>
                <h2>Application Requirements</h2>
                <p className={styles.helpText}>
                  Configure the complete application process: fees, timeline, and what information/materials you want from artists.
                </p>
              
                {/* Application Fees and Deadline */}
                <div className={styles.formRow}>
              <div className={styles.formGroup}>
                    <label>Application Fee</label>
                    <div className={styles.inputGroup}>
                      <span className={styles.currency}>$</span>
                      <input
                        type="number"
                        name="application_fee"
                        value={formData.application_fee}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={styles.input}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Jury Fee</label>
                    <div className={styles.inputGroup}>
                      <span className={styles.currency}>$</span>
                      <input
                        type="number"
                        name="jury_fee"
                        value={formData.jury_fee}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={styles.input}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Booth Fee</label>
                    <div className={styles.inputGroup}>
                      <span className={styles.currency}>$</span>
                      <input
                        type="number"
                        name="booth_fee"
                        value={formData.booth_fee}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Application Process Timeline */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Application Deadline</label>
                    <input
                      type="date"
                      name="application_deadline"
                      value={formData.application_deadline}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Jury Date</label>
                    <input
                      type="date"
                      name="jury_date"
                      value={formData.jury_date}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Artist Notification Date</label>
                    <input
                      type="date"
                      name="notification_date"
                      value={formData.notification_date}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                
                {/* Basic Application Fields */}
                <div className={styles.formGroup}>
                  <label>Basic Application Fields</label>
                  <p className={styles.helpText}>
                    Name, Artist Statement, Portfolio URL, and Additional Notes are always included. Configure additional basic fields below:
                  </p>
                  <div className={styles.basicFieldsGrid}>
                    {Object.entries(basicFields).map(([fieldName, state]) => {
                      const fieldLabels = {
                        company_name: 'Company/Business Name',
                        email: 'Email Address', 
                        address: 'Mailing Address',
                        phone: 'Phone Number',
                        artist_statement: 'Artist Statement',
                        portfolio_url: 'Portfolio URL (Auto-filled from Profile)', 
                        additional_info: 'Additional Information',
                        additional_notes: 'Additional Notes'
                      };
                      
                      return (
                        <div key={fieldName} className={styles.basicFieldItem}>
                          <div className={styles.fieldHeader}>
                            <strong>{fieldLabels[fieldName]}</strong>
                            {fieldName === 'email' && <span className={styles.alwaysRequired}>(Always Required)</span>}
                          </div>
                          
                          <div className={styles.checkboxGroup}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={state.included}
                                onChange={(e) => handleBasicFieldChange(fieldName, 'included', e.target.checked)}
                                disabled={fieldName === 'email'}
                                className={styles.checkbox}
                              />
                              Include field
                            </label>
                            
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={state.required}
                                onChange={(e) => handleBasicFieldChange(fieldName, 'required', e.target.checked)}
                                disabled={fieldName === 'email' || !state.included}
                                className={styles.checkbox}
                              />
                              Required
                            </label>
                            
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={state.verifiedCanSkip}
                                onChange={(e) => handleBasicFieldChange(fieldName, 'verifiedCanSkip', e.target.checked)}
                                disabled={fieldName === 'email' || !state.included || !state.required}
                                className={styles.checkbox}
                              />
                              Verified artists may skip
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Standard Media Fields - Three State System */}
                <div className={styles.formGroup}>
                  <label>Standard Media Fields</label>
                  <p className={styles.helpText}>
                    Configure which image/video uploads you want to request from artists.
                  </p>
                  <div className={styles.basicFieldsGrid}>
                    {Object.entries(standardMediaFields).map(([fieldName, state]) => {
                      const fieldLabels = {
                        works_in_progress_1: 'Works in Progress #1',
                        works_in_progress_2: 'Works in Progress #2',
                        art_1: 'Art Sample #1',
                        art_2: 'Art Sample #2',
                        art_3: 'Art Sample #3',
                        booth_1: 'Booth Setup Photo #1',
                        booth_2: 'Booth Setup Photo #2'
                      };
                      
                      return (
                        <div key={fieldName} className={styles.basicFieldItem}>
                          <div className={styles.fieldHeader}>
                            <strong>{fieldLabels[fieldName]}</strong>
                          </div>
                          
                          <div className={styles.checkboxGroup}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={state.included}
                                onChange={(e) => handleMediaFieldChange(fieldName, 'included', e.target.checked)}
                                className={styles.checkbox}
                              />
                              Include field
                            </label>
                            
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={state.required}
                                onChange={(e) => handleMediaFieldChange(fieldName, 'required', e.target.checked)}
                                disabled={!state.included}
                                className={styles.checkbox}
                              />
                              Required
                            </label>
                            
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={state.verifiedCanSkip}
                                onChange={(e) => handleMediaFieldChange(fieldName, 'verifiedCanSkip', e.target.checked)}
                                disabled={!state.included || !state.required}
                                className={styles.checkbox}
                              />
                              Verified artists may skip
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              {/* Current Application Fields */}
              {applicationFields.length > 0 && (
                <div className={styles.fieldsList}>
                  <h4>Custom Fields</h4>
                  {applicationFields.map(field => (
                    <div key={field.id} className={styles.fieldItem}>
                      <div className={styles.fieldHeader}>
                        <select
                          value={field.field_type}
                          onChange={(e) => updateField(field.id, 'field_type', e.target.value)}
                          className={styles.fieldTypeSelect}
                        >
                          <option value="text">Text Field</option>
                          <option value="image">Image Upload</option>
                          <option value="video">Video Upload</option>
                        </select>
                        <input
                          type="text"
                          value={field.field_name}
                          onChange={(e) => updateField(field.id, 'field_name', e.target.value)}
                          placeholder="Field name (e.g., Work in Progress Photos)"
                          className={styles.fieldInput}
                        />
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="secondary"
                        >
                          Remove
                        </button>
                      </div>
                      <div className={styles.fieldOptions}>
                        <input
                          type="text"
                          value={field.field_description || ''}
                          onChange={(e) => updateField(field.id, 'field_description', e.target.value)}
                          placeholder="Description (optional)"
                          className={styles.fieldDescInput}
                        />
                        <div className={styles.fieldCheckboxes}>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(e) => updateField(field.id, 'is_required', e.target.checked)}
                              className={styles.checkbox}
                            />
                            Required Field
                          </label>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={field.verified_can_skip}
                              onChange={(e) => updateField(field.id, 'verified_can_skip', e.target.checked)}
                              className={styles.checkbox}
                            />
                            Verified Artists Can Skip
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Field */}
              <div className={styles.newFieldForm}>
                <h4>Add New Field</h4>
                <div className={styles.fieldInputRow}>
                  <select
                    name="field_type"
                    value={newField.field_type}
                    onChange={handleFieldChange}
                    className={styles.fieldTypeSelect}
                  >
                    <option value="text">Text Field</option>
                    <option value="image">Image Upload</option>
                    <option value="video">Video Upload</option>
                  </select>
                  <input
                    type="text"
                    name="field_name"
                    value={newField.field_name}
                    onChange={handleFieldChange}
                    placeholder="Field name (e.g., Business License)"
                    className={styles.fieldInput}
                  />
                  <input
                    type="text"
                    name="field_description"
                    value={newField.field_description}
                    onChange={handleFieldChange}
                    placeholder="Description (optional)"
                    className={styles.fieldDescInput}
                  />
                </div>
                <div className={styles.fieldOptionsRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_required"
                      checked={newField.is_required}
                      onChange={handleFieldChange}
                      className={styles.checkbox}
                    />
                    Required Field
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="verified_can_skip"
                      checked={newField.verified_can_skip}
                      onChange={handleFieldChange}
                      className={styles.checkbox}
                    />
                    Verified Artists Can Skip
                  </label>
                  <button
                    type="button"
                    onClick={addField}
                  >
                    Add Field
                  </button>
                </div>
              </div>

              {/* Add-ons Management - Booth Package Options */}
              <div className={styles.formGroup}>
                <label>Booth Package Add-ons</label>
                <p className={styles.helpText}>
                  Define add-ons that artists can request as part of their booth package during application (Corner Booth, Extra Booth, Tent Rental, etc.)
                </p>
                
                {/* Current Add-ons */}
                {availableAddons.length > 0 && (
                  <div className={styles.addonsList}>
                    {availableAddons.map(addon => (
                      <div key={addon.id} className={styles.addonItem}>
                        <input
                          type="text"
                          value={addon.addon_name}
                          onChange={(e) => updateAddon(addon.id, 'addon_name', e.target.value)}
                          placeholder="Add-on name"
                          className={styles.addonInput}
                        />
                        <input
                          type="text"
                          value={addon.addon_description}
                          onChange={(e) => updateAddon(addon.id, 'addon_description', e.target.value)}
                          placeholder="Description (optional)"
                          className={styles.addonDescInput}
                        />
                        <div className={styles.inputGroup}>
                          <span className={styles.currency}>$</span>
                          <input
                            type="number"
                            value={addon.addon_price}
                            onChange={(e) => updateAddon(addon.id, 'addon_price', parseFloat(e.target.value))}
                            step="0.01"
                            min="0"
                            placeholder="Price"
                            className={styles.addonPriceInput}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAddon(addon.id)}
                          className="secondary"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new Add-on */}
                <div className={styles.newAddonForm}>
                  <h4>Add New Add-on</h4>
                  <div className={styles.addonInputRow}>
                    <input
                      type="text"
                      name="addon_name"
                      value={newAddon.addon_name}
                      onChange={handleAddonChange}
                      placeholder="Add-on name (e.g., Corner Booth)"
                      className={styles.addonInput}
                    />
                    <input
                      type="text"
                      name="addon_description"
                      value={newAddon.addon_description}
                      onChange={handleAddonChange}
                      placeholder="Description (optional)"
                      className={styles.addonInput}
                    />
                    <div className={styles.inputGroup}>
                      <span className={styles.currency}>$</span>
                      <input
                        type="number"
                        name="addon_price"
                        value={newAddon.addon_price}
                        onChange={handleAddonChange}
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        className={styles.addonPriceInput}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addAddon}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* SEO & Discoverability */}
            <div className={styles.formSection}>
              <h2>SEO & Discoverability</h2>
              <p className={styles.helpText}>
                Optimize how your event appears in search engines and help people find your event online.
              </p>
              
              <div className={styles.formGroup}>
                <label>Title for Search Engines</label>
                <input
                  type="text"
                  name="seo_title"
                  value={formData.seo_title}
                  onChange={handleChange}
                  className={styles.input}
                  maxLength="60"
                  placeholder="Leave blank to use event title (60 characters max)"
                />
                <div className={styles.fieldHelp}>
                  Custom title shown in Google search results. Leave blank to use your event title.
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Search Results Snippet</label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength="160"
                  rows="3"
                  placeholder="Brief description shown in search results (160 characters max)"
                />
                <div className={styles.fieldHelp}>
                  Description that appears under your event title in search results. Leave blank to use event description.
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Event Keywords</label>
                <textarea
                  name="event_keywords"
                  value={formData.event_keywords}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows="2"
                  placeholder="art festival, outdoor market, local artists, craft fair, family friendly"
                />
                <div className={styles.fieldHelp}>
                  Keywords that describe your event, separated by commas. Helps people find your event when searching.
                </div>
              </div>
            </div>

            {/* Event Images */}
            <div className={styles.formSection}>
              <h2>Event Images</h2>
              <div className={styles.fieldHelp} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e8f5f3', border: '1px solid #055474', borderRadius: '8px' }}>
                <strong>💡 SEO Tip:</strong> Upload 5-10 high-quality images for better search engine performance! Multiple images create rich snippets, improve user engagement, and boost your event's visibility in search results.
              </div>
              <div className={styles.imageUpload}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className={styles.fileInput}
                />
                <div className={styles.uploadButton}>
                  {loading ? 'Uploading...' : 'Upload Images'}
                </div>
              </div>
              
              {formData.images.length > 0 && (
                <div className={styles.imagePreview}>
                  {formData.images.map((url, index) => (
                    <div key={index} className={styles.imageThumbnail}>
                      <img src={getSmartMediaUrl(url)} alt={`Event ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <div className={styles.actionButtons}>
              <button 
                type="button" 
                onClick={() => router.back()}
                className="secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Creating Event...' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
} 