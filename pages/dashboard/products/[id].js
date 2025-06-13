'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../components/Header';
import styles from '../../../pages/products/styles/ProductForm.module.css';

export default function EditProduct() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    available_qty: 10,
    category_id: 1,
    sku: '',
    status: 'draft',
    width: '',
    height: '',
    depth: '',
    weight: '',
    dimension_unit: 'in',
    weight_unit: 'lbs',
    parent_id: '',
    product_type: '',
    images: []
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0];
        const res = await fetch(`https://api2.onlineartfestival.com/products/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to fetch product');
        
        const data = await res.json();
        console.log('Product data:', data);
        console.log('Product images:', data.images);
        
        // Ensure image URLs are absolute
        const images = data.images?.map(img => {
          if (img.startsWith('http')) return img;
          return `https://api2.onlineartfestival.com${img}`;
        }) || [];

        setFormData({
          name: data.name || '',
          description: data.description || '',
          short_description: data.short_description || '',
          price: data.price || '',
          available_qty: data.available_qty || 10,
          category_id: data.category_id || 1,
          sku: data.sku || '',
          status: data.status || 'draft',
          width: data.width || '',
          height: data.height || '',
          depth: data.depth || '',
          weight: data.weight || '',
          dimension_unit: data.dimension_unit || 'in',
          weight_unit: data.weight_unit || 'lbs',
          parent_id: data.parent_id || '',
          product_type: data.product_type || '',
          images: images
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'parent_id' && value === '' ? null : value;
    setFormData({ ...formData, [name]: newValue });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const token = document.cookie.split('token=')[1]?.split(';')[0];
      console.log('Uploading images:', files);
      
      // Make sure we have a valid product ID
      if (!params.id) {
        throw new Error('Product ID is required for image upload');
      }

      const res = await fetch(`https://api2.onlineartfestival.com/products/upload?product_id=${params.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to upload images');
      }
      
      const data = await res.json();
      console.log('Upload response:', data);
      
      if (!data.urls || !Array.isArray(data.urls)) {
        console.error('Invalid upload response:', data);
        throw new Error('Invalid upload response format');
      }

      // Ensure image URLs are absolute
      const newImages = data.urls.map(url => {
        if (url.startsWith('http')) return url;
        // If the URL starts with a slash, it's a relative path
        if (url.startsWith('/')) {
          return `https://api2.onlineartfestival.com${url}`;
        }
        // If it's a relative path without a leading slash
        return `https://api2.onlineartfestival.com/${url}`;
      });

      console.log('Processed image URLs:', newImages);

      setFormData(prev => {
        const updatedImages = [...(prev.images || []), ...newImages];
        console.log('Updated images array:', updatedImages);
        return {
          ...prev,
          images: updatedImages
        };
      });
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      console.log('Submitting product with data:', formData);
      
      const payload = { 
        ...formData, 
        parent_id: formData.parent_id || null,
        images: formData.images || [] // Ensure images array is included
      };
      
      console.log('Submit payload:', payload);
      
      const res = await fetch(`https://api2.onlineartfestival.com/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Submit failed:', errorData);
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      const responseData = await res.json();
      console.log('Submit response:', responseData);
      
      router.push('/dashboard/products');
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    setLoading(true);
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      const res = await fetch(`https://api2.onlineartfestival.com/products/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
      router.push('/dashboard/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.name) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.content}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>
        <h1 className={styles.title}>Edit Product</h1>
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formSection}>
              <h2>Basic Information</h2>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Short Description</label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength={200}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.formSection}>
              <h2>Pricing & Inventory</h2>
              <div className={styles.formGroup}>
                <label>Price</label>
                <div className={styles.inputGroup}>
                  <span className={styles.currency}>$</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    step="0.01"
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Available Quantity</label>
                <input
                  type="number"
                  name="available_qty"
                  value={formData.available_qty}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Status</label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2>Dimensions & Weight</h2>
              <div className={styles.dimensionsGrid}>
                <div className={styles.formGroup}>
                  <label>Width</label>
                  <div className={styles.inputGroup}>
                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleChange}
                      step="0.01"
                      className={styles.input}
                    />
                    <select
                      name="dimension_unit"
                      value={formData.dimension_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Height</label>
                  <div className={styles.inputGroup}>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      step="0.01"
                      className={styles.input}
                    />
                    <select
                      name="dimension_unit"
                      value={formData.dimension_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Depth</label>
                  <div className={styles.inputGroup}>
                    <input
                      type="number"
                      name="depth"
                      value={formData.depth}
                      onChange={handleChange}
                      step="0.01"
                      className={styles.input}
                    />
                    <select
                      name="dimension_unit"
                      value={formData.dimension_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Weight</label>
                  <div className={styles.inputGroup}>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      step="0.01"
                      className={styles.input}
                    />
                    <select
                      name="weight_unit"
                      value={formData.weight_unit}
                      onChange={handleChange}
                      className={styles.unitSelect}
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h2>Images</h2>
              <div className={styles.imageUpload}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className={styles.fileInput}
                />
                <div className={styles.uploadButton}>
                  {loading ? 'Uploading...' : 'Upload Images'}
                </div>
              </div>
              
              {formData.images.length > 0 && (
                <div className={styles.imagePreview}>
                  {formData.images.map((url, index) => (
                    <div key={index} className={styles.imageThumbnail}>
                      <img 
                        src={url} 
                        alt={`Product ${index + 1}`} 
                        onError={(e) => {
                          console.error('Image failed to load:', url);
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className={styles.imageUrl}>{url}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <div className={styles.actionButtons}>
              <button 
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push('/dashboard/products')}
                disabled={loading}
              >
                Back to Products
              </button>
              <button 
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={loading}
              >
                Delete Product
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 