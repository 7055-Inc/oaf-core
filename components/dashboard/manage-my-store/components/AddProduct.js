import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSmartMediaUrl, config } from '../../../../lib/config';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getFrontendUrl } from '../../../../lib/config';
import styles from '../../../../pages/dashboard/Dashboard.module.css';
import slideInStyles from '../../SlideIn.module.css';
import VariationManager from '../../../VariationManager';
import VariationBulkEditor from '../../../VariationBulkEditor';

export default function AddProduct({ userData }) {
  // Product type and workflow state
  const [selectedProductType, setSelectedProductType] = useState(null);
  
  // Variable product workflow state
  const [workflowStep, setWorkflowStep] = useState('type-selection'); // 'type-selection', 'simple-form', 'variation-setup', 'bulk-edit'
  const [parentProduct, setParentProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [currentVariationStep, setCurrentVariationStep] = useState(2); // Track which variation step we're on

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    category_id: '',
    sku: '',
    status: 'draft',
    // Inventory fields for initial setup
    beginning_inventory: 0,
    reorder_qty: 0,
    width: '',
    height: '',
    depth: '',
    weight: '',
    dimension_unit: 'in',
    weight_unit: 'lbs',
    parent_id: '',
    images: [],
    // Shipping fields
    ship_method: 'free',
    ship_rate: '',
    shipping_type: 'free',
    shipping_services: ''
  });

  // Multi-package state for calculated shipping
  const [packages, setPackages] = useState([
    {
      id: 1,
      length: '',
      width: '',
      height: '',
      weight: '',
      dimension_unit: 'in',
      weight_unit: 'lbs'
    }
  ]);

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCarrierServices, setShowCarrierServices] = useState(false);
  const [availableCarriers, setAvailableCarriers] = useState([]);
  const [carrierRates, setCarrierRates] = useState({});
  const [checkingCarriers, setCheckingCarriers] = useState(false);
  const router = useRouter();

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Handle product type selection
  const handleProductTypeSelection = (type) => {
    setSelectedProductType(type);
    setFormData(prev => ({ ...prev, product_type: type }));
    setWorkflowStep('simple-form');
  };

  // Handle variation workflow steps
  const handleVariationsUpdate = (newVariations) => {
    setVariations(newVariations);
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

  // Generate unique SKU for main product
  const generateUniqueSKU = (productName) => {
    const cleanName = (productName || 'PROD').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    return `${cleanName}-${timestamp}`;
  };

  const handleProductTypeToggle = () => {
    const newType = selectedProductType === 'simple' ? 'variable' : 'simple';
    setSelectedProductType(newType);
    setFormData(prev => ({ ...prev, product_type: newType }));
    
    // Keep form data, just switch the workflow step
    if (newType === 'simple') {
      setWorkflowStep('simple-form');
    } else {
      setWorkflowStep('simple-form'); // Show form with variations section
    }
  };

  // Handle activating all draft products (they're already created!)
  const handleCreateVariableProducts = async (finalizedVariations) => {
    setLoading(true);
    setError(null);

    try {
      const parentProductId = parentProduct.id;

      if (!parentProductId) {
        throw new Error('Parent product not found.');
      }

      // Update all draft products with final edits and activate them
      const activationPromises = finalizedVariations.map(async (variation) => {
        const updatePayload = {
          // Only send user-editable fields from bulk editor + activation
          // DO NOT send backend fields like parent_id, product_type, etc.
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
          status: 'active' // ACTIVATE the draft!
        };

        const response = await authApiRequest(`products/${variation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to activate variant "${variation.name}": ${errorData.error}`);
        }

        return await response.json();
      });

      await Promise.all(activationPromises);

      // Also activate the parent product (change from draft to active)
      const parentActivationResponse = await authApiRequest(`products/${parentProductId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'active'
        })
      });

      if (!parentActivationResponse.ok) {
        const errorData = await parentActivationResponse.json();
        throw new Error(`Failed to activate parent product: ${errorData.error}`);
      }

      // Queue new product email for variable product
      try {
        const emailResponse = await authApiRequest('emails/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: 'new_product',
            templateData: { 
              product_name: parentProduct.name, 
              product_id: parentProductId,
              product_url: getFrontendUrl(`/products/${parentProductId}`),
              product_description: parentProduct.description || parentProduct.short_description || '',
              product_price: `$${parentProduct.price}`,
              product_image_url: parentProduct.images && parentProduct.images.length > 0 ? parentProduct.images[0] : '',
              product_variations: `${finalizedVariations.length} variations available`
            }
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(`Email queue failed: ${errorData.error}`);
        }
      } catch (queueError) {
        // Don't fail the entire product creation if email fails
        setError(`Product activated successfully, but failed to send notification email: ${queueError.message}`);
      }

      // Success! All drafts are now active products - redirect to the product page
      alert('Variable product created successfully with all variations!');
      router.push(`/products/${parentProductId}`);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to build category hierarchy display string
  const buildCategoryPath = (category, allCategories) => {
    const path = [];
    let currentCategory = category;
    
    // Build path from child to parent
    while (currentCategory) {
      path.unshift(currentCategory.name);
      if (currentCategory.parent_id) {
        currentCategory = allCategories.find(c => c.id === currentCategory.parent_id);
      } else {
        currentCategory = null;
      }
    }
    
    return path.join(' > ');
  };

  const loadCategories = async () => {
    try {
      const response = await authApiRequest('categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle the API response format: { success: true, categories: [...], flat_categories: [...] }
        if (data.success && Array.isArray(data.flat_categories)) {
          // Use flat_categories for dropdown but maintain hierarchy info
          const flatCategories = data.flat_categories;
          
          // Sort categories by hierarchy path for better organization
          const sortedCategories = flatCategories.sort((a, b) => {
            const pathA = buildCategoryPath(a, flatCategories);
            const pathB = buildCategoryPath(b, flatCategories);
            return pathA.localeCompare(pathB);
          });
          
          setCategories(sortedCategories);
        } else {
          console.error('Invalid categories response format:', data);
          setCategories([]);
        }
      } else {
        console.error('Failed to load categories');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'parent_id' && value === '' ? null : value;
    setFormData({ ...formData, [name]: newValue });
    
    // Reset carrier services when shipping method changes
    if (name === 'ship_method') {
      setShowCarrierServices(false);
      setAvailableCarriers([]);
      if (value !== 'calculated') {
        setFormData(prev => ({ ...prev, shipping_services: '' }));
      }
    }
  };

  const handleServiceToggle = (serviceName, isChecked) => {
    setFormData(prev => {
      let services = prev.shipping_services ? prev.shipping_services.split(',').map(s => s.trim()) : [];
      
      if (isChecked) {
        // Add service if not already present
        if (!services.includes(serviceName)) {
          services.push(serviceName);
        }
      } else {
        // Remove service
        services = services.filter(s => s !== serviceName);
      }
      
      return {
        ...prev,
        shipping_services: services.join(', ')
      };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files before upload
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit as per documentation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    for (const file of files) {
      if (file.size > maxFileSize) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" is not a supported image format. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }
    }

    setLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('images', file);
      });

      const response = await authApiRequest('products/upload?product_id=new', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload images');
      }
      
      const data = await response.json();
      
      // The API returns { urls: [...] } - add these to existing images
      if (data.urls && Array.isArray(data.urls)) {
        setFormData(prev => {
          const currentImages = Array.isArray(prev.images) ? prev.images : [];
          const newImages = data.urls.map((url, index) => ({
            url,
            is_primary: currentImages.length === 0 && index === 0 // First image is primary by default
          }));
          
          return {
            ...prev,
            images: [...currentImages, ...newImages]
          };
        });
      } else {
        throw new Error('Invalid response format from upload API');
      }
    } catch (err) {
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index) => {
    if (!Array.isArray(formData.images)) {
      return;
    }
    
    const removedImage = formData.images[index];
    let updatedImages = formData.images.filter((_, i) => i !== index);
    
    // If we removed the primary image and there are still images left, make the first one primary
    if (removedImage.is_primary && updatedImages.length > 0) {
      updatedImages[0].is_primary = true;
    }
    
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const setPrimaryImage = (index) => {
    if (!Array.isArray(formData.images)) {
      return;
    }
    
    const updatedImages = formData.images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields (less strict for drafts)
      if (!saveAsDraft && (!formData.name || !formData.price || !formData.category_id || !formData.sku)) {
        throw new Error('Please fill in all required fields');
      }

      // For calculated shipping, validate that at least one package has dimensions
      if (formData.ship_method === 'calculated' && !saveAsDraft) {
        const hasValidPackage = packages.some(pkg => 
          pkg.length && pkg.width && pkg.height && pkg.weight
        );
        if (!hasValidPackage) {
          throw new Error('For calculated shipping, please provide complete dimensions for at least one package');
        }
      }

      const payload = { 
        ...formData, 
        parent_id: formData.parent_id || null,
        category_id: parseInt(formData.category_id),
        price: parseFloat(formData.price),
        beginning_inventory: parseInt(formData.beginning_inventory) || 0,
        reorder_qty: parseInt(formData.reorder_qty) || 0,
        // Variable products are ALWAYS saved as draft initially (activated at the end)
        status: (selectedProductType === 'variable' || saveAsDraft) ? 'draft' : 'active',
        packages: formData.ship_method === 'calculated' ? packages : [],
        product_type: selectedProductType
      };

      const response = await authApiRequest('products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Failed to create product';
        
        // Handle duplicate SKU error with user-friendly message
        if (errorMessage.includes('Duplicate entry') && errorMessage.includes('uk_products_sku')) {
          errorMessage = `SKU "${formData.sku}" already exists. Please use a different SKU.`;
        }
        
        throw new Error(errorMessage);
      }

      const newProduct = await response.json();

      // Queue new product email
      try {
        const emailResponse = await authApiRequest('emails/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey: 'new_product',
            templateData: { 
              product_name: newProduct.name, 
              product_id: newProduct.id,
              product_url: getFrontendUrl(`/products/${newProduct.id}`),
              product_description: newProduct.description || newProduct.short_description || '',
              product_price: `$${newProduct.price}`,
              product_image_url: newProduct.images && newProduct.images.length > 0 ? newProduct.images[0] : '',
              product_variations: ''
            }
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(`Email queue failed: ${errorData.error}`);
        }
      } catch (queueError) {
        // Don't fail the entire product creation if email fails
        setError(`Product created successfully, but failed to send notification email: ${queueError.message}`);
      }

      // For variable products, move to variation setup instead of redirecting
      if (selectedProductType === 'variable') {
        // Store the parent product data with the new ID
        setParentProduct({
          ...newProduct,
          id: newProduct.id
        });
        setCurrentVariationStep(2); // Reset to step 2 when starting variation setup
        setWorkflowStep('variation-setup');
      } else {
        // For simple products, redirect to the product page
        alert('Product created successfully!');
        router.push(`/products/${newProduct.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = (e) => {
    handleSubmit(e, true);
  };

  // Multi-package management functions
  const addPackage = () => {
    if (packages.length < 5) {
      setPackages([...packages, {
        id: packages.length + 1,
        length: '',
        width: '',
        height: '',
        weight: '',
        dimension_unit: 'in',
        weight_unit: 'lbs'
      }]);
    }
  };

  const removePackage = (packageId) => {
    if (packages.length > 1) {
      setPackages(packages.filter(pkg => pkg.id !== packageId));
    }
  };

  const updatePackage = (packageId, field, value) => {
    setPackages(packages.map(pkg => 
      pkg.id === packageId ? { ...pkg, [field]: value } : pkg
    ));
  };

  const checkCarrierAvailability = async () => {
    setCheckingCarriers(true);
    const available = [];
    const rates = {};
    
    // Validate that we have package dimensions
    const hasValidPackages = packages.some(pkg => 
      pkg.length && pkg.width && pkg.height && pkg.weight
    );
    
    if (!hasValidPackages) {
      setError('Please enter package dimensions before checking carrier rates');
      setCheckingCarriers(false);
      return;
    }
    
    // Use sample destination for rate calculation (New York)
    const sampleDestination = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US'
    };
    
    try {
      // Create a temporary product for rate calculation
      const testProduct = {
        packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight)
      };
      
      const response = await authApiRequest('api/shipping/calculate-cart-shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cart_items: [{ product_id: 'test', quantity: 1 }],
          recipient_address: sampleDestination,
          test_packages: testProduct.packages // Send package data for testing
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.shipping_results && data.shipping_results.length > 0) {
          const shippingResult = data.shipping_results[0];
          
          if (shippingResult.available_rates && shippingResult.available_rates.length > 0) {
            // Group rates by carrier
            shippingResult.available_rates.forEach(rate => {
              if (!rates[rate.carrier]) {
                rates[rate.carrier] = [];
              }
              rates[rate.carrier].push(rate);
              
              if (!available.includes(rate.carrier)) {
                available.push(rate.carrier);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting shipping rates:', error);
    }
    
    // If no rates returned, show default carriers without rates
    if (available.length === 0) {
      available.push('UPS', 'USPS');
      rates['UPS'] = [{ service: 'Ground', cost: 'Calculating...', serviceCode: 'ups-ground' }];
      rates['USPS'] = [{ service: 'Priority Mail', cost: 'Calculating...', serviceCode: 'usps-priority' }];
    }
    
    setAvailableCarriers(available);
    setCarrierRates(rates);
    setCheckingCarriers(false);
    setShowCarrierServices(true);
    setError(null);
  };

  return (
    <div>
        {/* Product Type Selection */}
        {workflowStep === 'type-selection' && (
          <div>
            <div>
              <div>
                <h1>Choose Product Type</h1>
                <p>
                  Select whether you're creating a simple product or a variable product with multiple options.
                </p>
              </div>
              
              <div className={slideInStyles.productTypeCards}>
                <div 
                  className={slideInStyles.productTypeCard}
                  onClick={() => handleProductTypeSelection('simple')}
                >
                  <div className={slideInStyles.cardIcon}>📦</div>
                  <h3>Simple Product</h3>
                  <p>A single product with one price, one SKU, and basic options.</p>
                  <ul>
                    <li>One price point</li>
                    <li>Single inventory count</li>
                    <li>Basic product setup</li>
                  </ul>
                </div>
                
                <div 
                  className={slideInStyles.productTypeCard}
                  onClick={() => handleProductTypeSelection('variable')}
                >
                  <div className={slideInStyles.cardIcon}>🎨</div>
                  <h3>Variable Product</h3>
                  <p>A product with multiple variations like colors, sizes, or styles.</p>
                  <ul>
                    <li>Multiple variations</li>
                    <li>Different prices per variation</li>
                    <li>Separate inventory tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Product Form */}
        {selectedProductType && workflowStep === 'simple-form' && (
          <div>
            <div>
              <h1>
                {selectedProductType === 'simple' 
                  ? 'Add New Simple Product' 
                  : 'Step 1: Create Your Parent Product'
                }
              </h1>
              {selectedProductType === 'variable' && (
                <p>
                  This parent data will populate to all variations by default. You can edit each variation on an upcoming step.
                </p>
                            )}
            </div>
            {error && <div className="error-alert">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="section-box">
                <h2>Basic Information</h2>
                                  <div>
                    <label>Name *</label>
                              <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
                </div>

                  <div>
                    <label>Category *</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a category</option>
                      {Array.isArray(categories) && categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {buildCategoryPath(category, categories)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <small className={slideInStyles.helpText}>
                      Create your own categories to organize your products
                    </small>
                  </div>

                  <div>
                    <label>Product Type</label>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={selectedProductType === 'variable'}
                        onChange={handleProductTypeToggle}
                      />
                      <div className="toggle-labels">
                        <span className={selectedProductType === 'simple' ? 'active' : ''}>Simple</span>
                        <span className={selectedProductType === 'variable' ? 'active' : ''}>Variable</span>
                      </div>
                    </div>
                    <small className={slideInStyles.helpText}>
                      Variable products have multiple variations (colors, sizes, etc.)
                    </small>
                  </div>
                
                <div>
                  <label>Short Description</label>
                  <textarea
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="Brief description for product listings"
                  />
                  <small className={slideInStyles.helpText}>
                    This will be shown in search results and previews
                  </small>
                </div>

                <div>
                  <label>Full Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Complete product description with details"
                  />
                  <small className={slideInStyles.helpText}>
                    This complete description will be shown on your product page
                  </small>
                </div>
            </div>

              <div className="section-box">
                <h2>Pricing & Inventory</h2>
                                <div>
                  <label>Price *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={slideInStyles.currency}>$</span>
                              <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
            </div>
                </div>

                                <div>
                    <label>Beginning Inventory</label>
                              <input
                  type="number"
                  name="beginning_inventory"
                  value={formData.beginning_inventory}
                  onChange={handleChange}
                  min="0"
                  placeholder="Initial quantity on hand"
                />
                  <small className={slideInStyles.helpText}>
                    Starting inventory quantity when product is created
                  </small>
                </div>

                <div>
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    name="reorder_qty"
                    value={formData.reorder_qty}
                    onChange={handleChange}
                    min="0"
                    placeholder="Reorder when inventory reaches this level"
                  />
                  <small className={slideInStyles.helpText}>
                    Alert when inventory falls to this quantity
                  </small>
            </div>

                <div>
                    <label>SKU *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                maxLength={50}
                placeholder="Unique product identifier"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sku: generateUniqueSKU(prev.name) }))}
                className="secondary"
              >
                Generate
              </button>
                    </div>
                                         <small className={slideInStyles.helpText}>
                       Click "Generate" to create a unique SKU based on the product name
                     </small>
            </div>

                                 
               </div>

                               <div className="section-box">
                  <h2>Dimensions & Weight</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                   <div>
                     <label>Width</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="width"
                 value={formData.width}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
               />
                       <select
                         name="dimension_unit"
                         value={formData.dimension_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="in">in</option>
                         <option value="cm">cm</option>
                       </select>
                     </div>
             </div>

                   <div>
                     <label>Height</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="height"
                 value={formData.height}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
               />
                       <select
                         name="dimension_unit"
                         value={formData.dimension_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="in">in</option>
                         <option value="cm">cm</option>
                       </select>
                     </div>
             </div>

                   <div>
                     <label>Depth</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="depth"
                 value={formData.depth}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
               />
                       <select
                         name="dimension_unit"
                         value={formData.dimension_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="in">in</option>
                         <option value="cm">cm</option>
                       </select>
                     </div>
             </div>

                   <div>
                     <label>Weight</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <input
                 type="number"
                 name="weight"
                 value={formData.weight}
                 onChange={handleChange}
                 step="0.01"
                 min="0"
                       />
                       <select
                         name="weight_unit"
                         value={formData.weight_unit}
                         onChange={handleChange}
                         style={{ minWidth: '60px' }}
                       >
                         <option value="lbs">lbs</option>
                         <option value="kg">kg</option>
               </select>
             </div>
                   </div>
             </div>
             </div>

                 <div className="section-box">
                   <h2>Shipping Information</h2>
                   <div>
                     <label>Shipping Method</label>
                     <select
                       name="ship_method"
                       value={formData.ship_method}
                       onChange={handleChange}
 
                     >
                       <option value="free">Free Shipping</option>
                       <option value="flat_rate">Flat Rate</option>
                       <option value="calculated">Calculated</option>
                     </select>
                   </div>

                   {formData.ship_method === 'flat_rate' && (
                     <div>
                       <label>Shipping Rate per Item</label>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span className={slideInStyles.currency}>$</span>
                         <input
                           type="number"
                           name="ship_rate"
                           value={formData.ship_rate}
                           onChange={handleChange}
                           step="0.01"
                           min="0"
                         />
                       </div>
                       <small className={slideInStyles.helpText}>
                         This rate will be multiplied by the quantity ordered
                       </small>
                     </div>
                   )}

                   {formData.ship_method === 'calculated' && (
                     <div className="section-box">
                       <h3>Package Dimensions</h3>
                       <p>
                         Define each package that this product will ship in. For example, a dining set might have multiple packages: one for the table, one for each chair, etc.
                       </p>
                       
                       {packages.map((pkg, index) => (
                         <div key={pkg.id} className="form-card">
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                             <h3>Package {index + 1}</h3>
                             {packages.length > 1 && (
                               <button 
                                 type="button" 
                                 onClick={() => removePackage(pkg.id)}
                                 style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}
                               >
                                 Remove
                               </button>
                             )}
                           </div>
                           
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                             <div>
                               <label>Length</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.length}
                                   onChange={(e) => updatePackage(pkg.id, 'length', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.dimension_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="in">in</option>
                                   <option value="cm">cm</option>
                                 </select>
                               </div>
                             </div>

                             <div>
                               <label>Width</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.width}
                                   onChange={(e) => updatePackage(pkg.id, 'width', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.dimension_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="in">in</option>
                                   <option value="cm">cm</option>
                                 </select>
                               </div>
                             </div>

                             <div>
                               <label>Height</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.height}
                                   onChange={(e) => updatePackage(pkg.id, 'height', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.dimension_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="in">in</option>
                                   <option value="cm">cm</option>
                                 </select>
                               </div>
                             </div>

                             <div>
                               <label>Weight</label>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <input
                                   type="number"
                                   value={pkg.weight}
                                   onChange={(e) => updatePackage(pkg.id, 'weight', e.target.value)}
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                 />
                                 <select
                                   value={pkg.weight_unit}
                                   onChange={(e) => updatePackage(pkg.id, 'weight_unit', e.target.value)}
                                   style={{ minWidth: '60px' }}
                                 >
                                   <option value="lbs">lbs</option>
                                   <option value="kg">kg</option>
                                 </select>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                       
                       {packages.length < 5 && (
                         <button 
                           type="button" 
                           onClick={addPackage}
                           style={{ background: 'transparent', color: 'var(--primary-color)', border: '2px dashed var(--primary-color)', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}
                         >
                           Add Another Package
                         </button>
                       )}
                     </div>
                   )}

                   {formData.ship_method === 'calculated' && !showCarrierServices && (
                     <div>
                       <button 
                         type="button"
                         onClick={checkCarrierAvailability}
                         disabled={checkingCarriers}
                       >
                         {checkingCarriers ? 'Checking Available Carriers...' : 'Choose Carrier Services'}
                       </button>
                       <small className={slideInStyles.helpText}>
                         Click to check which carriers are available and select shipping services
                       </small>
                     </div>
                   )}

                   {formData.ship_method === 'calculated' && showCarrierServices && (
                     <div>
                       <label>Select Carrier Services</label>
                       <div className={slideInStyles.carrierServicesGrid}>
                                                    {availableCarriers.includes('UPS') && (
                             <div className={slideInStyles.carrierGroup}>
                             <h4>UPS Services</h4>
                             {carrierRates['UPS'] && carrierRates['UPS'].length > 0 ? (
                               carrierRates['UPS'].map((rate, index) => (
                                 <div key={index} className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id={`ups-${rate.serviceCode || index}`}
                                       checked={formData.shipping_services.includes(`UPS ${rate.service}`)}
                                       onChange={(e) => handleServiceToggle(`UPS ${rate.service}`, e.target.checked)}
                                     />
                                     <label htmlFor={`ups-${rate.serviceCode || index}`}>UPS {rate.service}</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>
                                     {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="ups-ground"
                                       checked={formData.shipping_services.includes('UPS Ground')}
                                       onChange={(e) => handleServiceToggle('UPS Ground', e.target.checked)}
                                     />
                                     <label htmlFor="ups-ground">UPS Ground</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="ups-3day"
                                       checked={formData.shipping_services.includes('UPS 3 Day Select')}
                                       onChange={(e) => handleServiceToggle('UPS 3 Day Select', e.target.checked)}
                                     />
                                     <label htmlFor="ups-3day">UPS 3 Day Select</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                               </>
                             )}
                           </div>
                         )}

                         {availableCarriers.includes('FedEx') && (
                           <div className={slideInStyles.carrierGroup}>
                             <h4>FedEx Services</h4>
                             {carrierRates['FedEx'] && carrierRates['FedEx'].length > 0 ? (
                               carrierRates['FedEx'].map((rate, index) => (
                                 <div key={index} className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id={`fedex-${rate.serviceCode || index}`}
                                       checked={formData.shipping_services.includes(`FedEx ${rate.service}`)}
                                       onChange={(e) => handleServiceToggle(`FedEx ${rate.service}`, e.target.checked)}
                                     />
                                     <label htmlFor={`fedex-${rate.serviceCode || index}`}>FedEx {rate.service}</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>
                                     {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="fedex-ground"
                                       checked={formData.shipping_services.includes('FedEx Ground')}
                                       onChange={(e) => handleServiceToggle('FedEx Ground', e.target.checked)}
                                     />
                                     <label htmlFor="fedex-ground">FedEx Ground</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                               </>
                             )}
                           </div>
                         )}

                         {availableCarriers.includes('USPS') && (
                           <div className={slideInStyles.carrierGroup}>
                             <h4>USPS Services</h4>
                             {carrierRates['USPS'] && carrierRates['USPS'].length > 0 ? (
                               carrierRates['USPS'].map((rate, index) => (
                                 <div key={index} className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id={`usps-${rate.serviceCode || index}`}
                                       checked={formData.shipping_services.includes(`USPS ${rate.service}`)}
                                       onChange={(e) => handleServiceToggle(`USPS ${rate.service}`, e.target.checked)}
                                     />
                                     <label htmlFor={`usps-${rate.serviceCode || index}`}>USPS {rate.service}</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>
                                     {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="usps-ground"
                                       checked={formData.shipping_services.includes('USPS Ground Advantage')}
                                       onChange={(e) => handleServiceToggle('USPS Ground Advantage', e.target.checked)}
                                     />
                                     <label htmlFor="usps-ground">USPS Ground Advantage</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="usps-priority"
                                       checked={formData.shipping_services.includes('USPS Priority Mail')}
                                       onChange={(e) => handleServiceToggle('USPS Priority Mail', e.target.checked)}
                                     />
                                     <label htmlFor="usps-priority">USPS Priority Mail</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                                 <div className={slideInStyles.serviceCheckboxWithRate}>
                                   <div className={slideInStyles.serviceCheckbox}>
                                     <input
                                       type="checkbox"
                                       id="usps-express"
                                       checked={formData.shipping_services.includes('USPS Priority Mail Express')}
                                       onChange={(e) => handleServiceToggle('USPS Priority Mail Express', e.target.checked)}
                                     />
                                     <label htmlFor="usps-express">USPS Priority Mail Express</label>
                                   </div>
                                   <span className={slideInStyles.rateEstimate}>Rate not available</span>
                                 </div>
                               </>
                             )}
                           </div>
                         )}
                       </div>
                       <small className={slideInStyles.helpText}>
                         Select which carrier services you want to offer to customers. Real-time rates will be calculated at checkout.
                       </small>
                       <div className={slideInStyles.carrierActions}>
                         <button 
                           type="button"
                           onClick={() => setShowCarrierServices(false)}
                           className="secondary"
                         >
                           Hide Carrier Services
                         </button>
                         <button 
                           type="button"
                           onClick={checkCarrierAvailability}
                           disabled={checkingCarriers}
                           className="secondary"
                         >
                           {checkingCarriers ? 'Rechecking...' : 'Recheck Carriers'}
                         </button>
                       </div>
                     </div>
                   )}
                 </div>

               <div className="section-box">
                 <h2>Images</h2>
                 <div>
                   <input
                     type="file"
                     accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                     multiple
                     onChange={handleImageUpload}
                     disabled={loading}
                   />
                   <div>
                     {loading ? 'Uploading images...' : 'Upload Images'}
                   </div>
                   <small className={slideInStyles.helpText}>
                     Upload product images (JPEG, PNG, GIF, WebP). Maximum 5MB per file. Images will be processed for optimal web delivery.
                   </small>
                 </div>
                 
                  {Array.isArray(formData.images) && formData.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
                      {formData.images.map((image, index) => {
                        // Handle different URL formats:
                        // - Temporary paths: /temp_images/products/...
                        // - Permanent URLs: https://... or media IDs
                        const imageUrl = typeof image === 'string' ? image : image.url;
                        let displayUrl;
                        if (imageUrl.startsWith('http')) {
                          displayUrl = imageUrl;
                        } else if (imageUrl.startsWith('/temp_images/')) {
                          // For temporary images, use the API base URL + the path
                          displayUrl = `${config.API_BASE_URL}${imageUrl}`;
                        } else {
                          // For media IDs, use the smart media URL
                          displayUrl = getSmartMediaUrl(imageUrl);
                        }
                        
                        const isPrimary = typeof image === 'object' && image.is_primary;
                        
                        return (
                          <div key={index} style={{ border: isPrimary ? '3px solid var(--primary-color)' : '1px solid #ddd', borderRadius: '8px', padding: '8px', position: 'relative' }}>
                            {isPrimary && (
                              <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                PRIMARY
                              </div>
                            )}
                            <div style={{ marginBottom: '8px' }}>
                              <img 
                                src={displayUrl}
                                alt={`Product ${index + 1}`} 
                                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '4px' }}
                                onError={(e) => {
                                  console.error('Failed to load image:', displayUrl);
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                              <input
                                type="radio"
                                name="primaryImage"
                                checked={isPrimary}
                                onChange={() => setPrimaryImage(index)}
                                id={`primary-${index}`}
                              />
                              <label htmlFor={`primary-${index}`} style={{ fontSize: '14px', margin: 0 }}>
                                Set as Primary
                              </label>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeImage(index)}
                              className="secondary"
                              style={{ width: '100%' }}
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
             </div>

             {/* Variations Section - Only shown for variable products */}
             {selectedProductType === 'variable' && (
               <div className="section-box">
                 <h2>Product Variations</h2>
                 <div>
                   <p>
                     Variable products allow customers to choose from different options like colors, sizes, or styles. 
                     Each variation can have its own price, inventory, and images.
                   </p>
                   <p>
                     <strong>Note:</strong> You'll set up the specific variations and their details after creating the base product.
                   </p>
                 </div>
               </div>
             )}
 
             </div>
 
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <button 
                type="button" 
                onClick={handleSaveAsDraft}
                disabled={loading}
                className="secondary"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
          </div>
        )}

        {/* Variation Setup */}
        {selectedProductType === 'variable' && workflowStep === 'variation-setup' && (
          <div>
            <div>
              <div>
                <h1>
                  {currentVariationStep === 2 ? 'Step 2: Setup Product Variations' : 'Step 3: Select Variations'}
                </h1>
                <p>
                  {currentVariationStep === 2 
                    ? 'Choose the types of variations your product will have (color, size, style, etc.)'
                    : 'Choose which variations you want to create. Each will become a separate product.'
                  }
                </p>
              </div>
              {error && <div className="error-alert">{error}</div>}
              
              <VariationManager
                onNext={async (variations) => {
                  setVariations(variations);
                  setCurrentVariationStep(4);
                  
                  // Create draft child products with the variations data
                  setLoading(true);
                  setError(null);
                  
                  try {
                    const parentProductId = parentProduct.id;
                    
                    if (!parentProductId) {
                      throw new Error('Parent product not found. Please go back and create the parent product first.');
                    }
                    
                    if (!variations || variations.length === 0) {
                      throw new Error('No variations found. Please set up variations first.');
                    }
                    
                    // Create draft children for each variation combination
                    // Add delay between requests to prevent rate limiting
                    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                    
                    const createdDrafts = [];
                    
                    for (let i = 0; i < variations.length; i++) {
                      const variation = variations[i];
                      
                      // Add delay between product creation requests
                      if (i > 0) {
                        await delay(500); // 500ms delay between product creations (light throttling)
                      }
                      
                      const combinationName = variation.combination
                        .filter(c => c && c.valueName)
                        .map(c => c.valueName)
                        .join(' × ');
                      
                      const { id, created_at, updated_at, parent_id, ...parentProductWithoutId } = parentProduct;
                      const draftPayload = {
                        ...parentProductWithoutId,
                        name: `${parentProduct.name} - ${combinationName}`,
                        sku: generateSKU(parentProduct.sku || '', combinationName, i),
                        parent_id: parentProductId,
                        product_type: 'variant',
                        status: 'draft'
                      };

                      const response = await authApiRequest('products', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(draftPayload)
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Failed to create draft for "${combinationName}": ${errorData.error}`);
                      }

                      const createdProduct = await response.json();
                      
                      // Store variation data with delays between requests
                      const variationCombos = variation.combination.filter(combo => combo && combo.typeId && combo.valueId);
                      
                      for (let j = 0; j < variationCombos.length; j++) {
                        const combo = variationCombos[j];
                        
                        // Add delay between variation creation requests
                        if (j > 0) {
                          await delay(200); // 200ms delay between variation creations (light throttling)
                        }
                        
                        const variationResponse = await authApiRequest('products/variations', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            product_id: createdProduct.id,
                            variation_type_id: combo.typeId,
                            variation_value_id: combo.valueId
                          })
                        });

                        if (!variationResponse.ok) {
                          const errorData = await variationResponse.json();
                          throw new Error(`Failed to store variation data for "${combo.typeName}": ${errorData.error}`);
                        }
                      }
                      
                      createdDrafts.push(createdProduct);
                    }
                    setVariations(createdDrafts);
                    setWorkflowStep('bulk-edit');
                    
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                onBack={() => {
                  setWorkflowStep('simple-form');
                  setCurrentVariationStep(1);
                }}
                onVariationsChange={(variations) => {
                  setVariations(variations);
                }}
                onStepChange={setCurrentVariationStep}
                productId={parentProduct?.id} // Pass parent product ID
              />
            </div>
          </div>
        )}

        {/* Bulk Editor */}
        {selectedProductType === 'variable' && workflowStep === 'bulk-edit' && (
          <div>
            <div>
              <div>
                <h1>Step 4: Customize Product Variations</h1>
                <p>
                  Customize each variation before creating them as products. You can set individual prices, SKUs, and inventory levels.
                </p>
              </div>
              {error && <div className="error-alert">{error}</div>}
              
              <VariationBulkEditor
                variations={variations}
                parentProductData={parentProduct}
                onSave={handleCreateVariableProducts}
                onBack={() => setWorkflowStep('variation-setup')}
              />
            </div>
          </div>
        )}
    </div>
  );
}
