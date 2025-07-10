'use client';
import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './InventoryLog.module.css';

export default function InventoryLog({ productId, onInventoryUpdate }) {
  const [inventoryData, setInventoryData] = useState(null);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuickAdjust, setShowQuickAdjust] = useState(false);
  const [quickAdjustment, setQuickAdjustment] = useState({
    type: 'set',
    value: '',
    reason: ''
  });
  const [adjustingInventory, setAdjustingInventory] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (productId) {
      fetchInventoryData();
    }
  }, [productId]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch current inventory status
      const inventoryResponse = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/inventory/${productId}`
      );
      
      if (inventoryResponse.ok) {
        const data = await inventoryResponse.json();
        setInventoryData(data.inventory);
        setInventoryHistory(data.history || []);
      } else {
        // If inventory record doesn't exist, create a default one
        setInventoryData({
          qty_on_hand: 0,
          qty_on_order: 0,
          qty_available: 0,
          reorder_qty: 0
        });
        setInventoryHistory([]);
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdjustment = async () => {
    if (!quickAdjustment.value || !quickAdjustment.reason) {
      setError('Please enter both a value and reason for the adjustment');
      return;
    }

    setAdjustingInventory(true);
    setError(null);
    
    try {
      let newQuantity;
      switch (quickAdjustment.type) {
        case 'set':
          newQuantity = parseInt(quickAdjustment.value);
          break;
        case 'add':
          newQuantity = (inventoryData?.qty_on_hand || 0) + parseInt(quickAdjustment.value);
          break;
        case 'subtract':
          newQuantity = Math.max(0, (inventoryData?.qty_on_hand || 0) - parseInt(quickAdjustment.value));
          break;
        default:
          newQuantity = inventoryData?.qty_on_hand || 0;
      }

      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/inventory/${productId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qty_on_hand: newQuantity,
            change_type: 'manual_adjustment',
            reason: quickAdjustment.reason
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update inventory');
      }

      // Refresh inventory data
      await fetchInventoryData();
      
      // Call parent callback if provided
      if (onInventoryUpdate) {
        onInventoryUpdate(productId, newQuantity);
      }
      
      // Reset form
      setQuickAdjustment({ type: 'set', value: '', reason: '' });
      setShowQuickAdjust(false);
      setSuccess('Inventory updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating inventory:', err);
      setError('Failed to update inventory');
    } finally {
      setAdjustingInventory(false);
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
        <div className={styles.loading}>Loading inventory data...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Inventory Management</h3>
        <button
          onClick={() => setShowQuickAdjust(!showQuickAdjust)}
          className={styles.quickAdjustButton}
        >
          Quick Adjust
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Current Inventory Status */}
      <div className={styles.currentStatus}>
        <h4>Current Inventory Status</h4>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>On Hand:</span>
            <span className={styles.statusValue}>{inventoryData?.qty_on_hand || 0}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>On Order:</span>
            <span className={styles.statusValue}>{inventoryData?.qty_on_order || 0}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Available:</span>
            <span className={styles.statusValue}>{inventoryData?.qty_available || 0}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Reorder Level:</span>
            <span className={styles.statusValue}>{inventoryData?.reorder_qty || 0}</span>
          </div>
        </div>
      </div>

      {/* Quick Adjustment Form */}
      {showQuickAdjust && (
        <div className={styles.quickAdjustForm}>
          <h4>Quick Inventory Adjustment</h4>
          <div className={styles.adjustmentForm}>
            <div className={styles.formGroup}>
              <label>Adjustment Type:</label>
              <select
                value={quickAdjustment.type}
                onChange={(e) => setQuickAdjustment({...quickAdjustment, type: e.target.value})}
                className={styles.select}
              >
                <option value="set">Set to specific value</option>
                <option value="add">Add to current inventory</option>
                <option value="subtract">Subtract from current inventory</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Value:</label>
              <input
                type="number"
                value={quickAdjustment.value}
                onChange={(e) => setQuickAdjustment({...quickAdjustment, value: e.target.value})}
                className={styles.input}
                min="0"
                placeholder="Enter quantity"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Reason:</label>
              <input
                type="text"
                value={quickAdjustment.reason}
                onChange={(e) => setQuickAdjustment({...quickAdjustment, reason: e.target.value})}
                className={styles.input}
                placeholder="e.g., Inventory count correction, New stock received"
              />
            </div>

            <div className={styles.formActions}>
              <button
                onClick={handleQuickAdjustment}
                disabled={adjustingInventory || !quickAdjustment.value || !quickAdjustment.reason}
                className={styles.updateButton}
              >
                {adjustingInventory ? 'Updating...' : 'Update Inventory'}
              </button>
              <button
                onClick={() => setShowQuickAdjust(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory History */}
      <div className={styles.historySection}>
        <h4>Inventory History</h4>
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