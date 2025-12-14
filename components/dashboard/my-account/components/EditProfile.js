import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest, API_ENDPOINTS } from '../../../../lib/apiUtils';

// USA timezones only
const getTimezones = () => {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (No DST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  ];
};

// Common world languages for multi-select
const getCommonLanguages = () => {
  return [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
    'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Bengali',
    'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech',
    'Hungarian', 'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Greek',
    'Turkish', 'Hebrew', 'Thai', 'Vietnamese', 'Indonesian', 'Malay',
    'Tagalog', 'Swahili', 'Yoruba', 'Zulu', 'Afrikaans', 'Amharic'
  ].sort();
};

// Common education levels for multi-select
const getEducationLevels = () => {
  return [
    'Grade School',
    'High School/GED',
    'Associate Degree',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctoral Degree'
  ];
};

// Product categories for artist matching (matches vendor categories)
const getProductCategories = () => {
  return [
    // Top-level categories
    { id: 62, name: 'Wall Art', parent_id: null },
    { id: 4, name: 'Sculpture', parent_id: null },
    { id: 7, name: 'Earthen Materials', parent_id: null },
    { id: 8, name: 'Mixed Media', parent_id: null },
    { id: 9, name: 'Digital Arts', parent_id: null },
    { id: 10, name: 'Textiles', parent_id: null },
    { id: 11, name: 'Printmaking', parent_id: null },
    
    // Wall Art subcategories
    { id: 3, name: 'Paintings', parent_id: 62 },
    { id: 5, name: 'Drawing/Sketching', parent_id: 62 },
    { id: 6, name: 'Photography', parent_id: 62 },
    
    // Painting subcategories
    { id: 21, name: 'Oil', parent_id: 3 },
    { id: 22, name: 'Watercolor', parent_id: 3 },
    { id: 23, name: 'Acrylic', parent_id: 3 },
    { id: 24, name: 'Other Painting', parent_id: 3 },
    
    // Sculpture subcategories
    { id: 25, name: 'Metal', parent_id: 4 },
    { id: 26, name: 'Glass', parent_id: 4 },
    { id: 27, name: 'Fiber', parent_id: 4 },
    { id: 28, name: 'Recycled', parent_id: 4 },
    { id: 29, name: 'Modern Materials', parent_id: 4 },
    
    // Drawing subcategories
    { id: 32, name: 'Pencil', parent_id: 5 },
    { id: 33, name: 'Pastel', parent_id: 5 },
    { id: 34, name: 'Pen/Marker', parent_id: 5 },
    { id: 35, name: 'Other Drawing', parent_id: 5 },
    
    // Photography subcategories
    { id: 36, name: 'Scenery', parent_id: 6 },
    { id: 37, name: 'Wildlife', parent_id: 6 },
    { id: 38, name: 'Regional', parent_id: 6 },
    { id: 39, name: 'Landscape', parent_id: 6 },
    { id: 40, name: 'Other Nature', parent_id: 6 },
    { id: 41, name: 'Urban', parent_id: 6 },
    { id: 42, name: 'Human', parent_id: 6 },
    { id: 43, name: 'Micro/Macro', parent_id: 6 },
    { id: 44, name: 'Digital', parent_id: 6 },
    
    // Earthen Materials subcategories
    { id: 45, name: 'Wood', parent_id: 7 },
    { id: 46, name: 'Clay', parent_id: 7 },
    { id: 47, name: 'Stone', parent_id: 7 },
    { id: 48, name: 'Natural Fiber', parent_id: 7 },
    
    // Digital Arts subcategories
    { id: 50, name: 'Illustration', parent_id: 9 },
    { id: 51, name: 'Animation', parent_id: 9 },
    { id: 52, name: '3D Modeling', parent_id: 9 },
    
    // Textiles subcategories
    { id: 54, name: 'Weaving', parent_id: 10 },
    { id: 55, name: 'Embroidery', parent_id: 10 },
    { id: 56, name: 'Quilting', parent_id: 10 },
    
    // Printmaking subcategories
    { id: 58, name: 'Etching', parent_id: 11 },
    { id: 59, name: 'Lithography', parent_id: 11 },
    { id: 60, name: 'Screen Printing', parent_id: 11 }
  ];
};

// Common art mediums for artists and makers
const getArtMediums = () => {
  return [
    // Traditional Painting
    'Oil Paint', 'Acrylic Paint', 'Watercolor', 'Gouache', 'Tempera', 'Encaustic',
    
    // Drawing Materials
    'Graphite Pencil', 'Charcoal', 'Pastel', 'Oil Pastel', 'Colored Pencil', 'Ink', 'Marker', 'Pen',
    
    // Printmaking
    'Etching', 'Lithography', 'Screen Print', 'Woodcut', 'Linocut', 'Monotype', 'Digital Print',
    
    // Sculpture Materials
    'Bronze', 'Aluminum', 'Steel', 'Iron', 'Copper', 'Silver', 'Gold', 'Brass',
    'Marble', 'Granite', 'Limestone', 'Sandstone', 'Slate', 'Soapstone',
    'Oak', 'Pine', 'Cedar', 'Walnut', 'Cherry', 'Bamboo', 'Reclaimed Wood',
    'Clay', 'Ceramic', 'Porcelain', 'Stoneware', 'Earthenware', 'Terracotta',
    'Glass', 'Blown Glass', 'Fused Glass', 'Stained Glass',
    'Plastic', 'Resin', 'Fiberglass', 'Vinyl', 'Acrylic Sheet',
    
    // Fiber Arts
    'Cotton', 'Wool', 'Silk', 'Linen', 'Hemp', 'Jute', 'Synthetic Fiber',
    'Yarn', 'Thread', 'Embroidery Floss', 'Wire', 'Rope',
    
    // Mixed Media
    'Collage', 'Found Objects', 'Recycled Materials', 'Paper', 'Cardboard',
    'Fabric', 'Leather', 'Rubber', 'Cork', 'Foam',
    
    // Digital/Modern
    'Digital Media', '3D Printing Filament', 'LED', 'Electronics', 'Video',
    'Photography', 'Digital Illustration', 'AR/VR',
    
    // Jewelry & Small Crafts
    'Precious Metals', 'Semi-Precious Stones', 'Beads', 'Pearls', 'Crystals',
    'Enamel', 'Polymer Clay', 'Wax', 'Resin Casting',
    
    // Specialty Materials
    'Mosaic Tiles', 'Mirror', 'Concrete', 'Plaster', 'Papier-Mâché',
    'Feathers', 'Shells', 'Bone', 'Horn', 'Natural Elements'
  ].sort();
};

