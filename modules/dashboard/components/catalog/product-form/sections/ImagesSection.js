import { useState, useRef } from 'react';
import { useProductForm } from '../ProductFormContext';
import { uploadProductImage } from '../../../../../../lib/catalog';
import { config } from '../../../../../../lib/config';

// Helper to get correct display URL for images
const getDisplayUrl = (image) => {
  const imageUrl = typeof image === 'string' ? image : image.url;
  if (!imageUrl) return '/placeholder-image.png';
  
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  } else if (imageUrl.startsWith('/temp_images/')) {
    // Temp images are served from API server
    return `${config.API_BASE_URL}${imageUrl}`;
  } else if (imageUrl.startsWith('/')) {
    // Other local paths (like /api/media/serve/)
    return imageUrl;
  } else {
    // Media IDs or other formats
    return `/api/media/serve/${imageUrl}`;
  }
};

export default function ImagesSection() {
  const { formData, updateField, savedProductId } = useProductForm();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [editingImage, setEditingImage] = useState(null); // Index of image being edited
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate files before upload
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    for (const file of files) {
      if (file.size > maxFileSize) {
        setUploadError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`File "${file.name}" is not a supported image format. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }
    }

    // Need a saved product to upload images
    if (!savedProductId) {
      setUploadError('Please save the product first before uploading images.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const currentImages = Array.isArray(formData.images) ? formData.images : [];
      const newImages = [];

      // Upload each file using v2 API
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPrimary = currentImages.length === 0 && i === 0;
        const order = currentImages.length + i;
        
        const uploadedImage = await uploadProductImage(savedProductId, file, isPrimary, order);
        
        newImages.push({
          id: uploadedImage.id,
          url: uploadedImage.image_url || uploadedImage.url,
          is_primary: uploadedImage.is_primary,
          friendly_name: '',
          alt_text: ''
        });
      }

      updateField('images', [...currentImages, ...newImages]);
    } catch (err) {
      setUploadError(`Image upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    updateField('images', newImages);
    if (editingImage === index) {
      setEditingImage(null);
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    const newImages = [...formData.images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    updateField('images', newImages);
  };

  const handleImageFieldChange = (index, field, value) => {
    const newImages = [...formData.images];
    newImages[index] = {
      ...newImages[index],
      [field]: value
    };
    updateField('images', newImages);
  };

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '16px' }}>
        Add product images. The first image will be the main product image. Click the edit icon to add descriptions.
      </p>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: uploading ? '#f8f9fa' : 'white',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {uploading ? (
          <div style={{ color: '#666' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}><i className="fas fa-spinner fa-spin"></i></div>
            Uploading...
          </div>
        ) : (
          <>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}><i className="fas fa-camera"></i></div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              Click to upload images
            </div>
            <div style={{ color: '#666', fontSize: '13px' }}>
              or drag and drop files here
            </div>
          </>
        )}
      </div>

      {uploadError && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '6px',
          fontSize: '13px'
        }}>
          {uploadError}
        </div>
      )}

      {/* Image Grid */}
      {formData.images && formData.images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginTop: '20px'
        }}>
          {formData.images.map((image, index) => (
            <div
              key={image.id || index}
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: index === 0 ? '3px solid var(--primary-color, #055474)' : '1px solid #ddd',
                background: '#f8f9fa'
              }}
            >
              {/* Image Preview */}
              <div style={{ paddingTop: '100%', position: 'relative' }}>
                <img
                  src={getDisplayUrl(image)}
                  alt={image.alt_text || `Product ${index + 1}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
              
              {/* Main badge */}
              {index === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'var(--primary-color, #055474)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  MAIN
                </div>
              )}
              
              {/* Action buttons */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                gap: '4px'
              }}>
                {/* Edit button */}
                <button
                  type="button"
                  onClick={() => setEditingImage(editingImage === index ? null : index)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: editingImage === index ? 'var(--primary-color, #055474)' : 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Edit image details"
                >
                  <i className="fas fa-pencil-alt"></i>
                </button>
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Reorder buttons */}
              {formData.images.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  display: 'flex',
                  gap: '4px'
                }}>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index - 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        background: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      ←
                    </button>
                  )}
                  {index < formData.images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index + 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        background: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      →
                    </button>
                  )}
                </div>
              )}

              {/* Edit Panel (shown when editing) */}
              {editingImage === index && (
                <div style={{
                  padding: '8px',
                  background: '#f8f9fa',
                  borderTop: '1px solid #ddd'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      fontWeight: '600',
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      Friendly Name
                    </label>
                    <input
                      type="text"
                      value={image.friendly_name || ''}
                      onChange={(e) => handleImageFieldChange(index, 'friendly_name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      placeholder="e.g., Front View"
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      fontWeight: '600',
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      Broken Image Text (Alt)
                    </label>
                    <input
                      type="text"
                      value={image.alt_text || ''}
                      onChange={(e) => handleImageFieldChange(index, 'alt_text', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      placeholder="Describe image for accessibility"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#666'
      }}>
        Recommended: Square images, at least 1000x1000 pixels. Max 10 images.
      </div>
    </div>
  );
}

// Summary for collapsed state
export function getImagesSummary(formData) {
  const count = formData.images?.length || 0;
  if (count === 0) return null;
  return `${count} image${count !== 1 ? 's' : ''} uploaded`;
}
