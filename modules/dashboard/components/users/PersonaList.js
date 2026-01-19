'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPersonas, deletePersona, setDefaultPersona } from '../../../../lib/users/api';

/**
 * PersonaList Component
 * Displays artist's personas with actions
 */
export default function PersonaList() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPersonas();
      setPersonas(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (personaId) => {
    try {
      await setDefaultPersona(personaId);
      // Reload to reflect changes
      loadPersonas();
    } catch (err) {
      alert('Failed to set default: ' + err.message);
    }
  };

  const handleDelete = async (personaId, personaName) => {
    if (!confirm(`Are you sure you want to delete "${personaName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      setDeletingId(personaId);
      await deletePersona(personaId);
      setPersonas(prev => prev.filter(p => p.id !== personaId));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading personas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        {error}
        <button onClick={loadPersonas} className="secondary small" style={{ marginLeft: '12px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="table-header">
        <div>
          <p className="form-hint">
            Personas let you present different artistic identities for events and applications.
          </p>
        </div>
        <div className="actions">
          <Link href="/dashboard/users/personas/new">
            <button>+ New Persona</button>
          </Link>
        </div>
      </div>

      {/* Personas List */}
      {personas.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any personas yet.</p>
          <Link href="/dashboard/users/personas/new">
            <button style={{ marginTop: '16px' }}>Create Your First Persona</button>
          </Link>
        </div>
      ) : (
        <div className="persona-grid">
          {personas.map(persona => (
            <div key={persona.id} className={`persona-card ${persona.is_default ? 'default' : ''}`}>
              {/* Persona Image */}
              <div className="persona-image">
                {persona.profile_image_url ? (
                  <img src={persona.profile_image_url} alt={persona.display_name} />
                ) : (
                  <div className="persona-image-placeholder">
                    <i className="material-icons">person</i>
                  </div>
                )}
                {persona.is_default && (
                  <span className="default-badge">Default</span>
                )}
              </div>

              {/* Persona Info */}
              <div className="persona-info">
                <h4>{persona.display_name}</h4>
                <p className="persona-name">@{persona.persona_name}</p>
                {persona.specialty && (
                  <p className="persona-specialty">{persona.specialty}</p>
                )}
                {persona.bio && (
                  <p className="persona-bio">{persona.bio.substring(0, 100)}{persona.bio.length > 100 ? '...' : ''}</p>
                )}
              </div>

              {/* Social Links */}
              {(persona.instagram_handle || persona.website_url || persona.portfolio_url) && (
                <div className="persona-links">
                  {persona.instagram_handle && (
                    <a href={`https://instagram.com/${persona.instagram_handle}`} target="_blank" rel="noopener noreferrer" title="Instagram">
                      <i className="material-icons">camera_alt</i>
                    </a>
                  )}
                  {persona.website_url && (
                    <a href={persona.website_url} target="_blank" rel="noopener noreferrer" title="Website">
                      <i className="material-icons">language</i>
                    </a>
                  )}
                  {persona.portfolio_url && (
                    <a href={persona.portfolio_url} target="_blank" rel="noopener noreferrer" title="Portfolio">
                      <i className="material-icons">collections</i>
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="persona-actions">
                {!persona.is_default && (
                  <button 
                    className="secondary small" 
                    onClick={() => handleSetDefault(persona.id)}
                  >
                    Set Default
                  </button>
                )}
                <Link href={`/dashboard/users/personas/${persona.id}/edit`}>
                  <button className="secondary small">Edit</button>
                </Link>
                <button 
                  className="secondary small"
                  onClick={() => handleDelete(persona.id, persona.display_name)}
                  disabled={deletingId === persona.id}
                >
                  {deletingId === persona.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .persona-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .persona-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: box-shadow 0.2s ease;
        }

        .persona-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .persona-card.default {
          border: 2px solid var(--primary-color);
        }

        .persona-image {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }

        .persona-image img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .persona-image-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #aaa;
        }

        .persona-image-placeholder i {
          font-size: 40px;
        }

        .default-badge {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary-color);
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }

        .persona-info {
          text-align: center;
        }

        .persona-info h4 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: #333;
        }

        .persona-name {
          margin: 0;
          color: #888;
          font-size: 0.85rem;
        }

        .persona-specialty {
          margin: 8px 0 0 0;
          color: var(--primary-color);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .persona-bio {
          margin: 8px 0 0 0;
          color: #666;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .persona-links {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .persona-links a {
          color: #888;
          transition: color 0.2s ease;
        }

        .persona-links a:hover {
          color: var(--primary-color);
        }

        .persona-links i {
          font-size: 20px;
        }

        .persona-actions {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }

        @media (max-width: 768px) {
          .persona-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
