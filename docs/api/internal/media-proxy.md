# Media Proxy Service - Internal Documentation

## Overview
Comprehensive media proxy service that provides optimized media delivery, format negotiation, and caching between the frontend and media backend. This service handles direct file serving, smart image optimization with multiple format support (AVIF, WebP, JPEG), automatic size variants, HTTP caching with ETag support, conditional requests, and comprehensive error handling. It acts as an intelligent proxy layer that optimizes media delivery performance while providing robust error handling and logging.

## Architecture
- **Type:** Route Handler (Media Proxy Service)
- **Dependencies:** 
  - Express.js router
  - Axios for HTTP requests
  - Secure logger middleware
- **External Services:** 
  - Media backend server (configurable URL)
  - Smart serving system with format negotiation
- **Authentication:** API key authentication to media backend
- **Caching:** HTTP caching with ETag, Last-Modified, and conditional requests

## Functions/Endpoints

### Direct File Serving
#### GET /serve/*
- **Purpose:** Proxy media files from backend to frontend with streaming
- **Parameters:** File path (wildcard parameter after /serve/)
- **Returns:** Media file stream with appropriate headers and caching
- **Errors:** 400 for missing path, 404 for not found, 503/504 for backend issues, 500 for server errors
- **Usage Example:** Serving processed images, documents, and media files
- **Special Features:**
  - Stream-based file delivery for memory efficiency
  - HTTP caching with ETag and Last-Modified headers
  - Conditional request support (304 Not Modified)
  - Comprehensive error handling with specific error codes
  - Security headers (X-Content-Type-Options: nosniff)
  - Configurable cache control (1 hour default)
  - Media backend authentication with API key
  - Request logging with user agent, referer, and IP tracking

#### HEAD /serve/*
- **Purpose:** Get media file metadata without downloading content
- **Parameters:** File path (wildcard parameter after /serve/)
- **Returns:** HTTP headers with media metadata (no body)
- **Errors:** 400 for missing path, 404 for not found, 503 for backend unavailable, 500 for server errors
- **Usage Example:** File existence checks, metadata retrieval
- **Special Features:**
  - Metadata-only requests for efficient existence checking
  - Header passthrough from media backend
  - Reduced timeout (10 seconds) for faster responses
  - Same caching headers as GET requests
  - Error handling without response bodies
  - Efficient bandwidth usage for metadata queries

### Smart Media Serving
#### GET /images/:mediaId
- **Purpose:** Smart serving with format negotiation and size optimization
- **Parameters:** Media ID (numeric), size query parameter (thumbnail, small, grid, detail, header, zoom)
- **Returns:** Optimized media stream with format negotiation (AVIF, WebP, JPEG)
- **Errors:** 400 for invalid ID/size, 404 for not found, 503/504 for backend issues, 500 for server errors
- **Usage Example:** Responsive image delivery with automatic optimization
- **Special Features:**
  - Automatic format negotiation based on Accept header
  - Multiple size variants (thumbnail, small, grid, detail, header, zoom)
  - Extended caching (1 year default) for optimized images
  - Vary: Accept header for proper CDN caching
  - User-Agent passthrough for backend analytics
  - Accept header forwarding for format selection
  - Size parameter validation with helpful error messages
  - Enhanced logging with format and size tracking

## Configuration

