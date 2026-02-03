/**
 * Promoter Profile Section
 * Promoter-specific fields: organization info, events, office address
 * Only shown to promoters and admins
 */

import { useProfileForm } from '../ProfileFormContext';

export function getPromoterSummary(formData) {
  const parts = [];
  if (formData.promoter_business_name) parts.push(formData.promoter_business_name);
  if (formData.is_non_profit === 'yes') parts.push('Non-Profit');
  
  if (parts.length === 0) return null;
  return parts.join(' • ');
}

export default function PromoterProfileSection() {
  const { formData, updateField, imageFiles, handleFileChange } = useProfileForm();

  return (
    <div className="form-section">
      {/* Business Info */}
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Organization Name (DBA)</label>
          <input
            type="text"
            className="form-input"
            value={formData.promoter_business_name}
            onChange={(e) => updateField('promoter_business_name', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Legal Business Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.promoter_legal_name}
            onChange={(e) => updateField('promoter_legal_name', e.target.value)}
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
            value={formData.promoter_tax_id}
            onChange={(e) => updateField('promoter_tax_id', e.target.value)}
          />
        </div>
      </div>
      
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Business Phone</label>
          <input
            type="tel"
            className="form-input"
            value={formData.promoter_business_phone}
            onChange={(e) => updateField('promoter_business_phone', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Business Website</label>
          <input
            type="url"
            className="form-input"
            value={formData.promoter_business_website}
            onChange={(e) => updateField('promoter_business_website', e.target.value)}
            placeholder="https://"
          />
        </div>
      </div>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">Founding Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.promoter_founding_date}
            onChange={(e) => updateField('promoter_founding_date', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Organization Size</label>
          <input
            type="text"
            className="form-input"
            value={formData.organization_size}
            onChange={(e) => updateField('organization_size', e.target.value)}
            placeholder="e.g., 1-10 employees"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Non-Profit Organization?</label>
          <select
            className="form-select"
            value={formData.is_non_profit}
            onChange={(e) => updateField('is_non_profit', e.target.value)}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
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
      
      {/* Event Info */}
      <h4 className="form-section-title">Event Information</h4>
      
      <div className="form-group">
        <label className="form-label">Sponsorship Options & Packages</label>
        <textarea
          className="form-textarea"
          value={formData.sponsorship_options}
          onChange={(e) => updateField('sponsorship_options', e.target.value)}
          rows="4"
          placeholder="Describe your sponsorship packages and pricing options..."
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Upcoming Events</label>
        <textarea
          className="form-textarea"
          value={formData.upcoming_events}
          onChange={(e) => updateField('upcoming_events', e.target.value)}
          rows="4"
          placeholder="List your upcoming events and dates..."
        />
      </div>
      
      {/* Office Address */}
      <h4 className="form-section-title">Office Address</h4>
      
      <div className="form-group">
        <label className="form-label">Office Address Line 1</label>
        <input
          type="text"
          className="form-input"
          value={formData.office_address_line1}
          onChange={(e) => updateField('office_address_line1', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Office Address Line 2</label>
        <input
          type="text"
          className="form-input"
          value={formData.office_address_line2}
          onChange={(e) => updateField('office_address_line2', e.target.value)}
        />
      </div>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">City</label>
          <input
            type="text"
            className="form-input"
            value={formData.office_city}
            onChange={(e) => updateField('office_city', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input
            type="text"
            className="form-input"
            value={formData.office_state}
            onChange={(e) => updateField('office_state', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Zip</label>
          <input
            type="text"
            className="form-input"
            value={formData.office_zip}
            onChange={(e) => updateField('office_zip', e.target.value)}
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
            value={formData.promoter_business_social_facebook?.replace('https://facebook.com/', '') || ''}
            onChange={(e) => updateField('promoter_business_social_facebook', e.target.value ? `https://facebook.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Instagram</label>
          <input
            type="text"
            className="form-input"
            value={formData.promoter_business_social_instagram?.replace('https://instagram.com/', '') || ''}
            onChange={(e) => updateField('promoter_business_social_instagram', e.target.value ? `https://instagram.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">TikTok</label>
          <input
            type="text"
            className="form-input"
            value={formData.promoter_business_social_tiktok?.replace('https://tiktok.com/@', '') || ''}
            onChange={(e) => updateField('promoter_business_social_tiktok', e.target.value ? `https://tiktok.com/@${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">X (Twitter)</label>
          <input
            type="text"
            className="form-input"
            value={formData.promoter_business_social_twitter?.replace('https://x.com/', '') || ''}
            onChange={(e) => updateField('promoter_business_social_twitter', e.target.value ? `https://x.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Pinterest</label>
          <input
            type="text"
            className="form-input"
            value={formData.promoter_business_social_pinterest?.replace('https://pinterest.com/', '') || ''}
            onChange={(e) => updateField('promoter_business_social_pinterest', e.target.value ? `https://pinterest.com/${e.target.value}` : '')}
            placeholder="username"
          />
        </div>
      </div>
    </div>
  );
}
