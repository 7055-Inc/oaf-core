import { useApplicationForm } from '../ApplicationFormContext';

export default function BasicInfoSection() {
  const { formData, setFormField } = useApplicationForm();

  return (
    <div className="form-panel">
      <h3 style={{ marginTop: 0 }}>Basic information</h3>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label htmlFor="app-artist-statement">Artist statement</label>
        <textarea
          id="app-artist-statement"
          className="form-control"
          rows={5}
          value={formData.artist_statement}
          onChange={e => setFormField('artist_statement', e.target.value)}
          placeholder="Your artist statement..."
        />
      </div>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label htmlFor="app-portfolio">Portfolio URL</label>
        <input
          id="app-portfolio"
          type="url"
          className="form-control"
          value={formData.portfolio_url}
          onChange={e => setFormField('portfolio_url', e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label htmlFor="app-additional-info">Additional information</label>
        <textarea
          id="app-additional-info"
          className="form-control"
          rows={2}
          value={formData.additional_info}
          onChange={e => setFormField('additional_info', e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="form-group">
        <label htmlFor="app-additional-notes">Additional notes</label>
        <textarea
          id="app-additional-notes"
          className="form-control"
          rows={2}
          value={formData.additional_notes}
          onChange={e => setFormField('additional_notes', e.target.value)}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}
