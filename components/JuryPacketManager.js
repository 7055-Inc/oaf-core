import { useState, useEffect } from 'react';
import styles from './JuryPacketManager.module.css';
import { getApiUrl } from '../lib/config';

export default function JuryPacketManager() {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPacket, setEditingPacket] = useState(null);
  const [newPacket, setNewPacket] = useState({
    packet_name: '',
    packet_data: {
      artist_statement: '',
      portfolio_url: '',
      field_responses: {}
    },
    photos_data: [],
    persona_id: null
  });
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    fetchPackets();
    fetchPersonas();
  }, []);

  const fetchPackets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('api/jury-packets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jury packets');
      }

      const data = await response.json();
      setPackets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonas = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('api/personas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPersonas(data);
      }
    } catch (err) {
      // Personas are optional, don't throw error
      console.error('Error fetching personas:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('packet_data.')) {
      const field = name.replace('packet_data.', '');
      setNewPacket(prev => ({
        ...prev,
        packet_data: {
          ...prev.packet_data,
          [field]: value
        }
      }));
    } else {
      setNewPacket(prev => ({
        ...prev,
        [name]: type === 'select-one' && value === '' ? null : value
      }));
    }
  };

  const handleSave = async () => {
    try {
      if (!newPacket.packet_name.trim()) {
        setError('Packet name is required');
        return;
      }

      const token = localStorage.getItem('token');
      const url = editingPacket 
        ? `api/jury-packets/${editingPacket.id}`
        : 'api/jury-packets';
      
      const method = editingPacket ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPacket)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save packet');
      }

      await fetchPackets();
      handleCancel();
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = async (packet) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`api/jury-packets/${packet.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch packet details');
      }

      const fullPacket = await response.json();
      const packetData = JSON.parse(fullPacket.packet_data || '{}');
      const photosData = JSON.parse(fullPacket.photos_data || '[]');

      setEditingPacket(fullPacket);
      setNewPacket({
        packet_name: fullPacket.packet_name,
        packet_data: {
          artist_statement: packetData.artist_statement || '',
          portfolio_url: packetData.portfolio_url || '',
          field_responses: packetData.field_responses || {}
        },
        photos_data: photosData,
        persona_id: fullPacket.persona_id || null
      });
      setShowCreateForm(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (packetId) => {
    if (!confirm('Are you sure you want to delete this jury packet?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`api/jury-packets/${packetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete packet');
      }

      await fetchPackets();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingPacket(null);
    setNewPacket({
      packet_name: '',
      packet_data: {
        artist_statement: '',
        portfolio_url: '',
        field_responses: {}
      },
      photos_data: [],
      persona_id: null
    });
    setError(null);
  };

  if (loading) {
    return <div className={styles.loading}>Loading jury packets...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Jury Packets</h2>
        <p className={styles.description}>
          Create reusable application templates with your standard information and materials.
        </p>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
        >
          <i className="fas fa-plus"></i>
          Create New Packet
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className={styles.formModal}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h3>{editingPacket ? 'Edit Jury Packet' : 'Create New Jury Packet'}</h3>
              <button
                className={styles.closeButton}
                onClick={handleCancel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="packet_name">
                  Packet Name *
                </label>
                <input
                  type="text"
                  id="packet_name"
                  name="packet_name"
                  value={newPacket.packet_name}
                  onChange={handleInputChange}
                  placeholder="e.g., My Wildlife Photography Application"
                  className={styles.input}
                  required
                />
              </div>

              {personas.length > 0 && (
                <div className={styles.formGroup}>
                  <label htmlFor="persona_id">
                    Associated Persona
                  </label>
                  <select
                    id="persona_id"
                    name="persona_id"
                    value={newPacket.persona_id || ''}
                    onChange={handleInputChange}
                    className={styles.input}
                  >
                    <option value="">No specific persona</option>
                    {personas.map(persona => (
                      <option key={persona.id} value={persona.id}>
                        {persona.display_name} ({persona.persona_name})
                      </option>
                    ))}
                  </select>
                  <div className={styles.helpText}>
                    Optionally link this packet to a specific persona
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="artist_statement">
                  Artist Statement
                </label>
                <textarea
                  id="artist_statement"
                  name="packet_data.artist_statement"
                  value={newPacket.packet_data.artist_statement}
                  onChange={handleInputChange}
                  placeholder="Your standard artist statement..."
                  rows={6}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="portfolio_url">
                  Portfolio URL
                </label>
                <input
                  type="url"
                  id="portfolio_url"
                  name="packet_data.portfolio_url"
                  value={newPacket.packet_data.portfolio_url}
                  onChange={handleInputChange}
                  placeholder="https://yourportfolio.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSave}
                >
                  {editingPacket ? 'Update Packet' : 'Save Packet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packets List */}
      <div className={styles.packetsList}>
        {packets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <i className="fas fa-folder-open"></i>
            </div>
            <h3>No Jury Packets Yet</h3>
            <p>Create your first jury packet to save time when applying to events.</p>
            <button
              className={styles.createButton}
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Packet
            </button>
          </div>
        ) : (
          <div className={styles.packetsGrid}>
            {packets.map(packet => (
              <div key={packet.id} className={styles.packetCard}>
                <div className={styles.packetHeader}>
                  <h3>{packet.packet_name}</h3>
                  <div className={styles.packetActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEdit(packet)}
                      title="Edit packet"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDelete(packet.id)}
                      title="Delete packet"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className={styles.packetInfo}>
                  {packet.persona_display_name && (
                    <p className={styles.packetPersona}>
                      <i className="fas fa-user"></i>
                      {packet.persona_display_name}
                    </p>
                  )}
                  <p className={styles.packetDate}>
                    <i className="fas fa-calendar"></i>
                    Updated {new Date(packet.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 