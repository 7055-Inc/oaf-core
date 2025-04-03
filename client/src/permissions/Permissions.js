import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './Permissions.css';

Modal.setAppElement('#root');

function Permissions({ isLoggedIn }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('username');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editUser, setEditUser] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/permissions')
        .then(res => res.json())
        .then(data => setUsers(data));
    }
  }, [isLoggedIn]);

  const handleSort = (field) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    setUsers([...users].sort((a, b) => {
      const valA = a[field] || '';
      const valB = b[field] || '';
      return newOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }));
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.user_type.toLowerCase().includes(search.toLowerCase())
  );

  const handlePermissionChange = () => {
    if (!reason) {
      alert('Please provide a reason for the change.');
      return;
    }
    fetch('/api/permissions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editUser, reason })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(users.map(u => u.username === editUser.username ? { ...u, ...editUser } : u));
          setEditUser(null);
          setReason('');
        }
      });
  };

  return (
    <div className="permissions-container">
      <h2>Permissions Management</h2>
      <input 
        type="text" 
        placeholder="Search users..." 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
        className="search-input"
      />
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('username')}>User {sortField === 'username' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user.username}>
              <td>{user.username} ({user.user_type})</td>
              <td>
                <button onClick={() => setEditUser(user)}>Edit Permissions</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editUser && (
        <Modal
          isOpen={!!editUser}
          onRequestClose={() => {}}
          style={{
            content: {
              top: '50%',
              left: '50%',
              right: 'auto',
              bottom: 'auto',
              marginRight: '-50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '500px',
              width: '100%',
              padding: '20px',
              borderRadius: '0',
              fontFamily: "'Playwrite Italia Moderna', cursive"
            }
          }}
        >
          <h2>Edit Permissions for {editUser.username}</h2>
          <div className="permissions-modal">
            <h3>Artist</h3>
            <label><input type="checkbox" checked={editUser.is_artist === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_artist: e.target.checked ? 'yes' : 'no' })} /> Is Artist</label>
            <label><input type="checkbox" checked={editUser.profile_access === 'yes'} onChange={(e) => setEditUser({ ...editUser, profile_access: e.target.checked ? 'yes' : 'no' })} /> Profile Access</label>
            <label><input type="checkbox" checked={editUser.is_customer === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_customer: e.target.checked ? 'yes' : 'no' })} /> Is Customer</label>
            <label><input type="checkbox" checked={editUser.gallery_access === 'yes'} onChange={(e) => setEditUser({ ...editUser, gallery_access: e.target.checked ? 'yes' : 'no' })} /> Gallery Access</label>
            <label><input type="checkbox" checked={editUser.marketplace_vendor === 'yes'} onChange={(e) => setEditUser({ ...editUser, marketplace_vendor: e.target.checked ? 'yes' : 'no' })} /> Marketplace Vendor</label>
            <label><input type="checkbox" checked={editUser.is_verified === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_verified: e.target.checked ? 'yes' : 'no' })} /> Is Verified</label>

            <h3>Promoter</h3>
            <label><input type="checkbox" checked={editUser.is_promoter === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_promoter: e.target.checked ? 'yes' : 'no' })} /> Is Promoter</label>
            <label><input type="checkbox" checked={editUser.profile_access === 'yes'} onChange={(e) => setEditUser({ ...editUser, profile_access: e.target.checked ? 'yes' : 'no' })} /> Profile Access</label>
            <label><input type="checkbox" checked={editUser.is_customer === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_customer: e.target.checked ? 'yes' : 'no' })} /> Is Customer</label>
            <label><input type="checkbox" checked={editUser.gallery_access === 'yes'} onChange={(e) => setEditUser({ ...editUser, gallery_access: e.target.checked ? 'yes' : 'no' })} /> Gallery Access</label>
            <label><input type="checkbox" checked={editUser.is_verified === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_verified: e.target.checked ? 'yes' : 'no' })} /> Is Verified</label>

            <h3>Community</h3>
            <label><input type="checkbox" checked={editUser.is_community === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_community: e.target.checked ? 'yes' : 'no' })} /> Is Community</label>
            <label><input type="checkbox" checked={editUser.profile_access === 'yes'} onChange={(e) => setEditUser({ ...editUser, profile_access: e.target.checked ? 'yes' : 'no' })} /> Profile Access</label>
            <label><input type="checkbox" checked={editUser.is_customer === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_customer: e.target.checked ? 'yes' : 'no' })} /> Is Customer</label>
            <label><input type="checkbox" checked={editUser.gallery_access === 'yes'} onChange={(e) => setEditUser({ ...editUser, gallery_access: e.target.checked ? 'yes' : 'no' })} /> Gallery Access</label>
            <label><input type="checkbox" checked={editUser.is_verified === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_verified: e.target.checked ? 'yes' : 'no' })} /> Is Verified</label>

            <h3>Admin</h3>
            <label><input type="checkbox" checked={editUser.is_admin === 'yes'} onChange={(e) => setEditUser({ ...editUser, is_admin: e.target.checked ? 'yes' : 'no' })} /> Is Admin</label>

            <label>Reason for Manual Change:</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required />
            <div className="button-group">
              <button onClick={() => { setEditUser(null); setReason(''); }}>Cancel</button>
              <button onClick={handlePermissionChange}>Submit</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Permissions;