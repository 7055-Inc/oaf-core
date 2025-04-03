import React, { useContext, useState, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import './Steps.css';

/**
 * Second step of the product creation wizard
 * Collects basic product information (name, ID, status, etc.)
 */
const BasicInfoStep = () => {
  const { productData, updateField, draftId, errorMessage, setErrorMessage } = useContext(ProductCreationContext);
  const [localErrors, setLocalErrors] = useState({});
  
  // Effect to check for server-side error messages about SKU
  useEffect(() => {
    if (errorMessage && errorMessage.includes('SKU')) {
      // If the error message contains something about SKU, extract it
      setLocalErrors(prev => ({
        ...prev,
        sku: errorMessage
      }));
    }
  }, [errorMessage]);
  
  // Handle input changes with validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateField(name, value);
    
    // Clear error when user starts typing
    if (localErrors[name]) {
      setLocalErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate a field on blur
  const validateField = (name, value) => {
    let error = null;
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          // Auto-assign a name if empty - just don't show validation error
          // The backend will handle validation if needed
        } else if (value.length < 3) {
          error = 'Product name must be at least 3 characters';
        } else if (value.length > 100) {
          error = 'Product name must be less than 100 characters';
        }
        break;
        
      case 'sku':
        if (!value.trim()) {
          // Don't show error for empty SKU, it will be auto-assigned
        } else if (value.length < 2) {
          error = 'SKU must be at least 2 characters';
        } else if (value.length > 50) {
          error = 'SKU must be less than 50 characters';
        } else if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
          error = 'SKU can only contain letters, numbers, hyphens, and underscores';
        }
        break;
        
      default:
        break;
    }
    
    // Update local errors state
    setLocalErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    return !error;
  };
  
  // Handle blur event for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  // Check if form is valid
  const isFormValid = () => {
    // Execute validation for required fields
    const nameValid = validateField('name', productData.name || '');
    const skuValid = validateField('sku', productData.sku || '');
    
    // Form is valid if all validations pass
    return nameValid && skuValid;
  };
  
  // Validate the form when productData changes
  useEffect(() => {
    // Validate the form whenever productData changes
    isFormValid();
  }, [productData]);
  
  return (
    <div className="step-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Empty div for flexbox spacing */}
        <div></div>
        
        {/* Draft ID display right-aligned */}
        {draftId && (
          <div className="draft-id-display" style={{ 
            fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
            fontSize: '14px',
            padding: '4px',
            fontWeight: 'normal',
            textAlign: 'right'
          }}>
            Draft ID: {draftId}
          </div>
        )}
      </div>
      
      <div className="form-field main-field">
        <label htmlFor="name">
          Product Name <span className="required">*</span>
          <span className="info-tooltip" data-tooltip="The name that will be displayed to customers.">ⓘ</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={productData.name || ''}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="e.g. Blue Abstract Painting"
          className={localErrors.name ? 'error' : ''}
        />
        {localErrors.name && (
          <div className="field-error">{localErrors.name}</div>
        )}
      </div>
      
      <div className="form-divider"></div>
      
      <div className="two-column-layout">
        <div className="left-column">
          <div className="form-field">
            <label htmlFor="sku">
              SKU
              <span className="info-tooltip" data-tooltip="A unique identifier for your product. Used for inventory management. Will be auto-assigned if left blank. This cannot be changed.">ⓘ</span>
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={productData.sku || ''}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Unique product identifier"
              className={localErrors.sku ? 'error' : ''}
            />
            {localErrors.sku && (
              <div className="field-error">{localErrors.sku}</div>
            )}
          </div>
          
          <div className="form-field">
            <label htmlFor="barcode">
              Barcode / UPC / ISBN
              <span className="info-tooltip" data-tooltip="Optional product identifiers like UPC, ISBN, or other barcode formats.">ⓘ</span>
            </label>
            <input
              type="text"
              id="barcode"
              name="barcode"
              value={productData.barcode || ''}
              onChange={handleInputChange}
              placeholder="Optional product barcode"
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="price">
              Price <span className="required">*</span>
              <span className="info-tooltip" data-tooltip="The price customers will pay for your product.">ⓘ</span>
            </label>
            <div className="input-with-unit">
              <span className="unit-prefix">$</span>
              <input
                type="number"
                id="price"
                name="price"
                value={productData.price || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
        
        <div className="column-divider"></div>
        
        <div className="right-column">
          <div className="form-field">
            <label htmlFor="dimensions">
              Dimensions
              <span className="info-tooltip" data-tooltip="The physical dimensions of your product (length × width × height).">ⓘ</span>
            </label>
            <div className="dimensions-group">
              <div className="input-with-unit">
                <input
                  type="number"
                  id="dimensions.length"
                  name="dimensions.length"
                  value={productData.dimensions?.length || ''}
                  onChange={handleInputChange}
                  placeholder="L"
                  min="0"
                  step="0.01"
                />
                <span className="unit">in</span>
              </div>
              <span className="dimension-separator">×</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  id="dimensions.width"
                  name="dimensions.width"
                  value={productData.dimensions?.width || ''}
                  onChange={handleInputChange}
                  placeholder="W"
                  min="0"
                  step="0.01"
                />
                <span className="unit">in</span>
              </div>
              <span className="dimension-separator">×</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  id="dimensions.height"
                  name="dimensions.height"
                  value={productData.dimensions?.height || ''}
                  onChange={handleInputChange}
                  placeholder="H"
                  min="0"
                  step="0.01"
                />
                <span className="unit">in</span>
              </div>
            </div>
          </div>
          
          <div className="form-field">
            <label htmlFor="dimensions.weight">
              Weight
              <span className="info-tooltip" data-tooltip="The weight of your product, used for shipping calculations.">ⓘ</span>
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                id="dimensions.weight"
                name="dimensions.weight"
                value={productData.dimensions?.weight || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <span className="unit">lb</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep; 