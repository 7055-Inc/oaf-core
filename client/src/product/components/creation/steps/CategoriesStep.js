import React, { useContext, useState, useEffect, useRef } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import productService from '../../../../services/productService';
import './Steps.css';

/**
 * Categories step of the product creation wizard
 * Allows selection of primary category and up to 3 additional categories
 */
const CategoriesStep = () => {
  const { productData, updateField, draftId } = useContext(ProductCreationContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState({
    primary: '',
    additional: ['', '', '']
  });
  const isInitialMount = useRef(true);

  const primaryCategoryId = productData?.primary_category_id;
  const additionalCategoryIds = productData?.additional_category_ids || [];

  // Initialize selected values from productData
  useEffect(() => {
    if (isInitialMount.current) {
      setSelectedValues({
        primary: primaryCategoryId || '',
        additional: [
          additionalCategoryIds[0] || '',
          additionalCategoryIds[1] || '',
          additionalCategoryIds[2] || ''
        ]
      });
      isInitialMount.current = false;
    }
  }, [primaryCategoryId, additionalCategoryIds]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('Fetching categories from productService...');
        const fetchedCategories = await productService.getCategories();
        console.log('Categories received:', fetchedCategories);
        
        if (!Array.isArray(fetchedCategories)) {
          console.error('Categories response is not an array:', fetchedCategories);
          setError('Invalid categories data format. Please try again.');
          setCategories([]);
        } else if (fetchedCategories.length === 0) {
          console.warn('Empty categories array received');
          setError('No categories available. Please contact support.');
          setCategories([]);
        } else {
          setCategories(fetchedCategories);
          setError(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');
        setCategories([]);
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  const handlePrimaryCategoryChange = (event) => {
    const value = event.target.value;
    console.log('Setting primary category:', value);
    updateField('primary_category_id', value);
    setSelectedValues(prev => ({
      ...prev,
      primary: value
    }));
  };

  const handleAdditionalCategoryChange = (index, value) => {
    console.log(`Setting additional category at index ${index}:`, value);
    const newAdditionalCategories = [...additionalCategoryIds];
    newAdditionalCategories[index] = value;
    
    // Update the selected values state
    const newAdditional = [...selectedValues.additional];
    newAdditional[index] = value;
    setSelectedValues(prev => ({
      ...prev,
      additional: newAdditional
    }));
    
    // Filter out empty values when updating
    updateField('additional_category_ids', newAdditionalCategories.filter(Boolean));
  };

  const filterCategories = (categories, term) => {
    if (!term) return categories;
    if (!Array.isArray(categories)) return [];
    
    return categories.filter(category => {
      const matchesParent = category.name?.toLowerCase().includes(term.toLowerCase());
      const hasMatchingChildren = category.children?.some(child => 
        child.name?.toLowerCase().includes(term.toLowerCase())
      );
      return matchesParent || hasMatchingChildren;
    });
  };

  // Modified to ensure all categories (parent and children) are visible
  const createCategoryOptions = (categories) => {
    if (!Array.isArray(categories)) {
      console.warn('createCategoryOptions received non-array:', categories);
      return [];
    }
    
    const allOptions = [];
    
    // Process each parent category
    categories.forEach(parent => {
      if (!parent?.id || !parent?.name) {
        console.warn('Invalid parent category item:', parent);
        return;
      }
      
      // Add parent category
      allOptions.push(
        <option key={parent.id} value={parent.id} className="parent-category">
          {parent.name}
        </option>
      );

      // Add child categories if they exist
      if (parent.children && Array.isArray(parent.children)) {
        // Log the children to help debug
        console.log(`Children for ${parent.name}:`, parent.children);
        
        if (parent.children.length > 0) {
          parent.children.forEach(child => {
            if (!child?.id || !child?.name) {
              console.warn('Invalid child category:', child);
              return;
            }
            
            allOptions.push(
              <option key={child.id} value={child.id} className="child-category">
                &nbsp;&nbsp;└─ {child.name}
              </option>
            );
          });
        }
      }
    });
    
    return allOptions;
  };

  if (loading) {
    return <div className="loading-indicator">Loading categories...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
        <button 
          className="retry-button" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredCategories = filterCategories(categories, searchTerm);
  
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
      
      <div className="category-search" style={{ marginTop: '20px' }}>
            <input
              type="text"
              placeholder="Search categories..."
          className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
            <div className="categories-card-grid">
              {/* Primary Category Card */}
              <div className="category-card primary-category">
                <div className="card-header">
                  <h4>Primary Category <span className="required-badge">Required</span></h4>
                </div>
                <div className="card-body">
                  <select 
              value={selectedValues.primary}
                    onChange={handlePrimaryCategoryChange}
              className="category-select"
                  >
                    <option value="">Select a category</option>
              {createCategoryOptions(filteredCategories)}
                  </select>
            {!primaryCategoryId && (
              <div className="card-validation-message">Primary category is required</div>
                  )}
                </div>
              </div>
              
        {/* Additional Categories Cards */}
              {[0, 1, 2].map((index) => (
          <div key={index} className="category-card">
                  <div className="card-header">
                    <h4>Additional Category {index + 1} <span className="optional-badge">Optional</span></h4>
                  </div>
                  <div className="card-body">
                    <select
                value={selectedValues.additional[index]}
                      onChange={(e) => handleAdditionalCategoryChange(index, e.target.value)}
                className="category-select"
                    >
                <option value="">Select a category</option>
                {createCategoryOptions(filteredCategories)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

      {filteredCategories.length === 0 && searchTerm && (
        <div className="no-results">No categories found matching your search.</div>
      )}
    </div>
  );
};

export default CategoriesStep; 