/**
 * Commission Management Component
 * 
 * Admin-only component for managing vendor commission rates.
 * Uses v2 API at /api/v2/finances/commission-rates
 * Uses global CSS classes
 */

import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../lib/csrf';
import { getApiUrl } from '../../../lib/config';

const API_BASE = '/api/v2/finances';

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

  useEffect(() => {
    loadCommissionRates();
  }, []);

  const loadCommissionRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedApiRequest(
        getApiUrl(`${API_BASE}/commission-rates`),
        { method: 'GET' }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || data.error || 'Failed to load');
      setCommissionRates(data.commission_rates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique key for a rate row (setting_id if exists, otherwise user_id)
  const getRowKey = (rate) => rate.setting_id || `user_${rate.user_id}`;

  const startEdit = (rate) => {
    const rowKey = getRowKey(rate);
    const newEditingIds = new Set(editingIds);
    newEditingIds.add(rowKey);
    setEditingIds(newEditingIds);
    
    setPendingChanges(prev => ({
      ...prev,
      [rowKey]: {
        commission_rate: rate.commission_rate || 15,
        fee_structure: rate.fee_structure || 'commission',
        notes: rate.notes || ''
      }
    }));
  };

  const cancelEdit = (rowKey) => {
    const newEditingIds = new Set(editingIds);
    newEditingIds.delete(rowKey);
    setEditingIds(newEditingIds);
    
    const newPendingChanges = { ...pendingChanges };
    delete newPendingChanges[rowKey];
    setPendingChanges(newPendingChanges);
  };

  const updatePendingChange = (rowKey, field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [field]: value }
    }));
  };

  const saveRow = async (rate) => {
    try {
      setSaving(true);
      const rowKey = rate.setting_id || `user_${rate.user_id}`;
      const changes = pendingChanges[rowKey];
      
      // If user has no setting_id (default rate), pass user_id and user_type to create
      const payload = rate.is_default_rate 
        ? { ...changes, user_id: rate.user_id, user_type: rate.user_type }
        : changes;
      
      const endpoint = rate.is_default_rate
        ? `${API_BASE}/commission-rates`
        : `${API_BASE}/commission-rates/${rate.setting_id}`;
      
      const response = await authenticatedApiRequest(
        getApiUrl(endpoint),
        {
          method: rate.is_default_rate ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || data.error || 'Failed to save');
      
      // Update local state - mark as no longer default if created
      setCommissionRates(prev => prev.map(r => 
        r.user_id === rate.user_id 
          ? { ...r, ...changes, setting_id: data.setting_id || r.setting_id, is_default_rate: false } 
          : r
      ));
      
      cancelEdit(rowKey);
      setSuccessMessage(rate.is_default_rate ? 'Commission rate created!' : 'Commission rate updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleBulkMode = () => {
    setBulkEditMode(!bulkEditMode);
    setSelectedIds(new Set());
    setBulkChanges({});
  };

  const toggleRowSelection = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const selectAllRows = () => {
    if (selectedIds.size === commissionRates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commissionRates.map(r => r.setting_id)));
    }
  };

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
      
      const updates = Array.from(selectedIds).map(id => ({
        id,
        ...bulkChanges
      }));

      const response = await authenticatedApiRequest(
        getApiUrl(`${API_BASE}/commission-rates/bulk`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error?.message || result.error || 'Failed to bulk update');
      
      setCommissionRates(prev => prev.map(rate => 
        selectedIds.has(rate.setting_id) ? { ...rate, ...bulkChanges } : rate
      ));
      
      setBulkEditMode(false);
      setSelectedIds(new Set());
      setBulkChanges({});
      
      setSuccessMessage(`Bulk update completed: ${result.summary?.successful || 0} successful, ${result.summary?.failed || 0} failed`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      <div className="section-header">
        <h2>Commission Management</h2>
        <div className="header-actions">
          <button 
            onClick={toggleBulkMode}
            className={bulkEditMode ? '' : 'secondary'}
          >
            {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </button>
          <button onClick={loadCommissionRates} className="secondary">
            <i className="fa-solid fa-refresh"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          {error}
          <button onClick={() => setError(null)} className="secondary small">Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="success-alert">{successMessage}</div>
      )}

      {/* Bulk Edit Controls */}
      {bulkEditMode && (
        <div className="form-card">
          <h3>Bulk Edit Selected Rows</h3>
          <div className="form-row">
            <div className="form-group">
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
            <div className="form-group">
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
            <div className="form-group">
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
          <div className="form-actions">
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
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {bulkEditMode && (
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === commissionRates.length && commissionRates.length > 0}
                    onChange={selectAllRows}
                  />
                </th>
              )}
              <th>User</th>
              <th>Business Name</th>
              <th>Type</th>
              <th>Fee Structure</th>
              <th>Commission Rate</th>
              <th>Notes</th>
              <th>Stripe Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissionRates.map((rate) => {
              const rowKey = getRowKey(rate);
              return (
              <tr key={rowKey} className={rate.is_default_rate ? 'default-rate-row' : ''}>
                {bulkEditMode && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rowKey)}
                      onChange={() => toggleRowSelection(rowKey)}
                    />
                  </td>
                )}
                <td>
                  <strong>{getDisplayName(rate)}</strong>
                  <br />
                  <small className="text-muted">{rate.email}</small>
                </td>
                <td>{rate.business_name || 'Not specified'}</td>
                <td>
                  <span className={`status-badge ${rate.user_type === 'artist' ? 'info' : 'secondary'}`}>
                    {rate.user_type}
                  </span>
                </td>
                <td>
                  {editingIds.has(rowKey) ? (
                    <select
                      value={pendingChanges[rowKey]?.fee_structure || rate.fee_structure}
                      onChange={(e) => updatePendingChange(rowKey, 'fee_structure', e.target.value)}
                    >
                      <option value="commission">Commission</option>
                      <option value="passthrough">Pass-through</option>
                    </select>
                  ) : (
                    <span className={`status-badge ${rate.fee_structure === 'commission' ? 'success' : 'warning'}`}>
                      {rate.fee_structure}
                    </span>
                  )}
                </td>
                <td>
                  {editingIds.has(rowKey) ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={pendingChanges[rowKey]?.commission_rate ?? rate.commission_rate}
                      onChange={(e) => updatePendingChange(rowKey, 'commission_rate', parseFloat(e.target.value))}
                      className="input-small"
                    />
                  ) : (
                    <>
                      <strong>{rate.commission_rate}%</strong>
                      {rate.is_default_rate && <span className="status-badge muted small">default</span>}
                    </>
                  )}
                </td>
                <td>
                  {editingIds.has(rowKey) ? (
                    <input
                      type="text"
                      value={pendingChanges[rowKey]?.notes ?? rate.notes ?? ''}
                      onChange={(e) => updatePendingChange(rowKey, 'notes', e.target.value)}
                      placeholder="Notes..."
                    />
                  ) : (
                    <span className="text-muted">{rate.notes || (rate.is_default_rate ? 'Using default' : 'No notes')}</span>
                  )}
                </td>
                <td>
                  {rate.stripe_account_id ? (
                    <span className={`status-badge ${rate.stripe_account_verified ? 'success' : 'warning'}`}>
                      {rate.stripe_account_verified ? 'Verified' : 'Pending'}
                    </span>
                  ) : (
                    <span className="status-badge danger">Not Connected</span>
                  )}
                </td>
                <td>
                  {editingIds.has(rowKey) ? (
                    <div className="button-group">
                      <button 
                        onClick={() => saveRow(rate)}
                        disabled={saving}
                        className="small success"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={() => cancelEdit(rowKey)}
                        className="secondary small"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEdit(rate)}
                      className="secondary small"
                    >
                      {rate.is_default_rate ? 'Set Rate' : 'Edit'}
                    </button>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="form-card">
        <h3>Summary</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{commissionRates.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Artists</span>
            <span className="stat-value">{commissionRates.filter(r => r.user_type === 'artist').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Promoters</span>
            <span className="stat-value">{commissionRates.filter(r => r.user_type === 'promoter').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Commission Users</span>
            <span className="stat-value">{commissionRates.filter(r => r.fee_structure === 'commission').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pass-through Users</span>
            <span className="stat-value">{commissionRates.filter(r => r.fee_structure === 'passthrough').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionManagement;
