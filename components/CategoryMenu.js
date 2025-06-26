'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './CategoryMenu.module.css';

export default function CategoryMenu() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const menuBarRef = useRef(null);
  const modalRef = useRef(null);
  let closeTimeout = useRef();

  useEffect(() => {
    loadCategories();
    return () => clearTimeout(closeTimeout.current);
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://api2.onlineartfestival.com/categories');
      if (!res.ok) {
        throw new Error('Failed to load categories');
      }
      const data = await res.json();
      setCategories(data.categories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    window.location.href = `/category/${categoryId}`;
  };

  // Robust hover logic
  const handleMenuEnter = (category) => {
    clearTimeout(closeTimeout.current);
    setActiveCategory(category);
    setModalOpen(true);
  };
  const handleMenuLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setModalOpen(false);
      setActiveCategory(null);
    }, 80);
  };
  const handleModalEnter = () => {
    clearTimeout(closeTimeout.current);
    setModalOpen(true);
  };
  const handleModalLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setModalOpen(false);
      setActiveCategory(null);
    }, 80);
  };

  const renderCategoryTree = (categoryList, level = 0) => {
    return categoryList.map(category => (
      <div key={category.id} className={styles.categoryItem}>
        <div 
          className={`${styles.categoryLink} ${level === 0 ? styles.topLevel : styles.subLevel} ${styles[`level${level}`]}`}
          onClick={() => handleCategoryClick(category.id)}
        >
          {category.name}
          {category.child_count > 0 && <span className={styles.childCount}> ({category.child_count})</span>}
        </div>
        {category.children && category.children.length > 0 && (
          <div className={styles.subCategories}>
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return <div className={styles.loading}>Loading categories...</div>;
  }

  if (error) {
    return <div className={styles.error}>Failed to load categories</div>;
  }

  return (
    <div className={styles.categoryMenuContainer}>
      {/* Horizontal Menu Bar */}
      <div
        className={styles.horizontalMenu}
        ref={menuBarRef}
        onMouseLeave={handleMenuLeave}
      >
        {categories.map(category => (
          <div
            key={category.id}
            className={styles.menuItem}
            onMouseEnter={() => handleMenuEnter(category)}
            // onMouseLeave handled at bar level
          >
            <span className={styles.menuLink}>{category.name}</span>
          </div>
        ))}
      </div>

      {/* Dropdown Outline */}
      {modalOpen && activeCategory && (
        <div
          className={styles.dropdownOutline}
          ref={modalRef}
          onMouseEnter={handleModalEnter}
          onMouseLeave={handleModalLeave}
        >
          <div className={styles.outlineContent}>
            {renderCategoryTree([activeCategory])}
          </div>
        </div>
      )}
    </div>
  );
} 