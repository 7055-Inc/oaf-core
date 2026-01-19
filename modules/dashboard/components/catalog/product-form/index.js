import { useEffect } from 'react';
import { ProductFormProvider, useProductForm } from './ProductFormContext';
import AccordionSection from '../../shared/AccordionSection';
import ProductStatusHeader from './ProductStatusHeader';

// Section components
import ProductTypeSection, { getProductTypeSummary } from './sections/ProductTypeSection';
import BasicInfoSection, { getBasicInfoSummary } from './sections/BasicInfoSection';
import DescriptionSection, { getDescriptionSummary } from './sections/DescriptionSection';
import ImagesSection, { getImagesSummary } from './sections/ImagesSection';
import InventorySection, { getInventorySummary } from './sections/InventorySection';
import ShippingSection, { getShippingSummary } from './sections/ShippingSection';
import SearchControlSection, { getSearchControlSummary } from './sections/SearchControlSection';
import WholesaleSection, { getWholesaleSummary } from './sections/WholesaleSection';
import VariationsSection, { getVariationsSummary } from './sections/VariationsSection';

// Connector sections (lazy loaded based on addons)
import dynamic from 'next/dynamic';
const WalmartSection = dynamic(() => import('./sections/connectors/WalmartSection'), { ssr: false });
const TikTokSection = dynamic(() => import('./sections/connectors/TikTokSection'), { ssr: false });

