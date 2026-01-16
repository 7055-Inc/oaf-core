import { useState, useEffect } from 'react';
import { useProductForm } from '../ProductFormContext';
import { authenticatedApiRequest } from '../../../../../lib/csrf';
import VariationBulkEditor from '../../../../VariationBulkEditor';

/**
 * VariationsSection - Manage product variations for variable products
 * Integrates variation type selection, combination generation, and bulk editor
 */
export default function VariationsSection() {
  const { formData, variations, setVariations, savedProductId, saving } = useProductForm();
  
  const [variationTypes, setVariationTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [activeCombinations, setActiveCombinations] = useState(new Set());
  const [step, setStep] = useState(1); // 1: Select types, 2: Select combinations, 3: Bulk editor
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [draftChildren, setDraftChildren] = useState([]); // Created draft child products

  // Load variation types on mount
  useEffect(() => {
    fetchVariationTypes();
  }, []);

  // If we already have variations (edit mode), show them
  useEffect(() => {
    if (variations && variations.length > 0 && step === 1) {
      // We have existing variations, show them in step 3
      setDraftChildren(variations);
      setStep(3);
    }
  }, [variations]);

  const fetchVariationTypes = async () => {
    try {
      const response = await authenticatedApiRequest('products/variations/types', { method: 'GET' });
      if (response.ok) {
        const types = await response.json();
        setVariationTypes(types);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const loadVariationValues = async (typeId) => {
    try {
      const url = savedProductId 
        ? `products/variations/types/${typeId}/values?product_id=${savedProductId}`
        : `products/variations/types/${typeId}/values`;
      const response = await authenticatedApiRequest(url, { method: 'GET' });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const handleCreateVariationType = async () => {
    if (!newTypeName.trim()) return;
    
    try {
      setLoading(true);
      const response = await authenticatedApiRequest('products/variations/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variation_name: newTypeName.trim() })
      });
      
      if (response.ok) {
        const newType = await response.json();
        setVariationTypes(prev => [...prev, newType]);
        setNewTypeName('');
      }
    } catch (err) {
      setError('Failed to create variation type');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSelection = async (type) => {
    const isSelected = selectedTypes.some(t => t.id === type.id);
    
    if (isSelected) {
      setSelectedTypes(prev => prev.filter(t => t.id !== type.id));
    } else {
      const values = await loadVariationValues(type.id);
      const typeWithValues = { ...type, values };
      setSelectedTypes(prev => [...prev, typeWithValues]);
    }
  };

  const handleAddValue = async (typeId, valueName) => {
    try {
      const response = await authenticatedApiRequest(`products/variations/types/${typeId}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value_name: valueName })
      });
      
      if (response.ok) {
        const newValue = await response.json();
        setSelectedTypes(prev => prev.map(type => {
          if (type.id === typeId) {
            return { ...type, values: [...(type.values || []), newValue] };
          }
          return type;
        }));
      }
    } catch (err) {
      // Silent fail
    }
  };

  const generateCombinations = () => {
    if (selectedTypes.length === 0) return [];
    
    const validTypes = selectedTypes.filter(type => type.values && type.values.length > 0);
    if (validTypes.length === 0) return [];

    const combos = validTypes.reduce((acc, type) => {
      if (acc.length === 0) {
        return type.values.map(value => [{ 
          typeId: type.id, 
          typeName: type.variation_name, 
          valueId: value.id, 
          valueName: value.value_name 
        }]);
      }
      
      const newCombos = [];
      acc.forEach(combo => {
        type.values.forEach(value => {
          newCombos.push([
            ...combo,
            { typeId: type.id, typeName: type.variation_name, valueId: value.id, valueName: value.value_name }
          ]);
        });
      });
      return newCombos;
    }, []);

    return combos.slice(0, 100); // Limit to 100
  };

  const handleGenerateCombinations = () => {
    const generated = generateCombinations();
    setCombinations(generated);
    // Auto-select all by default
    setActiveCombinations(new Set(generated.map((_, i) => i)));
    setStep(2);
  };

  const toggleCombination = (index) => {
    const newActive = new Set(activeCombinations);
    if (newActive.has(index)) {
      newActive.delete(index);
    } else {
      newActive.add(index);
    }
    setActiveCombinations(newActive);
  };

  // Generate SKU for variation
  const generateSKU = (baseSKU, combinationName, index) => {
    if (!baseSKU) return `VAR-${index + 1}`;
    
    const combinationCode = combinationName
      .split(' × ')
      .map(val => val.substring(0, 2).toUpperCase())
      .join('');
    
    return `${baseSKU}-${combinationCode}`;
  };

  // Create draft children from selected combinations
  const handleCreateDraftChildren = async () => {
    if (!savedProductId) {
      setError('Please save the product first before creating variations.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedVariations = combinations.filter((_, index) => activeCombinations.has(index));
      
      if (selectedVariations.length === 0) {
        setError('Please select at least one variation.');
        setLoading(false);
        return;
      }

      // Create draft children one by one
      const createdDrafts = [];
      
      for (let i = 0; i < selectedVariations.length; i++) {
        const combination = selectedVariations[i];
        const combinationName = combination.map(v => v.valueName).join(' × ');
        
        const draftPayload = {
          name: `${formData.name} - ${combinationName}`,
          description: formData.description,
          short_description: formData.short_description,
          price: formData.price,
          sku: generateSKU(formData.sku, combinationName, i),
          category_id: formData.category_id,
          parent_id: savedProductId,
          product_type: 'variant',
          status: 'draft',
          ship_method: formData.ship_method,
          ship_rate: formData.ship_rate,
          shipping_services: formData.shipping_services,
          width: formData.width,
          height: formData.height,
          depth: formData.depth,
          weight: formData.weight,
          dimension_unit: formData.dimension_unit,
          weight_unit: formData.weight_unit,
          images: formData.images || [],
          beginning_inventory: 0,
          reorder_qty: 0
        };

        const response = await authenticatedApiRequest('products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to create "${combinationName}": ${errorData.error}`);
        }

        const createdProduct = await response.json();
        
        // Store variation type/value associations
        for (const combo of combination) {
          if (combo.typeId && combo.valueId) {
            await authenticatedApiRequest('products/variations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: createdProduct.id,
                variation_type_id: combo.typeId,
                variation_value_id: combo.valueId
              })
            });
          }
        }
        
        createdDrafts.push(createdProduct);
        
        // Small delay to prevent rate limiting
        if (i < selectedVariations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setDraftChildren(createdDrafts);
      setVariations(createdDrafts);
      setStep(3);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk editor save - activate all variations
  const handleBulkEditorSave = async (finalizedVariations) => {
    setLoading(true);
    setError('');

    try {
      // Update each variation with final data and activate
      for (const variation of finalizedVariations) {
        const updatePayload = {
          name: variation.name,
          description: variation.description,
          short_description: variation.shortDescription,
          price: parseFloat(variation.price),
          beginning_inventory: parseInt(variation.inventory) || 0,
          reorder_qty: parseInt(variation.reorder_qty) || parseInt(variation.inventory) || 0,
          sku: variation.sku,
          width: variation.dimensions?.width || '',
          height: variation.dimensions?.height || '',
          depth: variation.dimensions?.depth || '',
          weight: variation.dimensions?.weight || '',
          dimension_unit: variation.dimensions?.dimension_unit || 'in',
          weight_unit: variation.dimensions?.weight_unit || 'lbs',
          ship_method: variation.shipping?.ship_method || 'free',
          ship_rate: variation.shipping?.ship_rate || '',
          shipping_services: variation.shipping?.shipping_services || '',
          images: (variation.images || []).map(img => typeof img === 'string' ? img : img.url),
          status: 'active'
        };

        const response = await authenticatedApiRequest(`products/${variation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to activate "${variation.name}": ${errorData.error}`);
        }
      }

      // Update variations in context
      setVariations(finalizedVariations);
      
      // Show success
      setError('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  };

  // Skip if not a variable product
  if (formData.product_type !== 'variable') {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>Variations are only available for variable products.</p>
        <p style={{ fontSize: '13px' }}>
          Change product type to "Variable Product" to enable variations.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ 
          padding: '12px', 
          background: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '6px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
      )}

      {/* Step 1: Select Variation Types */}
      {step === 1 && (
        <>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            Choose the types of variations your product will have (e.g., Size, Color, Style).
          </p>

          {/* Create New Type */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '20px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <input
              type="text"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              placeholder="Create new variation type (e.g., Size)"
              style={{ ...inputStyle, flex: 1 }}
              onKeyPress={e => e.key === 'Enter' && handleCreateVariationType()}
            />
            <button
              type="button"
              onClick={handleCreateVariationType}
              disabled={!newTypeName.trim() || loading}
              style={{
                padding: '10px 20px',
                background: 'var(--primary-color, #055474)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: newTypeName.trim() ? 'pointer' : 'not-allowed',
                opacity: newTypeName.trim() ? 1 : 0.5
              }}
            >
              + Create
            </button>
          </div>

          {/* Variation Types List */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>
              Available Variation Types
            </label>
            
            {variationTypes.length === 0 ? (
              <div style={{ color: '#666', padding: '20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
                No variation types yet. Create one above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {variationTypes.map(type => {
                  const isSelected = selectedTypes.some(t => t.id === type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleTypeSelection(type)}
                      style={{
                        padding: '10px 16px',
                        border: isSelected ? '2px solid var(--primary-color, #055474)' : '2px solid #ddd',
                        borderRadius: '20px',
                        background: isSelected ? 'rgba(5, 84, 116, 0.1)' : 'white',
                        cursor: 'pointer',
                        fontWeight: isSelected ? '600' : 'normal',
                        color: isSelected ? 'var(--primary-color, #055474)' : '#333'
                      }}
                    >
                      {isSelected && <><i className="fas fa-check" style={{ marginRight: '4px' }}></i></>}{type.variation_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Types with Values */}
          {selectedTypes.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                Configure Values for Selected Types
              </label>
              
              {selectedTypes.map(type => (
                <VariationValueEditor
                  key={type.id}
                  type={type}
                  onAddValue={(value) => handleAddValue(type.id, value)}
                />
              ))}
            </div>
          )}

          {/* Generate Combinations Button */}
          {selectedTypes.length > 0 && selectedTypes.every(t => t.values && t.values.length > 0) && (
            <button
              type="button"
              onClick={handleGenerateCombinations}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--primary-color, #055474)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px'
              }}
            >
              Generate Combinations →
            </button>
          )}
        </>
      )}

      {/* Step 2: Select Combinations */}
      {step === 2 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color, #055474)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                ← Back to type selection
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {activeCombinations.size} of {combinations.length} selected
            </div>
          </div>

          {/* Bulk Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveCombinations(new Set(combinations.map((_, i) => i)))}
              style={{
                padding: '8px 16px',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setActiveCombinations(new Set())}
              style={{
                padding: '8px 16px',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Deselect All
            </button>
          </div>

          {/* Combinations Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '12px',
            marginBottom: '20px'
          }}>
            {combinations.map((combo, index) => (
              <div
                key={index}
                onClick={() => toggleCombination(index)}
                style={{
                  padding: '16px',
                  border: activeCombinations.has(index) 
                    ? '2px solid var(--primary-color, #055474)' 
                    : '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: activeCombinations.has(index) 
                    ? 'rgba(5, 84, 116, 0.05)' 
                    : 'white',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  {combo.map(v => v.valueName).join(' × ')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {combo.map((v, i) => (
                    <span 
                      key={i}
                      style={{
                        padding: '2px 8px',
                        background: '#e9ecef',
                        borderRadius: '10px',
                        fontSize: '11px'
                      }}
                    >
                      {v.typeName}: {v.valueName}
                    </span>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '12px', 
                  fontSize: '12px',
                  color: activeCombinations.has(index) ? 'var(--primary-color, #055474)' : '#666'
                }}>
                  {activeCombinations.has(index) ? <><i className="fas fa-check" style={{ marginRight: '4px' }}></i>Selected</> : 'Click to select'}
                </div>
              </div>
            ))}
          </div>

          {/* Create Variations Button */}
          <button
            type="button"
            onClick={handleCreateDraftChildren}
            disabled={activeCombinations.size === 0 || loading || !savedProductId}
            style={{
              width: '100%',
              padding: '14px',
              background: activeCombinations.size > 0 && savedProductId ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: activeCombinations.size > 0 && savedProductId ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '15px'
            }}
          >
            {loading ? 'Creating Variations...' : `Create ${activeCombinations.size} Variation${activeCombinations.size !== 1 ? 's' : ''} →`}
          </button>
          
          {!savedProductId && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc3545', textAlign: 'center' }}>
              Please save the product first (in Basic Info) before creating variations.
            </div>
          )}
        </>
      )}

      {/* Step 3: Bulk Editor */}
      {step === 3 && draftChildren.length > 0 && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color, #055474)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ← Back to combination selection
            </button>
          </div>

          <VariationBulkEditor
            variations={draftChildren}
            parentProductData={formData}
            onSave={handleBulkEditorSave}
            onBack={() => setStep(2)}
          />
        </>
      )}

      {/* Show confirmed variations summary */}
      {variations.length > 0 && step !== 3 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: '#e8f5e9', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#28a745' }}>
            <i className="fas fa-check" style={{ marginRight: '4px' }}></i> {variations.length} variation{variations.length !== 1 ? 's' : ''} created
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {variations.slice(0, 10).map((v, i) => (
              <span 
                key={i}
                style={{
                  padding: '4px 10px',
                  background: 'white',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              >
                {v.name}
              </span>
            ))}
            {variations.length > 10 && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                +{variations.length - 10} more
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftChildren(variations);
              setStep(3);
            }}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: 'var(--primary-color, #055474)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Edit Variations
          </button>
        </div>
      )}
    </div>
  );
}

// Helper component for adding values to a variation type
function VariationValueEditor({ type, onAddValue }) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue('');
    }
  };

  return (
    <div style={{ 
      padding: '16px', 
      background: '#f8f9fa', 
      borderRadius: '8px',
      marginBottom: '12px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '10px' }}>
        {type.variation_name}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder={`Add ${type.variation_name.toLowerCase()} value...`}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '13px'
          }}
          onKeyPress={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newValue.trim()}
          style={{
            padding: '8px 16px',
            background: '#055474',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: newValue.trim() ? 'pointer' : 'not-allowed',
            opacity: newValue.trim() ? 1 : 0.5,
            fontSize: '13px'
          }}
        >
          Add
        </button>
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {type.values && type.values.map(value => (
          <span 
            key={value.id}
            style={{
              padding: '4px 12px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '12px',
              fontSize: '12px'
            }}
          >
            {value.value_name}
          </span>
        ))}
        {(!type.values || type.values.length === 0) && (
          <span style={{ color: '#999', fontSize: '12px' }}>
            No values yet. Add some above.
          </span>
        )}
      </div>
    </div>
  );
}

// Summary for collapsed state
export function getVariationsSummary(variations) {
  if (!variations || variations.length === 0) return null;
  return `${variations.length} variation${variations.length !== 1 ? 's' : ''} configured`;
}
