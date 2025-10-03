# Jury Packet Management - Internal Documentation

## Overview
Comprehensive jury packet management system that provides artists with the ability to create, organize, and manage submission packets for jury review processes. This system handles jury packet CRUD operations with ownership validation, artist persona integration, packet data and photo management with JSON storage, and secure packet access with artist authentication. Jury packets serve as organized collections of an artist's work, statements, and supporting materials for event applications and jury review processes.

## Architecture
- **Type:** Route Handler (Jury Packet Management)
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
- **Database Tables:** 
  - `artist_jury_packets` - Main jury packet records
  - `artist_personas` - Artist persona associations
- **External APIs:** None (self-contained system)
- **Authentication:** JWT token-based authentication with ownership validation

## Functions/Endpoints

### Jury Packet Management
#### GET /
- **Purpose:** Retrieve all jury packets for authenticated artist
- **Parameters:** None (uses authenticated user ID)
- **Returns:** Array of jury packets with persona information
- **Errors:** 500 for database errors
- **Usage Example:** Artist dashboard jury packet listing
- **Special Features:**
  - Authentication required for access
  - Artist-specific packet filtering
  - Persona information via LEFT JOIN
  - Chronological ordering (most recent first)
  - Complete packet overview with metadata
  - Active persona filtering (is_active = 1)
  - Persona display name inclusion

#### GET /:id
- **Purpose:** Retrieve detailed information for specific jury packet
- **Parameters:** Jury packet ID (URL parameter)
- **Returns:** Complete jury packet details
- **Errors:** 404 for packet not found, 500 for database errors
- **Usage Example:** Jury packet detail view and editing
- **Special Features:**
  - Authentication and ownership validation
  - Complete packet data retrieval
  - JSON data structure preservation
  - Secure access control
  - Artist ownership verification
  - Full packet information access

#### POST /
- **Purpose:** Create new jury packet for authenticated artist
- **Parameters:** Packet name (required), packet data, photos data, persona ID (optional)
- **Returns:** Created jury packet details with success message
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** New jury packet creation
- **Special Features:**
  - Authentication required for creation
  - Packet name validation (required and trimmed)
  - Persona ownership validation if provided
  - JSON storage for packet and photos data
  - Default empty object/array handling
  - Automatic artist association
  - Persona validation against active personas

#### PUT /:id
- **Purpose:** Update existing jury packet
- **Parameters:** Packet ID, packet name (required), packet data, photos data, persona ID (optional)
- **Returns:** Update success message
- **Errors:** 404 for packet not found, 400 for validation errors, 500 for database errors
- **Usage Example:** Jury packet modification and updates
- **Special Features:**
  - Authentication and ownership validation
  - Packet existence verification
  - Packet name validation (required and trimmed)
  - Persona ownership validation if provided
  - JSON data structure updates
  - Complete field update support
  - Secure ownership verification

#### DELETE /:id
- **Purpose:** Delete jury packet (hard delete)
- **Parameters:** Jury packet ID (URL parameter)
- **Returns:** Deletion success message
- **Errors:** 404 for packet not found, 500 for database errors
- **Usage Example:** Jury packet removal and cleanup
- **Special Features:**
  - Authentication and ownership validation
  - Packet existence verification
  - Hard delete (complete removal)
  - Secure ownership verification
  - Complete packet removal

## Data Models

### Jury Packet Structure
```javascript
{
  id: number,                         // Jury packet ID
  artist_id: number,                  // Artist user ID
  packet_name: string,                // Packet name
  packet_data: json,                  // Packet data (JSON object)
  photos_data: json,                  // Photos data (JSON array)
  persona_id: number,                 // Artist persona ID (optional)
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp,              // Last update timestamp
  
  // Joined fields (from GET / endpoint)
  persona_name: string,               // Persona name (from JOIN)
  persona_display_name: string        // Persona display name (from JOIN)
}
```

### Packet Data Structure (JSON)
```javascript
{
  // Artist statement and information
  artist_statement: string,           // Artist statement
  bio: string,                        // Artist biography
  exhibition_history: string,         // Exhibition history
  awards: string,                     // Awards and recognition
  education: string,                  // Educational background
  
  // Work information
  medium: string,                     // Primary medium
  style: string,                      // Artistic style
  themes: string,                     // Artistic themes
  techniques: string,                 // Techniques used
  
  // Contact and professional info
  website: string,                    // Artist website
  social_media: object,               // Social media links
  professional_references: array,    // Professional references
  
  // Submission specific
  work_description: string,           // Description of submitted work
  work_dimensions: string,            // Dimensions of work
  work_price: number,                 // Price of work
  availability: string,               // Availability information
  
  // Custom fields
  custom_fields: object              // Additional custom data
}
```

