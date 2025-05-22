'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import styles from './Edit.module.css';

export default function ProfileEdit() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    user_type: 'community',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    bio: '',
    website: '',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    social_twitter: '',
    social_pinterest: '',
    social_whatsapp: '',
    artist_biography: '',
    art_categories: '',
    does_custom: 'no',
    custom_details: '',
    business_name: '',
    studio_address_line1: '',
    studio_address_line2: '',
    business_website: '',
    art_interests: '',
    wishlist: '',
    upcoming_events: '',
    is_non_profit: 'no'
  });
  const [profileImage, setProfileImage] = useState(null);
  const [headerImage, setHeaderImage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch('https://api2.onlineartfestival.com/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await res.json();
        setUser(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          user_type: data.user_type || 'community',
          phone: data.phone || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          bio: data.bio || '',
          website: data.website || '',
          social_facebook: data.social_facebook || '',
          social_instagram: data.social_instagram || '',
          social_tiktok: data.social_tiktok || '',
          social_twitter: data.social_twitter || '',
          social_pinterest: data.social_pinterest || '',
          social_whatsapp: data.social_whatsapp || '',
          artist_biography: data.artist_biography || '',
          art_categories: data.art_categories ? JSON.stringify(data.art_categories) : '[]',
          does_custom: data.does_custom || 'no',
          custom_details: '',
          business_name: data.business_name || '',
          studio_address_line1: data.studio_address_line1 || '',
          studio_address_line2: data.studio_address_line2 || '',
          business_website: data.business_website || '',
          art_interests: data.art_interests ? JSON.stringify(data.art_interests) : '[]',
          wishlist: data.wishlist ? JSON.stringify(data.wishlist) : '[]',
          upcoming_events: data.upcoming_events ? JSON.stringify(data.upcoming_events) : '[]',
          is_non_profit: data.is_non_profit || 'no'
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

  const handleFileChange = (e) => {
    const { name } = e.target;
    if (name === 'profile_image') {
      setProfileImage(e.target.files[0]);
    } else if (name === 'header_image') {
      setHeaderImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('token');
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('user_type', formData.user_type);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address_line1', formData.address_line1);
      formDataToSend.append('address_line2', formData.address_line2);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('postal_code', formData.postal_code);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('website', formData.website);
      formDataToSend.append('social_facebook', formData.social_facebook);
      formDataToSend.append('social_instagram', formData.social_instagram);
      formDataToSend.append('social_tiktok', formData.social_tiktok);
      formDataToSend.append('social_twitter', formData.social_twitter);
      formDataToSend.append('social_pinterest', formData.social_pinterest);
      formDataToSend.append('social_whatsapp', formData.social_whatsapp);
      if (formData.user_type === 'artist') {
        formDataToSend.append('artist_biography', formData.artist_biography);
        try {
          const categories = formData.art_categories ? JSON.parse(formData.art_categories) : [];
          if (!Array.isArray(categories)) throw new Error('Art categories must be an array');
          formDataToSend.append('art_categories', JSON.stringify(categories));
        } catch (err) {
          setError('Invalid art categories format. Please use a valid JSON array (e.g., ["painting", "sculpture"]).');
          return;
        }
        formDataToSend.append('does_custom', formData.does_custom);
        formDataToSend.append('custom_details', formData.does_custom === 'yes' ? formData.custom_details : '');
        formDataToSend.append('business_name', formData.business_name);
        formDataToSend.append('studio_address_line1', formData.studio_address_line1);
        formDataToSend.append('studio_address_line2', formData.studio_address_line2);
        formDataToSend.append('business_website', formData.business_website);
      } else if (formData.user_type === 'community') {
        try {
          const interests = formData.art_interests ? JSON.parse(formData.art_interests) : [];
          const wishlist = formData.wishlist ? JSON.parse(formData.wishlist) : [];
          if (!Array.isArray(interests) || !Array.isArray(wishlist)) throw new Error('Art interests and wishlist must be arrays');
          formDataToSend.append('art_interests', JSON.stringify(interests));
          formDataToSend.append('wishlist', JSON.stringify(wishlist));
        } catch (err) {
          setError('Invalid art interests or wishlist format. Please use valid JSON arrays (e.g., ["modern art", "photography"]).');
          return;
        }
      } else if (formData.user_type === 'promoter') {
        formDataToSend.append('business_name', formData.business_name);
        try {
          const events = formData.upcoming_events ? JSON.parse(formData.upcoming_events) : [];
          if (!Array.isArray(events)) throw new Error('Upcoming events must be an array');
          formDataToSend.append('upcoming_events', JSON.stringify(events));
        } catch (err) {
          setError('Invalid upcoming events format. Please use a valid JSON array (e.g., [{"name": "Art Fair 2025", "date": "2025-12-01"}]).');
          return;
        }
        formDataToSend.append('is_non_profit', formData.is_non_profit);
      }
      if (profileImage) {
        formDataToSend.append('profile_image', profileImage);
      }
      if (headerImage) {
        formDataToSend.append('header_image', headerImage);
      }

      const res = await fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      router.push(`/profile/${user.id}`);
    } catch (err) {
      console.error(err.message);
      setError(err.message);
    }
  };

  if (!user) {
    return (
      <div>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>Edit Your Profile</h1>
        {error && <p className={styles.error}>Error: {error}</p>}
        <form onSubmit={handleSubmit}>
          <h2 className={styles.subtitle}>Basic Information</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>User ID:</label>
            <input
              type="text"
              value={user.id}
              disabled
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email:</label>
            <input
              type="email"
              value={user.username}
              disabled
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>First Name:</label>
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
            <label className={styles.label}>Last Name:</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Profile Image (JPEG/PNG, max 5MB):</label>
            <input
              type="file"
              name="profile_image"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className={styles.input}
            />
            {user.profile_image_path && (
              <p>Current Image: <a href={`https://api2.onlineartfestival.com${user.profile_image_path}`} target="_blank">{user.profile_image_path}</a></p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Header Image (JPEG/PNG, max 5MB):</label>
            <input
              type="file"
              name="header_image"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className={styles.input}
            />
            {user.header_image_path && (
              <p>Current Header Image: <a href={`https://api2.onlineartfestival.com${user.header_image_path}`} target="_blank">{user.header_image_path}</a></p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>User Type:</label>
            <select
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="artist">Artist</option>
              <option value="community">Community</option>
              <option value="promoter">Promoter</option>
            </select>
          </div>

          <h2 className={styles.subtitle}>Type-Specific Information</h2>
          {formData.user_type === 'artist' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Business Name:</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Studio Address Line 1:</label>
                <input
                  type="text"
                  name="studio_address_line1"
                  value={formData.studio_address_line1}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Studio Address Line 2:</label>
                <input
                  type="text"
                  name="studio_address_line2"
                  value={formData.studio_address_line2}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Business Website:</label>
                <input
                  type="text"
                  name="business_website"
                  value={formData.business_website}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Artist Biography:</label>
                <textarea
                  name="artist_biography"
                  value={formData.artist_biography}
                  onChange={handleChange}
                  required
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Art Categories (JSON, e.g., ["painting", "sculpture"]):</label>
                <input
                  type="text"
                  name="art_categories"
                  value={formData.art_categories}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder='["painting", "sculpture"]'
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Accept Custom Orders?</label>
                <select
                  name="does_custom"
                  value={formData.does_custom}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {formData.does_custom === 'yes' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Custom Order Details:</label>
                  <textarea
                    name="custom_details"
                    value={formData.custom_details}
                    onChange={handleChange}
                    className={styles.textarea}
                    placeholder="Describe your custom order process..."
                  />
                </div>
              )}
            </>
          )}
          {formData.user_type === 'community' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Art Interests (JSON, e.g., ["modern art", "photography"]):</label>
                <input
                  type="text"
                  name="art_interests"
                  value={formData.art_interests}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder='["modern art", "photography"]'
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Wishlist (JSON, e.g., []):</label>
                <input
                  type="text"
                  name="wishlist"
                  value={formData.wishlist}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder='[]'
                />
              </div>
            </>
          )}
          {formData.user_type === 'promoter' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Business Name:</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Upcoming Events (JSON, e.g., [{'{"name": "Art Fair 2025", "date": "2025-12-01"}'}]):</label>
                <input
                  type="text"
                  name="upcoming_events"
                  value={formData.upcoming_events}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder='[{"name": "Art Fair 2025", "date": "2025-12-01"}]'
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Is Non-Profit?</label>
                <select
                  name="is_non_profit"
                  value={formData.is_non_profit}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </>
          )}

          <h2 className={styles.subtitle}>Contact and Social Information</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone:</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Address Line 1:</label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Address Line 2:</label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>City:</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>State:</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Postal Code:</label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Country:</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Bio:</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className={styles.textarea}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Website:</label>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Facebook:</label>
            <input
              type="text"
              name="social_facebook"
              value={formData.social_facebook}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Instagram:</label>
            <input
              type="text"
              name="social_instagram"
              value={formData.social_instagram}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>TikTok:</label>
            <input
              type="text"
              name="social_tiktok"
              value={formData.social_tiktok}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Twitter:</label>
            <input
              type="text"
              name="social_twitter"
              value={formData.social_twitter}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Pinterest:</label>
            <input
              type="text"
              name="social_pinterest"
              value={formData.social_pinterest}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>WhatsApp:</label>
            <input
              type="text"
              name="social_whatsapp"
              value={formData.social_whatsapp}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>Save Changes</button>
        </form>
      </div>
    </div>
  );
}