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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    available_qty: 10,
    category_id: '',
    user_category_id: '',
    sku: '',
    status: 'draft',
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
    
    if (type === 'variable') {
      setWorkflowStep('variation-setup');
    } else {
      setWorkflowStep('simple-form');
    }
  };

  // Handle variation workflow steps
  const handleVariationsUpdate = (newVariations) => {
    setVariations(newVariations);
  };

  const handleVariationSetupComplete = () => {
    // Create parent product data for bulk editor
    const parentData = {
      name: formData.name,
      description: formData.description,
      short_description: formData.short_description,
      price: formData.price,
      available_qty: formData.available_qty,
      category_id: formData.category_id,
      sku: formData.sku,
      status: formData.status,
      width: formData.width,
      height: formData.height,
      depth: formData.depth,
      weight: formData.weight,
      dimension_unit: formData.dimension_unit,
      weight_unit: formData.weight_unit,
      images: formData.images,
      ship_method: formData.ship_method,
      ship_rate: formData.ship_rate,
      shipping_services: formData.shipping_services,
      product_type: 'variable' // This will be the parent product
    };
    
    setParentProduct(parentData);
    setWorkflowStep('bulk-edit');
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

  // Handle creating all variable products
  const handleCreateVariableProducts = async (finalizedVariations) => {
    setLoading(true);
    setError(null);

    try {
      // First create the parent product
      const parentPayload = {
        ...parentProduct,
        parent_id: null,
        category_id: parseInt(parentProduct.category_id),
        price: parseFloat(parentProduct.price),
        available_qty: parseInt(parentProduct.available_qty),
        product_type: 'variable' // Parent product type
      };

      const parentResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parentPayload)
      });

      if (!parentResponse.ok) {
        const errorData = await parentResponse.json();
        throw new Error(errorData.error || 'Failed to create parent product');
      }

      const parentProductResult = await parentResponse.json();
      const parentProductId = parentProductResult.id;

      // Now create all the variant products
      const variantCreationPromises = finalizedVariations.map(async (variation) => {
        const variantPayload = {
          name: variation.name,
          description: variation.description,
          short_description: variation.shortDescription,
          price: parseFloat(variation.price),
          available_qty: parseInt(variation.inventory),
          category_id: parseInt(variation.category_id),
          sku: variation.sku,
          status: variation.status,
          width: variation.dimensions.width,
          height: variation.dimensions.height,
          depth: variation.dimensions.depth,
          weight: variation.dimensions.weight,
          dimension_unit: variation.dimensions.dimension_unit,
          weight_unit: variation.dimensions.weight_unit,
          ship_method: variation.shipping.ship_method,
          ship_rate: variation.shipping.ship_rate,
          shipping_services: variation.shipping.shipping_services,
          images: variation.images,
          parent_id: parentProductId,
          product_type: 'variant' // Variant product type
        };

        const variantResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(variantPayload)
        });

        if (!variantResponse.ok) {
          const errorData = await variantResponse.json();
          throw new Error(`Failed to create variant "${variation.name}": ${errorData.error}`);
        }

        const variantResult = await variantResponse.json();
        
        // Create variation records in the database
        await Promise.all(variation.combination.map(async (combo) => {
          const variationPayload = {
            product_id: variantResult.id,
            variation_type_id: combo.typeId,
            variation_value_id: combo.valueId
          };

          const variationResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/variations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(variationPayload)
          });

          if (!variationResponse.ok) {
            console.error('Failed to create variation record:', await variationResponse.text());
          }
        }));

        return variantResult;
      });

      await Promise.all(variantCreationPromises);

      // Success! Redirect to dashboard
      router.push('/dashboard?success=Variable product created successfully');
      
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

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/products/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) throw new Error('Failed to upload images');
      
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        images: [...(Array.isArray(prev.images) ? prev.images : []), ...(Array.isArray(data.urls) ? data.urls.map(url => ({
          url: url,
          alt_text: '',
          friendly_name: '',
          is_primary: false,
          order: (Array.isArray(prev.images) ? prev.images.length : 0) + 1
        })) : [])]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageMetadataChange = (index, field, value) => {
    if (!Array.isArray(formData.images) || !formData.images[index]) {
      return;
    }
    
    const updatedImages = [...formData.images];
    updatedImages[index][field] = value;
    
    // If setting as primary, unset others
    if (field === 'is_primary' && value) {
      updatedImages.forEach((img, i) => {
        if (i !== index) img.is_primary = false;
      });
    }
    
    setFormData(prev => ({ ...prev, images: updatedImages }));
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
        available_qty: parseInt(formData.available_qty),
        status: saveAsDraft ? 'draft' : 'active',
        packages: formData.ship_method === 'calculated' ? packages : []
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
        throw new Error(errorData.error || 'Failed to create product');
      }

      router.push('/dashboard');
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
      {!showModal && selectedProductType && (
        <div className={styles.container}>
      <div className={styles.content}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>
                Add New {selectedProductType === 'simple' ? 'Simple' : 'Variable'} Product
              </h1>
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
                  <label>Available Quantity *</label>
            <input
              type="number"
              name="available_qty"
              value={formData.available_qty}
              onChange={handleChange}
                    min="0"
              required
                  className={styles.input}
            />
          </div>

              <div className={styles.formGroup}>
                  <label>SKU *</label>
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
                    {formData.images.map((image, index) => (
                      <div key={index} className={styles.imageContainer}>
                        <div className={styles.imageThumbnail}>
                          <img src={image.url} alt={image.alt_text || `Product ${index + 1}`} />
                        </div>
                        <div className={styles.imageMetadata}>
                          <input
                            type="text"
                            placeholder="Alt text"
                            value={image.alt_text}
                            onChange={(e) => handleImageMetadataChange(index, 'alt_text', e.target.value)}
                            className={styles.input}
                          />
                          <input
                            type="text"
                            placeholder="Friendly name"
                            value={image.friendly_name}
                            onChange={(e) => handleImageMetadataChange(index, 'friendly_name', e.target.value)}
                            className={styles.input}
                          />
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={image.is_primary}
                              onChange={(e) => handleImageMetadataChange(index, 'is_primary', e.target.checked)}
                            />
                            Primary Image
                          </label>
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


    </>
  );
}