'use client';
import { useState, useEffect } from 'react';
import { 
  getHeroData, 
  saveHeroData, 
  uploadHeroVideos, 
  deleteHeroVideo 
} from '../../../../lib/system/api';

/**
 * Hero Settings Component
 * 
 * Manages homepage hero section including:
 * - H1/H3 text content
 * - CTA button text and URL
 * - Hero video uploads (up to 10)
 * - Live preview of hero appearance
 * 
 * Uses v2 API: /api/v2/system/hero/*
 */
export default function HeroSettings() {
  const [heroData, setHeroData] = useState({
    h1Text: '',
    h3Text: '',
    buttonText: '',
    buttonUrl: '',
    videos: []
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeroData();
  }, []);

  const loadHeroData = async () => {
    try {
      setLoading(true);
      const data = await getHeroData();
      setHeroData(data);
    } catch (err) {
      console.log('No existing hero data found, starting fresh');
      // Start with defaults on error
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (field, value) => {
    setHeroData({ ...heroData, [field]: value });
  };

  const handleVideoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const result = await uploadHeroVideos(files);
      // Reload data to get updated videos list
      await loadHeroData();
      setSuccess('Videos uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Upload error:', err.message);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await deleteHeroVideo(videoId);
      setHeroData({ 
        ...heroData, 
        videos: heroData.videos.filter(v => v.id !== videoId) 
      });
      setSuccess('Video deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Delete error:', err.message);
      setError(err.message);
    }
  };

  const handleSaveHero = async () => {
    setSaving(true);
    setError(null);

    try {
      await saveHeroData({
        h1Text: heroData.h1Text,
        h3Text: heroData.h3Text,
        buttonText: heroData.buttonText,
        buttonUrl: heroData.buttonUrl,
        videos: heroData.videos
      });

      setSuccess('Hero data saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Save error:', err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading hero settings...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">{error}</div>
      )}
      {success && (
        <div className="success-alert">{success}</div>
      )}

      {/* Hero Text Content */}
      <div className="form-card">
        <h4 className="form-section-title">Hero Text Content</h4>
        <div className="form-stack">
          <div className="form-group">
            <label className="form-label">H1 Text (Main Heading)</label>
            <input
              type="text"
              value={heroData.h1Text}
              onChange={(e) => handleTextChange('h1Text', e.target.value)}
              placeholder="Enter main heading text"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">H3 Text (Subheading)</label>
            <input
              type="text"
              value={heroData.h3Text}
              onChange={(e) => handleTextChange('h3Text', e.target.value)}
              placeholder="Enter subheading text"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Button Text</label>
            <input
              type="text"
              value={heroData.buttonText}
              onChange={(e) => handleTextChange('buttonText', e.target.value)}
              placeholder="Enter button text"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Button URL</label>
            <input
              type="text"
              value={heroData.buttonUrl}
              onChange={(e) => handleTextChange('buttonUrl', e.target.value)}
              placeholder="Enter button URL (e.g., /products, /artists)"
              className="form-input"
            />
          </div>
          <button 
            onClick={handleSaveHero}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Hero Content'}
          </button>
        </div>
      </div>

      {/* Video Management */}
      <div className="section-box">
        <h4 className="form-section-title">
          Hero Videos ({heroData.videos?.length || 0}/10)
        </h4>
        <p className="text-muted" style={{ marginBottom: '20px' }}>
          Upload up to 10 videos to /static_media. Videos will play in order, looping seamlessly as they load.
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={handleVideoUpload}
            disabled={uploading || (heroData.videos?.length || 0) >= 10}
            className="form-input"
          />
          {uploading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Uploading videos...</p>
            </div>
          )}
          {(heroData.videos?.length || 0) >= 10 && (
            <div className="warning-alert">
              Maximum 10 videos reached. Delete some videos to upload more.
            </div>
          )}
        </div>

        {/* Video List */}
        {heroData.videos?.length > 0 && (
          <div className="grid grid-cols-auto-fill-300">
            {heroData.videos.map((video, index) => (
              <div key={video.id} className="form-card">
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                  <strong>Video {index + 1}</strong>
                  <button 
                    onClick={() => handleDeleteVideo(video.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>
                <video 
                  controls 
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                >
                  <source src={`/static_media/${video.filename}`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
                  {video.filename}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="section-box">
        <h4 className="form-section-title">Hero Preview</h4>
        <div style={{ 
          position: 'relative', 
          height: '400px', 
          backgroundColor: '#000', 
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {heroData.videos?.length > 0 ? (
            <video 
              autoPlay 
              muted 
              loop 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            >
              <source src={`/static_media/${heroData.videos[0].filename}`} type="video/mp4" />
            </video>
          ) : (
            <div style={{ color: '#666', textAlign: 'center' }}>
              <p>No videos uploaded</p>
              <p>Upload videos to see preview</p>
            </div>
          )}
          
          {/* Text Overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            zIndex: 10,
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
          }}>
            {heroData.h1Text && (
              <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                {heroData.h1Text}
              </h1>
            )}
            {heroData.h3Text && (
              <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
                {heroData.h3Text}
              </h3>
            )}
            {heroData.buttonText && (
              <button className="btn btn-primary btn-lg">
                {heroData.buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
