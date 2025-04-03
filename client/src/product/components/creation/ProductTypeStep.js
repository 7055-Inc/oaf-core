import React, { useContext } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import './Steps.css';

/**
 * First step of the product creation wizard
 * User selects the basic product type (simple or variable)
 */
const ProductTypeStep = () => {
  const { productData, updateField } = useContext(ProductCreationContext);
  
  const handleTypeSelection = (type) => {
    updateField('productType', type);
  };
  
  return (
    <div className="wizard-step product-type-step">
      <p className="step-description">
        Choose the type of product you want to create. This will determine the options available in the following steps.
      </p>
      
      <div className="product-type-options">
        <div 
          className={`product-type-card ${productData.productType === 'simple' ? 'selected' : ''}`}
          onClick={() => handleTypeSelection('simple')}
        >
          <div className="card-icon">
            <i className="fas fa-paint-brush"></i>
          </div>
          <h4>Simple Product</h4>
          <p>
            A single product with one price and no variations. Best for unique, one-of-a-kind items.
          </p>
          {productData.productType === 'simple' && (
            <div className="selected-badge">
              <i className="fas fa-check"></i> Selected
            </div>
          )}
        </div>
        
        <div 
          className={`product-type-card ${productData.productType === 'variable' ? 'selected' : ''}`}
          onClick={() => handleTypeSelection('variable')}
        >
          <div className="card-icon">
            <i className="fas fa-th"></i>
          </div>
          <h4>Variable Product</h4>
          <p>
            A product with multiple variations like different sizes, colors, or materials. Best for products with options.
          </p>
          {productData.productType === 'variable' && (
            <div className="selected-badge">
              <i className="fas fa-check"></i> Selected
            </div>
          )}
        </div>
      </div>
      
      {productData.productType && (
        <div className="type-confirmation">
          <p>
            You've selected: 
            <strong>
              {productData.productType === 'simple' ? ' Simple Product' : ' Variable Product'}
            </strong>
          </p>
          <p className="note">
            {productData.productType === 'simple' 
              ? 'You can always convert to a variable product later if needed.'
              : 'You will be able to define variations in a later step.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductTypeStep; 