import { useApplicationForm } from '../ApplicationFormContext';

export default function FeesReviewSection() {
  const {
    event,
    loading,
    error,
    setError,
    handleSubmit,
    handleSaveAsPacket,
    showSavePacketForm,
    setShowSavePacketForm,
    packetName,
    setPacketName,
    calculateTotalFees,
    calculateBoothFees,
    onCancel
  } = useApplicationForm();

  if (!event) return null;

  const totalFees = calculateTotalFees();
  const boothFees = calculateBoothFees();

  return (
    <div className="form-panel">
      <h3 style={{ marginTop: 0 }}>Review & submit</h3>

      {(totalFees > 0 || boothFees > 0) && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: 'var(--border-radius-sm)' }}>
          <h4 style={{ marginTop: 0 }}>Fees</h4>
          {totalFees > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Due at submission:</strong>
              {event.application_fee > 0 && (
                <div>Application fee: ${parseFloat(event.application_fee).toFixed(2)}</div>
              )}
              {event.jury_fee > 0 && (
                <div>Jury fee: ${parseFloat(event.jury_fee).toFixed(2)}</div>
              )}
              <div><strong>Subtotal:</strong> ${totalFees.toFixed(2)}</div>
            </div>
          )}
          {boothFees > 0 && (
            <div>
              <strong>Due if accepted:</strong> ${boothFees.toFixed(2)} (booth + add-ons)
            </div>
          )}
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#666' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '0.35rem' }} />
            Application and jury fees are non-refundable. Booth fees are due only if accepted.
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <span>{error}</span>
          <button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {showSavePacketForm && (
        <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #dee2e6', borderRadius: 'var(--border-radius-sm)' }}>
          <h4 style={{ marginTop: 0 }}>Save as jury packet</h4>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem' }}>Save your current answers as a reusable packet.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: '280px' }}
              placeholder="Packet name..."
              value={packetName}
              onChange={e => setPacketName(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={handleSaveAsPacket} disabled={loading || !packetName.trim()}>
              {loading ? 'Saving...' : 'Save packet'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowSavePacketForm(false); setPacketName(''); setError(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {!showSavePacketForm && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowSavePacketForm(true)} disabled={loading}>
              <i className="fas fa-save" style={{ marginRight: '0.5rem' }} /> Save as packet
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }} /> Submitting...</>
            ) : (
              <>
                <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }} />
                Submit application
                {totalFees > 0 && ` ($${totalFees.toFixed(2)})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
