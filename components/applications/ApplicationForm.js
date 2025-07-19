import { useState, useEffect } from 'react';
import styles from './ApplicationForm.module.css';

export default function ApplicationForm({ event, user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    // Keep these for legacy support, but they'll be populated from dynamic fields
    artist_statement: '',
    portfolio_url: '',
    additional_info: '',
    additional_notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applicationStats, setApplicationStats] = useState(null);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [applicationFields, setApplicationFields] = useState([]);
  const [fieldResponses, setFieldResponses] = useState({});
  const [juryPackets, setJuryPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [showPacketOptions, setShowPacketOptions] = useState(false);
  const [showSavePacketForm, setShowSavePacketForm] = useState(false);
  const [packetName, setPacketName] = useState('');
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  // Fetch application stats and available add-ons when component loads
  useEffect(() => {
    if (event?.id) {
      // Fetch application stats
      fetch(`https://api2.onlineartfestival.com/api/applications/events/${event.id}/stats`)
        .then(res => res.json())
        .then(data => setApplicationStats(data.stats))
        .catch(err => console.error('Error fetching application stats:', err));

      // Fetch available add-ons
      fetch(`https://api2.onlineartfestival.com/api/events/${event.id}/available-addons`)
        .then(res => res.json())
        .then(data => setAvailableAddons(data))
        .catch(err => console.error('Error fetching available add-ons:', err));

      // Fetch custom application fields
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`https://api2.onlineartfestival.com/api/events/${event.id}/application-fields`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(res => res.json())
        .then(data => setApplicationFields(data))
        .catch(err => console.error('Error fetching application fields:', err));

      // Fetch jury packets
      fetch('https://api2.onlineartfestival.com/api/jury-packets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        setJuryPackets(data);
        if (data.length > 0) {
          setShowPacketOptions(true);
        }
      })
      .catch(err => console.error('Error fetching jury packets:', err));

      // Fetch personas
      fetch('https://api2.onlineartfestival.com/api/personas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        setPersonas(data);
        // Set default persona if available
        const defaultPersona = data.find(p => p.is_default);
        if (defaultPersona) {
          setSelectedPersona(defaultPersona);
        }
      })
      .catch(err => console.error('Error fetching personas:', err));

      // Check user's verification status
      fetch('https://api2.onlineartfestival.com/api/verification/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        setIsVerified(data.verification_status?.is_verified || false);
      })
      .catch(err => console.error('Error fetching verification status:', err));
      }
    }
  }, [event?.id]);

  // Auto-fill portfolio URL with on-site profile links
  useEffect(() => {
    if (user) {
      // Default to artist profile page
      const portfolioUrl = `/artist/${user.id}`;
      setFormData(prev => ({
        ...prev,
        portfolio_url: portfolioUrl
      }));
    }
  }, [user]);

  // Update portfolio URL when persona is selected via jury packet
  useEffect(() => {
    if (selectedPersona) {
      const portfolioUrl = `/persona/${selectedPersona.id}`;
      setFormData(prev => ({
        ...prev,
        portfolio_url: portfolioUrl
      }));
    } else if (user && !selectedPacket) {
      // Reset to artist profile if no persona selected
      const portfolioUrl = `/artist/${user.id}`;
      setFormData(prev => ({
        ...prev,
        portfolio_url: portfolioUrl
      }));
    }
  }, [selectedPersona, user, selectedPacket]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFieldResponse = (fieldId, value, file = null) => {
    setFieldResponses(prev => ({
      ...prev,
      [fieldId]: {
        response_value: file ? null : value,
        file_url: file ? file : null
      }
    }));
  };

  const handlePacketSelect = async (packet) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get full packet details
      const response = await fetch(`https://api2.onlineartfestival.com/api/jury-packets/${packet.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load packet');
      }

      const fullPacket = await response.json();
      const packetData = JSON.parse(fullPacket.packet_data || '{}');

      // Pre-fill form with packet data
      setFormData(prev => ({
        ...prev,
        artist_statement: packetData.artist_statement || '',
        portfolio_url: packetData.portfolio_url || '',
        additional_info: formData.additional_info, // Keep any user-entered data
        additional_notes: formData.additional_notes
      }));

      // Pre-fill field responses
      if (packetData.field_responses) {
        setFieldResponses(packetData.field_responses);
      }

      // Set persona if packet has one
      if (fullPacket.persona_id) {
        const packetPersona = personas.find(p => p.id === fullPacket.persona_id);
        if (packetPersona) {
          setSelectedPersona(packetPersona);
        }
      }

      setSelectedPacket(fullPacket);
      setShowPacketOptions(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWithPacket = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to submit an application');
      }

      const response = await fetch('https://api2.onlineartfestival.com/api/applications/apply-with-packet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_id: event.id,
          packet_id: selectedPacket.id,
          additional_info: formData.additional_info,
          additional_notes: formData.additional_notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      const result = await response.json();
      
      if (onSubmit) {
        onSubmit(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsPacket = async () => {
    try {
      if (!packetName.trim()) {
        setError('Packet name is required');
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');

      const packetData = {
        artist_statement: formData.artist_statement,
        portfolio_url: formData.portfolio_url,
        field_responses: fieldResponses
      };

      const response = await fetch('https://api2.onlineartfestival.com/api/jury-packets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packet_name: packetName.trim(),
          packet_data: packetData,
          photos_data: [],
          persona_id: selectedPersona?.id || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save packet');
      }

      // Refresh packets list
      const packetsResponse = await fetch('https://api2.onlineartfestival.com/api/jury-packets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (packetsResponse.ok) {
        const packetsData = await packetsResponse.json();
        setJuryPackets(packetsData);
      }

      setShowSavePacketForm(false);
      setPacketName('');
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleAddonToggle = (addonId, requested) => {
    setSelectedAddons(prev => {
      const existing = prev.find(addon => addon.available_addon_id === addonId);
      if (existing) {
        // Update existing selection
        return prev.map(addon =>
          addon.available_addon_id === addonId
            ? { ...addon, requested }
            : addon
        );
      } else {
        // Add new selection
        return [...prev, { available_addon_id: addonId, requested, priority: 0, notes: '' }];
      }
    });
  };

  const handleAddonNotesChange = (addonId, notes) => {
    setSelectedAddons(prev => {
      const existing = prev.find(addon => addon.available_addon_id === addonId);
      if (existing) {
        return prev.map(addon =>
          addon.available_addon_id === addonId
            ? { ...addon, notes }
            : addon
        );
      } else {
        return [...prev, { available_addon_id: addonId, requested: false, priority: 0, notes }];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to submit an application');
      }

      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/events/${event.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          persona_id: selectedPersona?.id || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      // Save add-on requests if any were selected
      if (selectedAddons.length > 0) {
        try {
          const addonsToSave = selectedAddons.filter(addon => addon.requested);
          for (const addon of addonsToSave) {
            await fetch(`https://api2.onlineartfestival.com/api/applications/${data.application.id}/addon-requests`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                available_addon_id: addon.available_addon_id,
                requested: addon.requested,
                notes: addon.notes || ''
              })
            });
          }
        } catch (addonError) {
          console.error('Failed to save add-on requests:', addonError);
          // Continue with success even if add-on requests fail
        }
      }

      // Success - call parent callback
      if (onSubmit) {
        onSubmit(data.application);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalFees = () => {
    let total = 0;
    if (event?.application_fee) total += parseFloat(event.application_fee);
    if (event?.jury_fee) total += parseFloat(event.jury_fee);
    return total;
  };

  const calculateBoothFees = () => {
    let total = 0;
    if (event?.booth_fee) total += parseFloat(event.booth_fee);
    
    // Add selected add-on fees
    selectedAddons.forEach(addon => {
      if (addon.requested) {
        const addonDetails = availableAddons.find(a => a.id === addon.available_addon_id);
        if (addonDetails) {
          total += parseFloat(addonDetails.addon_price);
        }
      }
    });
    
    return total;
  };

  if (!event) {
    return <div className={styles.error}>Event information not available</div>;
  }

  return (
    <div className={styles.applicationForm}>
      <div className={styles.header}>
        <h2>Apply to {event.title}</h2>
        <p className={styles.subtitle}>
          Submit your application to participate in this event
        </p>
      </div>

      {/* Jury Packet Selection */}
      {showPacketOptions && !selectedPacket && (
        <div className={styles.packetSelection}>
          <h3>Choose Application Method</h3>
          <p className={styles.packetDescription}>
            You can apply from scratch or use one of your saved jury packets to speed up the process.
          </p>
          
          <div className={styles.packetOptions}>
            <div className={styles.packetOption}>
              <button
                type="button"
                className={styles.fromScratchButton}
                onClick={() => setShowPacketOptions(false)}
              >
                <i className="fas fa-edit"></i>
                <div>
                  <strong>Apply from Scratch</strong>
                  <p>Fill out the application form manually</p>
                </div>
              </button>
            </div>

            <div className={styles.packetOptionsGrid}>
              {juryPackets.map(packet => (
                <div key={packet.id} className={styles.packetOption}>
                  <button
                    type="button"
                    className={styles.packetButton}
                    onClick={() => handlePacketSelect(packet)}
                  >
                    <i className="fas fa-folder"></i>
                    <div>
                      <strong>{packet.packet_name}</strong>
                      <p>Use saved application data</p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

             {/* Selected Packet Info */}
      {selectedPacket && (
        <div className={styles.selectedPacket}>
          <div className={styles.selectedPacketHeader}>
            <i className="fas fa-folder-open"></i>
            <div>
              <strong>Using: {selectedPacket.packet_name}</strong>
              <p>Your application has been pre-filled with saved data. You can edit any fields below.</p>
            </div>
            <button
              type="button"
              className={styles.changePacketButton}
              onClick={() => {
                setSelectedPacket(null);
                setShowPacketOptions(true);
                // Reset form data
                setFormData({
                  artist_statement: '',
                  portfolio_url: '',
                  additional_info: '',
                  additional_notes: ''
                });
                setFieldResponses({});
              }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Persona Selection */}
      {personas.length > 0 && !showPacketOptions && (
        <div className={styles.personaSelection}>
          <h3>Apply as Persona</h3>
          <p className={styles.personaDescription}>
            Choose which artistic identity to present for this application.
          </p>
          
          <div className={styles.personaOptions}>
            <div className={styles.personaOption}>
              <button
                type="button"
                className={`${styles.personaButton} ${!selectedPersona ? styles.selected : ''}`}
                onClick={() => setSelectedPersona(null)}
              >
                <i className="fas fa-user"></i>
                <div>
                  <strong>My Main Profile</strong>
                  <p>Apply with your default artist information</p>
                </div>
              </button>
            </div>

            {personas.map(persona => (
              <div key={persona.id} className={styles.personaOption}>
                <button
                  type="button"
                  className={`${styles.personaButton} ${selectedPersona?.id === persona.id ? styles.selected : ''}`}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <i className="fas fa-mask"></i>
                  <div>
                    <strong>{persona.display_name}</strong>
                    <p>{persona.persona_name}{persona.specialty ? ` - ${persona.specialty}` : ''}</p>
                  </div>
                  {persona.is_default && (
                    <div className={styles.defaultBadge}>
                      <i className="fas fa-star"></i>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>

          {selectedPersona && (
            <div className={styles.selectedPersonaInfo}>
              <div className={styles.selectedPersonaHeader}>
                <i className="fas fa-info-circle"></i>
                <div>
                  <strong>Applying as: {selectedPersona.display_name}</strong>
                  <p>This persona's information will be shown to the event organizer.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Application Stats */}
      {applicationStats && (
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{applicationStats.total_applications}</span>
            <span className={styles.statLabel}>Total Applications</span>
          </div>
          {event.max_applications && (
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {event.max_applications - applicationStats.total_applications}
              </span>
              <span className={styles.statLabel}>Spots Remaining</span>
            </div>
          )}
        </div>
      )}

      {/* Fee Information */}
      {(calculateTotalFees() > 0 || calculateBoothFees() > 0) && (
        <div className={styles.feeInfo}>
          <h3>Fees & Pricing</h3>
          <div className={styles.feeBreakdown}>
            {/* Application & Jury Fees (due at submission) */}
            {calculateTotalFees() > 0 && (
              <>
                <div className={styles.feeSection}>
                  <h4>Due at Application Submission:</h4>
                  {event.application_fee > 0 && (
                    <div className={styles.feeItem}>
                      <span>Application Fee:</span>
                      <span>${parseFloat(event.application_fee).toFixed(2)}</span>
                    </div>
                  )}
                  {event.jury_fee > 0 && (
                    <div className={styles.feeItem}>
                      <span>Jury Fee:</span>
                      <span>${parseFloat(event.jury_fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className={styles.feeSubtotal}>
                    <span>Application Total:</span>
                    <span>${calculateTotalFees().toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
            
            {/* Booth Fees (due after acceptance) */}
            {calculateBoothFees() > 0 && (
              <div className={styles.feeSection}>
                <h4>Due if Accepted:</h4>
                {event.booth_fee > 0 && (
                  <div className={styles.feeItem}>
                    <span>Booth Fee:</span>
                    <span>${parseFloat(event.booth_fee).toFixed(2)}</span>
                  </div>
                )}
                {selectedAddons.filter(a => a.requested).map(addon => {
                  const addonDetails = availableAddons.find(a => a.id === addon.available_addon_id);
                  return addonDetails ? (
                    <div key={addon.available_addon_id} className={styles.feeItem}>
                      <span>{addonDetails.addon_name}:</span>
                      <span>+${parseFloat(addonDetails.addon_price).toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
                <div className={styles.feeSubtotal}>
                  <span>Booth Total:</span>
                  <span>${calculateBoothFees().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <p className={styles.feeNote}>
            <i className="fas fa-info-circle"></i>
            Application and jury fees are non-refundable. Booth fees are due only if your application is accepted.
          </p>
        </div>
      )}

      <form onSubmit={selectedPacket ? handleApplyWithPacket : handleSubmit} className={styles.form}>

        {/* Booth Preferences & Add-ons */}
        <div className={styles.formSection}>
          <h3>Booth Preferences</h3>
          <p className={styles.sectionDescription}>
            Select any add-ons you're interested in. These are requests only - final assignments will be made by the event organizer based on availability.
          </p>
          
          {/* Display base booth fee */}
          {event.booth_fee > 0 && (
            <div className={styles.baseFeeInfo}>
              <div className={styles.baseFeeItem}>
                <span>Base Booth Fee:</span>
                <span>${parseFloat(event.booth_fee).toFixed(2)}</span>
              </div>
              <p className={styles.baseFeeNote}>This fee is due only if your application is accepted.</p>
            </div>
          )}

          {/* Available Add-ons */}
          {availableAddons.length > 0 ? (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Available Add-ons
              </label>
              <div className={styles.addonsContainer}>
                {availableAddons.map(addon => {
                  const selection = selectedAddons.find(s => s.available_addon_id === addon.id);
                  const isSelected = selection?.requested || false;
                  return (
                    <div key={addon.id} className={styles.addonItem}>
                      <label className={styles.addonLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleAddonToggle(addon.id, e.target.checked)}
                          className={styles.checkbox}
                        />
                        <div className={styles.addonInfo}>
                          <span className={styles.addonName}>{addon.addon_name}</span>
                          <span className={styles.addonPrice}>+${addon.addon_price}</span>
                          {addon.addon_description && (
                            <span className={styles.addonDescription}>{addon.addon_description}</span>
                          )}
                        </div>
                      </label>
                      {isSelected && (
                        <div className={styles.addonNotes}>
                          <input
                            type="text"
                            placeholder="Optional notes about this add-on request..."
                            value={selection?.notes || ''}
                            onChange={(e) => handleAddonNotesChange(addon.id, e.target.value)}
                            className={styles.notesInput}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.noAddons}>
              <p>No add-ons available for this event.</p>
            </div>
          )}
        </div>

        {/* Application Fields */}
        {applicationFields.length > 0 && (
          <div className={styles.formSection}>
            <h3>Application Requirements</h3>
            <p className={styles.sectionDescription}>
              Please complete the following fields required by the event organizer.
              {isVerified && (
                <span className={styles.verifiedNote}>
                  <i className="fas fa-certificate"></i>
                  As a verified artist, you can skip optional fields marked with a star.
                </span>
              )}
            </p>
            
            {applicationFields.map(field => {
              const response = fieldResponses[field.id] || {};
              const canSkip = isVerified && field.verified_can_skip;
              const isRequired = field.is_required && !canSkip;
              const isPortfolioUrl = field.field_name.toLowerCase().includes('portfolio url');
              
              return (
                <div key={field.id} className={styles.formGroup}>
                  <label htmlFor={`field_${field.id}`} className={styles.label}>
                    {field.field_name}
                    {isRequired && <span className={styles.required}>*</span>}
                    {canSkip && (
                      <span className={styles.skippable}>
                        <i className="fas fa-star"></i>
                        Verified Skip Available
                      </span>
                    )}
                  </label>
                  
                  {field.field_description && (
                    <div className={styles.fieldHelp}>
                      {field.field_description}
                    </div>
                  )}
                  
                  {field.field_type === 'textarea' && (
                    <textarea
                      id={`field_${field.id}`}
                      value={response.response_value || ''}
                      onChange={(e) => handleFieldResponse(field.id, e.target.value)}
                      placeholder={`Enter your ${field.field_name.toLowerCase()}...`}
                      rows={field.field_name.toLowerCase().includes('artist statement') ? 6 : 3}
                      required={isRequired}
                      className={styles.textarea}
                    />
                  )}
                  
                  {field.field_type === 'url' && (
                    <input
                      type="url"
                      id={`field_${field.id}`}
                      value={isPortfolioUrl ? formData.portfolio_url : (response.response_value || '')}
                      onChange={isPortfolioUrl ? (() => {}) : (e) => handleFieldResponse(field.id, e.target.value)}
                      placeholder={isPortfolioUrl ? "Auto-filled from your profile" : `Enter ${field.field_name.toLowerCase()}...`}
                      required={isRequired}
                      disabled={isPortfolioUrl}
                      className={`${styles.input} ${isPortfolioUrl ? styles.disabledInput : ''}`}
                    />
                  )}
                  
                  {field.field_type === 'text' && (
                    <textarea
                      id={`field_${field.id}`}
                      value={response.response_value || ''}
                      onChange={(e) => handleFieldResponse(field.id, e.target.value)}
                      placeholder={`Enter your ${field.field_name.toLowerCase()}...`}
                      rows={3}
                      required={isRequired}
                      className={styles.textarea}
                    />
                  )}
                  
                  {(field.field_type === 'image' || field.field_type === 'video') && (
                    <div className={styles.fileUpload}>
                      <input
                        type="file"
                        id={`field_${field.id}`}
                        accept={field.field_type === 'image' ? 'image/*' : 'video/*'}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleFieldResponse(field.id, file.name, file);
                          }
                        }}
                        required={isRequired}
                        className={styles.fileInput}
                      />
                      <div className={styles.fileHelp}>
                        Upload {field.field_type === 'image' ? 'an image' : 'a video'} for {field.field_name}
                      </div>
                      {response.file_url && (
                        <div className={styles.fileSelected}>
                          Selected: {response.file_url.name || 'File uploaded'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Character count for artist statement */}
                  {field.field_type === 'textarea' && field.field_name.toLowerCase().includes('artist statement') && (
                    <div className={styles.charCount}>
                      {(response.response_value || '').length} characters
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={styles.error}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {/* Save as Packet Form */}
        {showSavePacketForm && (
          <div className={styles.savePacketForm}>
            <div className={styles.savePacketHeader}>
              <h4>Save as Jury Packet</h4>
              <button
                type="button"
                className={styles.closeSaveButton}
                onClick={() => {
                  setShowSavePacketForm(false);
                  setPacketName('');
                  setError(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.savePacketBody}>
              <p>Save your current application data as a reusable jury packet.</p>
              <div className={styles.savePacketInputGroup}>
                <input
                  type="text"
                  value={packetName}
                  onChange={(e) => setPacketName(e.target.value)}
                  placeholder="e.g., My Photography Application"
                  className={styles.packetNameInput}
                />
                <button
                  type="button"
                  onClick={handleSaveAsPacket}
                  className={styles.savePacketConfirmButton}
                  disabled={loading || !packetName.trim()}
                >
                  {loading ? 'Saving...' : 'Save Packet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className={styles.formActions}>
          <div className={styles.leftActions}>
            <button
              type="button"
              onClick={() => setShowSavePacketForm(true)}
              className={styles.savePacketButton}
              disabled={loading}
            >
              <i className="fas fa-save"></i>
              Save as Packet
            </button>
          </div>
          <div className={styles.rightActions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit Application
                  {calculateTotalFees() > 0 && ` ($${calculateTotalFees().toFixed(2)})`}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 