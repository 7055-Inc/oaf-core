/**
 * Logs Tab Component
 * Searchable email history with resend capability
 */

import { useState, useEffect } from 'react';
import { getLogs, getTemplates, resendEmail } from '../../../../lib/email/api';

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    templateId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 25
  });
  
  // Resend modal
  const [resendModal, setResendModal] = useState({ open: false, log: null });
  const [resendEmail, setResendEmailValue] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadTemplates = async () => {
    try {
      const result = await getTemplates();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getLogs(filters);
      if (result.success) {
        setLogs(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const openResendModal = (log) => {
    setResendModal({ open: true, log });
    setResendEmailValue(log.email_address);
  };

  const closeResendModal = () => {
    setResendModal({ open: false, log: null });
    setResendEmailValue('');
  };

  const handleResend = async () => {
    if (!resendModal.log) return;
    
    try {
      setResending(true);
      setError(null);
      
      const result = await resendEmail(resendModal.log.id, resendEmail || null);
      
      if (result.success) {
        setSuccess(`Email resent successfully to ${resendEmail || resendModal.log.email_address}`);
        closeResendModal();
        loadLogs(); // Refresh to show new entry
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="section-header">
        <h3>Email Logs</h3>
        <button className="btn btn-secondary" onClick={loadLogs}>
          Refresh
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {/* Filters */}
      <form onSubmit={handleSearch} className="filters-form">
        <div className="filter-row">
          <input
            type="text"
            className="form-input"
            placeholder="Search email or subject..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
          </select>
          
          <select
            className="form-select"
            value={filters.templateId}
            onChange={(e) => handleFilterChange('templateId', e.target.value)}
          >
            <option value="">All Templates</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-row">
          <input
            type="date"
            className="form-input"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            placeholder="Start date"
          />
          
          <input
            type="date"
            className="form-input"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            placeholder="End date"
          />
          
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters({
              search: '',
              status: '',
              templateId: '',
              startDate: '',
              endDate: '',
              page: 1,
              limit: 25
            })}
          >
            Clear
          </button>
        </div>
      </form>
      
      {/* Results */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading logs...</span>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="email-cell">{log.email_address}</td>
                    <td className="subject-cell">{log.subject}</td>
                    <td>{log.template_name || '—'}</td>
                    <td>
                      <span className={`status-badge status-${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(log.sent_at)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openResendModal(log)}
                        title="Resend this email"
                      >
                        Resend
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No emails found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Resend Modal */}
      {resendModal.open && (
        <div className="modal-overlay" onClick={closeResendModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h4>Resend Email</h4>
            <p className="text-muted">
              Original: {resendModal.log?.email_address}<br />
              Subject: {resendModal.log?.subject}
            </p>
            
            <div className="form-group">
              <label>Send to (leave blank for original recipient)</label>
              <input
                type="email"
                className="form-input"
                value={resendEmail}
                onChange={(e) => setResendEmailValue(e.target.value)}
                placeholder={resendModal.log?.email_address}
              />
            </div>
            
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Email'}
              </button>
              <button className="btn btn-secondary" onClick={closeResendModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .filters-form {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        
        .filter-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .filter-row:last-child {
          margin-bottom: 0;
        }
        
        .filter-row .form-input,
        .filter-row .form-select {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th,
        .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        .data-table th {
          background: #f8f9fa;
          font-weight: 600;
        }
        
        .email-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .subject-cell {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .date-cell {
          white-space: nowrap;
          font-size: 0.9rem;
          color: #666;
        }
        
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .status-sent {
          background: #d4edda;
          color: #155724;
        }
        
        .status-failed {
          background: #f8d7da;
          color: #721c24;
        }
        
        .status-bounced {
          background: #fff3cd;
          color: #856404;
        }
        
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
        }
        
        .page-info {
          color: #666;
          font-size: 0.9rem;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: #fff;
          padding: 1.5rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
        }
        
        .modal-content h4 {
          margin: 0 0 1rem 0;
        }
        
        .modal-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
