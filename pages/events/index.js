import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from './styles/EventsList.module.css';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    event_type_id: '',
    venue_state: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        event_status: 'active,draft' // Show active and upcoming events
      });
      
      if (filters.event_type_id) {
        queryParams.append('event_type_id', filters.event_type_id);
      }
      
      const response = await fetch(`https://api2.onlineartfestival.com/api/events?${queryParams}`);
      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return formatDate(startDate);
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getEventStatus = (event) => {
    if (event.event_status === 'active') {
      const now = new Date();
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      
      if (now < startDate) return 'upcoming';
      if (now >= startDate && now <= endDate) return 'happening';
      return 'ended';
    }
    return event.event_status;
  };

  // Group events by status
  const upcomingEvents = events.filter(event => {
    const status = getEventStatus(event);
    return status === 'upcoming' || status === 'draft';
  });

  const happeningEvents = events.filter(event => getEventStatus(event) === 'happening');
  const endedEvents = events.filter(event => getEventStatus(event) === 'ended');

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading events...</div>
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

  return (
    <>
      <Head>
        <title>Art Events & Festivals - Online Art Festival</title>
        <meta name="description" content="Discover upcoming art events, festivals, and exhibitions. Find indoor and outdoor art festivals, gallery exhibitions, craft faires, and more art events near you." />
        <meta name="keywords" content="art events, art festivals, art exhibitions, craft fairs, art shows, gallery events, outdoor art festival, indoor art festival" />
        <link rel="canonical" href="https://onlineartfestival.com/events" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Art Events & Festivals - Online Art Festival" />
        <meta property="og:description" content="Discover upcoming art events, festivals, and exhibitions. Find art events near you." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://onlineartfestival.com/events" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Art Events & Festivals - Online Art Festival" />
        <meta name="twitter:description" content="Discover upcoming art events, festivals, and exhibitions." />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": "Art Events & Festivals",
              "description": "Discover upcoming art events, festivals, and exhibitions",
              "url": "https://onlineartfestival.com/events",
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": events.length,
                "itemListElement": events.slice(0, 10).map((event, index) => ({
                  "@type": "Event",
                  "position": index + 1,
                  "name": event.title,
                  "startDate": event.start_date,
                  "endDate": event.end_date,
                  "location": {
                    "@type": "Place",
                    "name": event.venue_name,
                    "address": {
                      "@type": "PostalAddress",
                      "addressLocality": event.venue_city,
                      "addressRegion": event.venue_state
                    }
                  },
                  "url": `https://onlineartfestival.com/events/${event.id}`
                }))
              }
            })
          }}
        />
      </Head>

      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          {/* Hero Section */}
          <div className={styles.heroSection}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Art Events & Festivals</h1>
              <p className={styles.heroDescription}>
                Discover amazing art events, festivals, and exhibitions happening around the country. 
                From outdoor art festivals to intimate gallery exhibitions, find your next creative inspiration.
              </p>
            </div>
          </div>

          {/* Events Sections */}
          <div className={styles.eventsContainer}>
            {/* Happening Now */}
            {happeningEvents.length > 0 && (
              <section className={styles.eventsSection}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-star"></i>
                  Happening Now
                </h2>
                <div className={styles.eventsGrid}>
                  {happeningEvents.map(event => (
                    <EventCard key={event.id} event={event} status="happening" />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <section className={styles.eventsSection}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-calendar-alt"></i>
                  Upcoming Events
                </h2>
                <div className={styles.eventsGrid}>
                  {upcomingEvents.map(event => (
                    <EventCard key={event.id} event={event} status="upcoming" />
                  ))}
                </div>
              </section>
            )}

            {/* Recently Ended */}
            {endedEvents.length > 0 && (
              <section className={styles.eventsSection}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-history"></i>
                  Recently Ended
                </h2>
                <div className={styles.eventsGrid}>
                  {endedEvents.slice(0, 6).map(event => (
                    <EventCard key={event.id} event={event} status="ended" />
                  ))}
                </div>
              </section>
            )}

            {/* No Events */}
            {events.length === 0 && (
              <div className={styles.noEvents}>
                <div className={styles.noEventsIcon}>🎨</div>
                <h3>No Events Found</h3>
                <p>Check back soon for upcoming art events and festivals!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EventCard({ event, status }) {
  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <Link href={`/events/${event.id}`} className={styles.eventCard}>
      <div className={styles.eventCardContent}>
        <div className={styles.eventMeta}>
          <span className={styles.eventType}>{event.event_type_name}</span>
          <span className={`${styles.eventStatus} ${styles[status]}`}>
            {status === 'happening' ? 'Live Now' : 
             status === 'upcoming' ? 'Upcoming' : 
             'Ended'}
          </span>
        </div>
        
        <h3 className={styles.eventTitle}>{event.title}</h3>
        
        <div className={styles.eventDetails}>
          <div className={styles.eventDate}>
            <i className="fas fa-calendar-alt"></i>
            <span>{formatDateRange(event.start_date, event.end_date)}</span>
          </div>
          
          <div className={styles.eventLocation}>
            <i className="fas fa-map-marker-alt"></i>
            <span>{event.venue_city}, {event.venue_state}</span>
          </div>
        </div>
        
        {event.short_description && (
          <p className={styles.eventDescription}>
            {event.short_description.length > 120 
              ? `${event.short_description.substring(0, 120)}...`
              : event.short_description
            }
          </p>
        )}
        
        <div className={styles.eventFooter}>
          {event.admission_fee > 0 ? (
            <span className={styles.admissionFee}>
              ${parseFloat(event.admission_fee).toFixed(2)}
            </span>
          ) : (
            <span className={styles.freeEvent}>Free</span>
          )}
          
          <span className={styles.viewMore}>
            View Details <i className="fas fa-arrow-right"></i>
          </span>
        </div>
      </div>
    </Link>
  );
} 