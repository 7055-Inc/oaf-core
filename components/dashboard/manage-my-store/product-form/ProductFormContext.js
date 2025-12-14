import { createContext, useContext, useState, useCallback } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

const ProductFormContext = createContext(null);

export function useProductForm() {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw new Error('useProductForm must be used within ProductFormProvider');
  }
  return context;
}

export function ProductFormProvider({ children, userData, productId = null, initialData = null }) {
  // Mode: 'create' or 'edit'
  const mode = productId ? 'edit' : 'create';
  
  // Core product data
  const [formData, setFormData] = useState({
    product_type: initialData?.product_type || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    short_description: initialData?.short_description || '',
    price: initialData?.price || '',
    wholesale_price: initialData?.wholesale_price || '',
    wholesale_title: initialData?.wholesale_title || '',
    wholesale_description: initialData?.wholesale_description || '',
    category_id: initialData?.category_id || 1, // Default to "Uncategorized"
    sku: initialData?.sku || '',
    status: initialData?.status || 'draft',
    allow_returns: initialData?.allow_returns ?? true,
    width: initialData?.width || '',
    height: initialData?.height || '',
    depth: initialData?.depth || '',
    weight: initialData?.weight || '',
    dimension_unit: initialData?.dimension_unit || 'in',
    weight_unit: initialData?.weight_unit || 'lbs',
    images: initialData?.images || [],
    // Shipping
    ship_method: initialData?.ship_method || 'free',
    ship_rate: initialData?.ship_rate || '',
    shipping_services: initialData?.shipping_services || '',
    // Marketplace settings - default ON for new products
    // Convert 0/1 from MySQL to boolean, default true for new products
    marketplace_enabled: initialData?.marketplace_enabled !== undefined ? Boolean(initialData.marketplace_enabled) : true,
    marketplace_category: initialData?.marketplace_category || 'unsorted',
    // Product identifiers
    gtin: initialData?.gtin || '',
    mpn: initialData?.mpn || '',
    identifier_exists: initialData?.identifier_exists || 'no',
    // Google/Search fields (from product_feed_metadata)
    meta_description: initialData?.meta_description || initialData?.feed_metadata?.meta_description || '',
    google_product_category: initialData?.google_product_category || initialData?.feed_metadata?.google_product_category || '',
    item_group_id: initialData?.item_group_id || initialData?.feed_metadata?.item_group_id || '',
    custom_label_0: initialData?.custom_label_0 || '',
    custom_label_1: initialData?.custom_label_1 || '',
    custom_label_2: initialData?.custom_label_2 || '',
    custom_label_3: initialData?.custom_label_3 || '',
    custom_label_4: initialData?.custom_label_4 || '',
    // Parent reference for variants
    parent_id: initialData?.parent_id || null
  });

  // Inventory data (separate for clarity)
  const [inventoryData, setInventoryData] = useState({
    qty_on_hand: initialData?.inventory?.qty_on_hand || 0,
    qty_available: initialData?.inventory?.qty_available || 0,
    reorder_qty: initialData?.inventory?.reorder_qty || 0,
    beginning_inventory: initialData?.beginning_inventory || 0
  });

  // Multi-package shipping
  const [packages, setPackages] = useState(initialData?.packages || [{
    id: 1,
    length: '',
    width: '',
    height: '',
    weight: '',
    dimension_unit: 'in',
    weight_unit: 'lbs'
  }]);

  // Variations (for variable products)
  const [variations, setVariations] = useState(initialData?.variations || []);

  // Section completion status
  const [sectionStatus, setSectionStatus] = useState({
    productType: mode === 'edit' ? 'complete' : 'pending',
    basicInfo: mode === 'edit' ? 'complete' : 'pending',
    description: mode === 'edit' ? 'complete' : 'pending',
    images: mode === 'edit' ? 'complete' : 'pending',
    inventory: mode === 'edit' ? 'complete' : 'pending',
    shipping: mode === 'edit' ? 'complete' : 'pending',
    searchControl: mode === 'edit' ? 'complete' : 'pending',
    wholesale: mode === 'edit' ? 'complete' : 'pending',
    variations: mode === 'edit' ? 'complete' : 'pending',
    walmart: 'pending',
    tiktok: 'pending'
  });

  // Active section (which one is open)
  const [activeSection, setActiveSection] = useState(mode === 'edit' ? null : 'productType');

  // Product ID (set after draft save)
  const [savedProductId, setSavedProductId] = useState(productId);

  // Loading/error states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Categories (loaded once)
  const [categories, setCategories] = useState([]);

  // User addons (determines which connector sections show)
  const [userAddons, setUserAddons] = useState([]);

  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Update inventory field
  const updateInventory = useCallback((field, value) => {
    setInventoryData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Mark section as complete and move to next
  const completeSection = useCallback((sectionKey, nextSection = null) => {
    setSectionStatus(prev => ({ ...prev, [sectionKey]: 'complete' }));
    setActiveSection(nextSection);
  }, []);

  // Open a section for editing
  const openSection = useCallback((sectionKey) => {
    setActiveSection(sectionKey);
  }, []);

  // Check if we have minimum required fields for creating a product
  const hasRequiredFields = useCallback(() => {
    return formData.name && formData.price && formData.category_id && formData.sku;
  }, [formData.name, formData.price, formData.category_id, formData.sku]);

  // Save draft product
  const saveDraft = useCallback(async (forceSkip = false) => {
    // Skip saving if we don't have required fields yet (early sections)
    if (!hasRequiredFields() && !savedProductId) {
      // Just return success without actually saving - we'll save once we have basic info
      return null;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        ...inventoryData,
        packages: formData.ship_method === 'calculated' ? packages : undefined,
        status: 'draft'
      };

      if (savedProductId) {
        // Update existing
        const res = await authApiRequest(`products/${savedProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to save');
        return savedProductId;
      } else {
        // Create new - only if we have required fields
        const res = await authApiRequest('products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to create');
        setSavedProductId(data.product.id);
        return data.product.id;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [formData, inventoryData, packages, savedProductId, hasRequiredFields]);

  // Save section data
  const saveSection = useCallback(async (sectionData = {}) => {
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        ...sectionData,
        packages: formData.ship_method === 'calculated' ? packages : undefined
      };

      if (savedProductId) {
        const res = await authApiRequest(`products/${savedProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to save');
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, packages, savedProductId]);

  // Publish product (set to active)
  const publishProduct = useCallback(async () => {
    setSaving(true);
    setError(null);
    
    try {
      if (!savedProductId) {
        throw new Error('Product must be saved before publishing');
      }

      const res = await authApiRequest(`products/${savedProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to publish');
      
      // Open in new tab using product ID
      window.open(`/products/${savedProductId}`, '_blank');
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [savedProductId]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await authApiRequest('categories');
      const data = await res.json();
      if (data.success) {
        // Find "Shop" category and flatten its descendants for product assignment
        const shopCategory = data.categories?.find(c => c.name === 'Shop');
        
        if (shopCategory) {
          // Flatten the hierarchy with indentation for display
          const flattened = [];
          
          const flattenCategory = (category, depth = 0) => {
            const indent = depth > 0 ? '—'.repeat(depth) + ' ' : '';
            flattened.push({
              id: category.id,
              name: category.name,
              displayName: indent + category.name,
              depth
            });
            
            if (category.children && category.children.length > 0) {
              // Sort children alphabetically
              const sortedChildren = [...category.children].sort((a, b) => 
                a.name.localeCompare(b.name)
              );
              sortedChildren.forEach(child => flattenCategory(child, depth + 1));
            }
          };
          
          // Add Shop's children (not Shop itself - products go in subcategories)
          if (shopCategory.children && shopCategory.children.length > 0) {
            const sortedChildren = [...shopCategory.children].sort((a, b) => 
              a.name.localeCompare(b.name)
            );
            sortedChildren.forEach(child => flattenCategory(child, 0));
          }
          
          setCategories(flattened);
        } else {
          // Fallback: use flat_categories if Shop not found
          setCategories(data.flat_categories || data.categories || []);
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Load user addons
  const loadUserAddons = useCallback(async () => {
    try {
      const res = await authApiRequest('users/addons');
      const data = await res.json();
      if (data.success) {
        setUserAddons(data.addons || []);
      }
    } catch (err) {
      console.error('Failed to load addons:', err);
    }
  }, []);

  // Check if user has specific addon
  const hasAddon = useCallback((addonSlug) => {
    return userAddons.some(a => a.addon_slug === addonSlug && a.is_active);
  }, [userAddons]);

  // Generate unique SKU
  const generateSKU = useCallback((productName) => {
    const cleanName = (productName || 'PROD')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toUpperCase()
      .substring(0, 20);
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanName}-${timestamp}`;
  }, []);

  // Check if all required sections are complete
  const isReadyToPublish = useCallback(() => {
    const required = ['productType', 'basicInfo', 'description', 'images', 'inventory', 'shipping'];
    if (formData.product_type === 'variable') {
      required.push('variations');
    }
    return required.every(key => sectionStatus[key] === 'complete');
  }, [sectionStatus, formData.product_type]);

  const value = {
    // Mode
    mode,
    
    // Data
    formData,
    inventoryData,
    packages,
    variations,
    categories,
    userAddons,
    
    // State
    sectionStatus,
    activeSection,
    savedProductId,
    saving,
    error,
    
    // Actions
    updateField,
    updateFields,
    updateInventory,
    setPackages,
    setVariations,
    completeSection,
    openSection,
    setActiveSection,
    saveDraft,
    saveSection,
    publishProduct,
    loadCategories,
    loadUserAddons,
    hasAddon,
    generateSKU,
    isReadyToPublish,
    setError,
    
    // User data
    userData
  };

  return (
    <ProductFormContext.Provider value={value}>
      {children}
    </ProductFormContext.Provider>
  );
}

export default ProductFormContext;

