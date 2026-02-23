/**
 * Jury Packets - card-based manage/create/edit/delete
 * Uses v2 events jury-packets API.
 */

import { useState, useEffect } from 'react';
import {
  fetchJuryPackets,
  fetchJuryPacket,
  createJuryPacket,
  updateJuryPacket,
  deleteJuryPacket
} from '../../../lib/events/api';
import { getPersonas } from '../../../lib/users/api';

const defaultForm = {
  packet_name: '',
  packet_data: { artist_statement: '', portfolio_url: '', field_responses: {} },
  photos_data: [],
  persona_id: null
};

function parsePacketData(packet) {
  if (!packet) return defaultForm.packet_data;
  const raw = packet.packet_data;
  if (!raw) return defaultForm.packet_data;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    artist_statement: data.artist_statement || '',
    portfolio_url: data.portfolio_url || '',
    field_responses: data.field_responses || {}
  };
}

function parsePhotosData(packet) {
  if (!packet || !packet.photos_data) return [];
  const raw = packet.photos_data;
  return Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
}

export default function JuryPackets() {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [personas, setPersonas] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadPackets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJuryPackets();
      setPackets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load jury packets');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonas = async () => {
    try {
      const data = await getPersonas();
      setPersonas(Array.isArray(data) ? data : []);
    } catch {
      setPersonas([]);
    }
  };

  useEffect(() => {
    loadPackets();
    loadPersonas();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
    setError(null);
  };

  const openEdit = async (packet) => {
    try {
      setError(null);
      const full = await fetchJuryPacket(packet.id);
      setEditingId(full.id);
      setForm({
        packet_name: full.packet_name || '',
        packet_data: parsePacketData(full),
        photos_data: parsePhotosData(full),
        persona_id: full.persona_id ?? null
      });
      setShowModal(true);
    } catch (err) {
      setError(err.message || 'Failed to load packet');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(defaultForm);
    setError(null);
  };

  const handleInput = (e) => {
    const { name, value, type } = e.target;
    if (name.startsWith('packet_data.')) {
      const key = name.replace('packet_data.', '');
      setForm((prev) => ({
        ...prev,
        packet_data: { ...prev.packet_data, [key]: value }
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === 'select-one' && value === '' ? null : (name === 'persona_id' && value ? Number(value) : value)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.packet_name?.trim()) {
      setError('Packet name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        packet_name: form.packet_name.trim(),
        packet_data: form.packet_data,
        photos_data: form.photos_data,
        persona_id: form.persona_id || null
      };
      if (editingId) {
        await updateJuryPacket(editingId, payload);
      } else {
        await createJuryPacket(payload);
      }
      await loadPackets();
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save packet');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (packet) => {
    if (!confirm(`Delete "${packet.packet_name}"? This cannot be undone.`)) return;
    setDeletingId(packet.id);
    setError(null);
    try {
      await deleteJuryPacket(packet.id);
      await loadPackets();
    } catch (err) {
      setError(err.message || 'Failed to delete packet');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="form-panel">
        <p className="loading-state">Loading jury packets...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <h1>Jury Packets</h1>
          <p className="page-description" style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.95rem' }}>
            Reusable application templates. Create packets to speed up future event applications.
          </p>
        </div>
        <div className="dashboard-page-actions">
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} />
            Add packet
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {packets.length === 0 ? (
        <div className="jury-packet-empty">
          <div className="jury-packet-empty-icon">
            <i className="fas fa-folder-open" />
          </div>
          <h3>No jury packets yet</h3>
          <p>Create a packet to reuse your artist statement, portfolio link, and responses when applying to events.</p>
          <button type="button" onClick={openCreate} className="btn btn-primary">
            Add your first packet
          </button>
        </div>
      ) : (
        <div className="jury-packet-cards">
          {packets.map((packet) => (
            <div key={packet.id} className="jury-packet-card">
              <div className="jury-packet-card-header">
                <h3 className="jury-packet-card-title">
                  <i className="fas fa-folder" />
                  {packet.packet_name}
                </h3>
                <div className="jury-packet-card-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEdit(packet)}
                    title="Edit"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(packet)}
                    disabled={deletingId === packet.id}
                    title="Delete"
                  >
                    {deletingId === packet.id ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <i className="fas fa-trash" />
                    )}
                  </button>
                </div>
              </div>
              <div className="jury-packet-card-meta">
                {packet.persona_display_name && (
                  <p>
                    <i className="fas fa-user" />
                    {packet.persona_display_name}
                  </p>
                )}
                <p>
                  <i className="fas fa-calendar-alt" />
                  Updated {formatDate(packet.updated_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="jury-packet-modal-overlay" onClick={closeModal}>
          <div className="jury-packet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="jury-packet-modal-header">
              <h2 className="jury-packet-modal-title">
                {editingId ? 'Edit jury packet' : 'Create jury packet'}
              </h2>
              <button type="button" className="jury-packet-modal-close" onClick={closeModal} aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="jury-packet-modal-body">
              {error && (
                <div className="error-alert" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="jury-packets-name">Packet name *</label>
                <input
                  id="jury-packets-name"
                  type="text"
                  name="packet_name"
                  value={form.packet_name}
                  onChange={handleInput}
                  placeholder="e.g. Wildlife photography application"
                  className="form-control"
                  required
                />
              </div>
              {personas.length > 0 && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="jury-packets-persona">Persona</label>
                  <select
                    id="jury-packets-persona"
                    name="persona_id"
                    value={form.persona_id ?? ''}
                    onChange={handleInput}
                    className="form-control"
                  >
                    <option value="">No specific persona</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || p.persona_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="jury-packets-statement">Artist statement</label>
                <textarea
                  id="jury-packets-statement"
                  name="packet_data.artist_statement"
                  value={form.packet_data.artist_statement}
                  onChange={handleInput}
                  placeholder="Your standard artist statement..."
                  className="form-control"
                  rows={4}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="jury-packets-portfolio">Portfolio URL</label>
                <input
                  id="jury-packets-portfolio"
                  type="text"
                  name="packet_data.portfolio_url"
                  value={form.packet_data.portfolio_url}
                  onChange={handleInput}
                  placeholder="myportfolio.com or https://myportfolio.com"
                  className="form-control"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }} />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update packet'
                  ) : (
                    'Save packet'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
