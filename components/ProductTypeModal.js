import React from 'react';
import styles from './ProductTypeModal.module.css';

const ProductTypeModal = ({ isOpen, onSelectType }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-title">
          <h2>What type of product?</h2>
        </div>

        <div className={styles.productTypeOptions}>
          <div 
            className="form-card"
            onClick={() => onSelectType('simple')}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem 2rem' }}
          >
            <i className="fas fa-cube" style={{ fontSize: '4rem', color: 'var(--primary-color)', marginBottom: '1.5rem', display: 'block' }}></i>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Simple Product</h3>
            <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
              One product, one price
            </p>
          </div>

          <div 
            className="form-card"
            onClick={() => onSelectType('variable')}
            style={{ cursor: 'pointer', textAlign: 'center', padding: '3rem 2rem' }}
          >
            <i className="fas fa-layer-group" style={{ fontSize: '4rem', color: 'var(--primary-color)', marginBottom: '1.5rem', display: 'block' }}></i>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>Variable Product</h3>
            <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
              Multiple sizes, colors, or options
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTypeModal; 