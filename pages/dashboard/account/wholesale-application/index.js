/**
 * Wholesale Application Page
 * Customer-facing page to apply for wholesale access.
 * Uses v2 API and global styles.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getCurrentUser } from '../../../../lib/users';

export default function WholesaleApplicationPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    tax_id: '',
    business_address: '',
    business_city: '',
    business_state: '',
    business_zip: '',
    business_phone: '',
    business_email: '',
    contact_name: '',
    contact_title: '',
    years_in_business: '',
    business_description: '',
    product_categories: '',
    expected_order_volume: '',
    resale_certificate: '',
    website_url: '',
    additional_info: ''
  });

  useEffect(() => {
    loadUserAndStatus();
  }, []);

  const loadUserAndStatus = async () => {
    try {
      const user = await getCurrentUser();
      setUserData(user);
      
      // Pre-fill form with user data
      setFormData(prev => ({
        ...prev,
        business_email: user.username || '',
        contact_name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }));

      // Check existing application status
      const statusResponse = await authApiRequest('api/v2/commerce/wholesale/my-status');
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setApplicationStatus(data.application);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      const response = await authApiRequest('api/v2/commerce/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Application submitted successfully! We will review your application within 3-5 business days.');
        setApplicationStatus({ status: 'pending', created_at: new Date().toISOString() });
      } else {
        setError(data.error || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Error submitting application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head>
          <title>Wholesale Application | Dashboard</title>
        </Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  // Check if user already has wholesale access
  const hasWholesale = userData?.permissions?.includes('wholesale') || userData?.user_type === 'wholesale';

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Wholesale Application | Dashboard</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <nav className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="separator">/</span>
            <Link href="/dashboard/users">My Account</Link>
            <span className="separator">/</span>
            <span>Wholesale</span>
          </nav>
          <h1>Wholesale Buyer Application</h1>
          <p className="page-subtitle">
            Join our wholesale program and access exclusive pricing on handcrafted artisan products.
          </p>
        </div>

        {error && (
          <div className="error-alert">
            {error}
            <button onClick={() => setError(null)} className="btn secondary small">Dismiss</button>
          </div>
        )}

        {success && (
          <div className="success-alert">
            {success}
          </div>
        )}

        {/* Already has wholesale access */}
        {hasWholesale && (
          <div className="card">
            <div className="card-body">
              <div className="success-state">
                <div className="success-icon">✓</div>
                <h3>Wholesale Access Active</h3>
                <p>You have wholesale buyer access. Wholesale pricing is displayed on eligible products.</p>
              </div>
            </div>
          </div>
        )}

        {/* Has pending/denied application */}
        {!hasWholesale && applicationStatus && (
          <div className="card">
            <div className="card-body">
              {applicationStatus.status === 'pending' && (
                <div className="info-state">
                  <div className="info-icon">⏳</div>
                  <h3>Application Pending</h3>
                  <p>Your wholesale application is under review. We typically respond within 3-5 business days.</p>
                  <p className="text-muted">Submitted: {new Date(applicationStatus.created_at).toLocaleDateString()}</p>
                </div>
              )}
              {applicationStatus.status === 'denied' && (
                <div className="warning-state">
                  <div className="warning-icon">⚠️</div>
                  <h3>Application Not Approved</h3>
                  <p>Your previous application was not approved.</p>
                  {applicationStatus.denial_reason && (
                    <p className="text-muted">Reason: {applicationStatus.denial_reason}</p>
                  )}
                  <p>If you believe this was in error, please contact support.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Application form - only show if no wholesale access and no pending application */}
        {!hasWholesale && (!applicationStatus || applicationStatus.status === 'denied') && (
          <>
            {/* Program Info */}
            <div className="card">
              <div className="card-header">
                <h3>About Our Wholesale Program</h3>
              </div>
              <div className="card-body">
                <div className="info-grid info-grid-2">
                  <div>
                    <h4>Benefits</h4>
                    <ul className="checklist">
                      <li>Exclusive wholesale pricing (varies per artist)</li>
                      <li>Access to unique handcrafted products</li>
                      <li>Priority customer support</li>
                      <li>Early access to new collections</li>
                      <li>Flexible payment terms for qualified buyers</li>
                    </ul>
                  </div>
                  <div>
                    <h4>Requirements</h4>
                    <ul className="checklist">
                      <li>Valid business license and tax ID</li>
                      <li>Established retail or commercial business</li>
                      <li>Physical storefront or established online presence</li>
                      <li>Resale certificate (where applicable)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmit}>
              {/* Business Information */}
              <div className="card">
                <div className="card-header">
                  <h3>Business Information</h3>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Business Name *</label>
                      <input
                        type="text"
                        name="business_name"
                        value={formData.business_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Business Type *</label>
                      <select
                        name="business_type"
                        value={formData.business_type}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Business Type</option>
                        <option value="retail_store">Retail Store</option>
                        <option value="online_retailer">Online Retailer</option>
                        <option value="gallery">Art Gallery</option>
                        <option value="museum_shop">Museum Shop</option>
                        <option value="gift_shop">Gift Shop</option>
                        <option value="boutique">Boutique</option>
                        <option value="interior_designer">Interior Designer</option>
                        <option value="event_planner">Event Planner</option>
                        <option value="distributor">Distributor</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tax ID / EIN *</label>
                      <input
                        type="text"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Years in Business *</label>
                      <select
                        name="years_in_business"
                        value={formData.years_in_business}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Years</option>
                        <option value="less_than_1">Less than 1 year</option>
                        <option value="1_2">1-2 years</option>
                        <option value="3_5">3-5 years</option>
                        <option value="6_10">6-10 years</option>
                        <option value="more_than_10">More than 10 years</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Address */}
              <div className="card">
                <div className="card-header">
                  <h3>Business Address</h3>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label>Street Address *</label>
                    <input
                      type="text"
                      name="business_address"
                      value={formData.business_address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-row form-row-3">
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        name="business_city"
                        value={formData.business_city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <input
                        type="text"
                        name="business_state"
                        value={formData.business_state}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>ZIP Code *</label>
                      <input
                        type="text"
                        name="business_zip"
                        value={formData.business_zip}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="card">
                <div className="card-header">
                  <h3>Contact Information</h3>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Business Phone *</label>
                      <input
                        type="tel"
                        name="business_phone"
                        value={formData.business_phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Business Email *</label>
                      <input
                        type="email"
                        name="business_email"
                        value={formData.business_email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Primary Contact Name *</label>
                      <input
                        type="text"
                        name="contact_name"
                        value={formData.contact_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Title</label>
                      <input
                        type="text"
                        name="contact_title"
                        value={formData.contact_title}
                        onChange={handleInputChange}
                        placeholder="e.g., Owner, Buyer, Manager"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="card">
                <div className="card-header">
                  <h3>Business Details</h3>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label>Business Description *</label>
                    <textarea
                      name="business_description"
                      value={formData.business_description}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Describe your business, target customers, and how you plan to sell our products"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Product Categories of Interest *</label>
                    <textarea
                      name="product_categories"
                      value={formData.product_categories}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="What types of handcrafted products are you interested in? (e.g., pottery, jewelry, textiles)"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Expected Monthly Order Volume *</label>
                      <select
                        name="expected_order_volume"
                        value={formData.expected_order_volume}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Volume</option>
                        <option value="500_1000">$500 - $1,000</option>
                        <option value="1000_2500">$1,000 - $2,500</option>
                        <option value="2500_5000">$2,500 - $5,000</option>
                        <option value="5000_10000">$5,000 - $10,000</option>
                        <option value="10000_plus">$10,000+</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Website URL</label>
                      <input
                        type="url"
                        name="website_url"
                        value={formData.website_url}
                        onChange={handleInputChange}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Resale Certificate Number</label>
                    <input
                      type="text"
                      name="resale_certificate"
                      value={formData.resale_certificate}
                      onChange={handleInputChange}
                      placeholder="If applicable"
                    />
                  </div>

                  <div className="form-group">
                    <label>Additional Comments</label>
                    <textarea
                      name="additional_info"
                      value={formData.additional_info}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Any additional information that would help us evaluate your application"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn primary btn-large"
                  disabled={processing}
                >
                  {processing ? 'Submitting...' : 'Submit Wholesale Application'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
