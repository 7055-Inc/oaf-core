import React from 'react';
import { ProductCreationProvider } from '../contexts/ProductCreationContext';
import ProductCreationWizard from '../components/creation/ProductCreationWizard';
import { useNavigate } from 'react-router-dom';

/**
 * Page component for product creation
 * Wraps the ProductCreationWizard in the necessary context provider
 */
const ProductCreationPage = () => {
  const navigate = useNavigate();
  
  // Handle completion of product creation
  const handleComplete = (product) => {
    // Navigate to the product page or vendor dashboard
    navigate(`/product/${product.id}`);
  };
  
  // Handle cancellation of product creation
  const handleCancel = () => {
    // Navigate back to vendor dashboard
    navigate('/vendor/products');
  };
  
  return (
    <div className="product-creation-page">
      <ProductCreationProvider>
        <ProductCreationWizard 
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </ProductCreationProvider>
    </div>
  );
};

export default ProductCreationPage; 