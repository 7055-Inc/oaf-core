import { useEventForm } from '../EventFormContext';

// Helper to parse date string without timezone shift
// new Date('2025-12-19') treats it as UTC, causing day shift in local display
// This parses as local date instead
function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDatesSummary(formData) {
  if (!formData.start_date || !formData.end_date) return null;
  const start = parseLocalDate(formData.start_date);
  const end = parseLocalDate(formData.end_date);
  const startStr = start.toLocaleDateString();
  const endStr = end.toLocaleDateString();
  return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
}

export default function DatesSection() {
  const { formData, updateField } = useEventForm();

  // Format date for display without timezone shift
  const formatDateDisplay = (dateString) => {
    const date = parseLocalDate(dateString);
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div>
      <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px 0' }}>
        When does your event take place? These dates will be displayed publicly.
      </p>

      <div className="form-grid-2">
        <div>
          <label>Start Date *</label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => updateField('start_date', e.target.value)}
            required
          />
        </div>

        <div>
          <label>End Date *</label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => updateField('end_date', e.target.value)}
            min={formData.start_date}
            required
          />
        </div>
      </div>

      {formData.start_date && formData.end_date && (
        <div className="success-alert" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-calendar-alt"></i>
          <span>
            {formatDateDisplay(formData.start_date)}
            {formData.start_date !== formData.end_date && (
              <> — {formatDateDisplay(formData.end_date)}</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
