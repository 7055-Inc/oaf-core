'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', status: 'draft', user_type: 'community' });
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    setIsLoggedIn(true);
    fetchUserData(token);
  }, [router]);

  const fetchUserData = async (token) => {
    try {
      const res = await fetch('https://api2.onlineartfestival.com/auth/exchange', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider: 'validate', token })
      });
      if (!res.ok) {
        throw new Error('Failed to validate token');
      }
      const data = await res.json();
      if (!data.roles.includes('admin')) {
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);
      fetchUsers(token);
    } catch (err) {
      console.error('Error validating user:', err);
      localStorage.removeItem('token');
      setIsLoggedIn(false);
    }
  };

  const fetchUsers = async (token) => {
    try {
      const res = await fetch('https://api2.onlineartfestival.com/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Fetch users error:', err.message);
      setError(err.message);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api2.onlineartfestival.com/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: editingUser.username,
          status: editingUser.status,
          user_type: editingUser.user_type
        })
      });
      if (!res.ok) {
        throw new Error('Failed to update user');
      }
      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      setError(null);
    } catch (err) {
      console.error('Update user error:', err.message);
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api2.onlineartfestival.com/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to delete user');
      }
      setUsers(users.filter(u => u.id !== userId));
      setError(null);
    } catch (err) {
      console.error('Delete user error:', err.message);
      setError(err.message);
    }
  };

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://api2.onlineartfestival.com/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newUser.username,
          status: newUser.status,
          user_type: newUser.user_type
        })
      });
      if (!res.ok) {
        throw new Error('Failed to add user');
      }
      const data = await res.json();
      setUsers([...users, data]);
      setNewUser({ username: '', status: 'draft', user_type: 'community' });
      setShowAddForm(false);
      setError(null);
    } catch (err) {
      console.error('Add user error:', err.message);
      setError(err.message);
    }
  };

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        <h1>Admin Dashboard - User Management</h1>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        
        <div>
          <h2>Add New User</h2>
          <button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add New User'}
          </button>
          {showAddForm && (
            <div style={{ marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="Username (email)"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                style={{ marginRight: '0.5rem' }}
              />
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                style={{ marginRight: '0.5rem' }}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={newUser.user_type}
                onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value })}
                style={{ marginRight: '0.5rem' }}
              >
                <option value="community">Community</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleAddUser}>Add User</button>
            </div>
          )}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2>Users</h2>
          {users.length > 0 ? (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Username</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>User Type</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.id}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {editingUser && editingUser.id === user.id ? (
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {editingUser && editingUser.id === user.id ? (
                        <select
                          value={editingUser.status}
                          onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        user.status
                      )}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {editingUser && editingUser.id === user.id ? (
                        <select
                          value={editingUser.user_type}
                          onChange={(e) => setEditingUser({ ...editingUser, user_type: e.target.value })}
                        >
                          <option value="community">Community</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        user.user_type
                      )}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {editingUser && editingUser.id === user.id ? (
                        <>
                          <button onClick={handleSaveUser}>Save</button>
                          <button onClick={() => setEditingUser(null)} style={{ marginLeft: '0.5rem' }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditUser(user)}>Edit</button>
                          <button onClick={() => handleDeleteUser(user.id)} style={{ marginLeft: '0.5rem' }}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}