/**
 * Share Content Component
 * User-facing form for submitting marketing content (images/videos)
 */

import { useState, useEffect, useRef } from 'react';
import { getUserInfo, submitContent, getMySubmissions } from '../../../lib/marketing/api';

export default function ShareContent({ userData }) {
  const [userInfo, setUserInfo] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [infoResult, submissionsResult] = await Promise.all([
        getUserInfo().catch(err => {
          console.error('Error fetching user info:', err);
          return null;
        }),
        getMySubmissions().catch(err => {
          console.error('Error fetching submissions:', err);
          return null;
        })
      ]);
      
      if (infoResult?.success && infoResult?.data) {
        setUserInfo(infoResult.data);
      }
      
      if (submissionsResult?.success && submissionsResult?.data) {
        setSubmissions(submissionsResult.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    const invalidFiles = selectedFiles.filter(f => !validTypes.includes(f.type));
    
    if (invalidFiles.length > 0) {
      setError('Only images (JPG, PNG, GIF, WebP) and videos (MP4, MOV, WebM) are allowed');
      return;
    }
    
    const combined = [...files, ...selectedFiles];
    if (combined.length > 10) {
      setError('Maximum 10 files allowed per submission');
      return;
    }
    
    setFiles(combined);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!consentChecked) {
      setError('You must agree to the content usage terms to submit');
      return;
    }
    
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('marketing_media', file);
      });
      formData.append('description', description);
      formData.append('consent_given', 'true');
      
      const result = await submitContent(formData);
      
      if (result.success) {
        setSuccess('Content submitted successfully! Thank you for sharing.');
        setFiles([]);
        setDescription('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Reload submissions
        const submissionsResult = await getMySubmissions();
        if (submissionsResult?.success && submissionsResult?.data) {
          setSubmissions(submissionsResult.data);
        }
      } else {
        setError(result.error || 'Failed to submit content');
      }
    } catch (err) {
      console.error('Error submitting:', err);
      setError(err.message || 'Failed to submit content. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="share-content-container">
      <div className="hero-section">
        <h2>Get Featured on Our Socials — Free</h2>
        <p className="hero-lead">
          We actively promote our community across Instagram, Facebook, TikTok, and more.
          Send us your best content and we'll share it with our audience — at no cost to you.
        </p>
        <div className="value-props">
          <div className="value-prop">
            <i className="fas fa-bullhorn"></i>
            <div>
              <strong>Free promotion</strong>
              <span>We feature your content on our social media channels</span>
            </div>
          </div>
          <div className="value-prop">
            <i className="fas fa-camera"></i>
            <div>
              <strong>Show your process</strong>
              <span>Behind-the-scenes, studio shots, finished pieces, event booths — anything goes</span>
            </div>
          </div>
          <div className="value-prop">
            <i className="fas fa-repeat"></i>
            <div>
              <strong>Submit anytime</strong>
              <span>Send us content as often as you like — the more we have, the more we share</span>
            </div>
          </div>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="content-form">
        <div className="info-notice">
          <span className="info-item">{userInfo?.email || userData?.email}</span>
          <span className="info-item">{userInfo?.first_name || userData?.first_name} {userInfo?.last_name || userData?.last_name}</span>
          {(userInfo?.business_name || userData?.business_name) && (
            <span className="info-item">{userInfo?.business_name || userData?.business_name}</span>
          )}
        </div>
        
        <div className="form-section">
          <h3>Upload Media</h3>
          <p className="help-text">Add up to 10 images or videos (JPG, PNG, GIF, WebP, MP4, MOV, WebM). You can select files multiple times to build your list.</p>
          
          <div className="file-upload-area">
            <label className="upload-btn">
              <i className="fas fa-plus"></i> Add Files
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                style={{ display: 'none' }}
              />
            </label>
            <span className="upload-hint">{files.length}/10 files queued</span>
          </div>

          {files.length > 0 && (
            <div className="selected-files">
              {files.map((file, index) => (
                <div key={index} className="file-row">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button type="button" className="file-remove" onClick={() => removeFile(index)} title="Remove">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Description */}
        <div className="form-section">
          <h3>Description</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us about this content - what it shows, where it was taken, who is featured, etc."
            rows={4}
            className="form-textarea"
          />
        </div>
        
        {/* Consent Checkbox */}
        <div className="form-section consent-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            <span>
              I understand any content that I submit on this page may be used for promotional purposes 
              with or without attribution to myself and/or anyone I mention in the description.
            </span>
          </label>
        </div>
        
        {/* Submit Button */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting || !consentChecked || files.length === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Content'}
          </button>
        </div>
      </form>
      
      {submissions.length > 0 && (
        <div className="submissions-section">
          <h3>Your Submissions</h3>
          <div className="submissions-grid">
            {submissions.map(item => (
              <div key={item.id} className="submission-card">
                <div className="submission-thumb">
                  {item.mime_type && item.mime_type.startsWith('video/') ? (
                    <video src={item.thumbnail_url || item.image_url} className="thumb-media" />
                  ) : (
                    <img src={item.thumbnail_url || item.image_url} alt={item.original_filename} className="thumb-media" />
                  )}
                </div>
                <div className="submission-info">
                  <span className="submission-filename">{item.original_filename}</span>
                  <div className="submission-meta">
                    <span className="submission-date">{formatDate(item.created_at)}</span>
                    <span className={`submission-status status-${item.status}`}>{item.status}</span>
                  </div>
                  {item.description && <p className="submission-description">{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .share-content-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .hero-section {
          text-align: center;
          margin-bottom: 2rem;
          padding: 2rem 1.5rem;
          background: linear-gradient(135deg, #055474 0%, #0a7ba8 100%);
          border-radius: 12px;
          color: #fff;
        }
        
        .hero-section h2 {
          font-size: 1.75rem;
          margin: 0 0 0.75rem;
          color: #fff;
        }
        
        .hero-lead {
          font-size: 1.05rem;
          opacity: 0.9;
          max-width: 560px;
          margin: 0 auto 1.5rem;
          line-height: 1.6;
        }
        
        .value-props {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          text-align: left;
          margin-top: 1.5rem;
        }
        
        .value-prop {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          background: rgba(255,255,255,0.12);
          border-radius: 8px;
          padding: 1rem;
        }
        
        .value-prop i {
          font-size: 1.25rem;
          margin-top: 2px;
          opacity: 0.85;
        }
        
        .value-prop strong {
          display: block;
          font-size: 0.95rem;
          margin-bottom: 2px;
        }
        
        .value-prop span {
          font-size: 0.82rem;
          opacity: 0.8;
          line-height: 1.4;
        }
        
        .content-form {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .info-notice {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.5rem;
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          color: #666;
        }
        
        .info-item {
          white-space: nowrap;
        }
        
        .form-section {
          margin-bottom: 1.5rem;
        }
        
        .form-section h3 {
          font-size: 1.1rem;
          margin-bottom: 0.75rem;
          color: #333;
        }
        
        .help-text {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.5rem;
        }
        
        .file-upload-area {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px dashed #ccc;
          border-radius: 8px;
          background: #fff;
        }
        
        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: #055474;
          color: #fff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        
        .upload-btn:hover {
          background: #0a7ba8;
        }
        
        .upload-hint {
          font-size: 0.85rem;
          color: #888;
        }
        
        .selected-files {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        
        .file-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.4rem 0.75rem;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 4px;
          font-size: 0.88rem;
        }
        
        .file-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .file-size {
          color: #888;
          font-size: 0.82rem;
          white-space: nowrap;
        }
        
        .file-remove {
          background: none;
          border: none;
          color: #c00;
          cursor: pointer;
          padding: 0.2rem 0.4rem;
          font-size: 0.9rem;
          line-height: 1;
        }
        
        .file-remove:hover {
          color: #900;
        }
        
        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          resize: vertical;
        }
        
        .consent-section {
          background: #fff3cd;
          padding: 1rem;
          border-radius: 4px;
          border: 1px solid #ffc107;
        }
        
        .checkbox-label {
          display: flex;
          gap: 0.75rem;
          cursor: pointer;
          align-items: flex-start;
        }
        
        .checkbox-label input {
          margin-top: 0.25rem;
        }
        
        .form-actions {
          text-align: center;
          padding-top: 1rem;
        }
        
        .submissions-section {
          margin-top: 2rem;
        }
        
        .submissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }
        
        .submission-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .submission-thumb {
          width: 100%;
          aspect-ratio: 1;
          background: #f0f0f0;
          overflow: hidden;
        }
        
        .thumb-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        
        .submission-info {
          padding: 0.6rem 0.75rem;
        }
        
        .submission-filename {
          font-size: 0.8rem;
          color: #333;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 0.3rem;
        }
        
        .submission-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .submission-date {
          color: #888;
          font-size: 0.75rem;
        }
        
        .submission-status {
          padding: 0.15rem 0.5rem;
          border-radius: 20px;
          font-size: 0.7rem;
          text-transform: capitalize;
        }
        
        .status-pending { background: #fff3cd; color: #856404; }
        .status-reviewed { background: #cce5ff; color: #004085; }
        .status-approved { background: #d4edda; color: #155724; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        
        .submission-description {
          color: #666;
          font-size: 0.8rem;
          margin: 0.4rem 0 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
