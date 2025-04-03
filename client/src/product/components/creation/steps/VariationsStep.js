import React, { useState, useContext, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import './Steps.css';

const VariationsStep = () => {
  const { 
    productData, 
    updateField, 
    addVariantKind, 
    removeVariantKind, 
    updateVariantKind,
    generateVariants,
    draftId
  } = useContext(ProductCreationContext);
  
  const [errors, setErrors] = useState({});
  const [newVariantKind, setNewVariantKind] = useState({
    name: '',
    options: []
  });
  const [newOption, setNewOption] = useState('');
  const [showAddVariantKind, setShowAddVariantKind] = useState(false);
  const [previewVariants, setPreviewVariants] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [convertingToVariable, setConvertingToVariable] = useState(false);

  // Generate preview variants when variant kinds change
  useEffect(() => {
    if (productData.variant_kinds && productData.variant_kinds.length > 0) {
      const variants = generateVariantCombinations(productData.variant_kinds);
      setPreviewVariants(variants);
    } else {
      setPreviewVariants([]);
    }
  }, [productData.variant_kinds]);

  // Helper function to generate all possible variant combinations
  const generateVariantCombinations = (variantKinds) => {
    if (!variantKinds || variantKinds.length === 0) return [];
    
    const generateCombinations = (kinds, currentIndex = 0, currentCombination = {}) => {
      if (currentIndex === kinds.length) {
        return [currentCombination];
      }
      
      const currentKind = kinds[currentIndex];
      const results = [];
      
      for (const option of currentKind.options) {
        const newCombination = { 
          ...currentCombination,
          [currentKind.name]: option 
        };
        
        results.push(...generateCombinations(kinds, currentIndex + 1, newCombination));
      }
      
      return results;
    };
    
    return generateCombinations(variantKinds);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateField(name, value);
  };

  const handleVariantKindInputChange = (e) => {
    const { name, value } = e.target;
    setNewVariantKind(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOptionInputChange = (e) => {
    setNewOption(e.target.value);
  };

  const handleAddOption = () => {
    if (newOption.trim() === '') return;
    
    if (newVariantKind.options.includes(newOption.trim())) {
      setErrors(prev => ({
        ...prev,
        option: 'This option already exists'
      }));
      return;
    }
    
    setNewVariantKind(prev => ({
      ...prev,
      options: [...prev.options, newOption.trim()]
    }));
    
    setNewOption('');
    setErrors(prev => ({
      ...prev,
      option: ''
    }));
  };

  const handleRemoveOption = (index) => {
    setNewVariantKind(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const validateVariantKind = () => {
    const errors = {};
    
    if (!newVariantKind.name.trim()) {
      errors.name = 'Variant kind name is required';
    }
    
    if (newVariantKind.options.length < 2) {
      errors.options = 'At least 2 options are required';
    }
    
    // Check if variant kind with same name already exists
    if (productData.variant_kinds?.some(kind => 
      kind.name.toLowerCase() === newVariantKind.name.toLowerCase()
    )) {
      errors.name = 'A variant kind with this name already exists';
    }
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVariantKind = () => {
    if (validateVariantKind()) {
      addVariantKind({
        name: newVariantKind.name,
        options: [...newVariantKind.options]
      });
      
      // Reset form
      setNewVariantKind({
        name: '',
        options: []
      });
      
      setShowAddVariantKind(false);
    }
  };

  const handleRemoveVariantKind = (index) => {
    removeVariantKind(index);
  };

  const handleExistingVariantKindChange = (index, field, value) => {
    updateVariantKind(index, field, value);
  };

  const handleExistingOptionChange = (kindIndex, optionIndex, value) => {
    const updatedKind = { ...productData.variant_kinds[kindIndex] };
    const options = [...updatedKind.options];
    options[optionIndex] = value;
    updateVariantKind(kindIndex, 'options', options);
  };

  const handleRemoveExistingOption = (kindIndex, optionIndex) => {
    const updatedKind = { ...productData.variant_kinds[kindIndex] };
    const options = updatedKind.options.filter((_, i) => i !== optionIndex);
    updateVariantKind(kindIndex, 'options', options);
  };

  const handleAddExistingOption = (kindIndex, option) => {
    if (!option.trim()) return;
    
    const updatedKind = { ...productData.variant_kinds[kindIndex] };
    if (updatedKind.options.includes(option.trim())) return;
    
    const options = [...updatedKind.options, option.trim()];
    updateVariantKind(kindIndex, 'options', options);
  };

  const handleGenerateVariants = () => {
    generateVariants();
  };

  const handleConvertToVariable = () => {
    setConvertingToVariable(true);
    updateField('productType', 'variable');
  };

  // Show a message if product is not a variable product
  if (productData.productType !== 'variable' && !convertingToVariable) {
    return (
      <div className="wizard-step">
        {draftId && (
          <div className="product-id-display" style={{ 
            fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
            fontSize: '14px',
            padding: '4px',
            fontWeight: 'normal',
            textAlign: 'right'
          }}>
            Product ID: {draftId}
          </div>
        )}
        
        <div className="simple-product-message">
          <p>This step is only for products with multiple variations.</p>
          <p>You selected a simple product without variations.</p>
          <div className="convert-actions">
            <p>Do you need to create variations for this product?</p>
            <button 
              type="button" 
              className="btn-primary"
              onClick={handleConvertToVariable}
            >
              Convert to Variable Product
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original implementation for variable products
  return (
    <div className="wizard-step">
      {draftId && (
        <div className="product-id-display" style={{ 
          fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
          fontSize: '14px',
          padding: '4px',
          fontWeight: 'normal',
          textAlign: 'right'
        }}>
          Product ID: {draftId}
        </div>
      )}
      
      <div className="variations-intro">
        {/* Added variation kinds section */}
      </div>
      
      {/* Existing variant kinds */}
      {productData.variant_kinds && productData.variant_kinds.length > 0 ? (
        <div className="variant-kinds-list">
          {productData.variant_kinds.map((kind, kindIndex) => (
            <div key={kindIndex} className="variant-kind-item">
              <div className="kind-header">
                <div className="kind-name-container">
                  <input
                    type="text"
                    className="kind-name-input"
                    value={kind.name}
                    onChange={(e) => handleExistingVariantKindChange(kindIndex, 'name', e.target.value)}
                    placeholder="Variant Kind Name (e.g. Size, Color)"
                  />
                </div>
                <button
                  type="button"
                  className="btn-remove-kind"
                  onClick={() => handleRemoveVariantKind(kindIndex)}
                >
                  ×
                </button>
              </div>
              
              <div className="kind-options">
                <div className="options-header">
                  <h4>Options</h4>
                </div>
                
                <div className="options-list">
                  {kind.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="option-item">
                      <input
                        type="text"
                        className="option-input"
                        value={option}
                        onChange={(e) => handleExistingOptionChange(kindIndex, optionIndex, e.target.value)}
                        placeholder="Option Value"
                      />
                      <button
                        type="button"
                        className="btn-remove-option"
                        onClick={() => handleRemoveExistingOption(kindIndex, optionIndex)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="add-option-form">
                  <div className="option-input-container">
                    <input
                      type="text"
                      className="option-input"
                      placeholder="Add new option"
                      value={newOption}
                      onChange={handleOptionInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddExistingOption(kindIndex, newOption);
                          setNewOption('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-option"
                      onClick={() => {
                        handleAddExistingOption(kindIndex, newOption);
                        setNewOption('');
                      }}
                    >
                      Add Option
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-variants-message">
          <p>No variant kinds defined yet. Add your first variant kind below.</p>
        </div>
      )}
      
      {/* Add new variant kind */}
      {showAddVariantKind ? (
        <div className="add-variant-kind-form">
          <h4>Add New Variant Kind</h4>
          <div className="form-field">
            <label htmlFor="variantKindName">Name <span className="required">*</span></label>
            <input
              type="text"
              id="variantKindName"
              name="name"
              value={newVariantKind.name}
              onChange={handleVariantKindInputChange}
              placeholder="e.g. Size, Color, Material"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
            <p className="field-hint">
              This is the name of the variant type, like "Size" or "Color".
            </p>
          </div>
          
          <div className="form-field">
            <label>Options <span className="required">*</span></label>
            {newVariantKind.options.length > 0 ? (
              <div className="options-preview">
                {newVariantKind.options.map((option, index) => (
                  <div key={index} className="option-tag">
                    {option}
                    <button
                      type="button"
                      className="btn-remove-option-tag"
                      onClick={() => handleRemoveOption(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-options-message">
                <p>No options added yet. Add at least 2 options.</p>
              </div>
            )}
            {errors.options && <div className="field-error">{errors.options}</div>}
            
            <div className="option-input-container">
              <input
                type="text"
                className="option-input"
                placeholder="Add new option (e.g. Small, Red, Cotton)"
                value={newOption}
                onChange={handleOptionInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddOption();
                  }
                }}
              />
              <button
                type="button"
                className="btn-add-option"
                onClick={handleAddOption}
              >
                Add Option
              </button>
            </div>
            {errors.option && <div className="field-error">{errors.option}</div>}
            <p className="field-hint">
              Add at least 2 options like "Small, Medium, Large" for Size or "Red, Blue, Green" for Color.
            </p>
          </div>
          
          <div className="variant-kind-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddVariantKind(false);
                setNewVariantKind({ name: '', options: [] });
                setErrors({});
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddVariantKind}
            >
              Add Variant Kind
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-add-variant-kind"
          onClick={() => setShowAddVariantKind(true)}
        >
          + Add Variant Kind
        </button>
      )}
      
      {/* Variants Preview */}
      {productData.variant_kinds && productData.variant_kinds.length > 0 && (
        <div className="variants-preview-section">
          <div className="preview-header">
            <h3>Variant Preview</h3>
            <button
              type="button"
              className="btn-toggle-preview"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          
          {showPreview && (
            <div className="variants-preview">
              <p className="preview-description">
                This shows all possible combinations of variants that will be created.
              </p>
              
              <div className="variants-table">
                <div className="variants-table-header">
                  {productData.variant_kinds.map((kind, index) => (
                    <div key={index} className="variant-header-cell">
                      {kind.name}
                    </div>
                  ))}
                </div>
                
                <div className="variants-table-body">
                  {previewVariants.map((variant, variantIndex) => (
                    <div key={variantIndex} className="variant-row">
                      {productData.variant_kinds.map((kind, kindIndex) => (
                        <div key={kindIndex} className="variant-cell">
                          {variant[kind.name]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="generate-variants-action">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGenerateVariants}
                  disabled={productData.variant_kinds.length === 0}
                >
                  Generate All Variants
                </button>
                <p className="generate-note">
                  This will create all possible combinations as separate variants.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="variations-note">
        <p>
          <strong>Note:</strong> Each combination of options creates a unique variant that 
          can have its own SKU, price, and inventory. After creating variants, you'll be 
          able to configure each one individually.
        </p>
      </div>
    </div>
  );
};

export default VariationsStep; 