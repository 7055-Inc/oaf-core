'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminListPersonas, adminDeletePersona, adminUpdatePersona } from '../../../../lib/users/api';

/**
 * PersonaManagement Component
 * Admin view of all personas system-wide with pagination
 * Admin-only component - visible only to admin users
 */
export default function PersonaManagement() {
  const [personas, setPersonas] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => {
    loadPersonas();
  }, [page, includeInactive]);

  const loadPersonas = async (searchTerm = search) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminListPersonas({
        page,
        limit,
        search: searchTerm,
        include_inactive: includeInactive,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      
      setPersonas(result.personas || []);
      setMeta(result.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadPersonas(search);
  };

  const handleToggleActive = async (persona) => {
    try {
      await adminUpdatePersona(persona.id, { is_active: !persona.is_active });
      loadPersonas();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const handleDelete = async (persona) => {
    const action = persona.is_active ? 'deactivate' : 'permanently delete';
    if (!confirm(`Are you sure you want to ${action} "${persona.display_name}"?`)) {
      return;
    }
    
    try {
      await adminDeletePersona(persona.id, !persona.is_active);
      loadPersonas();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  if (loading && personas.length === 0) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading personas...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">
          {error}
          <button onClick={() => loadPersonas()} className="secondary small" style={{ marginLeft: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="form-card">
        <form onSubmit={handleSearch} className="form-grid-3">
          <div>
            <label>Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, artist..."
            />
          </div>
          <div>
            <label>&nbsp;</label>
            <label className="toggle-slider-container">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPage(1);
                }}
                className="toggle-slider-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Include Inactive</span>
            </label>
          </div>
          <div>
            <label>&nbsp;</label>
            <button type="submit">Search</button>
          </div>
        </form>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: '16px', color: '#666', fontSize: '0.9rem' }}>
        Showing {personas.length} of {meta.total} personas
      </div>

      {/* Table */}
      {personas.length === 0 ? (
        <div className="empty-state">
          <p>No personas found.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Artist</th>
              <th>Specialty</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {personas.map(persona => (
              <tr key={persona.id} className={!persona.is_active ? 'inactive' : ''}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {persona.profile_image_url ? (
                      <img 
                        src={persona.profile_image_url} 
                        alt="" 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#aaa'
                      }}>
                        <i className="material-icons" style={{ fontSize: '20px' }}>person</i>
                      </div>
                    )}
                    <div>
                      <strong>{persona.display_name}</strong>
                      {persona.is_default && (
                        <span className="status-badge active" style={{ marginLeft: '8px' }}>Default</span>
                      )}
                      <br />
                      <span style={{ color: '#888', fontSize: '0.85rem' }}>@{persona.persona_name}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <Link href={`/dashboard/users/manage?id=${persona.artist_id}`}>
                    {persona.artist_name || persona.artist_username}
                  </Link>
                  <br />
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>{persona.artist_email}</span>
                </td>
                <td>{persona.specialty || '—'}</td>
                <td>
                  <span className={`status-badge ${persona.is_active ? 'in-stock' : 'out-of-stock'}`}>
                    {persona.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {new Date(persona.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="cell-actions">
                    <Link href={`/dashboard/users/personas/manage/${persona.id}/edit`}>
                      <button className="secondary small">Edit</button>
                    </Link>
                    <button 
                      className="secondary small"
                      onClick={() => handleToggleActive(persona)}
                    >
                      {persona.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {!persona.is_active && (
                      <button 
                        className="secondary small"
                        onClick={() => handleDelete(persona)}
                        style={{ color: '#dc2626' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          marginTop: '24px' 
        }}>
          <button 
            className="secondary small"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span style={{ 
            padding: '8px 16px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center'
          }}>
            Page {page} of {meta.totalPages}
          </span>
          <button 
            className="secondary small"
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
          >
            Next
          </button>
        </div>
      )}

      <style jsx>{`
        tr.inactive {
          opacity: 0.6;
        }
        tr.inactive:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
