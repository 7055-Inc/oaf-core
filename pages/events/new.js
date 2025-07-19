'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { authenticatedApiRequest } from '../../lib/csrf';
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
    fetch('https://api2.onlineartfestival.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
      const token = document.cookie.split('token=')[1]?.split(';')[0];
              const response = await fetch('https://api2.onlineartfestival.com/api/events/types', {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);
    try {
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('images', file);
      });

      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/events/upload', {
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

      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/events', {
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
            await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/events/${result.id}/available-addons`, {
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
            await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/events/${result.id}/application-fields`, {
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
      
      router.push(`/dashboard?section=event-management`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.content}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (userData.user_type !== 'promoter' && userData.user_type !== 'admin') {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.content}>
          <h1>Access Denied</h1>
          <p>Only promoters and admins can create events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>
        <h1 className={styles.title}>Create New Event</h1>
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

            {/* Fees & Pricing */}
            <div className={styles.formSection}>
              <h2>Fees & Pricing</h2>
              
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

              <div className={styles.formGroup}>
                <label>Artist Application Fee</label>
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

              {/* Add-ons Management */}
              <div className={styles.formGroup}>
                <label>Available Add-ons</label>
                <p className={styles.helpText}>
                  Define add-ons that artists can request during application (Corner Booth, Extra Booth, Tent Rental, etc.)
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
                          className={styles.addonInput}
                        />
                        <div className={styles.inputGroup}>
                          <span className={styles.currency}>$</span>
                          <input
                            type="number"
                            value={addon.addon_price}
                            onChange={(e) => updateAddon(addon.id, 'addon_price', e.target.value)}
                            step="0.01"
                            min="0"
                            placeholder="Price"
                            className={styles.addonPriceInput}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAddon(addon.id)}
                          className={styles.removeAddonBtn}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Add-on */}
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
                      className={styles.addAddonBtn}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Fields Management */}
            <div className={styles.formSection}>
              <h2>Application Requirements</h2>
              <p className={styles.helpText}>
                Customize what information and materials you want from artists when they apply to your event.
              </p>
              
              {/* Standard Fields (Pre-checked) */}
              <div className={styles.formGroup}>
                <label>Standard Application Fields</label>
                <p className={styles.helpText}>
                  These common fields are always available (Name, Email, Artist Statement, Portfolio URL, Additional Notes).
                </p>
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
                          className={styles.removeFieldBtn}
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
                    className={styles.addFieldBtn}
                  >
                    Add Field
                  </button>
                </div>
              </div>
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

            {/* SEO Settings - Admin Only */}
            {userData.user_type === 'admin' && (
              <div className={styles.formSection}>
                <h2>SEO Settings</h2>
                
                <div className={styles.formGroup}>
                  <label>SEO Title</label>
                  <input
                    type="text"
                    name="seo_title"
                    value={formData.seo_title}
                    onChange={handleChange}
                    className={styles.input}
                    maxLength="60"
                    placeholder="Custom title for search engines (60 chars max)"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Meta Description</label>
                  <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleChange}
                    className={styles.textarea}
                    maxLength="160"
                    placeholder="Description for search engines (160 chars max)"
                  />
                </div>
              </div>
            )}

            {/* Event Images */}
            <div className={styles.formSection}>
              <h2>Event Images</h2>
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
                      <img src={`https://api2.onlineartfestival.com${url}`} alt={`Event ${index + 1}`} />
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
                className={styles.secondaryButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Creating Event...' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 