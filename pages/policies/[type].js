'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../components/Header';
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
    'terms': 'Terms of Service'
  };

  useEffect(() => {
    const fetchPolicy = async () => {
      const policyType = params?.type;
      
      if (!policyType) {
        setLoading(false);
        return;
      }

      // For policies stored in database
      if (policyType === 'shipping' || policyType === 'returns' || policyType === 'privacy' || policyType === 'cookies' || policyType === 'copyright' || policyType === 'terms') {
        try {
          let endpoint;
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
        <Header />
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
      <Header />
      <div className={styles.content}>
        <h1>{title}</h1>
        
        {loading && (
          <div className={styles.loading}>Loading policy...</div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {!loading && !error && policy && (
          <div className={styles.policyText}>
            {policy.split('\n').map((line, index) => {
              // Handle empty lines as paragraph breaks
              if (line.trim() === '') {
                return <br key={index} />;
              }
              
              // Render each line as a paragraph
              return <p key={index}>{line}</p>;
            })}
          </div>
        )}

        <div className={styles.backLink}>
          <a href="/">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}

