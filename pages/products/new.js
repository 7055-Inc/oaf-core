'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedApiRequest } from '../../lib/csrf';
import Header from '../../components/Header';
import ProductTypeModal from '../../components/ProductTypeModal';
import AddCategoryModal from '../../components/AddCategoryModal';
import VariationManager from '../../components/VariationManager';
import VariationBulkEditor from '../../components/VariationBulkEditor';
import styles from './styles/ProductForm.module.css';

export default function NewProduct() {
  // Modal and product type state
  const [showModal, setShowModal] = useState(true);
  const [selectedProductType, setSelectedProductType] = useState(null);
  
  // Variable product workflow state
  const [workflowStep, setWorkflowStep] = useState('type-selection'); // 'type-selection', 'variation-setup', 'bulk-edit'
  const [parentProduct, setParentProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [currentVariationStep, setCurrentVariationStep] = useState(2); // Track which variation step we're on

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',

    category_id: '',
    user_category_id: '',
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
  const [userCategories, setUserCategories] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
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
    loadUserCategories();
  }, []);

  // Handle product type selection
  const handleProductTypeSelection = (type) => {
    setSelectedProductType(type);
    setFormData(prev => ({ ...prev, product_type: type }));
    setShowModal(false);
    
    // Both simple and variable products start with the form
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
          images: variation.images || [],
          status: 'active' // ACTIVATE the draft!
        };

        const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${variation.id}`, {
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
      const parentActivationResponse = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${parentProductId}`, {
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

      // Success! All drafts are now active products
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/categories', {
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

  const loadUserCategories = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUserCategories(data);
        } else {
          console.error('User categories data is not an array:', data);
          setUserCategories([]);
        }
      } else {
        console.error('Failed to load user categories');
        setUserCategories([]);
      }
    } catch (error) {
      console.error('Error loading user categories:', error);
      setUserCategories([]);
    }
  };

  const handleAddNewCategory = async (categoryData) => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });
      
      if (response.ok) {
        const newCategory = await response.json();
        // API returns category object directly, not wrapped
        setUserCategories(prev => [...prev, newCategory]);
        setFormData(prev => ({ ...prev, user_category_id: newCategory.id }));
        setShowAddCategoryModal(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Failed to create category');
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
    setLoading(true);
    try {
      const uploadFormData = new FormData();
      files.forEach(file => {
        uploadFormData.append('images', file);
      });

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/upload?product_id=new', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) throw new Error('Failed to upload images');
      
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        images: [...(Array.isArray(prev.images) ? prev.images : []), ...(Array.isArray(data.urls) ? data.urls : [])]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const removeImage = (index) => {
    if (!Array.isArray(formData.images)) {
      return;
    }
    
    const updatedImages = formData.images.filter((_, i) => i !== index);
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
        user_category_id: formData.user_category_id ? parseInt(formData.user_category_id) : null,
        price: parseFloat(formData.price),
        beginning_inventory: parseInt(formData.beginning_inventory) || 0,
        reorder_qty: parseInt(formData.reorder_qty) || 0,
        // Variable products are ALWAYS saved as draft initially (activated at the end)
        status: (selectedProductType === 'variable' || saveAsDraft) ? 'draft' : 'active',
        packages: formData.ship_method === 'calculated' ? packages : [],
        product_type: selectedProductType
      };

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products', {
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
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/shipping/calculate-cart-shipping', {
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
    <>
      <Header />
      <ProductTypeModal 
        isOpen={showModal} 
        onSelectType={handleProductTypeSelection} 
      />
      <AddCategoryModal 
        isOpen={showAddCategoryModal} 
        onClose={() => setShowAddCategoryModal(false)} 
        onSubmit={handleAddNewCategory} 
      />
      
      {/* Product Form */}
      {!showModal && selectedProductType && workflowStep === 'simple-form' && (
        <div className={styles.container}>
      <div className={styles.content}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>
                {selectedProductType === 'simple' 
                  ? 'Add New Simple Product' 
                  : 'Step 1: Create Your Parent Product'
                }
              </h1>
              {selectedProductType === 'variable' && (
                <p className={styles.stepNote}>
                  This parent data will populate to all variations by default. You can edit each variation on an upcoming step.
                </p>
              )}
            </div>
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formSection}>
              <h2>Basic Information</h2>
              <div className={styles.formGroup}>
                  <label>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
                  className={styles.input}
                    maxLength={100}
                />
              </div>

                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    required
                    className={styles.select}
                  >
                    <option value="">Select a category</option>
                    {Array.isArray(categories) && categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {buildCategoryPath(category, categories)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Vendor Category</label>
                  <div className={styles.vendorCategoryGroup}>
                    <select
                      name="user_category_id"
                      value={formData.user_category_id}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option value="">Select your category (optional)</option>
                      {Array.isArray(userCategories) && userCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCategoryModal(true)}
                      className={styles.addCategoryButton}
                    >
                      Add New
                    </button>
                  </div>
                  <small className={styles.helpText}>
                    Create your own categories to organize your products
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label>Product Type</label>
                  <div className={styles.productTypeToggle}>
                    <label className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={selectedProductType === 'variable'}
                        onChange={handleProductTypeToggle}
                      />
                      <span className={styles.slider}></span>
                      <span className={styles.toggleLabels}>
                        <span className={selectedProductType === 'simple' ? styles.active : ''}>Simple</span>
                        <span className={selectedProductType === 'variable' ? styles.active : ''}>Variable</span>
                      </span>
                    </label>
                  </div>
                  <small className={styles.helpText}>
                    Variable products have multiple variations (colors, sizes, etc.)
                  </small>
                </div>
              
              <div className={styles.formGroup}>
                <label>Short Description</label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength={200}
                  placeholder="Brief description for product listings"
                />
                <small className={styles.helpText}>
                  This will be shown in search results and previews
                </small>
              </div>

              <div className={styles.formGroup}>
                <label>Full Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Complete product description with details"
                />
                <small className={styles.helpText}>
                  This complete description will be shown on your product page
                </small>
              </div>
          </div>

            <div className={styles.formSection}>
              <h2>Pricing & Inventory</h2>
              <div className={styles.formGroup}>
                  <label>Price *</label>
                <div className={styles.inputGroup}>
                  <span className={styles.currency}>$</span>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
                      min="0"
              required
                    className={styles.input}
            />
          </div>
              </div>

              <div className={styles.formGroup}>
                <label>Beginning Inventory</label>
            <input
              type="number"
                  name="beginning_inventory"
                  value={formData.beginning_inventory}
              onChange={handleChange}
                    min="0"
                  className={styles.input}
                  placeholder="Initial quantity on hand"
                />
                <small className={styles.helpText}>
                  Starting inventory quantity when product is created
                </small>
              </div>

              <div className={styles.formGroup}>
                <label>Reorder Level</label>
                <input
                  type="number"
                  name="reorder_qty"
                  value={formData.reorder_qty}
                  onChange={handleChange}
                  min="0"
                  className={styles.input}
                  placeholder="Reorder when inventory reaches this level"
                />
                <small className={styles.helpText}>
                  Alert when inventory falls to this quantity
                </small>
          </div>

              <div className={styles.formGroup}>
                  <label>SKU *</label>
                  <div className={styles.inputGroup}>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
                  className={styles.input}
                    maxLength={50}
                    placeholder="Unique product identifier"
            />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sku: generateUniqueSKU(prev.name) }))}
                      className={styles.generateButton}
                    >
                      Generate
                    </button>
                  </div>
                  <small className={styles.helpText}>
                    Click "Generate" to create a unique SKU based on the product name
                  </small>
          </div>

              
            </div>

            <div className={styles.formSection}>
              <h2>Dimensions & Weight</h2>
              <div className={styles.dimensionsGrid}>
                <div className={styles.formGroup}>
                  <label>Width</label>
                  <div className={styles.inputGroup}>
            <input
              type="number"
              name="width"
              value={formData.width}
              onChange={handleChange}
              step="0.01"
                        min="0"
                      className={styles.input}
            />
                    <select
                      name="dimension_unit"
                      value={formData.dimension_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
          </div>

                <div className={styles.formGroup}>
                  <label>Height</label>
                  <div className={styles.inputGroup}>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              step="0.01"
                        min="0"
                      className={styles.input}
            />
                    <select
                      name="dimension_unit"
                      value={formData.dimension_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
          </div>

                <div className={styles.formGroup}>
                  <label>Depth</label>
                  <div className={styles.inputGroup}>
            <input
              type="number"
              name="depth"
              value={formData.depth}
              onChange={handleChange}
              step="0.01"
                        min="0"
                      className={styles.input}
            />
                    <select
                      name="dimension_unit"
                      value={formData.dimension_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
          </div>

                <div className={styles.formGroup}>
                  <label>Weight</label>
                  <div className={styles.inputGroup}>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              step="0.01"
                        min="0"
                      className={styles.input}
                    />
                    <select
                      name="weight_unit"
                      value={formData.weight_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
            </select>
          </div>
                </div>
          </div>
          </div>

              <div className={styles.formSection}>
                <h2>Shipping Information</h2>
                <div className={styles.formGroup}>
                  <label>Shipping Method</label>
                  <select
                    name="ship_method"
                    value={formData.ship_method}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="free">Free Shipping</option>
                    <option value="flat_rate">Flat Rate</option>
                    <option value="calculated">Calculated</option>
                  </select>
                </div>

                {formData.ship_method === 'flat_rate' && (
                  <div className={styles.formGroup}>
                    <label>Shipping Rate per Item</label>
                    <div className={styles.inputGroup}>
                      <span className={styles.currency}>$</span>
                      <input
                        type="number"
                        name="ship_rate"
                        value={formData.ship_rate}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={styles.input}
                      />
                    </div>
                    <small className={styles.helpText}>
                      This rate will be multiplied by the quantity ordered
                    </small>
                  </div>
                )}

                {formData.ship_method === 'calculated' && (
                  <div className={styles.packagesSection}>
                    <h3>Package Dimensions</h3>
                    <p className={styles.packageHelp}>
                      Define each package that this product will ship in. For example, a dining set might have multiple packages: one for the table, one for each chair, etc.
                    </p>
                    
                    {packages.map((pkg, index) => (
                      <div key={pkg.id} className={styles.packageBox}>
                        <div className={styles.packageHeader}>
                          <h4>Package {index + 1}</h4>
                          {packages.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removePackage(pkg.id)}
                              className={styles.removePackageButton}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className={styles.packageDimensions}>
                          <div className={styles.formGroup}>
                            <label>Length</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="number"
                                value={pkg.length}
                                onChange={(e) => updatePackage(pkg.id, 'length', e.target.value)}
                                step="0.01"
                                min="0"
                                className={styles.input}
                                placeholder="0.00"
                              />
                              <select
                                value={pkg.dimension_unit}
                                onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                className={styles.unitSelect}
                              >
                                <option value="in">in</option>
                                <option value="cm">cm</option>
                              </select>
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label>Width</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="number"
                                value={pkg.width}
                                onChange={(e) => updatePackage(pkg.id, 'width', e.target.value)}
                                step="0.01"
                                min="0"
                                className={styles.input}
                                placeholder="0.00"
                              />
                              <select
                                value={pkg.dimension_unit}
                                onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                className={styles.unitSelect}
                              >
                                <option value="in">in</option>
                                <option value="cm">cm</option>
                              </select>
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label>Height</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="number"
                                value={pkg.height}
                                onChange={(e) => updatePackage(pkg.id, 'height', e.target.value)}
                                step="0.01"
                                min="0"
                                className={styles.input}
                                placeholder="0.00"
                              />
                              <select
                                value={pkg.dimension_unit}
                                onChange={(e) => updatePackage(pkg.id, 'dimension_unit', e.target.value)}
                                className={styles.unitSelect}
                              >
                                <option value="in">in</option>
                                <option value="cm">cm</option>
                              </select>
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label>Weight</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="number"
                                value={pkg.weight}
                                onChange={(e) => updatePackage(pkg.id, 'weight', e.target.value)}
                                step="0.01"
                                min="0"
                                className={styles.input}
                                placeholder="0.00"
                              />
                              <select
                                value={pkg.weight_unit}
                                onChange={(e) => updatePackage(pkg.id, 'weight_unit', e.target.value)}
                                className={styles.unitSelect}
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
                        className={styles.addPackageButton}
                      >
                        Add Another Package
                      </button>
                    )}
                  </div>
                )}

                {formData.ship_method === 'calculated' && !showCarrierServices && (
                  <div className={styles.formGroup}>
                    <button 
                      type="button"
                      onClick={checkCarrierAvailability}
                      disabled={checkingCarriers}
                      className={styles.checkCarriersButton}
                    >
                      {checkingCarriers ? 'Checking Available Carriers...' : 'Choose Carrier Services'}
                    </button>
                    <small className={styles.helpText}>
                      Click to check which carriers are available and select shipping services
                    </small>
                  </div>
                )}

                {formData.ship_method === 'calculated' && showCarrierServices && (
                  <div className={styles.formGroup}>
                    <label>Select Carrier Services</label>
                    <div className={styles.carrierServicesGrid}>
                      {availableCarriers.includes('UPS') && (
                        <div className={styles.carrierGroup}>
                          <h4>UPS Services</h4>
                          {carrierRates['UPS'] && carrierRates['UPS'].length > 0 ? (
                            carrierRates['UPS'].map((rate, index) => (
                              <div key={index} className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id={`ups-${rate.serviceCode || index}`}
                                    checked={formData.shipping_services.includes(`UPS ${rate.service}`)}
                                    onChange={(e) => handleServiceToggle(`UPS ${rate.service}`, e.target.checked)}
                                  />
                                  <label htmlFor={`ups-${rate.serviceCode || index}`}>UPS {rate.service}</label>
                                </div>
                                <span className={styles.rateEstimate}>
                                  {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id="ups-ground"
                                    checked={formData.shipping_services.includes('UPS Ground')}
                                    onChange={(e) => handleServiceToggle('UPS Ground', e.target.checked)}
                                  />
                                  <label htmlFor="ups-ground">UPS Ground</label>
                                </div>
                                <span className={styles.rateEstimate}>Rate not available</span>
                              </div>
                              <div className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id="ups-3day"
                                    checked={formData.shipping_services.includes('UPS 3 Day Select')}
                                    onChange={(e) => handleServiceToggle('UPS 3 Day Select', e.target.checked)}
                                  />
                                  <label htmlFor="ups-3day">UPS 3 Day Select</label>
                                </div>
                                <span className={styles.rateEstimate}>Rate not available</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {availableCarriers.includes('FedEx') && (
                        <div className={styles.carrierGroup}>
                          <h4>FedEx Services</h4>
                          {carrierRates['FedEx'] && carrierRates['FedEx'].length > 0 ? (
                            carrierRates['FedEx'].map((rate, index) => (
                              <div key={index} className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id={`fedex-${rate.serviceCode || index}`}
                                    checked={formData.shipping_services.includes(`FedEx ${rate.service}`)}
                                    onChange={(e) => handleServiceToggle(`FedEx ${rate.service}`, e.target.checked)}
                                  />
                                  <label htmlFor={`fedex-${rate.serviceCode || index}`}>FedEx {rate.service}</label>
                                </div>
                                <span className={styles.rateEstimate}>
                                  {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id="fedex-ground"
                                    checked={formData.shipping_services.includes('FedEx Ground')}
                                    onChange={(e) => handleServiceToggle('FedEx Ground', e.target.checked)}
                                  />
                                  <label htmlFor="fedex-ground">FedEx Ground</label>
                                </div>
                                <span className={styles.rateEstimate}>Rate not available</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {availableCarriers.includes('USPS') && (
                        <div className={styles.carrierGroup}>
                          <h4>USPS Services</h4>
                          {carrierRates['USPS'] && carrierRates['USPS'].length > 0 ? (
                            carrierRates['USPS'].map((rate, index) => (
                              <div key={index} className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id={`usps-${rate.serviceCode || index}`}
                                    checked={formData.shipping_services.includes(`USPS ${rate.service}`)}
                                    onChange={(e) => handleServiceToggle(`USPS ${rate.service}`, e.target.checked)}
                                  />
                                  <label htmlFor={`usps-${rate.serviceCode || index}`}>USPS {rate.service}</label>
                                </div>
                                <span className={styles.rateEstimate}>
                                  {typeof rate.cost === 'number' ? `$${rate.cost.toFixed(2)}` : rate.cost}
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id="usps-ground"
                                    checked={formData.shipping_services.includes('USPS Ground Advantage')}
                                    onChange={(e) => handleServiceToggle('USPS Ground Advantage', e.target.checked)}
                                  />
                                  <label htmlFor="usps-ground">USPS Ground Advantage</label>
                                </div>
                                <span className={styles.rateEstimate}>Rate not available</span>
                              </div>
                              <div className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id="usps-priority"
                                    checked={formData.shipping_services.includes('USPS Priority Mail')}
                                    onChange={(e) => handleServiceToggle('USPS Priority Mail', e.target.checked)}
                                  />
                                  <label htmlFor="usps-priority">USPS Priority Mail</label>
                                </div>
                                <span className={styles.rateEstimate}>Rate not available</span>
                              </div>
                              <div className={styles.serviceCheckboxWithRate}>
                                <div className={styles.serviceCheckbox}>
                                  <input
                                    type="checkbox"
                                    id="usps-express"
                                    checked={formData.shipping_services.includes('USPS Priority Mail Express')}
                                    onChange={(e) => handleServiceToggle('USPS Priority Mail Express', e.target.checked)}
                                  />
                                  <label htmlFor="usps-express">USPS Priority Mail Express</label>
                                </div>
                                <span className={styles.rateEstimate}>Rate not available</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <small className={styles.helpText}>
                      Select which carrier services you want to offer to customers. Real-time rates will be calculated at checkout.
                    </small>
                    <div className={styles.carrierActions}>
                      <button 
                        type="button"
                        onClick={() => setShowCarrierServices(false)}
                        className={styles.secondaryButton}
                      >
                        Hide Carrier Services
                      </button>
                      <button 
                        type="button"
                        onClick={checkCarrierAvailability}
                        disabled={checkingCarriers}
                        className={styles.secondaryButton}
                      >
                        {checkingCarriers ? 'Rechecking...' : 'Recheck Carriers'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            <div className={styles.formSection}>
              <h2>Images</h2>
              <div className={styles.imageUpload}>
            <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className={styles.fileInput}
                />
                <div className={styles.uploadButton}>
                  {loading ? 'Uploading...' : 'Upload Images'}
          </div>
          </div>
              
                {Array.isArray(formData.images) && formData.images.length > 0 && (
                <div className={styles.imagePreview}>
                    {formData.images.map((imageUrl, index) => (
                      <div key={index} className={styles.imageContainer}>
                        <div className={styles.imageThumbnail}>
                          <img 
                            src={imageUrl.startsWith('http') ? imageUrl : `https://api2.onlineartfestival.com${imageUrl}`} 
                            alt={`Product ${index + 1}`} 
                          />
                        </div>
                        <div className={styles.imageActions}>
                          <button 
                            type="button" 
                            onClick={() => removeImage(index)}
                            className={styles.dangerButton}
                          >
                            Remove
                          </button>
                        </div>
          </div>
                  ))}
          </div>
              )}
          </div>
          </div>

          {/* Variations Section - Only shown for variable products */}
          {selectedProductType === 'variable' && (
            <div className={styles.formSection}>
              <h2>Product Variations</h2>
              <div className={styles.variationsNote}>
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

          <div className={styles.formActions}>
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
    </div>
      )}

      {/* Variation Setup */}
      {!showModal && selectedProductType === 'variable' && workflowStep === 'variation-setup' && (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>
                {currentVariationStep === 2 ? 'Step 2: Setup Product Variations' : 'Step 3: Select Variations'}
              </h1>
              <p className={styles.stepNote}>
                {currentVariationStep === 2 
                  ? 'Choose the types of variations your product will have (color, size, style, etc.)'
                  : 'Choose which variations you want to create. Each will become a separate product.'
                }
              </p>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            
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
                    setError('DEBUG: Parent product ID missing!');
                    throw new Error('Parent product not found. Please go back and create the parent product first.');
                  }
                  
                  if (!variations || variations.length === 0) {
                    setError('DEBUG: No variations data found!');
                    throw new Error('No variations found. Please set up variations first.');
                  }
                  
                  setError(`DEBUG: Found ${variations.length} variations, Parent ID: ${parentProductId}`);
                  
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

                    const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products', {
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
                      
                      const variationResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/variations', {
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
      {!showModal && selectedProductType === 'variable' && workflowStep === 'bulk-edit' && (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Step 4: Customize Product Variations</h1>
              <p className={styles.stepNote}>
                Customize each variation before creating them as products. You can set individual prices, SKUs, and inventory levels.
              </p>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            
            <VariationBulkEditor
              variations={variations}
              parentProductData={parentProduct}
              onSave={handleCreateVariableProducts}
              onBack={() => setWorkflowStep('variation-setup')}
            />
          </div>
        </div>
      )}

    </>
  );
}