// Art style preferences - visual styles, movements, and aesthetics
const getArtStylePreferences = () => {
  return [
    // Classical & Traditional Styles
    'Classical Art', 'Renaissance', 'Baroque', 'Neoclassical', 'Romanticism', 'Realism', 'Academic Art',
    
    // Modern Art Movements
    'Impressionism', 'Post-Impressionism', 'Expressionism', 'Fauvism', 'Cubism', 'Futurism', 'Dadaism',
    'Surrealism', 'Abstract Expressionism', 'Pop Art', 'Minimalism', 'Conceptual Art', 'Op Art',
    
    // Contemporary Styles
    'Contemporary Art', 'Modern Art', 'Neo-Expressionism', 'Street Art', 'Graffiti Art', 'Digital Art Styles',
    'Installation Art', 'Performance Art', 'Video Art', 'New Media Art', 'Bio Art', 'Land Art',
    
    // Cultural & Regional Styles
    'Folk Art', 'Outsider Art', 'Naive Art', 'Primitive Art', 'Tribal Art', 'Asian Art', 'African Art',
    'Latin American Art', 'Indigenous Art', 'Art Brut', 'Lowbrow Art', 'Art Nouveau', 'Art Deco',
    
    // Visual Aesthetics & Approaches
    'Abstract Art', 'Figurative Art', 'Realistic Art', 'Photorealism', 'Hyperrealism', 'Stylized Art',
    'Geometric Art', 'Organic Forms', 'Kinetic Art', 'Light Art', 'Color Field', 'Hard Edge',
    'Trompe-l\'oeil', 'Chiaroscuro', 'Pointillism', 'Collage Aesthetic', 'Mixed Media Styles'
  ].sort();
};

// Art interests - mediums, activities, themes, and subjects
const getArtInterests = () => {
  return [
    // Art Mediums & Techniques
    'Painting', 'Drawing', 'Sculpture', 'Photography', 'Printmaking', 'Digital Art', 'Mixed Media',
    'Ceramics', 'Pottery', 'Glass Art', 'Metalworking', 'Woodworking', 'Stone Carving', 'Jewelry Making',
    'Textile Art', 'Fiber Art', 'Quilting', 'Embroidery', 'Weaving', 'Tapestry', 'Calligraphy',
    'Illustration', 'Graphic Design', 'Typography', 'Book Arts', 'Paper Arts', 'Origami', 'Collage',
    
    // Themes & Subjects
    'Portraits', 'Self-Portraits', 'Landscapes', 'Seascapes', 'Cityscapes', 'Still Life', 'Nature Art',
    'Wildlife Art', 'Botanical Art', 'Floral Art', 'Architecture', 'Urban Scenes', 'Rural Scenes',
    'Religious Art', 'Spiritual Art', 'Mythology', 'Fantasy Art', 'Sci-Fi Art', 'Historical Themes',
    'Cultural Art', 'Social Commentary', 'Political Art', 'Environmental Art', 'Abstract Themes',
    
    // Art Activities & Practices
    'Art Collecting', 'Gallery Visits', 'Museum Tours', 'Art Classes', 'Workshops', 'Art Fairs',
    'Art Festivals', 'Studio Visits', 'Artist Talks', 'Art Criticism', 'Art History', 'Art Theory',
    'Art Restoration', 'Art Conservation', 'Art Therapy', 'Art Education', 'Art Teaching',
    'Plein Air Painting', 'Life Drawing', 'Figure Drawing', 'Portrait Sessions', 'Art Journaling',
    'Sketching', 'Urban Sketching', 'Travel Art', 'Art Photography', 'Art Blogging', 'Art Writing',
    
    // Craft & Maker Arts
    'Knitting', 'Crocheting', 'Cross Stitch', 'Needlepoint', 'Beadwork', 'Macrame', 'Leatherwork',
    'Bookbinding', 'Papermaking', 'Candle Making', 'Soap Making', 'Pottery Painting', 'Mosaic',
    'Stained Glass', 'Furniture Making', 'Cabinet Making', 'Toy Making', 'Doll Making', 'Model Making'
  ].sort();
};

