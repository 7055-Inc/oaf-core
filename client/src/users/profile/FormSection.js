import React from 'react';
import './ProfileManagement.css';

export const FormSection = ({ title, fields, isEditing, onToggleEdit, onSubmit }) => {
  return (
    <div className="form-section">
      <div className="section-header">
        <h3>{title}</h3>
        <button 
          className="edit-button"
          onClick={onToggleEdit}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      
      {isEditing ? (
        <div className="section-content editing">
          {fields.map((field, index) => (
            <div key={index} className="form-field">
              <label>{field.label}</label>
              <input 
                type="text" 
                value={field.value} 
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <button 
            className="submit-section"
            onClick={onSubmit}
          >
            Save Changes
          </button>
        </div>
      ) : (
        <div className="section-content">
          {fields.map((field, index) => (
            <div key={index} className="field-display">
              <span className="field-label">{field.label}:</span>
              <span className="field-value">{field.value || 'Not provided'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 