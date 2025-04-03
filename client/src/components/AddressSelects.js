import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import countries from '../data/countries';
import { getStatesByCountry } from '../data/states';

// Custom styles for React Select to match our app design
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    height: '40px',
    borderRadius: '0',
    border: '1px solid #ddd',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(5, 84, 116, 0.2)' : 'none',
    '&:hover': {
      border: '1px solid #aaa'
    }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#055474' : state.isFocused ? '#f5f5f5' : null,
    color: state.isSelected ? 'white' : '#333',
    fontSize: '0.9rem',
    padding: '8px 12px'
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '0',
    marginTop: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#aaa',
    fontSize: '0.9rem'
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: '0.9rem'
  })
};

/**
 * Country Select Component
 * Reusable dropdown for country selection
 */
export const CountrySelect = ({ value, onChange, isDisabled = false, placeholder = 'Select country' }) => {
  // Find the full country object based on the value
  const selectedCountry = value 
    ? countries.find(country => country.value === value) 
    : null;
  
  return (
    <Select
      value={selectedCountry}
      onChange={(option) => onChange(option ? option.value : '')}
      options={countries}
      styles={customStyles}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isSearchable={true}
      className="react-select-container"
      classNamePrefix="react-select"
    />
  );
};

/**
 * State Select Component
 * Reusable dropdown for state/province selection based on selected country
 */
export const StateSelect = ({ countryCode, value, onChange, isDisabled = false, placeholder = 'Select state/province' }) => {
  const [stateOptions, setStateOptions] = useState([]);
  
  // Update state options when country changes
  useEffect(() => {
    if (countryCode) {
      setStateOptions(getStatesByCountry(countryCode));
    } else {
      setStateOptions([]);
    }
  }, [countryCode]);
  
  // Find the full state object based on the value
  const selectedState = value && stateOptions.length > 0
    ? stateOptions.find(state => state.value === value)
    : null;
    
  return (
    <Select
      value={selectedState}
      onChange={(option) => onChange(option ? option.value : '')}
      options={stateOptions}
      styles={customStyles}
      placeholder={placeholder}
      isDisabled={isDisabled || !countryCode || stateOptions.length === 0}
      isSearchable={true}
      className="react-select-container" 
      classNamePrefix="react-select"
      noOptionsMessage={() => countryCode 
        ? "No states available for this country" 
        : "Select a country first"
      }
    />
  );
};

/**
 * AddressSelectGroup Component
 * Component that combines both country and state selects with proper interaction
 */
const AddressSelectGroup = ({ 
  countryValue,
  stateValue,
  onCountryChange,
  onStateChange,
  isDisabled = false,
  countryPlaceholder = 'Select country',
  statePlaceholder = 'Select state/province'
}) => {
  // Handle country change and reset state if country changes
  const handleCountryChange = (newCountryCode) => {
    onCountryChange(newCountryCode);
    // Reset state if country changes
    if (stateValue) {
      onStateChange('');
    }
  };
  
  return (
    <div className="address-select-group">
      <div className="form-field">
        <label htmlFor="country">Country *</label>
        <CountrySelect
          value={countryValue}
          onChange={handleCountryChange}
          isDisabled={isDisabled}
          placeholder={countryPlaceholder}
        />
      </div>
      
      <div className="form-field">
        <label htmlFor="state">State/Province *</label>
        <StateSelect
          countryCode={countryValue}
          value={stateValue}
          onChange={onStateChange}
          isDisabled={isDisabled}
          placeholder={statePlaceholder}
        />
      </div>
    </div>
  );
};

export default AddressSelectGroup; 