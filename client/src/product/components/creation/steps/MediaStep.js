import React, { useState, useRef, useContext, useEffect } from 'react';
import { ProductCreationContext } from '../../../contexts/ProductCreationContext';
import useProductCreate from '../../../hooks/useProductCreate';
import './Steps.css';

/**
 * Media upload step of the product creation wizard
 * Allows users to upload up to 15 product images/videos
 */
const MediaStep = () => {
  const { productData, updateField, draftId } = useContext(ProductCreationContext);
  const { uploadImages } = useProductCreate();
  
  // Local state for file management
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  
  // Initialize files from product data if available
  useEffect(() => {
    if (productData.images && productData.images.length > 0) {
      const existingImages = productData.images.map((image, index) => ({
        id: image.id || `existing-${index}`,
        name: image.friendly_name || image.name || `Image ${index + 1}`,
        url: image.image_url || image.url,
        isUploaded: true,
        isFeatured: image.is_primary || index === 0
      }));
      
      setFiles(existingImages);
    }
  }, [productData.images]);
  
  // Handle file input change
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
    e.target.value = '';
  };
  
  // Handle click on the upload area
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  // Add files to the state with validation
  const addFiles = (selectedFiles) => {
    if (files.length + selectedFiles.length > 15) {
      setErrorMessage('You can upload a maximum of 15 files per product');
      return;
    }
    
    setErrorMessage('');
    
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const validFiles = [];
    const oversizedFiles = [];
    
    selectedFiles.forEach(file => {
      const fileType = file.type.split('/')[0];
      const isImage = fileType === 'image';
      const isVideo = fileType === 'video';
      
      if (!isImage && !isVideo) {
        setErrorMessage('Only image and video files are supported');
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        // For images, we'll try to compress them later
        if (isImage) {
          oversizedFiles.push(file);
        } else {
        setErrorMessage(`File "${file.name}" is too large. Maximum size is 5MB.`);
        }
      } else {
        validFiles.push(file);
      }
    });
    
    // Process valid files immediately
    if (validFiles.length > 0) {
      processValidFiles(validFiles);
    }
    
    // Handle oversized images with compression
    if (oversizedFiles.length > 0) {
      compressImages(oversizedFiles);
    }
  };
  
  // Process files that are already valid (under size limit)
  const processValidFiles = (validFiles) => {
    const newFiles = validFiles.map(file => {
      const fileType = file.type.split('/')[0];
      const isImage = fileType === 'image';
      const isVideo = fileType === 'video';
      const previewUrl = URL.createObjectURL(file);
      
      return {
        id: `local-${file.name}-${file.size}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: previewUrl,
        isImage,
        isVideo,
        isUploaded: false,
        isFeatured: files.length === 0
      };
    });
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };
  
  // Compress oversized images
  const compressImages = async (oversizedFiles) => {
    setIsUploading(true);
    setErrorMessage('Processing oversized images...');
    
    const compressedFiles = [];
    
    for (const file of oversizedFiles) {
      try {
        const compressedFile = await compressImage(file);
        compressedFiles.push(compressedFile);
      } catch (error) {
        console.error(`Failed to compress image ${file.name}:`, error);
        setErrorMessage(`Failed to compress image ${file.name}: ${error.message}`);
      }
    }
    
    setIsUploading(false);
    setErrorMessage('');
    
    if (compressedFiles.length > 0) {
      processValidFiles(compressedFiles);
    }
  };
  
  // Compress a single image file
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Maintain aspect ratio while reducing dimensions
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          
          if (width > height && width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels until we get under the size limit
          let quality = 0.8;
          let compressedDataURL;
          let compressedBlob;
          
          const compress = () => {
            compressedDataURL = canvas.toDataURL('image/jpeg', quality);
            
            // Convert base64 to Blob
            const byteString = atob(compressedDataURL.split(',')[1]);
            const mimeString = compressedDataURL.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            
            compressedBlob = new Blob([ab], { type: mimeString });
            
            if (compressedBlob.size > MAX_FILE_SIZE && quality > 0.1) {
              quality -= 0.1;
              compress();
            } else {
              const compressedFile = new File([compressedBlob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              resolve(compressedFile);
            }
          };
          
          compress();
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image for compression'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file for compression'));
      };
    });
  };
  
  // Handle file removal
  const handleRemoveFile = (id) => {
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.filter(file => file.id !== id);
      
      if (prevFiles.find(file => file.id === id)?.isFeatured && updatedFiles.length > 0) {
        updatedFiles[0].isFeatured = true;
      }
      
      return updatedFiles;
    });
  };
  
  // Set a file as the featured image
  const handleSetFeatured = (id) => {
    setFiles(prevFiles =>
      prevFiles.map(file => ({
        ...file,
        isFeatured: file.id === id
      }))
    );
  };
  
  // Handle drag and drop events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (files.length === 0 || files.every(f => f.isUploaded)) {
      return; // No files to upload
    }
    
    setIsUploading(true);
    setErrorMessage('');
    
    try {
      // Filter out already uploaded files
      const filesToUpload = files.filter(f => !f.isUploaded);
      
      // Create file objects from the selected files
      const fileObjects = filesToUpload.map(file => file.file);
      
      // Track progress
      const progressHandler = (event) => {
        if (!event || !event.total) return;
        
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        setUploadProgress(prev => ({
          ...prev,
          [event.target && event.target.upload ? event.target.upload.uuid : `upload-${Date.now()}`]: percentCompleted
        }));
      };
      
      // Upload files
      const result = await uploadImages(fileObjects, progressHandler);
      console.log('Upload completed:', result);
      
      // Process the uploaded files
      handleUploadSuccess(result);
      
    } catch (error) {
      console.error('Upload failed:', error);
      
      if (error.message && error.message.includes('413')) {
        setErrorMessage(`File size too large for server. Please try smaller images or fewer files at once.`);
      } else {
        setErrorMessage(`Failed to upload files: ${error.message}`);
      }
      
      setIsUploading(false);
    }
  };

  // Handle upload response
  const handleUploadSuccess = (uploadedFiles) => {
    if (!Array.isArray(uploadedFiles)) {
      console.warn('Upload response is not an array:', uploadedFiles);
      setErrorMessage('Unexpected response format from server');
      setIsUploading(false);
      return;
    }
    
    console.log('Received uploaded files:', uploadedFiles);
    
    // Process each file and add to state
    const newFiles = uploadedFiles.map((file, index) => {
      // Ensure each file has a valid URL
      let fileUrl = file.url;
      
      // If URL is a relative path, make it absolute
      if (fileUrl && fileUrl.startsWith('/')) {
        fileUrl = `${window.location.origin}${fileUrl}`;
      }
      
      // If no URL provided, construct a fallback
      if (!fileUrl && file.filename) {
        fileUrl = `${window.location.origin}/tmp/${file.filename}`;
      }
      
      console.log(`Processing uploaded file with URL: ${fileUrl}`);
      
      // Create an image object to preload the thumbnail
      const img = new Image();
      img.src = fileUrl;
      
      return {
        id: file.id || `upload-${Date.now()}-${index}`,
        name: file.originalName || file.friendly_name || `File ${index + 1}`,
        url: fileUrl,
        isUploaded: true,
        isFeatured: file.isPrimary || uploadedFiles.length === 1,
        lastUpdated: Date.now(), // Add timestamp to force re-render
        preloaded: true // Flag to indicate this image is preloaded
      };
    });
    
    // Remove temp files that have been uploaded and replace with uploaded versions
    const localFileIds = files.filter(f => !f.isUploaded).map(f => f.id);
    const remainingFiles = files.filter(f => f.isUploaded);
    
    // Merge remaining files with new files (replace old with new)
    const updatedFiles = [...remainingFiles, ...newFiles];
    console.log('Updated file list:', updatedFiles);
    
    // Update state with new files
    setFiles(updatedFiles);
    
    // Update product data with new images
    const allImages = [...(productData.images || []), ...newFiles];
    updateField('images', allImages);
    
    // Display success message
    setErrorMessage(`Successfully uploaded ${newFiles.length} file(s)`);
    setIsUploading(false);
    setUploadProgress({});
    
    // Force re-render to ensure thumbnails are displayed
    setTimeout(() => {
      console.log('Forcing re-render of thumbnails');
      setFiles([...updatedFiles]);
    }, 100);
  };

  // Render thumbnail for a file
  const renderThumbnail = (file) => {
    if (!file.url) {
      return <div className="file-thumbnail placeholder">No Preview</div>;
    }
    
    // For images, show thumbnail
    if (file.url.match(/\.(jpeg|jpg|gif|png)$/i)) {
    return (
        <div className="file-thumbnail">
          <img 
            src={file.url} 
            alt={file.name} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
            }}
            style={{ 
              key: file.lastUpdated || Date.now(),
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              border: file.isFeatured ? '2px solid #4CAF50' : 'none'
            }} 
          />
          {file.isFeatured && (
            <div className="featured-badge" style={{ 
              position: 'absolute', 
              top: '5px', 
              right: '5px', 
              backgroundColor: '#4CAF50', 
              color: 'white',
              padding: '2px 5px',
              fontSize: '10px',
              borderRadius: '2px'
            }}>
              Featured
            </div>
          )}
        </div>
      );
    }
    
    // For videos, show video frame
    if (file.url.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <div className="file-thumbnail">
          <video src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay">
            <span>▶️</span>
          </div>
      </div>
    );
    }
    
    // Default placeholder
    return <div className="file-thumbnail placeholder">Unknown Type</div>;
  };

  return (
    <div className="media-step">
      {/* Product ID display at top corner */}
      {draftId && (
        <div style={{ 
          fontFamily: '"OCR A Std", "OCR-A", "Courier New", monospace', 
          fontSize: '14px',
          padding: '4px',
          fontWeight: 'normal',
          textAlign: 'right',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}>
          Product ID: {draftId}
        </div>
      )}

      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? '#f0f7ff' : '#f8f9fa',
          transition: 'all 0.3s ease',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
        />
        <div className="upload-icon" style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
        <div className="upload-message" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          <p>Drag and drop files here or click to browse</p>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p>Maximum file size: 5MB</p>
          <p>Supported formats: JPG, PNG, GIF, MP4</p>
        </div>
      </div>

      {errorMessage && (
        <div className={`message ${errorMessage.includes('success') ? 'success' : 'error'}`}>
          {errorMessage}
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-preview">
                {renderThumbnail(file)}
                {uploadProgress[file.id] && !file.isUploaded && (
                  <div className="upload-progress">
                    <div 
                      className="progress-bar"
                      style={{ width: `${uploadProgress[file.id]}%` }}
                    />
                    </div>
                  )}
                </div>
                <div className="file-info">
                <span className="file-name">{file.name}</span>
                <div className="file-actions">
                    <button 
                    className={`featured-button ${file.isFeatured ? 'active' : ''}`}
                    onClick={() => handleSetFeatured(file.id)}
                    title={file.isFeatured ? 'Featured image' : 'Set as featured'}
                  >
                    <i className="fas fa-star"></i>
                    </button>
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveFile(file.id)}
                    title="Remove file"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>
      )}
          
          {files.some(file => !file.isUploaded) && (
            <button 
              className="upload-button"
              onClick={handleUpload}
            >
          Upload Files
            </button>
      )}
    </div>
  );
};

export default MediaStep; 