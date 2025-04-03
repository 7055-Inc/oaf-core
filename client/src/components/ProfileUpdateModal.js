import React, { useState } from 'react';
import './ProfileUpdateModal.css';

export default function ProfileUpdateModal({ missingFields, onComplete, onCancel }) {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  // Initialize form data with empty values for missing fields
  React.useEffect(() => {
    const initialData = {};
    missingFields.forEach(field => {
      initialData[field] = '';
    });
    setFormData(initialData);
  }, [missingFields]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/user/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      onComplete();
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Complete Your Profile</h2>
        <p>Please provide the following information to continue:</p>
        
        <form onSubmit={handleSubmit}>
          {missingFields.map(field => (
            <div key={field} className="field-group">
              <label htmlFor={field}>
                {field.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </label>
              <input
                type="text"
                id={field}
                name={field}
                value={formData[field] || ''}
                onChange={handleChange}
                required
              />
            </div>
          ))}
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="button-group">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit">Update Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
} 