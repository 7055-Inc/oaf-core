import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import { authApiRequest } from '../lib/apiUtils';
import styles from './VariationManager.module.css';

const VariationManager = ({ 
  onNext, 
  onBack, 
  onVariationsChange, 
  onStepChange,
  productId // Add productId prop
}) => {
  const [userVariationTypes, setUserVariationTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [activeCombinations, setActiveCombinations] = useState(new Set());
  const [step, setStep] = useState(1); // Start at step 1
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // Load user's variation types on component mount
  useEffect(() => {
    fetchUserVariationTypes();
  }, []);

  const fetchUserVariationTypes = async () => {
    try {
      const response = await authenticatedApiRequest(
        'products/variations/types',
        { method: 'GET' }
      );
      
      if (response.ok) {
        const types = await response.json();
        setUserVariationTypes(types);
      } else {
        setError('Failed to load variation types');
      }
    } catch (error) {
      setError('Error loading variation types');
    }
  };

  // Load variation values for a specific type
  const loadVariationValues = async (typeId) => {
    try {
      const url = productId 
        ? `products/variations/types/${typeId}/values?product_id=${productId}`
        : `products/variations/types/${typeId}/values`;
        
      const response = await authenticatedApiRequest(url, { method: 'GET' });
      
      if (response.ok) {
        const values = await response.json();
        return values;
      } else {
        console.error('Failed to load variation values');
        return [];
      }
    } catch (error) {
      console.error('Error loading variation values:', error);
      return [];
    }
  };

  // Create new variation type
  const handleCreateVariationType = async () => {
    if (!newTypeName.trim()) return;
    
    setLoading(true);
    try {
      const response = await authenticatedApiRequest(
        `products/variations/types`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variation_name: newTypeName.trim() })
        }
      );

      if (response.ok) {
        const newType = await response.json();
        setUserVariationTypes(prev => [...prev, newType]);
        setNewTypeName('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create variation type');
      }
    } catch (error) {
      setError('Error creating variation type');
    } finally {
      setLoading(false);
    }
  };

  // Add variation value to a type
  const handleAddVariationValue = async (typeId, valueName) => {
    if (!valueName.trim()) return;

    if (!productId) {
      setError('Product ID is required to add variation values');
      return;
    }

    try {
      const response = await authenticatedApiRequest(
        `products/variations/values`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            variation_type_id: typeId, 
            value_name: valueName.trim(),
            product_id: productId
          })
        }
      );

      if (response.ok) {
        const newValue = await response.json();
        setSelectedTypes(prev => prev.map(type => 
          type.id === typeId 
            ? { ...type, values: [...(type.values || []), newValue] }
            : type
        ));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add variation value');
      }
    } catch (error) {
      setError('Error adding variation value');
    }
  };

  // Delete variation type
  const handleDeleteVariationType = async (typeId, event) => {
    event.stopPropagation(); // Prevent triggering the selection

    if (!confirm('Are you sure you want to delete this variation type? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedApiRequest(
        `products/variations/types/${typeId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        // Remove from userVariationTypes
        setUserVariationTypes(prev => prev.filter(type => type.id !== typeId));
        // Remove from selectedTypes if it was selected
        setSelectedTypes(prev => prev.filter(type => type.id !== typeId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete variation type');
      }
    } catch (error) {
      setError('Error deleting variation type');
    } finally {
      setLoading(false);
    }
  };

  // Select variation type for the current product
  const handleTypeSelection = async (type) => {
    const isSelected = selectedTypes.some(t => t.id === type.id);
    
    if (isSelected) {
      setSelectedTypes(prev => prev.filter(t => t.id !== type.id));
    } else {
      // Load values for this type and product
      const values = await loadVariationValues(type.id);
      const typeWithValues = { ...type, values: values || [] };
      setSelectedTypes(prev => [...prev, typeWithValues]);
    }
  };

  // Generate all possible combinations
  const generateCombinations = () => {
    if (selectedTypes.length === 0) return [];

    const validTypes = selectedTypes.filter(type => type.values && type.values.length > 0);
    if (validTypes.length === 0) return [];

    // Generate cartesian product of all variation values
    const combinations = validTypes.reduce((acc, type) => {
      if (acc.length === 0) {
        return type.values.map(value => [{ typeId: type.id, typeName: type.variation_name, valueId: value.id, valueName: value.value_name }]);
      }
      
      const newCombinations = [];
      acc.forEach(combination => {
        type.values.forEach(value => {
          newCombinations.push([
            ...combination, 
            { typeId: type.id, typeName: type.variation_name, valueId: value.id, valueName: value.value_name }
          ]);
        });
      });
      return newCombinations;
    }, []);

    // Limit to 100 combinations
    return combinations.slice(0, 100);
  };

  // Move to combination generation step
  const handleGenerateCombinations = () => {
    const generated = generateCombinations();
    setCombinations(generated);
    setStep(2);
    if (onStepChange) onStepChange(3); // Notify parent we're on Step 3
  };

  // Toggle combination activation
  const toggleCombination = (index) => {
    const newActive = new Set(activeCombinations);
    if (newActive.has(index)) {
      newActive.delete(index);
    } else {
      newActive.add(index);
    }
    setActiveCombinations(newActive);
  };

  // Bulk operations
  const handleBulkOperation = (operation) => {
    if (operation === 'enableAll') {
      setActiveCombinations(new Set(combinations.map((_, index) => index)));
    } else if (operation === 'disableAll') {
      setActiveCombinations(new Set());
    }
  };

  // Continue to next step
  const handleContinue = () => {
    const activeVariations = combinations
      .filter((_, index) => activeCombinations.has(index))
      .map((combination, index) => ({
        id: `temp-${index}`,
        combination
      }));

    if (onVariationsChange) {
      onVariationsChange(activeVariations);
    }
    if (onNext) {
      onNext(activeVariations);
    }
  };

  if (step === 1) {
    return (
      <div className={styles.variationManager}>

        {error && <div className={styles.error}>{error}</div>}

        {/* Create New Variation Type */}
        <div className={styles.createTypeSection}>
          <div className={styles.createTypeForm}>
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g., Color, Size, Style, Material..."
              className={styles.input}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateVariationType()}
            />
            <button 
              onClick={handleCreateVariationType}
              disabled={!newTypeName.trim() || loading}
            >
              {loading ? 'Creating...' : 'Create Type'}
            </button>
          </div>
        </div>

        {/* Select Existing Types */}
        <div className={styles.existingTypesSection}>
          <div className={styles.typesList}>
            {userVariationTypes.map(type => {
              const isSelected = selectedTypes.some(t => t.id === type.id);
              const usageCount = parseInt(type.usage_count) || 0;
              const isUnused = usageCount === 0;
              
              return (
                <div 
                  key={type.id}
                  className={`${styles.typeCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleTypeSelection(type)}
                >
                  <div className={styles.typeCardContent}>
                  <span className={styles.typeName}>{type.variation_name}</span>
                    <div className={styles.typeMetadata}>
                      {usageCount > 0 ? (
                        <span className={styles.usageTag}>
                          Used in {usageCount} product{usageCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className={styles.unusedTag}>Unused</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.typeActions}>
                  {isSelected && (
                    <div className={styles.selectedIndicator}>✓</div>
                  )}
                    {isUnused && (
                      <button
                        className="secondary"
                        onClick={(e) => handleDeleteVariationType(type.id, e)}
                        title="Delete unused variation type"
                        style={{ padding: '5px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Types with Values */}
        {selectedTypes.length > 0 && (
          <div className={styles.selectedTypesSection}>
            {selectedTypes.map(type => (
              <VariationTypeEditor
                key={type.id}
                type={type}
                onAddValue={(valueName) => handleAddVariationValue(type.id, valueName)}
              />
            ))}
          </div>
        )}

        {/* Continue Button */}
        <div className={styles.stepActions}>
          <button 
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.history.back();
              }
            }}
            className="secondary"
          >
            ← Back to Product Form
          </button>
          <button 
            onClick={handleGenerateCombinations}
            disabled={selectedTypes.length === 0 || selectedTypes.some(t => !t.values || t.values.length === 0)}
          >
            Generate Combinations →
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const totalCombinations = combinations.length;
    const selectedCount = activeCombinations.size;

    return (
      <div className={styles.variationManager}>
        <div className={styles.statsBar}>
          <span>Generated {totalCombinations} combinations</span>
          <span>•</span>
          <span>{selectedCount} selected</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Bulk Actions */}
        <div className={styles.bulkActions}>
          <button 
            onClick={() => handleBulkOperation('enableAll')}
            className="secondary"
          >
            Select All
          </button>
          <button 
            onClick={() => handleBulkOperation('disableAll')}
            className="secondary"
          >
            Deselect All
          </button>
          <button 
            onClick={() => {
              setStep(1);
              if (onStepChange) onStepChange(2); // Notify parent we're back on Step 2
            }}
            className="secondary"
          >
            ← Back to Setup
          </button>
        </div>

        {/* Combinations Grid */}
        <div className={styles.combinationsGrid}>
          {combinations.map((combination, index) => (
            <div 
              key={index}
              className={`${styles.combinationCard} ${activeCombinations.has(index) ? styles.active : ''}`}
              onClick={() => toggleCombination(index)}
            >
              <div className={styles.combinationName}>
                {combination.map(variant => variant.valueName).join(' × ')}
              </div>
              <div className={styles.combinationDetails}>
                {combination.map(variant => (
                  <span key={`${variant.typeId}-${variant.valueId}`} className={styles.variantTag}>
                    {variant.typeName}: {variant.valueName}
                  </span>
                ))}
              </div>
              <div className={styles.activateButton}>
                {activeCombinations.has(index) ? '✓ Selected' : 'Click to Select'}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className={styles.stepActions}>
          <button 
            onClick={handleContinue}
            disabled={selectedCount === 0}
          >
            Continue with {selectedCount} Variations →
          </button>
        </div>
      </div>
    );
  }

  // Default return (should not happen)
  return (
    <div className={styles.variationManager}>
      <div className={styles.error}>
        Component error: Invalid step {step}
      </div>
    </div>
  );
};

// Component for editing individual variation types
const VariationTypeEditor = ({ type, onAddValue }) => {
  const [newValue, setNewValue] = useState('');

  const handleAddValue = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue('');
    }
  };

  return (
    <div className={styles.typeEditor}>
      <h4 className={styles.typeEditorTitle}>{type.variation_name}</h4>
      
      <div className={styles.addValueForm}>
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`Add ${type.variation_name.toLowerCase()} (e.g., Red, Blue, Large...)`}
          className={styles.input}
          onKeyPress={(e) => e.key === 'Enter' && handleAddValue()}
        />
        <button 
          onClick={handleAddValue}
          disabled={!newValue.trim()}
        >
          Add
        </button>
      </div>

      <div className={styles.valuesList}>
        {type.values && type.values.map(value => (
          <span key={value.id} className={styles.valueTag}>
            {value.value_name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VariationManager; 