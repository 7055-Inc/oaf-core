# Media Proxy API

## Authentication
Media proxy endpoints are publicly accessible and do not require API key authentication.

**Headers:**
- `Accept: image/avif,image/webp,image/*,*/*;q=0.8` (optional, for format negotiation)
- `If-None-Match: {etag}` (optional, for conditional requests)
- `If-Modified-Since: {date}` (optional, for conditional requests)

## Media Serving Endpoints

### Direct File Serving
`GET /api/media/serve/{filePath}`

Serves media files directly from the media backend with streaming and caching support.

**Parameters:**
- `filePath`: Complete file path (path parameter, supports nested paths)

**Example URLs:**
```
GET /api/media/serve/user_123/product/img/123_processed.jpg
GET /api/media/serve/events/456/banner/hero_image.png
GET /api/media/serve/profiles/789/avatar/profile_pic.webp
```

**Response Headers:**
- `Content-Type`: Media MIME type
- `Content-Length`: File size in bytes
- `Cache-Control`: public, max-age=3600, immutable
- `ETag`: Entity tag for caching
- `Last-Modified`: Last modification date
- `X-Content-Type-Options`: nosniff

**Response (200 OK):**
```
Binary media content with appropriate headers
```

**Conditional Requests:**
The endpoint supports conditional requests for efficient caching:
- Send `If-None-Match` header with ETag value
- Send `If-Modified-Since` header with date
- Receive `304 Not Modified` if content hasn't changed

### File Metadata Check
`HEAD /api/media/serve/{filePath}`

Get media file metadata without downloading the content.

**Parameters:**
- `filePath`: Complete file path (path parameter)

**Response (200 OK):**
```
No body content, only headers:
Content-Type: image/jpeg
Content-Length: 245760
ETag: "abc123def456"
Last-Modified: Wed, 15 Jan 2025 10:30:00 GMT
Cache-Control: public, max-age=3600, immutable
```

### Smart Image Serving
`GET /api/media/images/{mediaId}`

Serves optimized images with automatic format negotiation and size variants.

**Parameters:**
- `mediaId`: Numeric media identifier (path parameter)
- `size`: Size variant (query parameter, optional, default: "detail")

**Size Variants:**
- `thumbnail`: Small thumbnail images (typically 150x150)
- `small`: Small size images (typically 300x300)
- `grid`: Grid display size (typically 400x400)
- `detail`: Detail view size (typically 800x600) - **default**
- `header`: Header image size (typically 1200x400)
- `zoom`: High-resolution zoom images (typically 1920x1080)

**Format Negotiation:**
The endpoint automatically selects the best image format based on the `Accept` header:
- **AVIF**: Next-generation format for modern browsers
- **WebP**: High-efficiency format for broader support
- **JPEG**: Universal compatibility fallback

**Example URLs:**
```
GET /api/media/images/456
GET /api/media/images/456?size=thumbnail
GET /api/media/images/789?size=header
```

**Request Headers (Optional):**
```
Accept: image/avif,image/webp,image/*,*/*;q=0.8
User-Agent: Mozilla/5.0 (compatible browser)
If-None-Match: "optimized-abc123"
```

**Response Headers:**
- `Content-Type`: Optimized image MIME type (image/avif, image/webp, or image/jpeg)
- `Content-Length`: Optimized file size
- `Cache-Control`: public, max-age=31536000, immutable (1 year)
- `ETag`: Entity tag for optimized content
- `Last-Modified`: Optimization timestamp
- `Vary`: Accept (for proper CDN caching)
- `X-Content-Type-Options`: nosniff

**Response (200 OK):**
```
Optimized binary image content
```

## Error Responses

### Client Errors (4xx)

**400 Bad Request:**
```json
{
  "error": "File path is required"
}
```

```json
{
  "error": "Valid media ID is required"
}
```

```json
{
  "error": "Invalid size parameter",
  "validSizes": ["thumbnail", "small", "grid", "detail", "header", "zoom"]
}
```

