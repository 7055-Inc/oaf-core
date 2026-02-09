/**
 * CRM - Subscriber List Management
 * Dashboard > CRM > Subscribers
 * Manage email subscribers with filtering, tagging, and bulk actions.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { authApiRequest } from '../../../lib/apiUtils';
import {
  fetchSubscribers,
  addSubscriber,
  updateSubscriber,
  removeSubscriber,
  fetchTags,
  addTagsToSubscriber,
  removeTagsFromSubscriber,
  bulkTagSubscribers,
  exportSubscribers,
  fetchAnalyticsOverview,
} from '../../../lib/email-marketing/api';

export default function CRMPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState(null);
  const [tags, setTags] = useState([]);
  const [filters, setFilters] = useState({ tags: [], status: '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSubscribers, setSelectedSubscribers] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [importing, setImporting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    tags: []
  });

  const [bulkTagData, setBulkTagData] = useState({
    tags: [],
    action: 'add'
  });

  const perPage = 25;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userData) {
      loadSubscribers();
      loadTags();
      loadStats();
    }
  }, [userData, filters, page]);

  const loadUser = async () => {
    try {
      const response = await authApiRequest('users/me', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribers = async () => {
    try {
      const data = await fetchSubscribers({ ...filters, page, limit: perPage });
      if (data.success) {
        setSubscribers(data.subscribers || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / perPage));
      }
    } catch (error) {
      console.error('Error loading subscribers:', error);
    }
  };

  const loadTags = async () => {
    try {
      const data = await fetchTags();
      if (data.success) {
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchAnalyticsOverview();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    try {
      await addSubscriber(formData);
      alert('Subscriber added successfully!');
      setAddModalOpen(false);
      setFormData({ email: '', first_name: '', last_name: '', tags: [] });
      loadSubscribers();
      loadStats();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateSubscriber = async (e) => {
    e.preventDefault();
    try {
      await updateSubscriber(selectedSubscriber.id, {
        first_name: formData.first_name,
        last_name: formData.last_name
      });
      if (formData.tags.length > 0) {
        await addTagsToSubscriber(selectedSubscriber.id, formData.tags);
      }
      alert('Subscriber updated successfully!');
      setEditModalOpen(false);
      loadSubscribers();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleRemoveSubscriber = async (id) => {
    if (!confirm('Remove this subscriber? They will be unsubscribed.')) return;
    try {
      await removeSubscriber(id);
      alert('Subscriber removed successfully!');
      loadSubscribers();
      loadStats();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleBulkTag = async () => {
    if (selectedSubscribers.length === 0) {
      alert('Please select at least one subscriber.');
      return;
    }
    if (bulkTagData.tags.length === 0) {
      alert('Please enter at least one tag.');
      return;
    }

    try {
      // Add tags to each selected subscriber
      for (const id of selectedSubscribers) {
        if (bulkTagData.action === 'add') {
          await addTagsToSubscriber(id, bulkTagData.tags);
        } else {
          await removeTagsFromSubscriber(id, bulkTagData.tags);
        }
      }
      alert(`Tags ${bulkTagData.action === 'add' ? 'added' : 'removed'} successfully!`);
      setBulkTagModalOpen(false);
      setBulkTagData({ tags: [], action: 'add' });
      setSelectedSubscribers([]);
      loadSubscribers();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportSubscribers(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting: ' + error.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const csvData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
          row[header] = values[i]?.trim() || '';
        });
        return row;
      });

      const result = await importSubscribers({
        csv_data: csvData,
        options: { auto_tags: ['imported'], skip_duplicates: true }
      });

      if (result.success) {
        alert(`Import complete! Imported: ${result.imported}, Skipped: ${result.skipped}`);
        loadSubscribers();
        loadStats();
      }
    } catch (error) {
      alert('Error importing: ' + error.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const openEditModal = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setFormData({
      email: subscriber.email,
      first_name: subscriber.first_name || '',
      last_name: subscriber.last_name || '',
      tags: []
    });
    setEditModalOpen(true);
  };

  const toggleSubscriberSelection = (id) => {
    setSelectedSubscribers(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedSubscribers.length === subscribers.length) {
      setSelectedSubscribers([]);
    } else {
      setSelectedSubscribers(subscribers.map(s => s.id));
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Head>
        <title>CRM - Subscribers | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Email Subscribers</h1>
          <p className="page-subtitle">Manage your email list and track engagement</p>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total Subscribers', value: stats.total_subscribers || 0, color: '#495057' },
              { label: 'Active', value: stats.active_subscribers || 0, color: '#28a745' },
              { label: 'Unsubscribed', value: stats.unsubscribed || 0, color: '#6c757d' },
              { label: 'Open Rate', value: `${(stats.open_rate || 0).toFixed(1)}%`, color: '#055474' },
              { label: 'Click Rate', value: `${(stats.click_rate || 0).toFixed(1)}%`, color: '#17a2b8' }
            ].map(stat => (
              <div key={stat.label} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions Bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setAddModalOpen(true)} style={{ padding: '10px 20px', background: '#055474', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Add Subscriber
          </button>
          <button onClick={handleExport} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Export CSV
          </button>
          <label style={{ padding: '10px 20px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'inline-block' }}>
            {importing ? 'Importing...' : 'Import CSV'}
            <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
          </label>
          {selectedSubscribers.length > 0 && (
            <button onClick={() => setBulkTagModalOpen(true)} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Bulk Tag ({selectedSubscribers.length})
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            style={{ flex: 1, minWidth: '200px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
            <option value="spam_complaint">Spam</option>
          </select>
        </div>

        {/* Subscribers Table */}
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #dee2e6', width: '30px' }}>
                  <input type="checkbox" checked={selectedSubscribers.length === subscribers.length && subscribers.length > 0} onChange={selectAll} />
                </th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Tags</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Source</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Added</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Engagement</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(sub => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedSubscribers.includes(sub.id)}
                      onChange={() => toggleSubscriberSelection(sub.id)}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <strong>{sub.email}</strong>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {sub.first_name || sub.last_name ? `${sub.first_name || ''} ${sub.last_name || ''}`.trim() : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {sub.tags && sub.tags.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {sub.tags.map(tag => (
                          <span key={tag} style={{ padding: '2px 8px', background: '#e9ecef', borderRadius: '12px', fontSize: '11px' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: sub.status === 'subscribed' ? '#d4edda' : sub.status === 'unsubscribed' ? '#e2e3e5' : sub.status === 'bounced' ? '#f8d7da' : '#ffe5e5',
                      color: sub.status === 'subscribed' ? '#155724' : sub.status === 'unsubscribed' ? '#383d41' : '#721c24'
                    }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {sub.source || '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                    {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    <div>Opens: {sub.total_opens || 0}</div>
                    <div>Clicks: {sub.total_clicks || 0}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => openEditModal(sub)} style={{ padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Edit
                      </button>
                      <button onClick={() => handleRemoveSubscriber(sub.id)} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscribers.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No subscribers found. {filters.search || filters.status || filters.tags.length > 0 ? 'Try adjusting your filters.' : 'Add your first subscriber to get started!'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'white' }}>
              Previous
            </button>
            <span style={{ padding: '8px 16px' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'white' }}>
              Next
            </button>
          </div>
        )}

        {/* Add Subscriber Modal */}
        {addModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
                <h3 style={{ margin: 0 }}>Add Subscriber</h3>
              </div>
              <form onSubmit={handleAddSubscriber}>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email *</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>First Name</label>
                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Last Name</label>
                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tags (comma separated)</label>
                    <input
                      type="text"
                      placeholder="vip, customer, newsletter"
                      onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
                <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setAddModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Subscriber</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Subscriber Modal */}
        {editModalOpen && selectedSubscriber && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
                <h3 style={{ margin: 0 }}>Edit Subscriber</h3>
                <div style={{ fontSize: '14px', color: '#666' }}>{selectedSubscriber.email}</div>
              </div>
              <form onSubmit={handleUpdateSubscriber}>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>First Name</label>
                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Last Name</label>
                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Add Tags</label>
                    <input
                      type="text"
                      placeholder="Add tags (comma separated)"
                      onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <small style={{ fontSize: '11px', color: '#666' }}>Current tags: {selectedSubscriber.tags?.join(', ') || 'None'}</small>
                  </div>
                </div>
                <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setEditModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Tag Modal */}
        {bulkTagModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '500px' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
                <h3 style={{ margin: 0 }}>Bulk Tag Operation</h3>
                <div style={{ fontSize: '14px', color: '#666' }}>{selectedSubscribers.length} subscribers selected</div>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Action</label>
                  <select value={bulkTagData.action} onChange={e => setBulkTagData({ ...bulkTagData, action: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                    <option value="add">Add Tags</option>
                    <option value="remove">Remove Tags</option>
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="vip, customer, newsletter"
                    onChange={e => setBulkTagData({ ...bulkTagData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', background: '#f8f9fa', display: 'flex', gap: '10px' }}>
                <button onClick={() => setBulkTagModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleBulkTag} style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Apply</button>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
