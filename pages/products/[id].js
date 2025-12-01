'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';
import AboutTheArtist from '../../components/AboutTheArtist';
import VariationSelector from '../../components/VariationSelector';
import ArtistProductCarousel from '../../components/ArtistProductCarousel';
import WholesalePricing from '../../components/WholesalePricing';
import ProductReviews from '../../components/ProductReviews';
import { getAuthToken } from '../../lib/csrf';
import { apiRequest, authApiRequest } from '../../lib/apiUtils';
import { isWholesaleCustomer } from '../../lib/userUtils';
import styles from './styles/ProductView.module.css';

export default function ProductView() {
  const [product, setProduct] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [selectedVariationProduct, setSelectedVariationProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showArtistModal, setShowArtistModal] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyModalContent, setPolicyModalContent] = useState({ type: '', content: '', loading: false });
  const [policies, setPolicies] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const params = useParams();

  // Helper function to process image URLs
  const processProductImages = (productData) => {
    if (!productData) return productData;
    
    const processedProduct = { ...productData };
    
    // Process images array if it exists
    if (processedProduct.images && Array.isArray(processedProduct.images)) {
      processedProduct.images = processedProduct.images.map(img => {
        // Handle new format: {url, is_primary}
        const imageUrl = typeof img === 'string' ? img : img.url;
        const isPrimary = typeof img === 'object' && img.is_primary;
        
        let processedUrl;
        // If it's already a full URL, return as-is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          processedUrl = imageUrl;
        }
        // If it's a temp_images path, use API base URL directly
        else if (imageUrl.startsWith('/temp_images/')) {
          processedUrl = `${getApiUrl()}${imageUrl}`;
        }
        // Otherwise, convert to smart media proxy URL
        else {
          processedUrl = getSmartMediaUrl(imageUrl);
        }
        
        return { url: processedUrl, is_primary: isPrimary };
      });
    }
    
    // Process children if they exist
    if (processedProduct.children && Array.isArray(processedProduct.children)) {
      processedProduct.children = processedProduct.children.map(child => processProductImages(child));
    }
    
    return processedProduct;
  };

  // Get user data for wholesale pricing
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserData(payload);
      } catch (error) {
        console.error('Error parsing user token:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!params?.id) {
          setError('Product ID not found');
          return;
        }
        
        // Use the new curated art marketplace API - includes all data in single call
        const res = await apiRequest(`api/curated/art/products/${params.id}?include=images,shipping,vendor,inventory,categories`, {
          method: 'GET'
        });
        
        if (!res.ok) {
          // If curated endpoint fails, try the regular products endpoint as fallback
          console.log(`Curated endpoint failed with ${res.status}, trying regular products endpoint...`);
          
          const fallbackRes = await apiRequest(`products/${params.id}?include=images,shipping,vendor,inventory,categories`, {
            method: 'GET'
          });
          
          if (!fallbackRes.ok) {
            throw new Error(`Product not found. Curated API: ${res.status}, Regular API: ${fallbackRes.status}`);
          }
          
          const fallbackData = await fallbackRes.json();
          const processedFallbackData = processProductImages(fallbackData);
          setProduct(processedFallbackData);
          console.log('Successfully loaded product from regular endpoint:', processedFallbackData);
          return;
        }
        
        const data = await res.json();

        // Process image URLs to ensure they use smart media proxy
        const processedData = processProductImages(data);
        setProduct(processedData);
        
        // If this is a variable product with children, set up variation data from the response
        if (processedData.product_type === 'variable' && processedData.children && processedData.children.length > 0) {
          // Use variation data from API if available, otherwise extract from children
          if (processedData.variation_types && processedData.variation_options) {
            // API already provided structured variation data
            setVariationData({
              variation_types: processedData.variation_types,
              variation_options: processedData.variation_options,
              child_products: processedData.children.map(child => ({
                ...child,
                inventory: child.inventory || { qty_available: 0 }
              }))
            });
          } else {
            // Fallback: Extract variation info from children
            const variationTypes = [];
            const variationOptions = {};
            
            processedData.children.forEach(child => {
              if (child.variations) {
                Object.keys(child.variations).forEach(typeName => {
                  if (!variationTypes.find(t => t.variation_name === typeName)) {
                    variationTypes.push({ variation_name: typeName });
                  }
                  if (!variationOptions[typeName]) {
                    variationOptions[typeName] = [];
                  }
                  child.variations[typeName].forEach(value => {
                    if (!variationOptions[typeName].find(v => v.value_name === value.value_name)) {
                      variationOptions[typeName].push(value);
                    }
                  });
                });
              }
            });
            
            setVariationData({
              variation_types: variationTypes,
              variation_options: variationOptions,
              child_products: processedData.children.map(child => ({
                ...child,
                inventory: child.inventory || { qty_available: 0 }
              }))
            });
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };



    if (params?.id) {
      fetchProduct();
    }
  }, [params?.id]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        
        const response = await authApiRequest('users/me', {
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.id);
        }
      } catch (err) {
        // Silently handle auth errors - user just won't see edit button
      }
    };

    fetchCurrentUser();
  }, []);

  const handleAddToCart = async (productToAdd = null, quantityToAdd = null) => {
    // Check if first parameter is a React event (has nativeEvent property)
    // If so, ignore it - this happens when called directly from onClick
    const isEvent = productToAdd && productToAdd.nativeEvent;
    const actualProductToAdd = isEvent ? null : productToAdd;
    
    // For variable products, use the selected variation product
    // For simple products, use the main product
    const targetProduct = actualProductToAdd || (product?.product_type === 'variable' ? selectedVariationProduct : product);
    const targetQuantity = quantityToAdd || quantity;

    if (!targetProduct?.id) {
      setError(product?.product_type === 'variable' ? 'Please select a variation' : 'No product selected');
        return;
      }

    try {
      // First, get or create a cart for the user
      let cartId;
      
      // Try to get existing cart
      const cartRes = await authApiRequest('cart');

      if (cartRes.ok) {
        const carts = await cartRes.json();
        // Find an active cart or create one
        const activeCart = carts.find(cart => cart.status === 'draft');
        
        if (activeCart) {
          cartId = activeCart.id;
        } else {
          // Create a new cart
          const createCartRes = await authApiRequest('cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'draft'
            })
          });

          if (!createCartRes.ok) throw new Error('Failed to create cart');
          
          const cartData = await createCartRes.json();
          cartId = cartData.cart.id;
        }
      } else {
        throw new Error('Failed to get cart information');
      }

      // Now add the item to the cart
      const addItemRes = await authApiRequest(`cart/${cartId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: targetProduct.id,
          vendor_id: targetProduct.vendor_id,
          quantity: targetQuantity,
          price: targetProduct.price
        })
      });

      if (!addItemRes.ok) {
        const errorData = await addItemRes.json();
        throw new Error(errorData.error || 'Failed to add to cart');
      }
      
      // Show success message and redirect to cart
      alert('Item added to cart successfully!');
      router.push('/cart');
      
    } catch (err) {
      console.error('Add to cart error:', err);
      setError(err.message);
    }
  };

  const handleVariationChange = (selectedProduct) => {
    setSelectedVariationProduct(selectedProduct);
    
    // Update images to show the selected variation's images if available
    if (selectedProduct.images && selectedProduct.images.length > 0) {
      setSelectedImage(0); // Reset to first image of selected variation
    }
  };

  const handlePolicyClick = async (policyType) => {
    if (!product || !product.vendor_id) {
      alert('Unable to load policy - vendor information not available');
      return;
    }

    setPolicyModalContent({ type: policyType, content: '', loading: true });
    setShowPolicyModal(true);

    try {
      // Check if we already have policies cached
      let policiesData = policies;
      
      if (!policiesData) {
        // Fetch all policies at once
        const res = await apiRequest(`users/${product.vendor_id}/policies`, {
          method: 'GET'
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch policies');
        }
        
        const data = await res.json();
        
        if (data.success && data.policies) {
          policiesData = data.policies;
          setPolicies(policiesData); // Cache for future use
        } else {
          throw new Error('No policies returned');
        }
      }
      
      // Get the specific policy requested
      const policy = policiesData[policyType];
      
      if (policy && policy.policy_text) {
        setPolicyModalContent({ 
          type: policyType, 
          content: policy.policy_text, 
          loading: false,
          source: policy.policy_source 
        });
      } else {
        setPolicyModalContent({ 
          type: policyType, 
          content: 'No policy available for this artist.', 
          loading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicyModalContent({ 
        type: policyType, 
        content: 'Error loading policy. Please try again later.', 
        loading: false 
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Product not found</div>
      </div>
    );
  }

  // Check if current user owns this product
  const isOwnProduct = currentUserId && product && (
    currentUserId.toString() === (product.vendor_id || product.user_id)?.toString()
  );

  return (
    <>
      {isOwnProduct && (
        <div className={styles.floatingEditButtons}>
          <a href={`/dashboard/products/${product.id}`} className={styles.floatingEditLink}>
            <i className="fa-solid fa-edit"></i>
            Edit Product
          </a>
          <a href="/dashboard/products" className={styles.floatingManageLink}>
            <i className="fa-solid fa-folder"></i>
            Manage Catalog
          </a>
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.content}>
          
          {/* Product Card - Full Width */}
          <div className={styles.productCard}>
            <div className={styles.productGrid}>
              {/* Product Image Section - Left */}
              <div className={styles.imageSection}>
                <div className={styles.mainImage}>
                  {(() => {
                    const currentProduct = selectedVariationProduct || product;
                    const parentImages = product.images || [];
                    const childImages = selectedVariationProduct ? (selectedVariationProduct.images || []) : [];
                    const allImages = [...parentImages, ...childImages];
                    
                    if (allImages.length === 0) {
                      return <div className={styles.noImage}>No image available</div>;
                    }
                    
                    const imageUrl = typeof allImages[selectedImage] === 'string' 
                      ? allImages[selectedImage] 
                      : allImages[selectedImage]?.url;
                    
                    return <img src={imageUrl} alt={product.name} className={styles.image} />;
                  })()}
                </div>
                
                {/* Grouped Thumbnails: [Parent] [Child1] [Child2] etc */}
                {(() => {
                  const parentImages = product.images || [];
                  const childImages = selectedVariationProduct ? (selectedVariationProduct.images || []) : [];
                  const allImages = [...parentImages, ...childImages];
                  
                  if (allImages.length <= 1) return null;
                  
                  return (
                    <div className={styles.thumbnailContainer}>
                      {/* Parent Images Group */}
                      {parentImages.length > 0 && (
                        <div className={styles.thumbnailGroup}>
                          <div className={styles.thumbnailGroupLabel}>Parent Product</div>
                          <div className={styles.thumbnailGrid}>
                            {parentImages.map((image, index) => {
                              const imageUrl = typeof image === 'string' ? image : image.url;
                              const isPrimary = typeof image === 'object' && image.is_primary;
                              return (
                                <div 
                                  key={`parent-${index}`}
                                  className={`${styles.thumbnail} ${index === selectedImage ? styles.selected : ''} ${isPrimary ? styles.primary : ''}`}
                                  onClick={() => setSelectedImage(index)}
                                >
                                  <img src={imageUrl} alt={`${product.name} ${index + 1}`} />
                                  {isPrimary && <div className={styles.primaryBadge}>★</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Child Images Group */}
                      {childImages.length > 0 && selectedVariationProduct && (
                        <div className={styles.thumbnailGroup}>
                          <div className={styles.thumbnailGroupLabel}>{selectedVariationProduct.name}</div>
                          <div className={styles.thumbnailGrid}>
                            {childImages.map((image, index) => {
                              const imageUrl = typeof image === 'string' ? image : image.url;
                              const isPrimary = typeof image === 'object' && image.is_primary;
                              const actualIndex = parentImages.length + index;
                              return (
                                <div 
                                  key={`child-${index}`}
                                  className={`${styles.thumbnail} ${actualIndex === selectedImage ? styles.selected : ''} ${isPrimary ? styles.primary : ''}`}
                                  onClick={() => setSelectedImage(actualIndex)}
                                >
                                  <img src={imageUrl} alt={`${selectedVariationProduct.name} ${index + 1}`} />
                                  {isPrimary && <div className={styles.primaryBadge}>★</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Product Details Section - Right */}
              <div className={styles.detailsSection}>
                {/* Enhanced Title */}
                <div className={styles.titleSection}>
                  <h1 className={styles.enhancedTitle}>
                    {product.name} by {' '}
                    {product.vendor?.business_name || 
                     (product.vendor?.first_name && product.vendor?.last_name 
                       ? `${product.vendor.first_name} ${product.vendor.last_name}` 
                       : 'Artist')}
                    {product.category_name && `, ${product.category_name}`}
                  </h1>
                  
                  {/* Artist Info Icon */}
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#666', 
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowArtistModal(true)}
                  >
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '1.5px solid #666',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>i</span>
                    Learn about the artist
                  </div>
                </div>

                {/* Short Description */}
                {product.short_description && (
                  <div className={styles.shortDescription}>
                    {product.short_description}
                  </div>
                )}

                {/* Show price for simple products only */}
                {product.product_type !== 'variable' && (
                  <div className={styles.price}>
                    <WholesalePricing
                      price={product.price}
                      wholesalePrice={product.wholesale_price}
                      isWholesaleCustomer={isWholesaleCustomer(userData)}
                      size="large"
                      layout="stacked"
                    />
                  </div>
                )}

                {/* Variation Selector or Add to Cart for Simple Products */}
                <div className={styles.selectorSection}>
              {product.product_type === 'variable' ? (
                variationData ? (
                  <VariationSelector
                    variationData={variationData}
                    onVariationChange={handleVariationChange}
                    onAddToCart={handleAddToCart}
                    initialQuantity={quantity}
                  />
                ) : (
                  <div className={styles.loading}>Loading product variations...</div>
                )
              ) : (
                /* Simple Product Add to Cart Section */
                <>
                  <div className={styles.availability}>
                    <span className={styles.label}>Availability:</span>
                    <span className={styles.value}>
                      {(product.inventory?.qty_available || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <div className={styles.addToCart}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0',
                      border: '1px solid #ccc',
                      borderRadius: '0px',
                      width: 'fit-content',
                      overflow: 'hidden'
                    }}>
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={(product.inventory?.qty_available || 0) === 0}
                        style={{
                          background: 'white',
                          border: 'none',
                          borderRight: '1px solid #ccc',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#595b5d'
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        max={product.inventory?.qty_available || 0}
                        disabled={(product.inventory?.qty_available || 0) === 0}
                        style={{
                          border: 'none',
                          padding: '8px',
                          width: '60px',
                          textAlign: 'center',
                          fontSize: '16px',
                          margin: 0
                        }}
                      />
                      <button 
                        onClick={() => setQuantity(Math.min(product.inventory?.qty_available || 0, quantity + 1))}
                        disabled={(product.inventory?.qty_available || 0) === 0}
                        style={{
                          background: 'white',
                          border: 'none',
                          borderLeft: '1px solid #ccc',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#595b5d'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={handleAddToCart}
                      disabled={loading || !product || (product.inventory?.qty_available || 0) === 0}
                      className="secondary"
                      style={{ 
                        marginLeft: '10px',
                        padding: '10px 20px'
                      }}
                    >
                      {loading ? 'Loading...' : 'Add to Cart'}
                    </button>
                    
                    {(product.inventory?.qty_available || 0) === 0 && (
                      <button 
                        onClick={() => alert('Email notification feature coming soon!')}
                        className={styles.emailNotifyButton}
                      >
                        📧 Email me when back in stock
                      </button>
                    )}
                  </div>
                </>
              )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card with Tabs */}
          <div className={styles.detailsCard}>
            <h2 className={styles.sectionTitle}>More about this...</h2>
            <div className="tab-container">
              <button 
                className={`tab ${activeTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              <button 
                className={`tab ${activeTab === 'dimensions' ? 'active' : ''}`}
                onClick={() => setActiveTab('dimensions')}
              >
                Dimensions
              </button>
              <button 
                className={`tab ${activeTab === 'policies' ? 'active' : ''}`}
                onClick={() => setActiveTab('policies')}
              >
                Artist Policies
              </button>
            </div>
            
            <div className={styles.tabContent}>
              {activeTab === 'description' && (
                <div className={styles.fullDescription}>
                  {product.description || 'No description available.'}
                </div>
              )}
              
              {activeTab === 'dimensions' && (
                <div className={styles.dimensions}>
                  <div className={styles.dimensionGrid}>
                    <div className={styles.dimension}>
                      <span>Width:</span>
                      <span>{(selectedVariationProduct || product).width} {(selectedVariationProduct || product).dimension_unit}</span>
                    </div>
                    <div className={styles.dimension}>
                      <span>Height:</span>
                      <span>{(selectedVariationProduct || product).height} {(selectedVariationProduct || product).dimension_unit}</span>
                    </div>
                    <div className={styles.dimension}>
                      <span>Depth:</span>
                      <span>{(selectedVariationProduct || product).depth} {(selectedVariationProduct || product).dimension_unit}</span>
                    </div>
                    <div className={styles.dimension}>
                      <span>Weight:</span>
                      <span>{(selectedVariationProduct || product).weight} {(selectedVariationProduct || product).weight_unit}</span>
                    </div>
                    <div className={styles.dimension}>
                      <span>Returns:</span>
                      <span>
                        {(selectedVariationProduct || product).allow_returns !== false ? (
                          <span style={{ color: '#28a745' }}>✓ Returns Accepted</span>
                        ) : (
                          <span style={{ color: '#dc3545' }}>✗ No Returns</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'policies' && (
                <div className={styles.policies}>
                  <div className={styles.policyButtons}>
                    <button 
                      className="secondary"
                      onClick={() => handlePolicyClick('shipping')}
                    >
                      Shipping Policy
                    </button>
                    <button 
                      className="secondary"
                      onClick={() => handlePolicyClick('return')}
                    >
                      Returns Policy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          {product && (
            <ProductReviews 
              productId={product.id} 
              currentUserId={currentUserId}
            />
          )}

          {/* About the Artist Section - 2/3 width, centered */}
          {product && (product.vendor_id || product.user_id) && (
            <div className={styles.artistSection}>
              <AboutTheArtist vendorId={product.vendor_id || product.user_id} vendorData={product.vendor} />
            </div>
          )}
          
          {/* More from this artist carousel */}
          {product && (product.vendor_id || product.user_id) && (
            <ArtistProductCarousel 
              vendorId={product.vendor_id || product.user_id}
              currentProductId={product.id}
              artistName={product.vendor?.business_name || 
                         (product.vendor?.first_name && product.vendor?.last_name 
                           ? `${product.vendor.first_name} ${product.vendor.last_name}` 
                           : 'this artist')}
            />
          )}
          
        </div>
      </div>
      
      {/* Artist Info Modal */}
      {showArtistModal && (
        <div className={styles.modalOverlay} onClick={() => setShowArtistModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>About the Artist</h2>
              <button 
                onClick={() => setShowArtistModal(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {product && (product.vendor_id || product.user_id) && (
                <AboutTheArtist vendorId={product.vendor_id || product.user_id} vendorData={product.vendor} />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Policy Modal */}
      {showPolicyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPolicyModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {policyModalContent.type === 'shipping' ? '📦 Shipping Policy' : '🔄 Returns Policy'}
              </h2>
              <button 
                onClick={() => setShowPolicyModal(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {policyModalContent.loading ? (
                <div className={styles.loading}>Loading policy...</div>
              ) : (
                <div className={styles.policyContent}>
                  {policyModalContent.content ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: policyModalContent.content.replace(/\n/g, '<br/>') }}
                    />
                  ) : (
                    <p>No policy available for this artist.</p>
                  )}
                  {policyModalContent.source && (
                    <div className={styles.policySource}>
                      <small>
                        Policy source: {policyModalContent.source === 'custom' ? 'Artist-specific' : 'Default'}
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}