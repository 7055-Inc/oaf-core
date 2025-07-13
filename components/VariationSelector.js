import React, { useState, useEffect } from 'react';
import styles from './VariationSelector.module.css';

const VariationSelector = ({ 
  variationData, 
  onVariationChange, 
  onAddToCart,
  initialQuantity = 1 
}) => {
  const [selectedVariations, setSelectedVariations] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [error, setError] = useState(null);

  // Initialize with first available variation of each type
  useEffect(() => {
    if (variationData && variationData.variation_types) {
      const initialSelections = {};
      
      // Auto-select first option for each variation type
      variationData.variation_types.forEach(type => {
        const options = variationData.variation_options[type.variation_name];
        if (options && options.length > 0) {
          initialSelections[type.variation_name] = options[0].id;
        }
      });
      
      setSelectedVariations(initialSelections);
    }
  }, [variationData]);

  // Find matching product when selections change
  useEffect(() => {
    if (variationData && Object.keys(selectedVariations).length > 0) {
      findMatchingProduct();
    }
  }, [selectedVariations, variationData]);

  const findMatchingProduct = () => {
    if (!variationData.child_products || Object.keys(selectedVariations).length === 0) {
      setSelectedProduct(null);
      setError('Please select all variations');
      return;
    }

    // Find child product that matches all selected variations
    const matchingProduct = variationData.child_products.find(child => {
      return Object.entries(selectedVariations).every(([typeName, valueId]) => {
        const childVariations = child.variations[typeName];
        return childVariations && childVariations.some(v => v.value_id === valueId);
      });
    });

    if (matchingProduct) {
      setSelectedProduct(matchingProduct);
      setError(null);
      
      // Notify parent component of the selected product
      if (onVariationChange) {
        onVariationChange(matchingProduct);
      }
    } else {
      setSelectedProduct(null);
      setError('This option set is currently unavailable');
    }
  };

  // Get available options for a variation type based on current selections
  const getAvailableOptions = (typeName) => {
    if (!variationData.variation_options[typeName]) return [];
    
    const allOptions = variationData.variation_options[typeName];
    
    // If no selections made yet, show all options
    if (Object.keys(selectedVariations).length === 0) {
      return allOptions;
    }
    
    // Filter options based on current selections
    const availableOptions = allOptions.filter(option => {
      // Check if this option is valid with current selections
      const testSelections = { ...selectedVariations, [typeName]: option.id };
      
      return variationData.child_products.some(child => {
        return Object.entries(testSelections).every(([testTypeName, testValueId]) => {
          const childVariations = child.variations[testTypeName];
          return childVariations && childVariations.some(v => v.value_id === testValueId);
        });
      });
    });
    
    return availableOptions;
  };

  const handleVariationChange = (typeName, valueId) => {
    setSelectedVariations(prev => ({
      ...prev,
      [typeName]: parseInt(valueId)
    }));
  };

  const handleQuantityChange = (newQuantity) => {
    const qty = Math.max(1, Math.min(selectedProduct?.inventory?.qty_available || 1, newQuantity));
    setQuantity(qty);
  };

  const handleAddToCart = () => {
    if (selectedProduct && onAddToCart) {
      onAddToCart(selectedProduct, quantity);
    }
  };

  const getSelectedVariationName = () => {
    if (!selectedProduct || !variationData.variation_types) return '';
    
    const variationNames = variationData.variation_types.map(type => {
      const selectedValueId = selectedVariations[type.variation_name];
      const options = variationData.variation_options[type.variation_name];
      const selectedOption = options?.find(opt => opt.id === selectedValueId);
      return selectedOption?.value_name;
    }).filter(Boolean);
    
    return variationNames.join(' × ');
  };

  if (!variationData || !variationData.variation_types) {
    return <div className={styles.loading}>Loading variations...</div>;
  }

  return (
    <div className={styles.variationSelector}>
      <div className={styles.variationControls}>
        {variationData.variation_types.map(type => {
          const availableOptions = getAvailableOptions(type.variation_name);
          const selectedValue = selectedVariations[type.variation_name];
          
          return (
            <div key={type.id} className={styles.variationGroup}>
              <label className={styles.variationLabel}>
                {type.variation_name.charAt(0).toUpperCase() + type.variation_name.slice(1)}:
              </label>
              <select
                value={selectedValue || ''}
                onChange={(e) => handleVariationChange(type.variation_name, e.target.value)}
                className={styles.variationSelect}
                required
              >
                <option value="">Select {type.variation_name}</option>
                {availableOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.value_name.charAt(0).toUpperCase() + option.value_name.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {selectedProduct && (
        <div className={styles.selectedVariation}>
          <div className={styles.variationInfo}>
            <h3 className={styles.variationName}>
              {getSelectedVariationName()}
            </h3>
            <div className={styles.price}>
              ${parseFloat(selectedProduct.price || 0).toFixed(2)}
            </div>
            <div className={styles.availability}>
              {(selectedProduct.inventory?.qty_available || 0) > 0 ? (
                <span className={styles.inStock}>
                  In Stock ({selectedProduct.inventory.qty_available} available)
                </span>
              ) : (
                <span className={styles.outOfStock}>
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          <div className={styles.quantityAndCart}>
            <div className={styles.quantitySelector}>
              <label className={styles.quantityLabel}>Quantity:</label>
              <div className={styles.quantityControls}>
                <button 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className={styles.quantityButton}
                  disabled={quantity <= 1 || (selectedProduct.inventory?.qty_available || 0) === 0}
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max={selectedProduct.inventory?.qty_available || 0}
                  className={styles.quantityInput}
                  disabled={(selectedProduct.inventory?.qty_available || 0) === 0}
                />
                <button 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className={styles.quantityButton}
                  disabled={quantity >= (selectedProduct.inventory?.qty_available || 0) || (selectedProduct.inventory?.qty_available || 0) === 0}
                >
                  +
                </button>
              </div>
            </div>

            <button 
              onClick={handleAddToCart}
              className={styles.addToCartButton}
              disabled={!selectedProduct || (selectedProduct.inventory?.qty_available || 0) === 0}
            >
              Add to Cart
            </button>
            
            {(selectedProduct.inventory?.qty_available || 0) === 0 && (
              <button 
                onClick={() => alert('Email notification feature coming soon!')}
                className={styles.emailNotifyButton}
              >
                📧 Email me when back in stock
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VariationSelector; 