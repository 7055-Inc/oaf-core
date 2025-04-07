import React, { useState, useEffect } from 'react';
import './Step.css';

// Art categories and mediums options
const ART_CATEGORIES = [
  { id: 'painting', label: 'Painting' },
  { id: 'sculpture', label: 'Sculpture' },
  { id: 'photography', label: 'Photography' },
  { id: 'digital', label: 'Digital Art' },
  { id: 'mixed_media', label: 'Mixed Media' },
  { id: 'drawing', label: 'Drawing' },
  { id: 'printmaking', label: 'Printmaking' },
  { id: 'ceramics', label: 'Ceramics' },
  { id: 'textile', label: 'Textile Art' },
  { id: 'glass', label: 'Glass Art' },
  { id: 'jewelry', label: 'Jewelry' }
];

const ART_MEDIUMS = [
  { id: 'oil', label: 'Oil' },
  { id: 'acrylic', label: 'Acrylic' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'charcoal', label: 'Charcoal' },
  { id: 'pencil', label: 'Pencil' },
  { id: 'ink', label: 'Ink' },
  { id: 'digital_media', label: 'Digital Media' },
  { id: 'metal', label: 'Metal' },
  { id: 'wood', label: 'Wood' },
  { id: 'clay', label: 'Clay' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'glass_medium', label: 'Glass' },
  { id: 'stone', label: 'Stone' },
  { id: 'mixed', label: 'Mixed Media' }
];

