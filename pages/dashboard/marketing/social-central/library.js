/**
 * Social Central - Media Library
 * Dashboard > Marketing > Social Central > Library
 * 
 * Upload, manage, and organize media assets for social media campaigns.
 * Grid of thumbnails, drag-and-drop upload, bulk upload, tagging, filtering.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../lib/users/api';
import { fetchAssets, deleteAsset } from '../../../../lib/social-central/api';

const TYPE_ICONS = {
  image: 'fa-image',
  video: 'fa-video',
  audio: 'fa-music',
  document: 'fa-file-alt',
};

const TYPE_COLORS = {
  image: '#28a745',
  video: '#6f42c1',
  audio: '#fd7e14',
  document: '#17a2b8',
};

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LibraryPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('all'); // all, image, video, audio, document
  const [searchTags, setSearchTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editTags, setEditTags] = useState('');
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (userData) loadAssets(); }, [userData, filter, searchTags]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      if (!data?.permissions?.includes('leo_social')) {
        router.push('/dashboard/marketing');
        return;
      }
      setUserData(data);
    } catch (err) {
      router.push('/login?redirect=/dashboard/marketing/social-central/library');
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.type = filter;
      if (searchTags.trim()) params.tags = searchTags.trim();
      const data = await fetchAssets(params);
      if (data.success) {
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
    }
  };

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        const formData = new FormData();
        formData.append('file', files[i]);
        // Don't set Content-Type — browser sets it with boundary for FormData
        const response = await authApiRequest('api/v2/marketing/assets/upload', {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    loadAssets();

    if (failCount === 0) {
      setToast({ type: 'success', message: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!` });
    } else {
      setToast({ type: 'error', message: `${successCount} uploaded, ${failCount} failed.` });
    }
  };

  const handleFileInput = (e) => {
    handleUpload(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUpload(files);
  }, [userData]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async (asset) => {
    const meta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata || '{}') : (asset.metadata || {});
    if (!confirm(`Delete "${meta.original_name || 'this asset'}"? This cannot be undone.`)) return;
    try {
      await deleteAsset(asset.id);
      setToast({ type: 'success', message: 'Asset deleted.' });
      if (selectedAsset?.id === asset.id) setSelectedAsset(null);
      loadAssets();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete asset.' });
    }
  };

  const handleUpdateTags = async () => {
    if (!selectedAsset) return;
    try {
      const response = await authApiRequest(`api/v2/marketing/assets/${selectedAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: editTags }),
      });
      if (response.ok) {
        setToast({ type: 'success', message: 'Tags updated.' });
        loadAssets();
        setSelectedAsset(prev => prev ? { ...prev, tags: editTags } : null);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update tags.' });
    }
  };

  const getAssetUrl = (asset) => {
    if (!asset.file_path) return null;
    // file_path is absolute like /var/www/staging/temp_images/marketing/file-xxx.jpg
    // Served at /temp_images/marketing/file-xxx.jpg via the staging API
    const relativePath = asset.file_path.replace('/var/www/staging', '');
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    return `${apiBase}${relativePath}`;
  };

  const getAssetMeta = (asset) => {
    if (!asset.metadata) return {};
    return typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata;
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Media Library | Social Central | Brakebee</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading...</span></div>
      </DashboardShell>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Head><title>Media Library | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            padding: '14px 20px', borderRadius: '8px', maxWidth: '400px',
            color: 'white', fontWeight: '500', fontSize: '14px',
            background: toast.type === 'success' ? '#28a745' : '#dc3545',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => router.push('/dashboard/marketing/social-central')}>Social Central</span>
          <span style={{ fontSize: '13px', color: '#999', margin: '0 6px' }}>/</span>
          <span style={{ fontSize: '13px', color: '#666' }}>Media Library</span>
        </div>

        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1>Media Library</h1>
            <p className="page-subtitle">Upload and manage media for your social media campaigns</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '10px 20px', background: 'var(--gradient-primary)', color: 'white',
              border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
              fontWeight: '600', fontSize: '14px',
            }}
          >
            <i className="fa fa-cloud-upload-alt" style={{ marginRight: '8px' }}></i>
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>

        {/* Upload Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary-color)' : '#ccc'}`,
            borderRadius: '12px',
            padding: uploading ? '20px' : '30px',
            textAlign: 'center',
            marginBottom: '20px',
            background: dragOver ? 'rgba(5, 84, 116, 0.05)' : '#fafafa',
            transition: 'all 0.2s ease',
            cursor: uploading ? 'default' : 'pointer',
          }}
          onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
        >
          {uploading ? (
            <div>
              <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
              <div style={{ fontSize: '14px', color: '#555' }}>
                Uploading {uploadProgress.current} of {uploadProgress.total}...
              </div>
              <div style={{ width: '200px', height: '6px', background: '#e9ecef', borderRadius: '3px', margin: '10px auto 0', overflow: 'hidden' }}>
                <div style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          ) : (
            <div>
              <i className="fa fa-cloud-upload-alt" style={{ fontSize: '28px', color: dragOver ? 'var(--primary-color)' : '#aaa', marginBottom: '8px' }}></i>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Drag & drop files here, or <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>click to browse</span>
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Images, videos, audio, and documents — up to 100MB each
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', 'image', 'video', 'audio', 'document'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '500',
                border: filter === type ? 'none' : '1px solid #ddd',
                background: filter === type ? 'var(--primary-color)' : 'white',
                color: filter === type ? 'white' : '#555',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {type === 'all' ? ` (${assets.length})` : ''}
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <input
            type="text"
            placeholder="Search by tags..."
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            style={{
              padding: '6px 14px', border: '1px solid #ddd', borderRadius: '16px',
              fontSize: '13px', width: '200px', outline: 'none',
            }}
          />
        </div>

        {/* Asset Grid + Detail Panel */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Grid */}
          <div style={{ flex: 1 }}>
            {assets.length === 0 ? (
              <div className="section-box" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <i className="fa fa-photo-video" style={{ fontSize: '48px', color: '#ccc', marginBottom: '12px' }}></i>
                <h3 style={{ color: '#666', margin: '0 0 8px' }}>No media yet</h3>
                <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                  Upload images, videos, or documents to build your social media library.
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
              }}>
                {assets.map(asset => {
                  const meta = getAssetMeta(asset);
                  const url = getAssetUrl(asset);
                  const isSelected = selectedAsset?.id === asset.id;
                  const isImage = asset.type === 'image';
                  const isVideo = asset.type === 'video';

                  return (
                    <div
                      key={asset.id}
                      onClick={() => { setSelectedAsset(asset); setEditTags(asset.tags || ''); }}
                      style={{
                        border: isSelected ? '2px solid var(--primary-color)' : '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: 'white',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#aaa'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#e0e0e0'; }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        width: '100%', height: '130px',
                        background: '#f4f4f4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', position: 'relative',
                      }}>
                        {isImage && url ? (
                          <img
                            src={url}
                            alt={meta.original_name || 'Asset'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        ) : isVideo && url ? (
                          <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                        ) : (
                          <i className={`fa ${TYPE_ICONS[asset.type] || 'fa-file'}`} style={{ fontSize: '32px', color: TYPE_COLORS[asset.type] || '#999' }}></i>
                        )}
                        {/* Type badge */}
                        <span style={{
                          position: 'absolute', top: '6px', right: '6px',
                          background: TYPE_COLORS[asset.type] || '#666',
                          color: 'white', fontSize: '9px', fontWeight: 'bold',
                          padding: '2px 6px', borderRadius: '8px', textTransform: 'uppercase',
                        }}>
                          {asset.type}
                        </span>
                      </div>
                      {/* Info */}
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{
                          fontSize: '12px', fontWeight: '500', color: '#333',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {meta.original_name || 'Untitled'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                          {formatFileSize(meta.size)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedAsset && (
            <div style={{ width: '280px', flexShrink: 0 }}>
              <div className="section-box" style={{ padding: '0', overflow: 'hidden', position: 'sticky', top: '80px' }}>
                {/* Preview */}
                <div style={{ width: '100%', height: '200px', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {selectedAsset.type === 'image' && getAssetUrl(selectedAsset) ? (
                    <img src={getAssetUrl(selectedAsset)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : selectedAsset.type === 'video' && getAssetUrl(selectedAsset) ? (
                    <video src={getAssetUrl(selectedAsset)} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <i className={`fa ${TYPE_ICONS[selectedAsset.type] || 'fa-file'}`} style={{ fontSize: '48px', color: TYPE_COLORS[selectedAsset.type] || '#999' }}></i>
                  )}
                </div>

                {/* Details */}
                <div style={{ padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', wordBreak: 'break-word' }}>
                    {getAssetMeta(selectedAsset).original_name || 'Untitled'}
                  </h4>

                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.8' }}>
                    <div><strong>Type:</strong> {selectedAsset.type}</div>
                    <div><strong>Size:</strong> {formatFileSize(getAssetMeta(selectedAsset).size)}</div>
                    {getAssetMeta(selectedAsset).width && (
                      <div><strong>Dimensions:</strong> {getAssetMeta(selectedAsset).width}x{getAssetMeta(selectedAsset).height}</div>
                    )}
                    <div><strong>Uploaded:</strong> {formatDate(selectedAsset.created_at)}</div>
                  </div>

                  {/* Tags Editor */}
                  <div style={{ marginTop: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Tags</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="product, summer, sale"
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
                      />
                      <button
                        onClick={handleUpdateTags}
                        style={{ padding: '6px 10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Save
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>Comma-separated</div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    {getAssetUrl(selectedAsset) && (
                      <a
                        href={getAssetUrl(selectedAsset)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1, padding: '8px', textAlign: 'center',
                          background: '#f0f0f0', color: '#333', border: 'none',
                          borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                      >
                        <i className="fa fa-external-link-alt" style={{ marginRight: '4px' }}></i> Open
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(selectedAsset)}
                      style={{
                        flex: 1, padding: '8px',
                        background: 'white', color: '#dc3545', border: '1px solid #dc3545',
                        borderRadius: '4px', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                      }}
                    >
                      <i className="fa fa-trash" style={{ marginRight: '4px' }}></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>
    </>
  );
}
