/**
 * SOP Users Admin Component
 * Manage enrolled SOP users (top users only)
 */

import React, { useState, useEffect } from 'react';
import { 
  fetchSopUsers, 
  createSopUser, 
  updateSopUser, 
  deleteSopUser 
} from '../../../lib/sop';

const USER_TYPES = [
  { value: 'frontline', label: 'Frontline' },
  { value: 'top', label: 'Top (Admin)' },
];

export default function SOPUsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    brakebee_user_id: '',
    user_type: 'frontline'
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await fetchSopUsers();
      setUsers(list);
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email.trim()) return;

    setAdding(true);
    try {
      await createSopUser({
        email: newUser.email.trim(),
        brakebee_user_id: newUser.brakebee_user_id || null,
        user_type: newUser.user_type
      });
      setNewUser({ email: '', brakebee_user_id: '', user_type: 'frontline' });
      setShowAddForm(false);
      await loadUsers();
    } catch (err) {
      alert('Failed to add user: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateType = async (userId, newType) => {
    try {
      await updateSopUser(userId, { user_type: newType });
      await loadUsers();
    } catch (err) {
      alert('Failed to update user: ' + err.message);
    }
  };

  const handleDelete = async (userId, email) => {
    if (!confirm(`Remove ${email} from SOP access?`)) return;
    
    try {
      await deleteSopUser(userId);
      await loadUsers();
    } catch (err) {
      alert('Failed to remove user: ' + err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="sop-users-loading">
        <i className="fas fa-spinner fa-spin"></i>
        Loading users...
      </div>
    );
  }

  return (
    <div className="sop-users-admin">
      <div className="sop-users-header">
        <h2>SOP Users</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <i className="fas fa-plus"></i>
          Add User
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="sop-add-user-form">
          <form onSubmit={handleAddUser}>
            <div className="form-row">
              <div className="form-group flex-2">
                <label>Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="form-group flex-1">
                <label>Brakebee User ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUser.brakebee_user_id}
                  onChange={(e) => setNewUser(prev => ({ ...prev, brakebee_user_id: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="form-group flex-1">
                <label>Type</label>
                <select
                  className="form-control"
                  value={newUser.user_type}
                  onChange={(e) => setNewUser(prev => ({ ...prev, user_type: e.target.value }))}
                >
                  {USER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={adding}
              >
                {adding ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="sop-users-empty">
          <p>No users enrolled yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table sop-users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Brakebee ID</th>
                <th>Type</th>
                <th>Enrolled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.brakebee_user_id || '-'}</td>
                  <td>
                    <select
                      className="form-control form-control-sm"
                      value={user.user_type}
                      onChange={(e) => handleUpdateType(user.id, e.target.value)}
                    >
                      {USER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(user.id, user.email)}
                      title="Remove user"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
