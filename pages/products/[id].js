'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../components/Header';
import AboutTheArtist from '../../components/AboutTheArtist';
import VariationSelector from '../../components/VariationSelector';
import ArtistProductCarousel from '../../components/ArtistProductCarousel';
import WholesalePricing from '../../components/WholesalePricing';
import { authenticatedApiRequest, getAuthToken } from '../../lib/csrf';
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
  const [activeTab, setActiveTab] = useState('dimensions');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyModalContent, setPolicyModalContent] = useState({ type: '', content: '', loading: false });
  const [policies, setPolicies] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const params = useParams();

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
        const res = await fetch(
          `https://api2.onlineartfestival.com/curated/art/products/${params.id}?include=images,shipping,vendor,inventory,categories`,
          {
            method: 'GET',
            credentials: 'include'
          }
        );
        
        if (!res.ok) throw new Error('Failed to fetch product');
        
        const data = await res.json();

        // No need to process image URLs - curated API returns proper proxy URLs
        setProduct(data);
        
        // If this is a variable product with children, set up variation data from the response
        if (data.product_type === 'variable' && data.children && data.children.length > 0) {
          // Create variation data structure from children for the VariationSelector
          const variationTypes = [];
          const variationOptions = {};
          
          // Extract variation info from children (if available)
          data.children.forEach(child => {
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
            child_products: data.children.map(child => ({
              ...child,
              inventory: child.inventory || { qty_available: 0 }
            }))
          });
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
        
        const response = await fetch('https://api2.onlineartfestival.com/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
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
    // For variable products, use the selected variation product
    // For simple products, use the main product
    const targetProduct = productToAdd || (product?.product_type === 'variable' ? selectedVariationProduct : product);
    const targetQuantity = quantityToAdd || quantity;

    if (!targetProduct?.id) {
      setError(product?.product_type === 'variable' ? 'Please select a variation' : 'No product selected');
        return;
      }

    try {
      // First, get or create a cart for the user
      let cartId;
      
      // Try to get existing cart
      const cartRes = await authenticatedApiRequest('https://api2.onlineartfestival.com/cart');

      if (cartRes.ok) {
        const carts = await cartRes.json();
        // Find an active cart or create one
        const activeCart = carts.find(cart => cart.status === 'draft');
        
        if (activeCart) {
          cartId = activeCart.id;
        } else {
          // Create a new cart
          const createCartRes = await authenticatedApiRequest('https://api2.onlineartfestival.com/cart', {
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
      const addItemRes = await authenticatedApiRequest(`https://api2.onlineartfestival.com/cart/${cartId}/items`, {
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
        const res = await fetch(`https://api2.onlineartfestival.com/users/${product.vendor_id}/policies`);
        
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
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.error}>{error}</div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.error}>Product not found</div>
        </div>
      </>
    );
  }

  // Check if current user owns this product
  const isOwnProduct = currentUserId && product && (
    currentUserId.toString() === (product.vendor_id || product.user_id)?.toString()
  );

  return (
    <>
      <Header />
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
                  {(selectedVariationProduct || product).images && (selectedVariationProduct || product).images.length > 0 ? (
                    <img 
                      src={(selectedVariationProduct || product).images[selectedImage]} 
                      alt={product.name}
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.noImage}>No image available</div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {(selectedVariationProduct || product).images && (selectedVariationProduct || product).images.length > 1 && (
                  <div className={styles.thumbnailGrid}>
                    {(selectedVariationProduct || product).images.map((image, index) => (
                      <div 
                        key={index}
                        className={`${styles.thumbnail} ${index === selectedImage ? styles.selected : ''}`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img src={image} alt={`${product.name} ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
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
                  <div className={styles.artistInfoTag}>
                    <button 
                      onClick={() => setShowArtistModal(true)}
                      className={styles.artistInfoButton}
                    >
                      <span className={styles.infoIcon}>ℹ️</span>
                      Learn about the artist
                    </button>
                  </div>
                </div>

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

                {/* Short Description */}
                {product.short_description && (
                  <div className={styles.shortDescription}>
                    {product.short_description}
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
                    <div className={styles.quantity}>
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className={styles.quantityButton}
                        disabled={(product.inventory?.qty_available || 0) === 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        max={product.inventory?.qty_available || 0}
                        className={styles.quantityInput}
                        disabled={(product.inventory?.qty_available || 0) === 0}
                      />
                      <button 
                        onClick={() => setQuantity(Math.min(product.inventory?.qty_available || 0, quantity + 1))}
                        className={styles.quantityButton}
                        disabled={(product.inventory?.qty_available || 0) === 0}
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={handleAddToCart}
                      className={styles.addToCartButton}
                      disabled={(product.inventory?.qty_available || 0) === 0}
                    >
                      Add to Cart
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

          {/* Full Description Section */}
          {product.description && (
            <div className={styles.descriptionCard}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <div className={styles.fullDescription}>
                {product.description}
              </div>
            </div>
          )}

          {/* Details Card with Tabs */}
          <div className={styles.detailsCard}>
            <div className={styles.tabsContainer}>
              <div className={styles.tabHeaders}>
                <button 
                  className={`${styles.tabHeader} ${activeTab === 'dimensions' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('dimensions')}
                >
                  Dimensions
                </button>
                <button 
                  className={`${styles.tabHeader} ${activeTab === 'policies' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('policies')}
                >
                  Artist Policies
                </button>
              </div>
              
              <div className={styles.tabContent}>
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
                        className={styles.policyButton}
                        onClick={() => handlePolicyClick('shipping')}
                      >
                        📦 Shipping Policy
                      </button>
                      <button 
                        className={styles.policyButton}
                        onClick={() => handlePolicyClick('return')}
                      >
                        🔄 Returns Policy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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