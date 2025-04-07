import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Step.css';

function Step5({ registrationData, onSubmit, isLoading, setIsFormValid }) {
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [headerImage, setHeaderImage] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [headerImagePreview, setHeaderImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const profileInputRef = useRef(null);
  const headerInputRef = useRef(null);
  
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || registrationData?.userId;
  
  // Get user type from registration data
  const userType = registrationData?.user_type || '';
  
  // Effect to update form validity
  useEffect(() => {
    // Photos are optional, so form is always valid
    setIsFormValid(true);
  }, [profilePhoto, headerImage, setIsFormValid]);
  
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Profile photo must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.match('image.*')) {
        setUploadError('Please select an image file');
        return;
      }
      
      setProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setUploadError('');
    }
  };
  
  const handleHeaderImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Header image must be less than 10MB');
        return;
      }
      
      // Validate file type
      if (!file.type.match('image.*')) {
        setUploadError('Please select an image file');
        return;
      }
      
      setHeaderImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setUploadError('');
    }
  };
  
  const uploadFiles = async () => {
    if (!profilePhoto && !headerImage) {
      // No files to upload
      return { profilePhotoUrl: null, headerImageUrl: null };
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const uploadResults = { profilePhotoUrl: null, headerImageUrl: null };
      
      // Upload profile photo
      if (profilePhoto) {
        const formData = new FormData();
        formData.append('productMedia', profilePhoto); // Using existing API which expects this field name
        
        const profileResponse = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });
        
        if (!profileResponse.ok) {
          throw new Error('Failed to upload profile photo');
        }
        
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.files && profileData.files.length > 0) {
          uploadResults.profilePhotoUrl = profileData.files[0].url;
        }
        
        setUploadProgress(50);
      }
      
      // Upload header image
      if (headerImage) {
        const formData = new FormData();
        formData.append('productMedia', headerImage); // Using existing API which expects this field name
        
        const headerResponse = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });
        
        if (!headerResponse.ok) {
          throw new Error('Failed to upload header image');
        }
        
        const headerData = await headerResponse.json();
        if (headerData.success && headerData.files && headerData.files.length > 0) {
          uploadResults.headerImageUrl = headerData.files[0].url;
        }
      }
      
      setUploadProgress(100);
      setIsUploading(false);
      return uploadResults;
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadError(error.message || 'Failed to upload images. Please try again.');
      setIsUploading(false);
      return { profilePhotoUrl: null, headerImageUrl: null };
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let mediaUrls = { profilePhotoUrl: null, headerImageUrl: null };
    
    // Only attempt upload if files were selected
    if (profilePhoto || headerImage) {
      mediaUrls = await uploadFiles();
    }
    
    // Submit data to parent, including any uploaded image URLs
    onSubmit({
      profilePhotoUrl: mediaUrls.profilePhotoUrl,
      headerImageUrl: mediaUrls.headerImageUrl,
      photosComplete: true
    });
  };
  
  return (
    <div className="registration-step">
      <h2>Upload Photos</h2>
      <p className="step-description">
        Add a profile picture and a header image for your profile.
      </p>
      
      {uploadError && (
        <div className="error-message">{uploadError}</div>
      )}
      
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p>Uploading... {uploadProgress}%</p>
        </div>
      )}
      
      <div className="photo-upload-container">
        <div className="profile-photo-upload">
          <h3>Profile Picture</h3>
          <div 
            className={`photo-upload-area ${profilePhotoPreview ? 'has-preview' : ''}`}
            onClick={() => profileInputRef.current?.click()}
          >
            {profilePhotoPreview ? (
              <img src={profilePhotoPreview} alt="Profile preview" className="photo-preview" />
            ) : (
              <>
                <div className="upload-icon">+</div>
                <p>Click to upload</p>
                <p className="upload-hint">(Recommended size: 400x400px)</p>
              </>
            )}
            <input
              type="file"
              ref={profileInputRef}
              accept="image/*"
              onChange={handleProfilePhotoChange}
              style={{ display: 'none' }}
              disabled={isLoading || isUploading}
            />
          </div>
          {profilePhotoPreview && (
            <button 
              type="button" 
              className="remove-photo-btn"
              onClick={(e) => {
                e.stopPropagation();
                setProfilePhoto(null);
                setProfilePhotoPreview('');
              }}
              disabled={isLoading || isUploading}
            >
              Remove
            </button>
          )}
        </div>
        
        <div className="header-image-upload">
          <h3>Header Image</h3>
          <div 
            className={`photo-upload-area header ${headerImagePreview ? 'has-preview' : ''}`}
            onClick={() => headerInputRef.current?.click()}
          >
            {headerImagePreview ? (
              <img src={headerImagePreview} alt="Header preview" className="photo-preview header" />
            ) : (
              <>
                <div className="upload-icon">+</div>
                <p>Click to upload</p>
                <p className="upload-hint">(Recommended size: 1200x300px)</p>
              </>
            )}
            <input
              type="file"
              ref={headerInputRef}
              accept="image/*"
              onChange={handleHeaderImageChange}
              style={{ display: 'none' }}
              disabled={isLoading || isUploading}
            />
          </div>
          {headerImagePreview && (
            <button 
              type="button" 
              className="remove-photo-btn"
              onClick={(e) => {
                e.stopPropagation();
                setHeaderImage(null);
                setHeaderImagePreview('');
              }}
              disabled={isLoading || isUploading}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      
      <div className="photos-note">
        <p><strong>Note:</strong> Photos are optional. You can add or update them later from your profile settings.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Hidden submit button for form submission via the footer button */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </div>
  );
}

export default Step5; 