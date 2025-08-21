import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';

export default function ShippingSettings({ userData }) {
  const [preferences, setPreferences] = useState({
    return_company_name: '',
    return_contact_name: '',
    return_address_line_1: '',
    return_address_line_2: '',
    return_city: '',
    return_state: '',
    return_postal_code: '',
    return_country: 'US',
    return_phone: '',
    label_size_preference: '4x6',
    signature_required_default: false,
    insurance_default: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load existing preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/shipping-preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Handle null values from database by converting to empty strings
            const cleanPreferences = {
              return_company_name: data.preferences.return_company_name || '',
              return_contact_name: data.preferences.return_contact_name || '',
              return_address_line_1: data.preferences.return_address_line_1 || '',
              return_address_line_2: data.preferences.return_address_line_2 || '',
              return_city: data.preferences.return_city || '',
              return_state: data.preferences.return_state || '',
              return_postal_code: data.preferences.return_postal_code || '',
              return_country: data.preferences.return_country || 'US',
              return_phone: data.preferences.return_phone || '',
              label_size_preference: data.preferences.label_size_preference || '4x6',
              signature_required_default: Boolean(data.preferences.signature_required_default),
              insurance_default: Boolean(data.preferences.insurance_default)
            };
            setPreferences(cleanPreferences);
          }
        }
      } catch (error) {
        console.error('Error loading shipping preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/shipping-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage('Shipping preferences saved successfully!');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Error saving preferences: ' + (data.error || 'Unknown error'));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage('Error saving preferences: ' + (errorData.error || `HTTP ${response.status}`));
      }
    } catch (error) {
      console.error('Error saving shipping preferences:', error);
      setMessage('Error saving preferences: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '16px', color: '#6c757d' }}>Loading shipping preferences...</div>
      </div>
    );
  }

  return (
    <div>
      <h2>Shipping Settings</h2>
      
      {/* Explanatory section */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '24px',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        <strong>Why we ask for these settings:</strong>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
          These settings are used to provide accurate information when creating shipping labels, and to help you get the best label for your preferred print method. Please be sure these settings are current and accurate when creating labels to avoid adjustment charges on your labels. These settings will not change or impact your profile address settings.
        </p>
      </div>
        
        {message && (
          <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', border: '1px solid ' + (message.includes('Error') ? '#f5c6cb' : '#c3e6cb'), borderRadius: '4px' }}>
            {message}
          </div>
        )}

        <div className="form-card">
          <h3>Return Address</h3>
          
          <label>Company Name</label>
          <input 
            type="text" 
            value={preferences.return_company_name} 
            onChange={(e) => handleInputChange('return_company_name', e.target.value)}
            placeholder="Your Company Name"
          />

          <label>Contact Name</label>
          <input 
            type="text" 
            value={preferences.return_contact_name} 
            onChange={(e) => handleInputChange('return_contact_name', e.target.value)}
            placeholder="Contact Person Name"
          />

          <label>Address Line 1 *</label>
          <input 
            type="text" 
            value={preferences.return_address_line_1} 
            onChange={(e) => handleInputChange('return_address_line_1', e.target.value)}
            placeholder="Street Address"
            required
          />

          <label>Address Line 2</label>
          <input 
            type="text" 
            value={preferences.return_address_line_2} 
            onChange={(e) => handleInputChange('return_address_line_2', e.target.value)}
            placeholder="Suite, Apt, etc. (optional)"
          />

          <label>City *</label>
          <input 
            type="text" 
            value={preferences.return_city} 
            onChange={(e) => handleInputChange('return_city', e.target.value)}
            placeholder="City"
            required
          />

          <label>State *</label>
          <input 
            type="text" 
            value={preferences.return_state} 
            onChange={(e) => handleInputChange('return_state', e.target.value)}
            placeholder="State/Province"
            required
          />

          <label>Postal Code *</label>
          <input 
            type="text" 
            value={preferences.return_postal_code} 
            onChange={(e) => handleInputChange('return_postal_code', e.target.value)}
            placeholder="ZIP/Postal Code"
            required
          />

          <label>Country</label>
          <select 
            value={preferences.return_country} 
            onChange={(e) => handleInputChange('return_country', e.target.value)}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>

          <label>Phone Number</label>
          <input 
            type="tel" 
            value={preferences.return_phone} 
            onChange={(e) => handleInputChange('return_phone', e.target.value)}
            placeholder="Phone Number"
          />
        </div>

        <div className="form-card">
          <h3>Label Preferences</h3>
          
          <label>Label Size</label>
          <select 
            value={preferences.label_size_preference} 
            onChange={(e) => handleInputChange('label_size_preference', e.target.value)}
          >
            <option value="4x6">4" x 6" (Standard)</option>
            <option value="8.5x11">8.5" x 11" (Full Page)</option>
          </select>

          <div className="form-group">
            <label className="toggle-slider-container">
              <input 
                type="checkbox" 
                className="toggle-slider-input"
                checked={preferences.signature_required_default} 
                onChange={(e) => handleInputChange('signature_required_default', e.target.checked)}
              />
              <div className="toggle-slider"></div>
              <span className="toggle-text">Require signature by default</span>
            </label>
          </div>

          <div className="form-group">
            <label className="toggle-slider-container">
              <input 
                type="checkbox" 
                className="toggle-slider-input"
                checked={preferences.insurance_default} 
                onChange={(e) => handleInputChange('insurance_default', e.target.checked)}
              />
              <div className="toggle-slider"></div>
              <span className="toggle-text">Add insurance by default</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ marginRight: '10px' }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
    </div>
  );
}
