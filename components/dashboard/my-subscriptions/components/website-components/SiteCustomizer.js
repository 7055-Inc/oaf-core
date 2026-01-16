import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../../lib/apiUtils';
import { getSubdomainUrl } from '../../../../../lib/config';

export default function SiteCustomizer({ site, userData, onUpdate }) {
  const [customizations, setCustomizations] = useState({
    textColor: '#374151',
    mainColor: '#667eea', 
    secondaryColor: '#764ba2'
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
      const response = await authApiRequest(`api/sites/${site.id}/customizations`);
      const data = await response.json();
      if (data.success) {
        setCustomizations({
          textColor: data.customizations.text_color || '#374151',
          mainColor: data.customizations.main_color || '#667eea',
          secondaryColor: data.customizations.secondary_color || '#764ba2'
        });
      }
    } catch (error) {
      console.error('Error loading customizations:', error);
      setError('Failed to load customizations');
    }
  };

  const handleColorChange = (colorType, value) => {
    setCustomizations(prev => ({
      ...prev,
      [colorType]: value
    }));
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      setError(null);

      const response = await authApiRequest(`api/sites/${site.id}/customizations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_color: customizations.textColor,
          main_color: customizations.mainColor,
          secondary_color: customizations.secondaryColor
        })
      });

      const data = await response.json();
      
      if (data.success) {
        if (onUpdate) onUpdate();
        alert('Site customizations saved successfully!');
      } else {
        setError(data.error || 'Failed to save customizations');
      }
    } catch (error) {
      setError('Error saving customizations');
      console.error('Error saving customizations:', error);
    } finally {
      setProcessing(false);
    }
  };

  const resetToDefaults = () => {
    setCustomizations({
      textColor: '#374151',
      mainColor: '#667eea', 
      secondaryColor: '#764ba2'
    });
  };

  if (!hasSites) {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '2px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6c757d', margin: '0' }}>
          Upgrade to a website subscription to customize your site.
        </p>
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
                onChange={(e) => handleColorChange('textColor', e.target.value)}
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
                onChange={(e) => handleColorChange('textColor', e.target.value)}
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
                onChange={(e) => handleColorChange('mainColor', e.target.value)}
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
                onChange={(e) => handleColorChange('mainColor', e.target.value)}
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
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
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
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
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
