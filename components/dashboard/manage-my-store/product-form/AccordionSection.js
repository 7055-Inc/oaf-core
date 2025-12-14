import { useState, useEffect } from 'react';

/**
 * AccordionSection - Reusable collapsible section for product form
 * 
 * States:
 * - pending: Grey, not started
 * - active: Primary color border, expanded
 * - complete: Primary color background, collapsed with summary
 */
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

  // Style based on status
  const getHeaderStyle = () => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      cursor: 'pointer',
      borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
      transition: 'all 0.2s ease',
      userSelect: 'none'
    };

    switch (status) {
      case 'complete':
        return {
          ...base,
          background: 'var(--primary-color, #055474)',
          color: 'white',
          border: '2px solid var(--primary-color, #055474)'
        };
      case 'active':
        return {
          ...base,
          background: 'white',
          color: 'var(--primary-color, #055474)',
          border: '2px solid var(--primary-color, #055474)'
        };
      default: // pending
        return {
          ...base,
          background: '#f8f9fa',
          color: '#6c757d',
          border: '2px solid #dee2e6'
        };
    }
  };

  const getContentStyle = () => ({
    display: isExpanded ? 'block' : 'none',
    padding: '20px',
    background: 'white',
    borderRadius: '0 0 8px 8px',
    border: '2px solid var(--primary-color, #055474)',
    borderTop: 'none'
  });

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Header */}
      <div style={getHeaderStyle()} onClick={handleToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status indicator */}
          <span style={{ fontSize: '20px' }}>
            {status === 'complete' ? '✓' : icon || '○'}
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
          ▼
        </span>
      </div>

      {/* Content */}
      <div style={getContentStyle()}>
        {children}
        
        {/* Next/Continue button */}
        {showNext && !isLast && (
          <div style={{ 
            marginTop: '20px', 
            paddingTop: '20px', 
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: '12px 32px',
                background: 'var(--primary-color, #055474)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {nextLabel}
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

