// Reusable Application Step Component
// Dynamically renders form based on config.applicationFields

import React, { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../../lib/apiUtils';

export default function ApplicationStep({ 
  config, 
  subscriptionType,
  onComplete 
}) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null);

  // Initialize form data with defaults
  useEffect(() => {
    const initialData = {};
    
    if (config.applicationFields) {
      config.applicationFields.forEach(section => {
        section.fields.forEach(field => {
          if (field.default !== undefined) {
            initialData[field.name] = field.default;
          } else if (field.type === 'checkbox') {
            initialData[field.name] = false;
          } else {
            initialData[field.name] = '';
          }
        });
      });
    }
    
    setFormData(initialData);
  }, [config]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleFileChange = (fieldName) => (event) => {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setMessage(`File ${file.name} is too large. Maximum size is 50MB.`);
        return;
      }
      setFormData(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const validateForm = () => {
    const errors = [];
    
    config.applicationFields.forEach(section => {
      section.fields.forEach(field => {
        if (field.required && !formData[field.name]) {
          errors.push(`${field.label} is required`);
        }
      });
    });
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setMessage('Please fill in all required fields: ' + errors.join(', '));
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const hasFiles = Object.values(formData).some(value => value instanceof File);
      
      let response;
      if (hasFiles) {
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] instanceof File) {
            const backendFieldName = key.replace('_media_id', '').replace(/_/g, '_');
            submitData.append(`jury_${backendFieldName}`, formData[key]);
          } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
            submitData.append(key, formData[key]);
          }
        });
        
        submitData.append('verified_application', 'true');
        
        response = await authApiRequest('users/me', {
          method: 'PATCH',
          body: submitData
        });
      } else {
        response = await authApiRequest(config.applicationEndpoint, {
          method: config.applicationMethod || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      
      const data = await handleApiResponse(response);
      
      // Check for success - handle both {success: true} and {message: '...'} response formats
      if (data.success || data.message) {
        if (config.autoApprove) {
          setApplicationStatus('auto_approved');
          setMessage('Setup complete!');
          setTimeout(() => {
            onComplete();
          }, 1000);
        } else {
          setApplicationStatus('pending');
          setMessage('Application submitted for review. We\'ll review your application and be in touch. We\'ll email you if we need more information for the verification process.');
        }
      } else {
        setMessage('Error: ' + (data.error || 'Failed to submit application'));
      }
      
    } catch (error) {
      console.error('Error submitting application:', error);
      setMessage('Error submitting application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // If application is pending (manual approval), show waiting state
  if (applicationStatus === 'pending') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="warning-alert" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ marginBottom: '10px' }}>Application Under Review</h2>
          <p style={{ marginBottom: '20px' }}>{message}</p>
          <p style={{ fontSize: '14px', color: '#6c757d' }}>
            You'll receive an email once your application is reviewed. 
            You can close this window and we'll notify you when approved.
          </p>
        </div>
      </div>
    );
  }

  // If auto-approved and showing success
  if (applicationStatus === 'auto_approved') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="success-alert" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ marginBottom: '10px' }}>Setup Complete!</h2>
          <p>Moving to payment setup...</p>
        </div>
      </div>
    );
  }

  // Check if we should show the header (hide if explicitly set to empty)
  const showHeader = config.applicationTitle !== '' && config.applicationSubtitle !== '';
  const headerTitle = config.applicationTitle ?? (config.autoApprove ? 'Complete Your Setup' : 'Submit Application');
  const headerSubtitle = config.applicationSubtitle ?? (config.autoApprove 
    ? 'Please provide your shipping information to continue'
    : 'Fill out the application below and we\'ll review it within 24-48 hours');

  // Show the form
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {showHeader && (
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {headerTitle && <h2>{headerTitle}</h2>}
          {headerSubtitle && <p style={{ color: '#6c757d' }}>{headerSubtitle}</p>}
        </div>
      )}

      {/* Info Box */}
      {config.autoApprove && (
        <div className="form-card">
          <strong>Why we ask for these settings:</strong>
          <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
            These settings are used to provide accurate information when creating shipping labels, 
            and to help you get the best label for your preferred print method. Please be sure these 
            settings are current and accurate when creating labels to avoid adjustment charges on your labels.
          </p>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={message.includes('Error') ? 'error-alert' : 'success-alert'}>
          {message}
        </div>
      )}

      {/* Dynamic Form */}
      <form onSubmit={handleSubmit}>
        {config.applicationFields.map((section, sectionIndex) => (
          <div key={sectionIndex} className="form-card">
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{section.section}</h3>
            
            {section.description && (
              <p style={{ color: '#6c757d', marginBottom: '20px', fontSize: '14px' }}>
                {section.description}
              </p>
            )}
            
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px' }}>
                  {field.label} {field.required && <span style={{ color: '#dc3545' }}>*</span>}
                </label>
                
                {/* Text Input */}
                {(field.type === 'text' || field.type === 'tel') && (
                  <input 
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
                
                {/* Select Dropdown */}
                {field.type === 'select' && (
                  <select 
                    value={formData[field.name] || field.default || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    {field.options.map((option, optIndex) => (
                      <option key={optIndex} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Checkbox */}
                {field.type === 'checkbox' && (
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input 
                      type="checkbox"
                      checked={formData[field.name] || false}
                      onChange={(e) => handleInputChange(field.name, e.target.checked)}
                      style={{ width: 'auto', marginRight: '10px' }}
                    />
                    <span>{field.label}</span>
                  </label>
                )}
                
                {/* Textarea */}
                {field.type === 'textarea' && (
                  <textarea 
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={field.rows || 4}
                  />
                )}
                
                {/* Media Upload (image or video) */}
                {field.type === 'media' && (
                  <div>
                    <input 
                      type="file"
                      accept={field.name.includes('video') ? 'video/*' : 'image/*'}
                      onChange={handleFileChange(field.name)}
                      required={field.required}
                    />
                    {formData[field.name] instanceof File && (
                      <p style={{ fontSize: '12px', color: '#28a745', margin: '8px 0 0 0', fontWeight: '500' }}>
                        ✓ {formData[field.name].name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        
        {/* Submit Button */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            type="submit"
            disabled={loading}
            style={{
              padding: '15px 40px',
              fontSize: '16px',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Submitting...' : (config.autoApprove ? 'Continue' : 'Submit Application')}
          </button>
        </div>
      </form>
    </div>
  );
}
