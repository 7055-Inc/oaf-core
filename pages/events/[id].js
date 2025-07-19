import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import Link from 'next/link';
import ApplicationForm from '../../components/applications/ApplicationForm';
import styles from './styles/EventView.module.css';
import TicketPurchaseModal from '../../components/TicketPurchaseModal';

// Helper function: Calculate event duration
const calculateEventDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `P${diffDays}D`; // ISO 8601 duration format
};

// Helper function: Generate comprehensive venue schema
const generateVenueSchema = (event) => {
  const venue = {
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
  };

  // Add geo coordinates if available
  if (event.latitude && event.longitude) {
    venue.geo = {
      "@type": "GeoCoordinates",
      "latitude": parseFloat(event.latitude),
      "longitude": parseFloat(event.longitude)
    };
  }

  // Add venue capacity
  if (event.venue_capacity) {
    venue.maximumAttendeeCapacity = parseInt(event.venue_capacity);
  }

  // Add parking information
  if (event.parking_info || event.parking_fee > 0) {
    venue.amenityFeature = [{
      "@type": "LocationFeatureSpecification",
      "name": "Parking",
      "value": event.parking_fee > 0 ? `$${event.parking_fee}` : "Available"
    }];
  }

  // Add accessibility information
  if (event.accessibility_info) {
    venue.isAccessibleForFree = true;
    venue.accessibilityFeature = event.accessibility_info;
  }

  return venue;
};

// Helper function: Generate rich offers including tickets
const generateRichOffers = (event, ticketData, id) => {
  const offers = [];

  // General admission
  if (event.admission_fee > 0) {
    offers.push({
      "@type": "Offer",
      "name": "General Admission",
      "price": parseFloat(event.admission_fee),
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "validFrom": new Date().toISOString(),
      "validThrough": event.start_date,
      "category": "Admission"
    });
  }

  // Individual ticket offers from Phase 4 data
  ticketData.forEach(ticket => {
    const availability = ticket.quantity_available && ticket.quantity_sold >= ticket.quantity_available 
      ? "https://schema.org/SoldOut" 
      : "https://schema.org/InStock";

    offers.push({
      "@type": "Offer",
      "name": ticket.ticket_type,
      "description": ticket.description || `${ticket.ticket_type} ticket for ${event.title}`,
      "price": parseFloat(ticket.price),
      "priceCurrency": "USD",
      "availability": availability,
      "validFrom": new Date().toISOString(),
      "validThrough": event.start_date,
      "inventoryLevel": ticket.quantity_available ? 
        Math.max(0, ticket.quantity_available - ticket.quantity_sold) : null,
      "category": "Event Ticket",
      "url": `https://onlineartfestival.com/events/${id}#tickets`
    });
  });

  // RSVP offer
  if (event.has_rsvp) {
    offers.push({
      "@type": "Offer",
      "name": "RSVP Registration", 
      "price": 0,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": event.rsvp_url || `https://onlineartfestival.com/events/${id}`,
      "category": "Registration"
    });
  }

  // Free admission offer
  if (offers.length === 0 || event.admission_fee <= 0) {
    offers.push({
      "@type": "Offer",
      "name": "Free Admission",
      "price": 0,
      "priceCurrency": "USD", 
      "availability": "https://schema.org/InStock",
      "category": "Free Event"
    });
  }

  return offers;
};

// Helper function: Generate performer schema from exhibiting artists
const generatePerformerSchema = (artists, event) => {
  return artists.map(artist => ({
    "@type": "Person",
    "name": `${artist.first_name} ${artist.last_name}`,
    "jobTitle": "Artist",
    "description": artist.artist_statement || `Professional artist exhibiting at ${event.title}`,
    "url": `https://onlineartfestival.com/artists/${artist.user_id}`,
    "sameAs": artist.portfolio_url || null,
    "knowsAbout": artist.art_medium || "Visual Arts",
    "memberOf": {
      "@type": "Organization",
      "name": "Online Art Festival Artists"
    }
  })).filter(performer => performer.sameAs || performer.description);
};

// Helper function: Generate audience schema
const generateAudienceSchema = (event) => {
  const audience = {
    "@type": "Audience",
    "name": "Art Enthusiasts and General Public"
  };

  if (event.age_restrictions !== 'all_ages') {
    if (event.age_restrictions === 'custom' && event.age_minimum) {
      audience.suggestedMinAge = parseInt(event.age_minimum);
      audience.requiredMinAge = parseInt(event.age_minimum);
    } else if (event.age_restrictions.includes('21+')) {
      audience.requiredMinAge = 21;
    } else if (event.age_restrictions.includes('18+')) {
      audience.requiredMinAge = 18;
    }
  }

  return audience;
};

