/**
 * Share Content Component
 * User-facing form for submitting marketing content (images/videos)
 */

import { useState, useEffect, useRef } from 'react';
import { getUserInfo, submitContent, getMySubmissions, getMediaUrl } from '../../../lib/marketing/api';

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
    
    if (selectedFiles.length > 5) {
      setError('Maximum 5 files allowed per submission');
      return;
    }
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    const invalidFiles = selectedFiles.filter(f => !validTypes.includes(f.type));
    
    if (invalidFiles.length > 0) {
      setError('Only images (JPG, PNG, GIF, WebP) and videos (MP4, MOV, WebM) are allowed');
      return;
    }
    
    setFiles(selectedFiles);
    setError('');
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
      <h2>Share Your Content</h2>
      <p className="section-description">
        Submit photos or videos that showcase your work, studio, process, or anything related to your art.
        Your submissions may be featured in our marketing materials.
      </p>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <form onSubmit={handleSubmit} className="content-form">
        {/* User Info (displayed, not editable) */}
        <div className="info-notice">
          <span className="info-item">{userInfo?.email || userData?.email}</span>
          <span className="info-item">{userInfo?.first_name || userData?.first_name} {userInfo?.last_name || userData?.last_name}</span>
          {(userInfo?.business_name || userData?.business_name) && (
            <span className="info-item">{userInfo?.business_name || userData?.business_name}</span>
          )}
        </div>
        
        {/* File Upload */}
        <div className="form-section">
          <h3>Upload Media</h3>
          <p className="help-text">Select up to 5 images or videos (JPG, PNG, GIF, WebP, MP4, MOV, WebM)</p>
          
          <div className="file-upload-area">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
              className="file-input"
            />
            {files.length > 0 && (
              <div className="selected-files">
                <strong>{files.length} file(s) selected:</strong>
                <ul>
                  {files.map((file, index) => (
                    <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
      
      {/* Previous Submissions */}
      {submissions.length > 0 && (
        <div className="submissions-section">
          <h3>Your Previous Submissions</h3>
          <div className="submissions-grid">
            {submissions.map(submission => (
              <div key={submission.id} className="submission-card">
                <div className="submission-header">
                  <span className="submission-date">{formatDate(submission.created_at)}</span>
                  <span className={`submission-status status-${submission.status}`}>
                    {submission.status}
                  </span>
                </div>
                
                {submission.media && submission.media.length > 0 && (
                  <div className="submission-media">
                    {submission.media.map(media => (
                      <div key={media.id} className="media-thumb">
                        {media.media_type === 'video' ? (
                          <video 
                            src={getMediaUrl(media.image_path)} 
                            className="thumb-video"
                          />
                        ) : (
                          <img 
                            src={getMediaUrl(media.image_path)} 
                            alt={media.original_filename}
                            className="thumb-image"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {submission.description && (
                  <p className="submission-description">{submission.description}</p>
                )}
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
        
        .section-description {
          color: #666;
          margin-bottom: 1.5rem;
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
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          background: #fff;
        }
        
        .file-input {
          width: 100%;
        }
        
        .selected-files {
          margin-top: 1rem;
          text-align: left;
        }
        
        .selected-files ul {
          margin: 0.5rem 0 0 1.5rem;
          padding: 0;
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
          gap: 1rem;
        }
        
        .submission-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
        }
        
        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .submission-date {
          color: #666;
          font-size: 0.9rem;
        }
        
        .submission-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          text-transform: capitalize;
        }
        
        .status-pending { background: #fff3cd; color: #856404; }
        .status-reviewed { background: #cce5ff; color: #004085; }
        .status-approved { background: #d4edda; color: #155724; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        
        .submission-media {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }
        
        .media-thumb {
          width: 80px;
          height: 80px;
          overflow: hidden;
          border-radius: 4px;
          background: #f0f0f0;
        }
        
        .thumb-image, .thumb-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .submission-description {
          color: #666;
          font-size: 0.9rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
