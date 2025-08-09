// Payouts & Earnings Component
// This file contains ONLY the payouts and earnings content logic
import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import styles from '../../../../pages/dashboard/Dashboard.module.css';

export default function PayoutsEarnings({ userData }) {
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [balanceData, setBalanceData] = useState(null);
      const [payoutHistory, setPayoutHistory] = useState([]);
      const [vendorSettings, setVendorSettings] = useState(null);
      const [expandedRows, setExpandedRows] = useState(new Set());
      const [earningsData, setEarningsData] = useState(null);
    
      useEffect(() => {
        loadPayoutData();
      }, []);
    
      const loadPayoutData = async () => {
        try {
          setLoading(true);
          setError(null);
    
          // Load balance, payouts, transactions, and settings in parallel
          const [balanceRes, payoutsRes, transactionsRes, settingsRes] = await Promise.all([
            authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/financials/my-balance'),
            authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/financials/my-payouts'),
            authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/financials/my-transactions?limit=1000'), // Get enough data for calculations
            authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/settings')
          ]);
    
          if (balanceRes.ok) {
            const balanceResult = await balanceRes.json();
            setBalanceData(balanceResult.balance);
          }
    
          if (payoutsRes.ok) {
            const payoutsResult = await payoutsRes.json();
            setPayoutHistory(payoutsResult.payouts || []);
          }
    
          if (transactionsRes.ok) {
            const transactionsResult = await transactionsRes.json();
            const transactions = transactionsResult.transactions || [];
            
            // Calculate earnings metrics from transaction data
            const calculatedEarnings = calculateEarningsFromTransactions(transactions);
            setEarningsData(calculatedEarnings);
          }
    
          if (settingsRes.ok) {
            const settingsResult = await settingsRes.json();
            setVendorSettings(settingsResult.settings);
          }
    
        } catch (err) {
          setError('Failed to load payout data');
          console.error('Error loading payout data:', err);
        } finally {
          setLoading(false);
        }
      };
    
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount || 0);
      };
    
      const formatDate = (dateString) => {
        if (!dateString) return 'Not scheduled';
        return new Date(dateString).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      };
    
      const getPayoutFrequencyText = () => {
        if (!vendorSettings?.payout_days) return 'Not configured';
        
        const days = vendorSettings.payout_days;
        if (days <= 1) return 'usually next day';
        return `${days} days after shipment`;
      };
    
      const toggleRowExpansion = (payoutId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(payoutId)) {
          newExpanded.delete(payoutId);
        } else {
          newExpanded.add(payoutId);
        }
        setExpandedRows(newExpanded);
      };
    
      const handleUpdateBankInfo = () => {
        // Link to Stripe onboarding/settings
        window.open('https://dashboard.stripe.com/settings/payouts', '_blank');
      };
    
      // Get current year and previous year for comparisons
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
    
      // Calculate earnings metrics from transaction data (frontend logic)
      const calculateEarningsFromTransactions = (transactions) => {
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        const currentMonth = new Date().getMonth() + 1;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Filter sales transactions only
        const salesTransactions = transactions.filter(t => 
          t.transaction_type === 'sale' && t.status === 'completed'
        );
        
        // Helper to calculate percentage change
        const calculateChange = (current, previous) => {
          if (!previous || previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };
        
        // YTD calculations
        const currentYtdSales = salesTransactions
          .filter(t => new Date(t.created_at).getFullYear() === currentYear)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const previousYtdSales = salesTransactions
          .filter(t => new Date(t.created_at).getFullYear() === previousYear)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const currentYtdItems = salesTransactions
          .filter(t => new Date(t.created_at).getFullYear() === currentYear).length;
        
        const previousYtdItems = salesTransactions
          .filter(t => new Date(t.created_at).getFullYear() === previousYear).length;
        
        // MTD calculations
        const currentMtdSales = salesTransactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
          })
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const previousMtdSales = salesTransactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date.getFullYear() === previousYear && date.getMonth() + 1 === currentMonth;
          })
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const currentMtdItems = salesTransactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
          }).length;
        
        const previousMtdItems = salesTransactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date.getFullYear() === previousYear && date.getMonth() + 1 === currentMonth;
          }).length;
        
        // Current period (last 30 days) calculations
        const currentPeriodSales = salesTransactions
          .filter(t => new Date(t.created_at) >= thirtyDaysAgo)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const thirtyDaysAgoPrevYearEnd = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoPrevYearStart = new Date(thirtyDaysAgoPrevYearEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const previousPeriodSales = salesTransactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date >= thirtyDaysAgoPrevYearStart && date <= thirtyDaysAgoPrevYearEnd;
          })
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const currentPeriodItems = salesTransactions
          .filter(t => new Date(t.created_at) >= thirtyDaysAgo).length;
        
        const previousPeriodItems = salesTransactions
          .filter(t => {
            const date = new Date(t.created_at);
            return date >= thirtyDaysAgoPrevYearStart && date <= thirtyDaysAgoPrevYearEnd;
          }).length;
        
        // Average order value YTD
        const avgOrderValueYtd = currentYtdItems > 0 ? currentYtdSales / currentYtdItems : 0;
        
        return {
          ytd_sales: currentYtdSales,
          ytd_sales_change: parseFloat(calculateChange(currentYtdSales, previousYtdSales).toFixed(1)),
          mtd_sales: currentMtdSales,
          mtd_sales_change: parseFloat(calculateChange(currentMtdSales, previousMtdSales).toFixed(1)),
          current_period_sales: currentPeriodSales,
          current_period_sales_change: parseFloat(calculateChange(currentPeriodSales, previousPeriodSales).toFixed(1)),
          ytd_items: currentYtdItems,
          ytd_items_change: parseFloat(calculateChange(currentYtdItems, previousYtdItems).toFixed(1)),
          mtd_items: currentMtdItems,
          mtd_items_change: parseFloat(calculateChange(currentMtdItems, previousMtdItems).toFixed(1)),
          current_period_items: currentPeriodItems,
          current_period_items_change: parseFloat(calculateChange(currentPeriodItems, previousPeriodItems).toFixed(1)),
          avg_order_value_ytd: parseFloat(avgOrderValueYtd.toFixed(2))
        };
      };
    
      const handleViewStripeDashboard = () => {
        if (vendorSettings?.stripe_account_id) {
          window.open(`https://dashboard.stripe.com/express/accounts/${vendorSettings.stripe_account_id}`, '_blank');
        } else {
          window.open('https://dashboard.stripe.com', '_blank');
        }
      };
    
      if (loading) {
        return (
          <div className="loading-state">Loading payout data...</div>
        );
      }
    
      if (error) {
        return (
          <div className="error-alert">{error}</div>
        );
      }
    
            return (
        <div>
            {/* Quick-View Section */}
            <div className="section-box">
              <h2>Quick-View</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Available Balance</div>
                  <div style={{ fontSize: '24px', fontWeight: '600' }}>
                    {formatCurrency(balanceData?.available_balance)}
                  </div>
                  <small className={styles.helpText}>Ready to withdraw from Stripe</small>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Pending Payout</div>
                  <div style={{ fontSize: '24px', fontWeight: '600' }}>
                    {formatCurrency(balanceData?.pending_payout)}
                  </div>
                  <small className={styles.helpText}>Held by platform during countdown</small>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Next Scheduled Payout</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    {formatDate(balanceData?.next_payout_date)}
                  </div>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Payout Frequency</div>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    {getPayoutFrequencyText()}
                  </div>
                </div>
              </div>
            </div>
    
            {/* Your Earnings Section */}
            <div className="section-box">
              <h2>Your Earnings</h2>
              
              <h3 style={{ color: '#055474', marginBottom: '16px' }}>Sales Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>YTD Sales</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {formatCurrency(earningsData?.ytd_sales)}
                  </div>
                  <div style={{ fontSize: '12px', color: earningsData?.ytd_sales_change >= 0 ? '#28a745' : '#dc3545' }}>
                    {earningsData?.ytd_sales_change >= 0 ? '+' : ''}{earningsData?.ytd_sales_change}% vs {previousYear}
                  </div>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Month to Date Sales</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {formatCurrency(earningsData?.mtd_sales)}
                  </div>
                  <div style={{ fontSize: '12px', color: earningsData?.mtd_sales_change >= 0 ? '#28a745' : '#dc3545' }}>
                    {earningsData?.mtd_sales_change >= 0 ? '+' : ''}{earningsData?.mtd_sales_change}% vs {currentMonth} {previousYear}
                  </div>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Current Period Sales</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {formatCurrency(earningsData?.current_period_sales)}
                  </div>
                  <div style={{ fontSize: '12px', color: earningsData?.current_period_sales_change >= 0 ? '#28a745' : '#dc3545' }}>
                    {earningsData?.current_period_sales_change >= 0 ? '+' : ''}{earningsData?.current_period_sales_change}% vs same period {previousYear}
                  </div>
                </div>
              </div>
    
              <h3 style={{ color: '#055474', marginBottom: '16px' }}>Volume Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>YTD Items Sold</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {earningsData?.ytd_items} items
                  </div>
                  <div style={{ fontSize: '12px', color: earningsData?.ytd_items_change >= 0 ? '#28a745' : '#dc3545' }}>
                    {earningsData?.ytd_items_change >= 0 ? '+' : ''}{earningsData?.ytd_items_change}% vs {previousYear}
                  </div>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>MTD Items Sold</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {earningsData?.mtd_items} items
                  </div>
                  <div style={{ fontSize: '12px', color: earningsData?.mtd_items_change >= 0 ? '#28a745' : '#dc3545' }}>
                    {earningsData?.mtd_items_change >= 0 ? '+' : ''}{earningsData?.mtd_items_change}% vs {currentMonth} {previousYear}
                  </div>
                </div>
                <div className="form-card">
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Current Period Items</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                    {earningsData?.current_period_items} items
                  </div>
                  <div style={{ fontSize: '12px', color: earningsData?.current_period_items_change >= 0 ? '#28a745' : '#dc3545' }}>
                    {earningsData?.current_period_items_change >= 0 ? '+' : ''}{earningsData?.current_period_items_change}% vs same period {previousYear}
                  </div>
                </div>
              </div>
    
              <h3 style={{ color: '#055474', marginBottom: '16px' }}>Key Metric</h3>
              <div className="form-card" style={{ maxWidth: '250px' }}>
                <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Average Order Value YTD</div>
                <div style={{ fontSize: '20px', fontWeight: '600' }}>
                  {formatCurrency(earningsData?.avg_order_value_ytd)}
                </div>
              </div>
            </div>
    
            {/* Payout History Section */}
            <div className="section-box">
              <h2>Payout History</h2>
              {payoutHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <p>No payouts found. Complete sales will appear here once processed.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {payoutHistory.map((payout) => (
                    <div key={payout.id} className="form-card" style={{ cursor: 'pointer' }} onClick={() => toggleRowExpansion(payout.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '500' }}>Date Initiated</div>
                            <div style={{ fontSize: '14px', color: '#6c757d' }}>
                              {formatDate(payout.created_at)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: '500' }}>Amount</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>
                              {formatCurrency(payout.amount)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: '500' }}>Status</div>
                            <div style={{ fontSize: '14px' }}>
                              <span className={`${styles.statusBadge} ${styles[payout.status] || ''}`}>
                                {payout.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '16px', color: '#6c757d' }}>
                          {expandedRows.has(payout.id) ? '▼' : '▶'}
                        </div>
                      </div>
                      
                      {expandedRows.has(payout.id) && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
                          <div style={{ fontSize: '14px', color: '#6c757d' }}>
                            Transaction ID: {payout.stripe_payout_id || payout.id}
                          </div>
                          {payout.description && (
                            <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                              Description: {payout.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
    
            {/* Payout Settings Section */}
            <div className="section-box">
              <h2>Payout Settings</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleUpdateBankInfo}
                  className="secondary"
                >
                  Update Bank Account Information
                </button>
                <button 
                  onClick={handleViewStripeDashboard}
                  className="secondary"
                >
                  View Stripe Dashboard
                </button>
              </div>
            </div>
        </div>
      );
}
