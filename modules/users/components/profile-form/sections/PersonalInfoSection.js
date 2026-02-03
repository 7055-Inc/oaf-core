/**
 * Personal Information Section
 * First name, last name, display name, phone, dates, etc.
 */

import { useProfileForm } from '../ProfileFormContext';

export function getPersonalInfoSummary(formData) {
  if (!formData.first_name || !formData.last_name) return null;
  const name = formData.display_name || `${formData.first_name} ${formData.last_name}`;
  return name;
}

export default function PersonalInfoSection() {
  const { formData, updateField, TIMEZONES } = useProfileForm();

  return (
    <div className="form-section">
      {/* Row 1: First Name | Last Name */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label required">First Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label required">Last Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
            required
          />
        </div>
      </div>
      
      {/* Row 2: Display Name | Phone */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">
            Display Name
            <span className="form-hint" title="This is how you will appear to other users">ⓘ</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.display_name}
            onChange={(e) => updateField('display_name', e.target.value)}
            placeholder="How you want to be known"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input
            type="tel"
            className="form-input"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>
      </div>
      
      {/* Row 3: Birth Date | Gender | Nationality | Timezone */}
      <div className="form-grid-4">
        <div className="form-group">
          <label className="form-label">Birth Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.birth_date}
            onChange={(e) => updateField('birth_date', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Gender
            <span className="form-hint" title="Optional - used for analytics only">ⓘ</span>
          </label>
          <select
            className="form-select"
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Custom">Custom</option>
            <option value="Prefer Not to Say">Prefer Not to Say</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">
            Nationality
            <span className="form-hint" title="Optional - used for analytics only">ⓘ</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.nationality}
            onChange={(e) => updateField('nationality', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Timezone</label>
          <select
            className="form-select"
            value={formData.timezone}
            onChange={(e) => updateField('timezone', e.target.value)}
          >
            <option value="">Select timezone...</option>
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Row 4: Job Title | Website */}
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">
            Job Title
            <span className="form-hint" title="Optional - used for analytics only">ⓘ</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.job_title}
            onChange={(e) => updateField('job_title', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Website</label>
          <input
            type="url"
            className="form-input"
            value={formData.website}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="https://"
          />
        </div>
      </div>
      
      {/* Row 5: About Me */}
      <div className="form-group">
        <label className="form-label">About Me</label>
        <textarea
          className="form-textarea"
          value={formData.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          rows="4"
          placeholder="Tell us about yourself..."
        />
      </div>
    </div>
  );
}
