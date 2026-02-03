/**
 * Community Preferences Section
 * Art preferences for community members: styles, interests, colors
 * Only shown to community members and admins
 */

import { useProfileForm } from '../ProfileFormContext';
import { getArtStylePreferences, getArtInterests, getFavoriteColors } from '../data/communityOptions';

export function getCommunitySummary(formData) {
  const parts = [];
  if (formData.art_style_preferences?.length) parts.push(`${formData.art_style_preferences.length} styles`);
  if (formData.art_interests?.length) parts.push(`${formData.art_interests.length} interests`);
  
  if (parts.length === 0) return null;
  return parts.join(', ');
}

export default function CommunityPreferencesSection() {
  const { formData, updateField } = useProfileForm();
  
  const stylePreferences = getArtStylePreferences();
  const artInterests = getArtInterests();
  const colors = getFavoriteColors();

  const handleMultiSelect = (fieldName, selectedOptions) => {
    const values = Array.from(selectedOptions, option => option.value);
    updateField(fieldName, values.sort());
  };

  return (
    <div className="form-section">
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Art Style Preferences</label>
          <select
            multiple
            className="form-select-multiple form-select-tall"
            value={formData.art_style_preferences || []}
            onChange={(e) => handleMultiSelect('art_style_preferences', e.target.selectedOptions)}
          >
            {stylePreferences.map(style => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
          <span className="form-help-text">Visual styles, movements & aesthetics you enjoy</span>
          {formData.art_style_preferences?.length > 0 && (
            <div className="form-selected-items">
              Selected: {formData.art_style_preferences.join(', ')}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Art Interests</label>
          <select
            multiple
            className="form-select-multiple form-select-tall"
            value={formData.art_interests || []}
            onChange={(e) => handleMultiSelect('art_interests', e.target.selectedOptions)}
          >
            {artInterests.map(interest => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
          <span className="form-help-text">Mediums, activities, themes & subjects you enjoy</span>
          {formData.art_interests?.length > 0 && (
            <div className="form-selected-items">
              Selected: {formData.art_interests.join(', ')}
            </div>
          )}
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Favorite Colors</label>
        <select
          multiple
          className="form-select-multiple"
          value={formData.favorite_colors || []}
          onChange={(e) => handleMultiSelect('favorite_colors', e.target.selectedOptions)}
        >
          {colors.map(color => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        <span className="form-help-text">
          Select your favorite colors from our comprehensive palette
        </span>
        {formData.favorite_colors?.length > 0 && (
          <div className="form-selected-items">
            Selected: {formData.favorite_colors.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
