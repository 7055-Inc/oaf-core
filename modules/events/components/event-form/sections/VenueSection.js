import { useEventForm } from '../EventFormContext';

export function getVenueSummary(formData) {
  const parts = [];
  if (formData.venue_name) parts.push(formData.venue_name);
  if (formData.venue_city) parts.push(formData.venue_city);
  if (formData.venue_state) parts.push(formData.venue_state);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function VenueSection() {
  const { formData, updateField } = useEventForm();

  return (
    <div>
      {/* Venue Name */}
      <div style={{ marginBottom: '16px' }}>
        <label>Venue Name</label>
        <input
          type="text"
          value={formData.venue_name}
          onChange={(e) => updateField('venue_name', e.target.value)}
          placeholder="e.g. Central Park, Downtown Gallery"
        />
      </div>

      {/* Street Address */}
      <div style={{ marginBottom: '16px' }}>
        <label>Street Address</label>
        <input
          type="text"
          value={formData.venue_address}
          onChange={(e) => updateField('venue_address', e.target.value)}
          placeholder="123 Main Street"
        />
      </div>

      {/* City, State, ZIP */}
      <div className="form-grid-3" style={{ marginBottom: '16px' }}>
        <div>
          <label>City</label>
          <input
            type="text"
            value={formData.venue_city}
            onChange={(e) => updateField('venue_city', e.target.value)}
            placeholder="City"
          />
        </div>

        <div>
          <label>State</label>
          <input
            type="text"
            value={formData.venue_state}
            onChange={(e) => updateField('venue_state', e.target.value)}
            placeholder="e.g. IL, CA, NY"
            maxLength={2}
          />
        </div>

        <div>
          <label>ZIP Code</label>
          <input
            type="text"
            value={formData.venue_zip}
            onChange={(e) => updateField('venue_zip', e.target.value)}
            placeholder="12345"
          />
        </div>
      </div>

      {/* Venue Capacity */}
      <div style={{ marginBottom: '16px' }}>
        <label>Venue Capacity</label>
        <input
          type="number"
          value={formData.venue_capacity}
          onChange={(e) => updateField('venue_capacity', e.target.value)}
          min="1"
          placeholder="Expected number of attendees"
        />
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          Helps with planning and promotion
        </div>
      </div>

      {/* Parking Information */}
      <div style={{ marginBottom: '16px' }}>
        <label>Parking Information</label>
        <textarea
          value={formData.parking_info}
          onChange={(e) => updateField('parking_info', e.target.value)}
          placeholder="Parking availability, restrictions, cost, etc."
          rows={3}
        />
      </div>

      {/* Accessibility Information */}
      <div>
        <label>Accessibility Information</label>
        <textarea
          value={formData.accessibility_info}
          onChange={(e) => updateField('accessibility_info', e.target.value)}
          placeholder="Wheelchair access, special accommodations, etc."
          rows={3}
        />
      </div>
    </div>
  );
}
