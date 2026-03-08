// Affiliates Menu Component
// This file will contain ONLY the menu building logic for Affiliates section
import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import styles from '../../../pages/dashboard/Dashboard.module.css';

export default function AffiliatesMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {},
  notifications = {}
}) {
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAffiliateData();
  }, []);

  const loadAffiliateData = async () => {
    try {
      const response = await authApiRequest('api/affiliates/me');
      if (response.ok) {
        const data = await response.json();
        setAffiliateData(data);
      } else if (response.status === 404) {
        // Not enrolled yet
        setAffiliateData(null);
      }
    } catch (err) {
      console.error('Error loading affiliate data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return null;

  // Calculate pending earnings for notification badge
  const pendingAmount = parseFloat(affiliateData?.pending_balance) || 0;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections['affiliates'] ? styles.collapsed : ''}`}
        onClick={() => toggleSection('affiliates')}
      >
        <span className={styles.accountHeader}>
          Affiliates
          {pendingAmount > 0 && (
            <span className={styles.notificationBadge} title={`$${pendingAmount.toFixed(2)} pending`}>
              $
            </span>
          )}
        </span>
      </h3>
      {!collapsedSections['affiliates'] && (
        <ul>
          {loading ? (
            <li className={styles.loadingItem}>Loading...</li>
          ) : affiliateData?.enrolled ? (
            // Enrolled affiliate - show full menu
            <>
              <li>
                <button 
                  className={styles.sidebarLink}
                  onClick={() => openSlideIn('affiliate-overview', { 
                    title: 'Affiliate Overview',
                    affiliateData 
                  })}
                >
                  Overview
                  {pendingAmount > 0 && (
                    <span className={styles.notificationBadge}>
                      ${pendingAmount.toFixed(0)}
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button 
                  className={styles.sidebarLink}
                  onClick={() => openSlideIn('affiliate-links', { 
                    title: 'My Affiliate Links',
                    affiliateData 
                  })}
                >
                  My Links
                </button>
              </li>
              <li>
                <button 
                  className={styles.sidebarLink}
                  onClick={() => openSlideIn('affiliate-commissions', { 
                    title: 'Commission History',
                    affiliateData 
                  })}
                >
                  Commissions
                </button>
              </li>
              <li>
                <button 
                  className={styles.sidebarLink}
                  onClick={() => openSlideIn('affiliate-payouts', { 
                    title: 'Payout History',
                    affiliateData 
                  })}
                >
                  Payouts
                </button>
              </li>
            </>
          ) : (
            // Not enrolled - show enrollment option
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('affiliate-enroll', { 
                  title: 'Join Affiliate Program',
                  onEnroll: loadAffiliateData
                })}
              >
                Join Program
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
