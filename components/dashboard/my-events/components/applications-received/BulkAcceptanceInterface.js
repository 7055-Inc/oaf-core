import { useState } from 'react';
import { getAuthToken } from '../../../../../lib/csrf';
import styles from '../../../SlideIn.module.css';

export default function BulkAcceptanceInterface({ applications, selectedEvent, onBulkAccept }) {
  const [selectedApps, setSelectedApps] = useState([]);
  const [bulkBoothFee, setBulkBoothFee] = useState('');
  const [bulkJuryComments, setBulkJuryComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleBulkAccept = async () => {
    if (selectedApps.length === 0) return;

    setIsProcessing(true);
    try {
      const token = getAuthToken();
      
      // Process each selected application
      const promises = selectedApps.map(async (appId) => {
        const application = applications.find(app => app.id === appId);
        const boothFee = bulkBoothFee || application.booth_fee || 0;
        
        return fetch(`https://api2.onlineartfestival.com/api/applications/${appId}/bulk-accept`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'accepted',
            booth_fee: parseFloat(boothFee),
            jury_comments: bulkJuryComments,
            event_id: selectedEvent.id
          })
        });
      });

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.ok).length;
      const failed = results.length - successful;

      if (successful > 0) {
        alert(`Successfully accepted ${successful} applications${failed > 0 ? ` (${failed} failed)` : ''}`);
        onBulkAccept();
        setSelectedApps([]);
        setBulkBoothFee('');
        setBulkJuryComments('');
      } else {
        throw new Error('All bulk acceptance operations failed');
      }
    } catch (err) {
      alert('Failed to bulk accept applications: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedApps(applications.map(app => app.id));
  };

  const handleClearSelection = () => {
    setSelectedApps([]);
  };

  const toggleAppSelection = (appId) => {
    if (selectedApps.includes(appId)) {
      setSelectedApps(selectedApps.filter(id => id !== appId));
    } else {
      setSelectedApps([...selectedApps, appId]);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const calculateTotalFees = () => {
    return selectedApps.reduce((total, appId) => {
      const app = applications.find(a => a.id === appId);
      const boothFee = bulkBoothFee ? parseFloat(bulkBoothFee) : (app?.booth_fee || 0);
      return total + boothFee + (app?.application_fee || 0) + (app?.jury_fee || 0);
    }, 0);
  };

  if (applications.length === 0) {
    return (
      <div className="form-card" style={{ marginBottom: '20px' }}>
        <h4>No submitted applications to review</h4>
      </div>
    );
  }

  return (
    <div className="form-card" style={{ marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 20px 0' }}>Bulk Acceptance Interface</h4>
      
      {/* Selection Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSelectAll}
          className="secondary"
          style={{ fontSize: '14px' }}
        >
          Select All ({applications.length})
        </button>
        <button
          onClick={handleClearSelection}
          className="secondary"
          style={{ fontSize: '14px' }}
        >
          Clear Selection
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="secondary"
          style={{ fontSize: '14px' }}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
          {selectedApps.length} of {applications.length} selected
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div className="form-group">
            <label>Bulk Booth Fee (optional - overrides individual fees)</label>
            <input
              type="number"
              value={bulkBoothFee}
              onChange={(e) => setBulkBoothFee(e.target.value)}
              className="form-input"
              placeholder="Leave empty to use individual booth fees"
              step="0.01"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Bulk Jury Comments (applied to all selected)</label>
            <textarea
              value={bulkJuryComments}
              onChange={(e) => setBulkJuryComments(e.target.value)}
              className="form-input"
              rows="3"
              placeholder="Comments to add to all selected applications..."
            />
          </div>
          {selectedApps.length > 0 && (
            <div style={{ padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px', marginTop: '10px' }}>
              <strong>Total Revenue from Selected:</strong> {formatCurrency(calculateTotalFees())}
            </div>
          )}
        </div>
      )}

      {/* Application Selection Table */}
      <div className={styles.table} style={{ marginBottom: '20px' }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderCell}>
            <input
              type="checkbox"
              checked={selectedApps.length === applications.length}
              onChange={(e) => {
                if (e.target.checked) {
                  handleSelectAll();
                } else {
                  handleClearSelection();
                }
              }}
            />
          </div>
          <div className={styles.tableHeaderCell}>Artist</div>
          <div className={styles.tableHeaderCell}>Applied Date</div>
          <div className={styles.tableHeaderCell}>Booth Fee</div>
          <div className={styles.tableHeaderCell}>Total Fees</div>
          <div className={styles.tableHeaderCell}>Category</div>
        </div>
        {applications.map((application) => (
          <div key={application.id} className={styles.tableRow}>
            <div className={styles.tableCell}>
              <input
                type="checkbox"
                checked={selectedApps.includes(application.id)}
                onChange={() => toggleAppSelection(application.id)}
              />
            </div>
            <div className={styles.tableCell}>
              <div>
                <strong>{application.artist_name}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>{application.email}</div>
              </div>
            </div>
            <div className={styles.tableCell}>
              {new Date(application.applied_date).toLocaleDateString()}
            </div>
            <div className={styles.tableCell}>
              {formatCurrency(bulkBoothFee || application.booth_fee)}
            </div>
            <div className={styles.tableCell}>
              {formatCurrency(
                (bulkBoothFee ? parseFloat(bulkBoothFee) : application.booth_fee) +
                application.application_fee +
                application.jury_fee
              )}
            </div>
            <div className={styles.tableCell}>
              <span style={{ fontSize: '12px', padding: '2px 6px', backgroundColor: '#e9ecef', borderRadius: '3px' }}>
                {application.category || 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Accept Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {selectedApps.length > 0 && (
            <>
              Ready to accept {selectedApps.length} applications
              {selectedApps.length > 0 && ` • Total Revenue: ${formatCurrency(calculateTotalFees())}`}
            </>
          )}
        </div>
        <button
          onClick={handleBulkAccept}
          disabled={selectedApps.length === 0 || isProcessing}
          className="primary"
          style={{ fontSize: '16px', padding: '10px 20px' }}
        >
          {isProcessing ? 'Processing...' : `Accept ${selectedApps.length} Applications`}
        </button>
      </div>
    </div>
  );
}
