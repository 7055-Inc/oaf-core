/**
 * AccordionSection - Reusable collapsible section for forms
 * 
 * Used by: Product Form, Event Form, Profile Form
 * 
 * States:
 * - pending: Grey, not started
 * - active: Primary color border, expanded
 * - complete: Primary color background, collapsed with summary
 * 
 * @module modules/dashboard/components/shared/AccordionSection
 */

import { useState, useEffect } from 'react';

export default function AccordionSection({
  id,
  title,
  icon,
  status = 'pending', // 'pending' | 'active' | 'complete'
  isOpen = false,
  summary = null,
  onToggle,
  onNext,
  nextLabel = 'Continue',
  showNext = true,
  children,
  isLast = false
}) {
  const [isExpanded, setIsExpanded] = useState(isOpen);

  useEffect(() => {
    setIsExpanded(isOpen);
  }, [isOpen]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isExpanded);
    }
    setIsExpanded(!isExpanded);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (onNext) {
      onNext();
    }
  };

  // Style based on status - using CSS variables from global.css
  const getHeaderStyle = () => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      cursor: 'pointer',
      borderRadius: isExpanded ? 'var(--border-radius-sm) var(--border-radius-sm) 0 0' : 'var(--border-radius-sm)',
      transition: 'all 0.2s ease',
      userSelect: 'none'
    };

    switch (status) {
      case 'complete':
        return {
          ...base,
          background: 'var(--gradient-primary)',
          color: 'var(--accent-color)',
          border: '2px solid var(--primary-color)'
        };
      case 'active':
        return {
          ...base,
          background: 'var(--background-color)',
          color: 'var(--primary-color)',
          border: '2px solid var(--primary-color)'
        };
      default: // pending
        return {
          ...base,
          background: '#f8f9fa',
          color: '#6c757d',
          border: '1px solid #dee2e6'
        };
    }
  };

  const getContentStyle = () => ({
    display: isExpanded ? 'block' : 'none',
    padding: '20px',
    background: 'var(--background-color)',
    borderRadius: '0 0 var(--border-radius-sm) var(--border-radius-sm)',
    border: '2px solid var(--primary-color)',
    borderTop: 'none'
  });

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Header */}
      <div 
        style={getHeaderStyle()} 
        onClick={handleToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleToggle())}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status indicator - show checkmark when complete, otherwise section icon */}
          <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>
            {status === 'complete' ? (
              <i className="fas fa-check"></i>
            ) : icon ? (
              <i className={`fas ${icon}`}></i>
            ) : (
              <i className="far fa-circle"></i>
            )}
          </span>
          
          {/* Title */}
          <span style={{ fontWeight: '600', fontSize: '15px' }}>
            {title}
          </span>
          
          {/* Summary (shown when complete and collapsed) */}
          {status === 'complete' && !isExpanded && summary && (
            <span style={{ 
              fontWeight: 'normal', 
              fontSize: '13px',
              opacity: 0.9,
              marginLeft: '8px'
            }}>
              — {summary}
            </span>
          )}
        </div>
        
        {/* Expand/collapse arrow */}
        <span style={{ 
          fontSize: '12px',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          <i className="fas fa-chevron-down"></i>
        </span>
      </div>

      {/* Content */}
      <div style={getContentStyle()}>
        {children}
        
        {/* Next/Continue button */}
        {showNext && !isLast && (
          <div className="form-submit-section" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <button type="button" onClick={handleNext}>
              {nextLabel} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
