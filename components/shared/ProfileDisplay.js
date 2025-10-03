'use client';
import styles from '../../pages/profile/Profile.module.css';
import { getSmartMediaUrl } from '../../lib/config';

export default function ProfileDisplay({ 
  userProfile, 
  showEditButton = false, 
  currentUserId = null 
}) {
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
        {userProfile.bio && (
          <div className={styles.bioQuote}>
            <p>{userProfile.bio}</p>
          </div>
        )}
      </div>

      {/* Personal Information Section */}
      <div className={styles.section}>
        <h2 className={styles.subtitle}>Personal Information</h2>
        <div className={styles.infoGrid}>
          {userProfile.phone && (
            <div className={styles.infoItem}>
              <strong>Phone:</strong> {userProfile.phone}
            </div>
          )}
          {userProfile.birth_date && (
            <div className={styles.infoItem}>
              <strong>Birth Date:</strong> {new Date(userProfile.birth_date).toLocaleDateString()}
            </div>
          )}
          {userProfile.gender && (
            <div className={styles.infoItem}>
              <strong>Gender:</strong> {userProfile.gender}
            </div>
          )}
          {userProfile.nationality && (
            <div className={styles.infoItem}>
              <strong>Nationality:</strong> {userProfile.nationality}
            </div>
          )}
          {userProfile.languages_known && userProfile.languages_known.length > 0 && (
            <div className={styles.infoItem}>
              <strong>Languages:</strong> {Array.isArray(userProfile.languages_known) ? userProfile.languages_known.join(', ') : userProfile.languages_known}
            </div>
          )}
          {userProfile.education && (
            <div className={styles.infoItem}>
              <strong>Education:</strong> {userProfile.education}
            </div>
          )}
          {userProfile.timezone && (
            <div className={styles.infoItem}>
              <strong>Timezone:</strong> {userProfile.timezone}
            </div>
          )}
        </div>
        
        {/* Address Information */}
        {(userProfile.address_line1 || userProfile.address_line2) && (
          <div className={styles.addressSection}>
            <h3>Address</h3>
            <div className={styles.address}>
              {userProfile.address_line1 && <div>{userProfile.address_line1}</div>}
              {userProfile.address_line2 && <div>{userProfile.address_line2}</div>}
              {(userProfile.city || userProfile.state || userProfile.postal_code) && (
                <div>
                  {userProfile.city && `${userProfile.city}, `}
                  {userProfile.state && `${userProfile.state} `}
                  {userProfile.postal_code}
                </div>
              )}
              {userProfile.country && <div>{userProfile.country}</div>}
            </div>
          </div>
        )}

        {/* Awards and Memberships */}
        {userProfile.awards && (
          <div className={styles.infoItem}>
            <strong>Awards:</strong> {userProfile.awards}
          </div>
        )}
        {userProfile.memberships && (
          <div className={styles.infoItem}>
            <strong>Memberships:</strong> {userProfile.memberships}
          </div>
        )}
      </div>

      {userProfile.user_type === 'artist' && (
        <div className={styles.section}>
          <h2 className={styles.subtitle}>Artist Details</h2>
          {userProfile.logo_path && (
            <div className={styles.logoContainer}>
              <img
                src={toAbsoluteImageUrl(userProfile.logo_path)}
                alt="Business Logo"
                className={styles.logoImage}
              />
            </div>
          )}
          {userProfile.business_name && <p><strong>Business Name:</strong> {userProfile.business_name}</p>}
          {userProfile.artist_biography && <p><strong>Artist Biography:</strong> {userProfile.artist_biography}</p>}
          
          {/* Art Categories and Mediums */}
          {userProfile.art_categories && Array.isArray(userProfile.art_categories) && userProfile.art_categories.length > 0 && (
            <p><strong>Art Categories:</strong> {userProfile.art_categories.join(', ')}</p>
          )}
          {userProfile.art_mediums && Array.isArray(userProfile.art_mediums) && userProfile.art_mediums.length > 0 && (
            <p><strong>Art Mediums:</strong> {userProfile.art_mediums.join(', ')}</p>
          )}
          
          {/* Custom Work */}
          <p><strong>Accepts Custom Orders:</strong> {userProfile.does_custom}</p>
          {userProfile.does_custom === 'yes' && userProfile.custom_details && (
            <p><strong>Custom Order Details:</strong> {userProfile.custom_details}</p>
          )}
          
          {/* Business Contact */}
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
          {userProfile.customer_service_email && (
            <p><strong>Customer Service Email:</strong> {userProfile.customer_service_email}</p>
          )}
          {userProfile.legal_name && (
            <p><strong>Legal Business Name:</strong> {userProfile.legal_name}</p>
          )}
          {userProfile.tax_id && (
            <p><strong>Tax ID:</strong> {userProfile.tax_id}</p>
          )}
          {userProfile.founding_date && (
            <p><strong>Founded:</strong> {new Date(userProfile.founding_date).toLocaleDateString()}</p>
          )}
          
          {/* Studio Address */}
          {(userProfile.studio_address_line1 || userProfile.studio_address_line2) && (
            <div className={styles.addressSection}>
              <h3>Studio Address</h3>
              <div className={styles.address}>
                {userProfile.studio_address_line1 && <div>{userProfile.studio_address_line1}</div>}
                {userProfile.studio_address_line2 && <div>{userProfile.studio_address_line2}</div>}
                {(userProfile.studio_city || userProfile.studio_state || userProfile.studio_zip) && (
                  <div>
                    {userProfile.studio_city && `${userProfile.studio_city}, `}
                    {userProfile.studio_state && `${userProfile.studio_state} `}
                    {userProfile.studio_zip}
                  </div>
                )}
              </div>
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
    </div>
  );
}
