import React, { useContext } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import './Steps.css';

/**
 * Third step of the product creation wizard
 * Handles product description details
 */
const DescriptionStep = () => {
  const { productData, updateField, draftId } = useContext(ProductCreationContext);
  
  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateField(name, value);
  };
  
  return (
    <div className="wizard-step description-step">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        {/* Empty div for flexbox spacing */}
        <div></div>
        
        {/* Product ID display right-aligned */}
        {draftId && (
          <div className="product-id-display" style={{ 
            fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
            fontSize: '14px',
            padding: '4px',
            fontWeight: 'normal',
            textAlign: 'right'
          }}>
            Product ID: {draftId}
          </div>
        )}
      </div>
      
      <div className="form-section">
        <div className="form-row">
          <div className="form-field full-width">
            <label htmlFor="description">
              Full Description <span className="required">*</span>
              <span className="info-tooltip" data-tooltip="Detailed description of your product. Include information about materials, usage instructions, inspiration, or any other relevant details. Be thorough to help customers make informed decisions.">ⓘ</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={productData.description || ''}
              onChange={handleInputChange}
              placeholder="Describe your product in detail..."
              rows="8"
            ></textarea>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-field full-width">
            <label htmlFor="shortDescription">
              Short Description
              <span className="info-tooltip" data-tooltip="A concise summary that appears in product listings. This will be shown in search results and product listings. Aim for 1-2 sentences that capture the essence of your product.">ⓘ</span>
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              value={productData.shortDescription || ''}
              onChange={handleInputChange}
              placeholder="Brief summary of your product (1-2 sentences)"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescriptionStep; 