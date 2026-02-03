import { useRef } from 'react';
import { useEventForm } from '../EventFormContext';
import { getSmartMediaUrl, config } from '../../../../../lib/config';

export function getImagesSummary(formData) {
  const count = formData.images?.length || 0;
  if (count === 0) return 'No images';
  return `${count} image${count !== 1 ? 's' : ''}`;
}

export default function ImagesSection() {
  const { formData, updateField, uploadImages, saving } = useEventForm();
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await uploadImages(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    updateField('images', newImages);
  };

  return (
    <div>
      {/* SEO Tip */}
      <div className="success-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <i className="fas fa-lightbulb" style={{ marginTop: '2px' }}></i>
        <span>
          <strong>SEO Tip:</strong> Upload 5-10 high-quality images for better search engine performance! 
          Multiple images create rich snippets and boost visibility.
        </span>
      </div>

      {/* Upload Area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '2px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '16px',
          background: '#f8f9fa',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#666' }}>
          {saving ? (
            <>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--primary-color)' }}></i>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '32px', color: 'var(--primary-color)' }}></i>
              <span style={{ fontWeight: '500', color: '#333' }}>Click to upload images</span>
              <small>or drag and drop</small>
            </>
          )}
        </div>
      </div>

      {/* Images Grid */}
      {formData.images && formData.images.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {formData.images.map((url, index) => (
              <div key={index} style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '2px',
                overflow: 'hidden',
                background: '#f5f5f5',
                border: '1px solid #ddd'
              }}>
                <img 
                  src={url.startsWith('/temp_images/') ? `${config.API_BASE_URL}${url}` : getSmartMediaUrl(url)} 
                  alt={`Event image ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button 
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(220, 53, 69, 0.9)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    padding: 0
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
                {index === 0 && (
                  <span style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    padding: '2px 6px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '600',
                    borderRadius: '2px'
                  }}>
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>
            The first image will be used as the primary/featured image.
          </p>
        </>
      )}
    </div>
  );
}
