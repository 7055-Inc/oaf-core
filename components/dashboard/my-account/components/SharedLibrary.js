/**
 * SharedLibrary Component
 * User-facing file upload and management for Shared Library feature
 * Two sections: My Media (available files) and Processing Status (scanning/quarantined)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import slideInStyles from '../../SlideIn.module.css';
import styles from './SharedLibrary.module.css';

const STATUS_CONFIG = {
  uploading: { icon: '🔄', label: 'Uploading', color: '#3498db' },
  scanning: { icon: '🔍', label: 'Scanning', color: '#f39c12' },
  available: { icon: '✅', label: 'Available', color: '#27ae60' },
  quarantined: { icon: '⚠️', label: 'Quarantined', color: '#e74c3c' },
  deleted: { icon: '🗑️', label: 'Deleted', color: '#95a5a6' }
};

const FILE_TYPE_ICONS = {
  'image': '🖼️',
  'video': '🎬',
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text': '📃',
  'default': '📁'
};

function getFileIcon(mimeType) {
  if (!mimeType) return FILE_TYPE_ICONS.default;
  if (mimeType.startsWith('image/')) return FILE_TYPE_ICONS.image;
  if (mimeType.startsWith('video/')) return FILE_TYPE_ICONS.video;
  if (mimeType.startsWith('text/')) return FILE_TYPE_ICONS.text;
  return FILE_TYPE_ICONS[mimeType] || FILE_TYPE_ICONS.default;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return formatDate(dateString);
}

export default function SharedLibrary({ userData }) {
  const [availableFiles, setAvailableFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState([]);
  const [counts, setCounts] = useState({ available_count: 0, scanning_count: 0, quarantined_count: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const fileInputRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const fetchUploads = useCallback(async () => {
    try {
      const response = await authApiRequest('files/my-uploads', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableFiles(data.available || []);
        setProcessingFiles(data.processing || []);
        setCounts(data.counts || { available_count: 0, scanning_count: 0, quarantined_count: 0 });
      }
    } catch (err) {
      console.error('Error fetching uploads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();

    // Poll for updates while there are files being processed
    refreshIntervalRef.current = setInterval(() => {
      fetchUploads();
    }, 5000); // Every 5 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchUploads]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;
    if (files.length > 10) {
      setError('Maximum 10 files per upload');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    if (note.trim()) {
      formData.append('note', note.trim());
    }

    try {
      const response = await authApiRequest('files/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setNote('');
        fetchUploads();
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await authApiRequest(`files/download/${fileId}`, {
        method: 'GET'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Download failed');
      }
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      const response = await authApiRequest(`files/${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchUploads();
        setDeleteConfirm(null);
      } else {
        setError('Delete failed');
      }
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className={slideInStyles.slideInBody}>
        <div className={styles.loadingState}>Loading your library...</div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.slideInBody}>
      {/* Upload Area */}
      <div className={styles.uploadSection}>
        <div 
          className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''} ${uploading ? styles.uploading : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className={styles.fileInput}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          
          {uploading ? (
            <div className={styles.uploadingState}>
              <div className={styles.spinner}></div>
              <p>Uploading files...</p>
            </div>
          ) : (
            <>
              <div className={styles.dropIcon}>📁</div>
              <p className={styles.dropText}>
                Drag & drop files here, or <span className={styles.browseLink}>click to browse</span>
              </p>
              <p className={styles.dropHint}>
                Images, Videos, Documents (max 500MB per file, 10 files max)
              </p>
            </>
          )}
        </div>

        <div className={styles.noteField}>
          <input
            type="text"
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={styles.noteInput}
            disabled={uploading}
          />
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
            <button onClick={() => setError(null)} className={styles.dismissError}>×</button>
          </div>
        )}
      </div>

      {/* My Media Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span>📚 My Media</span>
          <span className={styles.badge}>{counts.available_count || 0}</span>
        </h3>

        {availableFiles.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No files uploaded yet. Upload your first file above!</p>
          </div>
        ) : (
          <div className={styles.fileList}>
            {availableFiles.map((file) => (
              <div key={file.id} className={styles.fileRow}>
                <div className={styles.fileIcon}>{getFileIcon(file.mime_type)}</div>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{file.original_name}</div>
                  <div className={styles.fileMeta}>
                    {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                    {file.note && <span className={styles.fileNote}> • {file.note}</span>}
                  </div>
                </div>
                <div className={styles.fileActions}>
                  <button 
                    onClick={() => handleDownload(file.id, file.original_name)}
                    className={styles.actionButton}
                    title="Download"
                  >
                    ⬇️
                  </button>
                  {deleteConfirm === file.id ? (
                    <>
                      <button 
                        onClick={() => handleDelete(file.id)}
                        className={`${styles.actionButton} ${styles.confirmDelete}`}
                        title="Confirm delete"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(null)}
                        className={styles.actionButton}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirm(file.id)}
                      className={styles.actionButton}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Status Section */}
      {(processingFiles.length > 0 || counts.scanning_count > 0 || counts.quarantined_count > 0) && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span>📋 Processing Status</span>
          </h3>

          <div className={styles.fileList}>
            {processingFiles.map((file) => {
              const statusConfig = STATUS_CONFIG[file.status] || STATUS_CONFIG.uploading;
              
              return (
                <div 
                  key={file.id} 
                  className={`${styles.fileRow} ${styles[`status-${file.status}`]}`}
                >
                  <div className={styles.fileIcon}>{getFileIcon(file.mime_type)}</div>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{file.original_name}</div>
                    <div className={styles.fileMeta}>
                      {formatFileSize(file.file_size)} • {timeAgo(file.created_at)}
                    </div>
                  </div>
                  <div className={styles.fileStatus}>
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: statusConfig.color }}
                    >
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                    {file.status === 'quarantined' && file.scan_result && (
                      <div className={styles.threatInfo}>
                        Threat: {file.scan_result}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {processingFiles.some(f => f.status === 'scanning') && (
            <div className={styles.scanningNote}>
              <p>🔍 Files are being scanned for security. This may take a few minutes for large files.</p>
            </div>
          )}

          {processingFiles.some(f => f.status === 'quarantined') && (
            <div className={styles.quarantineNote}>
              <p>⚠️ Quarantined files contain detected threats and will be automatically removed after 24 hours.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