// Comprehensive color palette including jewel tones, metallics, earth tones, pastels, etc.
const getFavoriteColors = () => {
  return [
    // Traditional Rainbow Colors
    'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet', 'Purple',
    
    // Extended Primary & Secondary Colors
    'Crimson', 'Scarlet', 'Burgundy', 'Maroon', 'Rose', 'Pink', 'Magenta', 'Fuchsia',
    'Coral', 'Peach', 'Tangerine', 'Amber', 'Gold', 'Lemon', 'Lime', 'Chartreuse',
    'Forest Green', 'Emerald', 'Mint', 'Teal', 'Turquoise', 'Aqua', 'Cyan', 'Sky Blue',
    'Navy', 'Royal Blue', 'Cobalt', 'Periwinkle', 'Lavender', 'Plum', 'Orchid',
    
    // Jewel Tones
    'Ruby', 'Sapphire', 'Emerald Green', 'Amethyst', 'Topaz', 'Garnet', 'Jade',
    'Opal', 'Aquamarine', 'Citrine', 'Peridot', 'Onyx', 'Moonstone', 'Tanzanite',
    
    // Metallic Colors
    'Gold', 'Silver', 'Bronze', 'Copper', 'Platinum', 'Pewter', 'Rose Gold',
    'Antique Gold', 'Brass', 'Chrome', 'Gunmetal', 'Titanium',
    
    // Earth Tones
    'Brown', 'Tan', 'Beige', 'Taupe', 'Khaki', 'Olive', 'Moss', 'Sage',
    'Terracotta', 'Rust', 'Sienna', 'Umber', 'Ochre', 'Clay', 'Sand', 'Stone',
    'Mushroom', 'Driftwood', 'Bark', 'Walnut', 'Chestnut', 'Mahogany',
    
    // Pastels
    'Baby Pink', 'Baby Blue', 'Mint Green', 'Lavender', 'Peach', 'Cream',
    'Powder Blue', 'Blush', 'Pale Yellow', 'Soft Coral', 'Light Sage', 'Dusty Rose',
    'Champagne', 'Ivory', 'Pearl', 'Vanilla', 'Buttercream',
    
    // Neutrals & Classics
    'White', 'Black', 'Gray', 'Charcoal', 'Slate', 'Ash', 'Dove Gray', 'Storm Gray',
    'Off-White', 'Cream White', 'Bone', 'Eggshell', 'Linen', 'Natural',
    
    // Bold & Vibrant
    'Electric Blue', 'Neon Green', 'Hot Pink', 'Bright Orange', 'Lime Green',
    'Electric Purple', 'Shocking Pink', 'Fluorescent Yellow', 'Vivid Red',
    
    // Deep & Rich Colors
    'Midnight Blue', 'Deep Purple', 'Wine', 'Hunter Green', 'Chocolate',
    'Espresso', 'Jet Black', 'Charcoal Black', 'Deep Teal', 'Dark Olive'
  ].sort();
};

// Edit Profile Component - Comprehensive profile editing with sections
// Title is handled by slide-in header template in Dashboard

