import React, { useState, useEffect } from 'react';
import { getSubdomainUrl } from '../../../lib/config';
import { fetchSiteCustomizations, updateSiteCustomizations } from '../../../lib/websites';

export default function SiteCustomizer({ site, userData, onUpdate }) {
  const [customizations, setCustomizations] = useState({
    textColor: '#374151',
    mainColor: '#667eea',
    secondaryColor: '#764ba2',
    bodyFont: '',
    headerFont: ''
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Check user permissions
  const hasSites = userData?.permissions?.includes('sites');
  const hasManageSites = userData?.permissions?.includes('manage_sites');
  const hasProfessionalSites = userData?.permissions?.includes('professional_sites');

  useEffect(() => {
    // Load existing customizations for this site
    loadSiteCustomizations();
  }, [site.id]);

  const loadSiteCustomizations = async () => {
    try {
      const data = await fetchSiteCustomizations(site.id);
      const cust = data?.customizations ?? data;
      if (cust && typeof cust === 'object') {
        setCustomizations(prev => ({
          ...prev,
          textColor: cust.text_color || '#374151',
          mainColor: cust.main_color || '#667eea',
          secondaryColor: cust.secondary_color || '#764ba2',
          bodyFont: cust.body_font || prev.bodyFont,
          headerFont: cust.header_font || prev.headerFont
        }));
      }
    } catch (err) {
      console.error('Error loading customizations:', err);
      setError('Failed to load customizations');
    }
  };

  const handleChange = (field, value) => {
    setCustomizations(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      setError(null);

      const result = await updateSiteCustomizations(site.id, {
        text_color: customizations.textColor,
        main_color: customizations.mainColor,
        secondary_color: customizations.secondaryColor,
        body_font: customizations.bodyFont,
        header_font: customizations.headerFont
      });

      if (result?.success !== false) {
        if (onUpdate) onUpdate();
        alert('Site customizations saved successfully!');
      } else {
        setError(result?.error || 'Failed to save customizations');
      }
    } catch (error) {
      setError(error.message || 'Error saving customizations');
      console.error('Error saving customizations:', error);
    } finally {
      setProcessing(false);
    }
  };

  const resetToDefaults = () => {
    setCustomizations({
      textColor: '#374151',
      mainColor: '#667eea',
      secondaryColor: '#764ba2',
      bodyFont: '',
      headerFont: ''
    });
  };

  if (!site?.id) {
    return (
      <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '2px', textAlign: 'center' }}>
        <p style={{ color: '#6c757d', margin: '0' }}>Select a site to customize.</p>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
        Site Customization
        {!hasManageSites && (
          <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'normal' }}>
            (Basic colors - upgrade for advanced customization)
          </span>
        )}
      </h4>

      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '2px', 
          marginBottom: '15px',
          color: '#721c24',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Color Customization - Available to all tiers */}
      <div style={{ marginBottom: '20px' }}>
        <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
          Color Scheme
        </h5>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '15px',
          marginBottom: '15px'
        }}>
          {/* Text Color */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              color: '#495057', 
              fontSize: '12px' 
            }}>
              Text Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={customizations.textColor}
                onChange={(e) => handleChange('textColor', e.target.value)}
                style={{
                  width: '40px',
                  height: '30px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={customizations.textColor}
                onChange={(e) => handleChange('textColor', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          {/* Main Color */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              color: '#495057', 
              fontSize: '12px' 
            }}>
              Main Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={customizations.mainColor}
                onChange={(e) => handleChange('mainColor', e.target.value)}
                style={{
                  width: '40px',
                  height: '30px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={customizations.mainColor}
                onChange={(e) => handleChange('mainColor', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              color: '#495057', 
              fontSize: '12px' 
            }}>
              Secondary Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={customizations.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                style={{
                  width: '40px',
                  height: '30px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={customizations.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
        </div>

        {/* Font Customization */}
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
            Fonts
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                Body Font
              </label>
              <input
                type="text"
                placeholder="e.g. Open Sans, system-ui"
                value={customizations.bodyFont || ''}
                onChange={(e) => handleChange('bodyFont', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                Header Font
              </label>
              <input
                type="text"
                placeholder="e.g. Montserrat, Georgia"
                value={customizations.headerFont || ''}
                onChange={(e) => handleChange('headerFont', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div style={{ 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '2px',
          border: '1px solid #dee2e6',
          marginBottom: '15px'
        }}>
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
            Preview:
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              color: customizations.textColor,
              fontSize: '14px'
            }}>
              Sample text
            </div>
            <div style={{ 
              background: customizations.mainColor,
              color: 'white',
              padding: '4px 8px',
              borderRadius: '2px',
              fontSize: '12px'
            }}>
              Main Color
            </div>
            <div style={{ 
              background: customizations.secondaryColor,
              color: 'white',
              padding: '4px 8px',
              borderRadius: '2px',
              fontSize: '12px'
            }}>
              Secondary Color
            </div>
          </div>
        </div>
      </div>

      {/* Future Professional Features Placeholder */}
      {hasProfessionalSites && (
        <div style={{ 
          padding: '15px', 
          background: '#e7f3ff', 
          borderRadius: '2px',
          border: '1px solid #b3d9ff',
          marginBottom: '20px'
        }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#0056b3', fontSize: '14px' }}>
            Professional Features
          </h5>
          <p style={{ margin: '0', color: '#004085', fontSize: '12px' }}>
            Smart templates, advanced color tools, and live site editor coming soon...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px',
        paddingTop: '15px',
        borderTop: '1px solid #dee2e6'
      }}>
        <button
          onClick={handleSave}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: processing ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {processing ? 'Saving...' : 'Save Changes'}
        </button>
        
        <button
          onClick={resetToDefaults}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Reset to Defaults
        </button>

        {/* Preview Site Button */}
        <button
          onClick={() => {
            window.open(site.domain ? `https://${site.domain}` : getSubdomainUrl(site.subdomain), '_blank');
          }}
          style={{
            padding: '8px 16px',
            background: '#055474',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '14px',
            marginLeft: 'auto'
          }}
        >
          Preview Site
        </button>
      </div>
    </div>
  );
}
