import React, { createContext, useState, useCallback, useMemo } from 'react';

// Default product state
const defaultProductState = {
  productType: 'simple',
  name: '',
  sku: '',
  barcode: '',
  description: '',
  shortDescription: '',
  primary_category_id: '',
  additional_category_ids: [],
  price: '',
  compareAtPrice: '',
  taxable: true,
  track_inventory: true,
  stock: '10',
  low_stock_threshold: '5',
  allow_backorders: false,
  requiresShipping: true,
  shippingMethod: 'calculated', // Shipping method: free, flat_rate, or calculated
  flatRate: '0', // Flat rate amount for flat_rate shipping method
  weight: '0',
  length: '0',
  width: '0',
  height: '0',
  dimensionUnit: 'cm',
  weightUnit: 'kg',
  shippingPackages: [],
  shippingServices: [],
  images: [],
  status: 'draft',
  features: [], // Store as array to serialize to JSON properly
  careInstructions: [], // Store as array to serialize to JSON properly
  variant_kinds: [],
  variants: []
};

// Define the wizard steps
const wizardSteps = [
  { title: 'Product Type', requiredFields: ['productType'] },
  { title: 'Basic Info', requiredFields: ['name', 'sku'] },
  { title: 'Description', requiredFields: ['description'] },
  { title: 'Categories', requiredFields: ['primary_category_id'] },
  { title: 'Pricing', requiredFields: ['price'] },
  { title: 'Inventory', requiredFields: ['stock'] },
  { title: 'Shipping', requiredFields: ['requiresShipping'] },
  { title: 'Media', requiredFields: [] },
  { title: 'Variants', requiredFields: [] },
  { title: 'Review & Publish', requiredFields: [] }
];

export const ProductCreationContext = createContext();

