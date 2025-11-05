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
      // File validation
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
    
    // Validate
    const errors = validateForm();
    if (errors.length > 0) {
      setMessage('Please fill in all required fields: ' + errors.join(', '));
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Check if we have any file uploads
      const hasFiles = Object.values(formData).some(value => value instanceof File);
      
      // For verified/marketplace applications with media uploads, use /users/me endpoint
      let response;
      if (hasFiles) {
        // Use FormData for file uploads - submit to /users/me which handles media processing
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] instanceof File) {
            // Map field names to jury_ prefix for backend
            const backendFieldName = key.replace('_media_id', '').replace(/_/g, '_');
            submitData.append(`jury_${backendFieldName}`, formData[key]);
          } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
            submitData.append(key, formData[key]);
          }
        });
        
        // Add flag to indicate this is a verified/marketplace application
        submitData.append('verified_application', 'true');
        
        response = await authApiRequest('users/me', {
          method: 'PATCH',
          body: submitData // No Content-Type header - browser sets it with boundary
        });
      } else {
        // Use configured endpoint for non-file submissions
        response = await authApiRequest(config.applicationEndpoint, {
          method: config.applicationMethod || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      
      const data = await handleApiResponse(response);
      
      if (data.success) {
        // Success!
        if (config.autoApprove) {
          // Auto-approved - show success and move on
          setApplicationStatus('auto_approved');
          setMessage('Setup complete!');
          
          // Grant permission and move to next step after brief delay
          setTimeout(() => {
            onComplete();
          }, 1000);
          
        } else {
          // Manual approval - show pending state
          setApplicationStatus('pending');
          setMessage('Application submitted for review. We\'ll notify you within 24-48 hours.');
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
        <div style={{ 
          background: '#fff3cd', 
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ color: '#856404', marginBottom: '10px' }}>
            Application Under Review
          </h2>
          <p style={{ color: '#856404', marginBottom: '20px' }}>
            {message}
          </p>
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
        <div style={{ 
          background: '#d4edda', 
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ color: '#155724', marginBottom: '10px' }}>
            Setup Complete!
          </h2>
          <p style={{ color: '#155724' }}>
            Moving to payment setup...
          </p>
        </div>
      </div>
    );
  }

  // Show the form
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          {config.autoApprove ? 'Complete Your Setup' : 'Submit Application'}
        </h2>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          {config.autoApprove 
            ? 'Please provide your shipping information to continue'
            : 'Fill out the application below and we\'ll review it within 24-48 hours'
          }
        </p>
      </div>

      {/* Info Box */}
      {config.autoApprove && (
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
            These settings are used to provide accurate information when creating shipping labels, 
            and to help you get the best label for your preferred print method. Please be sure these 
            settings are current and accurate when creating labels to avoid adjustment charges on your labels.
          </p>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', 
          border: '1px solid ' + (message.includes('Error') ? '#f5c6cb' : '#c3e6cb'), 
          borderRadius: '4px',
          color: message.includes('Error') ? '#721c24' : '#155724'
        }}>
          {message}
        </div>
      )}

      {/* Dynamic Form */}
      <form onSubmit={handleSubmit}>
        {config.applicationFields.map((section, sectionIndex) => (
          <div key={sectionIndex} className="form-card" style={{
            background: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50' }}>
              {section.section}
            </h3>
            
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex} style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#495057'
                }}>
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
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                )}
                
                {/* Select Dropdown */}
                {field.type === 'select' && (
                  <select 
                    value={formData[field.name] || field.default || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
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
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={formData[field.name] || false}
                      onChange={(e) => handleInputChange(field.name, e.target.checked)}
                      style={{ marginRight: '10px' }}
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
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
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
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'white'
                      }}
                    />
                    {formData[field.name] instanceof File && (
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#28a745', 
                        margin: '8px 0 0 0',
                        fontWeight: '500'
                      }}>
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
              background: loading ? '#ccc' : '#3e1c56',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              minWidth: '200px'
            }}
          >
            {loading ? 'Submitting...' : (config.autoApprove ? 'Continue' : 'Submit Application')}
          </button>
        </div>
      </form>
    </div>
  );
}

