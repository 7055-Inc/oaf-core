/**
 * AddCollectionModal
 * Modal for creating new storefront collections (user categories)
 * 
 * Used to let vendors organize products into custom categories on their storefront
 * API: POST /api/v2/catalog/collections
 */

import { useState } from 'react';

export default function AddCollectionModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: null,
    display_order: 0
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Category name is required');
      }

      await onSubmit(formData);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        parent_id: null,
        display_order: 0
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      parent_id: null,
      display_order: 0
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal-container modal-sm">
        <div className="modal-header">
          <h2>Add New Collection</h2>
          <button 
            type="button" 
            onClick={handleClose}
            className="modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-alert">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Collection Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="form-input"
              maxLength={100}
              placeholder="Enter collection name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              maxLength={200}
              placeholder="Optional collection description"
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
