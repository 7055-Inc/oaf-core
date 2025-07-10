'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../components/Header';
import InventoryLog from '../../../components/InventoryLog';
import { authenticatedApiRequest } from '../../../lib/csrf';
import styles from '../../../pages/products/styles/ProductForm.module.css';

export default function EditProduct() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    available_qty: 10,
    category_id: 1,
    sku: '',
    status: 'draft',
    width: '',
    height: '',
    depth: '',
    weight: '',
    dimension_unit: 'in',
    weight_unit: 'lbs',
    parent_id: '',
    product_type: '',
    images: [],
    // Shipping fields
    ship_method: 'free',
    ship_rate: '',
    shipping_type: 'free',
    shipping_services: '',
    // Vendor field
    vendor_id: ''
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
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCarrierServices, setShowCarrierServices] = useState(false);
  const [availableCarriers, setAvailableCarriers] = useState([]);
  const [carrierRates, setCarrierRates] = useState({});
  const [checkingCarriers, setCheckingCarriers] = useState(false);
  
  // Vendor management state
  const [availableVendors, setAvailableVendors] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const router = useRouter();
  const params = useParams();

  const fetchPackagesData = async (productId) => {
    try {
      const res = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${productId}/packages`, {
        method: 'GET'
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.packages || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching packages:', err);
      return [];
    }
  };

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      // Fetch all users with vendor permissions + admins
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/users?permissions=vendor,admin', {
        method: 'GET'
      });
      
      if (res.ok) {
        const vendors = await res.json();
        setAvailableVendors(vendors);
      } else {
        console.error('Failed to fetch vendors');
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/me', {
        method: 'GET'
      });
      
      if (res.ok) {
        const userData = await res.json();
        setCurrentUserData(userData);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${params.id}`, {
          method: 'GET'
        });

        if (!res.ok) throw new Error('Failed to fetch product');
        
        const data = await res.json();
        
        // Ensure image URLs are absolute
        const images = data.images?.map(img => {
          if (img.startsWith('http')) return img;
          return `https://api2.onlineartfestival.com${img}`;
        }) || [];

        setFormData({
          name: data.name || '',
          description: data.description || '',
          short_description: data.short_description || '',
          price: data.price || '',
          available_qty: data.available_qty || 10,
          category_id: data.category_id || 1,
          sku: data.sku || '',
          status: data.status || 'draft',
          width: data.width || '',
          height: data.height || '',
          depth: data.depth || '',
          weight: data.weight || '',
          dimension_unit: data.dimension_unit || 'in',
          weight_unit: data.weight_unit || 'lbs',
          parent_id: data.parent_id || '',
          product_type: data.product_type || '',
          images: images,
          // Shipping fields
          ship_method: data.shipping?.ship_method || 'free',
          ship_rate: data.shipping?.ship_rate || '',
          shipping_type: data.shipping?.shipping_type || 'free',
          shipping_services: data.shipping?.shipping_services || '',
          // Vendor field
          vendor_id: data.vendor_id || ''
        });

        // Load packages data if available
        if (data.shipping && data.shipping.ship_method === 'calculated') {
          const packagesData = await fetchPackagesData(data.id);
          if (packagesData && packagesData.length > 0) {
            setPackages(packagesData);
          }
          
          // If there are existing shipping services, show the carrier services section
          if (data.shipping.shipping_services) {
            setShowCarrierServices(true);
            // Set up carriers based on existing services - this is basic setup
            // Real carrier rates would come from API call
            setAvailableCarriers(['UPS', 'FedEx', 'USPS']);
          }
        }

        // Fetch vendor list and current user data
        await Promise.all([
          fetchVendors(),
          fetchCurrentUser()
        ]);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchProduct();
    }
  }, [params?.id]);

  // Helper function to get current vendor name
  const getCurrentVendorName = () => {
    if (!formData.vendor_id || !availableVendors.length) return null;
    const vendor = availableVendors.find(v => v.id == formData.vendor_id);
    return vendor ? `${vendor.first_name} ${vendor.last_name}` : null;
  };

  // Handle case where params is not available yet
  if (!params?.id) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.content}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'parent_id' && value === '' ? null : value;
    setFormData({ ...formData, [name]: newValue });
    
    // Reset carrier services when shipping method changes
    if (name === 'ship_method') {
      setFormData(prev => ({ ...prev, shipping_services: '' }));
      setShowCarrierServices(false);
    }
  };

  const handleServiceToggle = (serviceName, isChecked) => {
    setFormData(prev => {
      const services = prev.shipping_services ? prev.shipping_services.split(',') : [];
      if (isChecked) {
        if (!services.includes(serviceName)) {
          services.push(serviceName);
        }
      } else {
        const index = services.indexOf(serviceName);
        if (index > -1) {
          services.splice(index, 1);
        }
      }
      return {
        ...prev,
        shipping_services: services.join(',')
      };
    });
  };

  const addPackage = () => {
    const newId = Math.max(...packages.map(pkg => pkg.id)) + 1;
    setPackages([...packages, {
      id: newId,
      length: '',
      width: '',
      height: '',
      weight: '',
      dimension_unit: 'in',
      weight_unit: 'lbs'
    }]);
  };

  const removePackage = (packageId) => {
    setPackages(packages.filter(pkg => pkg.id !== packageId));
  };

  const updatePackage = (packageId, field, value) => {
    setPackages(packages.map(pkg => pkg.id === packageId ? { ...pkg, [field]: value } : pkg));
  };

  const checkCarrierAvailability = async () => {
    setCheckingCarriers(true);
    try {
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
      
      const response = await authenticatedApiRequest(
        'https://api2.onlineartfestival.com/api/shipping/calculate-cart-shipping',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart_items: [{ product_id: 'test', quantity: 1 }],
            recipient_address: sampleDestination,
            test_packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight)
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const available = [];
        const rates = {};
        
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
        
        // If no rates returned, show default carriers without rates
        if (available.length === 0) {
          available.push('UPS', 'USPS');
          rates['UPS'] = [{ service: 'Ground', cost: 'Calculating...', serviceCode: 'ups-ground' }];
          rates['USPS'] = [{ service: 'Priority Mail', cost: 'Calculating...', serviceCode: 'usps-priority' }];
        }
        
        setAvailableCarriers(available);
        setCarrierRates(rates);
      } else {
        // Fallback to default carriers if API fails
        setAvailableCarriers(['UPS', 'USPS']);
        setCarrierRates({
          'UPS': [{ service: 'Ground', cost: 'Rate unavailable', serviceCode: 'ups-ground' }],
          'USPS': [{ service: 'Priority Mail', cost: 'Rate unavailable', serviceCode: 'usps-priority' }]
        });
      }
      
      setShowCarrierServices(true);
      setError(null);
    } catch (err) {
      setError('Failed to check carrier availability');
      // Fallback to default carriers
      setAvailableCarriers(['UPS', 'USPS']);
      setCarrierRates({
        'UPS': [{ service: 'Ground', cost: 'Rate unavailable', serviceCode: 'ups-ground' }],
        'USPS': [{ service: 'Priority Mail', cost: 'Rate unavailable', serviceCode: 'usps-priority' }]
      });
      setShowCarrierServices(true);
    } finally {
      setCheckingCarriers(false);
    }
  };



  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });


      
      // Make sure we have a valid product ID
      if (!params.id) {
        throw new Error('Product ID is required for image upload');
      }

      const res = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/upload?product_id=${params.id}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload images');
      }
      
      const data = await res.json();
      
      if (!data.urls || !Array.isArray(data.urls)) {
        throw new Error('Invalid upload response format');
      }

      // Ensure image URLs are absolute
      const newImages = data.urls.map(url => {
        if (url.startsWith('http')) return url;
        // If the URL starts with a slash, it's a relative path
        if (url.startsWith('/')) {
          return `https://api2.onlineartfestival.com${url}`;
        }
        // If it's a relative path without a leading slash
        return `https://api2.onlineartfestival.com/${url}`;
      });



      setFormData(prev => {
        const updatedImages = [...(prev.images || []), ...newImages];
        return {
          ...prev,
          images: updatedImages
        };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        parent_id: formData.parent_id || null,
        images: formData.images || [], // Ensure images array is included
        packages: formData.ship_method === 'calculated' ? packages : [],
        // Include vendor_id for admin vendor changes
        vendor_id: formData.vendor_id || null
      };
      
      const res = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      const responseData = await res.json();
      
      router.push('/dashboard/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    setLoading(true);
    try {
      const res = await authenticatedApiRequest(`https://api2.onlineartfestival.com/products/${params.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
      router.push('/dashboard/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.name) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.content}>
          <div className={styles.loading}>Loading product and vendor data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>
        <h1 className={styles.title}>Edit Product</h1>
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formSection}>
              <h2>Basic Information</h2>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Short Description</label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength={200}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.formSection}>
              <h2>Pricing & Inventory</h2>
              <div className={styles.formGroup}>
                <label>Price</label>
                <div className={styles.inputGroup}>
                  <span className={styles.currency}>$</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    step="0.01"
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Available Quantity</label>
                <input
                  type="number"
                  name="available_qty"
                  value={formData.available_qty}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Status</label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              {/* Admin-only vendor change field */}
              {currentUserData?.user_type === 'admin' && (
                <div className={styles.formGroup}>
                  <label>
                    Product Vendor (Admin Only)
                    {getCurrentVendorName() && (
                      <span className={styles.currentVendor}> - Current: {getCurrentVendorName()}</span>
                    )}
                  </label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={loadingVendors}
                  >
                    <option value="">Select Vendor...</option>
                    {availableVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.first_name} {vendor.last_name} ({vendor.email})
                        {vendor.user_type === 'admin' ? ' - Admin' : ' - Vendor'}
                      </option>
                    ))}
                  </select>
                  {loadingVendors && (
                    <small className={styles.helpText}>Loading vendors...</small>
                  )}
                  <small className={styles.helpText}>
                    Change which vendor owns this product. Only admins can modify product ownership.
                  </small>
                </div>
              )}

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
                            <div className={styles.serviceCheckboxWithRate}>
                              <div className={styles.serviceCheckbox}>
                                <input
                                  type="checkbox"
                                  id="fedex-express"
                                  checked={formData.shipping_services.includes('FedEx Express Saver')}
                                  onChange={(e) => handleServiceToggle('FedEx Express Saver', e.target.checked)}
                                />
                                <label htmlFor="fedex-express">FedEx Express Saver</label>
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
                          </>
                        )}
                      </div>
                    )}
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
              
              {formData.images.length > 0 && (
                <div className={styles.imagePreview}>
                  {formData.images.map((url, index) => (
                    <div key={index} className={styles.imageThumbnail}>
                      <img 
                        src={url} 
                        alt={`Product ${index + 1}`} 
                        onError={(e) => {
                          console.error('Image failed to load:', url);
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className={styles.imageUrl}>{url}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <div className={styles.actionButtons}>
              <button 
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push('/dashboard/products')}
                disabled={loading}
              >
                Back to Products
              </button>
              <button 
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={loading}
              >
                Delete Product
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
        
        {/* Inventory Management Section */}
        <InventoryLog 
          productId={params?.id}
          onInventoryUpdate={(productId, newQuantity) => {
            // Update the form data to reflect the new inventory
            setFormData(prev => ({
              ...prev,
              available_qty: newQuantity
            }));
          }}
        />
      </div>
    </div>
  );
} 