import { useApplicationForm } from '../ApplicationFormContext';

export default function PersonaSection() {
  const { personas, selectedPersona, setSelectedPersona } = useApplicationForm();

  if (!personas.length) return null;

  return (
    <div className="form-panel">
      <h3 style={{ marginTop: 0 }}>Apply as</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>Choose which artistic identity to present.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          type="button"
          className={`btn ${!selectedPersona ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedPersona(null)}
        >
          <i className="fas fa-user" style={{ marginRight: '0.5rem' }} />
          My main profile
        </button>
        {personas.map(p => (
          <button
            key={p.id}
            type="button"
            className={`btn ${selectedPersona?.id === p.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedPersona(p)}
          >
            <i className="fas fa-mask" style={{ marginRight: '0.5rem' }} />
            {p.display_name || p.persona_name}
            {p.is_default && <i className="fas fa-star" style={{ marginLeft: '0.35rem', fontSize: '0.8rem' }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
