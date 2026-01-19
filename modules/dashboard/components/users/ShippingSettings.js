/**
 * Shipping Settings Component
 * 
 * Manages vendor shipping preferences including return address,
 * label preferences, and handling time.
 * Uses global CSS classes from global.css
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import { HANDLING_OPTIONS } from '../../../../lib/shippingUtils';

const ShippingSettings = () => {
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
    insurance_default: false,
    handling_days: 3
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await authApiRequest('vendor/shipping-preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPreferences({
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
              insurance_default: Boolean(data.preferences.insurance_default),
              handling_days: data.preferences.handling_days || 3
            });
          }
        }
      } catch (error) {
        // Silent fail - use defaults
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await authApiRequest('vendor/shipping-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage({ text: 'Shipping preferences saved successfully!', type: 'success' });
          setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } else {
          setMessage({ text: 'Error saving preferences: ' + (data.error || 'Unknown error'), type: 'error' });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({ text: 'Error saving preferences: ' + (errorData.error || `HTTP ${response.status}`), type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error saving preferences: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading shipping preferences...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Info Banner */}
      <div className="info-banner">
        <i className="fa-solid fa-circle-info"></i>
        <div>
          <strong>Why we ask for these settings:</strong>
          <p>
            These settings are used to provide accurate information when creating shipping labels, 
            and to help you get the best label for your preferred print method. Please be sure these 
            settings are current and accurate when creating labels to avoid adjustment charges.
          </p>
        </div>
      </div>
      
      {message.text && (
        <div className={`${message.type}-alert`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Handling Time Section */}
        <div className="form-card">
          <h3>Business Days Lead Time</h3>
          <p className="form-hint">
            Set your standard handling time. This tells customers when they can expect their order to ship.
          </p>
          
          <div>
            <label>Handling Time</label>
            <select 
              value={preferences.handling_days} 
              onChange={(e) => handleInputChange('handling_days', parseInt(e.target.value, 10))}
            >
              {HANDLING_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Return Address Section */}
        <div className="form-card">
          <h3>Return Address</h3>
          
          <div className="form-grid-2">
            <div>
              <label>Company Name</label>
              <input 
                type="text" 
                value={preferences.return_company_name} 
                onChange={(e) => handleInputChange('return_company_name', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label>Contact Name</label>
              <input 
                type="text" 
                value={preferences.return_contact_name} 
                onChange={(e) => handleInputChange('return_contact_name', e.target.value)}
                placeholder="Contact Person Name"
              />
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="required">Address Line 1</label>
            <input 
              type="text" 
              value={preferences.return_address_line_1} 
              onChange={(e) => handleInputChange('return_address_line_1', e.target.value)}
              placeholder="Street Address"
              required
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label>Address Line 2</label>
            <input 
              type="text" 
              value={preferences.return_address_line_2} 
              onChange={(e) => handleInputChange('return_address_line_2', e.target.value)}
              placeholder="Suite, Apt, etc. (optional)"
            />
          </div>

          <div className="form-grid-2" style={{ marginTop: '20px' }}>
            <div>
              <label className="required">City</label>
              <input 
                type="text" 
                value={preferences.return_city} 
                onChange={(e) => handleInputChange('return_city', e.target.value)}
                placeholder="City"
                required
              />
            </div>
            <div>
              <label className="required">State</label>
              <input 
                type="text" 
                value={preferences.return_state} 
                onChange={(e) => handleInputChange('return_state', e.target.value)}
                placeholder="State/Province"
                required
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: '20px' }}>
            <div>
              <label className="required">Postal Code</label>
              <input 
                type="text" 
                value={preferences.return_postal_code} 
                onChange={(e) => handleInputChange('return_postal_code', e.target.value)}
                placeholder="ZIP/Postal Code"
                required
              />
            </div>
            <div>
              <label>Country</label>
              <select 
                value={preferences.return_country} 
                onChange={(e) => handleInputChange('return_country', e.target.value)}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label>Phone Number</label>
            <input 
              type="tel" 
              value={preferences.return_phone} 
              onChange={(e) => handleInputChange('return_phone', e.target.value)}
              placeholder="Phone Number"
            />
          </div>
        </div>

        {/* Label Preferences Section */}
        <div className="form-card">
          <h3>Label Preferences</h3>
          
          <div>
            <label>Label Size</label>
            <select 
              value={preferences.label_size_preference} 
              onChange={(e) => handleInputChange('label_size_preference', e.target.value)}
            >
              <option value="4x6">4" x 6" (Standard)</option>
              <option value="8.5x11">8.5" x 11" (Full Page)</option>
            </select>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="toggle-slider-container">
              <input 
                type="checkbox"
                className="toggle-slider-input"
                checked={preferences.signature_required_default} 
                onChange={(e) => handleInputChange('signature_required_default', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Require signature by default</span>
            </label>
            <p className="form-help">All shipments will require a signature upon delivery</p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="toggle-slider-container">
              <input 
                type="checkbox"
                className="toggle-slider-input"
                checked={preferences.insurance_default} 
                onChange={(e) => handleInputChange('insurance_default', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Add insurance by default</span>
            </label>
            <p className="form-help">All shipments will include shipping insurance</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
            ) : (
              <><i className="fa-solid fa-floppy-disk"></i> Save Preferences</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShippingSettings;
