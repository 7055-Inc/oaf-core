/**
 * Artist Profile Section
 * Artist-specific fields: biography, categories, mediums, business info, studio
 * Only shown to artists and admins
 */

import { useProfileForm } from '../ProfileFormContext';
import { getProductCategories, getArtMediums } from '../data/artistOptions';

export function getArtistSummary(formData) {
  const parts = [];
  if (formData.artist_business_name) parts.push(formData.artist_business_name);
  if (formData.art_categories?.length) parts.push(`${formData.art_categories.length} categories`);
  
  if (parts.length === 0) return null;
  return parts.join(' • ');
}

export default function ArtistProfileSection() {
  const { formData, updateField, imageFiles, handleFileChange } = useProfileForm();
  
  const categories = getProductCategories();
  const mediums = getArtMediums();

  const handleMultiSelect = (fieldName, selectedOptions, transform = (v) => v) => {
    const values = Array.from(selectedOptions, option => transform(option.value));
    updateField(fieldName, values);
  };

  // Build hierarchical category display name
  const getCategoryDisplayName = (category) => {
    if (!category.parent_id) return category.name;
    
    const parent = categories.find(c => c.id === category.parent_id);
    if (!parent) return category.name;
    
    if (parent.parent_id) {
      const grandparent = categories.find(c => c.id === parent.parent_id);
      if (grandparent) {
        return `${grandparent.name} → ${parent.name} → ${category.name}`;
      }
    }
    return `${parent.name} → ${category.name}`;
  };

  return (
    <div className="form-section">
      {/* Artist Biography */}
      <div className="form-group">
        <label className="form-label">Artist Biography</label>
        <textarea
          className="form-textarea"
          value={formData.artist_biography}
          onChange={(e) => updateField('artist_biography', e.target.value)}
          rows="4"
          placeholder="Tell the world about your artistic journey..."
        />
      </div>
      
      {/* Categories & Mediums */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Art Categories</label>
          <select
            multiple
            className="form-select-multiple"
            value={(formData.art_categories || []).map(String)}
            onChange={(e) => handleMultiSelect('art_categories', e.target.selectedOptions, (v) => parseInt(v))}
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {getCategoryDisplayName(category)}
              </option>
            ))}
          </select>
          <span className="form-help-text">Hold Ctrl/Cmd to select multiple</span>
        </div>
        
        <div className="form-group">
          <label className="form-label">Art Mediums & Materials</label>
          <select
            multiple
            className="form-select-multiple"
            value={formData.art_mediums || []}
            onChange={(e) => handleMultiSelect('art_mediums', e.target.selectedOptions)}
          >
            {mediums.map(medium => (
              <option key={medium} value={medium}>
                {medium}
              </option>
            ))}
          </select>
          <span className="form-help-text">Hold Ctrl/Cmd to select multiple</span>
        </div>
      </div>
      
      {/* Business Info */}
      <h4 className="form-section-title">Business Information</h4>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Business Name (DBA)</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_business_name}
            onChange={(e) => updateField('artist_business_name', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Legal Business Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_legal_name}
            onChange={(e) => updateField('artist_legal_name', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Tax ID
            <span className="form-hint" title="Not required in AK, DE, MT, NH, OR">ⓘ</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_tax_id}
            onChange={(e) => updateField('artist_tax_id', e.target.value)}
          />
        </div>
      </div>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Business Phone</label>
          <input
            type="tel"
            className="form-input"
            value={formData.artist_business_phone}
            onChange={(e) => updateField('artist_business_phone', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Business Website</label>
          <input
            type="url"
            className="form-input"
            value={formData.artist_business_website}
            onChange={(e) => updateField('artist_business_website', e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Customer Contact Email</label>
          <input
            type="email"
            className="form-input"
            value={formData.customer_service_email}
            onChange={(e) => updateField('customer_service_email', e.target.value)}
          />
        </div>
      </div>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Founding Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.artist_founding_date}
            onChange={(e) => updateField('artist_founding_date', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Do Custom Work?</label>
          <label className="form-toggle">
            <input
              type="checkbox"
              checked={formData.does_custom === 'yes'}
              onChange={(e) => updateField('does_custom', e.target.checked ? 'yes' : 'no')}
            />
            <span className="form-toggle-slider"></span>
            <span className="form-toggle-label">{formData.does_custom === 'yes' ? 'Yes' : 'No'}</span>
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange('logo_image', e.target.files[0])}
            className="form-input-file"
          />
          {formData.logo_path && !imageFiles.logo_image && (
            <img src={formData.logo_path} alt="Logo" className="form-image-preview-small" />
          )}
        </div>
      </div>
      
      {formData.does_custom === 'yes' && (
        <div className="form-group">
          <label className="form-label">Custom Work Details</label>
          <textarea
            className="form-textarea"
            value={formData.custom_details}
            onChange={(e) => updateField('custom_details', e.target.value)}
            rows="3"
            placeholder="Describe the types of custom work you offer..."
          />
        </div>
      )}
      
      {/* Studio Address */}
      <h4 className="form-section-title">Studio Address</h4>
      
      <div className="form-group">
        <label className="form-label">Studio Address Line 1</label>
        <input
          type="text"
          className="form-input"
          value={formData.studio_address_line1}
          onChange={(e) => updateField('studio_address_line1', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Studio Address Line 2</label>
        <input
          type="text"
          className="form-input"
          value={formData.studio_address_line2}
          onChange={(e) => updateField('studio_address_line2', e.target.value)}
        />
      </div>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">City</label>
          <input
            type="text"
            className="form-input"
            value={formData.studio_city}
            onChange={(e) => updateField('studio_city', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input
            type="text"
            className="form-input"
            value={formData.studio_state}
            onChange={(e) => updateField('studio_state', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Zip</label>
          <input
            type="text"
            className="form-input"
            value={formData.studio_zip}
            onChange={(e) => updateField('studio_zip', e.target.value)}
          />
        </div>
      </div>
      
      {/* Business Social Media */}
      <h4 className="form-section-title">Business Social Media</h4>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Facebook</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_business_social_facebook?.replace('https://facebook.com/', '') || ''}
            onChange={(e) => updateField('artist_business_social_facebook', e.target.value ? `https://facebook.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Instagram</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_business_social_instagram?.replace('https://instagram.com/', '') || ''}
            onChange={(e) => updateField('artist_business_social_instagram', e.target.value ? `https://instagram.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">TikTok</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_business_social_tiktok?.replace('https://tiktok.com/@', '') || ''}
            onChange={(e) => updateField('artist_business_social_tiktok', e.target.value ? `https://tiktok.com/@${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">X (Twitter)</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_business_social_twitter?.replace('https://x.com/', '') || ''}
            onChange={(e) => updateField('artist_business_social_twitter', e.target.value ? `https://x.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Pinterest</label>
          <input
            type="text"
            className="form-input"
            value={formData.artist_business_social_pinterest?.replace('https://pinterest.com/', '') || ''}
            onChange={(e) => updateField('artist_business_social_pinterest', e.target.value ? `https://pinterest.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
      </div>
    </div>
  );
}
