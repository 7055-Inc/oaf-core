import { useEventForm } from '../EventFormContext';

export function getSettingsSummary(formData) {
  const parts = [];
  if (formData.allow_applications) {
    parts.push('Accepting applications');
  } else {
    parts.push('Not accepting applications');
  }
  if (formData.max_artists) parts.push(`Max ${formData.max_artists} artists`);
  return parts.join(', ');
}

export default function SettingsSection() {
  const { formData, updateField } = useEventForm();

  return (
    <div>
      {/* Application Status */}
      <div style={{ marginBottom: '16px' }}>
        <label>Application Status</label>
        <select
          value={formData.application_status}
          onChange={(e) => updateField('application_status', e.target.value)}
        >
          <option value="not_accepting">Not Accepting Applications</option>
          <option value="accepting">Accepting Applications</option>
          <option value="closed">Applications Closed</option>
          <option value="jurying">In Jury Review</option>
          <option value="artists_announced">Artists Announced</option>
          <option value="event_completed">Event Completed</option>
        </select>
      </div>

      {/* Allow Applications Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.allow_applications}
            onChange={(e) => updateField('allow_applications', e.target.checked)}
            style={{ width: 'auto', margin: 0 }}
          />
          <span>Allow Artists to Apply Online</span>
        </label>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', marginLeft: '24px' }}>
          Enable this to let artists submit applications through the platform
        </div>
      </div>

      {/* Max Artists and Applications */}
      <div className="form-grid-2">
        <div>
          <label>Maximum Artists</label>
          <input
            type="number"
            value={formData.max_artists}
            onChange={(e) => updateField('max_artists', e.target.value)}
            min="1"
            placeholder="Unlimited"
          />
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Leave blank for unlimited
          </div>
        </div>

        <div>
          <label>Maximum Applications</label>
          <input
            type="number"
            value={formData.max_applications}
            onChange={(e) => updateField('max_applications', e.target.value)}
            min="1"
            placeholder="Unlimited"
          />
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Leave blank for unlimited
          </div>
        </div>
      </div>

      {formData.allow_applications && (
        <div className="warning-alert" style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <i className="fas fa-info-circle" style={{ marginTop: '2px' }}></i>
          <span>
            Configure application requirements (fees, deadlines, required fields) in the "Applications" section below.
          </span>
        </div>
      )}
    </div>
  );
}
