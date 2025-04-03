import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Product.css';

function Product() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);

  useEffect(() => {
    // Reset state when product changes
    setQuantity(1);
    setAddedToCart(false);
    
    // Fetch product data
    fetchProduct();
  }, [productId]);
  
  const fetchProduct = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      
      const productData = await response.json();
      setProduct(productData);
      
      // Fetch vendor information
      const vendorResponse = await fetch(`/api/vendor/${productData.vendor_id}`);
      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json();
        setVendorInfo(vendorData);
        
        // Fetch shipping methods
        const shippingResponse = await fetch(`/api/vendor/${productData.vendor_id}/shipping`);
        if (shippingResponse.ok) {
          const shippingData = await shippingResponse.json();
          setShippingMethods(shippingData);
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= (product?.stockQuantity || 10)) {
      setQuantity(value);
    }
  };

  const incrementQuantity = () => {
    if (quantity < (product?.stockQuantity || 10)) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const addToCart = async () => {
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: quantity
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item to cart');
      }
      
      // Show success message
      setAddedToCart(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setAddedToCart(false);
      }, 3000);
      
    } catch (err) {
      setError(err.message);
    }
  };
  
  const addToWishlist = async () => {
    try {
      const response = await fetch('/api/wishlist/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item to wishlist');
      }
      
      alert('Added to wishlist!');
      
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="product-loading">Loading product details...</div>;
  if (error) return <div className="product-error">Error: {error}</div>;
  if (!product) return <div className="product-not-found">Product not found</div>;

  return (
    <div className="product-container">
      <div className="product-image-container">
        <img src={product.imageUrl} alt={product.name} className="product-image" />
      </div>
      
      <div className="product-details">
        <h1 className="product-title">{product.name}</h1>
        <p className="product-vendor">
          by {vendorInfo ? vendorInfo.name : 'Unknown Vendor'}
        </p>
        <p className="product-price">${product.price.toFixed(2)}</p>
        
        {product.stockQuantity < 10 && product.stockQuantity > 0 && (
          <p className="limited-stock">Only {product.stockQuantity} left in stock!</p>
        )}
        
        {product.stockQuantity <= 0 && (
          <p className="out-of-stock">Currently out of stock</p>
        )}
        
        <div className="product-description">
          <h2>Description</h2>
          <p>{product.description}</p>
        </div>
        
        {vendorInfo && (
          <div className="vendor-info">
            <h2>About the Seller</h2>
            <p>{vendorInfo.description}</p>
            <Link to={`/vendor/${vendorInfo.id}`}>View Seller Profile</Link>
          </div>
        )}
        
        {shippingMethods.length > 0 && (
          <div className="shipping-info">
            <h2>Shipping</h2>
            <ul>
              {shippingMethods.map(method => (
                <li key={method.id}>
                  {method.name} - 
                  {method.type === 'free' ? 'Free' : 
                   method.type === 'flat' ? `$${method.flat_rate.toFixed(2)}` : 
                   'Calculated at checkout'}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="product-categories">
          {product.categories.map(category => (
            <span key={category} className="category-tag">{category}</span>
          ))}
        </div>
        
        <div className="product-actions">
          <div className="quantity-selector">
            <button 
              className="quantity-button"
              onClick={decrementQuantity}
              disabled={quantity <= 1 || product.stockQuantity <= 0}
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max={product.stockQuantity}
              value={quantity}
              onChange={handleQuantityChange}
              className="quantity-input"
              disabled={product.stockQuantity <= 0}
            />
            <button 
              className="quantity-button"
              onClick={incrementQuantity}
              disabled={quantity >= product.stockQuantity || product.stockQuantity <= 0}
            >
              +
            </button>
          </div>
          
          <button 
            className={`add-to-cart-button ${addedToCart ? 'added' : ''}`}
            onClick={addToCart}
            disabled={addedToCart || product.stockQuantity <= 0}
          >
            {addedToCart ? 'Added to Cart ✓' : 'Add to Cart'}
          </button>
          
          <button 
            className="wishlist-button"
            onClick={addToWishlist}
          >
            Add to Wishlist
          </button>
        </div>
        
        {addedToCart && (
          <div className="cart-notification">
            <p>Item added to cart!</p>
            <Link to="/cart" className="view-cart-link">View Cart</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Product;
