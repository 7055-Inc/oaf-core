import { useApplicationForm } from '../ApplicationFormContext';

export default function JuryPacketSection() {
  const {
    juryPackets,
    selectedPacket,
    showPacketChoice,
    handlePacketSelect,
    handleStartFromScratch,
    handleChangePacket,
    loading
  } = useApplicationForm();

  if (!showPacketChoice && !selectedPacket) return null;

  if (selectedPacket) {
    return (
      <div className="form-panel" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <i className="fas fa-folder-open" style={{ color: 'var(--primary-color)', marginTop: '2px' }} />
            <div>
              <strong>Using: {selectedPacket.packet_name}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>
                Your application is pre-filled. You can edit any fields in the sections below.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleChangePacket} disabled={loading}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-panel">
      <h3 style={{ marginTop: 0 }}>Choose application method</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Apply from scratch or use a saved jury packet to pre-fill your application.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button type="button" className="btn btn-secondary" onClick={handleStartFromScratch} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <i className="fas fa-edit" />
          <div>
            <strong>Apply from scratch</strong>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Fill out the form manually</p>
          </div>
        </button>
        {juryPackets.map(packet => (
          <button
            key={packet.id}
            type="button"
            className="btn btn-outline-primary"
            onClick={() => handlePacketSelect(packet)}
            disabled={loading}
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <i className="fas fa-folder" />
            <div>
              <strong>{packet.packet_name}</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Use saved application data</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
