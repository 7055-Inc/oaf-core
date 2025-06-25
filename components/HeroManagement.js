'use client';
import { useState, useEffect } from 'react';

export default function HeroManagement() {
  const [heroData, setHeroData] = useState({
    h1Text: '',
    h3Text: '',
    buttonText: '',
    buttonUrl: '',
    videos: []
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadHeroData();
  }, []);

  const loadHeroData = async () => {
    try {
      const res = await fetch('/static_media/hero.json');
      if (res.ok) {
        const data = await res.json();
        setHeroData(data);
      }
    } catch (err) {
      console.log('No existing hero data found, starting fresh');
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
      const formData = new FormData();
      files.forEach(file => {
        formData.append('videos', file);
      });

      const res = await fetch('/api/upload-hero-videos', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to upload videos');
      }

      const data = await res.json();
      setHeroData({ ...heroData, videos: [...heroData.videos, ...data.videos] });
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
      const res = await fetch(`/api/delete-hero-video`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId })
      });

      if (!res.ok) {
        throw new Error('Failed to delete video');
      }

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
    try {
      const res = await fetch('/api/save-hero-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          h1Text: heroData.h1Text,
          h3Text: heroData.h3Text,
          buttonText: heroData.buttonText,
          buttonUrl: heroData.buttonUrl,
          videos: heroData.videos
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save hero data');
      }

      setSuccess('Hero data saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Save error:', err.message);
      setError(err.message);
    }
  };

  return (
    <div>
      <h3>Hero Management</h3>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {/* Hero Text Content */}
      <div style={{ marginBottom: '2rem' }}>
        <h4>Hero Text Content</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              H1 Text (Main Heading):
            </label>
            <input
              type="text"
              value={heroData.h1Text}
              onChange={(e) => handleTextChange('h1Text', e.target.value)}
              placeholder="Enter main heading text"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              H3 Text (Subheading):
            </label>
            <input
              type="text"
              value={heroData.h3Text}
              onChange={(e) => handleTextChange('h3Text', e.target.value)}
              placeholder="Enter subheading text"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Button Text:
            </label>
            <input
              type="text"
              value={heroData.buttonText}
              onChange={(e) => handleTextChange('buttonText', e.target.value)}
              placeholder="Enter button text"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Button URL:
            </label>
            <input
              type="text"
              value={heroData.buttonUrl}
              onChange={(e) => handleTextChange('buttonUrl', e.target.value)}
              placeholder="Enter button URL (e.g., /products, /artists)"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <button 
            onClick={handleSaveHero}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#055474',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Save Hero Content
          </button>
        </div>
      </div>

      {/* Video Management */}
      <div style={{ marginBottom: '2rem' }}>
        <h4>Hero Videos ({heroData.videos.length}/10)</h4>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Upload up to 10 videos to /static_media. Videos will play in order, looping seamlessly as they load.
        </p>
        
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={handleVideoUpload}
            disabled={uploading || heroData.videos.length >= 10}
            style={{ marginBottom: '0.5rem' }}
          />
          {uploading && <p style={{ color: '#666' }}>Uploading videos...</p>}
          {heroData.videos.length >= 10 && (
            <p style={{ color: 'orange' }}>Maximum 10 videos reached. Delete some videos to upload more.</p>
          )}
        </div>

        {/* Video List */}
        {heroData.videos.length > 0 && (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {heroData.videos.map((video, index) => (
              <div key={video.id} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '1rem',
                backgroundColor: '#f9f9f9'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Video {index + 1}</strong>
                  <button 
                    onClick={() => handleDeleteVideo(video.id)}
                    style={{
                      float: 'right',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
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
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                  {video.filename}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{ marginTop: '2rem' }}>
        <h4>Hero Preview</h4>
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
          {heroData.videos.length > 0 ? (
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
              <button style={{
                padding: '1rem 2rem',
                backgroundColor: '#055474',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                {heroData.buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 