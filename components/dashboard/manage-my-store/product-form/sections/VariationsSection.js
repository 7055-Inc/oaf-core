import { useState, useEffect } from 'react';
import { useProductForm } from '../ProductFormContext';
import { authenticatedApiRequest } from '../../../../../lib/csrf';

/**
 * VariationsSection - Manage product variations for variable products
 * Based on existing VariationManager but adapted for accordion UX
 */
export default function VariationsSection() {
  const { formData, variations, setVariations, savedProductId } = useProductForm();
  
  const [variationTypes, setVariationTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [activeCombinations, setActiveCombinations] = useState(new Set());
  const [step, setStep] = useState(1); // 1: Select types, 2: Select combinations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // Load variation types on mount
  useEffect(() => {
    fetchVariationTypes();
  }, []);

  const fetchVariationTypes = async () => {
    try {
      const response = await authenticatedApiRequest('products/variations/types', { method: 'GET' });
      if (response.ok) {
        const types = await response.json();
        setVariationTypes(types);
      }
    } catch (err) {
      console.error('Error loading variation types:', err);
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
      console.error('Error loading variation values:', err);
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
      console.error('Failed to add value:', err);
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

  const handleConfirmVariations = () => {
    const selectedVariations = combinations
      .filter((_, index) => activeCombinations.has(index))
      .map(combo => ({
        combination: combo,
        name: combo.map(v => v.valueName).join(' × ')
      }));
    
    setVariations(selectedVariations);
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
                      {isSelected && '✓ '}{type.variation_name}
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
                  {activeCombinations.has(index) ? '✓ Selected' : 'Click to select'}
                </div>
              </div>
            ))}
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmVariations}
            disabled={activeCombinations.size === 0}
            style={{
              width: '100%',
              padding: '14px',
              background: activeCombinations.size > 0 ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: activeCombinations.size > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '15px'
            }}
          >
            ✓ Confirm {activeCombinations.size} Variation{activeCombinations.size !== 1 ? 's' : ''}
          </button>
        </>
      )}

      {/* Show confirmed variations */}
      {variations.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: '#e8f5e9', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#28a745' }}>
            ✓ {variations.length} variation{variations.length !== 1 ? 's' : ''} configured
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

