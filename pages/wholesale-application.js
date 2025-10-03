import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authenticatedApiRequest } from '../lib/csrf';
import { getApiUrl } from '../lib/config';
import styles from '../styles/WholesaleApplication.module.css';

export default function WholesaleApplication() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Terms state
  const [termsData, setTermsData] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Form state
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
    checkUserAndTerms();
  }, []);

  const checkUserAndTerms = async () => {
    try {
      setLoading(true);

      // Get user data
      const userResponse = await authenticatedApiRequest(getApiUrl('api/users/me'));
      if (userResponse.ok) {
        const user = await userResponse.json();
        setUserData(user);

        // Pre-fill form with user data
        setFormData(prev => ({
          ...prev,
          business_email: user.username || '',
          contact_name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
        }));
      }

      // Check wholesale terms
      try {
        const termsResponse = await authenticatedApiRequest('api/subscriptions/wholesale/terms-check');
        if (termsResponse.ok) {
          const terms = await termsResponse.json();
          setTermsData(terms.latestTerms);
          setTermsAccepted(terms.termsAccepted);
        }
      } catch (termsError) {
        console.log('Wholesale terms endpoint not available yet');
      }

    } catch (error) {
      console.error('Error checking user and terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTermsAccept = async () => {
    if (!termsData) return;

    try {
      setProcessing(true);
      const response = await authenticatedApiRequest('api/subscriptions/wholesale/terms-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_version_id: termsData.id })
      });

      if (response.ok) {
        setTermsAccepted(true);
        setShowTerms(false);
        alert('Terms accepted successfully!');
      } else {
        const error = await response.json();
        alert(`Error accepting terms: ${error.error}`);
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      alert('Error accepting terms. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      alert('Please accept the wholesale terms and conditions before submitting your application.');
      return;
    }

    try {
      setProcessing(true);

      const response = await authenticatedApiRequest('api/subscriptions/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Application submitted successfully! We will review your application and contact you within 3-5 business days.');
        
        // Clear form or redirect
        setFormData({
          business_name: '',
          business_type: '',
          tax_id: '',
          business_address: '',
          business_city: '',
          business_state: '',
          business_zip: '',
          business_phone: '',
          business_email: userData?.username || '',
          contact_name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim(),
          contact_title: '',
          years_in_business: '',
          business_description: '',
          product_categories: '',
          expected_order_volume: '',
          resale_certificate: '',
          website_url: '',
          additional_info: ''
        });
      } else {
        alert(`Error: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Wholesale Buyer Application</h1>
        <p>Join our wholesale program and access exclusive pricing on handcrafted artisan products</p>
      </div>

      {/* Program Explanation */}
      <div className={styles.programInfo}>
        <h2>About Our Wholesale Program</h2>
        
        <div className={styles.benefits}>
          <h3>Benefits of Becoming a Wholesale Buyer</h3>
          <ul>
            <li><strong>Exclusive Wholesale Pricing</strong> - Savings vary per artist</li>
            <li><strong>Access to Unique Products</strong> - Handcrafted items from verified artisans</li>
            <li><strong>Priority Support</strong> - Dedicated wholesale customer service</li>
            <li><strong>Early Access</strong> - First look at new products and seasonal collections</li>
            <li><strong>Flexible Terms</strong> - Net payment terms for qualified buyers</li>
          </ul>
        </div>

        <div className={styles.requirements}>
          <h3>Wholesale Requirements</h3>
          <ul>
            <li>Valid business license and tax ID</li>
            <li>Established retail or commercial business</li>
            <li>Minimum orders for some artists</li>
            <li>Physical storefront, established online presence, or trade show participation</li>
            <li>Resale certificate (where applicable)</li>
          </ul>
        </div>

        <div className={styles.process}>
          <h3>Application Process</h3>
          <ol>
            <li><strong>Submit Application</strong> - Complete the form below with your business information</li>
            <li><strong>Review Process</strong> - Our team reviews most applications within 3-5 business days</li>
            <li><strong>Verification</strong> - We may request additional documentation</li>
            <li><strong>Approval</strong> - Approved buyers receive wholesale access and pricing</li>
            <li><strong>Start Shopping</strong> - Browse products with wholesale pricing displayed</li>
          </ol>
        </div>
      </div>

      {/* Terms Acceptance */}
      {termsData && !termsAccepted && (
        <div className={styles.termsSection}>
          <h3>Wholesale Terms & Conditions</h3>
          <p>Please review and accept our wholesale terms and conditions before submitting your application.</p>
          
          <button 
            onClick={() => setShowTerms(true)}
            className={styles.viewTermsBtn}
          >
            View Wholesale Terms & Conditions
          </button>

          {showTerms && (
            <div className={styles.termsModal}>
              <div className={styles.termsContent}>
                <div className={styles.termsHeader}>
                  <h4>{termsData.title}</h4>
                  <button 
                    onClick={() => setShowTerms(false)}
                    className={styles.closeBtn}
                  >
                    ×
                  </button>
                </div>
                
                <div className={styles.termsText}>
                  {termsData.content}
                </div>

                <div className={styles.termsActions}>
                  <button 
                    onClick={handleTermsAccept}
                    disabled={processing}
                    className={styles.acceptBtn}
                  >
                    {processing ? 'Processing...' : 'Accept Terms'}
                  </button>
                  <button 
                    onClick={() => setShowTerms(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {termsAccepted && (
        <div className={styles.termsAccepted}>
          <p>✓ Wholesale terms and conditions accepted</p>
        </div>
      )}

      {/* Application Form */}
      <div className={styles.applicationSection}>
        <h2>Wholesale Application Form</h2>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          
          {/* Business Information */}
          <div className={styles.section}>
            <h3>Business Information</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Business Name *</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
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

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tax ID / EIN *</label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
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

          {/* Business Address */}
          <div className={styles.section}>
            <h3>Business Address</h3>
            
            <div className={styles.formGroup}>
              <label>Street Address *</label>
              <input
                type="text"
                name="business_address"
                value={formData.business_address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>City *</label>
                <input
                  type="text"
                  name="business_city"
                  value={formData.business_city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>State *</label>
                <input
                  type="text"
                  name="business_state"
                  value={formData.business_state}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
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

          {/* Contact Information */}
          <div className={styles.section}>
            <h3>Contact Information</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Business Phone *</label>
                <input
                  type="tel"
                  name="business_phone"
                  value={formData.business_phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
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

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Primary Contact Name *</label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
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

          {/* Business Details */}
          <div className={styles.section}>
            <h3>Business Details</h3>
            
            <div className={styles.formGroup}>
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

            <div className={styles.formGroup}>
              <label>Product Categories of Interest *</label>
              <textarea
                name="product_categories"
                value={formData.product_categories}
                onChange={handleInputChange}
                rows="3"
                placeholder="What types of handcrafted products are you interested in? (e.g., pottery, jewelry, textiles, home decor)"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
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
              
              <div className={styles.formGroup}>
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

            <div className={styles.formGroup}>
              <label>Resale Certificate Number</label>
              <input
                type="text"
                name="resale_certificate"
                value={formData.resale_certificate}
                onChange={handleInputChange}
                placeholder="If applicable"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className={styles.section}>
            <h3>Additional Information</h3>
            
            <div className={styles.formGroup}>
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

          {/* Submit */}
          <div className={styles.submitSection}>
            <button 
              type="submit" 
              disabled={processing || !termsAccepted}
              className={styles.submitBtn}
            >
              {processing ? 'Submitting...' : 'Submit Wholesale Application'}
            </button>
            
            {!termsAccepted && (
              <p className={styles.termsWarning}>
                Please accept the wholesale terms and conditions above before submitting.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
