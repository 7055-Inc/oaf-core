import React, { useState, useContext } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import './Steps.css';

/**
 * Inventory step of the product creation wizard
 * Handles inventory tracking, quantity, and stock management
 */
const InventoryStep = () => {
  const { productData, updateField, draftId } = useContext(ProductCreationContext);
  const [errors, setErrors] = useState({});
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    updateField(name, fieldValue);
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate numeric fields
  const validateNumericField = (value, fieldName, min = 0) => {
    if (value === '') return '';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${fieldName} must be a number`;
    }
    if (numValue < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return '';
  };
  
  // Handle blur event for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = '';
    
    if (name === 'stock' || name === 'low_stock_threshold') {
      error = validateNumericField(value, name === 'stock' ? 'Inventory' : 'Threshold');
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };
  
  // Ensure default values for required fields to prevent validation errors
  React.useEffect(() => {
    if (productData.track_inventory && productData.stock === undefined) {
      updateField('stock', '0');
    }
  }, [productData.track_inventory, productData.stock, updateField]);
  
  return (
    <div className="wizard-step inventory-step">
      {/* Product ID display at top corner */}
      {draftId && (
        <div style={{ 
          fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
          fontSize: '14px',
          padding: '4px',
          fontWeight: 'normal',
          textAlign: 'right',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}>
          Product ID: {draftId}
        </div>
      )}
      
      <div className="inventory-layout">
        {/* Left Column - Checkboxes */}
        <div className="inventory-column inventory-options">
          <div className="form-section">
            <div className="checkbox-field">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="track_inventory"
                  name="track_inventory"
                  checked={productData.track_inventory}
                  onChange={handleInputChange}
                />
                <label htmlFor="track_inventory" className="checkbox-label">
                  Track inventory for this product
                </label>
              </div>
              <p className="field-hint">
                When enabled, inventory will be automatically adjusted when orders are placed.
              </p>
            </div>
            
            {productData.track_inventory && (
              <div className="checkbox-field">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="allow_backorders"
                    name="allow_backorders"
                    checked={productData.allow_backorders}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="allow_backorders" className="checkbox-label">
                    Allow backorders when out of stock
                  </label>
                </div>
                <p className="field-hint">
                  Customers can still purchase this product when inventory reaches zero.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Column Divider */}
        <div className="inventory-column-divider"></div>
        
        {/* Right Column - Stock Inputs */}
        <div className="inventory-column inventory-levels">
          <div className="form-section">
            {/* Show these fields only if inventory tracking is enabled */}
            {productData.track_inventory && (
              <>
                <div className="form-field">
                  <label htmlFor="stock">
                    Current Stock
                    <span className="required"> *</span>
                  </label>
                  <div className="input-container">
                    <input
                      type="text"
                      id="stock"
                      name="stock"
                      value={productData.stock || ''}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={errors.stock ? 'error' : ''}
                      placeholder="0"
                    />
                  </div>
                  {errors.stock && (
                    <div className="field-error">{errors.stock}</div>
                  )}
                  <p className="field-hint">
                    Enter the number of units currently available for sale.
                  </p>
                </div>
                
                <div className="form-field">
                  <label htmlFor="low_stock_threshold">
                    Low Stock Threshold
                  </label>
                  <div className="input-container">
                    <input
                      type="text"
                      id="low_stock_threshold"
                      name="low_stock_threshold"
                      value={productData.low_stock_threshold || ''}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={errors.low_stock_threshold ? 'error' : ''}
                      placeholder="5"
                    />
                  </div>
                  {errors.low_stock_threshold && (
                    <div className="field-error">{errors.low_stock_threshold}</div>
                  )}
                  <p className="field-hint">
                    You'll receive a notification when stock reaches this level.
                  </p>
                </div>
              </>
            )}
            
            {/* Message when inventory tracking is disabled */}
            {!productData.track_inventory && (
              <div className="inventory-disabled-message">
                <p>
                  Inventory tracking is currently disabled. Enable tracking in the left panel 
                  to set stock levels and low stock threshold.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="inventory-tips dark-theme">
        <h4>Inventory Management Tips</h4>
        <ul className="tips-list">
          <li>
            <strong>Track Inventory:</strong> Enable to automatically adjust stock when orders are placed or canceled.
          </li>
          <li>
            <strong>Low Stock Alerts:</strong> Set a threshold to receive notifications when it's time to restock.
          </li>
          <li>
            <strong>Backorders:</strong> Allow customers to order even when you're out of stock if you expect to restock soon.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default InventoryStep; 