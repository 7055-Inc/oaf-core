import React from 'react';
import styles from './ProductTypeModal.module.css';

const ProductTypeModal = ({ isOpen, onSelectType }) => {
  if (!isOpen) return null;

  const handleTypeSelection = (type) => {
    onSelectType(type);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h1 className={styles.modalTitle}>Choose Product Type</h1>
          <p className={styles.modalSubtitle}>
            What type of product would you like to create?
          </p>
        </div>

        <div className={styles.productTypeOptions}>
          <div 
            className={styles.productTypeCard}
            onClick={() => handleTypeSelection('simple')}
          >
            <div className={styles.cardIcon}>📦</div>
            <h2 className={styles.cardTitle}>Simple Product</h2>
            <p className={styles.cardDescription}>
              A standalone product with fixed properties. Perfect for unique artwork, 
              one-of-a-kind pieces, or products without variations.
            </p>
            <div className={styles.cardFeatures}>
              <span className={styles.feature}>✓ Single product</span>
              <span className={styles.feature}>✓ Fixed price</span>
              <span className={styles.feature}>✓ Quick setup</span>
            </div>
            <button className={styles.selectButton}>
              Create Simple Product
            </button>
          </div>

          <div 
            className={styles.productTypeCard}
            onClick={() => handleTypeSelection('variable')}
          >
            <div className={styles.cardIcon}>🎨</div>
            <h2 className={styles.cardTitle}>Variable Product</h2>
            <p className={styles.cardDescription}>
              A product with multiple variations like colors, sizes, or styles. 
              Great for artwork series, prints, or customizable pieces.
            </p>
            <div className={styles.cardFeatures}>
              <span className={styles.feature}>✓ Multiple variations</span>
              <span className={styles.feature}>✓ Different prices</span>
              <span className={styles.feature}>✓ Color & size options</span>
            </div>
            <button className={styles.selectButton}>
              Create Variable Product
            </button>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <p className={styles.footerNote}>
            Don't worry - you can always change these settings later!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductTypeModal; 