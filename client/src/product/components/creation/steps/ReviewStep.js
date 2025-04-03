import React, { useContext, useState, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import { productService } from '../../../../services/productService';
import mediaTransferService from '../../../../services/mediaTransferService';
import './Steps.css';

/**
 * Final step of the product creation wizard
 * Allows publishing the product after previewing
 */
const ReviewStep = ({ onSubmit }) => {
  const { 
    productData, 
    draftId, 
    setIsLoading, 
    setCurrentStep,
    steps,
    setDraftId,
    prepareProductDataForSubmission,
    prevStep
  } = useContext(ProductCreationContext);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedProductId, setPublishedProductId] = useState(null);
  const [categoryNames, setCategoryNames] = useState({});
  const [prevSavedTime, setPrevSavedTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Fetch category names on component mount
  useEffect(() => {
    const fetchCategoryNames = async () => {
      try {
        // Get all categories
        const allCategories = await productService.getCategories();
        console.log('[ReviewStep] Fetched categories:', allCategories);
        console.log('[ReviewStep] Current product data:', productData);
        console.log('[ReviewStep] Primary category ID:', productData.primary_category_id);
        console.log('[ReviewStep] Additional category IDs:', productData.additional_category_ids);
        
        // Create a map of category id -> name
        const categoryMap = {};
        
        // Process all categories (both parents and children)
        const processCategories = (categories) => {
          if (!Array.isArray(categories)) return;
          
          categories.forEach(category => {
            if (category.id && category.name) {
              // Store as string keys for easier comparison
              categoryMap[String(category.id)] = category.name;
              console.log(`[ReviewStep] Mapping category ID ${category.id} to name: ${category.name}`);
            }
            
            // Process children if any
            if (Array.isArray(category.children)) {
              processCategories(category.children);
            }
          });
        };
        
        processCategories(allCategories);
        console.log('[ReviewStep] Final category map:', categoryMap);
        setCategoryNames(categoryMap);
      } catch (error) {
        console.error('Failed to fetch category names:', error);
      }
    };
    
    fetchCategoryNames();
  }, []); // Remove productData dependency to avoid re-fetching unnecessarily
  
  // Format currency values
  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    return `$${parseFloat(value).toFixed(2)}`;
  };
  
  // Navigate to a specific step
  const navigateToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
  };
  
  // Find step index by title
  const findStepIndex = (title) => {
    return steps.findIndex(step => step.title === title);
  };
  
  // Handle saving as draft
  const handleSaveDraft = async () => {
    try {
      setErrorMessage('');
      const savedDraft = await saveProductDraft();
      console.log('Draft saved successfully:', savedDraft);
      
      // Show a temporary success message
      setPrevSavedTime(new Date());
      setTimeout(() => setPrevSavedTime(null), 3000);
    } catch (error) {
      console.error('Error saving draft:', error);
      setErrorMessage(`Failed to save draft: ${error.message || 'Unknown error'}`);
    }
  };
  
  // Handle publishing the product
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // Save the draft first to ensure all data is updated
      await saveProductDraft();
      
      console.log('Preparing to publish draft', draftId);
      
      // Prepare the data for publishing
      const dataToSave = {
        ...productData,
        status: 'active' // Set status to active for publishing
      };
      
      console.log('Prepared data for publishing, status=active:', dataToSave);
      
      console.log('Calling publishProduct API with draft ID:', draftId);
      const publishedProduct = await publishProduct(draftId, dataToSave);
      
      console.log('Publish API response:', publishedProduct);
      
      // Show success message
      setSuccessMessage('Product published successfully!');
      
      // After a short delay, exit the wizard or redirect
      setTimeout(() => {
        if (typeof onComplete === 'function') {
          onComplete(publishedProduct);
        }
      }, 2000);
    } catch (error) {
      console.error('Error publishing product:', error);
      setErrorMessage(`Error publishing product: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Save as draft without publishing
  const saveProductDraft = async () => {
    if (!draftId) {
      throw new Error('No draft ID found. Unable to save.');
    }
    
    try {
      setIsLoading(true);
      
      // Always ensure draft status during save
      const dataToSave = {
        ...productData,
        status: 'draft' // Force draft status for safety
      };
      
      const preparedData = prepareProductDataForSubmission(dataToSave);
      console.log('Saving product as draft with status=draft');
      
      const savedDraft = await productService.updateDraft(draftId, preparedData);
      console.log('Draft saved successfully:', savedDraft);
      
      // Don't show this alert anymore - we'll rely on the standard wizard navigation feedback
      // alert('Draft saved successfully!');
      
      return savedDraft;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render the success message after publishing
  const renderPublishSuccess = () => {
    return (
      <div className="publish-success" style={{ textAlign: 'center', padding: '30px 0' }}>
        <div className="success-icon" style={{ color: '#4CAF50', fontSize: '64px', marginBottom: '20px' }}>✓</div>
        <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>Product Published Successfully!</h2>
        <p style={{ fontSize: '18px', marginBottom: '30px' }}>Your product is now live and available to customers.</p>
        
        <div className="product-id" style={{ 
          fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          display: 'inline-block',
          marginBottom: '30px'
        }}>
          <span className="label" style={{ fontWeight: 'bold', marginRight: '10px' }}>Product ID:</span>
          <span className="value">{publishedProductId || draftId}</span>
        </div>
        
        <div className="success-actions" style={{ marginTop: '20px' }}>
          <button 
            className="btn-view-product"
            onClick={() => window.location.href = `/products/${publishedProductId || draftId}`}
            style={{
              background: '#4CAF50',
              color: 'white',
              padding: '12px 25px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            View Product Page
          </button>
          
          <button 
            className="btn-create-new"
            onClick={() => window.location.href = '/products/create'}
            style={{
              background: '#fff',
              color: '#333',
              padding: '12px 25px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Another Product
          </button>
        </div>
      </div>
    );
  };
  
  // Main render
  return (
    <div className="wizard-step publish-step">
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
      
      {publishSuccess ? (
        renderPublishSuccess()
      ) : (
        <>
          {errorMessage && (
            <div className="error-message" style={{ 
              padding: '15px',
              margin: '10px 0 20px 0',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              border: '1px solid #ffcdd2'
            }}>
              <strong>Error:</strong> {errorMessage}
            </div>
          )}
          
          <div className="product-preview-header">
            <h1>{productData.name || 'Unnamed Product'}</h1>
            <div className="product-price" style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '8px' }}>
              {formatCurrency(productData.price)}
            </div>
          </div>
          
          {/* Product Image Gallery */}
          <div className="product-images-gallery" style={{ margin: '20px 0' }}>
            {productData.images && productData.images.length > 0 ? (
              <div className="images-container" style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '10px' 
              }}>
                {productData.images.map((image, idx) => (
                  <div key={idx} className="image-thumbnail" style={{
                    width: '120px',
                    height: '120px',
                    border: image.isFeatured ? '2px solid #4CAF50' : '1px solid #ddd',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <img 
                      src={image.url} 
                      alt={`Product ${idx + 1}`} 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    {image.isFeatured && (
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: '#4CAF50',
                        color: 'white',
                        fontSize: '10px',
                        padding: '2px 5px',
                        borderRadius: '2px'
                      }}>Featured</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-images" style={{ 
                padding: '20px', 
                background: '#f8f8f8', 
                textAlign: 'center',
                borderRadius: '4px'
              }}>
                No images uploaded
              </div>
            )}
          </div>
          
          <div className="publishing-summary">
            <div className="summary-card publish-summary">
              <h3>Review & Publish Your Product</h3>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Basic Information</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Basic Info'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item">
                  <span className="label">Product Name:</span>
                  <span className="value">{productData.name}</span>
                </div>
                <div className="summary-item">
                  <span className="label">SKU:</span>
                  <span className="value">{productData.sku}</span>
                </div>
                {productData.barcode && (
                  <div className="summary-item">
                    <span className="label">Barcode:</span>
                    <span className="value">{productData.barcode}</span>
                  </div>
                )}
                <div className="summary-item">
                  <span className="label">Product Type:</span>
                  <span className="value">
                    {productData.productType === 'simple' ? 'Simple Product' : 'Variable Product with Options'}
                  </span>
                </div>
              </div>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Description</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Description'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item description-preview">
                  <div className="value" style={{ 
                    whiteSpace: 'pre-wrap', 
                    maxHeight: '100px', 
                    overflow: 'auto',
                    padding: '10px',
                    background: '#f9f9f9',
                    borderRadius: '4px'
                  }}>
                    {productData.description || 'No description provided'}
                  </div>
                </div>
              </div>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Pricing</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Pricing'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item">
                  <span className="label">Price:</span>
                  <span className="value">{formatCurrency(productData.price)}</span>
                </div>
                {productData.compareAtPrice && parseFloat(productData.compareAtPrice) > 0 && (
                  <div className="summary-item">
                    <span className="label">Compare At Price:</span>
                    <span className="value">{formatCurrency(productData.compareAtPrice)}</span>
                  </div>
                )}
              </div>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Category</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Categories'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item">
                  <span className="label">Primary Category:</span>
                  <span className="value">
                    {categoryNames[String(productData.primary_category_id)] || 
                     categoryNames[productData.primary_category_id] || 
                     "Uncategorized"}
                  </span>
                </div>
                {productData.additional_category_ids && productData.additional_category_ids.length > 0 && (
                  <div className="summary-item">
                    <span className="label">Additional Categories:</span>
                    <span className="value">
                      {productData.additional_category_ids.map(id => 
                        categoryNames[String(id)] || 
                        categoryNames[id] || 
                        "Unknown"
                      ).join(", ")}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Inventory</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Inventory'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item">
                  <span className="label">Track Inventory:</span>
                  <span className="value">{productData.track_inventory ? 'Yes' : 'No'}</span>
                </div>
                {productData.track_inventory && (
                  <>
                    <div className="summary-item">
                      <span className="label">Stock:</span>
                      <span className="value">{productData.stock}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Low Stock Threshold:</span>
                      <span className="value">{productData.low_stock_threshold}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Allow Backorders:</span>
                      <span className="value">{productData.allow_backorders ? 'Yes' : 'No'}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Shipping</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Shipping'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item">
                  <span className="label">Requires Shipping:</span>
                  <span className="value">{productData.requiresShipping ? 'Yes' : 'No'}</span>
                </div>
                {productData.requiresShipping && (
                  <>
                    <div className="summary-item">
                      <span className="label">Shipping Method:</span>
                      <span className="value">
                        {productData.shippingMethod === 'free' ? 'Free Shipping' :
                         productData.shippingMethod === 'flat_rate' ? `Flat Rate (${formatCurrency(productData.flatRate)})` :
                         'Calculated at checkout'}
                      </span>
                    </div>
                    {productData.shippingPackages && productData.shippingPackages.length > 0 && (
                      <div className="summary-item">
                        <span className="label">Shipping Packages:</span>
                        <span className="value">{productData.shippingPackages.length} package(s) defined</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="review-section">
                <div className="section-title">
                  <h4>Media</h4>
                  <button 
                    className="btn-edit-section" 
                    onClick={() => navigateToStep(findStepIndex('Media'))}
                  >
                    Edit
                  </button>
                </div>
                <div className="summary-item">
                  <span className="label">Images:</span>
                  <span className="value">{productData.images?.length || 0} image(s)</span>
                </div>
              </div>
              
              {productData.productType === 'variable' && (
                <div className="review-section">
                  <div className="section-title">
                    <h4>Variants</h4>
                    <button 
                      className="btn-edit-section" 
                      onClick={() => navigateToStep(findStepIndex('Variants'))}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="summary-item">
                    <span className="label">Variant Types:</span>
                    <span className="value">
                      {productData.variant_kinds?.map(kind => kind.name).join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Variants:</span>
                    <span className="value">{productData.variants?.length || 0} variant(s)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="publish-warning">
            <p><strong>Note:</strong> Once published, your product will be visible to customers. You can edit it after publishing, but it will remain live unless you deactivate it.</p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              className="btn-publish-now"
              onClick={handlePublish}
              disabled={isPublishing}
              style={{
                background: '#4CAF50',
                color: 'white',
                padding: '15px 30px',
                fontSize: '18px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {isPublishing ? 'Publishing...' : 'Publish Product'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewStep; 