'use client';
import { useState, useEffect, useMemo } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../../../styles/InventoryLog.module.css';

export default function InventoryLog() {
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch all inventory history for the user
  useEffect(() => {
    fetchInventoryHistory();
  }, []);

  const fetchInventoryHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all inventory history for the user across all products
      const response = await authApiRequest('inventory/history');
      
      if (response.ok) {
        const data = await response.json();
        setInventoryHistory(data.history || []);
      } else {
        setError('Failed to load inventory history');
        setInventoryHistory([]);
      }
    } catch (err) {
      console.error('Error fetching inventory history:', err);
      setError('Failed to load inventory history');
    } finally {
      setLoading(false);
    }
  };

  // Filter history based on search term (product name or SKU)
  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return inventoryHistory;
    
    const term = searchTerm.toLowerCase();
    return inventoryHistory.filter(entry => 
      (entry.product_name && entry.product_name.toLowerCase().includes(term)) ||
      (entry.product_sku && entry.product_sku.toLowerCase().includes(term))
    );
  }, [inventoryHistory, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangeTypeLabel = (changeType) => {
    const labels = {
      'sale': 'Sale',
      'return': 'Return',
      'restock': 'Restock',
      'adjustment': 'Adjustment',
      'manual_adjustment': 'Manual Adjustment',
      'damaged': 'Damaged',
      'lost': 'Lost',
      'found': 'Found'
    };
    return labels[changeType] || changeType;
  };

  const getChangeTypeColor = (changeType) => {
    const colors = {
      'sale': 'red',
      'return': 'green',
      'restock': 'green',
      'adjustment': 'blue',
      'manual_adjustment': 'blue',
      'damaged': 'red',
      'lost': 'red',
      'found': 'green'
    };
    return colors[changeType] || 'gray';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading inventory history...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>All Inventory Changes</h3>
          <p>Complete chronological log of all inventory updates across your products</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className={styles.clearSearch}
            title="Clear search"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* Results count */}
      <div className={styles.resultsInfo}>
        Showing {paginatedHistory.length} of {filteredHistory.length} transactions
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Inventory History */}
      <div className={styles.historySection}>
        {filteredHistory.length === 0 ? (
          <p className={styles.noHistory}>
            {searchTerm ? 'No transactions match your search.' : 'No inventory history available.'}
          </p>
        ) : (
          <>
            <div className={styles.historyTable}>
              <table>
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
                      <td>{formatDate(entry.created_at)}</td>
                      <td>
                        <div>{entry.product_name || `Product ${entry.product_id}`}</div>
                        {entry.product_sku && (
                          <small style={{ color: '#666' }}>{entry.product_sku}</small>
                        )}
                      </td>
                      <td>
                        <span 
                          className={`${styles.changeType} ${styles[getChangeTypeColor(entry.change_type)]}`}
                        >
                          {getChangeTypeLabel(entry.change_type)}
                        </span>
                      </td>
                      <td>{entry.previous_qty}</td>
                      <td>{entry.new_qty}</td>
                      <td className={entry.quantity_change > 0 ? styles.positive : styles.negative}>
                        {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                      </td>
                      <td>{entry.reason || '-'}</td>
                      <td>
                        {entry.first_name && entry.last_name ? 
                          `${entry.first_name} ${entry.last_name}` : 
                          entry.username || 'System'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                >
                  ← Previous
                </button>
                
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`${styles.pageNumber} ${currentPage === page ? styles.activePage : ''}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    // Show ellipsis for gaps
                    if (page === currentPage - 3 || page === currentPage + 3) {
                      return <span key={page} className={styles.ellipsis}>...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 