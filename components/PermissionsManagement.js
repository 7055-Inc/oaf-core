'use client';
import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './PermissionsManagement.module.css';

export default function PermissionsManagement() {
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/users', {
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
          const permissionsResponse = await authenticatedApiRequest(`https://api2.onlineartfestival.com/admin/users/${user.id}/permissions`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (permissionsResponse.ok) {
            const permissions = await permissionsResponse.json();
            return { ...user, permissions };
          }
          
          return { ...user, permissions: { vendor: false } };
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/admin/users/${userId}/permissions`, {
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

  if (loading) {
    return <div className={styles.loading}>Loading permissions...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Permissions Management</h2>
        <p>Manage user permissions for vendor access and other features</p>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.stats}>
          Total Users: {users.length} | Filtered: {filteredUsers.length}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.permissionsTable}>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Username</th>
              <th>User Type</th>
              <th>Vendor Permission</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>
                  <span className={`${styles.userType} ${styles[user.user_type]}`}>
                    {user.user_type}
                  </span>
                </td>
                <td>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={user.permissions?.vendor || false}
                      onChange={(e) => updatePermission(user.id, 'vendor', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                  <span className={styles.permissionStatus}>
                    {user.permissions?.vendor ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 