'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import styles from './Edit.module.css';
import { authApiRequest } from '../../lib/apiUtils';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';

// Available art categories for dropdown
const ART_CATEGORIES = [
  'Abstract', 'Acrylic Painting', 'Collage', 'Contemporary', 'Digital Art',
  'Drawing', 'Fiber Arts', 'Illustration', 'Jewelry', 'Mixed Media',
  'Oil Painting', 'Painting', 'Photography', 'Pottery', 'Printmaking',
  'Sculpture', 'Textiles', 'Watercolor', 'Wood Working'
];

// Available art mediums for dropdown
const ART_MEDIUMS = [
  'Acrylic', 'Oil', 'Watercolor', 'Pencil', 'Charcoal', 'Ink', 'Pastel',
  'Digital', 'Mixed Media', 'Collage', 'Photography', 'Sculpture', 'Ceramic',
  'Glass', 'Metal', 'Wood', 'Fabric', 'Paper', 'Stone', 'Resin'
];

// Gender options
const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Custom', label: 'Custom' },
  { value: 'Prefer Not To Say', label: 'Prefer Not To Say' }
];

// Education levels
const EDUCATION_OPTIONS = [
  { value: '', label: 'Select Education Level' },
  { value: 'Some High School', label: 'Some High School' },
  { value: 'High School Graduate', label: 'High School Graduate' },
  { value: 'Associates', label: 'Associates Degree' },
  { value: 'Bachelors', label: 'Bachelors Degree' },
  { value: 'Masters', label: 'Masters Degree' },
  { value: 'Doctorate', label: 'Doctorate' },
  { value: 'Post-Doctorate', label: 'Post-Doctorate' }
];

// Art style preferences
const ART_STYLE_OPTIONS = [
  { value: '', label: 'Select Art Style' },
  { value: 'Modern', label: 'Modern' },
  { value: 'Contemporary', label: 'Contemporary' },
  { value: 'Traditional', label: 'Traditional' },
  { value: 'Abstract', label: 'Abstract' },
  { value: 'Realism', label: 'Realism' },
  { value: 'Impressionism', label: 'Impressionism' },
  { value: 'Expressionism', label: 'Expressionism' },
  { value: 'Minimalism', label: 'Minimalism' },
  { value: 'Pop Art', label: 'Pop Art' },
  { value: 'Surrealism', label: 'Surrealism' }
];

// Organization size options
const ORGANIZATION_SIZE_OPTIONS = [
  { value: '', label: 'Select Organization Size' },
  { value: 'Less than 5', label: 'Less than 5 employees' },
  { value: '5-9', label: '5-9 employees' },
  { value: '10-14', label: '10-14 employees' },
  { value: '15-20', label: '15-20 employees' },
  { value: '21-50', label: '21-50 employees' },
  { value: '50+', label: '50+ employees' }
];

