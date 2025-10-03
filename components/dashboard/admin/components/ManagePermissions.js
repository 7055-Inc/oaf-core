'use client';
import { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../SlideIn.module.css';

export default function ManagePermissions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const response = await authApiRequest('admin/users', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      // Fetch permissions for each user
      const usersWithPermissions = await Promise.all(
        data.map(async (user) => {
          const permissionsResponse = await authApiRequest(`admin/users/${user.id}/permissions`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (permissionsResponse.ok) {
            const permissions = await permissionsResponse.json();
            return { ...user, permissions };
          }
          
          return { 
            ...user, 
            permissions: { 
              vendor: false, 
              events: false, 
              stripe_connect: false, 
              manage_sites: false, 
              manage_content: false, 
              manage_system: false 
            } 
          };
        })
      );

      setUsers(usersWithPermissions);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchLower) ||
        user.user_type?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredUsers(filtered);
  };

  const updatePermission = async (userId, permissionType, value) => {
    try {
      const response = await authApiRequest(`admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [permissionType]: value })
      });

      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, permissions: { ...user.permissions, [permissionType]: value } }
          : user
      ));

    } catch (err) {
      setError(err.message);
    }
  };

  const getUserTypeStatusClass = (userType) => {
    switch (userType) {
      case 'artist': return styles.statusProcessing;
      case 'promoter': return styles.statusPending;
      case 'community': return styles.statusCompleted;
      case 'admin': return styles.statusDefault;
      default: return styles.statusDefault;
    }
  };

  // Helper function to render permission toggle
  const renderPermissionToggle = (user, permissionType, label) => {
    const isChecked = user.permissions?.[permissionType] || false;
    const isAdmin = user.user_type === 'admin';
    const isDisabled = isAdmin && ['manage_sites', 'manage_content', 'manage_system'].includes(permissionType);
    
    return (
      <td key={permissionType} className={styles.tableCell}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={isChecked || (isAdmin && ['manage_sites', 'manage_content', 'manage_system'].includes(permissionType))}
              onChange={(e) => updatePermission(user.id, permissionType, e.target.checked)}
              disabled={isDisabled}
              style={{ marginRight: '6px', transform: 'scale(1.2)' }}
            />
          </label>
          <span style={{ 
            fontSize: '11px', 
            color: (isChecked || (isAdmin && ['manage_sites', 'manage_content', 'manage_system'].includes(permissionType))) ? '#28a745' : '#6c757d',
            fontWeight: '500'
          }}>
            {(isChecked || (isAdmin && ['manage_sites', 'manage_content', 'manage_system'].includes(permissionType))) ? 'Enabled' : 'Disabled'}
            {isDisabled && ' (Auto)'}
          </span>
        </div>
      </td>
    );
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading permissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <p style={{ color: '#6c757d', marginBottom: '20px', fontSize: '14px' }}>
          Manage user permissions for vendor access, event management, Stripe Connect, content management, site management, and system administration
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: '300px' }}
          />
          <span style={{ color: '#6c757d', fontSize: '14px' }}>
            Total: {users.length} | Filtered: {filteredUsers.length}
          </span>
        </div>
      </div>

      <div className="section-box">
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr className={styles.tableRow}>
              <th className={styles.tableHeaderCell}>User ID</th>
              <th className={styles.tableHeaderCell}>Username</th>
              <th className={styles.tableHeaderCell}>User Type</th>
              <th className={styles.tableHeaderCell}>Vendor</th>
              <th className={styles.tableHeaderCell}>Events</th>
              <th className={styles.tableHeaderCell}>Stripe Connect</th>
              <th className={styles.tableHeaderCell}>Manage Sites</th>
              <th className={styles.tableHeaderCell}>Manage Content</th>
              <th className={styles.tableHeaderCell}>Manage System</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={styles.tableRow}>
                <td className={styles.tableCell}>{user.id}</td>
                <td className={styles.tableCell}>{user.username}</td>
                <td className={styles.tableCell}>
                  <span className={`${styles.statusBadge} ${getUserTypeStatusClass(user.user_type)}`}>
                    {user.user_type}
                  </span>
                </td>
                {renderPermissionToggle(user, 'vendor', 'Vendor')}
                {renderPermissionToggle(user, 'events', 'Events')}
                {renderPermissionToggle(user, 'stripe_connect', 'Stripe Connect')}
                {renderPermissionToggle(user, 'manage_sites', 'Manage Sites')}
                {renderPermissionToggle(user, 'manage_content', 'Manage Content')}
                {renderPermissionToggle(user, 'manage_system', 'Manage System')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 