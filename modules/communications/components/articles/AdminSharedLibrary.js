/**
 * AdminSharedLibrary Component
 * Admin view for all Shared Library uploads across all users
 * Shows all uploads ordered by date (newest first)
 */

import { useState, useEffect, useCallback } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import slideInStyles from '../../SlideIn.module.css';
import styles from './AdminSharedLibrary.module.css';

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function AdminSharedLibrary({ userData }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset
      });
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      if (search) {
        params.append('search', search);
      }

      const response = await authApiRequest(`files/admin/all?${params.toString()}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0
        }));
      } else {
        setError('Failed to fetch files');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, filter, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, offset: 0 }));
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
        fetchFiles();
        setDeleteConfirm(null);
      } else {
        setError('Delete failed');
      }
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handlePageChange = (direction) => {
    setPagination(prev => ({
      ...prev,
      offset: direction === 'next' 
        ? prev.offset + prev.limit 
        : Math.max(0, prev.offset - prev.limit)
    }));
  };

  const getUserName = (file) => {
    return file.display_name || 
           (file.first_name ? `${file.first_name} ${file.last_name || ''}`.trim() : null) ||
           file.user_email?.split('@')[0] ||
           `User ${file.user_id}`;
  };

  return (
    <div className={slideInStyles.slideInBody}>
      {/* Header / Filters */}
      <div className={styles.header}>
        <div className={styles.filterRow}>
          <div className={styles.filterButtons}>
            {[
              { key: 'all', label: 'All' },
              { key: 'available', label: 'Available' },
              { key: 'scanning', label: 'Scanning' },
              { key: 'quarantined', label: 'Quarantined' }
            ].map(f => (
              <button
                key={f.key}
                className={`${styles.filterButton} ${filter === f.key ? styles.active : ''}`}
                onClick={() => handleFilterChange(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Search by filename or user..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              🔍
            </button>
          </form>
        </div>

        <div className={styles.statsRow}>
          <span>Total: {pagination.total} files</span>
          <span>
            Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} 
          </span>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>×</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>Loading files...</div>
      ) : files.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No files found{search ? ` matching "${search}"` : ''}.</p>
        </div>
      ) : (
        <>
          <div className={styles.fileTable}>
            <div className={styles.tableHeader}>
              <div className={styles.colFile}>File</div>
              <div className={styles.colUser}>User</div>
              <div className={styles.colSize}>Size</div>
              <div className={styles.colStatus}>Status</div>
              <div className={styles.colDate}>Uploaded</div>
              <div className={styles.colActions}>Actions</div>
            </div>

            {files.map((file) => {
              const statusConfig = STATUS_CONFIG[file.status] || STATUS_CONFIG.uploading;
              
              return (
                <div key={file.id} className={`${styles.tableRow} ${styles[`status-${file.status}`]}`}>
                  <div className={styles.colFile}>
                    <span className={styles.fileIcon}>{getFileIcon(file.mime_type)}</span>
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>{file.original_name}</span>
                      {file.note && <span className={styles.fileNote}>{file.note}</span>}
                    </div>
                  </div>
                  
                  <div className={styles.colUser}>
                    <div className={styles.userName}>{getUserName(file)}</div>
                    <div className={styles.userMeta}>
                      {file.user_type} • ID: {file.user_id}
                    </div>
                  </div>
                  
                  <div className={styles.colSize}>
                    {formatFileSize(file.file_size)}
                  </div>
                  
                  <div className={styles.colStatus}>
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: statusConfig.color }}
                    >
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                    {file.status === 'quarantined' && file.scan_result && (
                      <div className={styles.threatInfo}>{file.scan_result}</div>
                    )}
                  </div>
                  
                  <div className={styles.colDate}>
                    {formatDate(file.created_at)}
                  </div>
                  
                  <div className={styles.colActions}>
                    {file.status === 'available' && (
                      <button 
                        onClick={() => handleDownload(file.id, file.original_name)}
                        className={styles.actionButton}
                        title="Download"
                      >
                        ⬇️
                      </button>
                    )}
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
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange('prev')}
                disabled={pagination.offset === 0}
                className={styles.pageButton}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={pagination.offset + pagination.limit >= pagination.total}
                className={styles.pageButton}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
