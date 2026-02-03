/**
 * ProductForm Wrapper (Backward Compatibility)
 * 
 * This file re-exports the ProductForm component from its new modular location.
 * The actual component now lives in modules/catalog/product-form/
 * 
 * TODO: Update all imports to use the new location and remove this wrapper.
 */

// Re-export everything from the new modular location
export * from '../../../../modules/catalog/components/product-form';
export { default } from '../../../../modules/catalog/components/product-form';
