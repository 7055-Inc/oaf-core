import React, { useContext, useState, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import './Steps.css';

/**
 * Pricing step of the product creation wizard
 * Handles price setting for products
 */
const PricingStep = () => {
  const { productData, updateField, draftId } = useContext(ProductCreationContext);
  const [localErrors, setLocalErrors] = useState({});
  const [payoutEstimate, setPayoutEstimate] = useState('0.00');
  const [commissionAmount, setCommissionAmount] = useState('0.00');
  
  // Commission rate (15% placeholder)
  const COMMISSION_RATE = 0.15;
  
  // Check if pricing hooks are available
  const [hasHooks] = useState(false); // This would be replaced with actual hook detection logic
  const [hookPricing] = useState([]); // This would be populated from actual hooks if they exist
  
  // Update payout estimate when price changes
  useEffect(() => {
    if (productData.price && !isNaN(parseFloat(productData.price))) {
      const price = parseFloat(productData.price);
      const commission = price * COMMISSION_RATE;
      const payout = price - commission;
      
      setCommissionAmount(commission.toFixed(2));
      setPayoutEstimate(payout.toFixed(2));
    } else {
      setCommissionAmount('0.00');
      setPayoutEstimate('0.00');
    }
  }, [productData.price]);
  
  // Handle input changes
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
  
  // Validate price field
  const validatePriceField = (name, value) => {
    let error = null;
    
    if (name === 'price' && !value) {
      error = 'Price is required';
    } else if (value && isNaN(parseFloat(value))) {
      error = 'Please enter a valid number';
    } else if (value && parseFloat(value) < 0) {
      error = 'Price cannot be negative';
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
    validatePriceField(name, value);
  };
  
  return (
    <div className="wizard-step pricing-step">
      {/* Product ID display moved to top corner */}
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
      
      <div className="price-card">
        <div className="price-card-header">
          <h4>Product Price <span className="required-badge">Required</span></h4>
        </div>
        <div className="price-card-body">
          <div className="input-with-unit" style={{ position: 'relative' }}>
            <input
              type="number"
              id="price"
              name="price"
              value={productData.price || ''}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={localErrors.price ? 'error' : ''}
              style={{ paddingLeft: '25px' }}
            />
            <span className="currency-symbol" style={{ 
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}>$</span>
          </div>
          {localErrors.price && (
            <div className="field-error">{localErrors.price}</div>
          )}
          <div className="field-hint">
            The price that customers will pay for this product.
          </div>
          
          {/* Payout Calculator */}
          <div className="payout-calculator">
            <h5>Expected Payout</h5>
            <div className="payout-calculation">
              <div className="calculation-row">
                <span className="calculation-label">Product Price:</span>
                <span className="calculation-value">${productData.price || '0.00'}</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">OAF Commission (15%):</span>
                <span className="calculation-value">-${commissionAmount}</span>
              </div>
              <div className="calculation-divider"></div>
              <div className="calculation-row final">
                <span className="calculation-label">Expected Payout:</span>
                <span className="calculation-value payout">${payoutEstimate}</span>
              </div>
            </div>
            <div className="payout-note">
              This is an estimate. Final payout may vary based on fees, taxes, and other factors.
            </div>
          </div>
        </div>
      </div>
      
      <div className="additional-pricing-section">
        <h4>Additional Pricing Options</h4>
        {hasHooks && hookPricing.length > 0 ? (
          <div className="pricing-hooks-grid">
            {hookPricing.map((hook, index) => (
              <div className="pricing-hook-card" key={`hook-${index}`}>
                <div className="hook-card-header">
                  <h5>{hook.name}</h5>
                </div>
                <div className="hook-card-body">
                  {hook.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-hooks-message">
            Other pricing options will appear here from add-on modules.
          </div>
        )}
      </div>
      
      {productData.productType === 'variable' && (
        <div className="pricing-note">
          <p>
            <strong>Note:</strong> For variable products, you can set different prices for each variant in the Variants step.
            The price set here will be used as the default/starting price.
          </p>
        </div>
      )}
    </div>
  );
};

export default PricingStep; 