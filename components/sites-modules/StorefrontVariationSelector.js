import React, { useState, useEffect } from 'react';

export default function StorefrontVariationSelector({
  variationData,
  onVariationChange,
  onAddToCart,
  initialQuantity = 1
}) {
  const [selectedVariations, setSelectedVariations] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (variationData?.variation_types) {
      const initial = {};
      variationData.variation_types.forEach(type => {
        const options = variationData.variation_options[type.variation_name];
        if (options?.length > 0) {
          initial[type.variation_name] = options[0].id;
        }
      });
      setSelectedVariations(initial);
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
      setError('Please select all options');
      return;
    }
    const match = variationData.child_products.find(child =>
      Object.entries(selectedVariations).every(([typeName, valueId]) => {
        const childVars = child.variations?.[typeName];
        return childVars && childVars.some(v => v.value_id === valueId);
      })
    );
    if (match) {
      setSelectedProduct(match);
      setError(null);
      if (onVariationChange) onVariationChange(match);
    } else {
      setSelectedProduct(null);
      setError('This combination is currently unavailable');
    }
  };

  const getAvailableOptions = (typeName) => {
    const allOptions = variationData.variation_options[typeName];
    if (!allOptions) return [];
    if (Object.keys(selectedVariations).length === 0) return allOptions;
    return allOptions.filter(option => {
      const testSelections = { ...selectedVariations, [typeName]: option.id };
      return variationData.child_products.some(child =>
        Object.entries(testSelections).every(([tn, vid]) => {
          const cv = child.variations?.[tn];
          return cv && cv.some(v => v.value_id === vid);
        })
      );
    });
  };

  const handleChange = (typeName, valueId) => {
    setSelectedVariations(prev => ({ ...prev, [typeName]: parseInt(valueId) }));
  };

  const handleQuantityChange = (val) => {
    const max = selectedProduct?.inventory?.qty_available || 999;
    setQuantity(Math.max(1, Math.min(max, val)));
  };

  const handleAddToCart = () => {
    if (selectedProduct && onAddToCart) onAddToCart(selectedProduct, quantity);
  };

  const getSelectedLabel = () => {
    if (!selectedProduct || !variationData.variation_types) return '';
    return variationData.variation_types
      .map(type => {
        const vid = selectedVariations[type.variation_name];
        const opts = variationData.variation_options[type.variation_name];
        const opt = opts?.find(o => o.id === vid);
        return opt?.value_name;
      })
      .filter(Boolean)
      .map(n => n.charAt(0).toUpperCase() + n.slice(1))
      .join(' / ');
  };

  if (!variationData?.variation_types) return null;

  const selectStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--border-radius, 6px)',
    border: '1px solid rgba(128,128,128,0.3)',
    fontSize: '0.95rem',
    fontFamily: 'var(--body-font, sans-serif)',
    color: 'var(--text-color, #333)',
    background: 'var(--background-color, #fff)',
    cursor: 'pointer',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    opacity: 0.8,
  };

  const inStock = selectedProduct && (selectedProduct.inventory?.qty_available || 0) > 0;
  const stockQty = selectedProduct?.inventory?.qty_available || 0;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Variation dropdowns */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        {variationData.variation_types.map(type => {
          const options = getAvailableOptions(type.variation_name);
          return (
            <div key={type.id || type.variation_name} style={{ flex: '1', minWidth: '140px' }}>
              <label style={labelStyle}>
                {type.variation_name.charAt(0).toUpperCase() + type.variation_name.slice(1)}
              </label>
              <select
                value={selectedVariations[type.variation_name] || ''}
                onChange={(e) => handleChange(type.variation_name, e.target.value)}
                style={selectStyle}
              >
                <option value="">Select {type.variation_name}</option>
                {options.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.value_name.charAt(0).toUpperCase() + opt.value_name.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: '0 0 1rem' }}>{error}</p>
      )}

      {/* Selected variant details */}
      {selectedProduct && (
        <div style={{
          background: 'rgba(128,128,128,0.05)',
          border: '1px solid rgba(128,128,128,0.15)',
          borderRadius: 'var(--border-radius, 8px)',
          padding: '1.25rem',
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{getSelectedLabel()}</p>

          <p style={{ margin: '0.5rem 0', fontSize: '1.35rem', fontWeight: 700, color: 'var(--main-color, #333)' }}>
            ${parseFloat(selectedProduct.price || 0).toFixed(2)}
          </p>

          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
            {inStock ? (
              <span style={{ color: '#059669', fontWeight: 500 }}>In Stock ({stockQty} available)</span>
            ) : (
              <span style={{ color: '#dc2626', fontWeight: 500 }}>Out of Stock</span>
            )}
          </p>

          {/* Quantity + Add to Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1 || !inStock}
                style={{
                  width: '36px', height: '36px', border: '1px solid rgba(128,128,128,0.3)',
                  borderRadius: 'var(--border-radius, 6px) 0 0 var(--border-radius, 6px)',
                  background: 'var(--background-color, #fff)', cursor: 'pointer', fontSize: '1.1rem',
                  color: 'var(--text-color, #333)',
                }}
              >−</button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                min={1}
                max={stockQty || 999}
                disabled={!inStock}
                style={{
                  width: '50px', height: '36px', textAlign: 'center',
                  border: '1px solid rgba(128,128,128,0.3)', borderLeft: 'none', borderRight: 'none',
                  fontFamily: 'var(--body-font, sans-serif)', fontSize: '0.95rem',
                  color: 'var(--text-color, #333)', background: 'var(--background-color, #fff)',
                }}
              />
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= stockQty || !inStock}
                style={{
                  width: '36px', height: '36px', border: '1px solid rgba(128,128,128,0.3)',
                  borderRadius: '0 var(--border-radius, 6px) var(--border-radius, 6px) 0',
                  background: 'var(--background-color, #fff)', cursor: 'pointer', fontSize: '1.1rem',
                  color: 'var(--text-color, #333)',
                }}
              >+</button>
            </div>

            <button
              className="hero-cta"
              onClick={handleAddToCart}
              disabled={!selectedProduct || !inStock}
              style={{ flex: 1, minWidth: '180px', opacity: (!selectedProduct || !inStock) ? 0.5 : 1 }}
            >
              Add to Cart — ${(parseFloat(selectedProduct.price || 0) * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