### Photos Data Structure (JSON Array)
```javascript
[
  {
    id: string,                       // Photo ID
    url: string,                      // Photo URL
    title: string,                    // Photo title
    description: string,              // Photo description
    medium: string,                   // Medium used
    dimensions: string,               // Dimensions
    year: number,                     // Year created
    price: number,                    // Price (optional)
    is_primary: boolean,              // Primary image flag
    order: number,                    // Display order
    tags: array,                      // Photo tags
    metadata: object                  // Additional metadata
  }
]
```

### Artist Persona Structure (Referenced)
```javascript
{
  id: number,                         // Persona ID
  artist_id: number,                  // Artist user ID
  persona_name: string,               // Persona name
  display_name: string,               // Display name
  is_active: boolean,                 // Active status
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp               // Last update timestamp
}
```

## Business Logic

### Packet Creation Workflow
1. **Authentication Validation:** Verify user authentication
2. **Input Validation:** Validate packet name (required and trimmed)
3. **Persona Validation:** Verify persona ownership if provided
4. **Data Processing:** Process packet data and photos data as JSON
5. **Database Insertion:** Create packet record with artist association
6. **Response Formatting:** Return created packet details

### Packet Update Process
1. **Authentication Validation:** Verify user authentication
2. **Ownership Validation:** Verify packet belongs to authenticated artist
3. **Input Validation:** Validate packet name and data
4. **Persona Validation:** Verify persona ownership if provided
5. **Database Update:** Update packet with new data
6. **Response:** Return success confirmation

### Packet Deletion Process
1. **Authentication Validation:** Verify user authentication
2. **Ownership Validation:** Verify packet belongs to authenticated artist
3. **Database Deletion:** Hard delete packet record
4. **Response:** Return deletion confirmation

### Persona Integration
1. **Persona Validation:** Verify persona belongs to artist and is active
2. **Association:** Link packet to validated persona
3. **Display Integration:** Include persona information in packet listings
4. **Access Control:** Ensure persona access follows ownership rules

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Ownership Validation:** Strict ownership validation for all packet operations
- **Data Isolation:** Users only access their own packets
- **Input Validation:** Comprehensive validation of all parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Persona Security:** Secure persona ownership validation
- **JSON Security:** Safe JSON handling and storage

## Performance Considerations
- **Database Indexing:** Optimized queries on artist_id, packet_id
- **Query Optimization:** Efficient JOINs for persona information
- **JSON Storage:** Efficient JSON storage for flexible data structures
- **Connection Pooling:** Database connection management for concurrent operations
- **Data Size:** Consider JSON data size limits for large packets
- **Caching:** Consider caching for frequently accessed packets

## Testing
- **Unit Tests:** Should cover all business logic and validation
- **Integration Tests:** Test database operations and persona integration
- **Security Tests:** Verify ownership validation and access control
- **Validation Tests:** Test input validation and error handling
- **JSON Tests:** Test JSON data storage and retrieval
- **Persona Tests:** Test persona validation and integration

## Error Handling
- **Authentication Errors:** Clear error messages for authentication failures
- **Ownership Errors:** Specific error messages for ownership violations
- **Validation Errors:** Comprehensive validation error messages
- **Database Errors:** Proper handling of database connection and query errors
- **Persona Errors:** Clear error messages for persona validation failures
- **User-Friendly Messages:** Clear error messages for API consumers

## Common Use Cases
- **Application Preparation:** Organizing materials for event applications
- **Jury Submissions:** Preparing packets for jury review processes
- **Portfolio Management:** Managing different versions of artist portfolios
- **Persona Organization:** Organizing packets by different artist personas
- **Submission Tracking:** Tracking different submission packages
- **Material Updates:** Updating and maintaining submission materials

## Integration Points
- **User System:** Coordinates with user system for authentication
- **Persona System:** Integrates with artist persona system
- **Application System:** Provides packets for application submissions
- **Event System:** Coordinates with event application processes
- **Media System:** May integrate with media management for photos
- **Profile System:** Coordinates with artist profile information

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and ownership validation
- **Validation:** Consistent input validation and error messaging
- **JSON Handling:** Consistent JSON data structure management
- **Ownership Patterns:** Consistent ownership validation patterns

## Future Enhancements
- **Template System:** Predefined packet templates for common applications
- **Version Control:** Version history and rollback capabilities
- **Collaboration:** Shared packet editing and collaboration features
- **Export Features:** Export packets to various formats (PDF, etc.)
- **Analytics:** Packet usage and success analytics
- **Integration APIs:** Integration with external portfolio platforms
- **Bulk Operations:** Bulk packet operations and management
- **Advanced Search:** Search and filtering capabilities for packets

## Development Notes
- **Focused System:** Specialized for jury packet management
- **JSON Flexibility:** Flexible JSON storage for varied packet structures
- **Persona Integration:** Complete integration with artist persona system
- **Security Focus:** Security-first design with ownership validation
- **Documentation:** Comprehensive JSDoc documentation for all functions
- **Simplicity:** Clean, focused API design for ease of use
- **Scalability:** Designed to handle large numbers of packets per artist

