import { useState } from 'react';
import { useProductForm } from './ProductFormContext';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function ProductStatusHeader() {
  const { formData, updateField, mode, savedProductId } = useProductForm();
  const [saving, setSaving] = useState(false);

  // Don't show until we have product data
  if (mode === 'create' && !savedProductId) return null;

  // Get product type display
  const getProductTypeDisplay = () => {
    switch (formData.product_type) {
      case 'simple': return 'Simple Product';
      case 'variable': return 'Variable Product (Parent)';
      case 'variant': return 'Product Variant';
      default: return 'Not Set';
    }
  };

  // Get marketplace category display
  const getMarketplaceCategoryDisplay = () => {
    switch (formData.marketplace_category) {
      case 'art': return 'Art';
      case 'crafts': return 'Crafts & Handmade';
      default: return 'Queued for curation';
    }
  };

  const handleMarketplaceToggle = async () => {
    const newValue = !formData.marketplace_enabled;
    updateField('marketplace_enabled', newValue);
    
    // Auto-save immediately when toggled
    if (savedProductId) {
      setSaving(true);
      try {
        await authApiRequest(`products/${savedProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketplace_enabled: newValue })
        });
      } catch (err) {
        console.error('Failed to save marketplace status:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '24px',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#6c757d',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginRight: '12px',
        display: 'flex',
        alignItems: 'center'
      }}>
        📊 Product Status
      </div>
      
      {/* Marketplace Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>
          Marketplace:
        </span>
        <label style={{ 
          position: 'relative', 
          display: 'inline-block', 
          width: '44px', 
          height: '24px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={formData.marketplace_enabled}
            onChange={handleMarketplaceToggle}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: formData.marketplace_enabled ? '#28a745' : '#ccc',
            borderRadius: '24px',
            transition: 'all 0.3s ease'
          }}>
            <span style={{
              position: 'absolute',
              height: '18px',
              width: '18px',
              left: formData.marketplace_enabled ? '23px' : '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </span>
        </label>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: saving ? '#ffc107' : (formData.marketplace_enabled ? '#28a745' : '#6c757d')
        }}>
          {saving ? '...' : (formData.marketplace_enabled ? 'ON' : 'OFF')}
        </span>
      </div>

      {/* Category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>
          Category:
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#055474',
          background: '#05547415',
          padding: '4px 10px',
          borderRadius: '4px'
        }}>
          {getMarketplaceCategoryDisplay()}
        </span>
      </div>

      {/* Type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>
          Type:
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#055474',
          background: '#05547415',
          padding: '4px 10px',
          borderRadius: '4px'
        }}>
          {getProductTypeDisplay()}
        </span>
      </div>

      {/* Group ID - only for parent or variant */}
      {(formData.product_type === 'variable' || formData.product_type === 'variant') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>
            Group ID:
          </span>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#6c757d',
            background: '#6c757d15',
            padding: '4px 10px',
            borderRadius: '4px'
          }}>
            {formData.item_group_id || formData.parent_id || savedProductId || '—'}
          </span>
        </div>
      )}
    </div>
  );
}

