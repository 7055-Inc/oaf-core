import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './VariationManager.module.css';

const VariationManager = ({ 
  parentProduct, 
  onVariationsUpdate, 
  onContinue 
}) => {
  const [step, setStep] = useState(1); // 1: Setup Types, 2: Generate Combinations
  const [userVariationTypes, setUserVariationTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [combinations, setCombinations] = useState([]);
  const [activeCombinations, setActiveCombinations] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user's existing variation types
  useEffect(() => {
    loadUserVariationTypes();
  }, []);

  const loadUserVariationTypes = async () => {
    try {
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/variations/types`,
        { method: 'GET' }
      );
      
      if (response.ok) {
        const types = await response.json();
        setUserVariationTypes(Array.isArray(types) ? types : []);
      } else {
        console.error('Failed to load variation types');
        setUserVariationTypes([]);
      }
    } catch (error) {
      console.error('Error loading variation types:', error);
      setUserVariationTypes([]);
    }
  };

  // Create new variation type
  const handleCreateVariationType = async () => {
    if (!newTypeName.trim()) return;
    
    setLoading(true);
    try {
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/variations/types`,
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

    try {
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/variations/values`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            variation_type_id: typeId, 
            value_name: valueName.trim() 
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

  // Select/deselect variation type
  const handleTypeSelection = async (type) => {
    const isSelected = selectedTypes.find(t => t.id === type.id);
    
    if (isSelected) {
      setSelectedTypes(prev => prev.filter(t => t.id !== type.id));
    } else {
      // Load values for this type
      try {
        const response = await authenticatedApiRequest(
          `https://api2.onlineartfestival.com/variations/types/${type.id}/values`,
          { method: 'GET' }
        );
        
        if (response.ok) {
          const values = await response.json();
          setSelectedTypes(prev => [...prev, { ...type, values: Array.isArray(values) ? values : [] }]);
        }
      } catch (error) {
        setError('Error loading variation values');
      }
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
        combination,
        parentData: { ...parentProduct }
      }));

    onVariationsUpdate(activeVariations);
    onContinue();
  };

  if (step === 1) {
    return (
      <div className={styles.variationManager}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Step 1: Setup Variations</h2>
          <p className={styles.stepDescription}>
            Choose the types of variations your product will have (color, size, style, etc.)
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Create New Variation Type */}
        <div className={styles.createTypeSection}>
          <h3 className={styles.sectionTitle}>Create New Variation Type</h3>
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
              className={styles.createButton}
            >
              {loading ? 'Creating...' : 'Create Type'}
            </button>
          </div>
        </div>

        {/* Select Existing Types */}
        <div className={styles.existingTypesSection}>
          <h3 className={styles.sectionTitle}>Your Variation Types</h3>
          <div className={styles.typesList}>
            {userVariationTypes.map(type => {
              const isSelected = selectedTypes.find(t => t.id === type.id);
              return (
                <div 
                  key={type.id}
                  className={`${styles.typeCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleTypeSelection(type)}
                >
                  <span className={styles.typeName}>{type.variation_name}</span>
                  {isSelected && (
                    <div className={styles.selectedIndicator}>✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Types with Values */}
        {selectedTypes.length > 0 && (
          <div className={styles.selectedTypesSection}>
            <h3 className={styles.sectionTitle}>Add Values for Selected Types</h3>
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
            onClick={handleGenerateCombinations}
            disabled={selectedTypes.length === 0 || selectedTypes.some(t => !t.values || t.values.length === 0)}
            className={styles.continueButton}
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
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Step 2: Select Variations</h2>
          <p className={styles.stepDescription}>
            Choose which variations you want to create. Each will become a separate product.
          </p>
          <div className={styles.statsBar}>
            <span>Generated {totalCombinations} combinations</span>
            <span>•</span>
            <span>{selectedCount} selected</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Bulk Actions */}
        <div className={styles.bulkActions}>
          <button 
            onClick={() => handleBulkOperation('enableAll')}
            className={styles.bulkButton}
          >
            Select All
          </button>
          <button 
            onClick={() => handleBulkOperation('disableAll')}
            className={styles.bulkButton}
          >
            Deselect All
          </button>
          <button 
            onClick={() => setStep(1)}
            className={styles.backButton}
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
            className={styles.continueButton}
          >
            Continue with {selectedCount} Variations →
          </button>
        </div>
      </div>
    );
  }
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
          className={styles.addButton}
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