// Timezone options (common US timezones)
const TIMEZONE_OPTIONS = [
  { value: '', label: 'Select Timezone' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' }
];

// Color options for favorite colors
const COLOR_OPTIONS = [
  { value: '#FF0000', label: 'Red', color: '#FF0000' },
  { value: '#FF8000', label: 'Orange', color: '#FF8000' },
  { value: '#FFFF00', label: 'Yellow', color: '#FFFF00' },
  { value: '#80FF00', label: 'Lime', color: '#80FF00' },
  { value: '#00FF00', label: 'Green', color: '#00FF00' },
  { value: '#00FF80', label: 'Mint', color: '#00FF80' },
  { value: '#00FFFF', label: 'Cyan', color: '#00FFFF' },
  { value: '#0080FF', label: 'Sky Blue', color: '#0080FF' },
  { value: '#0000FF', label: 'Blue', color: '#0000FF' },
  { value: '#8000FF', label: 'Purple', color: '#8000FF' },
  { value: '#FF00FF', label: 'Magenta', color: '#FF00FF' },
  { value: '#FF0080', label: 'Pink', color: '#FF0080' },
  { value: '#8B4513', label: 'Brown', color: '#8B4513' },
  { value: '#000000', label: 'Black', color: '#000000' },
  { value: '#808080', label: 'Gray', color: '#808080' },
  { value: '#FFFFFF', label: 'White', color: '#FFFFFF' }
];

export default function ProfileEdit() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    bio: '',
    website: '',
    birth_date: '',
    gender: '',
    nationality: '',
    languages_known: [],
    job_title: '',
    education: '',
    awards: '',
    memberships: '',
    timezone: '',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    social_twitter: '',
    social_pinterest: '',
    social_whatsapp: '',
    artist_biography: '',
    art_categories: [],
    art_mediums: [],
    does_custom: 'no',
    custom_details: '',
    business_name: '',
    studio_address_line1: '',
    studio_address_line2: '',
    studio_city: '',
    studio_state: '',
    studio_zip: '',
    business_website: '',
    business_phone: '',
    business_social_facebook: '',
    business_social_instagram: '',
    business_social_tiktok: '',
    business_social_twitter: '',
    business_social_pinterest: '',
    founding_date: '',
    logo_path: '',
    art_style_preferences: '',
    favorite_colors: [],
    art_interests: '',
    wishlist: '',
    upcoming_events: '',
    is_non_profit: 'no',
    organization_size: '',
    sponsorship_options: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [headerImage, setHeaderImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authApiRequest('users/me', {
          method: 'GET'
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch user profile');
        }
        const data = await res.json();
        setUser(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          display_name: data.display_name || '',
          phone: data.phone || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          bio: data.bio || '',
          website: data.website || '',
          birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
          gender: data.gender || '',
          nationality: data.nationality || '',
          languages_known: data.languages_known || [],
          job_title: data.job_title || '',
          education: data.education || '',
          awards: data.awards || '',
          memberships: data.memberships || '',
          timezone: data.timezone || '',
          social_facebook: data.social_facebook || '',
          social_instagram: data.social_instagram || '',
          social_tiktok: data.social_tiktok || '',
          social_twitter: data.social_twitter || '',
          social_pinterest: data.social_pinterest || '',
          social_whatsapp: data.social_whatsapp || '',
          artist_biography: data.artist_biography || '',
          art_categories: data.art_categories || [],
          art_mediums: data.art_mediums || [],
          does_custom: data.does_custom || 'no',
          custom_details: data.custom_details || '',
          business_name: data.business_name || '',
          studio_address_line1: data.studio_address_line1 || '',
          studio_address_line2: data.studio_address_line2 || '',
          studio_city: data.studio_city || '',
          studio_state: data.studio_state || '',
          studio_zip: data.studio_zip || '',
          business_website: data.business_website || '',
          business_phone: data.business_phone || '',
          business_social_facebook: data.business_social_facebook || '',
          business_social_instagram: data.business_social_instagram || '',
          business_social_tiktok: data.business_social_tiktok || '',
          business_social_twitter: data.business_social_twitter || '',
          business_social_pinterest: data.business_social_pinterest || '',
          founding_date: data.founding_date ? data.founding_date.split('T')[0] : '',
          logo_path: data.logo_path || '',
          art_style_preferences: data.art_style_preferences || '',
          favorite_colors: data.favorite_colors || [],
          art_interests: data.art_interests ? JSON.stringify(data.art_interests) : '[]',
          wishlist: data.wishlist ? JSON.stringify(data.wishlist) : '[]',
          upcoming_events: data.upcoming_events ? JSON.stringify(data.upcoming_events) : '[]',
          is_non_profit: data.is_non_profit || 'no',
          organization_size: data.organization_size || '',
          sponsorship_options: data.sponsorship_options || ''
        });
      } catch (err) {
        console.error(err.message);
        setError(err.message);
      }
    };

    fetchUser();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (category) => {
    const currentCategories = formData.art_categories || [];
    const updatedCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    setFormData({ ...formData, art_categories: updatedCategories });
  };

  const handleMediumChange = (medium) => {
    const currentMediums = formData.art_mediums || [];
    const updatedMediums = currentMediums.includes(medium)
      ? currentMediums.filter(m => m !== medium)
      : [...currentMediums, medium];
    
    setFormData({ ...formData, art_mediums: updatedMediums });
  };

  const handleColorChange = (color) => {
    const currentColors = formData.favorite_colors || [];
    if (currentColors.includes(color)) {
      // Remove color
      const updatedColors = currentColors.filter(c => c !== color);
      setFormData({ ...formData, favorite_colors: updatedColors });
    } else {
      // Add color (max 5)
      if (currentColors.length < 5) {
        const updatedColors = [...currentColors, color];
        setFormData({ ...formData, favorite_colors: updatedColors });
      }
    }
  };

  const handleLanguageChange = (language) => {
    const currentLanguages = formData.languages_known || [];
    const updatedLanguages = currentLanguages.includes(language)
      ? currentLanguages.filter(l => l !== language)
      : [...currentLanguages, language];
    
    setFormData({ ...formData, languages_known: updatedLanguages });
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Clear any previous errors
    setError(null);
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Please choose a JPEG or PNG image. Selected file type: ${file.type}`);
      e.target.value = ''; // Clear the file input
      return;
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError(`Image file is too large! Please choose an image smaller than 5MB.\nCurrent size: ${(file.size / (1024 * 1024)).toFixed(2)}MB\n\nTips to reduce file size:\n• Use JPEG format for photos (smaller than PNG)\n• Resize image dimensions (e.g., 1920x1080 max)\n• Use image compression tools\n• Avoid uploading raw camera files`);
      e.target.value = ''; // Clear the file input
      return;
    }
    
    // Check image dimensions (optional - for very large images)
    const img = new Image();
    img.onload = function() {
      const maxWidth = 4000;
      const maxHeight = 4000;
      
      if (this.width > maxWidth || this.height > maxHeight) {
        setError(`Image dimensions are too large! Maximum size: ${maxWidth}x${maxHeight} pixels. 
          Current size: ${this.width}x${this.height} pixels
          
          Please resize your image before uploading.`);
        e.target.value = ''; // Clear the file input
        return;
      }
      
      // If all checks pass, set the file
      if (name === 'profile_image') {
        setProfileImage(file);
      } else if (name === 'header_image') {
        setHeaderImage(file);
      } else if (name === 'logo_image') {
        setLogoImage(file);
      }
    };
    
    img.onerror = function() {
      setError('Invalid image file. Please choose a valid JPEG or PNG image.');
      e.target.value = ''; // Clear the file input
    };
    
    // Create object URL to load image for dimension checking
    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Base profile fields
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('display_name', formData.display_name);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address_line1', formData.address_line1);
      formDataToSend.append('address_line2', formData.address_line2);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('postal_code', formData.postal_code);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('website', formData.website);
      formDataToSend.append('birth_date', formData.birth_date);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('nationality', formData.nationality);
      formDataToSend.append('languages_known', JSON.stringify(formData.languages_known));
      formDataToSend.append('job_title', formData.job_title);
      formDataToSend.append('education', formData.education ? JSON.stringify([formData.education]) : '');
      formDataToSend.append('awards', formData.awards);
      formDataToSend.append('memberships', formData.memberships);
      formDataToSend.append('timezone', formData.timezone);
      formDataToSend.append('social_facebook', formData.social_facebook);
      formDataToSend.append('social_instagram', formData.social_instagram);
      formDataToSend.append('social_tiktok', formData.social_tiktok);
      formDataToSend.append('social_twitter', formData.social_twitter);
      formDataToSend.append('social_pinterest', formData.social_pinterest);
      formDataToSend.append('social_whatsapp', formData.social_whatsapp);
      
      if (user.user_type === 'artist') {
        formDataToSend.append('artist_biography', formData.artist_biography);
        formDataToSend.append('art_categories', JSON.stringify(formData.art_categories));
        formDataToSend.append('art_mediums', JSON.stringify(formData.art_mediums));
        formDataToSend.append('does_custom', formData.does_custom);
        formDataToSend.append('custom_details', formData.does_custom === 'yes' ? formData.custom_details : '');
        formDataToSend.append('business_name', formData.business_name);
        formDataToSend.append('studio_address_line1', formData.studio_address_line1);
        formDataToSend.append('studio_address_line2', formData.studio_address_line2);
        formDataToSend.append('studio_city', formData.studio_city);
        formDataToSend.append('studio_state', formData.studio_state);
        formDataToSend.append('studio_zip', formData.studio_zip);
        formDataToSend.append('business_website', formData.business_website);
        formDataToSend.append('business_phone', formData.business_phone);
        formDataToSend.append('business_social_facebook', formData.business_social_facebook);
        formDataToSend.append('business_social_instagram', formData.business_social_instagram);
        formDataToSend.append('business_social_tiktok', formData.business_social_tiktok);
        formDataToSend.append('business_social_twitter', formData.business_social_twitter);
        formDataToSend.append('business_social_pinterest', formData.business_social_pinterest);
        formDataToSend.append('founding_date', formData.founding_date);
      } else if (user.user_type === 'community') {
        try {
          const interests = formData.art_interests ? JSON.parse(formData.art_interests) : [];
          const wishlist = formData.wishlist ? JSON.parse(formData.wishlist) : [];
          if (!Array.isArray(interests) || !Array.isArray(wishlist)) throw new Error('Art interests and wishlist must be arrays');
          formDataToSend.append('art_interests', JSON.stringify(interests));
          formDataToSend.append('wishlist', JSON.stringify(wishlist));
          formDataToSend.append('art_style_preferences', formData.art_style_preferences);
          formDataToSend.append('favorite_colors', JSON.stringify(formData.favorite_colors));
        } catch (err) {
          setError('Invalid art interests or wishlist format. Please use valid JSON arrays (e.g., ["modern art", "photography"]).');
          return;
        }
      } else if (user.user_type === 'promoter') {
        formDataToSend.append('business_name', formData.business_name);
        formDataToSend.append('is_non_profit', formData.is_non_profit);
        formDataToSend.append('organization_size', formData.organization_size);
        formDataToSend.append('sponsorship_options', formData.sponsorship_options);
        try {
          const events = formData.upcoming_events ? JSON.parse(formData.upcoming_events) : [];
          if (!Array.isArray(events)) throw new Error('Upcoming events must be an array');
          formDataToSend.append('upcoming_events', JSON.stringify(events));
        } catch (err) {
          setError('Invalid upcoming events format. Please use a valid JSON array (e.g., [{"name": "Art Fair 2025", "date": "2025-12-01"}]).');
          return;
        }
      }
      
      if (profileImage) {
        formDataToSend.append('profile_image', profileImage);
      }
      if (headerImage) {
        formDataToSend.append('header_image', headerImage);
      }
      if (logoImage) {
        formDataToSend.append('logo_image', logoImage);
      }

      const res = await authApiRequest('users/me', {
        method: 'PATCH',
        body: formDataToSend
      });
      
      if (!res.ok) {
        // Handle specific HTTP status codes
        if (res.status === 413) {
          throw new Error(`Upload failed: File size too large! 
            
            The server rejected your upload because one or more files exceed the maximum allowed size.
            
            Please try:
            • Compress your images before uploading
            • Use JPEG format instead of PNG for photos
            • Resize images to smaller dimensions (e.g., 1920x1080)
            • Upload images one at a time instead of all at once`);
        }
        
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      router.push(`/profile/${user.id}`);
    } catch (err) {
      console.error(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <p className={styles.subtitle}>Update your profile information and preferences</p>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <i className="fas fa-exclamation-circle"></i>
            <div className={styles.errorContent}>
              {error.split('\n').map((line, index) => (
                <div key={index} className={styles.errorLine}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Account Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-user"></i>
              Account Information
            </h2>
            <div className={styles.sectionContent}>
              <div className={styles.infoDisplay}>
                <div className={styles.infoItem}>
                  <label>User ID</label>
                  <span className={styles.infoValue}>{user.id}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Email</label>
                  <span className={styles.infoValue}>{user.username}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>User Type</label>
                  <span className={styles.infoValue}>{user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-id-card"></i>
              Basic Information
            </h2>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>First Name *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
              </div>

              <div className={styles.formRow}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Display Name</label>
            <input
              type="text"
                    name="display_name"
                    value={formData.display_name}
              onChange={handleChange}
                    placeholder="How you'd like to be displayed publicly"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Job Title</label>
            <input
              type="text"
                    name="job_title"
                    value={formData.job_title}
              onChange={handleChange}
                    placeholder="Your job title or profession"
              className={styles.input}
            />
          </div>
              </div>

              <div className={styles.formRow}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Birth Date</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    {GENDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    placeholder="Your nationality"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Education</label>
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    {EDUCATION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Timezone</label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {TIMEZONE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Awards & Recognition</label>
                <textarea
                  name="awards"
                  value={formData.awards}
                  onChange={handleChange}
                  placeholder="List any awards, honors, or recognition you've received..."
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Memberships</label>
                <textarea
                  name="memberships"
                  value={formData.memberships}
                  onChange={handleChange}
                  placeholder="List any professional or organizational memberships..."
                  className={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-images"></i>
              Profile Images
            </h2>
            <div className={styles.sectionContent}>
              <div className={styles.formRow}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Profile Image (Max 5MB)</label>
            <input
              type="file"
              name="profile_image"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
                    className={styles.fileInput}
            />
                  <small className={styles.helpText}>JPEG/PNG, max 5MB</small>
            {user.profile_image_path && (
                    <div className={styles.currentImage}>
                      <img 
                        src={getSmartMediaUrl(user.profile_image_path)} 
                        alt="Current profile"
                        className={styles.imagePreview}
                      />
                    </div>
            )}
          </div>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Header Image (Max 5MB)</label>
            <input
              type="file"
              name="header_image"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
                    className={styles.fileInput}
            />
                  <small className={styles.helpText}>JPEG/PNG, max 5MB</small>
            {user.header_image_path && (
                    <div className={styles.currentImage}>
                      <img 
                        src={`${user.header_image_path}`} 
                        alt="Current header"
                        className={styles.imagePreview}
                      />
                    </div>
            )}
          </div>
              </div>
            </div>
          </div>

          {/* Artist-specific section */}
          {user.user_type === 'artist' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-palette"></i>
                Artist Information
              </h2>
              <div className={styles.sectionContent}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Artist Biography *</label>
                  <textarea
                    name="artist_biography"
                    value={formData.artist_biography}
              onChange={handleChange}
                    required
                    placeholder="Tell us about your artistic journey, style, and inspiration..."
                    className={styles.textarea}
                  />
          </div>

              <div className={styles.formGroup}>
                  <label className={styles.label}>Art Categories</label>
                  <div className={styles.categoryGrid}>
                    {ART_CATEGORIES.map(category => (
                      <label key={category} className={styles.categoryOption}>
                        <input
                          type="checkbox"
                          checked={formData.art_categories.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                          className={styles.checkbox}
                        />
                        <span className={styles.categoryLabel}>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Art Mediums</label>
                  <div className={styles.categoryGrid}>
                    {ART_MEDIUMS.map(medium => (
                      <label key={medium} className={styles.categoryOption}>
                        <input
                          type="checkbox"
                          checked={formData.art_mediums.includes(medium)}
                          onChange={() => handleMediumChange(medium)}
                          className={styles.checkbox}
                        />
                        <span className={styles.categoryLabel}>{medium}</span>
                      </label>
                    ))}
                  </div>
          </div>

                <div className={styles.formRow}>
              <div className={styles.formGroup}>
                    <label className={styles.label}>Business Name</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                      placeholder="Your studio or business name"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                    <label className={styles.label}>Business Website</label>
                    <input
                      type="url"
                      name="business_website"
                      value={formData.business_website}
                      onChange={handleChange}
                      placeholder="https://yourbusiness.com"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Business Phone</label>
                    <input
                      type="tel"
                      name="business_phone"
                      value={formData.business_phone}
                      onChange={handleChange}
                      placeholder="Business phone number"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Founding Date</label>
                    <input
                      type="date"
                      name="founding_date"
                      value={formData.founding_date}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Business Logo (Max 5MB)</label>
                  <input
                    type="file"
                    name="logo_image"
                    accept="image/jpeg,image/png"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                  />
                  <small className={styles.helpText}>JPEG/PNG, max 5MB</small>
                  {user.logo_path && (
                    <div className={styles.currentImage}>
                      <img 
                        src={`${user.logo_path}`} 
                        alt="Current business logo"
                        className={styles.imagePreview}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Studio Address Line 1</label>
                <input
                  type="text"
                  name="studio_address_line1"
                  value={formData.studio_address_line1}
                  onChange={handleChange}
                      placeholder="Street address"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                    <label className={styles.label}>Studio Address Line 2</label>
                <input
                  type="text"
                  name="studio_address_line2"
                  value={formData.studio_address_line2}
                  onChange={handleChange}
                      placeholder="Apartment, suite, etc."
                  className={styles.input}
                />
              </div>
              </div>

              <div className={styles.formRow}>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Studio City</label>
                <input
                  type="text"
                    name="studio_city"
                    value={formData.studio_city}
                  onChange={handleChange}
                    placeholder="Studio city"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Studio State</label>
                  <input
                    type="text"
                    name="studio_state"
                    value={formData.studio_state}
                  onChange={handleChange}
                    placeholder="Studio state"
                    className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Studio ZIP Code</label>
                <input
                  type="text"
                    name="studio_zip"
                    value={formData.studio_zip}
                  onChange={handleChange}
                    placeholder="Studio ZIP code"
                  className={styles.input}
                />
              </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Accept Custom Orders?</label>
                <select
                  name="does_custom"
                  value={formData.does_custom}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {formData.does_custom === 'yes' && (
                <div className={styles.formGroup}>
                    <label className={styles.label}>Custom Order Details</label>
                  <textarea
                    name="custom_details"
                    value={formData.custom_details}
                    onChange={handleChange}
                      placeholder="Describe your custom order process, pricing, timeline, etc."
                    className={styles.textarea}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Business Social Media</label>
                <div className={styles.socialGrid}>
                  <div className={styles.socialGroup}>
                    <div className={styles.socialLabel}>
                      <i className="fab fa-facebook socialIcon"></i>
                      Facebook
                    </div>
                    <div className={styles.socialInput}>
                      <span className={styles.socialPrefix}>https://facebook.com/</span>
                      <input
                        type="text"
                        name="business_social_facebook"
                        value={formData.business_social_facebook}
                        onChange={handleChange}
                        placeholder="business username"
                        className={styles.socialField}
                      />
                    </div>
                  </div>

                  <div className={styles.socialGroup}>
                    <div className={styles.socialLabel}>
                      <i className="fab fa-instagram socialIcon"></i>
                      Instagram
                    </div>
                    <div className={styles.socialInput}>
                      <span className={styles.socialPrefix}>https://instagram.com/</span>
                      <input
                        type="text"
                        name="business_social_instagram"
                        value={formData.business_social_instagram}
                        onChange={handleChange}
                        placeholder="business username"
                        className={styles.socialField}
                      />
                    </div>
                  </div>

                  <div className={styles.socialGroup}>
                    <div className={styles.socialLabel}>
                      <i className="fab fa-tiktok socialIcon"></i>
                      TikTok
                    </div>
                    <div className={styles.socialInput}>
                      <span className={styles.socialPrefix}>https://tiktok.com/@</span>
                      <input
                        type="text"
                        name="business_social_tiktok"
                        value={formData.business_social_tiktok}
                        onChange={handleChange}
                        placeholder="business username"
                        className={styles.socialField}
                      />
                    </div>
                  </div>

                  <div className={styles.socialGroup}>
                    <div className={styles.socialLabel}>
                      <i className="fab fa-x-twitter socialIcon"></i>
                      X (Twitter)
                    </div>
                    <div className={styles.socialInput}>
                      <span className={styles.socialPrefix}>https://x.com/</span>
                      <input
                        type="text"
                        name="business_social_twitter"
                        value={formData.business_social_twitter}
                        onChange={handleChange}
                        placeholder="business username"
                        className={styles.socialField}
                      />
                    </div>
                  </div>

                  <div className={styles.socialGroup}>
                    <div className={styles.socialLabel}>
                      <i className="fab fa-pinterest socialIcon"></i>
                      Pinterest
                    </div>
                    <div className={styles.socialInput}>
                      <span className={styles.socialPrefix}>https://pinterest.com/</span>
                      <input
                        type="text"
                        name="business_social_pinterest"
                        value={formData.business_social_pinterest}
                        onChange={handleChange}
                        placeholder="business username"
                        className={styles.socialField}
                      />
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Community member specific section */}
          {user.user_type === 'community' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-heart"></i>
                Art Interests
              </h2>
              <div className={styles.sectionContent}>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Art Style Preferences</label>
                  <select
                    name="art_style_preferences"
                    value={formData.art_style_preferences}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    {ART_STYLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Favorite Colors (Select up to 5)</label>
                  <div className={styles.colorGrid}>
                    {COLOR_OPTIONS.map(color => (
                      <label key={color.value} className={styles.colorOption}>
                        <input
                          type="checkbox"
                          checked={formData.favorite_colors.includes(color.value)}
                          onChange={() => handleColorChange(color.value)}
                          className={styles.checkbox}
                          disabled={!formData.favorite_colors.includes(color.value) && formData.favorite_colors.length >= 5}
                        />
                        <span 
                          className={styles.colorSwatch}
                          style={{ backgroundColor: color.color }}
                          title={color.label}
                        ></span>
                        <span className={styles.colorLabel}>{color.label}</span>
                      </label>
                    ))}
                  </div>
                  <small className={styles.helpText}>
                    Selected: {formData.favorite_colors.length}/5
                  </small>
                </div>

              <div className={styles.formGroup}>
                  <label className={styles.label}>Art Interests (JSON format)</label>
                <input
                  type="text"
                  name="art_interests"
                  value={formData.art_interests}
                  onChange={handleChange}
                  placeholder='["modern art", "photography"]'
                  className={styles.input}
                />
                  <small className={styles.helpText}>Enter as JSON array, e.g., ["modern art", "photography"]</small>
              </div>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Wishlist (JSON format)</label>
                <input
                  type="text"
                  name="wishlist"
                  value={formData.wishlist}
                  onChange={handleChange}
                  placeholder='[]'
                  className={styles.input}
                />
                  <small className={styles.helpText}>Enter as JSON array</small>
              </div>
              </div>
            </div>
          )}

          {/* Promoter specific section */}
          {user.user_type === 'promoter' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-bullhorn"></i>
                Promoter Information
              </h2>
              <div className={styles.sectionContent}>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Business Name</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                    placeholder="Your organization or business name"
                  className={styles.input}
                />
              </div>
                
              <div className={styles.formGroup}>
                  <label className={styles.label}>Upcoming Events (JSON format)</label>
                <input
                  type="text"
                  name="upcoming_events"
                  value={formData.upcoming_events}
                  onChange={handleChange}
                  placeholder='[{"name": "Art Fair 2025", "date": "2025-12-01"}]'
                  className={styles.input}
                />
                  <small className={styles.helpText}>Enter as JSON array with event objects</small>
              </div>
                
              <div className={styles.formGroup}>
                  <label className={styles.label}>Non-Profit Organization?</label>
                <select
                  name="is_non_profit"
                  value={formData.is_non_profit}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Organization Size</label>
                  <select
                    name="organization_size"
                    value={formData.organization_size}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    {ORGANIZATION_SIZE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Sponsorship Options</label>
                  <textarea
                    name="sponsorship_options"
                    value={formData.sponsorship_options}
                    onChange={handleChange}
                    placeholder="Describe available sponsorship opportunities, benefits, and pricing..."
                    className={styles.textarea}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Information Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-map-marker-alt"></i>
              Contact Information
            </h2>
            <div className={styles.sectionContent}>
          <div className={styles.formGroup}>
                <label className={styles.label}>Phone</label>
            <input
                  type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
                  placeholder="Your phone number"
              className={styles.input}
            />
          </div>

              <div className={styles.formRow}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Address Line 1</label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
                    placeholder="Street address"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
                    placeholder="Apartment, suite, etc."
              className={styles.input}
            />
          </div>
              </div>

              <div className={styles.formRow}>
          <div className={styles.formGroup}>
                  <label className={styles.label}>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
                    placeholder="Your city"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
                  <label className={styles.label}>State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
                    placeholder="Your state"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
                  <label className={styles.label}>Postal Code</label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
                    placeholder="ZIP code"
              className={styles.input}
            />
          </div>
              </div>

          <div className={styles.formGroup}>
                <label className={styles.label}>Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
                  placeholder="Your country"
              className={styles.input}
            />
          </div>
          </div>
          </div>

          {/* Social Media Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-share-alt"></i>
              Social Media
            </h2>
            <div className={styles.sectionContent}>
              <div className={styles.socialGrid}>
                <div className={styles.socialGroup}>
                  <div className={styles.socialLabel}>
                    <i className="fab fa-facebook socialIcon"></i>
                    Facebook
          </div>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>https://facebook.com/</span>
            <input
              type="text"
              name="social_facebook"
              value={formData.social_facebook}
              onChange={handleChange}
                      placeholder="username"
                      className={styles.socialField}
            />
          </div>
                </div>

                <div className={styles.socialGroup}>
                  <div className={styles.socialLabel}>
                    <i className="fab fa-instagram socialIcon"></i>
                    Instagram
                  </div>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>https://instagram.com/</span>
            <input
              type="text"
              name="social_instagram"
              value={formData.social_instagram}
              onChange={handleChange}
                      placeholder="username"
                      className={styles.socialField}
            />
          </div>
                </div>

                <div className={styles.socialGroup}>
                  <div className={styles.socialLabel}>
                    <i className="fab fa-tiktok socialIcon"></i>
                    TikTok
                  </div>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>https://tiktok.com/@</span>
            <input
              type="text"
              name="social_tiktok"
              value={formData.social_tiktok}
              onChange={handleChange}
                      placeholder="username"
                      className={styles.socialField}
            />
          </div>
                </div>

                <div className={styles.socialGroup}>
                  <div className={styles.socialLabel}>
                    <i className="fab fa-x-twitter socialIcon"></i>
                    X (Twitter)
                  </div>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>https://x.com/</span>
            <input
              type="text"
              name="social_twitter"
              value={formData.social_twitter}
              onChange={handleChange}
                      placeholder="username"
                      className={styles.socialField}
            />
          </div>
                </div>

                <div className={styles.socialGroup}>
                  <div className={styles.socialLabel}>
                    <i className="fab fa-pinterest socialIcon"></i>
                    Pinterest
                  </div>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>https://pinterest.com/</span>
            <input
              type="text"
              name="social_pinterest"
              value={formData.social_pinterest}
              onChange={handleChange}
                      placeholder="username"
                      className={styles.socialField}
            />
          </div>
                </div>

                <div className={styles.socialGroup}>
                  <div className={styles.socialLabel}>
                    <i className="fab fa-whatsapp socialIcon"></i>
                    WhatsApp
                  </div>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>https://wa.me/</span>
            <input
              type="text"
              name="social_whatsapp"
              value={formData.social_whatsapp}
              onChange={handleChange}
                      placeholder="phone number"
                      className={styles.socialField}
            />
          </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => router.push(`/profile/${user.id}`)}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}