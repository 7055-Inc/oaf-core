'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

export default function ProfileSetup() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
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
    art_interests: '',
    wishlist: '',
    business_name: '',
    upcoming_events: '',
    is_non_profit: 'no'
  });
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
          art_categories: data.art_categories ? JSON.stringify(data.art_categories) : '',
          does_custom: data.does_custom || 'no',
          custom_details: '',
          art_interests: data.art_interests ? JSON.stringify(data.art_interests) : '',
          wishlist: data.wishlist ? JSON.stringify(data.wishlist) : '',
          business_name: data.business_name || '',
          upcoming_events: data.upcoming_events ? JSON.stringify(data.upcoming_events) : '',
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

  const handleNext = () => {
    if (step === 1 && (!formData.first_name || !formData.last_name || !formData.user_type)) {
      setError('Please fill in all required fields.');
      return;
    }
    if (step === 2 && formData.user_type === 'artist' && !formData.artist_biography) {
      setError('Please provide an artist biography.');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handlePrev = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem('token');
    try {
      const body = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        user_type: formData.user_type,
        phone: formData.phone,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        bio: formData.bio,
        website: formData.website,
        social_facebook: formData.social_facebook,
        social_instagram: formData.social_instagram,
        social_tiktok: formData.social_tiktok,
        social_twitter: formData.social_twitter,
        social_pinterest: formData.social_pinterest,
        social_whatsapp: formData.social_whatsapp
      };
      if (formData.user_type === 'artist') {
        body.artist_biography = formData.artist_biography;
        body.art_categories = formData.art_categories ? JSON.parse(formData.art_categories) : [];
        body.does_custom = formData.does_custom;
        body.custom_details = formData.does_custom === 'yes' ? formData.custom_details : '';
      } else if (formData.user_type === 'community') {
        body.art_interests = formData.art_interests ? JSON.parse(formData.art_interests) : [];
        body.wishlist = formData.wishlist ? JSON.parse(formData.wishlist) : [];
      } else if (formData.user_type === 'promoter') {
        body.business_name = formData.business_name;
        body.upcoming_events = formData.upcoming_events ? JSON.parse(formData.upcoming_events) : [];
        body.is_non_profit = formData.is_non_profit;
      }
      const res = await fetch('https://api2.onlineartfestival.com/users/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      router.push('/dashboard');
    } catch (err) {
      console.error(err.message);
      setError(err.message);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Complete Your Profile - Step {step} of 3</h1>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <h2>Basic Information</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label>Email:</label>
                <input
                  type="email"
                  value={user.username}
                  disabled
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>First Name:</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Last Name:</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>User Type:</label>
                <select
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                >
                  <option value="artist">Artist</option>
                  <option value="community">Community</option>
                  <option value="promoter">Promoter</option>
                </select>
              </div>
              <button type="button" onClick={handleNext}>Next</button>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Type-Specific Information</h2>
              {formData.user_type === 'artist' && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Artist Biography:</label>
                    <textarea
                      name="artist_biography"
                      value={formData.artist_biography}
                      onChange={handleChange}
                      required
                      style={{ marginLeft: '0.5rem', width: '100%', height: '100px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Art Categories (JSON, e.g., ["painting", "sculpture"]):</label>
                    <input
                      type="text"
                      name="art_categories"
                      value={formData.art_categories}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                      placeholder='["painting", "sculpture"]'
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Accept Custom Orders?</label>
                    <select
                      name="does_custom"
                      value={formData.does_custom}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  {formData.does_custom === 'yes' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label>Custom Order Details:</label>
                      <textarea
                        name="custom_details"
                        value={formData.custom_details}
                        onChange={handleChange}
                        style={{ marginLeft: '0.5rem', width: '100%', height: '100px' }}
                        placeholder="Describe your custom order process..."
                      />
                    </div>
                  )}
                </>
              )}
              {formData.user_type === 'community' && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Art Interests (JSON, e.g., ["modern art", "photography"]):</label>
                    <input
                      type="text"
                      name="art_interests"
                      value={formData.art_interests}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                      placeholder='["modern art", "photography"]'
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Wishlist (JSON, e.g., []):</label>
                    <input
                      type="text"
                      name="wishlist"
                      value={formData.wishlist}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                      placeholder='[]'
                    />
                  </div>
                </>
              )}
              {formData.user_type === 'promoter' && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Business Name:</label>
                    <input
                      type="text"
                      name="business_name"
                      value={formData.business_name}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Upcoming Events (JSON, e.g., {`[{"name": "Art Fair 2025", "date": "2025-12-01"}]`}):</label>
                    <input
                      type="text"
                      name="upcoming_events"
                      value={formData.upcoming_events}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                      placeholder='[{"name": "Art Fair 2025", "date" "2025-12-01"}]'
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label>Is Non-Profit?</label>
                    <select
                      name="is_non_profit"
                      value={formData.is_non_profit}
                      onChange={handleChange}
                      style={{ marginLeft: '0.5rem', width: '100%' }}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </>
              )}
              <button type="button" onClick={handlePrev} style={{ marginRight: '1rem' }}>Previous</button>
              <button type="button" onClick={handleNext}>Next</button>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Contact and Social Information</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label>Phone:</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Address Line 1:</label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Address Line 2:</label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>City:</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>State:</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Postal Code:</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Country:</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Bio:</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%', height: '100px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Website:</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Facebook:</label>
                <input
                  type="text"
                  name="social_facebook"
                  value={formData.social_facebook}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Instagram:</label>
                <input
                  type="text"
                  name="social_instagram"
                  value={formData.social_instagram}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>TikTok:</label>
                <input
                  type="text"
                  name="social_tiktok"
                  value={formData.social_tiktok}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Twitter:</label>
                <input
                  type="text"
                  name="social_twitter"
                  value={formData.social_twitter}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Pinterest:</label>
                <input
                  type="text"
                  name="social_pinterest"
                  value={formData.social_pinterest}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>WhatsApp:</label>
                <input
                  type="text"
                  name="social_whatsapp"
                  value={formData.social_whatsapp}
                  onChange={handleChange}
                  style={{ marginLeft: '0.5rem', width: '100%' }}
                />
              </div>
              <button type="button" onClick={handlePrev} style={{ marginRight: '1rem' }}>Previous</button>
              <button type="submit">Save Profile</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}