'use client';
import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../../../styles/InventoryLog.module.css';

export default function InventoryLog() {
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <h3>All Inventory Changes</h3>
        <p>Complete chronological log of all inventory updates across your products</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Inventory History */}
      <div className={styles.historySection}>
        {inventoryHistory.length === 0 ? (
          <p className={styles.noHistory}>No inventory history available.</p>
        ) : (
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
                {inventoryHistory.map((entry, index) => (
                  <tr key={index}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>{entry.product_name || `Product ${entry.product_id}`}</td>
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
        )}
      </div>
    </div>
  );
} 