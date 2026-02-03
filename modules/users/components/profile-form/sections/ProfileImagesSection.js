/**
 * Profile Images Section
 * Profile photo and header image uploads
 */

import { useProfileForm } from '../ProfileFormContext';

export function getImagesSummary(formData, imageFiles) {
  const hasProfile = formData.profile_image_path || imageFiles?.profile_image;
  const hasHeader = formData.header_image_path || imageFiles?.header_image;
  
  if (!hasProfile && !hasHeader) return null;
  
  const parts = [];
  if (hasProfile) parts.push('Profile');
  if (hasHeader) parts.push('Header');
  return parts.join(' + ');
}

function ImageUploadCard({ title, icon, currentPath, file, fieldName, onFileChange }) {
  const displayImage = file ? URL.createObjectURL(file) : currentPath;
  
  return (
    <div className="image-upload-card">
      <div className="image-upload-preview">
        {displayImage ? (
          <img src={displayImage} alt={title} />
        ) : (
          <div className="image-upload-placeholder">
            <i className={`fas ${icon}`}></i>
            <span>{title}</span>
          </div>
        )}
      </div>
      <div className="image-upload-info">
        <strong>{title}</strong>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFileChange(fieldName, e.target.files[0])}
          className="form-input-file"
        />
        {file && (
          <span className="image-upload-selected">
            Selected: {file.name}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProfileImagesSection() {
  const { formData, imageFiles, handleFileChange } = useProfileForm();

  return (
    <div className="form-section">
      <div className="image-upload-grid">
        <ImageUploadCard
          title="Profile Photo"
          icon="fa-user"
          currentPath={formData.profile_image_path}
          file={imageFiles.profile_image}
          fieldName="profile_image"
          onFileChange={handleFileChange}
        />
        
        <ImageUploadCard
          title="Header Image"
          icon="fa-image"
          currentPath={formData.header_image_path}
          file={imageFiles.header_image}
          fieldName="header_image"
          onFileChange={handleFileChange}
        />
      </div>
      
      <p className="form-help-text">
        Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
      </p>
    </div>
  );
}