### Environment Variables
- **MEDIA_BACKEND_URL:** Media backend server URL (default: http://10.128.0.29:3001)
- **MEDIA_API_KEY:** Hardcoded API key for media backend authentication

### Media Backend Configuration
```javascript
const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = 'media_20074c47e0d2af1a90b1d9ba1d001648:eb7d555c29ce59c6202f3975b37a45cdc2e7a21eb09c6d684e982ebee5cc9e6a';
```

### Size Variants
- **thumbnail:** Small thumbnail images
- **small:** Small size images
- **grid:** Grid display size
- **detail:** Detail view size (default)
- **header:** Header image size
- **zoom:** High-resolution zoom images

### Timeout Configuration
- **Direct Serving:** 30 seconds for file streaming
- **Metadata Requests:** 10 seconds for HEAD requests
- **Smart Serving:** 30 seconds for optimized images

## Data Flow

### Direct File Serving Flow
1. **Request Reception:** Frontend requests media file via proxy
2. **Path Extraction:** Extract file path from wildcard parameter
3. **Backend Request:** Forward request to media backend with authentication
4. **Response Processing:** Handle backend response and errors
5. **Header Management:** Copy and set appropriate response headers
6. **Conditional Requests:** Handle If-None-Match and If-Modified-Since
7. **Stream Delivery:** Stream media content to frontend
8. **Error Handling:** Comprehensive error handling with logging
9. **Completion Logging:** Log successful completion

### Smart Serving Flow
1. **Request Validation:** Validate media ID and size parameters
2. **Format Negotiation:** Extract Accept header for format selection
3. **Backend Request:** Request optimized media from smart serving system
4. **Optimization Processing:** Backend processes format and size optimization
5. **Enhanced Caching:** Set extended cache headers for optimized content
6. **Stream Delivery:** Stream optimized media to frontend
7. **Performance Logging:** Log optimization details and performance metrics

## Error Handling

### Backend Connection Errors
- **ECONNREFUSED:** Media backend unavailable (503 Service Unavailable)
- **ETIMEDOUT:** Backend timeout (504 Gateway Timeout)
- **401 Unauthorized:** Authentication failure (500 Internal Server Error)
- **404 Not Found:** Media not found (404 Not Found)

### Validation Errors
- **Missing File Path:** Invalid request format (400 Bad Request)
- **Invalid Media ID:** Non-numeric media ID (400 Bad Request)
- **Invalid Size Parameter:** Unsupported size variant (400 Bad Request)

### Streaming Errors
- **Stream Errors:** Handle streaming interruptions gracefully
- **Response Errors:** Prevent double response sending
- **Header Validation:** Ensure headers sent before streaming

## Performance Optimizations

### Caching Strategy
- **Direct Files:** 1 hour cache with immutable flag
- **Optimized Images:** 1 year cache with immutable flag
- **ETag Support:** Efficient conditional request handling
- **Last-Modified:** Browser cache validation
- **Vary Headers:** Proper CDN caching for format negotiation

### Streaming Efficiency
- **Stream-based Delivery:** Memory-efficient file streaming
- **Response Piping:** Direct stream piping to minimize memory usage
- **Header Passthrough:** Efficient header copying from backend
- **Conditional Requests:** Bandwidth savings with 304 responses

### Format Negotiation
- **AVIF Support:** Next-generation image format for modern browsers
- **WebP Fallback:** High-efficiency format for broader support
- **JPEG Baseline:** Universal compatibility format
- **Accept Header Processing:** Automatic format selection based on browser support

## Security Considerations

### Authentication
- **API Key Protection:** Secure API key for media backend access
- **Request Validation:** Input validation for all parameters
- **Path Sanitization:** Secure file path handling

### Security Headers
- **X-Content-Type-Options:** Prevent MIME type sniffing
- **Cache-Control:** Appropriate caching policies
- **Content-Type Validation:** Proper MIME type handling

### Request Logging
- **Comprehensive Logging:** User agent, referer, IP tracking
- **Error Logging:** Detailed error information for debugging
- **Security Monitoring:** Request pattern analysis capability

## Monitoring and Logging

### Request Logging
```javascript
secureLogger.info('Media proxy request', {
  filePath,
  userAgent: req.get('User-Agent'),
  referer: req.get('Referer'),
  ip: req.ip
});
```

### Success Logging
```javascript
secureLogger.info('Media proxy success', {
  filePath,
  contentType,
  contentLength,
  cached: !!etag
});
```

### Error Logging
```javascript
secureLogger.error('Media proxy error', {
  filePath: req.params[0],
  error: error.message,
  stack: error.stack
});
```

### Performance Metrics
- **Content Type Tracking:** Monitor format distribution
- **Size Variant Usage:** Track size parameter popularity
- **Cache Hit Rates:** Monitor caching effectiveness
- **Response Times:** Track backend response performance
- **Error Rates:** Monitor error frequency and types

## Business Logic

### File Path Processing
- **Wildcard Parameter Extraction:** Safe extraction of file paths
- **Path Validation:** Ensure valid file path format
- **Backend URL Construction:** Proper URL building for backend requests

### Media ID Validation
- **Numeric Validation:** Ensure media ID is numeric
- **Size Parameter Validation:** Validate against allowed size variants
- **Query Parameter Processing:** Safe query parameter handling

### Response Header Management
- **Header Copying:** Selective header copying from backend
- **Cache Control:** Appropriate cache policies for different content types
- **Security Headers:** Essential security header application
- **Conditional Request Headers:** ETag and Last-Modified handling

## Integration Points

### Media Backend Integration
- **Authentication:** API key-based authentication
- **Request Forwarding:** Proper request forwarding with headers
- **Response Processing:** Comprehensive response handling
- **Error Translation:** Backend error translation for frontend

### Frontend Integration
- **URL Structure:** Consistent URL patterns for media access
- **Caching Support:** Browser and CDN caching optimization
- **Format Negotiation:** Automatic format selection for optimal delivery
- **Error Handling:** User-friendly error responses

### CDN Integration
- **Cache Headers:** CDN-friendly caching policies
- **Vary Headers:** Proper cache key variation for format negotiation
- **Immutable Content:** Immutable flags for optimized content
- **ETag Support:** Efficient cache validation

## Development Notes

### Code Organization
- **Single File Structure:** All media proxy functionality in one file
- **Clear Function Separation:** Distinct endpoints for different use cases
- **Comprehensive Error Handling:** Robust error handling throughout
- **Logging Integration:** Consistent logging across all operations

### Configuration Management
- **Environment Variables:** Configurable backend URL
- **Hardcoded API Key:** Secure API key management (consider environment variable)
- **Timeout Configuration:** Appropriate timeout settings for different operations
- **Size Variant Configuration:** Centralized size variant validation

### Future Enhancements
- **API Key Environment Variable:** Move API key to environment variable
- **Rate Limiting:** Implement rate limiting for proxy endpoints
- **Metrics Collection:** Enhanced metrics collection and monitoring
- **Cache Warming:** Proactive cache warming for popular content
- **Compression Support:** Add compression support for text-based media
- **Range Request Support:** Support for partial content requests

## Testing Considerations

### Unit Tests
- **Parameter Validation:** Test all parameter validation logic
- **Error Handling:** Test all error scenarios and responses
- **Header Processing:** Test header copying and modification
- **Stream Handling:** Test streaming functionality and error cases

### Integration Tests
- **Backend Communication:** Test media backend integration
- **Format Negotiation:** Test automatic format selection
- **Caching Behavior:** Test caching headers and conditional requests
- **Error Scenarios:** Test backend unavailability and timeout scenarios

### Performance Tests
- **Load Testing:** Test under high concurrent load
- **Memory Usage:** Monitor memory usage during streaming
- **Cache Effectiveness:** Measure cache hit rates and performance
- **Backend Response Times:** Monitor backend communication performance

## API Consistency

### Response Format
- **Streaming Responses:** Direct media streaming for efficiency
- **Error Responses:** Consistent JSON error format
- **Header Standards:** Consistent header handling across endpoints
- **Status Codes:** Appropriate HTTP status codes for all scenarios

### URL Patterns
- **Wildcard Routing:** Consistent wildcard parameter handling
- **Query Parameters:** Standard query parameter processing
- **Path Structure:** Logical and consistent path structure
- **Media ID Format:** Consistent media ID validation

## Deployment Considerations

### Environment Configuration
- **Backend URL Configuration:** Proper environment-specific backend URLs
- **API Key Management:** Secure API key deployment
- **Timeout Configuration:** Environment-appropriate timeout settings
- **Logging Configuration:** Proper logging level configuration

### Scaling Considerations
- **Horizontal Scaling:** Stateless design for horizontal scaling
- **Load Balancing:** Compatible with load balancing strategies
- **CDN Integration:** Optimized for CDN deployment
- **Memory Management:** Efficient memory usage for high throughput

## Troubleshooting

### Common Issues
- **Backend Unavailable:** Check media backend connectivity and status
- **Authentication Failures:** Verify API key configuration
- **Timeout Issues:** Check network connectivity and backend performance
- **Format Issues:** Verify Accept header processing and format support

### Debugging Tools
- **Request Logging:** Comprehensive request and response logging
- **Error Stack Traces:** Detailed error information for debugging
- **Performance Metrics:** Response time and throughput monitoring
- **Backend Communication:** Monitor backend request/response cycles

### Monitoring Alerts
- **Error Rate Monitoring:** Alert on high error rates
- **Response Time Monitoring:** Alert on slow response times
- **Backend Availability:** Monitor media backend health
- **Cache Performance:** Monitor cache hit rates and effectiveness
