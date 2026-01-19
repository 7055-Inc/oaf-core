'use client';
import { useState, useEffect, useMemo } from 'react';
import { fetchAllInventoryHistory } from '../../../../lib/catalog';

/**
 * InventoryLog Component
 * Shows chronological log of all inventory changes across products
 */
export default function InventoryLog() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllInventoryHistory({ limit: 1000 });
      setHistory(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter based on search
  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(entry =>
      (entry.product_name?.toLowerCase().includes(term)) ||
      (entry.product_sku?.toLowerCase().includes(term))
    );
  }, [history, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getChangeTypeLabel = (type) => {
    const labels = {
      'sale': 'Sale',
      'return': 'Return',
      'restock': 'Restock',
      'adjustment': 'Adjustment',
      'manual_adjustment': 'Manual Adjustment',
      'initial_stock': 'Initial Stock',
      'damaged': 'Damaged',
      'lost': 'Lost',
      'found': 'Found',
      'sync_setup': 'Sync Setup'
    };
    return labels[type] || type?.replace('_', ' ') || 'Unknown';
  };

  const getChangeTypeClass = (type) => {
    if (['sale', 'damaged', 'lost'].includes(type)) return 'danger';
    if (['return', 'restock', 'found'].includes(type)) return 'success';
    return 'info';
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading inventory history...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="table-header">
        <div>
          <p className="form-hint">Complete chronological log of all inventory changes across your products.</p>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Search */}
      <div className="search-box" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="secondary small" style={{ marginLeft: '8px' }}>
            Clear
          </button>
        )}
      </div>

      {/* Results info */}
      <div style={{ marginBottom: '12px', color: '#666', fontSize: '0.9rem' }}>
        Showing {paginatedHistory.length} of {filteredHistory.length} transactions
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <p>{searchTerm ? 'No transactions match your search.' : 'No inventory history available.'}</p>
        </div>
      ) : (
        <>
          <div className="section-box">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Previous</th>
                  <th>New</th>
                  <th>Change</th>
                  <th>Reason</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((entry, index) => (
                  <tr key={index}>
                    <td>{new Date(entry.created_at).toLocaleString()}</td>
                    <td>
                      <div>{entry.product_name || `Product ${entry.product_id}`}</div>
                      {entry.product_sku && <small style={{ color: '#666' }}>{entry.product_sku}</small>}
                    </td>
                    <td>
                      <span className={`status-badge ${getChangeTypeClass(entry.change_type)}`}>
                        {getChangeTypeLabel(entry.change_type)}
                      </span>
                    </td>
                    <td>{entry.previous_qty}</td>
                    <td>{entry.new_qty}</td>
                    <td style={{ 
                      color: entry.quantity_change > 0 ? '#059669' : entry.quantity_change < 0 ? '#dc2626' : 'inherit',
                      fontWeight: 500
                    }}>
                      {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                    </td>
                    <td>{entry.reason || '-'}</td>
                    <td>
                      {entry.first_name && entry.last_name
                        ? `${entry.first_name} ${entry.last_name}`
                        : entry.username || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="secondary small"
              >
                ← Previous
              </button>
              
              <span style={{ color: '#666', fontSize: '0.9rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="secondary small"
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
