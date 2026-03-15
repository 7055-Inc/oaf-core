import React, { useState, useEffect, useRef } from 'react';
import { getSubdomainUrl, getApiUrl, getSmartMediaUrl } from '../../../lib/config';
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
    footerText: '',
    showPrices: 'yes'
  });
  const [templateSchema, setTemplateSchema] = useState(null);
  const [templateData, setTemplateData] = useState({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

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
        const cleanFont = (v) => (v && !v.includes(',')) ? v : '';
        setCustomizations(prev => ({
          ...prev,
          textColor: cust.text_color || '#374151',
          mainColor: cust.main_color || '#667eea',
          secondaryColor: cust.secondary_color || '#764ba2',
          bodyFont: cleanFont(cust.body_font) || prev.bodyFont,
          headerFont: cleanFont(cust.header_font) || prev.headerFont,
          buttonStyle: cust.button_style || 'rounded',
          buttonColor: cust.button_color || '',
          borderRadius: cust.border_radius || '4px',
          spacingScale: cust.spacing_scale || 'normal',
          heroStyle: cust.hero_style || 'gradient',
          navigationStyle: cust.navigation_style || 'horizontal',
          footerText: cust.footer_text || '',
          showPrices: cust.show_prices || 'yes'
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
        footer_text: customizations.footerText || null,
        show_prices: customizations.showPrices || 'yes'
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
      footerText: '',
      showPrices: 'yes'
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please choose a JPEG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file is too large. Please choose an image smaller than 5MB.');
      e.target.value = '';
      return;
    }

    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo_image', file);

      const res = await authApiRequest('api/v2/users/me', {
        method: 'PATCH',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload logo');
      }

      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message || 'Failed to upload logo');
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };
  
  // Render a template-specific field based on its type
  const renderTemplateField = (field) => {
    const value = templateData[field.key] || field.default_value || '';
    const isDisabled = processing;
    
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
                  width: '50px',
                  height: '36px',
                  padding: '2px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none'
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
                  width: '50px',
                  height: '36px',
                  padding: '2px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none'
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
                  width: '50px',
                  height: '36px',
                  padding: '2px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none'
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
            Site Fonts
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

              {/* Show Prices */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Show Prices
                </label>
                <select 
                  value={customizations.showPrices} 
                  onChange={(e) => handleChange('showPrices', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="yes">Show Prices</option>
                  <option value="no">Hide Prices</option>
                </select>
              </div>
            </div>

            {/* Footer Text */}
            <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '12px' }}>
                  Footer Text
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
          </div>

        {/* Live Preview */}
        <div style={{
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef',
          marginBottom: '15px'
        }}>
          <h5 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Preview
          </h5>

          {/* Colors row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #dee2e6',
                background: customizations.textColor, display: 'inline-block'
              }} />
              <span style={{ fontSize: '11px', color: '#6c757d' }}>Text</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #dee2e6',
                background: customizations.mainColor, display: 'inline-block'
              }} />
              <span style={{ fontSize: '11px', color: '#6c757d' }}>Main</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #dee2e6',
                background: customizations.secondaryColor, display: 'inline-block'
              }} />
              <span style={{ fontSize: '11px', color: '#6c757d' }}>Secondary</span>
            </div>
          </div>

          {/* Font previews */}
          <div style={{ marginBottom: '14px' }}>
            {customizations.headerFont && (
              <div style={{
                fontFamily: customizations.headerFont,
                fontSize: '22px',
                fontWeight: '700',
                color: customizations.textColor,
                lineHeight: '1.3',
                marginBottom: '4px'
              }}>
                Header Font Preview
              </div>
            )}
            <div style={{
              fontFamily: customizations.bodyFont || 'inherit',
              fontSize: '14px',
              color: customizations.textColor,
              lineHeight: '1.5'
            }}>
              {customizations.bodyFont
                ? 'Body text preview — The quick brown fox jumps over the lazy dog.'
                : <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>Select a body font above to preview</span>}
            </div>
          </div>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
            {(() => {
              const logoSrc = logoPreview || (userData?.logo_path ? getSmartMediaUrl(userData.logo_path, 'thumbnail') : null);
              return logoSrc ? (
                <img
                  src={logoSrc}
                  alt="Site Logo"
                  style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #dee2e6' }}
                />
              ) : (
                <div style={{
                  width: '48px', height: '48px', background: '#e9ecef', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#adb5bd', fontSize: '20px'
                }}>
                  &#128247;
                </div>
              );
            })()}
            <div>
              <div style={{ fontSize: '12px', color: '#495057', fontWeight: '500', marginBottom: '4px' }}>
                {(userData?.logo_path || logoPreview) ? 'Current Logo' : 'No Logo'}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  background: 'white',
                  border: '1px solid #ced4da',
                  borderRadius: '3px',
                  cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                  color: '#495057'
                }}
              >
                {uploadingLogo ? 'Uploading...' : (userData?.logo_path ? 'Change Logo' : 'Upload Logo')}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
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