## Business Requirements
- **Packet Management:** Complete jury packet lifecycle management
- **Persona Integration:** Support for multiple artist personas
- **Flexible Data:** Flexible data structures for varied submission requirements
- **Security:** Secure access control and ownership validation
- **User Experience:** Intuitive packet creation and management
- **Data Integrity:** Reliable data storage and retrieval
- **Performance:** Efficient packet operations and queries

## Monitoring and Logging
- **Packet Operations:** Comprehensive logging of all packet operations
- **Authentication Events:** Monitor authentication and access patterns
- **Error Tracking:** Detailed error logging for packet operations
- **Performance Monitoring:** Track query performance for packet operations
- **Usage Analytics:** Monitor packet creation and usage patterns
- **Security Monitoring:** Monitor for unauthorized access attempts

## Data Privacy and Compliance
- **User Data Protection:** Secure handling of artist packet data
- **Access Control:** Strict access control for packet information
- **Data Retention:** Appropriate retention policies for packet data
- **Privacy Compliance:** Ensure compliance with data privacy regulations
- **Audit Trails:** Comprehensive audit trails for packet modifications
- **Data Security:** Secure storage and transmission of packet data

## Validation Rules

### Packet Creation
- **packet_name:** Required, non-empty string, trimmed
- **packet_data:** Optional JSON object, defaults to empty object
- **photos_data:** Optional JSON array, defaults to empty array
- **persona_id:** Optional, must belong to authenticated artist if provided

### Packet Updates
- **packet_name:** Required, non-empty string, trimmed
- **packet_data:** Optional JSON object
- **photos_data:** Optional JSON array
- **persona_id:** Optional, must belong to authenticated artist if provided
- **Ownership:** Packet must belong to authenticated artist

### Packet Deletion
- **Ownership:** Packet must belong to authenticated artist
- **Existence:** Packet must exist in database

## Database Schema

### artist_jury_packets Table
```sql
CREATE TABLE artist_jury_packets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  artist_id INT NOT NULL,
  packet_name VARCHAR(255) NOT NULL,
  packet_data JSON,
  photos_data JSON,
  persona_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (artist_id) REFERENCES users(id),
  FOREIGN KEY (persona_id) REFERENCES artist_personas(id),
  INDEX idx_artist_id (artist_id),
  INDEX idx_persona_id (persona_id),
  INDEX idx_updated_at (updated_at)
);
```

## JSON Data Patterns

### Flexible Packet Data
- **Structured Fields:** Common fields like artist_statement, bio, etc.
- **Custom Fields:** Flexible custom_fields object for additional data
- **Nested Objects:** Support for complex nested data structures
- **Arrays:** Support for lists of items (exhibitions, awards, etc.)
- **Validation:** Client-side validation for required fields

### Photo Management
- **Array Structure:** Photos stored as JSON array
- **Metadata:** Rich metadata for each photo
- **Ordering:** Support for photo ordering and primary image selection
- **Flexibility:** Extensible structure for additional photo properties

## API Usage Patterns

### Common Workflows
1. **List Packets:** GET / to see all packets
2. **Create Packet:** POST / with packet data
3. **View Details:** GET /:id for specific packet
4. **Update Packet:** PUT /:id with changes
5. **Delete Packet:** DELETE /:id to remove

### Error Handling Patterns
- **404 Errors:** Packet not found or access denied
- **400 Errors:** Validation failures and invalid data
- **500 Errors:** Database and server errors
- **Authentication:** 401 for missing/invalid tokens

## Performance Optimization

### Query Optimization
- **Indexed Queries:** Efficient queries on artist_id and packet_id
- **JOIN Optimization:** Efficient LEFT JOIN for persona information
- **JSON Queries:** Optimized JSON field queries when needed
- **Pagination:** Consider pagination for artists with many packets

### Data Management
- **JSON Size:** Monitor JSON field sizes for performance
- **Connection Pooling:** Efficient database connection management
- **Caching Strategy:** Consider caching for frequently accessed packets
- **Bulk Operations:** Efficient handling of multiple packet operations

## Troubleshooting

### Common Issues
- **Persona Validation:** Ensure persona belongs to artist and is active
- **JSON Formatting:** Validate JSON structure for packet and photos data
- **Ownership Errors:** Verify packet ownership for all operations
- **Authentication:** Ensure valid JWT tokens for all requests

### Debugging Tools
- **Request Logging:** Comprehensive request and response logging
- **Error Stack Traces:** Detailed error information for debugging
- **Database Queries:** Monitor database query performance and errors
- **JSON Validation:** Validate JSON data structure integrity

## Security Best Practices

### Access Control
- **Authentication Required:** All endpoints require valid JWT tokens
- **Ownership Validation:** Strict validation of packet ownership
- **Persona Security:** Secure validation of persona associations
- **Input Sanitization:** Proper sanitization of all input data

### Data Protection
- **SQL Injection:** Parameterized queries prevent SQL injection
- **JSON Security:** Safe JSON parsing and storage
- **Error Messages:** Secure error messages without sensitive data exposure
- **Audit Logging:** Comprehensive logging for security monitoring
