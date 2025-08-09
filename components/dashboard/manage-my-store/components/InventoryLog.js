'use client';
import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import styles from '../../../../styles/InventoryLog.module.css';

export default function InventoryLog({ productId }) {
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch inventory history from the new product API
  useEffect(() => {
    if (productId) {
      fetchInventoryHistory();
    }
  }, [productId]);

  const fetchInventoryHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new product API to get inventory history
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/products/${productId}?include=inventory`
      );
      
      if (response.ok) {
        const data = await response.json();
        setInventoryHistory(data.inventory?.history || []);
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
        <h3>Inventory History</h3>
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
                  <th>Type</th>
                  <th>Change</th>
                  <th>After</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {inventoryHistory.map((entry, index) => (
                  <tr key={index}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>
                      <span 
                        className={`${styles.changeType} ${styles[getChangeTypeColor(entry.change_type)]}`}
                      >
                        {getChangeTypeLabel(entry.change_type)}
                      </span>
                    </td>
                    <td className={entry.quantity_change > 0 ? styles.positive : styles.negative}>
                      {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                    </td>
                    <td>{entry.quantity_after}</td>
                    <td>{entry.reason}</td>
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