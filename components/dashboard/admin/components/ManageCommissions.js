import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

const CommissionManagement = () => {
  const [commissionRates, setCommissionRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingIds, setEditingIds] = useState(new Set());
  const [pendingChanges, setPendingChanges] = useState({});
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkChanges, setBulkChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch commission rates from API
  useEffect(() => {
    fetchCommissionRates();
  }, []);

  const fetchCommissionRates = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl('api/finance/commission-rates'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch commission rates');
      }

      const data = await response.json();
      setCommissionRates(data.commission_rates || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching commission rates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start editing a specific row
  const startEdit = (id) => {
    const newEditingIds = new Set(editingIds);
    newEditingIds.add(id);
    setEditingIds(newEditingIds);
    
    // Initialize pending changes for this row
    const currentRate = commissionRates.find(r => r.setting_id === id);
    setPendingChanges(prev => ({
      ...prev,
      [id]: {
        commission_rate: currentRate?.commission_rate || 0,
        fee_structure: currentRate?.fee_structure || 'commission',
        notes: currentRate?.notes || ''
      }
    }));
  };

  // Cancel editing a specific row
  const cancelEdit = (id) => {
    const newEditingIds = new Set(editingIds);
    newEditingIds.delete(id);
    setEditingIds(newEditingIds);
    
    // Remove pending changes for this row
    const newPendingChanges = { ...pendingChanges };
    delete newPendingChanges[id];
    setPendingChanges(newPendingChanges);
  };

  // Update pending changes for a row
  const updatePendingChange = (id, field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  // Save changes for a specific row
  const saveRow = async (id) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const changes = pendingChanges[id];
      
      const response = await fetch(`api/finance/commission-rates/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changes)
      });

      if (!response.ok) {
        throw new Error('Failed to update commission rate');
      }

      // Update the local state
      setCommissionRates(prev => prev.map(rate => 
        rate.setting_id === id 
          ? { ...rate, ...changes }
          : rate
      ));

      // Clear editing state
      cancelEdit(id);
      setSuccessMessage('Commission rate updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError(err.message);
      console.error('Error saving commission rate:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle bulk edit mode
  const toggleBulkMode = () => {
    setBulkEditMode(!bulkEditMode);
    setSelectedIds(new Set());
    setBulkChanges({});
  };

  // Toggle row selection for bulk edit
  const toggleRowSelection = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  // Select all rows for bulk edit
  const selectAllRows = () => {
    if (selectedIds.size === commissionRates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commissionRates.map(r => r.setting_id)));
    }
  };

  // Apply bulk changes
  const applyBulkChanges = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one row to update');
      return;
    }

    if (Object.keys(bulkChanges).length === 0) {
      setError('Please make at least one change to apply');
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      
      const updates = Array.from(selectedIds).map(id => ({
        id,
        ...bulkChanges
      }));

      const response = await fetch('api/finance/commission-rates/bulk', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        throw new Error('Failed to apply bulk changes');
      }

      const result = await response.json();
      
      // Update local state for successful updates
      setCommissionRates(prev => prev.map(rate => 
        selectedIds.has(rate.setting_id)
          ? { ...rate, ...bulkChanges }
          : rate
      ));

      // Reset bulk edit state
      setBulkEditMode(false);
      setSelectedIds(new Set());
      setBulkChanges({});
      
      setSuccessMessage(`Bulk update completed: ${result.summary?.successful || 0} successful, ${result.summary?.failed || 0} failed`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (err) {
      setError(err.message);
      console.error('Error applying bulk changes:', err);
    } finally {
      setSaving(false);
    }
  };

  // Get display name for user
  const getDisplayName = (rate) => {
    if (rate.display_name) return rate.display_name;
    if (rate.first_name && rate.last_name) return `${rate.first_name} ${rate.last_name}`;
    return rate.email || 'Unknown User';
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading commission rates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="error-alert">
          Error: {error}
          <button onClick={fetchCommissionRates} className="secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={toggleBulkMode}
            className={bulkEditMode ? '' : 'secondary'}
          >
            {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </button>
          <button onClick={fetchCommissionRates} className="secondary">
            Refresh
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="success-alert">
          {successMessage}
        </div>
      )}

      {/* Bulk Edit Controls */}
      {bulkEditMode && (
        <div className="form-card">
          <h3>Bulk Edit Selected Rows</h3>
          <div className="form-grid-3">
            <div>
              <label>Commission Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={bulkChanges.commission_rate || ''}
                onChange={(e) => setBulkChanges(prev => ({
                  ...prev,
                  commission_rate: parseFloat(e.target.value) || undefined
                }))}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div>
              <label>Fee Structure</label>
              <select
                value={bulkChanges.fee_structure || ''}
                onChange={(e) => setBulkChanges(prev => ({
                  ...prev,
                  fee_structure: e.target.value || undefined
                }))}
              >
                <option value="">Keep Current</option>
                <option value="commission">Commission</option>
                <option value="passthrough">Pass-through</option>
              </select>
            </div>
            <div>
              <label>Notes</label>
              <input
                type="text"
                value={bulkChanges.notes || ''}
                onChange={(e) => setBulkChanges(prev => ({
                  ...prev,
                  notes: e.target.value || undefined
                }))}
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              onClick={applyBulkChanges}
              disabled={saving || selectedIds.size === 0}
            >
              {saving ? 'Applying...' : `Apply to ${selectedIds.size} Selected`}
            </button>
            <button onClick={toggleBulkMode} className="secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Commission Rates Table */}
      <div className="section-box">
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              {bulkEditMode && (
                <th className={styles.tableHeaderCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === commissionRates.length && commissionRates.length > 0}
                    onChange={selectAllRows}
                  />
                </th>
              )}
              <th className={styles.tableHeaderCell}>User</th>
              <th className={styles.tableHeaderCell}>Business Name</th>
              <th className={styles.tableHeaderCell}>Type</th>
              <th className={styles.tableHeaderCell}>Fee Structure</th>
              <th className={styles.tableHeaderCell}>Commission Rate</th>
              <th className={styles.tableHeaderCell}>Notes</th>
              <th className={styles.tableHeaderCell}>Stripe Status</th>
              <th className={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissionRates.map((rate) => (
              <tr key={rate.setting_id} className={`${styles.tableRow} ${editingIds.has(rate.setting_id) ? styles.tableRowEditing : ''}`}>
                {bulkEditMode && (
                  <td className={styles.tableCell}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rate.setting_id)}
                      onChange={() => toggleRowSelection(rate.setting_id)}
                    />
                  </td>
                )}
                <td className={styles.tableCell}>
                  <div>
                    <strong style={{ color: '#055474', fontSize: '14px' }}>{getDisplayName(rate)}</strong>
                    <br />
                    <small style={{ color: '#6c757d', fontSize: '12px' }}>{rate.email}</small>
                  </div>
                </td>
                <td className={styles.tableCell}>{rate.business_name || 'Not specified'}</td>
                <td className={styles.tableCell}>
                  <span className={rate.user_type === 'artist' ? styles.statusProcessing : styles.statusDefault}>
                    {rate.user_type}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  {editingIds.has(rate.setting_id) ? (
                    <select
                      value={pendingChanges[rate.setting_id]?.fee_structure || rate.fee_structure}
                      onChange={(e) => updatePendingChange(rate.setting_id, 'fee_structure', e.target.value)}
                    >
                      <option value="commission">Commission</option>
                      <option value="passthrough">Pass-through</option>
                    </select>
                  ) : (
                    <span className={rate.fee_structure === 'commission' ? styles.statusCompleted : styles.statusPending}>
                      {rate.fee_structure}
                    </span>
                  )}
                </td>
                <td className={styles.tableCell}>
                  {editingIds.has(rate.setting_id) ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={pendingChanges[rate.setting_id]?.commission_rate || rate.commission_rate}
                      onChange={(e) => updatePendingChange(rate.setting_id, 'commission_rate', parseFloat(e.target.value))}
                      style={{ width: '80px', padding: '6px 8px', textAlign: 'center' }}
                    />
                  ) : (
                    <span style={{ fontWeight: '500', color: '#055474', fontSize: '14px' }}>
                      {rate.commission_rate}%
                    </span>
                  )}
                </td>
                <td className={styles.tableCell}>
                  {editingIds.has(rate.setting_id) ? (
                    <input
                      type="text"
                      value={pendingChanges[rate.setting_id]?.notes || rate.notes || ''}
                      onChange={(e) => updatePendingChange(rate.setting_id, 'notes', e.target.value)}
                      style={{ width: '150px', padding: '6px 8px' }}
                    />
                  ) : (
                    <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '13px' }}>
                      {rate.notes || 'Default rate'}
                    </span>
                  )}
                </td>
                <td className={styles.tableCell}>
                  {rate.stripe_account_id ? (
                    <span className={rate.stripe_account_verified ? styles.statusCompleted : styles.statusPending}>
                      {rate.stripe_account_verified ? 'Verified' : 'Pending'}
                    </span>
                  ) : (
                    <span className={styles.statusFailed}>
                      Not Connected
                    </span>
                  )}
                </td>
                <td className={styles.tableCell}>
                  {editingIds.has(rate.setting_id) ? (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        onClick={() => saveRow(rate.setting_id)}
                        disabled={saving}
                        style={{
                          padding: '6px 12px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={() => cancelEdit(rate.setting_id)}
                        className="secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEdit(rate.setting_id)}
                      className="secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="form-card">
        <h3>Summary</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px' 
        }}>
          <div>
            <strong>Total Users:</strong> {commissionRates.length}
          </div>
          <div>
            <strong>Artists:</strong> {commissionRates.filter(r => r.user_type === 'artist').length}
          </div>
          <div>
            <strong>Promoters:</strong> {commissionRates.filter(r => r.user_type === 'promoter').length}
          </div>
          <div>
            <strong>Commission Users:</strong> {commissionRates.filter(r => r.fee_structure === 'commission').length}
          </div>
          <div>
            <strong>Pass-through Users:</strong> {commissionRates.filter(r => r.fee_structure === 'passthrough').length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionManagement; 