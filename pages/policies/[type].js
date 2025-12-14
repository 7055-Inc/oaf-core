'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './Policies.module.css';
import { apiRequest } from '../../lib/apiUtils';

export default function PolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const params = useParams();

  const policyTitles = {
    'shipping': 'Shipping Policy',
    'returns': 'Return Policy',
    'privacy': 'Privacy Policy',
    'cookies': 'Cookie Policy',
    'copyright': 'Copyright Policy',
    'terms': 'Terms of Service',
    'transparency': 'Marketplace Transparency',
    // Additional terms types
    'terms-verified': 'Verified Artist Terms',
    'terms-shipping': 'Shipping Services Terms',
    'terms-websites': 'Website Subscription Terms',
    'terms-wholesale': 'Wholesale Terms',
    'terms-marketplace': 'Marketplace Terms',
    'terms-addons': 'Website & Account Add-on Terms'
  };

  useEffect(() => {
    const fetchPolicy = async () => {
      const policyType = params?.type;
      
      if (!policyType) {
        setLoading(false);
        return;
      }

      // Map of terms types to their subscription_type values
      const termsTypeMap = {
        'terms-verified': 'verified',
        'terms-shipping': 'shipping_labels',
        'terms-websites': 'websites',
        'terms-wholesale': 'wholesale',
        'terms-marketplace': 'marketplace',
        'terms-addons': 'addons'
      };

      // Check if it's a valid policy type
      const validPolicies = ['shipping', 'returns', 'privacy', 'cookies', 'copyright', 'terms', 'transparency', ...Object.keys(termsTypeMap)];
      
      if (validPolicies.includes(policyType)) {
        try {
          let endpoint;
          
          // Handle additional terms types
          if (termsTypeMap[policyType]) {
            endpoint = `api/terms/type/${termsTypeMap[policyType]}`;
          } else {
            switch (policyType) {
              case 'shipping':
                endpoint = 'shipping-policies/default';
                break;
              case 'returns':
                endpoint = 'return-policies/default';
                break;
              case 'privacy':
                endpoint = 'privacy-policies/default';
                break;
              case 'cookies':
                endpoint = 'cookie-policies/default';
                break;
              case 'copyright':
                endpoint = 'copyright-policies/default';
                break;
              case 'terms':
                endpoint = 'api/terms/current';
                break;
              case 'transparency':
                endpoint = 'transparency-policies/default';
                break;
            }
          }

          const response = await apiRequest(endpoint, {
            method: 'GET'
          });

          if (response.ok) {
            const data = await response.json();
            // Terms endpoint returns 'content' field, others return 'policy_text'
            setPolicy(data.content || data.policy_text);
          } else {
            throw new Error('Policy not found');
          }
        } catch (err) {
          console.error('Error fetching policy:', err);
          setError('Unable to load policy. Please try again later.');
        } finally {
          setLoading(false);
        }
      } else {
        // For other policies, show placeholder
        setPolicy(`This ${policyTitles[policyType] || 'policy'} page is coming soon.`);
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [params?.type]);

  if (!params?.type) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Policies</h1>
          <p>Please select a policy to view.</p>
        </div>
      </div>
    );
  }

  const title = policyTitles[params.type] || 'Policy';

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>{title}</h1>
        
        {loading && (
          <div className={styles.loading}>Loading policy...</div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {!loading && !error && policy && (
          <div 
            className={styles.policyText}
            dangerouslySetInnerHTML={{ __html: policy }}
          />
        )}

        <div className={styles.backLink}>
          <a href="/">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

