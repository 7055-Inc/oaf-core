import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

export default function ManageJuryPackets({ userData }) {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchPackets();
  }, []);

  const fetchPackets = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view jury packets');
      }

      const response = await fetch(getApiUrl('api/jury-packets'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jury packets');
      }

      const data = await response.json();
      setPackets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (packetId, packetName) => {
    if (!confirm(`Are you sure you want to delete "${packetName}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(packetId);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`api/jury-packets/${packetId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete packet');
      }

      // Remove from list
      setPackets(packets.filter(p => p.id !== packetId));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPacketData = (packet) => {
    if (!packet.packet_data) return {};
    return typeof packet.packet_data === 'string' 
      ? JSON.parse(packet.packet_data) 
      : packet.packet_data;
  };

  if (loading) {
    return <div className="loading-state">Loading jury packets...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Jury Packets</h2>
      </div>
      
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Jury packets are created when you apply to events and choose "Save as Packet". 
        They store your application data for quick re-use on future applications.
      </p>

      {packets.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Jury Packets Yet</h3>
          <p style={{ marginBottom: '20px' }}>
            You haven't saved any jury packets yet. When you apply to an event, 
            you can save your application as a packet for faster future applications.
          </p>
        </div>
      ) : (
        <div className={styles.orderCards}>
          {packets.map(packet => {
            const data = getPacketData(packet);
            const fieldCount = data.field_responses ? Object.keys(data.field_responses).length : 0;
            
            return (
              <div key={packet.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderTitle}>
                      <i className="fas fa-folder" style={{ marginRight: '8px', color: '#055474' }}></i>
                      {packet.packet_name}
                    </div>
                    <div className={styles.orderMeta}>
                      Created {formatDate(packet.created_at)}
                    </div>
                  </div>
                  <div className={styles.orderActions}>
                    <button
                      className="danger"
                      onClick={() => handleDelete(packet.id, packet.packet_name)}
                      disabled={deleting === packet.id}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      {deleting === packet.id ? (
                        <><i className="fas fa-spinner fa-spin"></i> Deleting...</>
                      ) : (
                        <><i className="fas fa-trash"></i> Delete</>
                      )}
                    </button>
                  </div>
                </div>
                
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#6c757d' }}>
                    {data.artist_statement && (
                      <div>
                        <strong>Artist Statement:</strong>{' '}
                        {data.artist_statement.length > 100 
                          ? data.artist_statement.substring(0, 100) + '...' 
                          : data.artist_statement}
                      </div>
                    )}
                    {data.portfolio_url && (
                      <div>
                        <strong>Portfolio:</strong> {data.portfolio_url}
                      </div>
                    )}
                    {data.field_responses && Object.keys(data.field_responses).length > 0 && (
                      <div>
                        <strong>Saved Responses:</strong>
                        <div style={{ 
                          marginTop: '8px', 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '8px'
                        }}>
                          {Object.entries(data.field_responses).map(([fieldId, response]) => {
                            const hasText = response.response_value;
                            const hasFile = response.file_url && typeof response.file_url === 'string' && response.file_url.length > 0;
                            const isEmpty = !hasText && !hasFile;
                            
                            return (
                              <div key={fieldId} style={{
                                background: isEmpty ? '#fff3cd' : '#f8f9fa',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderLeft: `3px solid ${isEmpty ? '#ffc107' : '#055474'}`,
                                color: isEmpty ? '#856404' : 'inherit'
                              }}>
                                {hasText && response.response_value}
                                {hasFile && (
                                  <span><i className="fas fa-image" style={{ marginRight: '6px' }}></i>Image uploaded</span>
                                )}
                                {isEmpty && (
                                  <span style={{ fontStyle: 'italic' }}>
                                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                                    Empty field
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