**404 Not Found:**
```json
{
  "error": "Media not found"
}
```

### Server Errors (5xx)

**500 Internal Server Error:**
```json
{
  "error": "Media streaming failed"
}
```

```json
{
  "error": "Media backend authentication failed",
  "message": "Internal authentication error with media server."
}
```

**503 Service Unavailable:**
```json
{
  "error": "Media backend unavailable",
  "message": "The media processing server is currently unavailable. Please try again later."
}
```

**504 Gateway Timeout:**
```json
{
  "error": "Media backend timeout",
  "message": "The media server took too long to respond. Please try again."
}
```

## Caching and Performance

### Cache Headers
- **Direct Files**: 1 hour cache (`max-age=3600`)
- **Optimized Images**: 1 year cache (`max-age=31536000`)
- **Immutable Flag**: Content marked as immutable for CDN optimization

### Conditional Requests
Support for efficient caching with:
- **ETag Validation**: Use `If-None-Match` header
- **Date Validation**: Use `If-Modified-Since` header
- **304 Responses**: Automatic `304 Not Modified` responses

### Format Negotiation
Automatic format selection based on browser capabilities:
```
Accept: image/avif,image/webp,image/*,*/*;q=0.8
```

## Usage Examples

### Basic Image Display
```html
<!-- Direct file serving -->
<img src="/api/media/serve/products/123/main_image.jpg" alt="Product Image">

<!-- Smart serving with size variant -->
<img src="/api/media/images/456?size=thumbnail" alt="Thumbnail">
```

### Responsive Images
```html
<picture>
  <!-- Modern browsers with AVIF support -->
  <source srcset="/api/media/images/789?size=detail" type="image/avif">
  <!-- Browsers with WebP support -->
  <source srcset="/api/media/images/789?size=detail" type="image/webp">
  <!-- Fallback for all browsers -->
  <img src="/api/media/images/789?size=detail" alt="Responsive Image">
</picture>
```

### Different Size Variants
```html
<!-- Thumbnail for listings -->
<img src="/api/media/images/123?size=thumbnail" alt="Thumbnail" width="150" height="150">

<!-- Grid view -->
<img src="/api/media/images/123?size=grid" alt="Grid Image" width="400" height="400">

<!-- Detail view -->
<img src="/api/media/images/123?size=detail" alt="Detail Image" width="800" height="600">

<!-- Header banner -->
<img src="/api/media/images/123?size=header" alt="Header Banner" width="1200" height="400">
```

### JavaScript Usage
```javascript
// Check if image exists before loading
async function checkImageExists(mediaId) {
  try {
    const response = await fetch(`/api/media/images/${mediaId}?size=thumbnail`, {
      method: 'HEAD'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Load optimized image with error handling
async function loadOptimizedImage(mediaId, size = 'detail') {
  try {
    const response = await fetch(`/api/media/images/${mediaId}?size=${size}`, {
      headers: {
        'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to load image:', error);
    return '/path/to/fallback-image.jpg';
  }
}

// Usage
loadOptimizedImage(456, 'thumbnail').then(url => {
  document.getElementById('myImage').src = url;
});
```

### CSS Background Images
```css
/* Direct file serving */
.hero-banner {
  background-image: url('/api/media/serve/banners/hero_2025.jpg');
  background-size: cover;
  background-position: center;
}

/* Smart serving with size optimization */
.product-grid-item {
  background-image: url('/api/media/images/123?size=grid');
  background-size: cover;
}

/* Responsive background with media queries */
@media (max-width: 768px) {
  .hero-banner {
    background-image: url('/api/media/images/456?size=small');
  }
}

@media (min-width: 769px) {
  .hero-banner {
    background-image: url('/api/media/images/456?size=header');
  }
}
```

## Best Practices

### Performance Optimization
1. **Use Smart Serving**: Prefer `/api/media/images/{id}` for automatic optimization
2. **Appropriate Sizes**: Choose the right size variant for your use case
3. **Format Negotiation**: Set proper `Accept` headers for format selection
4. **Caching**: Leverage browser and CDN caching with proper headers
5. **Conditional Requests**: Use `If-None-Match` and `If-Modified-Since` headers

