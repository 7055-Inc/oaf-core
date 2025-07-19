const axios = require('axios');

class GeocodingService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  async geocodeAddress(address, city, state, zip) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
      return { latitude: null, longitude: null };
    }

    try {
      // Build full address string
      const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
      
      const response = await axios.get(this.baseUrl, {
        params: {
          address: fullAddress,
          key: this.apiKey
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng
        };
      } else {
        console.warn('Geocoding failed:', response.data.status);
        return { latitude: null, longitude: null };
      }
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return { latitude: null, longitude: null };
    }
  }
}

module.exports = new GeocodingService(); 