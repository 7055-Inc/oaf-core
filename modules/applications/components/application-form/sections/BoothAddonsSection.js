import { useApplicationForm } from '../ApplicationFormContext';

export default function BoothAddonsSection() {
  const { event, availableAddons, selectedAddons, handleAddonToggle, handleAddonNotes } = useApplicationForm();

  if (!event) return null;

  const boothFee = parseFloat(event.booth_fee) || 0;

  return (
    <div className="form-panel">
      <h3 style={{ marginTop: 0 }}>Booth preferences</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Request add-ons if desired. Final assignments are made by the organizer.
      </p>
      {boothFee > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: 'var(--border-radius-sm)' }}>
          <strong>Base booth fee:</strong> ${boothFee.toFixed(2)} (due if accepted)
        </div>
      )}
      {availableAddons.length === 0 ? (
        <p style={{ color: '#666' }}>No add-ons available for this event.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {availableAddons.map(addon => {
            const sel = selectedAddons.find(s => s.available_addon_id === addon.id);
            const requested = sel?.requested || false;
            return (
              <div key={addon.id} style={{ padding: '0.75rem', border: '1px solid #eee', borderRadius: 'var(--border-radius-sm)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={requested}
                    onChange={e => handleAddonToggle(addon.id, e.target.checked)}
                  />
                  <div>
                    <span className="font-weight-600">{addon.addon_name}</span>
                    {addon.addon_price != null && (
                      <span style={{ marginLeft: '0.5rem', color: '#055474' }}>+${parseFloat(addon.addon_price).toFixed(2)}</span>
                    )}
                    {addon.addon_description && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>{addon.addon_description}</p>
                    )}
                  </div>
                </label>
                {requested && (
                  <input
                    type="text"
                    className="form-control"
                    style={{ marginTop: '0.5rem' }}
                    placeholder="Optional notes..."
                    value={sel?.notes || ''}
                    onChange={e => handleAddonNotes(addon.id, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
