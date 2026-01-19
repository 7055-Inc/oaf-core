'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { createPersona, updatePersona, getPersona, uploadPersonaImage } from '../../../../lib/users/api';
import { getSmartMediaUrl } from '../../../../lib/config';

/**
 * PersonaForm Component
 * Create or edit an artist persona
 */
export default function PersonaForm({ personaId = null }) {
  const router = useRouter();
  const isEditing = !!personaId;
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // For image preview
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [formData, setFormData] = useState({
    persona_name: '',
    display_name: '',
    bio: '',
    specialty: '',
    portfolio_url: '',
    website_url: '',
    instagram_handle: '',
    facebook_url: '',
    profile_image_url: '',
    is_default: false,
  });

  useEffect(() => {
    if (isEditing) {
      loadPersona();
    }
  }, [personaId]);

  const loadPersona = async () => {
    try {
      setLoading(true);
      const persona = await getPersona(personaId);
      
      if (!persona) {
        setError('Persona not found');
        return;
      }
      
      setFormData({
        persona_name: persona.persona_name || '',
        display_name: persona.display_name || '',
        bio: persona.bio || '',
        specialty: persona.specialty || '',
        portfolio_url: persona.portfolio_url || '',
        website_url: persona.website_url || '',
        instagram_handle: persona.instagram_handle || '',
        facebook_url: persona.facebook_url || '',
        profile_image_url: persona.profile_image_url || '',
        is_default: persona.is_default || false,
      });
      
      // Set existing image as preview
      if (persona.profile_image_url) {
        setImagePreview(getSmartMediaUrl(persona.profile_image_url));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, profile_image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.persona_name.trim()) {
      setError('Persona name is required');
      return;
    }
    if (!formData.display_name.trim()) {
      setError('Display name is required');
      return;
    }
    
    // Validate persona_name format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.persona_name)) {
      setError('Persona name can only contain letters, numbers, and underscores');
      return;
    }
    
    try {
      setSaving(true);
      let finalFormData = { ...formData };
      
      // Upload image if a new file was selected
      if (selectedFile) {
        setUploading(true);
        try {
          const imageUrl = await uploadPersonaImage(selectedFile, isEditing ? personaId : null);
          finalFormData.profile_image_url = imageUrl;
        } catch (uploadErr) {
          setError('Failed to upload image: ' + uploadErr.message);
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }
      
      if (isEditing) {
        await updatePersona(personaId, finalFormData);
      } else {
        await createPersona(finalFormData);
      }
      
      // Redirect back to list
      router.push('/dashboard/users/personas');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading persona...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="form-card">
          <h3>Basic Information</h3>
          
          <div className="form-grid-2">
            <div>
              <label className="required">Persona Name</label>
              <input
                type="text"
                name="persona_name"
                value={formData.persona_name}
                onChange={handleChange}
                placeholder="e.g., abstract_artist"
                required
              />
              <div className="form-help">
                Used in URLs and handles. Letters, numbers, and underscores only.
              </div>
            </div>
            <div>
              <label className="required">Display Name</label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="e.g., Abstract Art Studio"
                required
              />
              <div className="form-help">
                How this persona appears to others.
              </div>
            </div>
          </div>

          <div className="form-grid-1">
            <div>
              <label>Specialty</label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="e.g., Oil Paintings, Digital Art, Sculpture"
              />
              <div className="form-help">
                What kind of art does this persona focus on?
              </div>
            </div>
          </div>

          <div className="form-grid-1">
            <div>
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell the story of this artistic persona..."
              />
            </div>
          </div>

          <div className="form-grid-1">
            <div>
              <label className="toggle-slider-container">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                  className="toggle-slider-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {formData.is_default ? 'This is my default persona' : 'Set as default persona'}
                </span>
              </label>
              <div className="form-help" style={{ marginTop: '8px' }}>
                Your default persona will be used automatically for new applications.
              </div>
            </div>
          </div>
        </div>

        {/* Profile Image Upload */}
        <div className="form-card">
          <h3>Profile Image</h3>
          
          <div className="image-upload-box">
            <div 
              className="image-upload-preview"
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" />
              ) : (
                <div className="image-upload-placeholder">
                  <i className="material-icons">add_photo_alternate</i>
                  <span>Click to upload</span>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                className="secondary small"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  className="secondary small"
                  onClick={handleRemoveImage}
                  style={{ color: '#dc2626' }}
                >
                  Remove
                </button>
              )}
            </div>
            
            {uploading && (
              <div style={{ marginTop: '12px', color: '#666' }}>
                <div className="spinner" style={{ display: 'inline-block', marginRight: '8px' }}></div>
                Uploading image...
              </div>
            )}
            
            {selectedFile && (
              <div className="image-upload-filename">
                {selectedFile.name}
              </div>
            )}
            
            <div className="form-help" style={{ marginTop: '12px' }}>
              Recommended: Square image, at least 200x200 pixels. Max 5MB.
            </div>
          </div>
        </div>

        {/* Links & Social */}
        <div className="form-card">
          <h3>Links & Social Media</h3>
          
          <div className="form-grid-2">
            <div>
              <label>Website URL</label>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleChange}
                placeholder="https://mywebsite.com"
              />
            </div>
            <div>
              <label>Portfolio URL</label>
              <input
                type="url"
                name="portfolio_url"
                value={formData.portfolio_url}
                onChange={handleChange}
                placeholder="https://portfolio.com/mywork"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label>Instagram Handle</label>
              <div className="input-group">
                <span className="input-group-addon">@</span>
                <input
                  type="text"
                  name="instagram_handle"
                  value={formData.instagram_handle}
                  onChange={handleChange}
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label>Facebook URL</label>
              <input
                type="url"
                name="facebook_url"
                value={formData.facebook_url}
                onChange={handleChange}
                placeholder="https://facebook.com/page"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-submit-section">
          <button 
            type="button" 
            className="secondary"
            onClick={() => router.push('/dashboard/users/personas')}
          >
            Cancel
          </button>
          <button type="submit" disabled={saving || uploading}>
            {uploading ? 'Uploading...' : saving ? 'Saving...' : isEditing ? 'Update Persona' : 'Create Persona'}
          </button>
        </div>
      </form>
    </div>
  );
}
