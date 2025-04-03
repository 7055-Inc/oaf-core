import React, { useContext, useState, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import { productService } from '../../../../services/productService';
import './Steps.css';

/**
 * Preview step of the product creation wizard
 * Shows a comprehensive preview of the product before publishing
 */
const PreviewStep = () => {
  const { 
    productData, 
    draftId,
    nextStep,
    setCurrentStep
  } = useContext(ProductCreationContext);
  
  const [categoryNames, setCategoryNames] = useState({});
  
  // Fetch category names for display
  useEffect(() => {
    const fetchCategoryNames = async () => {
      try {
        // Get all categories
        const allCategories = await productService.getCategories();
        console.log('[PreviewStep] Fetched categories:', allCategories);
        console.log('[PreviewStep] Primary category ID:', productData.primary_category_id);
        
        // Create a map of category id -> name
        const categoryMap = {};
        
        // Process all categories (both parents and children)
        const processCategories = (categories) => {
          if (!Array.isArray(categories)) return;
          
          categories.forEach(category => {
            if (category.id && category.name) {
              // Store as string keys for easier comparison
              categoryMap[String(category.id)] = category.name;
            }
            
            // Process children if any
            if (Array.isArray(category.children)) {
              processCategories(category.children);
            }
          });
        };
        
        processCategories(allCategories);
        setCategoryNames(categoryMap);
      } catch (error) {
        console.error('Failed to fetch category names:', error);
      }
    };
    
    fetchCategoryNames();
  }, []);
  
  // Format currency values
  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    return `$${parseFloat(value).toFixed(2)}`;
  };
  
  // Continue to the publish step
  const handleContinueToPublish = () => {
    console.log('Continue to Publish button clicked');
    console.log('Current step before nextStep:', productData);
    
    try {
      // First method: Try using the nextStep function
      const result = nextStep();
      console.log('Successfully navigated to the publish step, nextStep result:', result);
      
      // Failsafe: If nextStep didn't work, set the step directly
      if (!result) {
        // Directly set the step to the publish step (usually index 10)
        console.log('Using direct step navigation as fallback');
        setCurrentStep(10);
      }
      
      // Force a UI refresh after a short delay
      setTimeout(() => {
        window.scrollTo(0, 0);
        window.location.hash = 'publish-step';
      }, 100);
    } catch (error) {
      console.error('Error navigating to publish step:', error);
    }
  };
  
  // Render product images
  const renderImages = () => {
    if (!productData.images || productData.images.length === 0) {
      return (
        <div className="preview-no-images">
          <p>No images uploaded</p>
        </div>
      );
    }
    
    return (
      <div className="preview-images">
        {productData.images.map((image, index) => (
          <div key={index} className="preview-image">
            <img 
              src={image.url || image.preview} 
              alt={`Product ${index + 1}`} 
              className="product-image"
            />
          </div>
        ))}
      </div>
    );
  };
  
  // Render product variants if applicable
  const renderVariants = () => {
    if (productData.productType !== 'variable' || 
        !productData.variants || 
        productData.variants.length === 0) {
      return null;
    }
    
    return (
      <div className="preview-section">
        <h3>Product Variants</h3>
        <div className="preview-variants">
          {productData.variants.map((variant, index) => (
            <div key={index} className="preview-variant">
              <h4>Variant {index + 1}</h4>
              <div className="variant-details">
                {productData.variant_kinds.map((kind, kindIndex) => (
                  <div key={kindIndex} className="variant-attribute">
                    <span className="attribute-label">{kind.name}:</span>
                    <span className="attribute-value">{variant.attributes[kind.id]}</span>
                  </div>
                ))}
                <div className="variant-price">
                  <span className="price-label">Price:</span>
                  <span className="price-value">{formatCurrency(variant.price)}</span>
                </div>
                <div className="variant-sku">
                  <span className="sku-label">SKU:</span>
                  <span className="sku-value">{variant.sku || 'Not specified'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render shipping information
  const renderShipping = () => {
    if (!productData.requiresShipping) {
      return (
        <div className="preview-section">
          <h3>Shipping</h3>
          <p>This product does not require shipping (Digital product or service)</p>
        </div>
      );
    }
    
    return (
      <div className="preview-section">
        <h3>Shipping</h3>
        <div className="shipping-method">
          <span className="label">Shipping Method:</span>
          <span className="value">
            {productData.shippingMethod === 'free' ? 'Free Shipping' :
             productData.shippingMethod === 'flat_rate' ? `Flat Rate (${formatCurrency(productData.flatRate)})` :
             'Calculated at checkout'}
          </span>
        </div>
        
        {productData.shippingPackages && productData.shippingPackages.length > 0 && (
          <div className="shipping-packages">
            <h4>Shipping Packages</h4>
            {productData.shippingPackages.map((pkg, index) => (
              <div key={index} className="package-item">
                <p>
                  <strong>Package {index + 1}:</strong> {pkg.length}x{pkg.width}x{pkg.height} {productData.dimensionUnit}, 
                  {pkg.weight} {productData.weightUnit}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="wizard-step preview-step">
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
      
      <div className="preview-container">
        <div className="preview-header">
          <h1 className="preview-product-name">{productData.name || 'Unnamed Product'}</h1>
          <div className="preview-product-price">{formatCurrency(productData.price)}</div>
          
          {productData.compareAtPrice && parseFloat(productData.compareAtPrice) > 0 && (
            <div className="preview-compare-price">
              <span className="compare-label">Was: </span>
              <span className="compare-value">{formatCurrency(productData.compareAtPrice)}</span>
            </div>
          )}
        </div>
        
        {renderImages()}
        
        <div className="preview-section">
          <h3>Description</h3>
          <div className="preview-description">
            <p>{productData.description || 'No description provided'}</p>
          </div>
          
          {productData.shortDescription && (
            <div className="preview-short-description">
              <h4>Short Description</h4>
              <p>{productData.shortDescription}</p>
            </div>
          )}
        </div>
        
        <div className="preview-section">
          <h3>Details</h3>
          <div className="preview-details">
            <div className="detail-item">
              <span className="detail-label">Category:</span>
              <span className="detail-value">
                {categoryNames[String(productData.primary_category_id)] || 
                 categoryNames[productData.primary_category_id] || 
                 productData.primaryCategory || 
                 "Uncategorized"}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">SKU:</span>
              <span className="detail-value">{productData.sku || 'Not specified'}</span>
            </div>
            {productData.barcode && (
              <div className="detail-item">
                <span className="detail-label">Barcode:</span>
                <span className="detail-value">{productData.barcode}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Product Type:</span>
              <span className="detail-value">
                {productData.productType === 'simple' ? 'Simple Product' : 'Variable Product'}
              </span>
            </div>
          </div>
        </div>
        
        {renderVariants()}
        
        <div className="preview-section">
          <h3>Inventory</h3>
          <div className="inventory-details">
            <div className="detail-item">
              <span className="detail-label">Track Inventory:</span>
              <span className="detail-value">{productData.track_inventory ? 'Yes' : 'No'}</span>
            </div>
            {productData.track_inventory && (
              <>
                <div className="detail-item">
                  <span className="detail-label">Stock:</span>
                  <span className="detail-value">{productData.stock}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Low Stock Threshold:</span>
                  <span className="detail-value">{productData.low_stock_threshold}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Allow Backorders:</span>
                  <span className="detail-value">{productData.allow_backorders ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {renderShipping()}
        
        {productData.features && productData.features.length > 0 && (
          <div className="preview-section">
            <h3>Features</h3>
            <ul className="preview-features">
              {productData.features.map((feature, index) => (
                <li key={index} className="feature-item">{feature}</li>
              ))}
            </ul>
          </div>
        )}
        
        {productData.careInstructions && productData.careInstructions.length > 0 && (
          <div className="preview-section">
            <h3>Care Instructions</h3>
            <ul className="preview-care-instructions">
              {productData.careInstructions.map((instruction, index) => (
                <li key={index} className="instruction-item">{instruction}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="preview-continue-action">
        <button 
          className="btn-continue-to-publish"
          onClick={handleContinueToPublish}
          style={{
            background: '#4CAF50',
            color: 'white',
            padding: '15px 30px',
            fontSize: '18px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'block',
            width: '100%',
            maxWidth: '300px',
            margin: '40px auto',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          Publish Product
        </button>
      </div>
    </div>
  );
};

export default PreviewStep; 