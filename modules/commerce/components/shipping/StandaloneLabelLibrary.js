/**
 * Standalone Label Library Component
 * 
 * Table view of created standalone shipping labels.
 * Uses v2 API and global styles.
 */

import { useState, useEffect } from 'react';
import { fetchStandaloneLabels, getShippingLabelUrl } from '../../../../lib/commerce/api';

export default function StandaloneLabelLibrary({ refreshTrigger }) {
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLabels();
  }, [refreshTrigger]);

  const loadLabels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStandaloneLabels({ limit: 100 });
      setLabels(data);
    } catch (err) {
      console.error('Error fetching standalone labels:', err);
      setLabels([]);
      // Don't show error for expected 403/no-subscription case
      if (!err.message.includes('403') && !err.message.includes('subscription')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedLabels(labels.filter(l => l.status !== 'voided').map(l => l.db_id || l.id));
    } else {
      setSelectedLabels([]);
    }
  };

  const toggleSelectLabel = (labelId, checked) => {
    if (checked) {
      setSelectedLabels([...selectedLabels, labelId]);
    } else {
      setSelectedLabels(selectedLabels.filter(id => id !== labelId));
    }
  };

  const handlePrintSelected = () => {
    // TODO: Implement batch printing
    alert(`Printing ${selectedLabels.length} label(s) - coming soon!`);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading labels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p className="error-message">{error}</p>
        <button className="btn secondary" onClick={loadLabels}>
          Retry
        </button>
      </div>
    );
  }

  if (!labels || labels.length === 0) {
    return (
      <div className="empty-state">
        <p>No labels found yet.</p>
        <p className="helper-text">Labels you create will appear here.</p>
      </div>
    );
  }

  const activeLabels = labels.filter(l => l.status !== 'voided');
  const allSelected = activeLabels.length > 0 && selectedLabels.length === activeLabels.length;

  return (
    <div className="label-library">
      {/* Bulk Actions */}
      {selectedLabels.length > 0 && (
        <div className="bulk-actions">
          <button className="btn primary" onClick={handlePrintSelected}>
            Print Selected ({selectedLabels.length})
          </button>
          <button className="btn secondary" onClick={() => setSelectedLabels([])}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Labels Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input 
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th>Label ID</th>
              <th>Service</th>
              <th>Tracking</th>
              <th>Cost</th>
              <th>Date</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {labels.map(label => {
              const labelId = label.db_id || label.id;
              const isVoided = label.status === 'voided';
              
              return (
                <tr key={labelId} className={isVoided ? 'row-voided' : ''}>
                  <td className="col-checkbox">
                    <input 
                      type="checkbox"
                      disabled={isVoided}
                      checked={selectedLabels.includes(labelId)}
                      onChange={(e) => toggleSelectLabel(labelId, e.target.checked)}
                    />
                  </td>
                  <td className="col-id">{label.label_id}</td>
                  <td>{label.service_name}</td>
                  <td className="col-tracking">
                    {label.tracking_number || '-'}
                  </td>
                  <td className="col-cost">${parseFloat(label.cost || 0).toFixed(2)}</td>
                  <td className="col-date">
                    {new Date(label.created_at).toLocaleDateString()}
                  </td>
                  <td className="col-action">
                    {isVoided ? (
                      <span className="status-badge voided">VOIDED</span>
                    ) : (
                      <a 
                        href={getLabelUrl(label)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link"
                      >
                        View Label
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="info-banner">
        <strong>Note:</strong> Standalone labels are purchased independently and cannot be voided through this interface.
      </div>
    </div>
  );
}

// Helper to get label URL
function getLabelUrl(label) {
  const filename = label.label_file_path || '';
  
  // If it's a user path, use the API endpoint
  if (filename.includes('/user_')) {
    return getShippingLabelUrl(filename.split('/').pop());
  }
  
  // Otherwise return the full path
  return filename;
}
