import { useEventForm } from '../EventFormContext';

export function getEventDetailsSummary(formData) {
  const parts = [];
  if (formData.age_restrictions && formData.age_restrictions !== 'all_ages') {
    parts.push(formData.age_restrictions);
  }
  if (formData.has_rsvp) parts.push('RSVP required');
  if (formData.has_tickets) parts.push('Ticketed');
  return parts.length > 0 ? parts.join(', ') : 'All ages, no RSVP required';
}

export default function EventDetailsSection() {
  const { formData, updateField } = useEventForm();

  return (
    <div>
      <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px 0' }}>
        Additional information to help attendees prepare for your event.
      </p>

      {/* Age Restrictions */}
      <div style={{ marginBottom: '16px' }}>
        <label>Age Restrictions</label>
        <select
          value={formData.age_restrictions}
          onChange={(e) => updateField('age_restrictions', e.target.value)}
        >
          <option value="all_ages">All Ages Welcome</option>
          <option value="18+">18 and Over</option>
          <option value="21+">21 and Over</option>
          <option value="custom">Custom Age Minimum</option>
        </select>
      </div>

      {formData.age_restrictions === 'custom' && (
        <div style={{ marginBottom: '16px' }}>
          <label>Minimum Age</label>
          <input
            type="number"
            value={formData.age_minimum}
            onChange={(e) => updateField('age_minimum', e.target.value)}
            min="1"
            max="99"
            placeholder="Enter minimum age"
          />
        </div>
      )}

      {/* Dress Code */}
      <div style={{ marginBottom: '16px' }}>
        <label>Dress Code</label>
        <textarea
          value={formData.dress_code}
          onChange={(e) => updateField('dress_code', e.target.value)}
          placeholder="Casual, business casual, formal, costume encouraged, etc."
          rows={2}
        />
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          Let attendees know what to wear
        </div>
      </div>

      {/* RSVP and Tickets */}
      <div className="form-grid-2" style={{ marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.has_rsvp}
              onChange={(e) => updateField('has_rsvp', e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <span>Requires RSVP</span>
          </label>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', marginLeft: '24px' }}>
            Attendees must RSVP before attending
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.has_tickets}
              onChange={(e) => updateField('has_tickets', e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <span>Ticket Sales</span>
          </label>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', marginLeft: '24px' }}>
            Event requires paid tickets
          </div>
        </div>
      </div>

      {formData.has_rsvp && (
        <div>
          <label>RSVP Link</label>
          <input
            type="url"
            value={formData.rsvp_url}
            onChange={(e) => updateField('rsvp_url', e.target.value)}
            placeholder="https://eventbrite.com/your-event"
          />
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Link where people can RSVP for your event
          </div>
        </div>
      )}
    </div>
  );
}