### Error Handling
```javascript
// Robust image loading with fallbacks
function loadImageWithFallback(mediaId, size = 'detail', fallbackUrl = '/default-image.jpg') {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => resolve(img.src);
    img.onerror = () => {
      // Try fallback URL
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg.src);
      fallbackImg.onerror = () => resolve('/ultimate-fallback.jpg');
      fallbackImg.src = fallbackUrl;
    };
    
    img.src = `/api/media/images/${mediaId}?size=${size}`;
  });
}
```

### SEO Optimization
```html
<!-- Proper alt text and dimensions -->
<img src="/api/media/images/123?size=detail" 
     alt="Handcrafted ceramic vase with blue glaze pattern" 
     width="800" 
     height="600"
     loading="lazy">

<!-- Structured data for images -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "url": "/api/media/images/123?size=detail",
  "width": 800,
  "height": 600,
  "caption": "Handcrafted ceramic vase"
}
</script>
```

### CDN Integration
```javascript
// CDN-friendly URLs with proper cache headers
const getCDNOptimizedUrl = (mediaId, size = 'detail') => {
  // The API automatically sets appropriate cache headers
  // CDN will respect Vary: Accept header for format negotiation
  return `/api/media/images/${mediaId}?size=${size}`;
};
```

## Rate Limits
- No specific rate limits for media serving endpoints
- Standard server-level rate limiting may apply
- Large file downloads may have timeout limits (30 seconds)

## Security Considerations

### Content Security
- All media content served with `X-Content-Type-Options: nosniff` header
- Proper MIME type detection and validation
- No executable content served through media endpoints

### Access Control
- Media endpoints are publicly accessible
- No authentication required for media serving
- File access controlled at the media backend level

### Privacy
- Request logging includes IP addresses and user agents
- No personal data exposed in media URLs
- Media IDs are numeric and non-guessable

## Integration Notes

### Frontend Integration
- Use smart serving endpoints for automatic optimization
- Implement proper error handling and fallbacks
- Leverage caching headers for performance
- Use appropriate size variants for different contexts

### CDN Integration
- All endpoints return CDN-friendly cache headers
- `Vary: Accept` header ensures proper format caching
- Long cache times for optimized content (1 year)
- ETag support for efficient cache validation

### Mobile Optimization
- Format negotiation automatically serves optimal formats
- Size variants provide appropriate resolutions for mobile
- Efficient caching reduces mobile data usage
- Conditional requests minimize unnecessary downloads

## Monitoring and Analytics

### Performance Metrics
- Response times for different size variants
- Cache hit rates and effectiveness
- Format distribution (AVIF vs WebP vs JPEG)
- Error rates and types

### Usage Analytics
- Popular size variants and usage patterns
- Geographic distribution of requests
- Browser format support statistics
- Peak usage times and load patterns

## Future Enhancements

### Planned Features
- **Range Request Support**: Partial content requests for large files
- **Progressive JPEG**: Progressive loading for better user experience
- **Image Transformations**: On-the-fly cropping and rotation
- **Video Support**: Video streaming and optimization

### Advanced Optimization
- **Lazy Loading Integration**: Built-in lazy loading support
- **Preload Hints**: Automatic preload hint generation
- **Compression**: Additional compression for text-based media
- **Edge Caching**: Enhanced edge caching strategies

## Support and Documentation

### Technical Support
- **API Documentation**: Complete OpenAPI 3.0 specification available
- **Integration Guides**: Step-by-step integration documentation
- **Best Practices**: Performance and optimization guidelines
- **Troubleshooting**: Common issues and solutions

### Community Resources
- **Developer Forums**: Community support and discussions
- **Code Examples**: Sample implementations and use cases
- **Performance Tips**: Community-contributed optimization techniques
- **Integration Patterns**: Common integration patterns and solutions
