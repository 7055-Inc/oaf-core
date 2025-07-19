/**
 * Event Schema.org JSON-LD Service
 * Generates comprehensive structured data for the VERY BEST SEO!
 */

class EventSchemaService {
  
  /**
   * Generate complete Event Schema.org JSON-LD
   * @param {Object} event - Event data from database
   * @param {Object} promoter - Promoter/organizer data
   * @param {Array} images - Event image URLs
   * @returns {Object} Complete Schema.org JSON-LD structure
   */
  generateEventSchema(event, promoter, images = []) {
    const baseUrl = 'https://onlineartfestival.com';
    
    // Main Event schema
    const eventSchema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": `${baseUrl}/events/${event.id}`,
      "name": event.title,
      "description": event.description,
      "startDate": event.start_date,
      "endDate": event.end_date,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "url": `${baseUrl}/events/${event.id}`,
      
      // Location/Venue
      "location": this.generatePlaceSchema(event),
      
      // Organizer
      "organizer": this.generateOrganizerSchema(promoter),
      
      // Images
      "image": images.map(img => this.generateImageSchema(img)),
      
      // Offers (pricing)
      "offers": this.generateOffersSchema(event),
      
      // Additional properties
      "category": "Art Festival",
      "genre": "Visual Arts",
      "inLanguage": "en-US",
      "isAccessibleForFree": event.admission_fee === 0,
      "maximumAttendeeCapacity": event.max_artists,
      
      // Application/Registration
      "potentialAction": {
        "@type": "RegisterAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/events/${event.id}/apply`,
          "name": "Apply to Event"
        },
        "result": {
          "@type": "Reservation",
          "name": "Artist Application"
        }
      }
    };

    // Add dates if available
    if (event.application_deadline) {
      eventSchema.validFrom = event.created_at;
      eventSchema.validThrough = event.application_deadline;
    }

    // Add SEO metadata if available
    if (event.seo_title) {
      eventSchema.alternateName = event.seo_title;
    }

    return eventSchema;
  }

  /**
   * Generate Place/Venue Schema
   */
  generatePlaceSchema(event) {
    const place = {
      "@type": "Place",
      "name": event.venue_name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.venue_address,
        "addressLocality": event.venue_city,
        "addressRegion": event.venue_state,
        "postalCode": event.venue_zip,
        "addressCountry": "US"
      }
    };

    // Add coordinates if available
    if (event.latitude && event.longitude) {
      place.geo = {
        "@type": "GeoCoordinates",
        "latitude": event.latitude,
        "longitude": event.longitude
      };
    }

    // Add accessibility info
    if (event.accessibility_info) {
      place.accessibilityFeature = event.accessibility_info;
    }

    // Add parking info
    if (event.parking_info) {
      place.amenityFeature = {
        "@type": "LocationFeatureSpecification",
        "name": "Parking",
        "value": event.parking_info
      };
    }

    return place;
  }

  /**
   * Generate Organization/Promoter Schema
   */
  generateOrganizerSchema(promoter) {
    const organizer = {
      "@type": "Organization",
      "name": promoter.business_name || `${promoter.first_name} ${promoter.last_name}`,
      "url": promoter.business_website || null
    };

    // Add contact info
    if (promoter.email) {
      organizer.email = promoter.email;
    }

    if (promoter.business_phone) {
      organizer.telephone = promoter.business_phone;
    }

    // Add social media
    const socialMedia = [];
    if (promoter.business_social_facebook) socialMedia.push(promoter.business_social_facebook);
    if (promoter.business_social_instagram) socialMedia.push(promoter.business_social_instagram);
    if (promoter.business_social_twitter) socialMedia.push(promoter.business_social_twitter);
    
    if (socialMedia.length > 0) {
      organizer.sameAs = socialMedia;
    }

    return organizer;
  }

  /**
   * Generate Image Schema
   */
  generateImageSchema(imageUrl) {
    return {
      "@type": "ImageObject",
      "url": imageUrl,
      "contentUrl": imageUrl
    };
  }

  /**
   * Generate Offers Schema (pricing)
   */
  generateOffersSchema(event) {
    const offers = [];

    // Admission offer
    if (event.admission_fee >= 0) {
      offers.push({
        "@type": "Offer",
        "name": "General Admission",
        "price": event.admission_fee,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "category": "Admission"
      });
    }

    // Artist application offer
    if (event.application_fee > 0) {
      offers.push({
        "@type": "Offer",
        "name": "Artist Application Fee",
        "price": event.application_fee,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "category": "Application"
      });
    }

    // Booth fee offer
    if (event.booth_fee > 0) {
      offers.push({
        "@type": "Offer",
        "name": "Artist Booth Fee",
        "price": event.booth_fee,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "category": "Booth"
      });
    }

    return offers;
  }

  /**
   * Generate BreadcrumbList Schema for event pages
   */
  generateBreadcrumbSchema(event) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Events",
          "item": "https://onlineartfestival.com/events"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": event.title,
          "item": `https://onlineartfestival.com/events/${event.id}`
        }
      ]
    };
  }

  /**
   * Generate complete schema package for event page
   */
  generateCompleteSchema(event, promoter, images = []) {
    return {
      event: this.generateEventSchema(event, promoter, images),
      breadcrumb: this.generateBreadcrumbSchema(event)
    };
  }
}

module.exports = new EventSchemaService(); 