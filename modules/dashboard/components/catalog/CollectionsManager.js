/**
 * CollectionsManager Component
 * 
 * Manages vendor/user product collections (custom categories).
 * Allows creating, editing, reordering, and deleting collections.
 * 
 * Uses lib/catalog API functions for consistent CSRF handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchCollections, 
  createCollection, 
  updateCollection, 
  deleteCollection 
} from '../../../../lib/catalog';

export default function CollectionsManager({ userData }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Edit/Create modal
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: null,
    display_order: 0
  });
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load collections
  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchCollections();
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Open modal for new collection
  const handleCreate = () => {
    setEditingCollection(null);
    setFormData({
      name: '',
      description: '',
      parent_id: null,
      display_order: collections.length
    });
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name || '',
      description: collection.description || '',
      parent_id: collection.parent_id || null,
      display_order: collection.display_order || 0
    });
    setShowModal(true);
  };

  // Save collection (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Collection name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        parent_id: formData.parent_id || null,
        display_order: formData.display_order
      };

      if (editingCollection) {
        await updateCollection(editingCollection.id, payload);
        setSuccess('Collection updated!');
      } else {
        await createCollection(payload);
        setSuccess('Collection created!');
      }
      
      setShowModal(false);
      loadCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete collection
  const handleDelete = async (collection) => {
    setDeleting(true);
    setError(null);

    try {
      await deleteCollection(collection.id);
      setSuccess('Collection deleted!');
      setDeleteConfirm(null);
      loadCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Move collection up/down in order
  const handleReorder = async (collection, direction) => {
    const currentIndex = collections.findIndex(c => c.id === collection.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= collections.length) return;

    // Swap display_order with adjacent item
    const otherCollection = collections[newIndex];
    
    try {
      // Update both collections
      await Promise.all([
        updateCollection(collection.id, { 
          ...collection, 
          display_order: otherCollection.display_order 
        }),
        updateCollection(otherCollection.id, { 
          ...otherCollection, 
          display_order: collection.display_order 
        })
      ]);
      
      loadCollections();
    } catch (err) {
      setError('Failed to reorder collections');
    }
  };

  // Build hierarchy for display
  const buildHierarchy = () => {
    const rootCollections = collections.filter(c => !c.parent_id);
    const getChildren = (parentId) => collections.filter(c => c.parent_id === parentId);
    
    return rootCollections.map(parent => ({
      ...parent,
      children: getChildren(parent.id)
    }));
  };

  const hierarchy = buildHierarchy();

  // Get parent options (excluding current collection and its children)
  const getParentOptions = () => {
    if (!editingCollection) {
      return collections.filter(c => !c.parent_id);
    }
    return collections.filter(c => 
      !c.parent_id && 
      c.id !== editingCollection.id
    );
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading collections...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Status Messages */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError(null)} className="btn-icon" style={{ float: 'right' }}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {/* Header */}
      <div className="table-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p className="text-muted" style={{ margin: 0 }}>
            Organize your products into collections for your storefront.
          </p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          <i className="fas fa-plus"></i> New Collection
        </button>
      </div>

      {/* Collections List */}
      {collections.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem', display: 'block' }}></i>
          <h3 style={{ margin: '0 0 0.5rem' }}>No Collections Yet</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Create collections to organize your products on your storefront.
          </p>
          <button onClick={handleCreate} className="btn btn-primary">
            <i className="fas fa-plus"></i> Create Your First Collection
          </button>
        </div>
      ) : (
        <div className="collections-list">
          {hierarchy.map((collection, index) => (
            <div key={collection.id} className="collection-item">
              <div className="form-card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Reorder buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button 
                      onClick={() => handleReorder(collection, 'up')}
                      disabled={index === 0}
                      className="btn-icon"
                      title="Move up"
                      style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                    >
                      <i className="fas fa-chevron-up"></i>
                    </button>
                    <button 
                      onClick={() => handleReorder(collection, 'down')}
                      disabled={index === hierarchy.length - 1}
                      className="btn-icon"
                      title="Move down"
                      style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                    >
                      <i className="fas fa-chevron-down"></i>
                    </button>
                  </div>

                  {/* Collection info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                      <i className="fas fa-folder" style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}></i>
                      {collection.name}
                    </div>
                    {collection.description && (
                      <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                        {collection.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEdit(collection)}
                      className="btn btn-secondary btn-sm"
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(collection)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc3545' }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Subcollections */}
                {collection.children && collection.children.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingLeft: '2.5rem', borderLeft: '2px solid #e9ecef' }}>
                    {collection.children.map(child => (
                      <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                            <i className="fas fa-folder-open" style={{ color: '#6c757d', marginRight: '0.5rem' }}></i>
                            {child.name}
                          </div>
                          {child.description && (
                            <p className="text-muted" style={{ margin: '0.15rem 0 0', fontSize: '0.8rem' }}>
                              {child.description}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleEdit(child)}
                            className="btn-icon"
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(child)}
                            className="btn-icon"
                            title="Delete"
                            style={{ color: '#dc3545' }}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h2>{editingCollection ? 'Edit Collection' : 'New Collection'}</h2>
            </div>

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Summer Collection, Best Sellers"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this collection..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Collection</label>
              <select
                className="form-select"
                value={formData.parent_id || ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: e.target.value ? parseInt(e.target.value) : null 
                }))}
              >
                <option value="">None (Top Level)</option>
                {getParentOptions().map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="form-hint">Nest this collection under another collection.</p>
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => setShowModal(false)} 
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="btn btn-primary"
                disabled={saving || !formData.name.trim()}
              >
                {saving ? 'Saving...' : (editingCollection ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h2>Delete Collection</h2>
            </div>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
            </p>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Products in this collection will not be deleted, but they will no longer be organized under this collection.
            </p>
            <div className="modal-actions">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirm)} 
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