// Main form content (uses context)
function ProductFormContent() {
  const {
    mode,
    formData,
    inventoryData,
    variations,
    sectionStatus,
    activeSection,
    saving,
    error,
    setError,
    hasAddon,
    loadCategories,
    loadUserAddons,
    completeSection,
    openSection,
    saveDraft,
    publishProduct,
    isReadyToPublish
  } = useProductForm();

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadUserAddons();
  }, [loadCategories, loadUserAddons]);

  // Define sections (icons use Font Awesome classes)
  const sections = [
    {
      id: 'productType',
      title: 'Product Type',
      icon: 'fa-cube',
      component: ProductTypeSection,
      getSummary: () => getProductTypeSummary(formData),
      show: true,
      nextSection: 'basicInfo',
      validate: () => !!formData.product_type,
      requiresSave: false // Don't save yet - no required fields
    },
    {
      id: 'basicInfo',
      title: 'Basic Information',
      icon: 'fa-edit',
      component: BasicInfoSection,
      getSummary: () => getBasicInfoSummary(formData),
      show: true,
      nextSection: 'description',
      validate: () => formData.name && formData.price && formData.sku,
      requiresSave: true // First section that saves draft
    },
    {
      id: 'description',
      title: 'Description',
      icon: 'fa-file-alt',
      component: DescriptionSection,
      getSummary: () => getDescriptionSummary(formData),
      show: true,
      nextSection: 'images',
      validate: () => true // Optional
    },
    {
      id: 'images',
      title: 'Images',
      icon: 'fa-camera',
      component: ImagesSection,
      getSummary: () => getImagesSummary(formData),
      show: true,
      nextSection: 'inventory',
      validate: () => true // Optional but recommended
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: 'fa-boxes',
      component: InventorySection,
      getSummary: () => getInventorySummary(inventoryData, mode),
      show: true,
      nextSection: 'shipping',
      validate: () => true
    },
    {
      id: 'shipping',
      title: 'Shipping',
      icon: 'fa-truck',
      component: ShippingSection,
      getSummary: () => getShippingSummary(formData),
      show: true,
      nextSection: 'searchControl',
      validate: () => !!formData.ship_method
    },
    {
      id: 'searchControl',
      title: 'Search & Feeds',
      icon: 'fa-search',
      component: SearchControlSection,
      getSummary: () => getSearchControlSummary(formData),
      show: true,
      nextSection: hasAddon('wholesale-addon') ? 'wholesale' : (formData.product_type === 'variable' ? 'variations' : (hasAddon('walmart-connector') ? 'walmart' : (hasAddon('tiktok-connector') ? 'tiktok' : null))),
      validate: () => true // Optional
    },
    {
      id: 'wholesale',
      title: 'Wholesale',
      icon: 'fa-industry',
      component: WholesaleSection,
      getSummary: () => getWholesaleSummary(formData),
      show: hasAddon('wholesale-addon'),
      nextSection: formData.product_type === 'variable' ? 'variations' : (hasAddon('walmart-connector') ? 'walmart' : (hasAddon('tiktok-connector') ? 'tiktok' : null)),
      validate: () => true // Optional
    },
    {
      id: 'variations',
      title: 'Variations',
      icon: 'fa-palette',
      component: VariationsSection,
      getSummary: () => getVariationsSummary(variations),
      show: formData.product_type === 'variable',
      nextSection: hasAddon('walmart-connector') ? 'walmart' : (hasAddon('tiktok-connector') ? 'tiktok' : null),
      validate: () => variations.length > 0
    },
    // Connector sections - only show if user has addon
    {
      id: 'walmart',
      title: 'Walmart Marketplace',
      icon: 'fa-store',
      component: WalmartSection,
      getSummary: () => 'Configure Walmart listing',
      show: hasAddon('walmart-connector'),
      nextSection: hasAddon('tiktok-connector') ? 'tiktok' : null,
      validate: () => true // Optional
    },
    {
      id: 'tiktok',
      title: 'TikTok Shop',
      icon: 'fa-music',
      component: TikTokSection,
      getSummary: () => 'Configure TikTok listing',
      show: hasAddon('tiktok-connector'),
      nextSection: null,
      validate: () => true // Optional
    }
  ];

  // Filter visible sections
  const visibleSections = sections.filter(s => s.show);

  // Handle section completion
  const handleSectionNext = async (section) => {
    if (!section.validate()) {
      setError('Please fill in all required fields before continuing.');
      return; // Validation failed
    }

    // Only save draft if section requires it (has enough data)
    if (section.requiresSave !== false) {
      try {
        await saveDraft();
      } catch (err) {
        // Error is set in context
        return;
      }
    }
    
    completeSection(section.id, section.nextSection);
  };

  // Handle publish
  const handlePublish = async () => {
    const success = await publishProduct();
    if (success) {
      // Could redirect or show success message
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Status Header - shows product status info after first save */}
      <ProductStatusHeader />

      {/* Error display */}
      {error && (
        <div className="error-alert" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Sections */}
      {visibleSections.map((section, index) => {
        const SectionComponent = section.component;
        const isLast = index === visibleSections.length - 1;
        
        return (
          <AccordionSection
            key={section.id}
            id={section.id}
            title={section.title}
            icon={section.icon}
            status={sectionStatus[section.id]}
            isOpen={activeSection === section.id}
            summary={section.getSummary()}
            onToggle={() => openSection(activeSection === section.id ? null : section.id)}
            onNext={() => handleSectionNext(section)}
            nextLabel={saving ? 'Saving...' : 'Continue'}
            showNext={mode === 'create' || activeSection === section.id}
            isLast={isLast}
          >
            <SectionComponent />
          </AccordionSection>
        );
      })}

      {/* Publish / Update Button */}
      {(isReadyToPublish() || mode === 'edit') && (
        <div className="publish-section">
          <button
            onClick={handlePublish}
            disabled={saving}
            className="publish-button"
          >
            {saving ? 'Saving...' : (mode === 'create' ? 'Publish Product' : 'Update Product')}
          </button>
          <p className="publish-hint">
            {mode === 'create' 
              ? 'Your product will go live immediately after publishing'
              : 'Changes will be applied immediately'}
          </p>
        </div>
      )}

      {/* Draft status indicator */}
      {mode === 'create' && formData.status === 'draft' && (
        <p className="draft-hint">Your progress is automatically saved as a draft</p>
      )}
    </div>
  );
}

// Wrapper component with provider
export default function ProductForm({ userData, productId = null, initialData = null }) {
  return (
    <ProductFormProvider 
      userData={userData} 
      productId={productId} 
      initialData={initialData}
    >
      <ProductFormContent />
    </ProductFormProvider>
  );
}

// Also export individual components for flexibility
export { 
  ProductFormProvider, 
  useProductForm,
  ProductTypeSection,
  BasicInfoSection,
  DescriptionSection,
  ImagesSection,
  InventorySection,
  ShippingSection,
  VariationsSection
};

// Re-export AccordionSection from shared for backwards compatibility
export { default as AccordionSection } from '../../shared/AccordionSection';

