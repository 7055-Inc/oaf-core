import { useEffect, useState } from 'react';
import { useProductForm } from '../ProductFormContext';
import AddCategoryModal from '../../../../AddCategoryModal';

export default function BasicInfoSection() {
  const { 
    formData, 
    updateField, 
    categories, 
    userCategories,
    loadCategories,
    loadUserCategories,
    addUserCategory,
    generateSKU
  } = useProductForm();

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
    if (userCategories.length === 0) {
      loadUserCategories();
    }
  }, [categories.length, userCategories.length, loadCategories, loadUserCategories]);

  const handleAddNewCategory = async (categoryData) => {
    try {
      const newCategory = await addUserCategory(categoryData);
      updateField('user_category_id', newCategory.id);
      setShowAddCategoryModal(false);
    } catch (err) {
      throw err;
    }
  };

  const handleGenerateSKU = () => {
    const sku = generateSKU(formData.name);
    updateField('sku', sku);
  };

  return (
    <div>
      {/* Product Name */}
      <div style={{ marginBottom: '16px' }}>
        <label>Product Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="Enter product name"
          required
        />
      </div>

      {/* Price and SKU Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label>Retail Price *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={e => updateField('price', e.target.value)}
              style={{ paddingLeft: '24px' }}
              placeholder="0.00"
              required
            />
          </div>
        </div>
        
        <div>
          <label>SKU *</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={formData.sku}
              onChange={e => updateField('sku', e.target.value.toUpperCase())}
              style={{ flex: 1 }}
              placeholder="PROD-001"
              required
            />
            <button
              type="button"
              className="secondary"
              onClick={handleGenerateSKU}
              title="Generate a unique SKU based on product name"
            >
              <i className="fas fa-sync-alt"></i> Generate
            </button>
          </div>
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom: '16px' }}>
        <label>Category *</label>
        <select
          value={formData.category_id}
          onChange={e => updateField('category_id', e.target.value)}
          required
        >
          <option value="">-- Select Category --</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.displayName || cat.name}</option>
          ))}
        </select>
      </div>

      {/* Vendor Category */}
      <div style={{ marginBottom: '16px' }}>
        <label>Your Category</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={formData.user_category_id || ''}
            onChange={e => updateField('user_category_id', e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">-- Select your category (optional) --</option>
            {userCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={() => setShowAddCategoryModal(true)}>
            + Add New
          </button>
        </div>
        <small style={{ color: '#666' }}>Create your own categories to organize your products</small>
      </div>

      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onSubmit={handleAddNewCategory}
      />

      {/* Return Policy */}
      <div style={{ marginTop: '16px' }}>
        <label>Return Policy *</label>
        {(() => {
          const { getReturnPolicyOptions } = require('../../../../../lib/returnPolicies');
          return (
            <select
              value={formData.allow_returns}
              onChange={e => updateField('allow_returns', e.target.value)}
              required
            >
              {getReturnPolicyOptions().map(policy => (
                <option key={policy.key} value={policy.key}>{policy.label}</option>
              ))}
            </select>
          );
        })()}
        <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
          This policy will be shown to customers and submitted to Google Merchant Center
        </small>
      </div>
    </div>
  );
}

// Summary for collapsed state
export function getBasicInfoSummary(formData) {
  if (!formData.name) return null;
  return `${formData.name} — $${formData.price || '0.00'}`;
}
