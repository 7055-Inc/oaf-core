'use client';
import { useState } from 'react';
import { authenticatedApiRequest } from '../../lib/csrf';
import { authApiRequest } from '../../lib/apiUtils';

export default function CSVUploadModal({ 
  isOpen, 
  onClose, 
  jobType = 'inventory_upload',
  title = 'CSV Upload',
  onUploadStart 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const name = droppedFile.name.toLowerCase();
      if (droppedFile.type === 'text/csv' || name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a CSV or Excel file');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const name = selectedFile.name.toLowerCase();
      if (selectedFile.type === 'text/csv' || name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a CSV or Excel file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('jobType', jobType);

      const response = await authApiRequest('csv/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setSuccess(`Upload started! Processing ${result.totalRows} rows.`);
      
      if (onUploadStart) {
        onUploadStart(result.jobId);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await authApiRequest(`csv/template/${jobType}?format=xlsx`);
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${jobType}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleDownloadCurrent = async () => {
    try {
      const response = await authApiRequest(`csv/export/${jobType}?format=xlsx`);
      
      if (!response.ok) {
        throw new Error('Failed to download current data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `current_${jobType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download current data');
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setSuccess(null);
    setUploading(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="error-alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success-alert" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Download Templates</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button onClick={handleDownloadTemplate} className="secondary">
              Download Template
            </button>
            <button onClick={handleDownloadCurrent} className="secondary">
              Download Current Data
            </button>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Download the template to see the required format, or download current data to edit and re-upload.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Upload File</h3>
          
          <div
            style={{
              border: dragActive ? '2px dashed #055474' : '2px dashed #e9ecef',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(5, 84, 116, 0.05)' : '#f8f9fa',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csvFileInput').click()}
          >
            <input
              type="file"
              id="csvFileInput"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            {file ? (
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#055474' }}>
                  Selected: {file.name}
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                  Drop CSV or Excel file here or click to browse
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                  Maximum file size: 50MB
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            className="secondary"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            style={{
              opacity: (uploading || !file) ? '0.6' : '1',
              cursor: (uploading || !file) ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
} 