/**
 * VariationManager - product form: create/select variation types, add values, generate combinations.
 * Uses lib/catalog (fetchVariationTypes, createVariationType, fetchVariationValues, createVariationValue, deleteVariationType).
 * Global styles: form-card, form-group, form-input, error-alert, secondary, primary.
 */

import React, { useState, useEffect } from 'react';
import {
  fetchVariationTypes,
  createVariationType,
  fetchVariationValues,
  createVariationValue,
  deleteVariationType
} from '../../../lib/catalog';

const VariationManager = ({
  onNext,
  onBack,
  onVariationsChange,
  onStepChange,
  productId
}) => {
  const [userVariationTypes, setUserVariationTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [activeCombinations, setActiveCombinations] = useState(new Set());
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const types = await fetchVariationTypes();
      setUserVariationTypes(Array.isArray(types) ? types : []);
    } catch (err) {
      setError(err.message || 'Failed to load variation types');
    }
  };

  const loadVariationValues = async (typeId) => {
    try {
      return await fetchVariationValues(typeId, productId || undefined);
    } catch (err) {
      console.error('Error loading variation values', err);
      return [];
    }
  };

  const handleCreateVariationType = async () => {
    if (!newTypeName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const newType = await createVariationType(newTypeName.trim());
      setUserVariationTypes(prev => [...prev, newType]);
      setNewTypeName('');
    } catch (err) {
      setError(err.message || 'Failed to create variation type');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariationValue = async (typeId, valueName) => {
    if (!valueName.trim()) return;
    if (!productId) {
      setError('Product ID is required to add variation values');
      return;
    }
    setError('');
    try {
      const newValue = await createVariationValue(typeId, valueName.trim(), productId);
      setSelectedTypes(prev =>
        prev.map(type =>
          type.id === typeId
            ? { ...type, values: [...(type.values || []), newValue] }
            : type
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to add variation value');
    }
  };

  const handleDeleteVariationType = async (typeId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this variation type? This action cannot be undone.')) return;
    setLoading(true);
    setError('');
    try {
      await deleteVariationType(typeId);
      setUserVariationTypes(prev => prev.filter(t => t.id !== typeId));
      setSelectedTypes(prev => prev.filter(t => t.id !== typeId));
    } catch (err) {
      setError(err.message || 'Failed to delete variation type');
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
      setSelectedTypes(prev => [...prev, { ...type, values: values || [] }]);
    }
  };

  const generateCombinations = () => {
    const validTypes = selectedTypes.filter(t => t.values && t.values.length > 0);
    if (validTypes.length === 0) return [];
    const combos = validTypes.reduce((acc, type) => {
      if (acc.length === 0) {
        return type.values.map(v => [{ typeId: type.id, typeName: type.variation_name, valueId: v.id, valueName: v.value_name }]);
      }
      const next = [];
      acc.forEach(c => {
        type.values.forEach(v => {
          next.push([...c, { typeId: type.id, typeName: type.variation_name, valueId: v.id, valueName: v.value_name }]);
        });
      });
      return next;
    }, []);
    return combos.slice(0, 100);
  };

  const handleGenerateCombinations = () => {
    setCombinations(generateCombinations());
    setStep(2);
    if (onStepChange) onStepChange(3);
  };

  const toggleCombination = (index) => {
    const next = new Set(activeCombinations);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setActiveCombinations(next);
  };

  const handleBulkOperation = (op) => {
    if (op === 'enableAll') setActiveCombinations(new Set(combinations.map((_, i) => i)));
    else if (op === 'disableAll') setActiveCombinations(new Set());
  };

  const handleContinue = () => {
    const activeVariations = combinations
      .filter((_, i) => activeCombinations.has(i))
      .map((combination, index) => ({ id: `temp-${index}`, combination }));
    if (onVariationsChange) onVariationsChange(activeVariations);
    if (onNext) onNext(activeVariations);
  };

  if (step === 1) {
    return (
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        {error && <div className="error-alert">{error}</div>}
        <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="e.g., Color, Size, Style, Material..."
            className="form-input"
            style={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateVariationType()}
          />
          <button type="button" onClick={handleCreateVariationType} disabled={!newTypeName.trim() || loading}>
            {loading ? 'Creating...' : 'Create Type'}
          </button>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {userVariationTypes.map(type => {
              const isSelected = selectedTypes.some(t => t.id === type.id);
              const usageCount = parseInt(type.usage_count) || 0;
              const isUnused = usageCount === 0;
              return (
                <div
                  key={type.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTypeSelection(type)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTypeSelection(type)}
                  style={{
                    padding: '12px 16px',
                    border: `2px solid ${isSelected ? 'var(--primary-color)' : '#e5e7eb'}`,
                    borderRadius: 'var(--border-radius-sm)',
                    background: isSelected ? 'rgba(5, 84, 116, 0.06)' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    minWidth: '160px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{type.variation_name}</span>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {usageCount > 0 ? `Used in ${usageCount} product${usageCount !== 1 ? 's' : ''}` : 'Unused'}
                    </div>
                  </div>
                  {isSelected && <span style={{ color: 'var(--primary-color)' }}>✓</span>}
                  {isUnused && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={(e) => handleDeleteVariationType(type.id, e)}
                      title="Delete unused variation type"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {selectedTypes.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            {selectedTypes.map(type => (
              <VariationTypeEditor
                key={type.id}
                type={type}
                onAddValue={(valueName) => handleAddVariationValue(type.id, valueName)}
              />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" className="secondary" onClick={onBack || (() => window.history.back())}>
            ← Back to Product Form
          </button>
          <button
            type="button"
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
      <div className="form-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--secondary-color)', fontSize: '0.875rem' }}>
          <span>Generated {totalCombinations} combinations</span>
          <span>•</span>
          <span>{selectedCount} selected</span>
        </div>
        {error && <div className="error-alert">{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="secondary" onClick={() => handleBulkOperation('enableAll')}>Select All</button>
          <button type="button" className="secondary" onClick={() => handleBulkOperation('disableAll')}>Deselect All</button>
          <button type="button" className="secondary" onClick={() => { setStep(1); if (onStepChange) onStepChange(2); }}>← Back to Setup</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {combinations.map((combination, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => toggleCombination(index)}
              onKeyDown={(e) => e.key === 'Enter' && toggleCombination(index)}
              style={{
                padding: '12px',
                border: `2px solid ${activeCombinations.has(index) ? 'var(--primary-color)' : '#e5e7eb'}`,
                borderRadius: 'var(--border-radius-sm)',
                background: activeCombinations.has(index) ? 'rgba(5, 84, 116, 0.08)' : 'white',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{combination.map(v => v.valueName).join(' × ')}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {combination.map(v => `${v.typeName}: ${v.valueName}`).join(' · ')}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: activeCombinations.has(index) ? 'var(--primary-color)' : '#999' }}>
                {activeCombinations.has(index) ? '✓ Selected' : 'Click to Select'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={handleContinue} disabled={selectedCount === 0}>
            Continue with {selectedCount} Variations →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div className="error-alert">Component error: Invalid step {step}</div>
    </div>
  );
};

const VariationTypeEditor = ({ type, onAddValue }) => {
  const [newValue, setNewValue] = useState('');
  const handleAdd = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue('');
    }
  };
  return (
    <div className="expansion-section" style={{ marginBottom: '8px' }}>
      <div className="expansion-section-header" style={{ cursor: 'default' }}>
        <span>{type.variation_name}</span>
      </div>
      <div className="expansion-section-content">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`Add ${type.variation_name.toLowerCase()} (e.g., Red, Blue, Large...)`}
            className="form-input"
            style={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" onClick={handleAdd} disabled={!newValue.trim()}>Add</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {type.values?.map(value => (
            <span key={value.id} className="status-badge muted">{value.value_name}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VariationManager;
