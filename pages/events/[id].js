import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import ApplicationForm from '../../components/applications/ApplicationForm';
import ApplicationStatus from '../../components/applications/ApplicationStatus';
import styles from './styles/EventView.module.css';

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [eventImages, setEventImages] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Application-related state
  const [user, setUser] = useState(null);
  const [userApplication, setUserApplication] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationStats, setApplicationStats] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      fetch(`https://api2.onlineartfestival.com/api/events/${id}`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/events/${id}/images`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/events/${id}/categories`).then(res => res.json())
    ])
      .then(([eventData, imagesData, categoriesData]) => {
        setEvent(eventData || null);
        setEventImages(imagesData.images || []);
        setEventCategories(categoriesData.categories || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading event data:', err);
        setError('Failed to load event details');
        setLoading(false);
      });
  }, [id]);

  // Check user authentication and load application data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch current user
      fetch('https://api2.onlineartfestival.com/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch user data');
        })
        .then(userData => {
          setUser(userData);
          
          // If event is loaded and user is authenticated, check for existing application
          if (id) {
            loadUserApplication(token);
          }
        })
        .catch(err => {
          console.error('Error fetching user data:', err);
        });
    }
    
    // Load application stats for public display
    if (id) {
      loadApplicationStats();
    }
  }, [id]);

  const loadUserApplication = async (token) => {
    try {
      const response = await fetch('https://api2.onlineartfestival.com/api/applications/my-applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const eventApplication = data.applications.find(app => app.event_id == id);
        setUserApplication(eventApplication || null);
      }
    } catch (err) {
      console.error('Error loading user application:', err);
    }
  };

  const loadApplicationStats = async () => {
    try {
      const response = await fetch(`https://api2.onlineartfestival.com/api/applications/events/${id}/stats`);
      if (response.ok) {
        const stats = await response.json();
        setApplicationStats(stats);
      }
    } catch (err) {
      console.error('Error loading application stats:', err);
    }
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!event || !event.latitude || !event.longitude || mapLoaded) return;

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => console.error('Failed to load Google Maps');
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      const mapContainer = document.getElementById('event-map');
      if (!mapContainer) return;

      const map = new window.google.maps.Map(mapContainer, {
        center: { lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
      });

      // Add marker for event location
      const marker = new window.google.maps.Marker({
        position: { lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) },
        map: map,
        title: event.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#055474" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        }
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px; padding: 10px;">
            <h3 style="margin: 0 0 5px 0; color: #055474;">${event.title}</h3>
            <p style="margin: 0 0 5px 0; font-size: 14px;">${event.venue_name}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              ${event.venue_address}<br/>
              ${event.venue_city}, ${event.venue_state} ${event.venue_zip}
            </p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      setMapLoaded(true);
    };

    loadGoogleMaps();
  }, [event, mapLoaded]);

  // Helper function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('/static_media/')) {
      return imagePath;
    }
    return `https://api2.onlineartfestival.com${imagePath}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format date range
  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return formatDate(startDate);
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  };

  // Get directions URL
  const getDirectionsUrl = () => {
    if (!event.latitude || !event.longitude) return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  };

  // Send to phone functionality
  const sendToPhone = () => {
    const phoneNumber = prompt('Enter your phone number to receive directions:');
    if (phoneNumber) {
      const message = `Directions to ${event.title}: ${getDirectionsUrl()}`;
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
    }
  };

  // Application handling functions
  const handleApplicationSubmit = (newApplication) => {
    setUserApplication(newApplication);
    setShowApplicationForm(false);
    loadApplicationStats(); // Refresh stats
  };

  const handleApplicationCancel = () => {
    setShowApplicationForm(false);
  };

  const canApplyToEvent = () => {
    if (!event || !event.allow_applications) return false;
    if (event.application_status !== 'accepting') return false;
    if (!user) return false;
    if (userApplication) return false; // Already applied
    
    // Check if application deadline has passed
    if (event.application_deadline) {
      const deadline = new Date(event.application_deadline);
      const now = new Date();
      if (now > deadline) return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading event details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>Event not found</div>
      </div>
    );
  }

  // SEO meta tags
  const metaTitle = event.seo_title || `${event.title} - Online Art Festival`;
  const metaDescription = event.meta_description || event.short_description || event.description?.substring(0, 160) || `Join us for ${event.title} in ${event.venue_city}, ${event.venue_state}`;
  const canonicalUrl = `https://onlineartfestival.com/events/${id}`;
  const eventImageUrl = eventImages.length > 0 ? getImageUrl(eventImages[0].image_url) : null;

  // Generate JSON-LD structured data
  const generateEventSchema = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description || event.short_description,
      "startDate": event.start_date,
      "endDate": event.end_date,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "location": {
        "@type": "Place",
        "name": event.venue_name,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": event.venue_address,
          "addressLocality": event.venue_city,
          "addressRegion": event.venue_state,
          "postalCode": event.venue_zip,
          "addressCountry": event.venue_country || "US"
        }
      },
      "organizer": {
        "@type": "Organization",
        "name": "Online Art Festival"
      }
    };

    if (event.latitude && event.longitude) {
      schema.location.geo = {
        "@type": "GeoCoordinates",
        "latitude": event.latitude,
        "longitude": event.longitude
      };
    }

    if (event.admission_fee > 0) {
      schema.offers = {
        "@type": "Offer",
        "price": event.admission_fee,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      };
    }

    if (eventImageUrl) {
      schema.image = eventImageUrl;
    }

    // Add custom schema if provided
    if (event.event_schema) {
      try {
        const customSchema = JSON.parse(event.event_schema);
        Object.assign(schema, customSchema);
      } catch (e) {
        console.warn('Invalid event schema JSON:', e);
      }
    }

    return JSON.stringify(schema);
  };

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="event" />
        <meta property="og:url" content={canonicalUrl} />
        {eventImageUrl && <meta property="og:image" content={eventImageUrl} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {eventImageUrl && <meta name="twitter:image" content={eventImageUrl} />}
        
        {/* Event-specific meta tags */}
        <meta property="event:start_time" content={event.start_date} />
        <meta property="event:end_time" content={event.end_date} />
        <meta property="event:location" content={`${event.venue_city}, ${event.venue_state}`} />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generateEventSchema() }}
        />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          {/* Hero Section */}
          <div className={styles.heroSection}>
            {eventImages.length > 0 ? (
              <div className={styles.imageSection}>
                <div className={styles.mainImage}>
                  <img 
                    src={getImageUrl(eventImages[selectedImage].image_url)} 
                    alt={eventImages[selectedImage].alt_text || event.title}
                    className={styles.heroImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                {eventImages.length > 1 && (
                  <div className={styles.thumbnailGrid}>
                    {eventImages.map((image, index) => (
                      <button
                        key={index}
                        className={`${styles.thumbnail} ${selectedImage === index ? styles.selected : ''}`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img 
                          src={getImageUrl(image.image_url)} 
                          alt={image.alt_text || `${event.title} ${index + 1}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.noImage}>
                <div className={styles.eventIcon}>🎨</div>
              </div>
            )}
            
            <div className={styles.heroContent}>
              <div className={styles.eventMeta}>
                <span className={styles.eventType}>{event.event_type_name}</span>
                <span className={`${styles.status} ${styles[event.event_status]}`}>
                  {event.event_status}
                </span>
              </div>
              
              <h1 className={styles.title}>{event.title}</h1>
              
              <div className={styles.dateLocation}>
                <div className={styles.dates}>
                  <i className="fas fa-calendar-alt"></i>
                  <span>{formatDateRange(event.start_date, event.end_date)}</span>
                </div>
                
                <div className={styles.location}>
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{event.venue_name}, {event.venue_city}, {event.venue_state}</span>
                </div>
              </div>
              
              {event.short_description && (
                <p className={styles.shortDescription}>{event.short_description}</p>
              )}
              
              <div className={styles.heroActions}>
                {event.admission_fee > 0 && (
                  <div className={styles.admission}>
                    <span className={styles.admissionLabel}>Admission:</span>
                    <span className={styles.admissionPrice}>${parseFloat(event.admission_fee).toFixed(2)}</span>
                  </div>
                )}
                
                <div className={styles.actionButtons}>
                  <a 
                    href={getDirectionsUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.directionsBtn}
                  >
                    <i className="fas fa-directions"></i>
                    Get Directions
                  </a>
                  
                  <button onClick={sendToPhone} className={styles.sendToPhoneBtn}>
                    <i className="fas fa-mobile-alt"></i>
                    Send to Phone
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mainContent}>
            {/* Event Details */}
            <div className={styles.detailsSection}>
              <div className={styles.description}>
                <h2>About This Event</h2>
                <div className={styles.descriptionContent}>
                  {event.description ? (
                    <div dangerouslySetInnerHTML={{ __html: event.description.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>Event details coming soon...</p>
                  )}
                </div>
              </div>

              {/* Event Information Grid */}
              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <h3><i className="fas fa-calendar"></i> Event Dates</h3>
                  <div className={styles.infoContent}>
                    <p><strong>Start:</strong> {formatDate(event.start_date)}</p>
                    <p><strong>End:</strong> {formatDate(event.end_date)}</p>
                    {event.application_deadline && (
                      <p><strong>Application Deadline:</strong> {formatDate(event.application_deadline)}</p>
                    )}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3><i className="fas fa-dollar-sign"></i> Fees & Pricing</h3>
                  <div className={styles.infoContent}>
                    {event.admission_fee > 0 ? (
                      <p><strong>Admission:</strong> ${parseFloat(event.admission_fee).toFixed(2)}</p>
                    ) : (
                      <p><strong>Admission:</strong> Free</p>
                    )}
                    {event.parking_fee > 0 && (
                      <p><strong>Parking:</strong> ${parseFloat(event.parking_fee).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {(event.parking_info || event.accessibility_info) && (
                  <div className={styles.infoCard}>
                    <h3><i className="fas fa-info-circle"></i> Venue Information</h3>
                    <div className={styles.infoContent}>
                      {event.parking_info && (
                        <div>
                          <strong>Parking:</strong>
                          <p>{event.parking_info}</p>
                        </div>
                      )}
                      {event.accessibility_info && (
                        <div>
                          <strong>Accessibility:</strong>
                          <p>{event.accessibility_info}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {event.allow_applications && (
                  <div className={styles.infoCard}>
                    <h3><i className="fas fa-users"></i> Artist Applications</h3>
                    <div className={styles.infoContent}>
                      <p><strong>Status:</strong> {event.application_status === 'accepting' ? 'Currently Accepting Applications' : 
                        event.application_status === 'closed' ? 'Applications Closed' :
                        event.application_status === 'jurying' ? 'Under Review' :
                        event.application_status === 'artists_announced' ? 'Artists Announced' : 
                        'Not Accepting Applications'}</p>
                      
                      {event.application_deadline && (
                        <p><strong>Deadline:</strong> {formatDate(event.application_deadline)}</p>
                      )}
                      
                      {(event.application_fee > 0 || event.jury_fee > 0) && (
                        <div>
                          {event.application_fee > 0 && (
                            <p><strong>Application Fee:</strong> ${parseFloat(event.application_fee).toFixed(2)}</p>
                          )}
                          {event.jury_fee > 0 && (
                            <p><strong>Jury Fee:</strong> ${parseFloat(event.jury_fee).toFixed(2)}</p>
                          )}
                        </div>
                      )}
                      
                      {applicationStats && (
                        <div className={styles.applicationStats}>
                          <p><strong>Applications:</strong> {applicationStats.total_applications} submitted</p>
                          {applicationStats.accepted_applications > 0 && (
                            <p><strong>Accepted:</strong> {applicationStats.accepted_applications}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Categories */}
              {eventCategories.length > 0 && (
                <div className={styles.categoriesSection}>
                  <h3>Event Categories</h3>
                  <div className={styles.categories}>
                    {eventCategories.map(category => (
                      <span key={category.id} className={styles.categoryTag}>
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Artist Application Section */}
            {event.allow_applications && (
              <div className={styles.applicationSection}>
                <h2><i className="fas fa-palette"></i> Artist Application</h2>
                
                {!user ? (
                  <div className={styles.applicationPrompt}>
                    <p>Please <a href="/login">log in</a> to apply for this event.</p>
                  </div>
                ) : userApplication ? (
                  <div className={styles.applicationStatus}>
                    <h3>Your Application Status</h3>
                    <ApplicationStatus application={userApplication} />
                  </div>
                ) : canApplyToEvent() ? (
                  <div className={styles.applicationActions}>
                    {!showApplicationForm ? (
                      <div className={styles.applyPrompt}>
                        <p>Ready to showcase your art at this event?</p>
                        <button 
                          onClick={() => setShowApplicationForm(true)}
                          className={styles.applyButton}
                        >
                          <i className="fas fa-palette"></i>
                          Apply Now
                        </button>
                      </div>
                    ) : (
                      <div className={styles.applicationForm}>
                        <h3>Apply for {event.title}</h3>
                        <ApplicationForm 
                          event={event}
                          user={user}
                          onSubmit={handleApplicationSubmit}
                          onCancel={handleApplicationCancel}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.applicationClosed}>
                    <p>
                      {event.application_status === 'not_accepting' && 'Applications are not currently being accepted for this event.'}
                      {event.application_status === 'closed' && 'The application deadline has passed.'}
                      {event.application_status === 'jurying' && 'Applications are currently under review.'}
                      {event.application_status === 'artists_announced' && 'Artists have been selected for this event.'}
                      {event.application_status === 'event_completed' && 'This event has been completed.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Location & Map */}
            <div className={styles.locationSection}>
              <h2><i className="fas fa-map-marker-alt"></i> Location & Directions</h2>
              
              <div className={styles.locationDetails}>
                <div className={styles.address}>
                  <h3>{event.venue_name}</h3>
                  <p>
                    {event.venue_address}<br/>
                    {event.venue_city}, {event.venue_state} {event.venue_zip}
                  </p>
                </div>
                
                <div className={styles.locationActions}>
                  <a 
                    href={getDirectionsUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.directionsLink}
                  >
                    <i className="fas fa-directions"></i>
                    Get Directions
                  </a>
                  
                  <button onClick={sendToPhone} className={styles.sendToPhoneLink}>
                    <i className="fas fa-mobile-alt"></i>
                    Send to Phone
                  </button>
                </div>
              </div>

              {/* Google Map */}
              {event.latitude && event.longitude && (
                <div className={styles.mapContainer}>
                  <div id="event-map" className={styles.map}></div>
                  {!mapLoaded && (
                    <div className={styles.mapLoading}>
                      <i className="fas fa-spinner fa-spin"></i>
                      Loading map...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 