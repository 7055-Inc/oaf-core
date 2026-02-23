/**
 * Admin Media Library Component
 * Searchable, paginated grid of user-submitted media with download and "mark as used" toggle.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAllSubmissions,
  toggleMediaUsed,
  getSubmissionDownloadUrl,
  deleteSubmission
} from '../../../lib/marketing/api';
import { authenticatedApiRequest } from '../../../lib/auth';

export default function AdminMediaLibrary({ userData }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 24;

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [usedFilter, setUsedFilter] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState(null);

  const searchTimer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getAllSubmissions({
        search,
        status: statusFilter,
        media_used: usedFilter,
        mime_type: mimeFilter,
        sort: sortBy,
        order: sortOrder,
        page,
        limit
      });
      setItems(result.data || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('Failed to load media library:', err);
      setError(err.message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, usedFilter, mimeFilter, sortBy, sortOrder, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const handleToggleUsed = async (item) => {
    const newVal = !item.media_used;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, media_used: newVal ? 1 : 0 } : i));
    try {
      await toggleMediaUsed(item.id, newVal);
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, media_used: item.media_used } : i));
      console.error('Toggle failed:', err);
    }
  };

  const handleDownload = async (item) => {
    try {
      const url = getSubmissionDownloadUrl(item.id);
      const response = await authenticatedApiRequest(url, { method: 'GET' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = item.original_filename || `media-${item.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed: ' + err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete submission #${item.id} by ${item.first_name || 'Unknown'}?`)) return;
    try {
      await deleteSubmission(item.id);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setSearchInput('');
    setStatusFilter(''); setUsedFilter('');
    setMimeFilter(''); setSortBy('created_at');
    setSortOrder('desc'); setPage(1);
  };

  const isVideo = (mime) => mime && mime.startsWith('video/');

  return (
    <div className="admin-media-library">
      <div className="aml-header">
        <div className="aml-title-row">
          <h2><i className="fa-solid fa-photo-film"></i> User Media Library</h2>
          <span className="aml-count">{total} submission{total !== 1 ? 's' : ''}</span>
        </div>
        <p className="aml-subtitle">Review and manage media submitted by artists and promoters for promotional use.</p>
      </div>

      {/* Toolbar */}
      <div className="aml-toolbar">
        <div className="aml-search-box">
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Search by name, email, description, filename..."
            value={searchInput}
            onChange={handleSearchChange}
          />
          {searchInput && (
            <button className="aml-search-clear" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
              <i className="fa-solid fa-times"></i>
            </button>
          )}
        </div>

        <div className="aml-filters">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={usedFilter} onChange={e => { setUsedFilter(e.target.value); setPage(1); }}>
            <option value="">Used &amp; Unused</option>
            <option value="true">Used</option>
            <option value="false">Not Used</option>
          </select>

          <select value={mimeFilter} onChange={e => { setMimeFilter(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
          </select>

          <button className="aml-sort-btn" onClick={() => handleSort('created_at')} title="Sort by date">
            <i className="fa-solid fa-calendar"></i>
            {sortBy === 'created_at' && <i className={`fa-solid fa-arrow-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
          </button>

          <button className="aml-sort-btn" onClick={() => handleSort('media_used')} title="Sort by used status">
            <i className="fa-solid fa-check-circle"></i>
            {sortBy === 'media_used' && <i className={`fa-solid fa-arrow-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
          </button>

          {(search || statusFilter || usedFilter || mimeFilter) && (
            <button className="aml-reset-btn" onClick={resetFilters}>
              <i className="fa-solid fa-times"></i> Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="aml-error"><i className="fa-solid fa-exclamation-triangle"></i> {error}</div>}

      {/* Grid */}
      {loading ? (
        <div className="aml-loading">
          <div className="spinner"></div>
          <span>Loading media...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="aml-empty">
          <i className="fa-solid fa-inbox"></i>
          <p>{search || statusFilter || usedFilter || mimeFilter ? 'No submissions match your filters.' : 'No submissions yet.'}</p>
        </div>
      ) : (
        <div className="aml-grid">
          {items.map(item => (
            <div key={item.id} className={`aml-card${item.media_used ? ' aml-card-used' : ''}`}>
              <div className="aml-card-media" onClick={() => setLightboxItem(item)}>
                {isVideo(item.mime_type) ? (
                  <div className="aml-video-thumb">
                    <i className="fa-solid fa-play-circle"></i>
                    <span>{item.original_filename || 'Video'}</span>
                  </div>
                ) : (
                  <img
                    src={item.thumbnail_url || item.image_url || '/images/placeholder.png'}
                    alt={item.description || item.original_filename || 'Submission'}
                    loading="lazy"
                  />
                )}
                {item.media_used ? <span className="aml-used-badge"><i className="fa-solid fa-check"></i> Used</span> : null}
              </div>

              <div className="aml-card-body">
                <div className="aml-card-user">
                  <strong>{item.first_name} {item.last_name}</strong>
                  {item.business_name && <span className="aml-biz">{item.business_name}</span>}
                </div>
                {item.description && <p className="aml-card-desc">{item.description}</p>}
                <div className="aml-card-meta">
                  <span title={item.mime_type}>{item.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="aml-card-actions">
                <label className="aml-toggle" title={item.media_used ? 'Mark as unused' : 'Mark as used'}>
                  <input
                    type="checkbox"
                    checked={!!item.media_used}
                    onChange={() => handleToggleUsed(item)}
                  />
                  <span className="aml-toggle-slider"></span>
                  <span className="aml-toggle-label">{item.media_used ? 'Used' : 'Unused'}</span>
                </label>

                <button className="aml-action-btn aml-download-btn" onClick={() => handleDownload(item)} title="Download original">
                  <i className="fa-solid fa-download"></i>
                </button>

                <button className="aml-action-btn aml-delete-btn" onClick={() => handleDelete(item)} title="Delete">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="aml-pagination">
          <button disabled={page <= 1} onClick={() => setPage(1)}>
            <i className="fa-solid fa-angles-left"></i>
          </button>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <i className="fa-solid fa-angle-left"></i>
          </button>
          <span className="aml-page-info">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <i className="fa-solid fa-angle-right"></i>
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            <i className="fa-solid fa-angles-right"></i>
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <div className="aml-lightbox" onClick={() => setLightboxItem(null)}>
          <div className="aml-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="aml-lightbox-close" onClick={() => setLightboxItem(null)}>
              <i className="fa-solid fa-times"></i>
            </button>
            {isVideo(lightboxItem.mime_type) ? (
              <video controls autoPlay src={lightboxItem.image_url} style={{ maxWidth: '100%', maxHeight: '80vh' }} />
            ) : (
              <img src={lightboxItem.image_url || lightboxItem.thumbnail_url} alt="" />
            )}
            <div className="aml-lightbox-info">
              <div className="aml-lightbox-row">
                <strong>{lightboxItem.first_name} {lightboxItem.last_name}</strong>
                {lightboxItem.business_name && <span> &mdash; {lightboxItem.business_name}</span>}
              </div>
              {lightboxItem.description && <p>{lightboxItem.description}</p>}
              <div className="aml-lightbox-row">
                <span>{lightboxItem.original_filename}</span>
                <span>{new Date(lightboxItem.created_at).toLocaleString()}</span>
              </div>
              <div className="aml-lightbox-actions">
                <button onClick={() => handleDownload(lightboxItem)}>
                  <i className="fa-solid fa-download"></i> Download Original
                </button>
                <label className="aml-toggle">
                  <input type="checkbox" checked={!!lightboxItem.media_used} onChange={() => {
                    handleToggleUsed(lightboxItem);
                    setLightboxItem(prev => ({ ...prev, media_used: prev.media_used ? 0 : 1 }));
                  }} />
                  <span className="aml-toggle-slider"></span>
                  <span className="aml-toggle-label">{lightboxItem.media_used ? 'Used' : 'Unused'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-media-library {
          padding: 0;
          max-width: 1400px;
        }
        .aml-header {
          margin-bottom: 24px;
        }
        .aml-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 4px;
        }
        .aml-title-row h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .aml-title-row h2 i {
          margin-right: 8px;
          color: #6c5ce7;
        }
        .aml-count {
          background: #f0ecff;
          color: #6c5ce7;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .aml-subtitle {
          color: #666;
          margin: 4px 0 0 0;
          font-size: 0.9rem;
        }

        /* Toolbar */
        .aml-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }
        .aml-search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
        }
        .aml-search-box i {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa;
          font-size: 0.9rem;
        }
        .aml-search-box input {
          width: 100%;
          padding: 10px 36px 10px 36px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.9rem;
          background: #fff;
          transition: border-color 0.2s;
        }
        .aml-search-box input:focus {
          outline: none;
          border-color: #6c5ce7;
          box-shadow: 0 0 0 3px rgba(108,92,231,0.1);
        }
        .aml-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
        }
        .aml-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .aml-filters select {
          padding: 9px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .aml-sort-btn, .aml-reset-btn {
          padding: 9px 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          gap: 4px;
          align-items: center;
          transition: all 0.2s;
        }
        .aml-sort-btn:hover, .aml-reset-btn:hover {
          border-color: #6c5ce7;
          color: #6c5ce7;
        }
        .aml-reset-btn {
          background: #fff0f0;
          color: #c0392b;
          border-color: #f5c6cb;
        }

        /* Error & Loading */
        .aml-error {
          background: #fff0f0;
          color: #c0392b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.9rem;
        }
        .aml-loading {
          text-align: center;
          padding: 60px 20px;
          color: #888;
        }
        .aml-loading .spinner {
          display: inline-block;
          width: 32px;
          height: 32px;
          border: 3px solid #e9ecef;
          border-top-color: #6c5ce7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .aml-empty {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }
        .aml-empty i {
          font-size: 3rem;
          margin-bottom: 12px;
          display: block;
        }

        /* Grid */
        .aml-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .aml-card {
          border: 1px solid #e9ecef;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .aml-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-color: #d0d0d0;
        }
        .aml-card-used {
          border-color: #a3e4a1;
          background: #f8fff8;
        }
        .aml-card-media {
          position: relative;
          width: 100%;
          height: 200px;
          background: #f0f0f5;
          cursor: pointer;
          overflow: hidden;
        }
        .aml-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .aml-card:hover .aml-card-media img {
          transform: scale(1.03);
        }
        .aml-video-thumb {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          gap: 8px;
        }
        .aml-video-thumb i {
          font-size: 2.5rem;
          color: #6c5ce7;
        }
        .aml-video-thumb span {
          font-size: 0.8rem;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .aml-used-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(46,204,113,0.9);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .aml-card-body {
          padding: 12px 14px 8px;
        }
        .aml-card-user strong {
          font-size: 0.9rem;
          color: #1a1a2e;
        }
        .aml-biz {
          display: block;
          font-size: 0.78rem;
          color: #888;
          margin-top: 1px;
        }
        .aml-card-desc {
          font-size: 0.82rem;
          color: #555;
          margin: 6px 0 0 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .aml-card-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #aaa;
          margin-top: 6px;
        }

        /* Card Actions */
        .aml-card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px 12px;
          border-top: 1px solid #f0f0f0;
        }
        .aml-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex: 1;
        }
        .aml-toggle input {
          display: none;
        }
        .aml-toggle-slider {
          position: relative;
          width: 36px;
          height: 20px;
          background: #ccc;
          border-radius: 20px;
          transition: background 0.25s;
          flex-shrink: 0;
        }
        .aml-toggle-slider::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.25s;
        }
        .aml-toggle input:checked + .aml-toggle-slider {
          background: #2ecc71;
        }
        .aml-toggle input:checked + .aml-toggle-slider::after {
          transform: translateX(16px);
        }
        .aml-toggle-label {
          font-size: 0.78rem;
          color: #666;
          font-weight: 500;
        }
        .aml-action-btn {
          width: 34px;
          height: 34px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #666;
        }
        .aml-download-btn:hover {
          border-color: #6c5ce7;
          color: #6c5ce7;
          background: #f5f3ff;
        }
        .aml-delete-btn:hover {
          border-color: #e74c3c;
          color: #e74c3c;
          background: #fef0f0;
        }

        /* Pagination */
        .aml-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          padding: 16px 0;
        }
        .aml-pagination button {
          width: 38px;
          height: 38px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #333;
        }
        .aml-pagination button:hover:not(:disabled) {
          border-color: #6c5ce7;
          color: #6c5ce7;
        }
        .aml-pagination button:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .aml-page-info {
          font-size: 0.9rem;
          color: #666;
          padding: 0 12px;
          font-weight: 500;
        }

        /* Lightbox */
        .aml-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .aml-lightbox-inner {
          background: #fff;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        .aml-lightbox-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.6);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }
        .aml-lightbox-inner img {
          width: 100%;
          max-height: 60vh;
          object-fit: contain;
          background: #f5f5f5;
          border-radius: 16px 16px 0 0;
        }
        .aml-lightbox-info {
          padding: 16px 20px 20px;
        }
        .aml-lightbox-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 0.9rem;
          color: #555;
          flex-wrap: wrap;
          gap: 8px;
        }
        .aml-lightbox-info p {
          margin: 8px 0 12px;
          color: #444;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .aml-lightbox-actions {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }
        .aml-lightbox-actions button {
          padding: 8px 16px;
          border: 1px solid #6c5ce7;
          border-radius: 8px;
          background: #6c5ce7;
          color: #fff;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }
        .aml-lightbox-actions button:hover {
          background: #5a4bd1;
        }

        @media (max-width: 768px) {
          .aml-toolbar {
            flex-direction: column;
          }
          .aml-search-box {
            min-width: 100%;
          }
          .aml-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }
          .aml-card-media {
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
}
