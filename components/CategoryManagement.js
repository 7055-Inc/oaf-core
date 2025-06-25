'use client';
import { useState, useEffect } from 'react';

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    description: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://api2.onlineartfestival.com/categories');
      if (!res.ok) {
        throw new Error('Failed to load categories');
      }
      const data = await res.json();
      setCategories(data.categories);
      setFlatCategories(data.flat_categories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const url = editingCategory 
        ? `https://api2.onlineartfestival.com/categories/${editingCategory.id}`
        : 'https://api2.onlineartfestival.com/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const requestBody = {
        name: formData.name,
        parent_id: formData.parent_id || null,
        description: formData.description
      };
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save category');
      }

      const result = await res.json();
      setSuccess(result.message);
      setShowAddForm(false);
      setEditingCategory(null);
      setFormData({ name: '', parent_id: '', description: '' });
      loadCategories();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id || '',
      description: category.description || ''
    });
    setShowAddForm(true);
    
    // Scroll to the form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.querySelector('[data-category-form]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const res = await fetch(`https://api2.onlineartfestival.com/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      setSuccess('Category deleted successfully');
      loadCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    setFormData({ name: '', parent_id: '', description: '' });
  };

  const renderCategoryTree = (categoryList, level = 0) => {
    return categoryList.map(category => (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem',
          border: editingCategory && editingCategory.id === category.id ? '2px solid #055474' : '1px solid #ddd',
          marginBottom: '0.5rem',
          borderRadius: '4px',
          backgroundColor: editingCategory && editingCategory.id === category.id ? '#f0f8ff' : '#f9f9f9'
        }}>
          <div style={{ flex: 1 }}>
            <strong>{category.name}</strong>
            {editingCategory && editingCategory.id === category.id && (
              <span style={{ 
                marginLeft: '0.5rem', 
                backgroundColor: '#055474', 
                color: 'white', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '12px', 
                fontSize: '0.7rem' 
              }}>
                EDITING
              </span>
            )}
            {category.description && (
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                {category.description}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
              {category.child_count > 0 && `${category.child_count} subcategories`}
              {category.product_count > 0 && ` • ${category.product_count} products`}
              {category.parent_name && ` • Parent: ${category.parent_name}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleEdit(category)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#055474',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Delete
            </button>
          </div>
        </div>
        {category.children && category.children.length > 0 && (
          renderCategoryTree(category.children, level + 1)
        )}
      </div>
    ));
  };

  if (loading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div>
      <h3>Category Management</h3>
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb', 
          borderRadius: '4px', 
          marginBottom: '1rem' 
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          border: '1px solid #c3e6cb', 
          borderRadius: '4px', 
          marginBottom: '1rem' 
        }}>
          {success}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {editingCategory ? 'Cancel Edit' : 'Add New Category'}
        </button>
      </div>

      {showAddForm && (
        <div 
          data-category-form
          style={{
            border: editingCategory ? '2px solid #055474' : '1px solid #ddd',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            backgroundColor: editingCategory ? '#f0f8ff' : '#f8f9fa',
            boxShadow: editingCategory ? '0 4px 8px rgba(5, 84, 116, 0.1)' : 'none'
          }}
        >
          <h4 style={{ color: editingCategory ? '#055474' : '#333' }}>
            {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
          </h4>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Category Name: *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder="Enter category name"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Parent Category:
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">No Parent (Top Level)</option>
                {flatCategories.map(cat => (
                  <option key={cat.id} value={cat.id} disabled={editingCategory && cat.id === editingCategory.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Description:
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder="Enter category description (optional)"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h4>Categories ({categories.length} root categories)</h4>
        {categories.length === 0 ? (
          <p>No categories found. Create your first category above.</p>
        ) : (
          renderCategoryTree(categories)
        )}
      </div>
    </div>
  );
} 