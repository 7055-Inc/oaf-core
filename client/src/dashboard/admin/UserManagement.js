import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import './UserManagement.css';

/**
 * User Management component for admin dashboard
 * Allows listing, filtering, and editing users
 */
const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Example user types
  const userTypes = ['all', 'admin', 'artist', 'promoter', 'community'];
  
  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!user) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        // In production, this would call the actual API
        // For now, use dummy data
        const dummyUsers = [
          {
            id: 1,
            name: 'Admin User',
            email: 'admin@example.com',
            user_type: 'admin',
            status: 'active',
            created_at: '2023-01-15'
          },
          {
            id: 2,
            name: 'Artist One',
            email: 'artist1@example.com',
            user_type: 'artist',
            status: 'active',
            created_at: '2023-02-20'
          },
          {
            id: 3,
            name: 'Artist Two',
            email: 'artist2@example.com',
            user_type: 'artist',
            status: 'inactive',
            created_at: '2023-03-10'
          },
          {
            id: 4,
            name: 'Promoter User',
            email: 'promoter@example.com',
            user_type: 'promoter',
            status: 'active',
            created_at: '2023-04-05'
          },
          {
            id: 5,
            name: 'Community Member',
            email: 'community@example.com',
            user_type: 'community',
            status: 'active',
            created_at: '2023-05-12'
          }
        ];
        
        setUsers(dummyUsers);
        setTotalPages(Math.ceil(dummyUsers.length / 10)); // Assuming 10 per page
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [user]);
  
  // Filter users based on search term and type filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = userTypeFilter === 'all' || user.user_type === userTypeFilter;
    
    return matchesSearch && matchesType;
  });
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };
  
  // Handle user type filter change
  const handleTypeFilterChange = (e) => {
    setUserTypeFilter(e.target.value);
    setCurrentPage(1); // Reset to first page on new filter
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  if (loading) {
    return <div className="loading">Loading users...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="user-management">
      <div className="panel-header">
        <h2>User Management</h2>
        <p>View and manage system users</p>
      </div>
      
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <i className="fas fa-search search-icon"></i>
        </div>
        
        <div className="filter-container">
          <select 
            value={userTypeFilter} 
            onChange={handleTypeFilterChange}
            className="type-filter"
          >
            {userTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : `${type.charAt(0).toUpperCase() + type.slice(1)}s`}
              </option>
            ))}
          </select>
        </div>
        
        <button className="add-user-btn">
          <i className="fas fa-plus"></i> Add User
        </button>
      </div>
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>User Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-results">No users found</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`user-type ${user.user_type}`}>
                      {user.user_type}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="action-btn edit-btn" title="Edit User">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="action-btn delete-btn" title="Delete User">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn prev" 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          
          <div className="page-numbers">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`page-number ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <button 
            className="page-btn next" 
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 