export default function EditProfile({ userData }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Base profile fields (user_profiles table)
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
    education: [],
    awards: '',
    memberships: '',
    timezone: '',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    social_twitter: '',
    social_pinterest: '',
    social_whatsapp: '',
    
    // Image fields
    profile_image_path: '',
    header_image_path: '',
    logo_path: '',
    
    // Artist profile fields
    artist_biography: '',
    art_categories: [],
    art_mediums: [],
    does_custom: 'no',
    custom_details: '',
    artist_business_name: '',
    artist_legal_name: '',
    artist_tax_id: '',
    customer_service_email: '',
    studio_address_line1: '',
    studio_address_line2: '',
    studio_city: '',
    studio_state: '',
    studio_zip: '',
    artist_business_phone: '',
    artist_business_website: '',
    artist_business_social_facebook: '',
    artist_business_social_instagram: '',
    artist_business_social_tiktok: '',
    artist_business_social_twitter: '',
    artist_business_social_pinterest: '',
    artist_founding_date: '',
    
    // Promoter profile fields
    is_non_profit: 'no',
    organization_size: '',
    sponsorship_options: '',
    upcoming_events: '',
    office_address_line1: '',
    office_address_line2: '',
    office_city: '',
    office_state: '',
    office_zip: '',
    promoter_business_name: '',
    promoter_legal_name: '',
    promoter_tax_id: '',
    promoter_business_phone: '',
    promoter_business_website: '',
    promoter_business_social_facebook: '',
    promoter_business_social_instagram: '',
    promoter_business_social_tiktok: '',
    promoter_business_social_twitter: '',
    promoter_business_social_pinterest: '',
    promoter_founding_date: '',
    
    // Community profile fields
    art_style_preferences: [],
    favorite_colors: [],
    art_interests: [],
    wishlist: []
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [headerImage, setHeaderImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [userCarts, setUserCarts] = useState([]);

  // Permission checks
  const isAdmin = userData?.user_type === 'admin';
  const canEditArtist = userData?.user_type === 'artist' || isAdmin;
  const canEditPromoter = userData?.user_type === 'promoter' || isAdmin;
  const canEditCommunity = userData?.user_type === 'community' || isAdmin;

  // Fetch user's carts for wishlist selection
  const fetchUserCarts = async () => {
    try {
      const response = await authApiRequest(API_ENDPOINTS.CART, {
        method: 'GET'
      });
      
      if (response.ok) {
        const carts = await response.json();
        setUserCarts(carts || []);
      }
    } catch (error) {
      console.error('Error fetching user carts:', error);
      setUserCarts([]);
    }
  };

  useEffect(() => {
    if (userData) {
      setFormData({
        // Base profile fields
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        display_name: userData.display_name || '',
        phone: userData.phone || '',
        address_line1: userData.address_line1 || '',
        address_line2: userData.address_line2 || '',
        city: userData.city || '',
        state: userData.state || '',
        postal_code: userData.postal_code || '',
        country: userData.country || '',
        bio: userData.bio || '',
        website: userData.website || '',
        birth_date: userData.birth_date ? userData.birth_date.split('T')[0] : '',
        gender: userData.gender || '',
        nationality: userData.nationality || '',
        languages_known: userData.languages_known || [],
        job_title: userData.job_title || '',
        education: userData.education || [],
        awards: typeof userData.awards === 'string' ? userData.awards : (Array.isArray(userData.awards) && userData.awards.length > 0 ? userData.awards.join('\n') : ''),
        memberships: typeof userData.memberships === 'string' ? userData.memberships : (Array.isArray(userData.memberships) && userData.memberships.length > 0 ? userData.memberships.join('\n') : ''),
        timezone: userData.timezone || '',
        social_facebook: userData.social_facebook || '',
        social_instagram: userData.social_instagram || '',
        social_tiktok: userData.social_tiktok || '',
        social_twitter: userData.social_twitter || '',
        social_pinterest: userData.social_pinterest || '',
        social_whatsapp: userData.social_whatsapp || '',
        
        // Image fields
        profile_image_path: userData.profile_image_path || '',
        header_image_path: userData.header_image_path || '',
        logo_path: userData.logo_path || '',
        
        // Artist profile fields
        artist_biography: userData.artist_biography || '',
        art_categories: userData.art_categories || [],
        art_mediums: userData.art_mediums || [],
        does_custom: userData.does_custom || 'no',
        custom_details: userData.custom_details || '',
        artist_business_name: userData.business_name || '',
        artist_legal_name: userData.legal_name || '',
        artist_tax_id: userData.tax_id || '',
        customer_service_email: userData.customer_service_email || '',
        studio_address_line1: userData.studio_address_line1 || '',
        studio_address_line2: userData.studio_address_line2 || '',
        studio_city: userData.studio_city || '',
        studio_state: userData.studio_state || '',
        studio_zip: userData.studio_zip || '',
        artist_business_phone: userData.business_phone || '',
        artist_business_website: userData.business_website || '',
        artist_business_social_facebook: userData.business_social_facebook || '',
        artist_business_social_instagram: userData.business_social_instagram || '',
        artist_business_social_tiktok: userData.business_social_tiktok || '',
        artist_business_social_twitter: userData.business_social_twitter || '',
        artist_business_social_pinterest: userData.business_social_pinterest || '',
        artist_founding_date: userData.founding_date ? userData.founding_date.split('T')[0] : '',
        
        // Promoter profile fields
        is_non_profit: userData.is_non_profit || 'no',
        organization_size: userData.organization_size || '',
        sponsorship_options: userData.sponsorship_options || '',
        upcoming_events: userData.upcoming_events || '',
        office_address_line1: userData.office_address_line1 || '',
        office_address_line2: userData.office_address_line2 || '',
        office_city: userData.office_city || '',
        office_state: userData.office_state || '',
        office_zip: userData.office_zip || '',
        promoter_business_name: userData.business_name || '',
        promoter_legal_name: userData.legal_name || '',
        promoter_tax_id: userData.tax_id || '',
        promoter_business_phone: userData.business_phone || '',
        promoter_business_website: userData.business_website || '',
        promoter_business_social_facebook: userData.business_social_facebook || '',
        promoter_business_social_instagram: userData.business_social_instagram || '',
        promoter_business_social_tiktok: userData.business_social_tiktok || '',
        promoter_business_social_twitter: userData.business_social_twitter || '',
        promoter_business_social_pinterest: userData.business_social_pinterest || '',
        promoter_founding_date: userData.founding_date ? userData.founding_date.split('T')[0] : '',
        
        // Community profile fields
        art_style_preferences: userData.art_style_preferences || [],
        favorite_colors: userData.favorite_colors || [],
        art_interests: userData.art_interests || [],
        wishlist: userData.wishlist || []
      });
      
      // Fetch user carts for wishlist selection
      fetchUserCarts();
    } else {
      setError('User data not available. Please try refreshing the page.');
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'art_categories' || name === 'art_mediums') {
        setFormData(prev => ({
          ...prev,
          [name]: checked
            ? [...prev[name], value]
            : prev[name].filter(item => item !== value)
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file && file.size > maxSize) {
      setError(`File too large. Please choose an image smaller than 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      e.target.value = ''; // Clear the file input
      return;
    }
    
    if (name === 'profile_image') {
      setProfileImage(file);
    } else if (name === 'header_image') {
      setHeaderImage(file);
    } else if (name === 'logo_image') {
      setLogoImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Add all form fields - using the pattern from pages/profile/edit.js
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (profileImage) {
        formDataToSend.append('profile_image', profileImage);
      }
      if (headerImage) {
        formDataToSend.append('header_image', headerImage);
      }
      if (logoImage) {
        formDataToSend.append('logo_image', logoImage);
      }

      const endpoint = userData?.user_type === 'admin' 
        ? 'users/admin/me'
        : 'users/me';
      
      const res = await authApiRequest(endpoint, {
        method: 'PATCH',
        body: formDataToSend
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      // Show success message
      alert('Profile updated successfully!');
      
      // Reload the page to refresh user data in the dashboard
      window.location.reload();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
  return (
    <div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }
  
  return (
        <div>
      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Base Profile Section - Available to ALL users */}
        <div className="form-card">
          <h3>Personal Information</h3>
          
          {/* Row 1: First Name | Last Name */}
          <div className="form-grid-2">
        <div>
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
        </div>
        <div>
              <label>Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
        </div>
          </div>
          
          {/* Row 2: Display Name | Phone */}
          <div className="form-grid-2">
            <div>
              <div className="field-with-info">
                <label>Display Name</label>
                <div className="info-tooltip">
                  i
                  <div className="tooltip-content">
                    This is how you will appear to other users on the site
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* Row 3: Birth Date | Gender | Nationality | Timezone */}
          <div className="form-grid-4">
            <div>
              <label>Birth Date</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <div className="field-with-info">
                <label>Gender</label>
                <div className="info-tooltip">
                  i
                  <div className="tooltip-content">
                    Optional: This information is anonymized and used to help us understand our user-base
                  </div>
                </div>
              </div>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Custom">Custom</option>
                <option value="Prefer Not to Say">Prefer Not to Say</option>
              </select>
            </div>
            <div>
              <div className="field-with-info">
                <label>Nationality</label>
                <div className="info-tooltip">
                  i
                  <div className="tooltip-content">
                    Optional: This information is anonymized and used to help us understand our user-base
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Timezone</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
              >
                <option value="">Select timezone...</option>
                {getTimezones().map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Row 4: Job Title | Website */}
          <div className="form-grid-2">
            <div>
              <div className="field-with-info">
                <label>Job Title</label>
                <div className="info-tooltip">
                  i
                  <div className="tooltip-content">
                    Optional: This information is anonymized and used to help us understand our user-base
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* Row 5: About Me (full width) */}
          <div className="form-grid-1">
            <div>
              <label>About Me</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="form-card">
          <h3>Billing Address</h3>
          
          <div className="form-grid-1">
            <div>
              <label>Address Line 1</label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-grid-1">
            <div>
              <label>Address Line 2</label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-grid-3">
            <div>
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Postal Code</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-grid-1">
        <div>
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Personal Social Media Section */}
        <div className="form-card">
          <h3>Personal Social Media</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {/* Facebook */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#1877F2' }}>
                <i className="material-icons">facebook</i>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Facebook</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>facebook.com/</span>
                <input
                  type="text"
                  name="social_facebook"
                  value={formData.social_facebook?.replace('https://facebook.com/', '') || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_facebook: e.target.value ? `https://facebook.com/${e.target.value}` : '' 
                  }))}
                  placeholder="username"
                  style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#E4405F' }}>
                <i className="material-icons">camera_alt</i>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Instagram</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>instagram.com/</span>
                <input
                  type="text"
                  name="social_instagram"
                  value={formData.social_instagram?.replace('https://instagram.com/', '') || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_instagram: e.target.value ? `https://instagram.com/${e.target.value}` : '' 
                  }))}
                  placeholder="username"
                  style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                />
              </div>
            </div>

            {/* TikTok */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#FF0050' }}>
                <i className="material-icons">music_note</i>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>TikTok</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>tiktok.com/@</span>
                <input
                  type="text"
                  name="social_tiktok"
                  value={formData.social_tiktok?.replace('https://tiktok.com/@', '') || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_tiktok: e.target.value ? `https://tiktok.com/@${e.target.value}` : '' 
                  }))}
                  placeholder="username"
                  style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                />
              </div>
            </div>

            {/* X (Twitter) */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#000000', fontWeight: 'bold' }}>
                𝕏
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>X</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>x.com/</span>
                <input
                  type="text"
                  name="social_twitter"
                  value={formData.social_twitter?.replace('https://x.com/', '').replace('https://twitter.com/', '') || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_twitter: e.target.value ? `https://x.com/${e.target.value}` : '' 
                  }))}
                  placeholder="username"
                  style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                />
              </div>
            </div>

            {/* Pinterest */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#BD081C' }}>
                <i className="material-icons">push_pin</i>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Pinterest</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>pinterest.com/</span>
                <input
                  type="text"
                  name="social_pinterest"
                  value={formData.social_pinterest?.replace('https://pinterest.com/', '') || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_pinterest: e.target.value ? `https://pinterest.com/${e.target.value}` : '' 
                  }))}
                  placeholder="username"
                  style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', color: '#25D366' }}>
                <i className="material-icons">chat</i>
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>WhatsApp</div>
              <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>wa.me/</span>
                <input
                  type="text"
                  name="social_whatsapp"
                  value={formData.social_whatsapp?.replace('https://wa.me/', '') || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_whatsapp: e.target.value ? `https://wa.me/${e.target.value}` : '' 
                  }))}
                  placeholder="phone"
                  style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Images Section */}
        <div className="form-card">
          <h3>Profile Images</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Profile Image */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                margin: '0 auto 12px', 
                border: '2px dashed #ccc', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {formData.profile_image_path ? (
                  <img 
                    src={formData.profile_image_path} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    <i className="material-icons" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>person</i>
                    Profile Photo
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Profile Image</div>
              <input
                type="file"
                name="profile_image"
                accept="image/*"
                onChange={handleFileChange}
                style={{ fontSize: '12px' }}
              />
              {profileImage && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>Selected: {profileImage.name}</div>}
            </div>

            {/* Header Image */}
            <div className="section-box" style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                margin: '0 auto 12px', 
                border: '2px dashed #ccc', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {formData.header_image_path ? (
                  <img 
                    src={formData.header_image_path} 
                    alt="Header" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    <i className="material-icons" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>image</i>
                    Header Photo
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Header Image</div>
              <input
                type="file"
                name="header_image"
                accept="image/*"
                onChange={handleFileChange}
                style={{ fontSize: '12px' }}
              />
              {headerImage && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>Selected: {headerImage.name}</div>}
            </div>
          </div>
        </div>

        {/* Complex Fields Section - Available to ALL users */}
        <div className="form-card">
          <h3>Additional Information</h3>
          
          <div>
            <label>Languages Known</label>
            <select
              multiple
              name="languages_known"
              value={Array.isArray(formData.languages_known) ? formData.languages_known : []}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                setFormData(prev => ({ ...prev, languages_known: selectedOptions }));
              }}
              style={{ 
                width: '100%',
                minHeight: '120px',
                padding: '8px',
                fontSize: '14px'
              }}
            >
              {getCommonLanguages().map(language => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              Hold Ctrl/Cmd to select multiple languages
            </div>
            {Array.isArray(formData.languages_known) && formData.languages_known.length > 0 && (
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                Selected: {formData.languages_known.join(', ')}
              </div>
            )}
          </div>
          
          <div>
            <label>Education Level</label>
            <select
              multiple
              name="education"
              value={Array.isArray(formData.education) ? formData.education : []}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                // Keep education levels in the order they appear in getEducationLevels()
                const allLevels = getEducationLevels();
                const orderedSelection = allLevels.filter(level => selectedOptions.includes(level));
                setFormData(prev => ({ ...prev, education: orderedSelection }));
              }}
              style={{ 
                width: '100%',
                minHeight: '100px',
                padding: '8px',
                fontSize: '14px'
              }}
            >
              {getEducationLevels().map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              Hold Ctrl/Cmd to select multiple education levels
            </div>
            {Array.isArray(formData.education) && formData.education.length > 0 && (
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                Selected: {formData.education.join(', ')}
              </div>
            )}
          </div>
          
          <div>
            <label>Awards & Recognition</label>
            <textarea
              name="awards"
              value={formData.awards}
              onChange={handleChange}
              rows="3"
              placeholder="List your awards, honors, and recognition..."
            />
          </div>
          
        <div>
            <label>Professional Memberships</label>
            <textarea
              name="memberships"
              value={formData.memberships}
              onChange={handleChange}
              rows="3"
              placeholder="List your professional memberships, organizations, and associations..."
            />
          </div>
        </div>

        {/* Artist Profile Section - Only for artists and admins */}
        {canEditArtist && (
          <div className="form-card">
            <h3>Artist Profile</h3>
            
            <div>
              <label>Artist Biography</label>
              <textarea
                name="artist_biography"
                value={formData.artist_biography}
                onChange={handleChange}
                rows="4"
              />
            </div>
            
          <div className="form-grid-2">
            <div>
              <label>Art Categories (matches product categories for vendor setup)</label>
              <select
                multiple
                name="art_categories"
                value={Array.isArray(formData.art_categories) ? formData.art_categories.map(String) : []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setFormData(prev => ({ ...prev, art_categories: selectedOptions.sort((a, b) => a - b) }));
                }}
                style={{ 
                  width: '100%',
                  minHeight: '150px',
                  padding: '8px',
                  fontSize: '14px'
                }}
              >
                {getProductCategories().map(category => {
                  // Create hierarchical display names
                  let displayName = category.name;
                  
                  // If it's a subcategory, add parent name
                  if (category.parent_id) {
                    const parent = getProductCategories().find(p => p.id === category.parent_id);
                    if (parent) {
                      // If parent also has a parent (sub-subcategory), show full hierarchy
                      if (parent.parent_id) {
                        const grandparent = getProductCategories().find(gp => gp.id === parent.parent_id);
                        if (grandparent) {
                          displayName = `${grandparent.name} → ${parent.name} → ${category.name}`;
                        } else {
                          displayName = `${parent.name} → ${category.name}`;
                        }
                      } else {
                        displayName = `${parent.name} → ${category.name}`;
                      }
                    }
                  }
                  
                  return (
                    <option key={category.id} value={category.id}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Hold Ctrl/Cmd to select multiple categories
              </div>
              {Array.isArray(formData.art_categories) && formData.art_categories.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Selected category IDs: {formData.art_categories.join(', ')}
                </div>
              )}
            </div>
            
            <div>
              <label>Art Mediums & Materials</label>
              <select
                multiple
                name="art_mediums"
                value={Array.isArray(formData.art_mediums) ? formData.art_mediums : []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({ ...prev, art_mediums: selectedOptions.sort() }));
                }}
                style={{ 
                  width: '100%',
                  minHeight: '150px',
                  padding: '8px',
                  fontSize: '14px'
                }}
              >
                {getArtMediums().map(medium => (
                  <option key={medium} value={medium}>
                    {medium}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Hold Ctrl/Cmd to select multiple mediums and materials
              </div>
              {Array.isArray(formData.art_mediums) && formData.art_mediums.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Selected: {formData.art_mediums.join(', ')}
                </div>
              )}
            </div>
          </div>
            
          <div className="form-grid-3">
            <div>
              <label>Business Name (DBA)</label>
              <input
                type="text"
                name="artist_business_name"
                value={formData.artist_business_name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Legal Business Name</label>
              <input
                type="text"
                name="artist_legal_name"
                value={formData.artist_legal_name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <div className="field-with-info">
                <label>Tax ID</label>
                <div className="info-tooltip">
                  i
                  <div className="tooltip-content">
                    Not required in Alaska, Delaware, Montana, New Hampshire, and Oregon
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="artist_tax_id"
                value={formData.artist_tax_id}
                onChange={handleChange}
              />
            </div>
          </div>
            
          <div className="form-grid-3">
            <div>
              <label>Business Phone</label>
              <input
                type="tel"
                name="artist_business_phone"
                value={formData.artist_business_phone}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Business Website</label>
              <input
                type="url"
                name="artist_business_website"
                value={formData.artist_business_website}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Customer Contact Email</label>
              <input
                type="email"
                name="customer_service_email"
                value={formData.customer_service_email}
                onChange={handleChange}
              />
            </div>
          </div>
            
          <div className="form-grid-3">
            <div>
              <label>Founding Date</label>
              <input
                type="date"
                name="artist_founding_date"
                value={formData.artist_founding_date}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Do you do custom work?</label>
              <label className="toggle-slider-container">
                <input
                  type="checkbox"
                  name="does_custom"
                  checked={formData.does_custom === 'yes'}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    does_custom: e.target.checked ? 'yes' : 'no' 
                  }))}
                  className="toggle-slider-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {formData.does_custom === 'yes' ? 'Yes' : 'No'}
                </span>
              </label>
            </div>
            
            <div>
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  margin: '0 auto 12px', 
                  border: '2px dashed #ccc', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fa',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {formData.logo_path ? (
                    <img 
                      src={formData.logo_path} 
                      alt="Logo" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>
                      <i className="material-icons" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>business</i>
                      Logo Image
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Logo Upload</div>
                <input
                  type="file"
                  name="logo_image"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ fontSize: '12px' }}
                />
                {logoImage && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>Selected: {logoImage.name}</div>}
              </div>
            </div>
          </div>
            
            {formData.does_custom === 'yes' && (
              <div className="form-grid-1">
                <div>
                  <label>Custom Work Details</label>
                  <textarea
                    name="custom_details"
                    value={formData.custom_details}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Describe the types of custom work you offer..."
                  />
                </div>
              </div>
            )}
            
            <h3>Studio Address</h3>
            
            <div className="form-grid-1">
              <div>
                <label>Studio Address Line 1</label>
                <input
                  type="text"
                  name="studio_address_line1"
                  value={formData.studio_address_line1}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="form-grid-1">
              <div>
                <label>Studio Address Line 2</label>
                <input
                  type="text"
                  name="studio_address_line2"
                  value={formData.studio_address_line2}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="form-grid-3">
              <div>
                <label>Studio City</label>
                <input
                  type="text"
                  name="studio_city"
                  value={formData.studio_city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Studio State</label>
                <input
                  type="text"
                  name="studio_state"
                  value={formData.studio_state}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Studio Zip</label>
                <input
                  type="text"
                  name="studio_zip"
                  value={formData.studio_zip}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <h3>Business Social Media</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {/* Facebook */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#1877F2' }}>
                  <i className="material-icons">facebook</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Facebook</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>facebook.com/</span>
                  <input
                    type="text"
                    name="artist_business_social_facebook"
                    value={formData.artist_business_social_facebook?.replace('https://facebook.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      artist_business_social_facebook: e.target.value ? `https://facebook.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Instagram */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#E4405F' }}>
                  <i className="material-icons">camera_alt</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Instagram</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>instagram.com/</span>
                  <input
                    type="text"
                    name="artist_business_social_instagram"
                    value={formData.artist_business_social_instagram?.replace('https://instagram.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      artist_business_social_instagram: e.target.value ? `https://instagram.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* TikTok */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#000000' }}>
                  <i className="material-icons">music_note</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>TikTok</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>tiktok.com/@</span>
                  <input
                    type="text"
                    name="artist_business_social_tiktok"
                    value={formData.artist_business_social_tiktok?.replace('https://tiktok.com/@', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      artist_business_social_tiktok: e.target.value ? `https://tiktok.com/@${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Twitter/X */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#000000' }}>
                  𝕏
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>X (Twitter)</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>x.com/</span>
                  <input
                    type="text"
                    name="artist_business_social_twitter"
                    value={formData.artist_business_social_twitter?.replace('https://x.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      artist_business_social_twitter: e.target.value ? `https://x.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Pinterest */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#BD081C' }}>
                  <i className="material-icons">push_pin</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Pinterest</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>pinterest.com/</span>
                  <input
                    type="text"
                    name="artist_business_social_pinterest"
                    value={formData.artist_business_social_pinterest?.replace('https://pinterest.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      artist_business_social_pinterest: e.target.value ? `https://pinterest.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Empty box for 3x2 grid completion */}
              <div style={{ minHeight: '1px' }}></div>
            </div>
          </div>
        )}




        {/* Promoter Profile Section - Only for promoters and admins */}
        {canEditPromoter && (
          <div className="form-card">
            <h3>Promoter Profile</h3>
            
          <div className="form-grid-3">
            <div>
              <label>Business Name (DBA)</label>
              <input
                type="text"
                name="promoter_business_name"
                value={formData.promoter_business_name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Legal Business Name</label>
              <input
                type="text"
                name="promoter_legal_name"
                value={formData.promoter_legal_name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <div className="field-with-info">
                <label>Tax ID</label>
                <div className="info-tooltip">
                  i
                  <div className="tooltip-content">
                    Not required in Alaska, Delaware, Montana, New Hampshire, and Oregon
                  </div>
                </div>
              </div>
              <input
                type="text"
                name="promoter_tax_id"
                value={formData.promoter_tax_id}
                onChange={handleChange}
              />
            </div>
          </div>
            
          <div className="form-grid-2">
            <div>
              <label>Business Phone</label>
              <input
                type="tel"
                name="promoter_business_phone"
                value={formData.promoter_business_phone}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Business Website</label>
              <input
                type="url"
                name="promoter_business_website"
                value={formData.promoter_business_website}
                onChange={handleChange}
              />
            </div>
          </div>
            
          <div className="form-grid-3">
            <div>
              <label>Founding Date</label>
              <input
                type="date"
                name="promoter_founding_date"
                value={formData.promoter_founding_date}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label>Organization Size</label>
              <input
                type="text"
                name="organization_size"
                value={formData.organization_size}
                onChange={handleChange}
                placeholder="e.g., 1-10 employees"
              />
            </div>
            
            <div>
              <label>Non-Profit Organization?</label>
              <select
                name="is_non_profit"
                value={formData.is_non_profit}
                onChange={handleChange}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
            
            <div>
              <label>Sponsorship Options & Packages</label>
              <textarea
                name="sponsorship_options"
                value={formData.sponsorship_options}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your sponsorship packages and pricing options..."
              />
            </div>
            
            <div>
              <label>Upcoming Events</label>
              <textarea
                name="upcoming_events"
                value={formData.upcoming_events}
                onChange={handleChange}
                rows="4"
                placeholder="List your upcoming events and dates..."
              />
            </div>
            
            <div>
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  margin: '0 auto 12px', 
                  border: '2px dashed #ccc', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fa',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {formData.logo_path ? (
                    <img 
                      src={formData.logo_path} 
                      alt="Logo" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>
                      <i className="material-icons" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>business</i>
                      Logo Image
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Logo Image</div>
                <input
                  type="file"
                  name="logo_image"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ fontSize: '12px' }}
                />
                {logoImage && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>Selected: {logoImage.name}</div>}
              </div>
            </div>
            
            <h3>Office Address</h3>
            
            <div className="form-grid-1">
              <div>
                <label>Office Address Line 1</label>
                <input
                  type="text"
                  name="office_address_line1"
                  value={formData.office_address_line1}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="form-grid-1">
              <div>
                <label>Office Address Line 2</label>
                <input
                  type="text"
                  name="office_address_line2"
                  value={formData.office_address_line2}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="form-grid-3">
              <div>
                <label>Office City</label>
                <input
                  type="text"
                  name="office_city"
                  value={formData.office_city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Office State</label>
                <input
                  type="text"
                  name="office_state"
                  value={formData.office_state}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Office Zip</label>
                <input
                  type="text"
                  name="office_zip"
                  value={formData.office_zip}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <h3>Business Social Media</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {/* Facebook */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#1877F2' }}>
                  <i className="material-icons">facebook</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Facebook</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>facebook.com/</span>
                  <input
                    type="text"
                    name="promoter_business_social_facebook"
                    value={formData.promoter_business_social_facebook?.replace('https://facebook.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      promoter_business_social_facebook: e.target.value ? `https://facebook.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Instagram */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#E4405F' }}>
                  <i className="material-icons">camera_alt</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Instagram</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>instagram.com/</span>
                  <input
                    type="text"
                    name="promoter_business_social_instagram"
                    value={formData.promoter_business_social_instagram?.replace('https://instagram.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      promoter_business_social_instagram: e.target.value ? `https://instagram.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* TikTok */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#000000' }}>
                  <i className="material-icons">music_note</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>TikTok</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>tiktok.com/@</span>
                  <input
                    type="text"
                    name="promoter_business_social_tiktok"
                    value={formData.promoter_business_social_tiktok?.replace('https://tiktok.com/@', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      promoter_business_social_tiktok: e.target.value ? `https://tiktok.com/@${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Twitter/X */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#000000' }}>
                  𝕏
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>X (Twitter)</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>x.com/</span>
                  <input
                    type="text"
                    name="promoter_business_social_twitter"
                    value={formData.promoter_business_social_twitter?.replace('https://x.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      promoter_business_social_twitter: e.target.value ? `https://x.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Pinterest */}
              <div className="section-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', color: '#BD081C' }}>
                  <i className="material-icons">push_pin</i>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Pinterest</div>
                <div style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>pinterest.com/</span>
                  <input
                    type="text"
                    name="promoter_business_social_pinterest"
                    value={formData.promoter_business_social_pinterest?.replace('https://pinterest.com/', '') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      promoter_business_social_pinterest: e.target.value ? `https://pinterest.com/${e.target.value}` : '' 
                    }))}
                    placeholder="username"
                    style={{ width: '80px', textAlign: 'center', border: 'none', borderBottom: '1px solid #ccc', fontSize: '12px', marginLeft: '2px' }}
                  />
                </div>
              </div>

              {/* Empty box for 3x2 grid completion */}
              <div style={{ minHeight: '1px' }}></div>
            </div>
          </div>
        )}





        {/* Community Profile Section - Only for community and admins */}
        {canEditCommunity && (
          <div className="form-card">
            <h3>Community Member Art Preferences</h3>
            
          <div className="form-grid-2">
            <div>
              <label>Art Style Preferences</label>
              <select
                multiple
                name="art_style_preferences"
                value={Array.isArray(formData.art_style_preferences) ? formData.art_style_preferences : []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({ ...prev, art_style_preferences: selectedOptions.sort() }));
                }}
                style={{ 
                  width: '100%',
                  minHeight: '180px',
                  padding: '8px',
                  fontSize: '14px'
                }}
              >
                {getArtStylePreferences().map(style => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Visual styles, movements & aesthetics you enjoy
              </div>
              {Array.isArray(formData.art_style_preferences) && formData.art_style_preferences.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Selected: {formData.art_style_preferences.join(', ')}
                </div>
              )}
            </div>
            
            <div>
              <label>Art Interests</label>
              <select
                multiple
                name="art_interests"
                value={Array.isArray(formData.art_interests) ? formData.art_interests : []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({ ...prev, art_interests: selectedOptions.sort() }));
                }}
                style={{ 
                  width: '100%',
                  minHeight: '180px',
                  padding: '8px',
                  fontSize: '14px'
                }}
              >
                {getArtInterests().map(interest => (
                  <option key={interest} value={interest}>
                    {interest}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Mediums, activities, themes & subjects you enjoy
              </div>
              {Array.isArray(formData.art_interests) && formData.art_interests.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Selected: {formData.art_interests.join(', ')}
                </div>
              )}
            </div>
          </div>
            
            <div>
              <label>Use your custom carts as Wishlists</label>
              <select
                multiple
                name="wishlist"
                value={Array.isArray(formData.wishlist) ? formData.wishlist.map(String) : []}
                onChange={(e) => {
                  const selectedCartIds = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setFormData(prev => ({ ...prev, wishlist: selectedCartIds }));
                }}
                style={{ 
                  width: '100%',
                  minHeight: '120px',
                  padding: '8px',
                  fontSize: '14px'
                }}
              >
                {userCarts.map(cart => (
                  <option key={cart.id} value={cart.id}>
                    {cart.name} (ID: {cart.id})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Select carts to display as public wishlists on your profile
              </div>
              {Array.isArray(formData.wishlist) && formData.wishlist.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Selected cart IDs: {formData.wishlist.join(', ')}
                </div>
              )}
              {userCarts.length === 0 && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px', fontStyle: 'italic' }}>
                  No carts found. Create some shopping carts to use as wishlists.
                </div>
              )}
            </div>
            

            
            <div>
              <label>Favorite Colors</label>
              <select
                multiple
                name="favorite_colors"
                value={Array.isArray(formData.favorite_colors) ? formData.favorite_colors : []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData(prev => ({ ...prev, favorite_colors: selectedOptions.sort() }));
                }}
                style={{ 
                  width: '100%',
                  minHeight: '150px',
                  padding: '8px',
                  fontSize: '14px'
                }}
              >
                {getFavoriteColors().map(color => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Select your favorite colors from our comprehensive palette
              </div>
              {Array.isArray(formData.favorite_colors) && formData.favorite_colors.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Selected: {formData.favorite_colors.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-submit-section">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
