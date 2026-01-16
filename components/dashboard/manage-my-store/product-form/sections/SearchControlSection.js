import { useState } from 'react';
import { useProductForm } from '../ProductFormContext';

export default function SearchControlSection() {
  const { formData, updateField, userData } = useProductForm();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Only show advanced section to admins
  const isAdmin = userData?.user_type === 'admin';

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '13px',
    color: '#333'
  };

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        Control how your product appears in search results and shopping feeds.
      </p>

      {/* Meta Description */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Search Engine Results Description
        </label>
        <textarea
          value={formData.meta_description || ''}
          onChange={e => {
            // Limit to 200 characters
            if (e.target.value.length <= 200) {
              updateField('meta_description', e.target.value);
            }
          }}
          style={{
            ...inputStyle,
            minHeight: '80px',
            resize: 'vertical'
          }}
          placeholder="Write a compelling description that will appear in Google search results. This helps customers decide to click on your product."
          maxLength={200}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '6px', 
          fontSize: '12px' 
        }}>
          <span style={{ color: '#666' }}>
            This appears below your product title in search results
          </span>
          <span style={{ 
            color: (formData.meta_description?.length || 0) > 180 ? '#dc3545' : '#666'
          }}>
            {formData.meta_description?.length || 0}/200
          </span>
        </div>
        
        {/* Preview */}
        {formData.meta_description && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
              <i className="fas fa-search" style={{ marginRight: '6px' }}></i> Search Result Preview
            </div>
            <div style={{ 
              color: '#1a0dab', 
              fontSize: '16px', 
              fontWeight: '400',
              marginBottom: '4px',
              fontFamily: 'Arial, sans-serif'
            }}>
              {formData.name || 'Product Title'} | Brakebee
            </div>
            <div style={{ 
              color: '#006621', 
              fontSize: '13px',
              marginBottom: '4px',
              fontFamily: 'Arial, sans-serif'
            }}>
              brakebee.com › products
            </div>
            <div style={{ 
              color: '#545454', 
              fontSize: '13px',
              lineHeight: '1.4',
              fontFamily: 'Arial, sans-serif'
            }}>
              {formData.meta_description}
            </div>
          </div>
        )}
      </div>

      {/* Product Category Path */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          Product Category Path
        </label>
        <select
          value={formData.google_product_category || ''}
          onChange={e => updateField('google_product_category', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Select a category...</option>
          <optgroup label="Fine Art">
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Craft Kits">Art & Craft Kits</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Drawing & Painting">Drawing & Painting</option>
            <option value="Home & Garden > Decor > Artwork > Paintings">Paintings</option>
            <option value="Home & Garden > Decor > Artwork > Posters, Prints & Visual Artwork">Prints & Visual Artwork</option>
            <option value="Home & Garden > Decor > Artwork > Sculptures & Statues">Sculptures & Statues</option>
            <option value="Home & Garden > Decor > Artwork > Mixed Media & Collage Art">Mixed Media & Collage</option>
          </optgroup>
          <optgroup label="Photography">
            <option value="Home & Garden > Decor > Artwork > Photographs">Photographs</option>
            <option value="Cameras & Optics > Photography > Photo Prints">Photo Prints</option>
          </optgroup>
          <optgroup label="Handmade & Crafts">
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Fiber Arts">Fiber Arts & Textiles</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Ceramics & Pottery">Ceramics & Pottery</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Jewelry Making">Jewelry Making</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Leatherworking">Leatherworking</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Woodworking">Woodworking</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Glasswork">Glasswork</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Metalworking">Metalworking</option>
            <option value="Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Paper Crafts">Paper Crafts</option>
          </optgroup>
          <optgroup label="💎 Jewelry & Accessories">
            <option value="Apparel & Accessories > Jewelry > Necklaces">Necklaces</option>
            <option value="Apparel & Accessories > Jewelry > Earrings">Earrings</option>
            <option value="Apparel & Accessories > Jewelry > Bracelets">Bracelets</option>
            <option value="Apparel & Accessories > Jewelry > Rings">Rings</option>
            <option value="Apparel & Accessories > Jewelry > Brooches & Pins">Brooches & Pins</option>
          </optgroup>
          <optgroup label="🏠 Home & Decor">
            <option value="Home & Garden > Decor > Decorative Accents">Decorative Accents</option>
            <option value="Home & Garden > Decor > Wall Decor">Wall Decor</option>
            <option value="Home & Garden > Decor > Clocks">Clocks</option>
            <option value="Home & Garden > Decor > Mirrors">Mirrors</option>
            <option value="Home & Garden > Decor > Vases">Vases</option>
            <option value="Home & Garden > Decor > Candles & Candle Holders">Candles & Holders</option>
          </optgroup>
          <optgroup label="📚 Stationery & Paper">
            <option value="Office Supplies > General Supplies > Paper Products > Stationery">Stationery</option>
            <option value="Office Supplies > General Supplies > Paper Products > Greeting Cards">Greeting Cards</option>
            <option value="Office Supplies > General Supplies > Paper Products > Calendars">Calendars</option>
            <option value="Office Supplies > General Supplies > Paper Products > Notebooks & Journals">Notebooks & Journals</option>
          </optgroup>
          <optgroup label="👕 Apparel">
            <option value="Apparel & Accessories > Clothing">Clothing (General)</option>
            <option value="Apparel & Accessories > Clothing > Shirts & Tops">Shirts & Tops</option>
            <option value="Apparel & Accessories > Clothing > Dresses">Dresses</option>
            <option value="Apparel & Accessories > Clothing Accessories > Scarves & Shawls">Scarves & Shawls</option>
            <option value="Apparel & Accessories > Handbags, Wallets & Cases > Handbags">Handbags</option>
          </optgroup>
          <optgroup label="🎁 Gifts & Collectibles">
            <option value="Home & Garden > Decor > Collectibles">Collectibles</option>
            <option value="Arts & Entertainment > Party & Celebration > Gift Wrapping">Gift Items</option>
            <option value="Toys & Games > Toys > Dolls & Action Figures">Dolls & Figurines</option>
          </optgroup>
        </select>
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
          Choose the category that best describes your product for search visibility
        </div>
      </div>

      {/* Advanced Settings Toggle - Admin Only */}
      {isAdmin && (
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--primary-color, #055474)',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ 
            transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            display: 'inline-block'
          }}>
            ▶
          </span>
          Advanced: Product Tags
        </button>
        
        {showAdvanced && (
          <div style={{ 
            marginTop: '12px', 
            padding: '16px', 
            background: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Add tags to highlight product features in shopping feeds and ads.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Highlight
                </label>
                <input
                  type="text"
                  value={formData.custom_label_0 || ''}
                  onChange={e => updateField('custom_label_0', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
                  placeholder="e.g., Bestseller, Featured"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Season/Event
                </label>
                <input
                  type="text"
                  value={formData.custom_label_1 || ''}
                  onChange={e => updateField('custom_label_1', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
                  placeholder="e.g., Holiday, Summer"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Price Tier
                </label>
                <input
                  type="text"
                  value={formData.custom_label_2 || ''}
                  onChange={e => updateField('custom_label_2', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
                  placeholder="e.g., Premium, Budget"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Collection
                </label>
                <input
                  type="text"
                  value={formData.custom_label_3 || ''}
                  onChange={e => updateField('custom_label_3', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
                  placeholder="e.g., Nature Series, Abstract"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Status
                </label>
                <input
                  type="text"
                  value={formData.custom_label_4 || ''}
                  onChange={e => updateField('custom_label_4', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
                  placeholder="e.g., New Arrival, Clearance"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// Summary for collapsed state
export function getSearchControlSummary(formData) {
  const parts = [];
  if (formData.meta_description) {
    parts.push('Meta description set');
  }
  if (formData.google_product_category) {
    const cat = formData.google_product_category;
    parts.push(cat.length > 30 ? cat.substring(0, 27) + '...' : cat);
  }
  return parts.length > 0 ? parts.join(' • ') : null;
}

