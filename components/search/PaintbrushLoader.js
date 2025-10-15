export default function PaintbrushLoader({ 
  size = 'medium', 
  text = 'Discovering amazing art...',
  showText = true 
}) {
  const sizeMap = {
    small: { brush: '1.5rem', container: '2rem' },
    medium: { brush: '2.5rem', container: '3rem' },
    large: { brush: '4rem', container: '5rem' }
  };

  const currentSize = sizeMap[size] || sizeMap.medium;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    }}>
      {/* Paintbrush Loading Animation */}
      <div 
        className="paintbrush-container"
        style={{
          width: currentSize.container,
          height: currentSize.container,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Paint Stroke Background */}
        <div className="paint-stroke" style={{
          position: 'absolute',
          width: '100%',
          height: '6px',
          backgroundColor: '#e9ecef',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          {/* Animated Paint Fill */}
          <div className="paint-fill" style={{
            height: '100%',
            background: 'linear-gradient(90deg, #055474, #0891b2, #06b6d4)',
            borderRadius: '3px',
            animation: 'paint-fill 2s ease-in-out infinite'
          }} />
        </div>
        
        {/* Paintbrush Icon */}
        <div 
          className="paintbrush-icon"
          style={{
            fontSize: currentSize.brush,
            zIndex: 2,
            animation: 'paintbrush-move 2s ease-in-out infinite'
          }}
        >
          🎨
        </div>
      </div>

      {/* Loading Text */}
      {showText && (
        <div style={{
          color: '#666',
          fontSize: size === 'large' ? '1.2rem' : size === 'small' ? '0.9rem' : '1rem',
          fontWeight: '500',
          textAlign: 'center',
          animation: 'text-pulse 1.5s ease-in-out infinite'
        }}>
          {text}
        </div>
      )}

      <style jsx>{`
        @keyframes paint-fill {
          0% {
            width: 0%;
            transform: translateX(0%);
          }
          50% {
            width: 100%;
            transform: translateX(0%);
          }
          100% {
            width: 100%;
            transform: translateX(100%);
          }
        }

        @keyframes paintbrush-move {
          0% {
            transform: translateX(-50%) rotate(-5deg);
          }
          50% {
            transform: translateX(0%) rotate(0deg);
          }
          100% {
            transform: translateX(50%) rotate(5deg);
          }
        }

        @keyframes text-pulse {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        .paint-fill {
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        .paintbrush-icon {
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
