import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../lib/csrf';


// import VerificationWidget from './widgets/VerificationWidget';
import styles from './WidgetRenderer.module.css';

export default function WidgetRenderer({ widgetType, config, onConfigChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    loadWidgetData();
  }, [widgetType, config]);

  const loadWidgetData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const configParam = config ? encodeURIComponent(JSON.stringify(config)) : '';
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/dashboard-widgets/widget-data/${widgetType}?config=${configParam}`
      );

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        throw new Error('Failed to load widget data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadWidgetData(false); // Don't show loading spinner for manual refresh
  };

  const renderWidget = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorState}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>Error: {error}</span>
          <button onClick={() => loadWidgetData()} className={styles.retryButton}>
            <i className="fas fa-redo"></i>
            Retry
          </button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className={styles.emptyState}>
          <i className="fas fa-inbox"></i>
          <span>No data available</span>
        </div>
      );
    }

    // Route to appropriate widget component
    switch (widgetType) {

      

      
      // case 'verification':
      //   return (
      //     <VerificationWidget 
      //       data={data} 
      //       config={config} 
      //       onConfigChange={onConfigChange}
      //     />
      //   );
      
      default:
        return (
          <div className={styles.unknownWidget}>
            <i className="fas fa-question-circle"></i>
            <span>Unknown widget type: {widgetType}</span>
          </div>
        );
    }
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    const now = new Date();
    const diff = now - lastRefresh;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return lastRefresh.toLocaleDateString();
  };

  return (
    <div className={styles.widgetRenderer}>
      <div className={styles.widgetActions}>
        <button
          onClick={handleRefresh}
          className={styles.refreshButton}
          disabled={loading}
          title="Refresh widget data"
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
        </button>
        
        {lastRefresh && (
          <span className={styles.lastRefresh} title={lastRefresh.toLocaleString()}>
            {formatLastRefresh()}
          </span>
        )}
      </div>

      <div className={styles.widgetBody}>
        {renderWidget()}
      </div>
    </div>
  );
} 