// Helper function: Generate accessibility features
const generateAccessibilityFeatures = (event) => {
  const features = [];
  
  if (event.accessibility_info) {
    features.push("wheelchair accessible");
  }
  
  if (event.venue_capacity) {
    features.push("capacity limited");
  }
  
  if (event.parking_info) {
    features.push("parking available");
  }

  return features.length > 0 ? features : ["public event", "outdoor accessible"];
};

// Helper function: Generate event topics
const generateEventTopics = (categories) => {
  return categories.map(category => ({
    "@type": "Thing",
    "name": category.name,
    "description": `Art festival category: ${category.name}`
  }));
};

// Helper function: Generate image schema
const generateImageSchema = (images, event, getImageUrl) => {
  if (!images || images.length === 0) return null;

  return images.map(img => ({
    "@type": "ImageObject",
    "url": getImageUrl(img.image_url),
    "caption": img.caption || event.title,
    "description": `Image from ${event.title} art festival`
  }));
};

// Helper function: Calculate remaining capacity
const calculateRemainingCapacity = (event) => {
  if (!event.venue_capacity) return null;
  // This would need to be calculated based on actual ticket sales
  // For now, return a placeholder
  return Math.max(0, event.venue_capacity - (event.estimated_attendance || 0));
};

// Helper function: Generate event rating (placeholder)
const generateEventRating = (event) => {
  // Future: calculate based on reviews/feedback
  return {
    "@type": "AggregateRating",
    "ratingValue": 4.5,
    "reviewCount": 1,
    "bestRating": 5,
    "worstRating": 1
  };
};

// Helper function: Generate social media links
const generateSocialLinks = (event, id) => {
  const links = [
    `https://onlineartfestival.com/events/${id}`,
    "https://facebook.com/onlineartfestival", // Update with actual social links
    "https://instagram.com/onlineartfestival"
  ];
  
  return links;
};

// Helper function: Generate sub-events for multi-day festivals
const generateSubEvents = (event) => {
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const subEvents = [];

  // Create sub-events for each day
  let currentDate = new Date(start);
  let dayNumber = 1;

  while (currentDate <= end) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    subEvents.push({
      "@type": "Event",
      "name": `${event.title} - Day ${dayNumber}`,
      "startDate": currentDate.toISOString().split('T')[0],
      "endDate": currentDate.toISOString().split('T')[0],
      "location": {
        "@type": "Place", 
        "name": event.venue_name,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": event.venue_city,
          "addressRegion": event.venue_state
        }
      }
    });

    currentDate = nextDay;
    dayNumber++;
  }

  return subEvents;
};

// Helper function: Clean schema by removing null/empty values
const cleanSchema = (obj) => {
  if (Array.isArray(obj)) {
    return obj.filter(item => item != null).map(cleanSchema);
  } else if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value != null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
        cleaned[key] = cleanSchema(value);
      }
    }
    return cleaned;
  }
  return obj;
};

