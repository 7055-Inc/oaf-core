/**
 * Address Section
 * Billing address fields
 */

import { useProfileForm } from '../ProfileFormContext';

export function getAddressSummary(formData) {
  if (!formData.city) return null;
  const parts = [formData.city, formData.state].filter(Boolean);
  return parts.join(', ');
}

export default function AddressSection() {
  const { formData, updateField } = useProfileForm();

  return (
    <div className="form-section">
      <div className="form-group">
        <label className="form-label">Address Line 1</label>
        <input
          type="text"
          className="form-input"
          value={formData.address_line1}
          onChange={(e) => updateField('address_line1', e.target.value)}
          placeholder="Street address"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Address Line 2</label>
        <input
          type="text"
          className="form-input"
          value={formData.address_line2}
          onChange={(e) => updateField('address_line2', e.target.value)}
          placeholder="Apt, suite, unit, etc."
        />
      </div>
      
      <div className="form-grid-3">
        <div className="form-group">
          <label className="form-label">City</label>
          <input
            type="text"
            className="form-input"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input
            type="text"
            className="form-input"
            value={formData.state}
            onChange={(e) => updateField('state', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Postal Code</label>
          <input
            type="text"
            className="form-input"
            value={formData.postal_code}
            onChange={(e) => updateField('postal_code', e.target.value)}
          />
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Country</label>
        <input
          type="text"
          className="form-input"
          value={formData.country}
          onChange={(e) => updateField('country', e.target.value)}
        />
      </div>
    </div>
  );
}
