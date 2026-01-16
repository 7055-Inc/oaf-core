import { useEventForm } from '../EventFormContext';

export function getBasicInfoSummary(formData) {
  if (!formData.title) return null;
  return `${formData.title}`;
}

export default function BasicInfoSection() {
  const { formData, updateField, eventTypes } = useEventForm();

  return (
    <div>
      {/* Event Title */}
      <div style={{ marginBottom: '16px' }}>
        <label>Event Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g. Springfield Art Festival 2024"
          required
        />
      </div>

      {/* Event Type */}
      <div style={{ marginBottom: '16px' }}>
        <label>Event Type *</label>
        <select
          value={formData.event_type_id}
          onChange={(e) => updateField('event_type_id', e.target.value)}
          required
        >
          <option value="">Select Event Type</option>
          {eventTypes.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
      </div>

      {/* Short Description */}
      <div style={{ marginBottom: '16px' }}>
        <label>Short Description</label>
        <textarea
          value={formData.short_description}
          onChange={(e) => updateField('short_description', e.target.value)}
          placeholder="Brief description for listings (200 characters max)"
          maxLength={200}
          rows={2}
        />
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'right', marginTop: '4px' }}>
          {formData.short_description?.length || 0}/200
        </div>
      </div>

      {/* Full Description */}
      <div style={{ marginBottom: '16px' }}>
        <label>Full Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Detailed event description, requirements, and information"
          rows={5}
        />
      </div>

      {/* Fees Row */}
      <div className="form-grid-2">
        <div>
          <label>Admission Fee (for attendees)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
            <input
              type="number"
              value={formData.admission_fee}
              onChange={(e) => updateField('admission_fee', e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              style={{ paddingLeft: '24px' }}
            />
          </div>
        </div>

        <div>
          <label>Parking Fee</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>$</span>
            <input
              type="number"
              value={formData.parking_fee}
              onChange={(e) => updateField('parking_fee', e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              style={{ paddingLeft: '24px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
