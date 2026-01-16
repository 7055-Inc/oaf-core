'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Collections.module.css';
import { getApiUrl } from '../../lib/config';

export default function Collections() {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('categories'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Find the Shop category and use its children as the main categories
        const allCategories = data.categories || [];
        const shopCategory = allCategories.find(cat => cat.name === 'Shop' || cat.id === 7);
        const shopChildren = shopCategory?.children || [];
        
        setCategories(shopChildren);
        setFlatCategories(data.flat_categories || []);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryProductCount = (categoryId) => {
    const flatCategory = flatCategories.find(cat => cat.id === categoryId);
    return flatCategory ? flatCategory.product_count : 0;
  };

  const getTotalProductCount = (category) => {
    let total = getCategoryProductCount(category.id);
    
    if (category.children && category.children.length > 0) {
      category.children.forEach(child => {
        total += getTotalProductCount(child);
      });
    }
    
    return total;
  };

  const renderCategoryCard = (category, isSubcategory = false) => {
    const productCount = getTotalProductCount(category);
    
    return (
      <Link 
        href={`/category/${category.id}`} 
        key={category.id}
        className={`${styles.categoryCard} ${isSubcategory ? styles.subcategoryCard : ''}`}
      >
        <div className={styles.categoryContent}>
          <h3 className={styles.categoryName}>{category.name}</h3>
          
          {category.description && (
            <p className={styles.categoryDescription}>
              {category.description}
            </p>
          )}
          
          <div className={styles.categoryStats}>
            {productCount > 0 && (
              <span className={styles.productCount}>
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </span>
            )}
            
            {category.children && category.children.length > 0 && (
              <span className={styles.subcategoryCount}>
                {category.children.length} {category.children.length === 1 ? 'subcategory' : 'subcategories'}
              </span>
            )}
          </div>
          
          <div className={styles.cardFooter}>
            <span className={styles.browseText}>Browse Collection →</span>
          </div>
        </div>
      </Link>
    );
  };

  const renderCategorySection = (category) => {
    return (
      <div key={category.id} className={styles.categorySection}>
        {renderCategoryCard(category)}
        
        {category.children && category.children.length > 0 && (
          <div className={styles.subcategoriesGrid}>
            {category.children.map(subcategory => renderCategoryCard(subcategory, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      
      <main className={styles.main}>
        <section className={styles.collectionsSection}>
          <div className={styles.container}>
            
            {error && (
              <div className={styles.errorMessage}>
                <p>Error loading collections: {error}</p>
                <button 
                  onClick={loadCategories}
                  className={styles.retryButton}
                >
                  Try Again
                </button>
              </div>
            )}

            {!error && (
              <>
                {/* Loading Skeleton */}
                {isLoading && (
                  <div className={styles.categoriesContainer}>
                    {[...Array(6)].map((_, index) => (
                      <div key={`skeleton-${index}`} className={styles.skeletonSection}>
                        <div className={styles.skeletonCard}>
                          <div className={styles.skeletonContent}>
                            <div className={styles.skeletonTitle}></div>
                            <div className={styles.skeletonText}></div>
                            <div className={styles.skeletonText}></div>
                            <div className={styles.skeletonStats}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Categories Display */}
                {!isLoading && categories.length > 0 && (
                  <div className={styles.categoriesContainer}>
                    {categories.map(category => renderCategorySection(category))}
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && categories.length === 0 && !error && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📦</div>
                    <h3>No Collections Available</h3>
                    <p>Product collections are being organized. Check back soon!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}
