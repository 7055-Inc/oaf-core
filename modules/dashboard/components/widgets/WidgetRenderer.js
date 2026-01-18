import React from 'react';
import ShortcutsWidget from './items/ShortcutsWidget';
import MyProductsWidget from './items/MyProductsWidget';
// import VerificationWidget from './items/VerificationWidget';
import styles from './WidgetRenderer.module.css';

export default function WidgetRenderer({ widgetType, config, onConfigChange }) {
  // Simple, passive widget renderer - just routes to the appropriate widget component
  // Each widget handles its own data fetching, loading states, and errors
  
  switch (widgetType) {
    case 'my_shortcuts':
      return (
        <ShortcutsWidget 
          config={config} 
          onConfigChange={onConfigChange}
        />
      );
    
    case 'my_products':
      return (
        <MyProductsWidget 
          config={config} 
          onConfigChange={onConfigChange}
        />
      );
    
    // case 'verification':
    //   return (
    //     <VerificationWidget 
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
}