function Step4({ registrationData, onSubmit, isLoading, setIsFormValid }) {
  const [specificData, setSpecificData] = useState({});
  const [errors, setErrors] = useState({});
  
  // Get user type from registration data
  const userType = registrationData?.user_type || '';
  
  console.log('CRITICAL DEBUG - Step 4 - Registration data received:', JSON.stringify(registrationData));
  console.log('CRITICAL DEBUG - Step 4 - user_type received:', userType);
  
  // Initialize form with any existing data
  useEffect(() => {
    if (registrationData?.specificProfile) {
      setSpecificData(registrationData.specificProfile || {});
    } else {
      // Initialize with default empty structure based on user type
      const defaultData = {
        // Common fields
        socialLinks: { 
          website: '',
          instagram: '',
          facebook: '',
          twitter: '',
          tiktok: '',
          pinterest: ''
        },
        
        // Artist-specific fields
        ...(userType === 'artist' && {
          artCategories: [],
          artMediums: [],
          businessName: '',
          studioAddress: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            zip: ''
          },
          artistBiography: '',
          businessPhone: '',
          doesCustom: 'no',
          customerServiceEmail: ''
        }),
        
        // Promoter-specific fields
        ...(userType === 'promoter' && {
          venues: [],
          eventTypes: [],
          capacity: '',
          facilities: []
        }),
        
        // Community-specific fields
        ...(userType === 'community' && {
          interests: [],
          favoriteArtists: [],
          attendingEvents: []
        })
      };
      
      setSpecificData(defaultData);
    }
  }, [registrationData, userType]);
  
  // Update form validity based on user type
  useEffect(() => {
    let isValid = true;
    
    // Validation rules based on user type
    if (userType === 'artist') {
      isValid = specificData.businessName && specificData.artistBiography && 
               specificData.studioAddress && specificData.studioAddress.city &&
               specificData.artCategories && specificData.artCategories.length > 0;
    } else if (userType === 'promoter') {
      isValid = specificData.eventTypes && specificData.eventTypes.length > 0;
    } else if (userType === 'community') {
      // No specific validation for community user type
      isValid = true;
    }
    
    // Social links are optional, so not checking them for validation
    
    setIsFormValid(isValid);
  }, [specificData, userType, setIsFormValid]);
  
  // Handle form field changes
  const handleChange = (field, value) => {
    setSpecificData({
      ...specificData,
      [field]: value
    });
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  // Handle multi-select checkbox changes
  const handleCheckboxChange = (field, itemId, isChecked) => {
    const currentValues = specificData[field] || [];
    
    let newValues;
    if (isChecked) {
      // Add to array if not already included
      newValues = currentValues.includes(itemId) 
        ? currentValues 
        : [...currentValues, itemId];
    } else {
      // Remove from array
      newValues = currentValues.filter(id => id !== itemId);
    }
    
    setSpecificData({
      ...specificData,
      [field]: newValues
    });
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };
  
  // Handle changes to nested social links
  const handleSocialChange = (network, value) => {
    setSpecificData({
      ...specificData,
      socialLinks: {
        ...specificData.socialLinks,
        [network]: value
      }
    });
  };
  
  // Handle changes to nested studio address fields
  const handleAddressChange = (field, value) => {
    setSpecificData({
      ...specificData,
      studioAddress: {
        ...specificData.studioAddress,
        [field]: value
      }
    });
    
    // Clear error for this field if it exists
    if (errors[`studioAddress.${field}`]) {
      setErrors({
        ...errors,
        [`studioAddress.${field}`]: null
      });
    }
  };
  
  // Validate form based on user type
  const validateForm = () => {
    const newErrors = {};
    
    // Common validation for all user types
    
    // Specific validation based on user type
    if (userType === 'artist') {
      // Validate artist-specific fields
      if (!specificData.businessName) {
        newErrors.businessName = 'Please enter your business name or artist name';
      }
      
      if (!specificData.artistBiography) {
        newErrors.artistBiography = 'Please provide a brief artist biography';
      }
      
      if (!specificData.studioAddress.city) {
        newErrors['studioAddress.city'] = 'Please enter your city';
      }
      
      if (!specificData.studioAddress.state) {
        newErrors['studioAddress.state'] = 'Please enter your state';
      }

      if (!specificData.artCategories || specificData.artCategories.length === 0) {
        newErrors.artCategories = 'Please select at least one art category';
      }
    } else if (userType === 'promoter') {
      // Validate promoter-specific fields
      if (!specificData.eventTypes || specificData.eventTypes.length === 0) {
        newErrors.eventTypes = 'Please select at least one event type';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(specificData);
    }
  };

  // Render checkbox group for categories or mediums
  const renderCheckboxGroup = (options, fieldName, errorKey) => (
    <div className="checkbox-group">
      {options.map(option => (
        <label key={option.id} className="checkbox-label">
          <input
            type="checkbox"
            checked={specificData[fieldName]?.includes(option.id) || false}
            onChange={(e) => handleCheckboxChange(fieldName, option.id, e.target.checked)}
            disabled={isLoading}
          />
          {option.label}
        </label>
      ))}
      {errors[errorKey] && <div className="field-error">{errors[errorKey]}</div>}
    </div>
  );
  
  // Render artist-specific form
  const renderArtistForm = () => (
    <>
      <div className="form-field">
        <label htmlFor="businessName" className="required-field">Business/Artist Name</label>
        <input
          type="text"
          id="businessName"
          value={specificData.businessName || ''}
          onChange={(e) => handleChange('businessName', e.target.value)}
          placeholder="Your business name or artist name"
          disabled={isLoading}
        />
        {errors.businessName && <div className="field-error">{errors.businessName}</div>}
      </div>
      
      <div className="form-section">
        <h4>Studio Address</h4>
        <div className="form-field">
          <label htmlFor="studioAddressLine1">Address Line 1</label>
          <input
            type="text"
            id="studioAddressLine1"
            value={specificData.studioAddress?.line1 || ''}
            onChange={(e) => handleAddressChange('line1', e.target.value)}
            placeholder="Street address"
            disabled={isLoading}
          />
        </div>
        
        <div className="form-field">
          <label htmlFor="studioAddressLine2">Address Line 2</label>
          <input
            type="text"
            id="studioAddressLine2"
            value={specificData.studioAddress?.line2 || ''}
            onChange={(e) => handleAddressChange('line2', e.target.value)}
            placeholder="Apt, Suite, Building (optional)"
            disabled={isLoading}
          />
        </div>
        
        <div className="city-state-zip">
          <div className="form-field">
            <label htmlFor="studioCity" className="required-field">City</label>
            <input
              type="text"
              id="studioCity"
              value={specificData.studioAddress?.city || ''}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder="City"
              disabled={isLoading}
            />
            {errors['studioAddress.city'] && <div className="field-error">{errors['studioAddress.city']}</div>}
          </div>
          
          <div className="form-field">
            <label htmlFor="studioState" className="required-field">State</label>
            <input
              type="text"
              id="studioState"
              value={specificData.studioAddress?.state || ''}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              placeholder="State"
              disabled={isLoading}
            />
            {errors['studioAddress.state'] && <div className="field-error">{errors['studioAddress.state']}</div>}
          </div>
          
          <div className="form-field">
            <label htmlFor="studioZip">ZIP</label>
            <input
              type="text"
              id="studioZip"
              value={specificData.studioAddress?.zip || ''}
              onChange={(e) => handleAddressChange('zip', e.target.value)}
              placeholder="ZIP Code"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
      
      <div className="form-field">
        <label htmlFor="artistBiography" className="required-field">Artist Biography</label>
        <textarea
          id="artistBiography"
          value={specificData.artistBiography || ''}
          onChange={(e) => handleChange('artistBiography', e.target.value)}
          placeholder="Tell us about yourself as an artist"
          rows={4}
          disabled={isLoading}
        />
        {errors.artistBiography && <div className="field-error">{errors.artistBiography}</div>}
      </div>
      
      <div className="form-field">
        <label htmlFor="artCategories" className="required-field">Art Categories</label>
        <p className="field-description">Select the categories that best describe your art</p>
        {renderCheckboxGroup(ART_CATEGORIES, 'artCategories', 'artCategories')}
      </div>
      
      <div className="form-field">
        <label htmlFor="artMediums">Art Mediums</label>
        <p className="field-description">Select the mediums you work with</p>
        {renderCheckboxGroup(ART_MEDIUMS, 'artMediums', 'artMediums')}
      </div>
      
      <div className="form-field">
        <label htmlFor="businessPhone">Business Phone</label>
        <input
          type="tel"
          id="businessPhone"
          value={specificData.businessPhone || ''}
          onChange={(e) => handleChange('businessPhone', e.target.value)}
          placeholder="(xxx) xxx-xxxx"
          disabled={isLoading}
        />
      </div>
      
      <div className="form-field">
        <label htmlFor="customerServiceEmail">Customer Service Email</label>
        <input
          type="email"
          id="customerServiceEmail"
          value={specificData.customerServiceEmail || ''}
          onChange={(e) => handleChange('customerServiceEmail', e.target.value)}
          placeholder="customer-service@example.com"
          disabled={isLoading}
        />
      </div>
      
      <div className="form-field">
        <label htmlFor="doesCustom">Do you accept custom/commission work?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="doesCustom"
              value="yes"
              checked={specificData.doesCustom === 'yes'}
              onChange={() => handleChange('doesCustom', 'yes')}
              disabled={isLoading}
            />
            Yes
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="doesCustom"
              value="no"
              checked={specificData.doesCustom === 'no'}
              onChange={() => handleChange('doesCustom', 'no')}
              disabled={isLoading}
            />
            No
          </label>
        </div>
      </div>
    </>
  );
  
  // Render promoter-specific form
  const renderPromoterForm = () => (
    <>
      <h3>Promoter Details</h3>
      <p>Tell us about your art exhibitions and events.</p>
      
      <div className="form-field">
        <label>Event Types</label>
        <p className="field-placeholder">Event types selection UI would go here</p>
        {errors.eventTypes && <div className="field-error">{errors.eventTypes}</div>}
      </div>
      
      <div className="form-field">
        <label>Exhibition Spaces</label>
        <p className="field-placeholder">Exhibition spaces input UI would go here</p>
      </div>
      
      <div className="form-field">
        <label>Capacity</label>
        <input
          type="text"
          value={specificData.capacity || ''}
          onChange={(e) => handleChange('capacity', e.target.value)}
          placeholder="Exhibition capacity"
          disabled={isLoading}
        />
      </div>
    </>
  );
  
  // Render community-specific form
  const renderCommunityForm = () => (
    <>
      <h3>Art Lover Details</h3>
      <p>Tell us about your art interests.</p>
      
      <div className="form-field">
        <label>Interests</label>
        <p className="field-placeholder">Interests selection UI would go here</p>
      </div>
      
      <div className="form-field">
        <label>Favorite Artists</label>
        <p className="field-placeholder">Artists selection UI would go here</p>
      </div>
    </>
  );
  
  // Render social links section (common to all user types)
  const renderSocialLinks = () => (
    <>
      <h3>Social Media & Web Presence</h3>
      <p>Connect your online profiles to showcase your art and events.</p>
      
      <div className="form-field">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          value={specificData.socialLinks?.website || ''}
          onChange={(e) => handleSocialChange('website', e.target.value)}
          placeholder="https://your-website.com"
          disabled={isLoading}
        />
      </div>
      
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="instagram">Instagram</label>
          <input
            type="text"
            id="instagram"
            value={specificData.socialLinks?.instagram || ''}
            onChange={(e) => handleSocialChange('instagram', e.target.value)}
            placeholder="@username"
            disabled={isLoading}
          />
        </div>
        
        <div className="form-field">
          <label htmlFor="facebook">Facebook</label>
          <input
            type="text"
            id="facebook"
            value={specificData.socialLinks?.facebook || ''}
            onChange={(e) => handleSocialChange('facebook', e.target.value)}
            placeholder="@username or page URL"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="twitter">Twitter</label>
          <input
            type="text"
            id="twitter"
            value={specificData.socialLinks?.twitter || ''}
            onChange={(e) => handleSocialChange('twitter', e.target.value)}
            placeholder="@username"
            disabled={isLoading}
          />
        </div>
        
        <div className="form-field">
          <label htmlFor="tiktok">TikTok</label>
          <input
            type="text"
            id="tiktok"
            value={specificData.socialLinks?.tiktok || ''}
            onChange={(e) => handleSocialChange('tiktok', e.target.value)}
            placeholder="@username"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="pinterest">Pinterest</label>
        <input
          type="text"
          id="pinterest"
          value={specificData.socialLinks?.pinterest || ''}
          onChange={(e) => handleSocialChange('pinterest', e.target.value)}
          placeholder="@username"
          disabled={isLoading}
        />
      </div>
    </>
  );
  
  // Determine which form to render based on user type
  let formContent;
  
  if (userType === 'artist') {
    formContent = (
      <>
        {renderArtistForm()}
        {renderSocialLinks()}
      </>
    );
  } else if (userType === 'promoter') {
    formContent = (
      <>
        {renderPromoterForm()}
        {renderSocialLinks()}
      </>
    );
  } else if (userType === 'community') {
    formContent = (
      <>
        {renderCommunityForm()}
        {renderSocialLinks()}
      </>
    );
  }
  
  return (
    <div className="registration-step">
      {Object.keys(errors).length > 0 && (
        <div className="error-message">
          Please correct the errors below to continue.
        </div>
      )}
      
      <form onSubmit={handleSubmit} id="step4-form">
        {formContent}
        
        {/* Hidden submit button for form submission */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </div>
  );
}

export default Step4; 