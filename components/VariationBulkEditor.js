import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './VariationBulkEditor.module.css';

const VariationBulkEditor = ({ 
  variations, 
  parentProductData, 
  onSave, 
  onBack 
}) => {
  const [editedVariations, setEditedVariations] = useState([]);
  const [bulkOperations, setBulkOperations] = useState({
    showBulkPrice: false,
    showBulkInventory: false,
    showBulkDescription: false,
    bulkPrice: '',
    bulkInventory: '',
    bulkDescription: ''
  });
  const [expandedVariations, setExpandedVariations] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize edited variations with default values
  useEffect(() => {
    const initializedVariations = variations.map((variation, index) => {
      const combinationName = variation.combination.map(c => c.valueName).join(' × ');
      const baseName = parentProductData.name || 'Product';
      
      return {
        id: variation.id || `variation-${index}`,
        combination: variation.combination,
        combinationName,
        name: `${baseName} - ${combinationName}`,
        price: parentProductData.price || '',
        sku: generateSKU(parentProductData.sku || '', combinationName, index),
        inventory: parentProductData.available_qty || 10,
        description: parentProductData.description || '',
        shortDescription: parentProductData.short_description || '',
        images: [...(parentProductData.images || [])],
        status: 'draft',
        // Inherit parent product data
        category_id: parentProductData.category_id,
        dimensions: {
          width: parentProductData.width || '',
          height: parentProductData.height || '',
          depth: parentProductData.depth || '',
          weight: parentProductData.weight || '',
          dimension_unit: parentProductData.dimension_unit || 'in',
          weight_unit: parentProductData.weight_unit || 'lbs'
        },
        shipping: {
          ship_method: parentProductData.ship_method || 'free',
          ship_rate: parentProductData.ship_rate || '',
          shipping_services: parentProductData.shipping_services || ''
        }
      };
    });
    
    setEditedVariations(initializedVariations);
  }, [variations, parentProductData]);

  // Generate SKU for variation
  const generateSKU = (baseSKU, combinationName, index) => {
    if (!baseSKU) return `VAR-${index + 1}`;
    
    const combinationCode = combinationName
      .split(' × ')
      .map(val => val.substring(0, 2).toUpperCase())
      .join('');
    
    return `${baseSKU}-${combinationCode}`;
  };

  // Update individual variation
  const updateVariation = (index, field, value) => {
    setEditedVariations(prev => prev.map((variation, i) => 
      i === index ? { ...variation, [field]: value } : variation
    ));
  };

  // Update nested fields (dimensions, shipping)
  const updateNestedField = (index, section, field, value) => {
    setEditedVariations(prev => prev.map((variation, i) => 
      i === index ? { 
        ...variation, 
        [section]: { ...variation[section], [field]: value } 
      } : variation
    ));
  };

  // Handle image operations
  const handleImageUpload = async (variationIndex, files) => {
    setLoading(true);
    try {
      const uploadFormData = new FormData();
      Array.from(files).forEach(file => {
        uploadFormData.append('images', file);
      });

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) throw new Error('Failed to upload images');
      
      const data = await response.json();
      const newImages = (data.urls || []).map(url => ({
        url: url,
        alt_text: '',
        friendly_name: '',
        is_primary: false,
        order: 1
      }));

      setEditedVariations(prev => prev.map((variation, i) => 
        i === variationIndex ? { 
          ...variation, 
          images: [...variation.images, ...newImages] 
        } : variation
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (variationIndex, imageIndex) => {
    setEditedVariations(prev => prev.map((variation, i) => 
      i === variationIndex ? { 
        ...variation, 
        images: variation.images.filter((_, imgI) => imgI !== imageIndex)
      } : variation
    ));
  };

  // Bulk operations
  const applyBulkPrice = () => {
    if (!bulkOperations.bulkPrice) return;
    
    setEditedVariations(prev => prev.map(variation => ({
      ...variation,
      price: bulkOperations.bulkPrice
    })));
    
    setBulkOperations(prev => ({ ...prev, showBulkPrice: false, bulkPrice: '' }));
  };

  const applyBulkInventory = () => {
    if (!bulkOperations.bulkInventory) return;
    
    setEditedVariations(prev => prev.map(variation => ({
      ...variation,
      inventory: bulkOperations.bulkInventory
    })));
    
    setBulkOperations(prev => ({ ...prev, showBulkInventory: false, bulkInventory: '' }));
  };

  const applyBulkDescription = () => {
    if (!bulkOperations.bulkDescription) return;
    
    setEditedVariations(prev => prev.map(variation => ({
      ...variation,
      description: bulkOperations.bulkDescription
    })));
    
    setBulkOperations(prev => ({ ...prev, showBulkDescription: false, bulkDescription: '' }));
  };

  // Toggle variation expansion
  const toggleVariationExpansion = (index) => {
    const newExpanded = new Set(expandedVariations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedVariations(newExpanded);
  };

  // Expand/collapse all
  const toggleAllVariations = (expand) => {
    if (expand) {
      setExpandedVariations(new Set(editedVariations.map((_, i) => i)));
    } else {
      setExpandedVariations(new Set());
    }
  };

  // Handle final save
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate all variations
      const validationErrors = [];
      editedVariations.forEach((variation, index) => {
        if (!variation.name.trim()) validationErrors.push(`Variation ${index + 1}: Name is required`);
        if (!variation.price || variation.price <= 0) validationErrors.push(`Variation ${index + 1}: Valid price is required`);
        if (!variation.sku.trim()) validationErrors.push(`Variation ${index + 1}: SKU is required`);
        if (!variation.inventory || variation.inventory < 0) validationErrors.push(`Variation ${index + 1}: Valid inventory is required`);
      });

      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }

      // Pass the edited variations to parent component
      await onSave(editedVariations);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.bulkEditor}>
      <div className={styles.header}>
        <h2 className={styles.title}>Customize Your Product Variations</h2>
        <p className={styles.description}>
          Customize each variation before creating them as products. You can set individual prices, SKUs, and inventory levels.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Bulk Operations */}
      <div className={styles.bulkOperations}>
        <h3 className={styles.sectionTitle}>Bulk Operations</h3>
        
        <div className={styles.bulkControls}>
          <div className={styles.bulkGroup}>
            <button 
              onClick={() => setBulkOperations(prev => ({ ...prev, showBulkPrice: !prev.showBulkPrice }))}
              className={styles.bulkToggle}
            >
              📊 Bulk Price
            </button>
            {bulkOperations.showBulkPrice && (
              <div className={styles.bulkForm}>
                <input
                  type="number"
                  placeholder="Price for all variations"
                  value={bulkOperations.bulkPrice}
                  onChange={(e) => setBulkOperations(prev => ({ ...prev, bulkPrice: e.target.value }))}
                  className={styles.bulkInput}
                  step="0.01"
                  min="0"
                />
                <button onClick={applyBulkPrice} className={styles.bulkApply}>Apply to All</button>
              </div>
            )}
          </div>

          <div className={styles.bulkGroup}>
            <button 
              onClick={() => setBulkOperations(prev => ({ ...prev, showBulkInventory: !prev.showBulkInventory }))}
              className={styles.bulkToggle}
            >
              📦 Bulk Inventory
            </button>
            {bulkOperations.showBulkInventory && (
              <div className={styles.bulkForm}>
                <input
                  type="number"
                  placeholder="Inventory for all variations"
                  value={bulkOperations.bulkInventory}
                  onChange={(e) => setBulkOperations(prev => ({ ...prev, bulkInventory: e.target.value }))}
                  className={styles.bulkInput}
                  min="0"
                />
                <button onClick={applyBulkInventory} className={styles.bulkApply}>Apply to All</button>
              </div>
            )}
          </div>

          <div className={styles.bulkGroup}>
            <button 
              onClick={() => setBulkOperations(prev => ({ ...prev, showBulkDescription: !prev.showBulkDescription }))}
              className={styles.bulkToggle}
            >
              📝 Bulk Description
            </button>
            {bulkOperations.showBulkDescription && (
              <div className={styles.bulkForm}>
                <textarea
                  placeholder="Description for all variations"
                  value={bulkOperations.bulkDescription}
                  onChange={(e) => setBulkOperations(prev => ({ ...prev, bulkDescription: e.target.value }))}
                  className={styles.bulkTextarea}
                  rows="3"
                />
                <button onClick={applyBulkDescription} className={styles.bulkApply}>Apply to All</button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.viewControls}>
          <button 
            onClick={() => toggleAllVariations(true)} 
            className={styles.viewButton}
          >
            Expand All
          </button>
          <button 
            onClick={() => toggleAllVariations(false)} 
            className={styles.viewButton}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Variations List */}
      <div className={styles.variationsList}>
        <h3 className={styles.sectionTitle}>
          Product Variations ({editedVariations.length})
        </h3>

        {editedVariations.map((variation, index) => (
          <div key={variation.id} className={styles.variationCard}>
            <div 
              className={styles.variationHeader}
              onClick={() => toggleVariationExpansion(index)}
            >
              <div className={styles.variationSummary}>
                <h4 className={styles.variationName}>{variation.combinationName}</h4>
                <div className={styles.variationMeta}>
                  <span className={styles.metaItem}>Price: ${variation.price}</span>
                  <span className={styles.metaItem}>SKU: {variation.sku}</span>
                  <span className={styles.metaItem}>Inventory: {variation.inventory}</span>
                </div>
              </div>
              <div className={styles.expandToggle}>
                {expandedVariations.has(index) ? '▼' : '▶'}
              </div>
            </div>

            {expandedVariations.has(index) && (
              <div className={styles.variationDetails}>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailsSection}>
                    <h5>Basic Information</h5>
                    
                    <div className={styles.formGroup}>
                      <label>Product Name</label>
                      <input
                        type="text"
                        value={variation.name}
                        onChange={(e) => updateVariation(index, 'name', e.target.value)}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Price ($)</label>
                        <input
                          type="number"
                          value={variation.price}
                          onChange={(e) => updateVariation(index, 'price', e.target.value)}
                          className={styles.input}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>SKU</label>
                        <input
                          type="text"
                          value={variation.sku}
                          onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label>Inventory</label>
                        <input
                          type="number"
                          value={variation.inventory}
                          onChange={(e) => updateVariation(index, 'inventory', e.target.value)}
                          className={styles.input}
                          min="0"
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Description</label>
                      <textarea
                        value={variation.description}
                        onChange={(e) => updateVariation(index, 'description', e.target.value)}
                        className={styles.textarea}
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className={styles.detailsSection}>
                    <h5>Images</h5>
                    
                    <div className={styles.imageUpload}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(index, e.target.files)}
                        className={styles.fileInput}
                        id={`images-${index}`}
                      />
                      <label htmlFor={`images-${index}`} className={styles.uploadLabel}>
                        {loading ? 'Uploading...' : 'Add Images'}
                      </label>
                    </div>

                    {variation.images.length > 0 && (
                      <div className={styles.imageGrid}>
                        {variation.images.map((image, imgIndex) => (
                          <div key={imgIndex} className={styles.imageItem}>
                            <img src={image.url} alt={image.alt_text} className={styles.imageThumb} />
                            <button 
                              onClick={() => removeImage(index, imgIndex)}
                              className={styles.removeImage}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button 
          onClick={onBack}
          className={styles.backButton}
        >
          ← Back to Variations
        </button>
        
        <button 
          onClick={handleSave}
          disabled={loading || editedVariations.length === 0}
          className={styles.saveButton}
        >
          {loading ? 'Creating Products...' : `Create ${editedVariations.length} Products`}
        </button>
      </div>
    </div>
  );
};

export default VariationBulkEditor; 