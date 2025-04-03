import React, { useState, useContext, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import { productService } from '../../../../services/productService';
import './Steps.css';

const ShippingStep = () => {
  const { 
    productData, 
    updateField, 
    addShippingPackage, 
    removeShippingPackage, 
    draftId 
  } = useContext(ProductCreationContext);
  
  const [errors, setErrors] = useState({});
  const [newPackage, setNewPackage] = useState({
    name: '',
    length: '',
    width: '',
    height: '',
    weight: ''
  });
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [shippingServices, setShippingServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServices, setSelectedServices] = useState(productData.shippingServices || []);
  const [shippingMethod, setShippingMethod] = useState(productData.shippingMethod || 'calculated');
  const [flatRate, setFlatRate] = useState(productData.flatRate || '');

  // Set default shipping method to flat_rate
  useEffect(() => {
    if (!productData.shippingMethod) {
      updateField('shippingMethod', 'flat_rate');
      setShippingMethod('flat_rate');
    }
    
    // Initialize selectedServices from productData
    if (productData.shippingServices && productData.shippingServices.length > 0) {
      setSelectedServices(productData.shippingServices);
    }
    
    // Initialize flatRate from productData
    if (productData.flatRate) {
      setFlatRate(productData.flatRate);
    }
    
    // Load shipping services if we have packages and are using calculated shipping
    if (productData.shippingPackages && 
        productData.shippingPackages.length > 0 && 
        (shippingMethod === 'calculated' || !shippingMethod)) {
      fetchShippingServices();
    }
  }, [productData.shippingServices, 
      productData.shippingMethod, productData.flatRate, 
      shippingMethod, updateField, productData.shippingPackages]);

  // Handle shipping method selection
  const handleShippingMethodChange = (method) => {
    setShippingMethod(method);
    updateField('shippingMethod', method);
    
    // If switching to a method that doesn't use shipping services, clear the selection
    if (method !== 'calculated') {
      setSelectedServices([]);
      updateField('shippingServices', []);
    } else if (productData.shippingPackages && productData.shippingPackages.length > 0) {
      // If switching to calculated and we have packages, fetch services
      fetchShippingServices();
    }
  };
  
  // Handle flat rate change
  const handleFlatRateChange = (e) => {
    const value = e.target.value;
    setFlatRate(value);
    updateField('flatRate', value);
  };

  // Handle package input changes
  const handlePackageInputChange = (e) => {
    const { name, value } = e.target;
    setNewPackage(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validate numeric fields
  const validateNumericField = (value, fieldName, min = 0) => {
    if (value === '') return '';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${fieldName} must be a number`;
    }
    if (numValue < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return '';
  };

  // Handle blur event for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = '';
    
    if (name.includes('weight') || name.includes('length') || 
        name.includes('width') || name.includes('height')) {
      const fieldName = name.split('.').pop();
      error = validateNumericField(value, fieldName);
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Validate the new package form
  const validateNewPackage = () => {
    const packageErrors = {};
    let isValid = true;
    
    if (!newPackage.name.trim()) {
      packageErrors.name = 'Package name is required';
      isValid = false;
    }
    
    ['length', 'width', 'height', 'weight'].forEach(field => {
      const error = validateNumericField(newPackage[field], field);
      if (error) {
        packageErrors[field] = error;
        isValid = false;
      }
    });
    
    setErrors(prev => ({
      ...prev,
      ...packageErrors
    }));
    
    return isValid;
  };

  // Add a new shipping package
  const handleAddPackage = () => {
    // Validate the new package
    if (!validateNewPackage()) {
      return;
    }
    
    // Create a copy of the new package data
    const packageToAdd = { ...newPackage };
    
    // Convert empty strings to '0' for numeric fields
    ['length', 'width', 'height', 'weight'].forEach(field => {
      if (packageToAdd[field] === '') {
        packageToAdd[field] = '0';
      }
    });
    
    // Add the package to the product data
    addShippingPackage(packageToAdd);
    
    // Reset the form
    setNewPackage({
      name: '',
      length: '',
      width: '',
      height: '',
      weight: ''
    });
    
    // Clear any errors
    setErrors({});
    
    // Fetch shipping services after a delay to ensure state is updated
    setTimeout(() => {
      console.log('Fetching shipping services after adding package');
      fetchShippingServices();
    }, 500);
  };

  // Remove a shipping package
  const handleRemovePackage = (index) => {
    // Remove the package
    removeShippingPackage(index);
    
    // Fetch shipping services after a delay to ensure state is updated
    setTimeout(() => {
      console.log('Fetching shipping services after removing package');
      fetchShippingServices();
    }, 500);
  };

  // Toggle a shipping service selection
  const handleServiceSelection = (serviceId) => {
    const newSelectedServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId];
    
    setSelectedServices(newSelectedServices);
    
    // Update the product data with selected services
    updateField('shippingServices', newSelectedServices);
  };

  // Get fallback shipping services when API fails
  const getFallbackShippingServices = () => {
    return productService.getFallbackShippingServices();
  };

  // Fetch shipping services when packages change
  const fetchShippingServices = async () => {
    if (!productData.shippingPackages || productData.shippingPackages.length === 0) {
      setShippingServices([]);
      setSelectedServices([]);
      updateField('shippingServices', []);
      return;
    }
    
    setLoadingServices(true);
    try {
      const packages = productData.shippingPackages.map(pkg => ({
        length: parseFloat(pkg.length) || 0,
        width: parseFloat(pkg.width) || 0,
        height: parseFloat(pkg.height) || 0,
        weight: parseFloat(pkg.weight) || 0,
        dimensionUnit: 'cm',
        weightUnit: 'kg'
      }));
      
      console.log("Fetching shipping services for packages:", packages);
      const response = await productService.getShippingOptions(packages);
      console.log("Shipping services response:", response);
      
      // Extract services from the response
      const services = response?.services || [];
      
      if (services.length > 0) {
        console.log("Setting shipping services:", services);
        setShippingServices(services);
        
        // Update selected services with the first one from each provider if none are selected
        if (!selectedServices.length) {
          // Get unique providers
          const uniqueProviders = [...new Set(services.map(s => s.provider))];
          console.log("Unique providers:", uniqueProviders);
          
          // Select the first service from each provider
          const defaultSelected = uniqueProviders.map(provider => {
            const service = services.find(s => s.provider === provider);
            return service?.code;
          }).filter(Boolean); // Remove any undefined values
          
          console.log("Setting default selected services:", defaultSelected);
          setSelectedServices(defaultSelected);
          updateField('shippingServices', defaultSelected);
        }
      } else {
        console.log("No shipping services returned, using fallback");
        const fallbackServices = getFallbackShippingServices();
        setShippingServices(fallbackServices);
        
        // Update selected services with the first one from each provider if none are selected
        if (!selectedServices.length) {
          // Get unique providers
          const uniqueProviders = [...new Set(fallbackServices.map(s => s.provider))];
          
          // Select the first service from each provider
          const defaultSelected = uniqueProviders.map(provider => {
            const service = fallbackServices.find(s => s.provider === provider);
            return service?.code;
          }).filter(Boolean);
          
          console.log("Setting default selected services from fallback:", defaultSelected);
          setSelectedServices(defaultSelected);
          updateField('shippingServices', defaultSelected);
        }
      }
    } catch (error) {
      console.error('Error fetching shipping services:', error);
      
      // Use fallback services when API fails
      const fallbackServices = getFallbackShippingServices();
      console.log("Using fallback shipping services due to error:", fallbackServices);
      setShippingServices(fallbackServices);
      
      // Update selected services with the first one from each provider if none are selected
      if (!selectedServices.length) {
        // Get unique providers
        const uniqueProviders = [...new Set(fallbackServices.map(s => s.provider))];
        
        // Select the first service from each provider
        const defaultSelected = uniqueProviders.map(provider => {
          const service = fallbackServices.find(s => s.provider === provider);
          return service?.code;
        }).filter(Boolean);
        
        console.log("Setting default selected services from fallback (error case):", defaultSelected);
        setSelectedServices(defaultSelected);
        updateField('shippingServices', defaultSelected);
      }
    } finally {
      setLoadingServices(false);
    }
  };

  // Group shipping services by provider
  const groupedServices = shippingServices.reduce((acc, service) => {
    if (!acc[service.provider]) {
      acc[service.provider] = [];
    }
    acc[service.provider].push(service);
    return acc;
  }, {});

  // Check if more packages can be added
  const canAddMorePackages = !productData.shippingPackages || productData.shippingPackages.length < 4;

  return (
    <div className="wizard-step shipping-step">
      {/* Product ID display moved to top corner */}
      {draftId && (
        <div style={{ 
          fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
          fontSize: '14px',
          padding: '4px',
          fontWeight: 'normal',
          textAlign: 'right',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}>
          Product ID: {draftId}
        </div>
      )}

      {/* Shipping Method Selection */}
      <div className="form-section">
        <h4 className="section-subtitle">Shipping Method</h4>
        <div className="shipping-method-options" style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '15px',
          justifyContent: 'flex-start',
          '@media (max-width: 768px)': {
            flexDirection: 'column'
          }
        }}>
          <div 
            className={`shipping-method-option ${shippingMethod === 'free' ? 'active' : ''}`}
            onClick={() => handleShippingMethodChange('free')}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px', 
              width: '100px',
              height: '100px',
              border: '1px solid #ddd',
              borderRadius: '0',
              cursor: 'pointer',
              boxShadow: shippingMethod === 'free' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
              backgroundColor: shippingMethod === 'free' ? '#f0f7ff' : 'white',
              transition: 'all 0.2s ease',
              marginBottom: '8px',
              flex: '0 0 auto'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = shippingMethod === 'free' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="method-icon" style={{ fontSize: '32px', marginBottom: '10px' }}>🎁</div>
            <div className="method-name" style={{ fontWeight: shippingMethod === 'free' ? 'bold' : 'normal' }}>Free Shipping</div>
            <div style={{ fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>No shipping cost to customer</div>
          </div>
          
          <div 
            className={`shipping-method-option ${shippingMethod === 'flat_rate' ? 'active' : ''}`}
            onClick={() => handleShippingMethodChange('flat_rate')}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px', 
              width: '100px',
              height: '100px',
              border: '1px solid #ddd',
              borderRadius: '0',
              cursor: 'pointer',
              boxShadow: shippingMethod === 'flat_rate' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
              backgroundColor: shippingMethod === 'flat_rate' ? '#f0f7ff' : 'white',
              transition: 'all 0.2s ease',
              marginBottom: '8px',
              flex: '0 0 auto'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = shippingMethod === 'flat_rate' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="method-icon" style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <div className="method-name" style={{ fontWeight: shippingMethod === 'flat_rate' ? 'bold' : 'normal' }}>Flat Rate</div>
            <div style={{ fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>Same cost regardless of size</div>
          </div>
          
          <div 
            className={`shipping-method-option ${shippingMethod === 'calculated' ? 'active' : ''}`}
            onClick={() => handleShippingMethodChange('calculated')}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px', 
              width: '100px',
              height: '100px',
              border: '1px solid #ddd',
              borderRadius: '0',
              cursor: 'pointer',
              boxShadow: shippingMethod === 'calculated' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
              backgroundColor: shippingMethod === 'calculated' ? '#f0f7ff' : 'white',
              transition: 'all 0.2s ease',
              marginBottom: '8px',
              flex: '0 0 auto'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = shippingMethod === 'calculated' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="method-icon" style={{ fontSize: '32px', marginBottom: '10px' }}>⚖️</div>
            <div className="method-name" style={{ fontWeight: shippingMethod === 'calculated' ? 'bold' : 'normal' }}>Calculated</div>
            <div style={{ fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>Based on weight and size</div>
          </div>
        </div>
        
        {/* Flat Rate Input */}
        {shippingMethod === 'flat_rate' && (
          <div className="flat-rate-input">
            <label htmlFor="flatRate">Flat Rate Amount ($)</label>
            <div className="input-with-unit">
              <div className="currency-container">
                <span className="currency-symbol">$</span>
                <input
                  type="text"
                  id="flatRate"
                  name="flatRate"
                  value={flatRate}
                  onChange={handleFlatRateChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Calculated Shipping Options - Only show for calculated shipping */}
      {shippingMethod === 'calculated' && (
        <div className="form-section">
          <h4 className="section-subtitle">Enter your package dimensions for calculated shipping:</h4>
          
          {canAddMorePackages && (
            <div style={{ marginBottom: '20px' }}>
              {showAddPackage ? (
              <div className="add-package-form">
                <h4>Add New Package</h4>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="packageName">Package Name</label>
                    <input
                      type="text"
                      id="packageName"
                      name="name"
                      value={newPackage.name}
                      onChange={handlePackageInputChange}
                      placeholder="e.g. Small Box, Large Envelope"
                      className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="packageWeight">Weight</label>
                    <div className="input-with-unit">
                      <input
                        type="text"
                        id="packageWeight"
                        name="weight"
                        value={newPackage.weight}
                        onChange={handlePackageInputChange}
                        placeholder="0.00"
                        className={errors.weight ? 'error' : ''}
                      />
                      <span className="unit">kg</span>
                    </div>
                    {errors.weight && <div className="field-error">{errors.weight}</div>}
                  </div>
                </div>
                
                <div className="form-row dimensions-row">
                  <div className="form-field">
                    <label htmlFor="packageLength">Length</label>
                    <div className="input-with-unit">
                      <input
                        type="text"
                        id="packageLength"
                        name="length"
                        value={newPackage.length}
                        onChange={handlePackageInputChange}
                        placeholder="0.00"
                        className={errors.length ? 'error' : ''}
                      />
                      <span className="unit">cm</span>
                    </div>
                    {errors.length && <div className="field-error">{errors.length}</div>}
                  </div>
                  
                  <div className="form-field">
                    <label htmlFor="packageWidth">Width</label>
                    <div className="input-with-unit">
                      <input
                        type="text"
                        id="packageWidth"
                        name="width"
                        value={newPackage.width}
                        onChange={handlePackageInputChange}
                        placeholder="0.00"
                        className={errors.width ? 'error' : ''}
                      />
                      <span className="unit">cm</span>
                    </div>
                    {errors.width && <div className="field-error">{errors.width}</div>}
                  </div>
                  
                  <div className="form-field">
                    <label htmlFor="packageHeight">Height</label>
                    <div className="input-with-unit">
                      <input
                        type="text"
                        id="packageHeight"
                        name="height"
                        value={newPackage.height}
                        onChange={handlePackageInputChange}
                        placeholder="0.00"
                        className={errors.height ? 'error' : ''}
                      />
                      <span className="unit">cm</span>
                    </div>
                    {errors.height && <div className="field-error">{errors.height}</div>}
                  </div>
                </div>
                
                <div className="package-form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowAddPackage(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={handleAddPackage}
                  >
                    Add Package
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button" 
                className="add-package-btn"
                onClick={() => setShowAddPackage(true)}
              >
                Add Package
              </button>
              )}
            </div>
          )}
          
          {productData.shippingPackages && productData.shippingPackages.length > 0 ? (
            <div className="shipping-packages-grid">
              {productData.shippingPackages.map((pkg, index) => (
                <div key={index} className="shipping-package-card">
                  <div className="package-header">
                    <h4>{pkg.name || `Package ${index + 1}`}</h4>
                    <button 
                      type="button" 
                      className="btn-remove-package"
                      onClick={() => handleRemovePackage(index)}
                      aria-label="Remove package"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="package-details">
                    <div className="package-weight">
                      <label>Weight</label>
                      <div className="input-with-unit">
                        <input
                          type="text"
                          name={`package-${index}-weight`}
                          value={pkg.weight}
                          onChange={(e) => {
                            const updatedPackages = [...productData.shippingPackages];
                            updatedPackages[index] = { ...pkg, weight: e.target.value };
                            updateField('shippingPackages', updatedPackages);
                          }}
                          onBlur={handleBlur}
                        />
                        <span className="unit">kg</span>
                      </div>
                    </div>
                    
                    <div className="package-dimensions">
                      <label>Dimensions (L × W × H)</label>
                      <div className="dimensions-input-group">
                        <div className="input-with-unit">
                          <input
                            type="text"
                            name={`package-${index}-length`}
                            value={pkg.length}
                            onChange={(e) => {
                              const updatedPackages = [...productData.shippingPackages];
                              updatedPackages[index] = { ...pkg, length: e.target.value };
                              updateField('shippingPackages', updatedPackages);
                            }}
                            onBlur={handleBlur}
                          />
                          <span className="unit">cm</span>
                        </div>
                        <span className="dimension-separator">×</span>
                        <div className="input-with-unit">
                          <input
                            type="text"
                            name={`package-${index}-width`}
                            value={pkg.width}
                            onChange={(e) => {
                              const updatedPackages = [...productData.shippingPackages];
                              updatedPackages[index] = { ...pkg, width: e.target.value };
                              updateField('shippingPackages', updatedPackages);
                            }}
                            onBlur={handleBlur}
                          />
                          <span className="unit">cm</span>
                        </div>
                        <span className="dimension-separator">×</span>
                        <div className="input-with-unit">
                          <input
                            type="text"
                            name={`package-${index}-height`}
                            value={pkg.height}
                            onChange={(e) => {
                              const updatedPackages = [...productData.shippingPackages];
                              updatedPackages[index] = { ...pkg, height: e.target.value };
                              updateField('shippingPackages', updatedPackages);
                            }}
                            onBlur={handleBlur}
                          />
                          <span className="unit">cm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-packages-message">
              <p>No shipping packages defined. Add at least one package to configure shipping options.</p>
            </div>
          )}
          
          {/* Shipping Services Section */}
          {productData.shippingPackages && productData.shippingPackages.length > 0 && (
            <div className="shipping-services-section">
              <h4 className="section-subtitle">Shipping Services</h4>
              
              {loadingServices ? (
                <div className="loading-indicator">Loading available shipping services...</div>
              ) : Object.keys(groupedServices).length > 0 ? (
                <div className="shipping-services-grid">
                  {Object.entries(groupedServices).map(([provider, services]) => (
                    <div key={provider} className="service-provider-card">
                      <div className="provider-header">
                        <h4>{provider}</h4>
                      </div>
                      <div className="provider-services">
                        {services.map(service => (
                          <div key={service.code} className="service-option">
                            <label className="service-label">
                              <input
                                type="checkbox"
                                checked={selectedServices.includes(service.code)}
                                onChange={() => handleServiceSelection(service.code)}
                              />
                              <span className="service-name">{service.service}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-services-message">
                  <p>No shipping services available for the current package dimensions. Try adjusting your package dimensions or weight.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="shipping-tips dark-theme">
        <h4>Shipping Tips</h4>
        <ul className="tips-list">
          <li>
            <strong>Accurate Measurements:</strong> Ensure dimensions and weights are accurate to get the correct shipping rates.
          </li>
          <li>
            <strong>Multiple Packages:</strong> For products that ship in multiple boxes, add each package separately.
          </li>
          <li>
            <strong>Shipping Services:</strong> Select the shipping services you want to offer for this product.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ShippingStep; 