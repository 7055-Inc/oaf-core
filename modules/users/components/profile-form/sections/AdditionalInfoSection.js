/**
 * Additional Information Section
 * Languages, education, awards, memberships
 */

import { useProfileForm } from '../ProfileFormContext';

export function getAdditionalInfoSummary(formData) {
  const parts = [];
  if (formData.languages_known?.length) parts.push(`${formData.languages_known.length} languages`);
  if (formData.education?.length) parts.push(`${formData.education.length} education levels`);
  
  if (parts.length === 0) return null;
  return parts.join(', ');
}

export default function AdditionalInfoSection() {
  const { formData, updateField, LANGUAGES, EDUCATION_LEVELS } = useProfileForm();

  const handleMultiSelect = (fieldName, selectedOptions) => {
    const values = Array.from(selectedOptions, option => option.value);
    updateField(fieldName, values);
  };

  return (
    <div className="form-section">
      <div className="form-group">
        <label className="form-label">Languages Known</label>
        <select
          multiple
          className="form-select-multiple"
          value={Array.isArray(formData.languages_known) ? formData.languages_known : []}
          onChange={(e) => handleMultiSelect('languages_known', e.target.selectedOptions)}
        >
          {LANGUAGES.map(language => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
        <span className="form-help-text">
          Hold Ctrl/Cmd to select multiple languages
        </span>
        {formData.languages_known?.length > 0 && (
          <div className="form-selected-items">
            Selected: {formData.languages_known.join(', ')}
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label className="form-label">Education Level</label>
        <select
          multiple
          className="form-select-multiple"
          value={Array.isArray(formData.education) ? formData.education : []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            // Keep in order
            const ordered = EDUCATION_LEVELS.filter(level => selected.includes(level));
            updateField('education', ordered);
          }}
        >
          {EDUCATION_LEVELS.map(level => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <span className="form-help-text">
          Hold Ctrl/Cmd to select multiple levels
        </span>
        {formData.education?.length > 0 && (
          <div className="form-selected-items">
            Selected: {formData.education.join(', ')}
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label className="form-label">Awards & Recognition</label>
        <textarea
          className="form-textarea"
          value={formData.awards}
          onChange={(e) => updateField('awards', e.target.value)}
          rows="3"
          placeholder="List your awards, honors, and recognition..."
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Professional Memberships</label>
        <textarea
          className="form-textarea"
          value={formData.memberships}
          onChange={(e) => updateField('memberships', e.target.value)}
          rows="3"
          placeholder="List your professional memberships, organizations, and associations..."
        />
      </div>
    </div>
  );
}
