// client/src/user-management/registration-parts/Step3.js
import React, { useState, useEffect } from 'react';
import './Step.css';
import { CountrySelect, StateSelect } from '../../components/AddressSelects';

function Step3({ registrationData, onSubmit, isLoading, setIsFormValid }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState({});

  const userType = registrationData?.user_type || '';
  
  // Load existing profile data if available
  useEffect(() => {
    if (registrationData?.basicProfile) {
      const profile = registrationData.basicProfile;
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setAddressLine1(profile.addressLine1 || '');
      setAddressLine2(profile.addressLine2 || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setPostalCode(profile.postalCode || '');
      setCountry(profile.country || '');
    }
  }, [registrationData]);

  // Update form validity whenever form fields change
  useEffect(() => {
    // Check if all required fields are filled
    const isValid = 
      firstName.trim() !== '' && 
      lastName.trim() !== '' && 
      displayName.trim() !== '' && 
      city.trim() !== '' && 
      state.trim() !== '' && 
      country.trim() !== '';
    
    // If phone is provided, validate it
    const phoneValid = phone === '' || 
      (phone && /^\+?[0-9\s-]{10,15}$/.test(phone) && phone.replace(/[^0-9]/g, '').length >= 10);
    
    // If postal code is provided, validate it
    const postalValid = postalCode === '' || 
      (postalCode && /^[0-9A-Za-z\s-]{3,20}$/.test(postalCode));

    // Set form validity based on all validations
    setIsFormValid(isValid && phoneValid && postalValid);
  }, [firstName, lastName, displayName, phone, city, state, postalCode, country, setIsFormValid]);

  const validateForm = () => {
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (phone) {
      const digitsOnly = phone.replace(/[^0-9]/g, '');
      if (!/^\+?[0-9\s-]{10,15}$/.test(phone) || digitsOnly.length < 10) {
        newErrors.phone = 'Please enter a valid phone number (at least 10 digits, e.g., +1234567890 or 123-456-7890)';
      }
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!state.trim()) {
      newErrors.state = 'State/Province is required';
    }

    if (!country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (postalCode && !/^[0-9A-Za-z\s-]{3,20}$/.test(postalCode)) {
      newErrors.postalCode = 'Please enter a valid postal code (e.g., 12345 or 12345-6789)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        firstName,
        lastName,
        displayName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
      });
    }
  };

  // Handle country change and reset state if country changes
  const handleCountryChange = (newCountry) => {
    setCountry(newCountry);
    if (state) {
      setState('');
    }
  };

  return (
    <div className="registration-step">
      <p className="step-description">
        Tell us a bit about yourself. This information will help create your profile.
        {userType === 'artist' && ' As an artist, your profile will showcase your artwork and creations.'}
        {userType === 'promoter' && ' As a promoter, your profile will highlight your art events and exhibitions.'}
        {userType === 'community' && ' As an art lover, your profile will help you connect with artists and events.'}
      </p>

      {Object.keys(errors).length > 0 && (
        <div className="error-message">
          Please correct the errors below to continue.
        </div>
      )}

      <form onSubmit={handleSubmit} id="step3-form">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setErrors({ ...errors, firstName: null });
              }}
              placeholder="Your first name"
              disabled={isLoading}
            />
            {errors.firstName && <div className="field-error">{errors.firstName}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="lastName">Last Name *</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setErrors({ ...errors, lastName: null });
              }}
              placeholder="Your last name"
              disabled={isLoading}
            />
            {errors.lastName && <div className="field-error">{errors.lastName}</div>}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="displayName">Display Name / Stage Name *</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setErrors({ ...errors, displayName: null });
            }}
            placeholder="How you want to be known on the platform"
            disabled={isLoading}
          />
          {errors.displayName && <div className="field-error">{errors.displayName}</div>}
          <div className="field-hint">
            This will be visible to other users and appear in search results.
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="phone">Phone Number (Optional)</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors({ ...errors, phone: null });
            }}
            placeholder="Your contact number"
            disabled={isLoading}
          />
          {errors.phone && <div className="field-error">{errors.phone}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="addressLine1">Address Line 1 (Optional)</label>
          <input
            type="text"
            id="addressLine1"
            value={addressLine1}
            onChange={(e) => {
              setAddressLine1(e.target.value);
              setErrors({ ...errors, addressLine1: null });
            }}
            placeholder="Street address (e.g., 123 Main St)"
            disabled={isLoading}
          />
          {errors.addressLine1 && <div className="field-error">{errors.addressLine1}</div>}
        </div>

        <div className="form-field">
          <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
          <input
            type="text"
            id="addressLine2"
            value={addressLine2}
            onChange={(e) => {
              setAddressLine2(e.target.value);
              setErrors({ ...errors, addressLine2: null });
            }}
            placeholder="Apartment, suite, etc. (e.g., Apt 4B)"
            disabled={isLoading}
          />
          {errors.addressLine2 && <div className="field-error">{errors.addressLine2}</div>}
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="city">City *</label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setErrors({ ...errors, city: null });
              }}
              placeholder="Your city (e.g., New York)"
              disabled={isLoading}
            />
            {errors.city && <div className="field-error">{errors.city}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="postalCode">Postal Code (Optional)</label>
            <input
              type="text"
              id="postalCode"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                setErrors({ ...errors, postalCode: null });
              }}
              placeholder="Your postal code (e.g., 10001)"
              disabled={isLoading}
            />
            {errors.postalCode && <div className="field-error">{errors.postalCode}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="country">Country *</label>
            <CountrySelect
              value={country}
              onChange={(value) => {
                handleCountryChange(value);
                setErrors({ ...errors, country: null });
              }}
              isDisabled={isLoading}
              placeholder="Select your country"
            />
            {errors.country && <div className="field-error">{errors.country}</div>}
          </div>

          <div className="form-field">
            <label htmlFor="state">State/Province *</label>
            <StateSelect
              countryCode={country}
              value={state}
              onChange={(value) => {
                setState(value);
                setErrors({ ...errors, state: null });
              }}
              isDisabled={isLoading || !country}
              placeholder="Select state/province"
            />
            {errors.state && <div className="field-error">{errors.state}</div>}
          </div>
        </div>

        {/* Hidden submit button for form submission */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </div>
  );
}

export default Step3;