export const ProductCreationProvider = ({ children }) => {
  // State for the product data form
  const [productData, setProductData] = useState({ ...defaultProductState });
  
  // State for wizard navigation
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Clear error message
  const clearErrorMessage = useCallback(() => {
    setErrorMessage('');
  }, []);
  
  // Update a specific field in the product data
  const updateField = useCallback((field, value) => {
    // Convert empty strings to '0' for numeric fields
    if (value === '' && ['weight', 'length', 'width', 'height', 'price', 'compareAtPrice', 'stock', 'low_stock_threshold'].includes(field)) {
      value = '0';
    }
    
    setProductData(prevData => {
      // Handle nested fields with dot notation (e.g., 'dimensions.length')
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prevData,
          [parent]: {
            ...prevData[parent],
            [child]: value
          }
        };
      }
      
      // Handle normal fields
      return {
        ...prevData,
        [field]: value
      };
    });
    
    setHasChanges(true);
  }, []);
  
  // Replace the entire product data object
  const updateProductData = useCallback((newData) => {
    // Convert empty strings to '0' for numeric fields in the new data
    const numericFields = ['weight', 'length', 'width', 'height', 'price', 'compareAtPrice', 'stock', 'low_stock_threshold'];
    const sanitizedData = { ...newData };
    
    numericFields.forEach(field => {
      if (sanitizedData[field] === '') {
        sanitizedData[field] = '0';
      }
    });
    
    setProductData(prevData => ({
      ...prevData,
      ...sanitizedData
    }));
    
    setHasChanges(false);
  }, []);
  
  // Get only the steps relevant to the current product type
  const steps = useMemo(() => {
    return wizardSteps.filter(step => 
      !step.condition || step.condition(productData)
    );
  }, [productData]);
  
  // Validate the current step
  const validateCurrentStep = useCallback(() => {
    const stepConfig = steps[currentStep];
    if (!stepConfig) return true;
    
    const requiredFields = stepConfig.requiredFields || [];
    
    // Check each required field
    for (const field of requiredFields) {
      // Skip stock validation if inventory tracking is disabled
      if (field === 'stock' && !productData.track_inventory) {
        continue;
      }
      
      // Handle nested fields with dot notation
      let value;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        value = productData[parent]?.[child];
      } else {
        value = productData[field];
      }
      
      // Check if value is missing
      if (value === undefined || value === null || value === '') {
        setErrorMessage(`Please complete all required fields before proceeding.`);
        return false;
      }
      
      // SKU-specific validation
      if (field === 'sku') {
        // SKU format validation
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
          setErrorMessage('SKU can only contain letters, numbers, hyphens, and underscores.');
          return false;
        }
        
        // SKU length validation
        if (value.length < 2) {
          setErrorMessage('SKU must be at least 2 characters.');
          return false;
        }
        
        if (value.length > 50) {
          setErrorMessage('SKU must be less than 50 characters.');
          return false;
        }
      }
      
      // For array fields, check if they're empty
      if (Array.isArray(value) && value.length === 0 && requiredFields.includes(field)) {
        setErrorMessage(`Please add at least one ${field} before proceeding.`);
        return false;
      }
    }
    
    // If no custom validator or custom validator passes
    return true;
  }, [currentStep, productData, steps, setErrorMessage]);
  
  // Navigate to the next step
  const nextStep = useCallback(() => {
    // Always advance by exactly 1 step
    if (currentStep < steps.length - 1) {
      // Update completed steps
      setProductData(prevData => {
        console.log(`[ProductContext] Moving from step ${currentStep} to step ${currentStep + 1}`);
        console.log('[ProductContext] Current data:', prevData);
        
        // Debug helper for categories - console log and add to React DevTools
        if (currentStep === 3 || currentStep === 9) {
          console.log('[ProductContext] CATEGORIES DEBUG INFO:');
          console.log('  primary_category_id:', prevData.primary_category_id);
          console.log('  category_id:', prevData.category_id);
          console.log('  additional_category_ids:', prevData.additional_category_ids);
          console.log('  primaryCategory:', prevData.primaryCategory);
          
          // Create a copy for debugging
          window._categoryDebugInfo = {
            primary_category_id: prevData.primary_category_id,
            category_id: prevData.category_id,
            additional_category_ids: prevData.additional_category_ids,
            primaryCategory: prevData.primaryCategory
          };
        }
        
        // Ensure categories are properly set
        if (currentStep === 3 && !prevData.category_id && prevData.primary_category_id) {
          console.log('[ProductContext] Copying primary_category_id to category_id');
          return {
            ...prevData,
            category_id: prevData.primary_category_id,
            completedSteps: [...(prevData.completedSteps || []), currentStep]
          };
        }
        
        return {
          ...prevData,
          completedSteps: [...(prevData.completedSteps || []), currentStep]
        };
      });
      
      // Clear any error messages when moving to next step
      setErrorMessage('');
      
      // Move to next step - always increment by 1
      const nextStepIndex = currentStep + 1;
      console.log(`[ProductContext] Setting current step to ${nextStepIndex}`);
      setCurrentStep(nextStepIndex);
      return true;
    }
    return false;
  }, [currentStep, steps.length, setErrorMessage]);
  
  // Navigate to the previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prevStep => prevStep - 1);
      return true;
    }
    return false;
  }, [currentStep]);
  
  // Add a new shipping package
  const addShippingPackage = useCallback((packageData) => {
    setProductData(prevData => ({
      ...prevData,
      shippingPackages: [...(prevData.shippingPackages || []), packageData]
    }));
    
    setHasChanges(true);
  }, []);
  
  // Remove a shipping package
  const removeShippingPackage = useCallback((index) => {
    setProductData(prevData => ({
      ...prevData,
      shippingPackages: prevData.shippingPackages.filter((_, i) => i !== index)
    }));
    
    setHasChanges(true);
  }, []);
  
  // Add a variant kind (like size, color, etc.)
  const addVariantKind = useCallback((kind) => {
    setProductData(prevData => ({
      ...prevData,
      variantOptions: [...(prevData.variantOptions || []), kind]
    }));
    
    setHasChanges(true);
  }, []);
  
  // Remove a variant kind
  const removeVariantKind = useCallback((index) => {
    setProductData(prevData => ({
      ...prevData,
      variantOptions: prevData.variantOptions.filter((_, i) => i !== index)
    }));
    
    setHasChanges(true);
  }, []);
  
  // Reset form to default state
  const resetForm = useCallback(() => {
    setProductData({ ...defaultProductState });
    setCurrentStep(0);
    setDraftId(null);
    setHasChanges(false);
    clearErrorMessage();
  }, [clearErrorMessage]);
  
  // Add this function to prepare product data for API submission
  const prepareProductDataForSubmission = useCallback((data) => {
    const preparedData = { ...data };
    
    // Convert arrays to JSON strings for database storage
    const arrayFields = ['features', 'careInstructions', 'shippingPackages', 'shippingServices', 
                        'additional_category_ids', 'variant_kinds', 'variants'];
    
    arrayFields.forEach(field => {
      if (Array.isArray(preparedData[field])) {
        // Only serialize non-empty arrays
        if (preparedData[field].length > 0) {
          preparedData[field] = JSON.stringify(preparedData[field]);
        } else {
          // For empty arrays, use an empty array string
          preparedData[field] = '[]';
        }
      }
    });
    
    // Handle empty strings for numeric fields
    const numericFields = ['price', 'compareAtPrice', 'stock', 'low_stock_threshold',
                          'weight', 'length', 'width', 'height', 'flatRate'];
    
    numericFields.forEach(field => {
      if (preparedData[field] === '') {
        preparedData[field] = '0';
      }
    });
    
    return preparedData;
  }, []);
  
  // Context value to provide
  const contextValue = {
    productData,
    currentStep,
    steps,
    draftId,
    isLoading,
    hasChanges,
    errorMessage,
    setProductData,
    updateField,
    updateProductData,
    validateCurrentStep,
    nextStep,
    prevStep,
    setCurrentStep,
    setDraftId,
    setIsLoading,
    setErrorMessage,
    clearErrorMessage,
    setHasChanges,
    addShippingPackage,
    removeShippingPackage,
    addVariantKind,
    removeVariantKind,
    resetForm,
    prepareProductDataForSubmission
  };
  
  return (
    <ProductCreationContext.Provider value={contextValue}>
      {children}
    </ProductCreationContext.Provider>
  );
};

export default ProductCreationProvider; 