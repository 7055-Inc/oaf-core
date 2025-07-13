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
    showBulkShortDescription: false,
    showBulkDimensions: false,
    bulkPrice: '',
    bulkInventory: '',
    bulkDescription: '',
    bulkShortDescription: '',
    bulkDimensions: {
      width: '',
      height: '',
      depth: '',
      weight: '',
      dimension_unit: 'in',
      weight_unit: 'lbs'
    }
  });
  const [expandedVariations, setExpandedVariations] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with real draft product records
  useEffect(() => {
    if (!variations || variations.length === 0) return;
    
    const processedVariations = variations.map(draftProduct => {
      // Extract variation types from kind- properties
      const combination = [];
      Object.keys(draftProduct).forEach(key => {
        if (key.startsWith('kind-')) {
          const parts = key.split('-');
          if (parts.length >= 3) {
            combination.push({
              typeName: parts[1],
              valueName: parts.slice(2).join('-')
            });
          }
        }
      });
      
      // Generate combination name from properties, not product name
      const combinationName = combination.length > 0 
        ? combination.map(c => c.valueName).join(' × ')
        : 'Variation';
      
      return {
        // Use the real draft product data
        ...draftProduct,
        // Add convenience fields for the UI
        combinationName,
        combination,
        // Structure nested data for easier editing
        dimensions: {
          width: draftProduct.width || '',
          height: draftProduct.height || '',
          depth: draftProduct.depth || '',
          weight: draftProduct.weight || '',
          dimension_unit: draftProduct.dimension_unit || 'in',
          weight_unit: draftProduct.weight_unit || 'lbs'
        },
        shipping: {
          ship_method: draftProduct.ship_method || 'free',
          ship_rate: draftProduct.ship_rate || '',
          shipping_services: draftProduct.shipping_services || ''
        },
        // Use inventory from the draft record
        inventory: draftProduct.beginning_inventory || 0,
        // Process images
        images: [...(draftProduct.images || [])].map(img => {
          if (typeof img === 'string') {
            return {
              url: img.startsWith('http') ? img : `https://api2.onlineartfestival.com${img}`,
              alt_text: '',
              friendly_name: '',
              is_primary: false,
              order: 1
            };
          }
          return {
            ...img,
            url: img.url?.startsWith('http') ? img.url : `https://api2.onlineartfestival.com${img.url || img}`
          };
        })
      };
    });
    
    setEditedVariations(processedVariations);
  }, [variations]);

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

      // Use parentProductData.id as the product_id for consistent naming
      const productId = parentProductData?.id || 'new';
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/upload?product_id=${productId}`, {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) throw new Error('Failed to upload images');
      
      const data = await response.json();
      const newImages = (data.urls || []).map(url => ({
        url: url.startsWith('http') ? url : `https://api2.onlineartfestival.com${url}`,
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

  const applyBulkShortDescription = () => {
    if (!bulkOperations.bulkShortDescription) return;
    
    setEditedVariations(prev => prev.map(variation => ({
      ...variation,
      shortDescription: bulkOperations.bulkShortDescription
    })));
    
    setBulkOperations(prev => ({ ...prev, showBulkShortDescription: false, bulkShortDescription: '' }));
  };

  const applyBulkDimensions = () => {
    const { width, height, depth, weight, dimension_unit, weight_unit } = bulkOperations.bulkDimensions;
    
    if (!width && !height && !depth && !weight) return;
    
    setEditedVariations(prev => prev.map(variation => ({
      ...variation,
      dimensions: {
        width: width || variation.dimensions.width,
        height: height || variation.dimensions.height,
        depth: depth || variation.dimensions.depth,
        weight: weight || variation.dimensions.weight,
        dimension_unit: dimension_unit || variation.dimensions.dimension_unit,
        weight_unit: weight_unit || variation.dimensions.weight_unit
      }
    })));
    
    setBulkOperations(prev => ({ 
      ...prev, 
      showBulkDimensions: false, 
      bulkDimensions: {
        width: '',
        height: '',
        depth: '',
        weight: '',
        dimension_unit: 'in',
        weight_unit: 'lbs'
      }
    }));
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

      {error && <div className={styles.error}>{error}</div>}

      {/* Bulk Operations */}
      <div className={styles.bulkOperations}>
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
                <button onClick={applyBulkPrice} className="secondary">Apply to All</button>
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
                <button onClick={applyBulkInventory} className="secondary">Apply to All</button>
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
                <button onClick={applyBulkDescription} className="secondary">Apply to All</button>
              </div>
            )}
          </div>

          <div className={styles.bulkGroup}>
            <button 
              onClick={() => setBulkOperations(prev => ({ ...prev, showBulkShortDescription: !prev.showBulkShortDescription }))}
              className={styles.bulkToggle}
            >
              📄 Bulk Short Description
            </button>
            {bulkOperations.showBulkShortDescription && (
              <div className={styles.bulkForm}>
                <textarea
                  placeholder="Short description for all variations"
                  value={bulkOperations.bulkShortDescription}
                  onChange={(e) => setBulkOperations(prev => ({ ...prev, bulkShortDescription: e.target.value }))}
                  className={styles.bulkTextarea}
                  rows="2"
                />
                <button onClick={applyBulkShortDescription} className="secondary">Apply to All</button>
              </div>
            )}
          </div>

          <div className={styles.bulkGroup}>
            <button 
              onClick={() => setBulkOperations(prev => ({ ...prev, showBulkDimensions: !prev.showBulkDimensions }))}
              className={styles.bulkToggle}
            >
              📐 Bulk Dimensions
            </button>
            {bulkOperations.showBulkDimensions && (
              <div className={styles.bulkForm}>
                <div className={styles.dimensionsGrid}>
                  <input
                    type="number"
                    placeholder="Width"
                    value={bulkOperations.bulkDimensions.width}
                    onChange={(e) => setBulkOperations(prev => ({ 
                      ...prev, 
                      bulkDimensions: { ...prev.bulkDimensions, width: e.target.value }
                    }))}
                    className={styles.bulkInput}
                    step="0.01"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Height"
                    value={bulkOperations.bulkDimensions.height}
                    onChange={(e) => setBulkOperations(prev => ({ 
                      ...prev, 
                      bulkDimensions: { ...prev.bulkDimensions, height: e.target.value }
                    }))}
                    className={styles.bulkInput}
                    step="0.01"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Depth"
                    value={bulkOperations.bulkDimensions.depth}
                    onChange={(e) => setBulkOperations(prev => ({ 
                      ...prev, 
                      bulkDimensions: { ...prev.bulkDimensions, depth: e.target.value }
                    }))}
                    className={styles.bulkInput}
                    step="0.01"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Weight"
                    value={bulkOperations.bulkDimensions.weight}
                    onChange={(e) => setBulkOperations(prev => ({ 
                      ...prev, 
                      bulkDimensions: { ...prev.bulkDimensions, weight: e.target.value }
                    }))}
                    className={styles.bulkInput}
                    step="0.01"
                    min="0"
                  />
                </div>
                <button onClick={applyBulkDimensions} className="secondary">Apply to All</button>
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
                      <label>Short Description</label>
                      <textarea
                        value={variation.shortDescription}
                        onChange={(e) => updateVariation(index, 'shortDescription', e.target.value)}
                        className={styles.textarea}
                        rows="2"
                        placeholder="Brief description for listings"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Full Description</label>
                      <textarea
                        value={variation.description}
                        onChange={(e) => updateVariation(index, 'description', e.target.value)}
                        className={styles.textarea}
                        rows="4"
                        placeholder="Complete product description"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Dimensions</label>
                      <div className={styles.dimensionsRow}>
                        <input
                          type="number"
                          placeholder="Width"
                          value={variation.dimensions.width}
                          onChange={(e) => updateNestedField(index, 'dimensions', 'width', e.target.value)}
                          className={styles.dimensionInput}
                          step="0.01"
                          min="0"
                        />
                        <input
                          type="number"
                          placeholder="Height"
                          value={variation.dimensions.height}
                          onChange={(e) => updateNestedField(index, 'dimensions', 'height', e.target.value)}
                          className={styles.dimensionInput}
                          step="0.01"
                          min="0"
                        />
                        <input
                          type="number"
                          placeholder="Depth"
                          value={variation.dimensions.depth}
                          onChange={(e) => updateNestedField(index, 'dimensions', 'depth', e.target.value)}
                          className={styles.dimensionInput}
                          step="0.01"
                          min="0"
                        />
                        <input
                          type="number"
                          placeholder="Weight"
                          value={variation.dimensions.weight}
                          onChange={(e) => updateNestedField(index, 'dimensions', 'weight', e.target.value)}
                          className={styles.dimensionInput}
                          step="0.01"
                          min="0"
                        />
                      </div>
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
                              className="secondary"
                              style={{ padding: '2px 6px', fontSize: '14px' }}
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
          className="secondary"
        >
          ← Back to Variations
        </button>
        
        <button 
          onClick={handleSave}
          disabled={loading || editedVariations.length === 0}
        >
          {loading ? 'Creating Products...' : `Create ${editedVariations.length} Products`}
        </button>
      </div>
    </div>
  );
};

export default VariationBulkEditor; 