import { useState, useCallback, useContext } from 'react';
import { productService } from '../../services/productService';
import { ProductCreationContext } from '../contexts/ProductCreationContext';

/**
 * Custom hook for product creation operations
 * Handles API calls and state updates for the product creation process
 */
const useProductCreate = () => {
  const { 
    productData, 
    updateProductData, 
    draftId, 
    setDraftId, 
    setIsLoading, 
    setCurrentStep, 
    setErrorMessage,
    prepareProductDataForSubmission 
  } = useContext(ProductCreationContext);
  
  // State for tracking API operation states
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  /**
   * Initialize a new product draft
   * @returns {Promise<string>} The created draft ID
   */
  const initializeDraft = useCallback(async (initialData = {}) => {
    try {
      setIsLoading(true);
      setErrorMessage(''); // Clear any previous error message
      
      // Add timestamps for debugging purposes
      const requestStartTime = new Date().toISOString();
      console.log(`Initializing draft at ${requestStartTime}`);
      
      // Create a new draft product with initial data
      const response = await productService.createDraft({
        ...initialData,
        status: 'draft'
      });
      
      if (!response || !response.draftId) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server. Draft ID not received.');
      }
      
      console.log(`Draft created with ID: ${response.draftId}`);
      setDraftId(response.draftId);
      return response.draftId;
    } catch (error) {
      // Enhanced error logging with more details
      console.error('Draft initialization error:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        time: new Date().toISOString(),
        initialData: JSON.stringify(initialData)
      });
      
      // Create more user-friendly error messages based on common issues
      let userMessage = 'Failed to initialize draft';
      let errorCode = 'GENERAL_ERROR';
      
      const errorMessage = (error?.message || '').toLowerCase();
      
      if (errorMessage.includes('database operation failed') || errorMessage.includes('bind parameters')) {
        userMessage = 'Our database is currently experiencing issues. This is likely a temporary problem on our server. Please try again in a few minutes.';
        errorCode = 'DATABASE_ERROR';
      } else if (errorMessage.includes('network error') || errorMessage.includes('failed to fetch')) {
        userMessage = 'Network connection issue. Please check your internet connection and try again.';
        errorCode = 'NETWORK_ERROR';
      } else if (errorMessage.includes('user id required') || errorMessage.includes('authentication required')) {
        userMessage = 'You need to be logged in to create a product. Please log in and try again.';
        errorCode = 'AUTH_ERROR';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        userMessage = 'The server took too long to respond. Please try again.';
        errorCode = 'TIMEOUT_ERROR';
      } else if (errorMessage.includes('500')) {
        userMessage = 'Our server encountered an error. Our team has been notified and we are working on it.';
        errorCode = 'SERVER_ERROR';
      } else {
        userMessage = `Error: ${error?.message || 'Unknown error occurred'}`;
      }
      
      // Set error message with code for potential analytics tracking
      setErrorMessage(`${userMessage} (${errorCode})`);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setDraftId, setIsLoading, setErrorMessage]);

  /**
   * Load an existing draft by ID
   * @param {string} id - Draft ID to load
   */
  const loadDraft = useCallback(async (id) => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const draftData = await productService.getDraft(id);
      
      // Update context state with loaded draft data
      updateProductData(draftData);
      setDraftId(id);
      
      // Determine which step to show based on draft completion
      const completedSteps = draftData.completedSteps || [];
      if (completedSteps.length > 0) {
        // Go to the first incomplete step or the last completed step + 1
        const lastCompletedStepIndex = Math.max(...completedSteps.map(step => parseInt(step)));
        setCurrentStep(lastCompletedStepIndex + 1);
      } else {
        // Start from the beginning
        setCurrentStep(0);
      }
      
      return draftData;
    } catch (error) {
      setErrorMessage(`Failed to load draft: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateProductData, setDraftId, setCurrentStep, setIsLoading, setErrorMessage]);

  /**
   * Save draft to database
   */
  const saveDraft = useCallback(async () => {
    try {
      console.log('Attempting to save draft', draftId, '...');
      setIsSaving(true);
      
      // Prepare data for saving to ensure arrays are properly formatted
      const preparedData = prepareProductDataForSubmission(productData);
      
      if (draftId) {
        // Update existing draft
        await productService.updateDraft(draftId, preparedData);
        console.log(`Draft ${draftId} saved successfully`);
      } else {
        // Something went wrong with initialization - create a new draft
        await initializeDraft();
      }
      
      return draftId;
    } catch (error) {
      setErrorMessage(`Failed to save draft: ${error.message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [draftId, productData, setErrorMessage, initializeDraft, prepareProductDataForSubmission]);

  /**
   * Submit product for publishing
   */
  const submitProduct = useCallback(async () => {
    if (!draftId) {
      throw new Error('No active draft to submit');
    }
    
    try {
      setIsSubmitting(true);
      setErrorMessage(''); // Clear any previous error message
      
      // Prepare data for submission
      const preparedData = prepareProductDataForSubmission(productData);
      console.log('Submitting product with prepared data:', preparedData);
      
      // 1. Submit the product to change status from draft to active
      const createdProduct = await productService.createProduct(draftId, preparedData);
      
      // Handle HTML responses or unexpected formats
      if (typeof createdProduct === 'string' || !createdProduct) {
        console.warn('Received unexpected response format:', createdProduct);
        // Create a synthetic product object to continue
        const syntheticProduct = {
          id: draftId,
          name: preparedData.name || 'Published Product',
          status: 'active',
          synthetic: true
        };
        
        // 2. Now handle media files
      if (productData.images && productData.images.length > 0) {
          await handleMediaPublishing(draftId, productData.images, syntheticProduct);
        }
        
        return syntheticProduct;
      }
      
      // Normal flow with proper product object
      if (productData.images && productData.images.length > 0) {
        await handleMediaPublishing(draftId, productData.images, createdProduct);
      }
      
      return createdProduct;
    } catch (error) {
      console.error('Failed to submit product:', error);
      setErrorMessage(`Failed to submit product: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [draftId, productData, setErrorMessage, prepareProductDataForSubmission]);

  // Helper function to handle media publishing (add this outside the submitProduct function)
  const handleMediaPublishing = async (productId, images, productObject) => {
    try {
      console.log(`Publishing ${images.length} media files to media server`);
      const mediaResult = await productService.publishMedia(productId, images);
      
      if (mediaResult.success) {
        console.log('Media published successfully:', mediaResult.successfulUploads);
        
        // Update the product object with media information
        if (typeof productObject === 'object') {
          productObject.images = mediaResult.successfulUploads.map(item => ({
            id: item.fileId,
            url: item.permanentUrl,
            name: item.originalFile.name,
            isFeatured: item.originalFile.isFeatured
          }));
        }
      } else {
        console.warn('Media publishing was not successful');
      }
      
      // Report partial failures
      if (mediaResult.failedUploads && mediaResult.failedUploads.length > 0) {
        console.warn(`${mediaResult.failedUploads.length} media files failed to publish`);
        if (mediaResult.successfulUploads.length === 0) {
          setErrorMessage(`Product published but all media files failed to publish. Please try uploading images again later.`);
        } else {
          setErrorMessage(`Product published with ${mediaResult.successfulUploads.length} images. ${mediaResult.failedUploads.length} images failed.`);
        }
      }
    } catch (mediaError) {
      console.error('Media publishing failed:', mediaError);
      setErrorMessage(`Product published successfully, but media publishing failed: ${mediaError.message}`);
    }
  };

  /**
   * Cancel current draft
   * @returns {Promise<void>}
   */
  const cancelDraft = useCallback(async () => {
    if (!draftId) return;
    
    try {
      setIsLoading(true);
      await productService.cancelDraft(draftId);
      
      // Reset state after cancellation
      setDraftId(null);
    } catch (error) {
      setErrorMessage(`Failed to cancel draft: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [draftId, setDraftId, setIsLoading, setErrorMessage]);

  /**
   * Upload images for the product
   * @param {Array} files - Array of files to upload
   * @param {Function} progressCallback - Callback for upload progress
   * @returns {Promise<Array>} Uploaded image data
   */
  const uploadImages = useCallback(async (files, progressCallback) => {
    if (!draftId) {
      throw new Error('No active draft for image upload');
    }
    
    try {
      setIsLoading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append all files to the FormData
      files.forEach((file, index) => {
        formData.append('productMedia', file);
        formData.append(`metadata_${index}`, JSON.stringify({
          title: file.name,
          fileIndex: index,
          productId: draftId,
          fileType: file.type.split('/')[0]
        }));
      });
      
      // Add product and user context data
      formData.append('productId', draftId);
      formData.append('productName', productData.name || 'Untitled Product');
      
      // Upload the files
      const result = await productService.uploadMedia(draftId, formData, progressCallback);
      
      // Check for error or invalid response
      if (!result) {
        console.error('Media upload returned empty result');
        throw new Error('Upload failed: Empty response from server');
      }
      
      console.log('Media upload result:', result);
      
      // If result is directly an array, return it
      if (Array.isArray(result)) {
        return result;
      }
      
      // Otherwise, find the array in the result object
      if (Array.isArray(result.files)) {
        return result.files;
      }
      
      // If we're here, try to adapt whatever we got
      return [].concat(result).filter(Boolean).map(item => ({
        id: item.id || `upload-${Date.now()}`,
        url: item.url || item.path,
        originalName: item.originalName || item.name,
        isPrimary: !!item.isPrimary
      }));
      
    } catch (error) {
      console.error('Media upload failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [draftId, productData.name, setIsLoading]);

  /**
   * Generate product variants based on selected options
   * @param {Object} variantConfig - Configuration for variant generation
   * @returns {Promise<Array>} Generated variants
   */
  const generateVariants = useCallback(async (variantConfig) => {
    if (!draftId) {
      throw new Error('No active draft for variant generation');
    }
    
    try {
      setIsLoading(true);
      
      const variants = await productService.createVariants(draftId, variantConfig);
      
      // Update product data with generated variants
      updateProductData(prevData => ({
        ...prevData,
        variants
      }));
      
      return variants;
    } catch (error) {
      setErrorMessage(`Failed to generate variants: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [draftId, updateProductData, setIsLoading, setErrorMessage]);

  return {
    isSaving,
    isSubmitting,
    initializeDraft,
    loadDraft,
    saveDraft,
    submitProduct,
    cancelDraft,
    uploadImages,
    generateVariants
  };
};

export default useProductCreate; 