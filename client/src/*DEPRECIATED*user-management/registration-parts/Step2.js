import React, { useState, useEffect } from 'react';
import './Step.css';

function Step2({ onSubmit, isLoading, registrationData, setIsFormValid }) {
  const [selectedType, setSelectedType] = useState('');
  const [error, setError] = useState('');

  // Pre-select user type if available in registration data
  useEffect(() => {
    if (registrationData?.user_type) {
      setSelectedType(registrationData.user_type);
    }
  }, [registrationData]);

  // Update form validity when selected type changes
  useEffect(() => {
    setIsFormValid(!!selectedType);
  }, [selectedType, setIsFormValid]);

  // Reordered to Artist, Art Lover, Promoter
  const userTypes = [
    {
      id: 'artist',
      title: 'Artist',
      description: 'I create and sell artwork, such as paintings, sculptures, or digital art.',
      icon: 'fas fa-paint-brush'
    },
    {
      id: 'community',
      title: 'Art Lover',
      description: 'I\'m an art enthusiast, collector, or community member looking to explore and purchase art.',
      icon: 'fas fa-heart'
    },
    {
      id: 'promoter',
      title: 'Promoter',
      description: 'I organize and promote art events, exhibitions, or festivals.',
      icon: 'fas fa-calendar-alt'
    }
  ];

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedType) {
      setError('Please select a user type to continue');
      return;
    }
    // Add debug logging
    console.log('Step2: Submitting user_type:', selectedType);
    // Submit just the selected user type - the container handles updating the registration data
    onSubmit(selectedType);
  };

  return (
    <div className="registration-step">
      <p className="step-description">
        Select the option that best represents how you'll use our platform.
        This will customize your experience.
      </p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} id="step2-form">
        <div className="type-selection-grid">
          {userTypes.map(type => (
            <div
              key={type.id}
              className={`type-card ${selectedType === type.id ? 'selected' : ''}`}
              onClick={() => handleTypeSelect(type.id)}
            >
              <div className="type-icon">
                <i className={type.icon}></i>
              </div>
              <div className="type-content">
                <h3>{type.title}</h3>
                <p>{type.description}</p>
              </div>
              {selectedType === type.id && (
                <div className="selected-indicator">
                  <i className="fas fa-check"></i>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Hidden submit button for form submission */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </div>
  );
}

export default Step2; 