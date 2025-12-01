'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Events.module.css';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const EVENTS_PER_PAGE = 24;

  useEffect(() => {
    loadEvents(1, true); // Load first page and reset
  }, []);

  const loadEvents = async (page = 1, reset = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const offset = (page - 1) * EVENTS_PER_PAGE;
      const response = await fetch(
        getApiUrl(`api/events/upcoming?limit=${EVENTS_PER_PAGE}&offset=${offset}`)
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await response.json();
      
      if (reset) {
        setEvents(eventsData);
      } else {
        setEvents(prev => [...prev, ...eventsData]);
      }
      
      setHasMore(eventsData.length === EVENTS_PER_PAGE);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadEvents(currentPage + 1, false);
    }
  };

  const formatEventDate = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatLocation = (venueName, venueCity, venueState) => {
    if (venueCity && venueState) {
      return venueName ? `${venueName}, ${venueCity}, ${venueState}` : `${venueCity}, ${venueState}`;
    }
    if (venueName) return venueName;
    return 'Location TBD';
  };

  const getEventImage = (event) => {
    if (event.featured_image) {
      return getSmartMediaUrl(event.featured_image);
    }
    return null;
  };

  const truncateDescription = (description, maxLength = 120) => {
    if (!description) return 'Join us for this exciting event!';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  const getDaysUntilEvent = (startDate) => {
    const now = new Date();
    const eventDate = new Date(startDate);
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  };

  return (
    <div className={styles.pageContainer}>
      <main className={styles.main}>
        {/* Events Grid Section */}
        <section className={styles.eventsSection}>
          <div className={styles.container}>
            
            {error && (
              <div className={styles.errorMessage}>
                <p>Error loading events: {error}</p>
                <button 
                  onClick={() => loadEvents(1, true)}
                  className={styles.retryButton}
                >
                  Try Again
                </button>
              </div>
            )}

            {!error && (
              <>
                {/* Events Grid */}
                <div className={styles.eventsGrid}>
                  {events.map((event, index) => (
                    <Link 
                      href={`/events/${event.id}`} 
                      key={`${event.id}-${index}`}
                      className={styles.eventCard}
                    >
                      <div className={styles.eventImage}>
                        {getEventImage(event) ? (
                          <img 
                            src={getEventImage(event)} 
                            alt={event.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.imagePlaceholder}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
                              <path d="M12 7C13.1 7 14 7.9 14 9S13.1 11 12 11S10 10.1 10 9S10.9 7 12 7ZM12 17L8 13L10 11L12 13L14 11L16 13L12 17Z" fill="currentColor"/>
                            </svg>
                          </div>
                        )}
                        <div className={styles.dateOverlay}>
                          <span className={styles.daysUntil}>{getDaysUntilEvent(event.start_date)}</span>
                        </div>
                      </div>
                      
                      <div className={styles.eventInfo}>
                        <h3 className={styles.eventTitle}>{event.title}</h3>
                        
                        <p className={styles.eventDate}>
                          📅 {formatEventDate(event.start_date, event.end_date)}
                        </p>
                        
                        <p className={styles.eventLocation}>
                          📍 {formatLocation(event.venue_name, event.venue_city, event.venue_state)}
                        </p>
                        
                        {event.event_type_name && (
                          <p className={styles.eventType}>
                            {event.event_type_name}
                          </p>
                        )}
                        
                        <p className={styles.eventDescription}>
                          {truncateDescription(event.description)}
                        </p>
                        
                        <div className={styles.cardFooter}>
                          <span className={styles.viewEvent}>View Details →</span>
                          {event.allow_applications && event.application_status === 'open' && (
                            <span className={styles.applicationsBadge}>Applications Open</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Loading Skeleton */}
                {isLoading && (
                  <div className={styles.eventsGrid}>
                    {[...Array(8)].map((_, index) => (
                      <div key={`skeleton-${index}`} className={styles.skeletonCard}>
                        <div className={styles.skeletonImage}></div>
                        <div className={styles.skeletonContent}>
                          <div className={styles.skeletonText}></div>
                          <div className={styles.skeletonText}></div>
                          <div className={styles.skeletonText}></div>
                          <div className={styles.skeletonText}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Load More Button */}
                {!isLoading && hasMore && events.length > 0 && (
                  <div className={styles.loadMoreContainer}>
                    <button 
                      onClick={loadMore}
                      className={styles.loadMoreButton}
                    >
                      Load More Events
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && events.length === 0 && !error && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎪</div>
                    <h3>No Upcoming Events</h3>
                    <p>There are no upcoming events at the moment. Check back soon for new events!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}