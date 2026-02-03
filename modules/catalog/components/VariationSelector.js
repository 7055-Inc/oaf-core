/**
 * VariationSelector - public product page: select variation options and add to cart.
 * Uses global styles (form-card, form-group, error-alert, loading-state, primary, secondary).
 * Data comes from parent (variationData); no API calls.
 */

import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (variationData && variationData.variation_types) {
      const initialSelections = {};
      variationData.variation_types.forEach(type => {
        const options = variationData.variation_options[type.variation_name];
        if (options && options.length > 0) {
          initialSelections[type.variation_name] = options[0].id;
        }
      });
      setSelectedVariations(initialSelections);
    }
  }, [variationData]);

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
    const matchingProduct = variationData.child_products.find(child => {
      return Object.entries(selectedVariations).every(([typeName, valueId]) => {
        const childVariations = child.variations[typeName];
        return childVariations && childVariations.some(v => v.value_id === valueId);
      });
    });
    if (matchingProduct) {
      setSelectedProduct(matchingProduct);
      setError(null);
      if (onVariationChange) onVariationChange(matchingProduct);
    } else {
      setSelectedProduct(null);
      setError('This option set is currently unavailable');
    }
  };

  const getAvailableOptions = (typeName) => {
    if (!variationData.variation_options[typeName]) return [];
    const allOptions = variationData.variation_options[typeName];
    if (Object.keys(selectedVariations).length === 0) return allOptions;
    return allOptions.filter(option => {
      const testSelections = { ...selectedVariations, [typeName]: option.id };
      return variationData.child_products.some(child =>
        Object.entries(testSelections).every(([testTypeName, testValueId]) => {
          const childVariations = child.variations[testTypeName];
          return childVariations && childVariations.some(v => v.value_id === testValueId);
        })
      );
    });
  };

  const handleVariationChange = (typeName, valueId) => {
    setSelectedVariations(prev => ({ ...prev, [typeName]: parseInt(valueId) }));
  };

  const handleQuantityChange = (newQuantity) => {
    const qty = Math.max(1, Math.min(selectedProduct?.inventory?.qty_available || 1, newQuantity));
    setQuantity(qty);
  };

  const handleAddToCart = () => {
    if (selectedProduct && onAddToCart) onAddToCart(selectedProduct, quantity);
  };

  const getSelectedVariationName = () => {
    if (!selectedProduct || !variationData.variation_types) return '';
    return variationData.variation_types
      .map(type => {
        const selectedValueId = selectedVariations[type.variation_name];
        const options = variationData.variation_options[type.variation_name];
        const selectedOption = options?.find(opt => opt.id === selectedValueId);
        return selectedOption?.value_name;
      })
      .filter(Boolean)
      .join(' × ');
  };

  if (!variationData || !variationData.variation_types) {
    return <div className="loading-state">Loading variations...</div>;
  }

  return (
    <div className="form-card" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        {variationData.variation_types.map(type => {
          const availableOptions = getAvailableOptions(type.variation_name);
          const selectedValue = selectedVariations[type.variation_name];
          return (
            <div key={type.id} className="form-group" style={{ flex: '1', minWidth: '150px' }}>
              <label>
                {type.variation_name.charAt(0).toUpperCase() + type.variation_name.slice(1)}:
              </label>
              <select
                value={selectedValue || ''}
                onChange={(e) => handleVariationChange(type.variation_name, e.target.value)}
                className="form-input"
                style={{ maxWidth: '200px' }}
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

      {error && <div className="error-alert">{error}</div>}

      {selectedProduct && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{getSelectedVariationName()}</h3>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669', marginBottom: '0.5rem' }}>
              ${parseFloat(selectedProduct.price || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              {(selectedProduct.inventory?.qty_available || 0) > 0 ? (
                <span className="status-badge active">
                  In Stock ({selectedProduct.inventory.qty_available} available)
                </span>
              ) : (
                <span className="status-badge danger">Out of Stock</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label>Quantity:</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', overflow: 'hidden', background: 'white' }}>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="secondary"
                  style={{ width: '2.5rem', height: '2.5rem', padding: 0 }}
                  disabled={quantity <= 1 || (selectedProduct.inventory?.qty_available || 0) === 0}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min={1}
                  max={selectedProduct.inventory?.qty_available || 0}
                  style={{ width: '4rem', height: '2.5rem', border: 'none', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}
                  disabled={(selectedProduct.inventory?.qty_available || 0) === 0}
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="secondary"
                  style={{ width: '2.5rem', height: '2.5rem', padding: 0 }}
                  disabled={quantity >= (selectedProduct.inventory?.qty_available || 0) || (selectedProduct.inventory?.qty_available || 0) === 0}
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="primary"
              style={{ flex: 1, minWidth: '200px' }}
              disabled={!selectedProduct || (selectedProduct.inventory?.qty_available || 0) === 0}
            >
              Add to Cart
            </button>
            {(selectedProduct.inventory?.qty_available || 0) === 0 && (
              <button
                type="button"
                onClick={() => alert('Email notification feature coming soon!')}
                className="secondary"
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
