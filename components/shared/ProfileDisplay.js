'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../pages/profile/Profile.module.css';
import { getSmartMediaUrl, getApiUrl } from '../../lib/config';
import ContactArtistModal from './ContactArtistModal';
import ArtistProductCarousel from '../ArtistProductCarousel';

export default function ProfileDisplay({ 
  userProfile, 
  showEditButton = false, 
  currentUserId = null 
}) {
  const [products, setProducts] = useState([]);
  const [artistEvents, setArtistEvents] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Fetch artist's products if they're a vendor
  useEffect(() => {
    if (!userProfile?.id) return;
    
    const fetchProducts = async () => {
      try {
        const response = await fetch(getApiUrl(`products/all?vendor_id=${userProfile.id}&include=images,inventory`));
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [userProfile?.id]);

  // Fetch artist's event applications
  useEffect(() => {
    if (!userProfile?.id || userProfile?.user_type !== 'artist') return;
    
    const fetchArtistEvents = async () => {
      try {
        const response = await fetch(getApiUrl(`api/events/artist/${userProfile.id}/applications`));
        if (response.ok) {
          const data = await response.json();
          setArtistEvents(data);
        }
      } catch (error) {
        console.error('Error fetching artist events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchArtistEvents();
  }, [userProfile?.id, userProfile?.user_type]);

  if (!userProfile) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Loading...</h1>
      </div>
    );
  }

  // Ensure we only prefix the API host when the path is relative
  const toAbsoluteImageUrl = (maybePath) => {
    if (!maybePath || typeof maybePath !== 'string') return '';
    const path = maybePath.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path; // already absolute
    }
    // Normalize missing leading slash
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return getSmartMediaUrl(normalized);
  };

  const isOwnProfile = currentUserId && userProfile.id && (currentUserId.toString() === userProfile.id.toString());

  return (
    <div className={styles.container}>
      {userProfile.header_image_path ? (
        <img
          src={toAbsoluteImageUrl(userProfile.header_image_path)}
          alt="Header"
          className={styles.headerImage}
        />
      ) : (
        <div className={styles.headerPlaceholder}></div>
      )}
      {showEditButton && isOwnProfile && (
        <div className={styles.floatingEditButton}>
          <a href="/profile/edit" className={styles.floatingEditLink}>
            <i className="fa-solid fa-edit"></i>
            Edit Profile
          </a>
        </div>
      )}
      <div className={styles.profileWrapper}>
        {userProfile.profile_image_path && (
          <img
            src={toAbsoluteImageUrl(userProfile.profile_image_path)}
            alt="Profile"
            className={styles.profileImage}
          />
        )}
        <div className={styles.socialIcons}>
          {/* Dynamic social links */}
          {userProfile.website && (
            <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
              <i className="fa-solid fa-globe"></i>
            </a>
          )}
          {userProfile.social_facebook && (
            <a href={userProfile.social_facebook} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-facebook-f"></i>
            </a>
          )}
          {userProfile.social_instagram && (
            <a href={userProfile.social_instagram} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-instagram"></i>
            </a>
          )}
          {userProfile.social_tiktok && (
            <a href={userProfile.social_tiktok} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-tiktok"></i>
            </a>
          )}
          {userProfile.social_twitter && (
            <a href={userProfile.social_twitter} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-x-twitter"></i>
            </a>
          )}
          {userProfile.social_pinterest && (
            <a href={userProfile.social_pinterest} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-pinterest-p"></i>
            </a>
          )}
          {userProfile.social_whatsapp && (
            <a href={userProfile.social_whatsapp} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <i className="fa-brands fa-whatsapp"></i>
            </a>
          )}
        </div>
      </div>
      <div className={styles.infoCard}>
        <h1 className={styles.userName}>
          {userProfile.display_name || `${userProfile.first_name} ${userProfile.last_name}`}
        </h1>
        {userProfile.display_name && (
          <p className={styles.realName}>
            ({userProfile.first_name} {userProfile.last_name})
          </p>
        )}
        {userProfile.job_title && (
          <p className={styles.jobTitle}>{userProfile.job_title}</p>
        )}
        {(userProfile.city || userProfile.state) && (
          <span className={styles.stateBadge}>
            <span className="material-icons stateIcon">location_on</span>
            {userProfile.city && userProfile.state ? `${userProfile.city}, ${userProfile.state}` : userProfile.city || userProfile.state}
            {userProfile.country && `, ${userProfile.country}`}
          </span>
        )}
        {/* Contact Artist Button - only show for artist profiles that aren't the viewer's own */}
        {userProfile.user_type === 'artist' && !isOwnProfile && (
          <button 
            className={styles.contactButton}
            onClick={() => setIsContactModalOpen(true)}
          >
            <i className="fa-solid fa-envelope"></i>
            Contact Artist
          </button>
        )}
      </div>


      {userProfile.user_type === 'artist' && (
        <div className={styles.artistDetailsSection}>
          {/* Logo and Business Name Header */}
          {(userProfile.logo_path || userProfile.business_name) && (
            <div className={styles.artistHeader}>
              {userProfile.logo_path && (
                <img
                  src={toAbsoluteImageUrl(userProfile.logo_path)}
                  alt="Business Logo"
                  className={styles.logoImage}
                />
              )}
              <div className={styles.artistHeaderInfo}>
                {userProfile.business_name && (
                  <h2 className={styles.businessNameLarge}>{userProfile.business_name}</h2>
                )}
                {userProfile.founding_date && (
                  <span className={styles.foundedBadge}>
                    Est. {new Date(userProfile.founding_date).getFullYear()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Artist Biography - Featured Quote */}
          {userProfile.artist_biography && (
            <div className={styles.biographyCard}>
              <i className="fas fa-quote-left" style={{ color: 'var(--primary-color)', opacity: 0.3, fontSize: '24px', marginBottom: '8px' }}></i>
              <p>{userProfile.artist_biography}</p>
            </div>
          )}

          {/* Categories & Mediums as Tags */}
          {((userProfile.art_categories && Array.isArray(userProfile.art_categories) && userProfile.art_categories.length > 0) ||
            (userProfile.art_mediums && Array.isArray(userProfile.art_mediums) && userProfile.art_mediums.length > 0)) && (
            <div className={styles.tagsSection}>
              {userProfile.art_categories && Array.isArray(userProfile.art_categories) && userProfile.art_categories.length > 0 && (
                <div className={styles.tagGroup}>
                  <span className={styles.tagLabel}>Categories</span>
                  <div className={styles.tagList}>
                    {userProfile.art_categories.map((cat, idx) => (
                      <span key={idx} className={styles.tag}>{cat}</span>
                    ))}
                  </div>
                </div>
              )}
              {userProfile.art_mediums && Array.isArray(userProfile.art_mediums) && userProfile.art_mediums.length > 0 && (
                <div className={styles.tagGroup}>
                  <span className={styles.tagLabel}>Mediums</span>
                  <div className={styles.tagList}>
                    {userProfile.art_mediums.map((med, idx) => (
                      <span key={idx} className={styles.tagMedium}>{med}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Artist Badges Row */}
          <div className={styles.badgesRow}>
            {/* Custom Badge */}
            {userProfile.does_custom === 'yes' && (
              <div className={styles.badge} data-badge="custom">
                <i className="fas fa-paint-brush"></i>
                <span>Artist Does Custom</span>
              </div>
            )}
            {/* Future badges will go here: Verified, Top Seller, Fast Shipper, etc. */}
          </div>

          {/* Custom Work Details (if available) */}
          {userProfile.does_custom === 'yes' && userProfile.custom_details && (
            <div className={styles.customDetailsCard}>
              <p>{userProfile.custom_details}</p>
            </div>
          )}

          {/* Contact & Location Grid */}
          <div className={styles.contactGrid}>
            {/* Location Card */}
            {(userProfile.studio_city || userProfile.studio_state) && (
              <div className={styles.contactCard}>
                <i className="fas fa-map-marker-alt"></i>
                <div>
                  <span className={styles.contactLabel}>Studio Location</span>
                  <span className={styles.contactValue}>
                    {[userProfile.studio_city, userProfile.studio_state].filter(Boolean).join(', ')}
                    {userProfile.studio_zip && ` ${userProfile.studio_zip}`}
                  </span>
                </div>
              </div>
            )}

            {/* Phone Card */}
            {userProfile.business_phone && (
              <div className={styles.contactCard}>
                <i className="fas fa-phone"></i>
                <div>
                  <span className={styles.contactLabel}>Phone</span>
                  <span className={styles.contactValue}>{userProfile.business_phone}</span>
                </div>
              </div>
            )}

            {/* Email Card */}
            {userProfile.customer_service_email && (
              <div className={styles.contactCard}>
                <i className="fas fa-envelope"></i>
                <div>
                  <span className={styles.contactLabel}>Email</span>
                  <a href={`mailto:${userProfile.customer_service_email}`} className={styles.contactValue}>
                    {userProfile.customer_service_email}
                  </a>
                </div>
              </div>
            )}

            {/* Website Card */}
            {userProfile.business_website && (
              <div className={styles.contactCard}>
                <i className="fas fa-globe"></i>
                <div>
                  <span className={styles.contactLabel}>Website</span>
                  <a href={userProfile.business_website} target="_blank" rel="noopener noreferrer" className={styles.contactValue}>
                    {userProfile.business_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Business Social Media Icons */}
          {(userProfile.business_social_facebook || userProfile.business_social_instagram || userProfile.business_social_tiktok || userProfile.business_social_twitter || userProfile.business_social_pinterest) && (
            <div className={styles.businessSocialRow}>
              {userProfile.business_social_facebook && (
                <a href={userProfile.business_social_facebook} target="_blank" rel="noopener noreferrer" className={styles.socialIconBtn} title="Facebook">
                  <i className="fa-brands fa-facebook-f"></i>
                </a>
              )}
              {userProfile.business_social_instagram && (
                <a href={userProfile.business_social_instagram} target="_blank" rel="noopener noreferrer" className={styles.socialIconBtn} title="Instagram">
                  <i className="fa-brands fa-instagram"></i>
                </a>
              )}
              {userProfile.business_social_tiktok && (
                <a href={userProfile.business_social_tiktok} target="_blank" rel="noopener noreferrer" className={styles.socialIconBtn} title="TikTok">
                  <i className="fa-brands fa-tiktok"></i>
                </a>
              )}
              {userProfile.business_social_twitter && (
                <a href={userProfile.business_social_twitter} target="_blank" rel="noopener noreferrer" className={styles.socialIconBtn} title="X (Twitter)">
                  <i className="fa-brands fa-x-twitter"></i>
                </a>
              )}
              {userProfile.business_social_pinterest && (
                <a href={userProfile.business_social_pinterest} target="_blank" rel="noopener noreferrer" className={styles.socialIconBtn} title="Pinterest">
                  <i className="fa-brands fa-pinterest-p"></i>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {userProfile.user_type === 'community' && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Community Details</h2>
          {userProfile.art_style_preferences && (
            <p><strong>Art Style Preferences:</strong> {Array.isArray(userProfile.art_style_preferences) ? userProfile.art_style_preferences.join(', ') : userProfile.art_style_preferences}</p>
          )}
          {userProfile.favorite_colors && Array.isArray(userProfile.favorite_colors) && userProfile.favorite_colors.length > 0 && (
            <div>
              <strong>Favorite Colors:</strong>
              <div className={styles.colorPalette}>
                {userProfile.favorite_colors.map((color, index) => (
                  <span 
                    key={index} 
                    className={styles.colorSwatch} 
                    style={{ backgroundColor: color }}
                    title={color}
                  ></span>
                ))}
              </div>
            </div>
          )}
          {userProfile.art_interests && Array.isArray(userProfile.art_interests) && userProfile.art_interests.length > 0 && (
            <p><strong>Art Interests:</strong> {userProfile.art_interests.join(', ')}</p>
          )}
          {userProfile.collecting_preferences && Array.isArray(userProfile.collecting_preferences) && userProfile.collecting_preferences.length > 0 && (
            <p><strong>Collecting Preferences:</strong> {userProfile.collecting_preferences.join(', ')}</p>
          )}
          {userProfile.event_preferences && Array.isArray(userProfile.event_preferences) && userProfile.event_preferences.length > 0 && (
            <p><strong>Event Preferences:</strong> {userProfile.event_preferences.join(', ')}</p>
          )}
          {userProfile.wishlist && Array.isArray(userProfile.wishlist) && userProfile.wishlist.length > 0 && (
            <p><strong>Wishlist:</strong> {userProfile.wishlist.join(', ')}</p>
          )}
          {userProfile.collection && Array.isArray(userProfile.collection) && userProfile.collection.length > 0 && (
            <p><strong>Collection:</strong> {userProfile.collection.join(', ')}</p>
          )}
          {userProfile.followings && Array.isArray(userProfile.followings) && userProfile.followings.length > 0 && (
            <p><strong>Following:</strong> {userProfile.followings.join(', ')}</p>
          )}
        </div>
      )}

      {userProfile.user_type === 'promoter' && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Promoter Details</h2>
          {userProfile.logo_path && (
            <div className={styles.logoContainer}>
              <img
                src={toAbsoluteImageUrl(userProfile.logo_path)}
                alt="Organization Logo"
                className={styles.logoImage}
              />
            </div>
          )}
          {userProfile.business_name && <p><strong>Business Name:</strong> {userProfile.business_name}</p>}
          {userProfile.legal_name && <p><strong>Legal Name:</strong> {userProfile.legal_name}</p>}
          {userProfile.tax_id && <p><strong>Tax ID:</strong> {userProfile.tax_id}</p>}
          <p><strong>Non-Profit:</strong> {userProfile.is_non_profit}</p>
          {userProfile.organization_size && (
            <p><strong>Organization Size:</strong> {userProfile.organization_size}</p>
          )}
          {userProfile.founding_date && (
            <p><strong>Founded:</strong> {new Date(userProfile.founding_date).toLocaleDateString()}</p>
          )}
          
          {/* Business Contact Information */}
          {userProfile.business_phone && (
            <p><strong>Business Phone:</strong> {userProfile.business_phone}</p>
          )}
          {userProfile.business_website && (
            <p>
              <strong>Business Website:</strong>{' '}
              <a href={userProfile.business_website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {userProfile.business_website}
              </a>
            </p>
          )}
          
          {/* Office Address */}
          {(userProfile.office_address_line1 || userProfile.office_address_line2) && (
            <div className={styles.addressSection}>
              <h3>Office Address</h3>
              <div className={styles.address}>
                {userProfile.office_address_line1 && <div>{userProfile.office_address_line1}</div>}
                {userProfile.office_address_line2 && <div>{userProfile.office_address_line2}</div>}
                {(userProfile.office_city || userProfile.office_state || userProfile.office_zip) && (
                  <div>
                    {userProfile.office_city && `${userProfile.office_city}, `}
                    {userProfile.office_state && `${userProfile.office_state} `}
                    {userProfile.office_zip}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {userProfile.sponsorship_options && (
            <p><strong>Sponsorship Options:</strong> {userProfile.sponsorship_options}</p>
          )}
          {userProfile.upcoming_events && (
            <div>
              <strong>Upcoming Events:</strong>
              {Array.isArray(userProfile.upcoming_events) && userProfile.upcoming_events.length > 0 ? (
                <ul className={styles.eventList}>
                  {userProfile.upcoming_events.map((event, index) => (
                    <li key={index}>
                      {event.name && event.date ? `${event.name} on ${event.date}` : event.name || event.date || event}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{userProfile.upcoming_events}</p>
              )}
            </div>
          )}
          
          {/* Business Social Media */}
          {(userProfile.business_social_facebook || userProfile.business_social_instagram || userProfile.business_social_tiktok || userProfile.business_social_twitter || userProfile.business_social_pinterest) && (
            <div className={styles.businessSocialSection}>
              <h3>Business Social Media</h3>
              <div className={styles.socialIcons}>
                {userProfile.business_social_facebook && (
                  <a href={userProfile.business_social_facebook} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <i className="fa-brands fa-facebook-f"></i>
                  </a>
                )}
                {userProfile.business_social_instagram && (
                  <a href={userProfile.business_social_instagram} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <i className="fa-brands fa-instagram"></i>
                  </a>
                )}
                {userProfile.business_social_tiktok && (
                  <a href={userProfile.business_social_tiktok} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <i className="fa-brands fa-tiktok"></i>
                  </a>
                )}
                {userProfile.business_social_twitter && (
                  <a href={userProfile.business_social_twitter} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <i className="fa-brands fa-x-twitter"></i>
                  </a>
                )}
                {userProfile.business_social_pinterest && (
                  <a href={userProfile.business_social_pinterest} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <i className="fa-brands fa-pinterest-p"></i>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Section - Using Carousel */}
      {!loadingProducts && products.length > 0 && (
        <div className={styles.productsSection}>
          <ArtistProductCarousel 
            vendorId={userProfile.id}
            artistName={userProfile.business_name || userProfile.display_name || 
              (userProfile.first_name && userProfile.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}` 
                : 'this artist')}
          />
          <div className={styles.seeAllLink}>
            <Link href={`/artist/${userProfile.id}/products`}>
              See All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      )}

      {/* Artist Calendar - Only show for artists */}
      {userProfile.user_type === 'artist' && !loadingEvents && artistEvents.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Event Calendar</h2>
          <div className={styles.eventsTimeline}>
            {artistEvents.map((event) => (
              <div key={event.id} className={styles.eventItem}>
                <div className={styles.eventDate}>
                  {new Date(event.start_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>
                    <a href={`/events/${event.event_id}`}>{event.event_title}</a>
                  </h3>
                  <p className={styles.eventLocation}>
                    {event.venue_city && event.venue_state && `${event.venue_city}, ${event.venue_state}`}
                  </p>
                  <span className={`${styles.eventStatus} ${styles['status-' + event.status]}`}>
                    {event.status === 'submitted' && '📝 Applied'}
                    {event.status === 'accepted' && '✅ Accepted'}
                    {event.status === 'rejected' && '❌ Not Selected'}
                    {event.status === 'waitlisted' && '⏳ Waitlisted'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Artist Modal */}
      <ContactArtistModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        artistId={userProfile.id}
        artistName={userProfile.display_name || `${userProfile.first_name} ${userProfile.last_name}`}
      />
    </div>
  );
}
