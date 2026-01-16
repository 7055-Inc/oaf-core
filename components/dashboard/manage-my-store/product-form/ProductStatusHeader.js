import { useState } from 'react';
import { useProductForm } from './ProductFormContext';
import { authApiRequest } from '../../../../lib/apiUtils';
import { hasPermission } from '../../../../lib/userUtils';

export default function ProductStatusHeader() {
  const { formData, updateField, mode, savedProductId, userData } = useProductForm();
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [savingWebsite, setSavingWebsite] = useState(false);
  
  // Permission checks - using same permissions as ManageMyStoreMenu
  const hasMarketplacePermission = hasPermission(userData, 'vendor');
  const hasWebsitePermission = hasPermission(userData, 'sites');

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
      setSavingMarketplace(true);
      try {
        await authApiRequest(`products/${savedProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketplace_enabled: newValue })
        });
      } catch (err) {
        console.error('Failed to save marketplace status:', err);
      } finally {
        setSavingMarketplace(false);
      }
    }
  };

  const handleWebsiteToggle = async () => {
    const newValue = !formData.website_catalog_enabled;
    updateField('website_catalog_enabled', newValue);
    
    // Auto-save immediately when toggled
    if (savedProductId) {
      setSavingWebsite(true);
      try {
        await authApiRequest(`products/${savedProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_catalog_enabled: newValue })
        });
      } catch (err) {
        console.error('Failed to save website catalog status:', err);
      } finally {
        setSavingWebsite(false);
      }
    }
  };

  return (
    <div className="form-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
      <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px', color: '#6c757d' }}>
        Product Status
      </strong>
      
      {/* Website Catalog Toggle */}
      {hasWebsitePermission && (
        <label className="toggle-slider-container">
          <span><i className="fas fa-globe"></i> Website:</span>
          <input
            type="checkbox"
            className="toggle-slider-input"
            checked={formData.website_catalog_enabled}
            onChange={handleWebsiteToggle}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">{savingWebsite ? '...' : (formData.website_catalog_enabled ? 'ON' : 'OFF')}</span>
        </label>
      )}

      {/* Marketplace Toggle */}
      {hasMarketplacePermission && (
        <label className="toggle-slider-container">
          <span><i className="fas fa-store"></i> Marketplace:</span>
          <input
            type="checkbox"
            className="toggle-slider-input"
            checked={formData.marketplace_enabled}
            onChange={handleMarketplaceToggle}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">{savingMarketplace ? '...' : (formData.marketplace_enabled ? 'ON' : 'OFF')}</span>
        </label>
      )}

      {/* Category */}
      <div className="field-with-info">
        <span style={{ fontSize: '12px', color: '#6c757d' }}>Category:</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(5,84,116,0.08)', padding: '4px 10px', borderRadius: '4px' }}>
          {getMarketplaceCategoryDisplay()}
        </span>
      </div>

      {/* Type */}
      <div className="field-with-info">
        <span style={{ fontSize: '12px', color: '#6c757d' }}>Type:</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(5,84,116,0.08)', padding: '4px 10px', borderRadius: '4px' }}>
          {getProductTypeDisplay()}
        </span>
      </div>

      {/* Group ID */}
      {(formData.product_type === 'variable' || formData.product_type === 'variant') && (
        <div className="field-with-info">
          <span style={{ fontSize: '12px', color: '#6c757d' }}>Group ID:</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#6c757d', background: 'rgba(108,117,125,0.08)', padding: '4px 10px', borderRadius: '4px' }}>
            {formData.item_group_id || formData.parent_id || savedProductId || '—'}
          </span>
        </div>
      )}
    </div>
  );
}