// Main function: Generate comprehensive JSON-LD structured data for maximum SEO authority
const generateAdvancedEventSchema = async (event, id, exhibitingArtists, eventCategories, eventImages, getImageUrl) => {
  // Fetch ticket data for rich offers
  let ticketData = [];
  if (event.has_tickets) {
    try {
      const ticketResponse = await fetch(`https://api2.onlineartfestival.com/api/events/${id}/tickets`);
      if (ticketResponse.ok) {
        const tickets = await ticketResponse.json();
        ticketData = tickets.tickets || [];
      }
    } catch (error) {
      console.warn('Could not fetch ticket data for schema');
    }
  }

  // Base event schema with comprehensive data
  const schema = {
    "@context": "https://schema.org",
    "@type": "Festival", // More specific than Event for art festivals
    "@id": `https://onlineartfestival.com/events/${id}`,
    "name": event.title,
    "alternateName": event.seo_title || event.title,
    "description": event.description || event.short_description,
    "disambiguatingDescription": event.meta_description || event.short_description,
    "keywords": event.event_keywords || "art festival, art exhibition, artists, creative event",
    
    // Dates and timing
    "startDate": event.start_date,
    "endDate": event.end_date,
    "duration": calculateEventDuration(event.start_date, event.end_date),
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    
    // Location with rich venue data
    "location": generateVenueSchema(event),
    
    // Organizer and contact
    "organizer": {
      "@type": "Organization",
      "name": "Online Art Festival",
      "url": "https://onlineartfestival.com",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Event Information",
        "url": `https://onlineartfestival.com/events/${id}`
      }
    },
    
    // Rich offers including tickets, admission, parking
    "offers": generateRichOffers(event, ticketData, id),
    
    // Performers (exhibiting artists)
    "performer": generatePerformerSchema(exhibitingArtists, event),
    
    // Audience and accessibility
    "audience": generateAudienceSchema(event),
    "accessibilityFeature": generateAccessibilityFeatures(event),
    
    // Event categories and classification
    "about": generateEventTopics(eventCategories),
    "genre": eventCategories.map(cat => cat.name),
    
    // Media and images
    "image": generateImageSchema(eventImages, event, getImageUrl),
    
    // Additional event details
    "maximumAttendeeCapacity": event.venue_capacity || null,
    "remainingAttendeeCapacity": calculateRemainingCapacity(event),
    
    // Review and rating (placeholder for future)
    "aggregateRating": generateEventRating(event),
    
    // Related events and series
    "isPartOf": {
      "@type": "EventSeries",
      "name": "Online Art Festival Events",
      "url": "https://onlineartfestival.com/events"
    },
    
    // Social media and sharing
    "sameAs": generateSocialLinks(event, id),
    
    // Additional properties
    "inLanguage": "en-US",
    "isAccessibleForFree": event.admission_fee <= 0,
    "publicAccess": true,
    
    // Custom properties for art festivals
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Event Type",
        "value": event.event_type_name
      },
      {
        "@type": "PropertyValue", 
        "name": "Application Deadline",
        "value": event.application_deadline || "N/A"
      },
      {
        "@type": "PropertyValue",
        "name": "Artist Applications",
        "value": event.allow_applications ? "Open" : "Closed"
      }
    ].filter(prop => prop.value !== "N/A")
  };

  // Add subEvents for multi-day festivals
  if (event.start_date !== event.end_date) {
    schema.subEvent = generateSubEvents(event);
  }

  // Remove null values and empty arrays
  return cleanSchema(schema);
};

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
  
  // Artists state
  const [exhibitingArtists, setExhibitingArtists] = useState([]);
  const [artistsLoading, setArtistsLoading] = useState(true);

  // Ticket modal state
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Advanced schema state
  const [advancedSchema, setAdvancedSchema] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      fetch(`https://api2.onlineartfestival.com/api/events/${id}`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/events/${id}/images`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/events/${id}/categories`).then(res => res.json()),
      fetch(`https://api2.onlineartfestival.com/api/events/${id}/artists`).then(res => res.json().catch(() => ({ artists: [] }))), // Handle artists fetch with fallback
      checkUserApplication(id)
    ])
      .then(async ([eventData, imagesData, categoriesData, artistsData, applicationData]) => {
        setEvent(eventData || null);
        setEventImages(imagesData.images || []);
        setEventCategories(categoriesData.categories || []);
        setExhibitingArtists(artistsData.artists || []);
        setUserApplication(applicationData);
        setLoading(false);
        setArtistsLoading(false);
        
        // Generate advanced schema after all data is loaded
        if (eventData) {
          try {
            const schema = await generateAdvancedEventSchema(
              eventData, 
              id, 
              artistsData.artists || [], 
              categoriesData.categories || [], 
              imagesData.images || [], 
              (imagePath) => {
                if (!imagePath) return null;
                if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                  return imagePath;
                }
                if (imagePath.startsWith('/static_media/')) {
                  return imagePath;
                }
                return `https://api2.onlineartfestival.com${imagePath}`;
              }
            );
            setAdvancedSchema(schema);
          } catch (error) {
            console.warn('Error generating advanced schema:', error);
          }
        }
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

  return (
    <>
      <Head>
        <title>{event ? `${event.title} - Online Art Festival` : 'Loading Event...'}</title>
        <meta name="description" content={event?.meta_description || event?.description || 'Art festival event details'} />
        <meta name="keywords" content={event?.event_keywords || 'art, festival, event'} />
        <meta property="og:title" content={event?.seo_title || event?.title} />
        <meta property="og:description" content={event?.meta_description || event?.description} />
        {eventImageUrl && <meta property="og:image" content={eventImageUrl} />}
        
        {/* Advanced JSON-LD Schema for Maximum SEO Authority */}
        {advancedSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(advancedSchema, null, 2) }}
          />
        )}
      </Head>

      {/* Load Stripe for ticket purchases */}
      {event?.has_tickets && (
        <Script 
          src="https://js.stripe.com/v3/" 
          strategy="afterInteractive"
        />
      )}

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
              </div>
              
              <h1>{event.title}</h1>
              
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
                  {event.has_tickets && (
                    <button 
                      onClick={() => setShowTicketModal(true)}
                      className={styles.buyTicketsBtn}
                    >
                      <i className="fas fa-ticket-alt"></i>
                      Buy Tickets
                    </button>
                  )}
                  
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

          {/* Full Event Details */}
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

                {/* Venue Capacity & Event Details */}
                {(event.venue_capacity || event.age_restrictions !== 'all_ages' || event.dress_code) && (
                  <div className={styles.infoCard}>
                    <h3><i className="fas fa-users"></i> Event Details</h3>
                    <div className={styles.infoContent}>
                      {event.venue_capacity && (
                        <p><strong>Expected Capacity:</strong> {event.venue_capacity} attendees</p>
                      )}
                      {event.age_restrictions !== 'all_ages' && (
                        <p><strong>Age Requirements:</strong> 
                          {event.age_restrictions === 'custom' 
                            ? `${event.age_minimum}+ years old`
                            : event.age_restrictions
                          }
                        </p>
                      )}
                      {event.dress_code && (
                        <div>
                          <strong>Dress Code:</strong>
                          <p>{event.dress_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* RSVP & Tickets */}
                {(event.has_rsvp || event.has_tickets) && (
                  <div className={styles.infoCard}>
                    <h3><i className="fas fa-ticket-alt"></i> Registration & Tickets</h3>
                    <div className={styles.infoContent}>
                      {event.has_rsvp && (
                        <div>
                          <p><strong>RSVP Required</strong></p>
                          {event.rsvp_url && (
                            <a href={event.rsvp_url} target="_blank" rel="noopener noreferrer" className={styles.rsvpLink}>
                              RSVP Now <i className="fas fa-external-link-alt"></i>
                            </a>
                          )}
                        </div>
                      )}
                      {event.has_tickets && (
                        <div>
                          <p><strong>Tickets Required</strong></p>
                          <p>Tickets are available for purchase</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Exhibiting Artists Section */}
              {exhibitingArtists.length > 0 && (
                <div className={styles.exhibitingArtistsSection}>
                  <h2><i className="fas fa-palette"></i> Exhibiting Artists</h2>
                  <div className={styles.artistsGrid}>
                    {exhibitingArtists.map((artist) => (
                      <div key={artist.artist_id} className={styles.artistCard}>
                        <div className={styles.artistImage}>
                          {artist.profile_image ? (
                            <img 
                              src={`https://api2.onlineartfestival.com${artist.profile_image}`}
                              alt={artist.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={styles.defaultArtistAvatar}
                            style={{ display: artist.profile_image ? 'none' : 'flex' }}
                          >
                            <i className="fas fa-user"></i>
                          </div>
                        </div>
                        
                        <div className={styles.artistInfo}>
                          <div className={styles.artistHeader}>
                            <h4 className={styles.artistName}>{artist.display_name}</h4>
                            <span className={`${styles.artistStatus} ${styles[artist.application_status]}`}>
                              {artist.status_label}
                            </span>
                          </div>
                          
                          {artist.location && (
                            <p className={styles.artistLocation}>
                              <i className="fas fa-map-marker-alt"></i>
                              {artist.location}
                            </p>
                          )}
                          
                          {artist.bio && (
                            <p className={styles.artistBio}>
                              {artist.bio.length > 100 ? `${artist.bio.substring(0, 100)}...` : artist.bio}
                            </p>
                          )}
                          
                          <div className={styles.artistActions}>
                            <a 
                              href={`/profile/${artist.artist_id}`}
                              className={styles.viewProfileBtn}
                            >
                              View Profile
                            </a>
                            {artist.portfolio_url && (
                              <a 
                                href={artist.portfolio_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.portfolioBtn}
                              >
                                Portfolio <i className="fas fa-external-link-alt"></i>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

          {/* HR Separator for Tickets */}
          {event.has_tickets && (
            <div className={styles.sectionSeparator}>
              <hr className={styles.separator} />
            </div>
          )}

          {/* Ticket Purchase Section */}
          {event.has_tickets && (
            <div className={styles.ticketSectionFullWidth}>
              <div className={styles.ticketContainer}>
                <h2><i className="fas fa-ticket-alt"></i> Event Tickets</h2>
                
                <div className={styles.ticketPrompt}>
                  <p>Get your tickets now for {event.title}!</p>
                  <button 
                    onClick={() => setShowTicketModal(true)}
                    className={styles.buyTicketsButton}
                  >
                    <i className="fas fa-ticket-alt"></i>
                    Buy Tickets
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HR Separator */}
          {event.allow_applications && (
            <div className={styles.sectionSeparator}>
              <hr className={styles.separator} />
            </div>
          )}

          {/* Full Width Artist Application Section */}
          {event.allow_applications && (
            <div className={styles.applicationSectionFullWidth}>
              <div className={styles.applicationContainer}>
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
            </div>
          )}
        </div>
        
        {/* Ticket Purchase Modal */}
        <TicketPurchaseModal 
          event={event}
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
        />
      </div>
    </>
  );
} 