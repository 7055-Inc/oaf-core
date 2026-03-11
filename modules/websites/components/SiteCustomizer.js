import React, { useState, useEffect } from 'react';
import { getSubdomainUrl, getApiUrl } from '../../../lib/config';
import { authApiRequest } from '../../../lib/apiUtils';
import { fetchSiteCustomizations, updateSiteCustomizations } from '../../../lib/websites';
import GoogleFontsPicker from '../../../components/sites-modules/GoogleFontsPicker';

export default function SiteCustomizer({ site, userData, onUpdate }) {
  const [customizations, setCustomizations] = useState({
    textColor: '#374151',
    mainColor: '#667eea',
    secondaryColor: '#764ba2',
    bodyFont: '',
    headerFont: '',
    buttonStyle: 'rounded',
    buttonColor: '',
    borderRadius: '4px',
    spacingScale: 'normal',
    heroStyle: 'gradient',
    navigationStyle: 'horizontal',
    footerText: ''
  });
  const [templateSchema, setTemplateSchema] = useState(null);
  const [templateData, setTemplateData] = useState({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Check user permissions
  const hasSites = userData?.permissions?.includes('sites');
  const hasManageSites = userData?.permissions?.includes('manage_sites');
  const hasProfessionalSites = userData?.permissions?.includes('professional_sites');

  useEffect(() => {
    // Load existing customizations for this site
    loadSiteCustomizations();
    // Load template schema and data
    if (site.template_id) {
      loadTemplateSchema();
      loadTemplateData();
    }
  }, [site.id, site.template_id]);

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
          headerFont: cust.header_font || prev.headerFont,
          buttonStyle: cust.button_style || 'rounded',
          buttonColor: cust.button_color || '',
          borderRadius: cust.border_radius || '4px',
          spacingScale: cust.spacing_scale || 'normal',
          heroStyle: cust.hero_style || 'gradient',
          navigationStyle: cust.navigation_style || 'horizontal',
          footerText: cust.footer_text || ''
        }));
      }
    } catch (err) {
      console.error('Error loading customizations:', err);
      setError('Failed to load customizations');
    }
  };

  const loadTemplateSchema = async () => {
    if (!site.template_id) return;
    
    try {
      const response = await fetch(getApiUrl(`api/v2/websites/templates/${site.template_id}/schema`));
      const result = await response.json();
      
      if (result.success && result.data) {
        setTemplateSchema(result.data);
      }
    } catch (err) {
      console.error('Error loading template schema:', err);
    }
  };
  
  const loadTemplateData = async () => {
    if (!site.id) return;
    
    try {
      const response = await authApiRequest(`api/v2/websites/sites/${site.id}/template-data`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setTemplateData(result.data);
      }
    } catch (err) {
      console.error('Error loading template data:', err);
    }
  };

  const handleChange = (field, value) => {
    setCustomizations(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleTemplateFieldChange = (fieldKey, value) => {
    setTemplateData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Save global customizations
      const result = await updateSiteCustomizations(site.id, {
        text_color: customizations.textColor,
        main_color: customizations.mainColor,
        secondary_color: customizations.secondaryColor,
        body_font: customizations.bodyFont,
        header_font: customizations.headerFont,
        button_style: customizations.buttonStyle,
        button_color: customizations.buttonColor || null,
        border_radius: customizations.borderRadius,
        spacing_scale: customizations.spacingScale,
        hero_style: customizations.heroStyle,
        navigation_style: customizations.navigationStyle,
        footer_text: customizations.footerText || null
      });

      if (result?.success === false) {
        setError(result?.error || 'Failed to save customizations');
        return;
      }
      
      // Save template-specific data if there are any fields
      if (templateSchema?.custom_fields && templateSchema.custom_fields.length > 0) {
        try {
          const templateResponse = await authApiRequest(`api/v2/websites/sites/${site.id}/template-data`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData)
          });
          
          const templateResult = await templateResponse.json();
          
          if (!templateResult.success) {
            setError(templateResult.error || 'Failed to save template customizations');
            return;
          }
        } catch (templateError) {
          console.error('Error saving template data:', templateError);
          setError('Failed to save template customizations');
          return;
        }
      }

      if (onUpdate) onUpdate();
      alert('Site customizations saved successfully!');
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
      headerFont: '',
      buttonStyle: 'rounded',
      buttonColor: '',
      borderRadius: '4px',
      spacingScale: 'normal',
      heroStyle: 'gradient',
      navigationStyle: 'horizontal',
      footerText: ''
    });
  };
  
  // Render a template-specific field based on its type
  const renderTemplateField = (field) => {
    const value = templateData[field.key] || field.default_value || '';
    const tierHierarchy = { free: 0, basic: 1, professional: 2 };
    
    // Determine user's tier level
    let userTierLevel = 0;
    if (hasProfessionalSites) userTierLevel = 2;
    else if (hasManageSites) userTierLevel = 1;
    
    // Check if user has access to this field
    const requiredTierLevel = tierHierarchy[field.tier_required] || 0;
    const hasAccess = userTierLevel >= requiredTierLevel;
    const isDisabled = !hasAccess || processing;
    
    const baseStyle = {
      width: '100%',
      padding: '8px',
      border: '1px solid #ced4da',
      borderRadius: '2px',
      fontSize: '14px',
      opacity: isDisabled ? 0.6 : 1
    };
    
    let inputElement;
    
    switch (field.type) {
      case 'text':
        inputElement = (
          <input
            type="text"
            value={value}
            onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder || ''}
            maxLength={field.max_length || 255}
            style={baseStyle}
          />
        );
        break;
      
      case 'textarea':
        inputElement = (
          <textarea
            value={value}
            onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder || ''}
            maxLength={field.max_length || 10000}
            rows={4}
            style={{...baseStyle, resize: 'vertical'}}
          />
        );
        break;
      
      case 'url':
      case 'video_url':
      case 'image_url':
        inputElement = (
          <input
            type="url"
            value={value}
            onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder || 'https://example.com'}
            style={baseStyle}
          />
        );
        break;
      
      case 'color':
        inputElement = (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
              disabled={isDisabled}
              style={{
                width: '50px',
                height: '38px',
                border: '1px solid #ced4da',
                borderRadius: '2px',
                cursor: isDisabled ? 'not-allowed' : 'pointer'
              }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
              disabled={isDisabled}
              placeholder="#000000"
              style={{...baseStyle, fontFamily: 'monospace'}}
            />
          </div>
        );
        break;
      
      case 'number':
        inputElement = (
          <input
            type="number"
            value={value}
            onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
            disabled={isDisabled}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder || ''}
            style={baseStyle}
          />
        );
        break;
      
      case 'select':
        inputElement = (
          <select
            value={value}
            onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
            disabled={isDisabled}
            style={baseStyle}
          >
            <option value="">-- Select --</option>
            {field.options && field.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
        break;
      
      default:
        inputElement = (
          <input
            type="text"
            value={value}
            onChange={(e) => handleTemplateFieldChange(field.key, e.target.value)}
            disabled={isDisabled}
            style={baseStyle}
          />
        );
    }
    
    return (
      <div key={field.key} style={{ marginBottom: '15px' }}>
        <label style={{
          display: 'block',
          marginBottom: '5px',
          color: '#495057',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {field.label}
          {field.required && <span style={{ color: '#dc3545' }}>*</span>}
        </label>
        
        {inputElement}
        
        {field.description && (
          <small style={{
            display: 'block',
            marginTop: '4px',
            color: '#6c757d',
            fontSize: '12px'
          }}>
            {field.description}
          </small>
        )}
        
        {!hasAccess && (
          <small style={{
            display: 'block',
            marginTop: '4px',
            color: '#856404',
            background: '#fff3cd',
            padding: '4px 8px',
            borderRadius: '2px',
            fontSize: '11px'
          }}>
            Requires {field.tier_required} tier or higher
          </small>
        )}
      </div>
    );
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

        {/* Font Customization with Google Fonts */}
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
            Typography (Google Fonts)
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <GoogleFontsPicker
              label="Body Font"
              value={customizations.bodyFont}
              onChange={(font) => handleChange('bodyFont', font)}
            />
            <GoogleFontsPicker
              label="Header Font"
              value={customizations.headerFont}
              onChange={(font) => handleChange('headerFont', font)}
            />
          </div>
        </div>

        {/* Layout & Style Options */}
        {hasManageSites && (
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>
              Layout & Style
            </h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {/* Button Style */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Button Style
                </label>
                <select 
                  value={customizations.buttonStyle} 
                  onChange={(e) => handleChange('buttonStyle', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                  <option value="pill">Pill</option>
                </select>
              </div>

              {/* Button Color */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Button Color (optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={customizations.buttonColor || customizations.mainColor}
                    onChange={(e) => handleChange('buttonColor', e.target.value)}
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
                    value={customizations.buttonColor || ''}
                    onChange={(e) => handleChange('buttonColor', e.target.value)}
                    placeholder="Uses main color"
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

              {/* Border Radius */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Border Radius
                </label>
                <input 
                  type="text" 
                  value={customizations.borderRadius} 
                  onChange={(e) => handleChange('borderRadius', e.target.value)}
                  placeholder="e.g., 4px, 0.5rem"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Spacing Scale */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Spacing
                </label>
                <select 
                  value={customizations.spacingScale} 
                  onChange={(e) => handleChange('spacingScale', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed</option>
                </select>
              </div>

              {/* Hero Style */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Hero Style
                </label>
                <select 
                  value={customizations.heroStyle} 
                  onChange={(e) => handleChange('heroStyle', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="gradient">Gradient</option>
                  <option value="solid">Solid Color</option>
                  <option value="image">Image Background</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Navigation Style */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Navigation Style
                </label>
                <select 
                  value={customizations.navigationStyle} 
                  onChange={(e) => handleChange('navigationStyle', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="centered">Centered</option>
                  <option value="minimal">Minimal</option>
                  <option value="sidebar">Sidebar</option>
                </select>
              </div>
            </div>

            {/* Footer Text */}
            {hasProfessionalSites && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Footer Text (Professional)
                </label>
                <textarea
                  value={customizations.footerText || ''}
                  onChange={(e) => handleChange('footerText', e.target.value)}
                  placeholder="Custom footer text for your site..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        )}

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

      {/* Template-Specific Options */}
      {templateSchema?.custom_fields && templateSchema.custom_fields.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ 
            margin: '0 0 15px 0', 
            color: '#495057', 
            fontSize: '14px',
            paddingTop: '15px',
            borderTop: '1px solid #dee2e6'
          }}>
            Template-Specific Options
            <span style={{ 
              fontSize: '11px', 
              color: '#6c757d', 
              fontWeight: 'normal',
              marginLeft: '8px'
            }}>
              ({templateSchema.template_name})
            </span>
          </h5>
          
          {templateSchema.custom_fields.map(field => renderTemplateField(field))}
        </div>
      )}

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
