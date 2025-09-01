import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import slideInStyles from '../../SlideIn.module.css';

export default function AdminReturns({ userData }) {
  const [activeTab, setActiveTab] = useState('assistance');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  useEffect(() => {
    fetchReturns();
  }, [activeTab, searchTerm, vendorFilter]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams();

      if (activeTab === 'all') {
        endpoint = '/api/returns/admin/all';
        if (searchTerm) params.append('search', searchTerm);
        if (vendorFilter) params.append('vendor', vendorFilter);
      } else {
        endpoint = `/api/returns/admin/by-status/${activeTab}`;
      }

      const queryString = params.toString();
      const url = `https://api2.onlineartfestival.com${endpoint}${queryString ? `?${queryString}` : ''}`;

      const response = await authenticatedApiRequest(url);
      
      if (response.ok) {
        const data = await response.json();
        setReturns(data.returns || []);
      } else {
        console.error('Failed to fetch returns');
        setReturns([]);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const sendAdminMessage = async (returnId, message) => {
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/returns/${returnId}/admin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        fetchReturns(); // Refresh the list
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={slideInStyles.slideInContent}>
      <div className={slideInStyles.slideInHeader}>
        <h2>Returns Management</h2>
      </div>

      <div className={slideInStyles.slideInBody}>
        {/* Tab Navigation */}
        <div className="tab-container" style={{ 
          display: 'flex', 
          borderBottom: '2px solid #dee2e6', 
          marginBottom: '20px' 
        }}>
          <button 
            className={`tab ${activeTab === 'assistance' ? 'active' : ''}`}
            onClick={() => setActiveTab('assistance')}
          >
            Assistance Cases
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Returns
          </button>
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Returns
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        {/* Search and Filter Controls for All Returns tab */}
        {activeTab === 'all' && (
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <input
              type="text"
              placeholder="Search by customer, order, or return ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <input
              type="text"
              placeholder="Filter by vendor username..."
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              style={{
                width: '200px',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
        )}

        {/* Returns List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <p>No returns found for this category.</p>
          </div>
        ) : (
          <div>
            {returns.map((returnItem) => (
              <div key={returnItem.id} style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '15px',
                backgroundColor: '#fff'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px', 
                  marginBottom: '15px' 
                }}>
                  <div>
                    <strong>Return ID:</strong> #{returnItem.id}
                  </div>
                  <div>
                    <strong>Order:</strong> #{returnItem.order_id}
                  </div>
                  <div>
                    <strong>Customer:</strong> {returnItem.customer_username}
                  </div>
                  <div>
                    <strong>Vendor:</strong> {returnItem.vendor_username}
                  </div>
                  <div>
                    <strong>Status:</strong> 
                    <span style={{
                      marginLeft: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: returnItem.return_status === 'assistance' ? '#f8d7da' : 
                                     returnItem.return_status === 'pending' ? '#fff3cd' :
                                     returnItem.return_status === 'completed' ? '#d4edda' : '#e2e3e5',
                      color: returnItem.return_status === 'assistance' ? '#721c24' : 
                            returnItem.return_status === 'pending' ? '#856404' :
                            returnItem.return_status === 'completed' ? '#155724' : '#495057'
                    }}>
                      {returnItem.return_status}
                    </span>
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(returnItem.created_at)}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>Product:</strong> {returnItem.product_name}
                  <br />
                  <strong>Reason:</strong> {returnItem.return_reason}
                </div>

                {returnItem.case_messages && (
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Case Messages:</strong>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      padding: '12px',
                      marginTop: '8px',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {returnItem.case_messages}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {returnItem.return_status === 'assistance' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Type admin response..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            sendAdminMessage(returnItem.id, e.target.value.trim());
                            e.target.value = '';
                          }
                        }}
                      />
                      <button 
                        className="primary" 
                        style={{ fontSize: '14px' }}
                        onClick={(e) => {
                          const input = e.target.parentElement.querySelector('input');
                          if (input.value.trim()) {
                            sendAdminMessage(returnItem.id, input.value.trim());
                            input.value = '';
                          }
                        }}
                      >
                        Send Response
                      </button>
                    </div>
                  )}

                  {returnItem.shipping_label_id && (
                    <button 
                      className="secondary"
                      style={{ fontSize: '14px' }}
                      onClick={() => window.open(`https://api2.onlineartfestival.com/api/returns/${returnItem.id}/label`, '_blank')}
                    >
                      View Label
                    </button>
                  )}

                  <button 
                    className="secondary"
                    style={{ fontSize: '14px' }}
                    onClick={() => {
                      // TODO: Open detailed return view modal
                      console.log('View details for return:', returnItem.id);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
