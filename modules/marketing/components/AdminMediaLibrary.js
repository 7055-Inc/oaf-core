/**
 * Admin Media Library Component
 * Admin interface for viewing and managing user-submitted marketing content
 */

import { useState, useEffect } from 'react';
import { getAllSubmissions, updateAdminNotes, updateStatus, deleteSubmission, getMediaUrl } from '../../../lib/marketing/api';

export default function AdminMediaLibrary({ userData }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [editingNotes, setEditingNotes] = useState({});
  const [previewMedia, setPreviewMedia] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await getAllSubmissions({ status: statusFilter || undefined });
      
      if (response.success) {
        setSubmissions(response.data);
      } else {
        setError(response.error || 'Failed to load submissions');
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleNotesChange = (id, notes) => {
    setEditingNotes(prev => ({ ...prev, [id]: notes }));
  };

  const saveNotes = async (id) => {
    try {
      const notes = editingNotes[id];
      await updateAdminNotes(id, notes);
      
      // Update local state
      setSubmissions(prev => prev.map(s => 
        s.id === id ? { ...s, admin_notes: notes } : s
      ));
      
      // Clear editing state
      setEditingNotes(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatus(id, newStatus);
      setSubmissions(prev => prev.map(s => 
        s.id === id ? { ...s, status: newStatus } : s
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission? This cannot be undone.')) {
      return;
    }
    
    try {
      await deleteSubmission(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting submission:', err);
      setError('Failed to delete submission');
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

  const downloadMedia = (media) => {
    const url = getMediaUrl(media.image_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = media.original_filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="loading-spinner">Loading submissions...</div>;
  }

  return (
    <div className="admin-media-library">
      <h2>User Media Submissions</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Filters */}
      <div className="filters-bar">
        <label>
          Filter by Status:
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        
        <button onClick={loadSubmissions} className="btn btn-secondary">
          Refresh
        </button>
      </div>
      
      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="no-submissions">
          <p>No submissions found.</p>
        </div>
      ) : (
        <div className="submissions-list">
          {submissions.map(submission => (
            <div key={submission.id} className="submission-item">
              {/* Header */}
              <div className="submission-header">
                <div className="user-info">
                  <strong>{submission.first_name} {submission.last_name}</strong>
                  {submission.business_name && (
                    <span className="business-name">({submission.business_name})</span>
                  )}
                  <span className="email">{submission.email}</span>
                </div>
                <div className="submission-meta">
                  <span className="date">{formatDate(submission.created_at)}</span>
                  <span className="ip">IP: {submission.ip_address}</span>
                </div>
              </div>
              
              {/* Media Grid */}
              {submission.media && submission.media.length > 0 && (
                <div className="media-grid">
                  {submission.media.map(media => (
                    <div key={media.id} className="media-item">
                      <div className="media-preview">
                        {media.media_type === 'video' ? (
                          <video 
                            src={getMediaUrl(media.image_path)} 
                            className="preview-video"
                            onClick={() => setPreviewMedia(media)}
                          />
                        ) : (
                          <img 
                            src={getMediaUrl(media.image_path)} 
                            alt={media.original_filename}
                            className="preview-image"
                            onClick={() => setPreviewMedia(media)}
                          />
                        )}
                      </div>
                      <div className="media-actions">
                        <button 
                          onClick={() => setPreviewMedia(media)}
                          className="btn btn-sm btn-outline"
                          title="Preview"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          onClick={() => downloadMedia(media)}
                          className="btn btn-sm btn-outline"
                          title="Download"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                      </div>
                      <span className="filename">{media.original_filename}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Description */}
              {submission.description && (
                <div className="description-section">
                  <strong>User Notes:</strong>
                  <p>{submission.description}</p>
                </div>
              )}
              
              {/* Admin Notes */}
              <div className="admin-notes-section">
                <strong>In-House Notes:</strong>
                <textarea
                  value={editingNotes[submission.id] ?? submission.admin_notes ?? ''}
                  onChange={(e) => handleNotesChange(submission.id, e.target.value)}
                  placeholder="Add internal notes about this submission..."
                  rows={2}
                  className="admin-notes-input"
                />
                {editingNotes[submission.id] !== undefined && 
                 editingNotes[submission.id] !== submission.admin_notes && (
                  <button 
                    onClick={() => saveNotes(submission.id)}
                    className="btn btn-sm btn-primary save-notes-btn"
                  >
                    Save Notes
                  </button>
                )}
              </div>
              
              {/* Actions */}
              <div className="submission-actions">
                <div className="status-section">
                  <label>Status:</label>
                  <select
                    value={submission.status}
                    onChange={(e) => handleStatusChange(submission.id, e.target.value)}
                    className={`status-select status-${submission.status}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <button 
                  onClick={() => handleDelete(submission.id)}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Preview Modal */}
      {previewMedia && (
        <div className="preview-modal" onClick={() => setPreviewMedia(null)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPreviewMedia(null)}>×</button>
            {previewMedia.media_type === 'video' ? (
              <video 
                src={getMediaUrl(previewMedia.image_path)} 
                controls 
                autoPlay
                className="full-preview-video"
              />
            ) : (
              <img 
                src={getMediaUrl(previewMedia.image_path)} 
                alt={previewMedia.original_filename}
                className="full-preview-image"
              />
            )}
            <div className="preview-info">
              <span>{previewMedia.original_filename}</span>
              <button 
                onClick={() => downloadMedia(previewMedia)}
                className="btn btn-primary"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .admin-media-library {
          padding: 1rem;
        }
        
        .filters-bar {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .filter-select {
          margin-left: 0.5rem;
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .no-submissions {
          text-align: center;
          padding: 3rem;
          color: #666;
        }
        
        .submissions-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .submission-item {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1.5rem;
        }
        
        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .business-name {
          color: #666;
          font-size: 0.9rem;
        }
        
        .email {
          color: #0066cc;
          font-size: 0.9rem;
        }
        
        .submission-meta {
          text-align: right;
          color: #666;
          font-size: 0.85rem;
        }
        
        .submission-meta span {
          display: block;
        }
        
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .media-item {
          text-align: center;
        }
        
        .media-preview {
          width: 100%;
          height: 120px;
          overflow: hidden;
          border-radius: 8px;
          background: #f0f0f0;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .media-preview:hover {
          transform: scale(1.02);
        }
        
        .preview-image, .preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .media-actions {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .filename {
          display: block;
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.25rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .description-section {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .description-section p {
          margin: 0.5rem 0 0;
        }
        
        .admin-notes-section {
          margin-bottom: 1rem;
        }
        
        .admin-notes-input {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          resize: vertical;
        }
        
        .save-notes-btn {
          margin-top: 0.5rem;
        }
        
        .submission-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .status-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-select {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #ddd;
          font-weight: 500;
        }
        
        .status-select.status-pending { background: #fff3cd; }
        .status-select.status-reviewed { background: #cce5ff; }
        .status-select.status-approved { background: #d4edda; }
        .status-select.status-rejected { background: #f8d7da; }
        
        /* Preview Modal */
        .preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .preview-content {
          max-width: 90vw;
          max-height: 90vh;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        
        .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.5);
          color: #fff;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          z-index: 10;
        }
        
        .full-preview-image, .full-preview-video {
          max-width: 100%;
          max-height: 80vh;
          display: block;
        }
        
        .preview-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8f9fa;
        }
        
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }
        
        .btn-outline {
          background: transparent;
          border: 1px solid #ddd;
        }
        
        .btn-outline:hover {
          background: #f0f0f0;
        }
      `}</style>
    </div>
  );
}
