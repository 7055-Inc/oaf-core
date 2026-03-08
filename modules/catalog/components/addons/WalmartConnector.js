/**
 * Walmart Connector (Catalog Addon)
 * Vendor-facing: list products, add/manage Walmart listings.
 * Moved from Manage My Store > Walmart Marketplace.
 * Uses v2 API: /api/v2/catalog/walmart/* (lib/catalog).
 */

import { useState, useEffect } from 'react';
import {
  fetchWalmartCategories,
  fetchWalmartProducts,
  fetchWalmartProduct,
  saveWalmartProduct,
  removeWalmartProduct,
} from '../../../../lib/catalog';

const calculateWalmartPrice = (product) => {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  return (parseFloat(product.price) * 1.2).toFixed(2);
};

export default function WalmartConnector({ userData }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [formData, setFormData] = useState({
    walmart_title: '',
    walmart_description: '',
    walmart_short_description: '',
    walmart_price: '',
    allocated_quantity: '',
    terms_accepted: false,
    walmart_category_id: '',
    walmart_category_path: '',
    walmart_brand: '',
    walmart_manufacturer: '',
    walmart_color: '',
    walmart_size: '',
    walmart_material: '',
    walmart_msrp: '',
    walmart_key_features: ['', '', '', '', ''],
    walmart_shipping_weight: '',
    walmart_shipping_length: '',
    walmart_shipping_width: '',
    walmart_shipping_height: '',
    walmart_tax_code: ''
  });

  useEffect(() => {
    fetchWalmartData();
    fetchCategories();
  }, []);

  const fetchWalmartData = async () => {
    try {
      setLoading(true);
      const data = await fetchWalmartProducts();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching Walmart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWalmartCategories();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const openProductModal = async (product) => {
    try {
      const data = await fetchWalmartProduct(product.id);
      if (data.success) {
        const p = data.product;
        let keyFeatures = ['', '', '', '', ''];
        if (p.walmart_key_features) {
          try {
            const parsed = typeof p.walmart_key_features === 'string'
              ? JSON.parse(p.walmart_key_features)
              : p.walmart_key_features;
            if (Array.isArray(parsed)) {
              keyFeatures = [...parsed, '', '', '', '', ''].slice(0, 5);
            }
          } catch (e) {}
        }
        setFormData({
          walmart_title: p.walmart_title || p.name || '',
          walmart_description: p.walmart_description || p.description || '',
          walmart_short_description: p.walmart_short_description || p.short_description || '',
          walmart_price: p.walmart_price || calculateWalmartPrice(p),
          allocated_quantity: p.allocated_quantity || '',
          terms_accepted: !!p.terms_accepted_at,
          walmart_category_id: p.walmart_category_id || '',
          walmart_category_path: p.walmart_category_path || '',
          walmart_brand: p.walmart_brand || p.vendor_brand || '',
          walmart_manufacturer: p.walmart_manufacturer || '',
          walmart_color: p.walmart_color || '',
          walmart_size: p.walmart_size || '',
          walmart_material: p.walmart_material || '',
          walmart_msrp: p.walmart_msrp || p.price || '',
          walmart_key_features: keyFeatures,
          walmart_shipping_weight: p.walmart_shipping_weight || p.weight || '',
          walmart_shipping_length: p.walmart_shipping_length || p.depth || '',
          walmart_shipping_width: p.walmart_shipping_width || p.width || '',
          walmart_shipping_height: p.walmart_shipping_height || p.height || '',
          walmart_tax_code: p.walmart_tax_code || ''
        });
        setSelectedProduct(p);
        setActiveSection('basic');
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    const category = categories.find(c => c.id === selectedId);
    setFormData({
      ...formData,
      walmart_category_id: selectedId,
      walmart_category_path: category?.path || ''
    });
  };

  const handleKeyFeatureChange = (index, value) => {
    const newFeatures = [...formData.walmart_key_features];
    newFeatures[index] = value;
    setFormData({ ...formData, walmart_key_features: newFeatures });
  };

  const handleAutoFill = () => {
    if (selectedProduct) {
      setFormData({
        ...formData,
        walmart_title: selectedProduct.name || '',
        walmart_description: selectedProduct.description || '',
        walmart_short_description: selectedProduct.short_description || '',
        walmart_price: calculateWalmartPrice(selectedProduct),
        walmart_brand: selectedProduct.vendor_brand || formData.walmart_brand,
        walmart_msrp: selectedProduct.price || '',
        walmart_shipping_weight: selectedProduct.weight || '',
        walmart_shipping_length: selectedProduct.depth || '',
        walmart_shipping_width: selectedProduct.width || '',
        walmart_shipping_height: selectedProduct.height || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.terms_accepted && !selectedProduct.terms_accepted_at) {
      alert('Please accept the Marketplace Connector terms to continue.');
      return;
    }
    if (!formData.walmart_category_id) {
      alert('Please select a Walmart category.');
      return;
    }
    try {
      const cleanedFeatures = formData.walmart_key_features.filter(f => f.trim());
      const submitData = {
        ...formData,
        walmart_key_features: cleanedFeatures.length > 0 ? cleanedFeatures : null
      };
      const data = await saveWalmartProduct(selectedProduct.id, submitData);
      if (data.success) {
        alert('Product added to Walmart marketplace!');
        setModalOpen(false);
        fetchWalmartData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving Walmart product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const handleRemove = async () => {
    const confirmMsg = 'Remove this product from Walmart?\n\nThis product cannot be re-added for 60 days.';
    if (!confirm(confirmMsg)) return;
    try {
      const data = await removeWalmartProduct(selectedProduct.id);
      if (data.success) {
        alert(`Product removed. Cooldown ends: ${new Date(data.cooldown_ends_at).toLocaleDateString()}`);
        setModalOpen(false);
        fetchWalmartData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing product:', error);
      alert('Error removing product. Please try again.');
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'listed') return p.walmart_id && p.is_active;
    if (activeTab === 'pending') return p.walmart_id && p.listing_status === 'pending';
    if (activeTab === 'cooldown') return p.cooldown_ends_at && new Date(p.cooldown_ends_at) > new Date();
    if (activeTab === 'available') return !p.walmart_id;
    return true;
  });

  const stats = {
    total: products.length,
    listed: products.filter(p => p.walmart_id && p.is_active).length,
    pending: products.filter(p => p.walmart_id && p.listing_status === 'pending').length,
    cooldown: products.filter(p => p.cooldown_ends_at && new Date(p.cooldown_ends_at) > new Date()).length,
    available: products.filter(p => !p.walmart_id).length
  };

  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Walmart data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Walmart Marketplace</h2>
        <p style={{ color: '#666', margin: 0 }}>
          List your products on Walmart.com through Brakebee&apos;s seller account.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total Products', value: stats.total, color: '#495057' },
          { label: 'Listed', value: stats.listed, color: '#28a745' },
          { label: 'Pending', value: stats.pending, color: '#ffc107' },
          { label: 'In Cooldown', value: stats.cooldown, color: '#dc3545' },
          { label: 'Available', value: stats.available, color: '#055474' }
        ].map(stat => (
          <div key={stat.label} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dee2e6' }}>
        {['all', 'listed', 'pending', 'cooldown', 'available'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === tab ? '#055474' : 'transparent',
              color: activeTab === tab ? 'white' : '#495057',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}
          >
            {tab} ({stats[tab] ?? stats.total})
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Product</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Your Price</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Walmart Price</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Allocation</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const inCooldown = product.cooldown_ends_at && new Date(product.cooldown_ends_at) > new Date();
              const cooldownDays = inCooldown ? Math.ceil((new Date(product.cooldown_ends_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{product.name}</strong>
                    {product.walmart_title && product.walmart_title !== product.name && (
                      <div style={{ fontSize: '12px', color: '#666' }}>Walmart: {product.walmart_title}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    ${product.price}
                    {product.wholesale_price && <div style={{ fontSize: '11px', color: '#666' }}>WS: ${product.wholesale_price}</div>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {product.walmart_price ? (
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>${product.walmart_price}</span>
                    ) : (
                      <span style={{ color: '#999' }}>${calculateWalmartPrice(product)}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>{product.allocated_quantity || '-'} / {product.inventory_count}</td>
                  <td style={{ padding: '12px' }}>
                    {inCooldown ? (
                      <span style={{ color: '#dc3545' }}>Cooldown {cooldownDays}d</span>
                    ) : product.walmart_id ? (
                      <span style={{ color: product.listing_status === 'listed' ? '#28a745' : product.listing_status === 'pending' ? '#ffc107' : '#666' }}>
                        {product.listing_status === 'listed' ? 'Listed' : product.listing_status === 'pending' ? 'Pending' : product.listing_status}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>Not listed</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {inCooldown ? (
                      <span style={{ color: '#999', fontSize: '12px' }}>Unavailable</span>
                    ) : (
                      <button
                        onClick={() => openProductModal(product)}
                        style={{
                          padding: '6px 12px',
                          background: product.walmart_id ? '#6c757d' : '#055474',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {product.walmart_id ? 'Manage' : 'Add to Walmart'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No products found in this category.</div>
        )}
      </div>

      {/* Product Modal - same sections/fields as original */}
      {modalOpen && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '8px', width: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
              <h3 style={{ margin: 0 }}>{selectedProduct.walmart_id ? 'Manage' : 'Add to'} Walmart: {selectedProduct.name}</h3>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa', flexShrink: 0 }}>
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'category', label: 'Category' },
                { id: 'details', label: 'Details' },
                { id: 'features', label: 'Key Features' },
                { id: 'shipping', label: 'Shipping' }
              ].map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    background: activeSection === section.id ? 'white' : 'transparent',
                    borderBottom: activeSection === section.id ? '2px solid #055474' : '2px solid transparent',
                    cursor: 'pointer',
                    fontWeight: activeSection === section.id ? 'bold' : 'normal',
                    fontSize: '13px'
                  }}
                >
                  {section.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                {activeSection === 'basic' && (
                  <>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                        <div><div style={{ fontSize: '12px', color: '#666' }}>Retail Price</div><div style={{ fontWeight: 'bold' }}>${selectedProduct.price}</div></div>
                        <div><div style={{ fontSize: '12px', color: '#666' }}>Wholesale Price</div><div style={{ fontWeight: 'bold' }}>{selectedProduct.wholesale_price ? `$${selectedProduct.wholesale_price}` : '-'}</div></div>
                        <div><div style={{ fontSize: '12px', color: '#666' }}>Suggested Walmart</div><div style={{ fontWeight: 'bold', color: '#28a745' }}>${calculateWalmartPrice(selectedProduct)}</div></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Walmart Title *</label>
                      <input type="text" value={formData.walmart_title} onChange={e => setFormData({ ...formData, walmart_title: e.target.value })} style={inputStyle} required maxLength={200} />
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{formData.walmart_title.length}/200</div>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Short Description</label>
                      <textarea value={formData.walmart_short_description} onChange={e => setFormData({ ...formData, walmart_short_description: e.target.value })} style={{ ...inputStyle, minHeight: '60px' }} maxLength={500} placeholder="Brief product summary" />
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{formData.walmart_short_description.length}/500</div>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Full Description</label>
                      <textarea value={formData.walmart_description} onChange={e => setFormData({ ...formData, walmart_description: e.target.value })} style={{ ...inputStyle, minHeight: '120px' }} maxLength={4000} />
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{formData.walmart_description.length}/4000</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <label style={labelStyle}>Walmart Price ($) *</label>
                        <input type="number" step="0.01" value={formData.walmart_price} onChange={e => setFormData({ ...formData, walmart_price: e.target.value })} style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>MSRP ($)</label>
                        <input type="number" step="0.01" value={formData.walmart_msrp} onChange={e => setFormData({ ...formData, walmart_msrp: e.target.value })} style={inputStyle} placeholder="Manufacturer suggested" />
                      </div>
                      <div>
                        <label style={labelStyle}>Allocation (max: {selectedProduct.inventory_count || 0})</label>
                        <input type="number" min="0" value={formData.allocated_quantity} onChange={e => setFormData({ ...formData, allocated_quantity: e.target.value })} style={inputStyle} placeholder="Units for Walmart" />
                      </div>
                    </div>
                    <button type="button" onClick={handleAutoFill} style={{ width: '100%', padding: '10px', background: '#e9ecef', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                      Auto-fill from product data
                    </button>
                  </>
                )}
                {activeSection === 'category' && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={labelStyle}>Walmart Category *</label>
                      <select value={formData.walmart_category_id} onChange={handleCategoryChange} style={{ ...inputStyle, cursor: 'pointer' }} required>
                        <option value="">-- Select a Category --</option>
                        {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                      </select>
                      {formData.walmart_category_path && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e9', borderRadius: '4px', fontSize: '13px' }}>{formData.walmart_category_path}</div>
                      )}
                    </div>
                  </>
                )}
                {activeSection === 'details' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <label style={labelStyle}>Brand *</label>
                        <input type="text" value={formData.walmart_brand} onChange={e => setFormData({ ...formData, walmart_brand: e.target.value })} style={inputStyle} required placeholder="Your brand or artist name" />
                      </div>
                      <div>
                        <label style={labelStyle}>Manufacturer</label>
                        <input type="text" value={formData.walmart_manufacturer} onChange={e => setFormData({ ...formData, walmart_manufacturer: e.target.value })} style={inputStyle} placeholder="Manufacturer name" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div><label style={labelStyle}>Color</label><input type="text" value={formData.walmart_color} onChange={e => setFormData({ ...formData, walmart_color: e.target.value })} style={inputStyle} placeholder="e.g., Blue" /></div>
                      <div><label style={labelStyle}>Size</label><input type="text" value={formData.walmart_size} onChange={e => setFormData({ ...formData, walmart_size: e.target.value })} style={inputStyle} placeholder="e.g., 12x16" /></div>
                      <div><label style={labelStyle}>Material</label><input type="text" value={formData.walmart_material} onChange={e => setFormData({ ...formData, walmart_material: e.target.value })} style={inputStyle} placeholder="e.g., Canvas" /></div>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={labelStyle}>Tax Code</label>
                      <select value={formData.walmart_tax_code} onChange={e => setFormData({ ...formData, walmart_tax_code: e.target.value })} style={inputStyle}>
                        <option value="">-- Default Tax --</option>
                        <option value="2038710">Art & Collectibles</option>
                        <option value="2038711">Home Decor</option>
                        <option value="2038712">Handmade Items</option>
                      </select>
                    </div>
                  </>
                )}
                {activeSection === 'features' && (
                  <>
                    <p style={{ marginBottom: '15px', color: '#666' }}>Add up to 5 bullet points (key features).</p>
                    {formData.walmart_key_features.map((feature, index) => (
                      <div key={index} style={{ marginBottom: '10px' }}>
                        <label style={{ ...labelStyle, fontWeight: 'normal' }}>Feature {index + 1}</label>
                        <input type="text" value={feature} onChange={e => handleKeyFeatureChange(index, e.target.value)} style={inputStyle} maxLength={500} placeholder={`Key feature ${index + 1}...`} />
                      </div>
                    ))}
                  </>
                )}
                {activeSection === 'shipping' && (
                  <>
                    <p style={{ marginBottom: '15px', color: '#666' }}>Shipping dimensions (packaged).</p>
                    <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Shipping Weight (lbs)</label><input type="number" step="0.01" value={formData.walmart_shipping_weight} onChange={e => setFormData({ ...formData, walmart_shipping_weight: e.target.value })} style={inputStyle} placeholder="Weight with packaging" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                      <div><label style={labelStyle}>Length (in)</label><input type="number" step="0.1" value={formData.walmart_shipping_length} onChange={e => setFormData({ ...formData, walmart_shipping_length: e.target.value })} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Width (in)</label><input type="number" step="0.1" value={formData.walmart_shipping_width} onChange={e => setFormData({ ...formData, walmart_shipping_width: e.target.value })} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Height (in)</label><input type="number" step="0.1" value={formData.walmart_shipping_height} onChange={e => setFormData({ ...formData, walmart_shipping_height: e.target.value })} style={inputStyle} /></div>
                    </div>
                  </>
                )}
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', flexShrink: 0 }}>
                {!selectedProduct.terms_accepted_at && (
                  <div style={{ marginBottom: '15px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.terms_accepted} onChange={e => setFormData({ ...formData, terms_accepted: e.target.checked })} style={{ marginTop: '4px' }} />
                      <span style={{ fontSize: '13px' }}>I agree to the <a href="/terms/addons" target="_blank" rel="noopener noreferrer" style={{ color: '#055474' }}>Marketplace Connector Terms</a>. Removal triggers a 60-day cooldown.</span>
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  {selectedProduct.walmart_id && selectedProduct.is_active && (
                    <button type="button" onClick={handleRemove} style={{ padding: '12px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove (60-day cooldown)</button>
                  )}
                  <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{selectedProduct.walmart_id ? 'Update' : 'Add to Walmart'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
