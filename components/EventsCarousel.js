import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './EventsCarousel.module.css';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';

export default function EventsCarousel() {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    try {
      const response = await fetch(getApiUrl('api/events/upcoming?limit=10'));
      if (response.ok) {
        const eventsData = await response.json();
        setEvents(eventsData);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setEventsLoading(false);
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

  const getCardsToShow = () => {
    if (typeof window === 'undefined') return 4;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 768) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  };

  const scrollToNextEvents = () => {
    const cardsToShow = getCardsToShow();
    const maxIndex = Math.max(0, events.length - cardsToShow);
    setCurrentEventIndex(prev => Math.min(prev + 2, maxIndex));
  };

  const scrollToPrevEvents = () => {
    setCurrentEventIndex(prev => Math.max(prev - 2, 0));
  };

  const canScrollPrev = currentEventIndex > 0;
  const canScrollNext = currentEventIndex < events.length - getCardsToShow();

  if (eventsLoading) {
    return (
      <section className={styles.eventsSection}>
        <div className={styles.carouselContainer}>
          <div className={styles.eventsGrid}>
            {[...Array(4)].map((_, index) => (
              <div key={index} className={styles.skeletonCard}>
                <div className={styles.skeletonImage}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className={styles.eventsSection}>
        <div className={styles.emptyState}>
          <p>Check back soon for upcoming events!</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.eventsSection}>
        <div className={styles.carouselContainer}>
          {/* Previous Arrow */}
          <button 
            className={`${styles.arrowButton} ${styles.prevArrow}`}
            onClick={scrollToPrevEvents}
            disabled={!canScrollPrev}
            aria-label="Previous events"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Events Grid */}
          <div className={styles.eventsGrid}>
            {events.slice(currentEventIndex, currentEventIndex + getCardsToShow()).map((event) => (
              <Link href={`/events/${event.id}`} key={event.id} className={styles.eventCard}>
                <div className={styles.eventImage}>
                  {event.featured_image ? (
                    <img 
                      src={getSmartMediaUrl(event.featured_image)} 
                      alt={event.title}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.eventContent}>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <p className={styles.eventDate}>{formatEventDate(event.start_date, event.end_date)}</p>
                  <p className={styles.eventDescription}>
                    {event.short_description || event.description?.substring(0, 120) + '...'}
                  </p>
                  <p className={styles.promoterName}>
                    Organized by {event.promoter_name || 'Online Art Festival'}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Next Arrow */}
          <button 
            className={`${styles.arrowButton} ${styles.nextArrow}`}
            onClick={scrollToNextEvents}
            disabled={!canScrollNext}
            aria-label="Next events"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Floating Browse Events Button */}
      <div className={styles.buttonContainer}>
        <Link href="/events" className={styles.browseEventsButton}>
          Browse All Events
        </Link>
      </div>
    </>
  );
} 