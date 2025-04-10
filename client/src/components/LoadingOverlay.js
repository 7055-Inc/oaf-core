import React from 'react';
import './LoadingOverlay.css';

export const LoadingOverlay = () => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <img 
          src="/media/BlueLoadingAnimation.svg" 
          alt="Loading..." 
          className="loading-animation"
        />
      </div>
    </div>
  );
}; 