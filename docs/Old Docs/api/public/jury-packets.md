# Jury Packet Management API

## Authentication
All jury packet endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Jury Packet Endpoints

### Get All Jury Packets
`GET /api/jury-packets`

Get all jury packets for the authenticated artist.

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "packet_name": "Contemporary Sculpture Portfolio",
    "persona_id": 456,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-20T14:30:00Z",
    "persona_name": "Professional Artist",
    "persona_display_name": "Jane Smith - Professional"
  },
  {
    "id": 124,
    "packet_name": "Abstract Paintings Collection",
    "persona_id": null,
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-18T16:45:00Z",
    "persona_name": null,
    "persona_display_name": null
  }
]
```

### Get Single Jury Packet
`GET /api/jury-packets/{id}`

Get detailed information for a specific jury packet.

**Parameters:**
- `id`: Jury packet ID (path parameter)

**Response (200 OK):**
```json
{
  "id": 123,
  "artist_id": 789,
  "packet_name": "Contemporary Sculpture Portfolio",
  "packet_data": {
    "artist_statement": "My work explores the intersection of nature and technology...",
    "bio": "Jane Smith is a contemporary sculptor based in Portland, Oregon...",
    "exhibition_history": "2024: Gallery Modern, Portland\n2023: Art Center Downtown...",
    "awards": "2024: Best in Show, Portland Art Fair\n2023: Emerging Artist Award...",
    "education": "MFA Sculpture, Portland State University, 2020\nBFA Art, University of Oregon, 2018",
    "medium": "Mixed Media Sculpture",
    "style": "Contemporary Abstract",
    "themes": "Nature, Technology, Human Connection",
    "techniques": "Welding, Casting, Digital Fabrication",
    "website": "https://janesmithart.com",
    "social_media": {
      "instagram": "@janesmithsculpture",
      "facebook": "JaneSmithArt"
    },
    "work_description": "A series of five large-scale sculptures exploring...",
    "work_dimensions": "Various sizes, largest: 8' x 6' x 4'",
    "work_price": 15000,
    "availability": "Available for exhibition and sale"
  },
  "photos_data": [
    {
      "id": "photo_1",
      "url": "/images/portfolio/sculpture_1.jpg",
      "title": "Urban Nature #1",
      "description": "Steel and bronze sculpture with integrated LED lighting",
      "medium": "Steel, Bronze, LED",
      "dimensions": "6' x 4' x 3'",
      "year": 2024,
      "price": 8500,
      "is_primary": true,
      "order": 1,
      "tags": ["sculpture", "contemporary", "nature"]
    },
    {
      "id": "photo_2",
      "url": "/images/portfolio/sculpture_2.jpg",
      "title": "Digital Organic #2",
      "description": "3D printed and cast bronze hybrid sculpture",
      "medium": "Bronze, 3D Printed Resin",
      "dimensions": "4' x 3' x 2'",
      "year": 2024,
      "price": 6500,
      "is_primary": false,
      "order": 2,
      "tags": ["sculpture", "digital", "organic"]
    }
  ],
  "persona_id": 456,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

### Create Jury Packet
`POST /api/jury-packets`

Create a new jury packet for the authenticated artist.

**Request Body:**
```json
{
  "packet_name": "Mixed Media Portfolio 2025",
  "persona_id": 456,
  "packet_data": {
    "artist_statement": "My artistic practice focuses on...",
    "bio": "I am a mixed media artist with over 10 years of experience...",
    "exhibition_history": "Recent exhibitions include...",
    "medium": "Mixed Media",
    "style": "Contemporary Abstract",
    "themes": "Identity, Memory, Place",
    "website": "https://myartsite.com",
    "work_description": "This collection explores themes of...",
    "work_dimensions": "Various sizes from 12\" x 16\" to 48\" x 60\"",
    "availability": "Available for exhibition"
  },
  "photos_data": [
    {
      "id": "photo_1",
      "url": "/images/portfolio/work_1.jpg",
      "title": "Memory Fragments #1",
      "description": "Mixed media on canvas with collage elements",
      "medium": "Acrylic, Collage, Canvas",
      "dimensions": "24\" x 36\"",
      "year": 2025,
      "is_primary": true,
      "order": 1,
      "tags": ["mixed-media", "abstract", "memory"]
    }
  ]
}
```

**Required Fields:**
- `packet_name`: Name of the jury packet

**Optional Fields:**
- `packet_data`: Object containing packet information and artist details
- `photos_data`: Array of photo objects with artwork images
- `persona_id`: ID of artist persona to associate with packet

**Response (201 Created):**
```json
{
  "id": 125,
  "packet_name": "Mixed Media Portfolio 2025",
  "persona_id": 456,
  "packet_data": {
    "artist_statement": "My artistic practice focuses on...",
    "bio": "I am a mixed media artist with over 10 years of experience...",
    "exhibition_history": "Recent exhibitions include...",
    "medium": "Mixed Media",
    "style": "Contemporary Abstract",
    "themes": "Identity, Memory, Place",
    "website": "https://myartsite.com",
    "work_description": "This collection explores themes of...",
    "work_dimensions": "Various sizes from 12\" x 16\" to 48\" x 60\"",
    "availability": "Available for exhibition"
  },
  "photos_data": [
    {
      "id": "photo_1",
      "url": "/images/portfolio/work_1.jpg",
      "title": "Memory Fragments #1",
      "description": "Mixed media on canvas with collage elements",
      "medium": "Acrylic, Collage, Canvas",
      "dimensions": "24\" x 36\"",
      "year": 2025,
      "is_primary": true,
      "order": 1,
      "tags": ["mixed-media", "abstract", "memory"]
    }
  ],
  "message": "Jury packet created successfully"
}
```

### Update Jury Packet
`PUT /api/jury-packets/{id}`

Update an existing jury packet (requires ownership).

**Parameters:**
- `id`: Jury packet ID (path parameter)

**Request Body:**
```json
{
  "packet_name": "Updated Portfolio Name",
  "packet_data": {
    "artist_statement": "Updated artist statement...",
    "bio": "Updated biography...",
    "exhibition_history": "Updated exhibition history...",
    "medium": "Updated medium information",
    "work_description": "Updated work description..."
  },
  "photos_data": [
    {
      "id": "photo_1",
      "url": "/images/portfolio/updated_work_1.jpg",
      "title": "Updated Work Title",
      "description": "Updated description",
      "medium": "Updated Medium",
      "dimensions": "Updated dimensions",
      "year": 2025,
      "is_primary": true,
      "order": 1
    }
  ],
  "persona_id": 456
}
```

**Required Fields:**
- `packet_name`: Name of the jury packet

**Response (200 OK):**
```json
{
  "message": "Jury packet updated successfully"
}
```

### Delete Jury Packet
`DELETE /api/jury-packets/{id}`

Delete a jury packet (requires ownership).

**Parameters:**
- `id`: Jury packet ID (path parameter)

**Response (200 OK):**
```json
{
  "message": "Jury packet deleted successfully"
}
```

## Data Structures

### Jury Packet Object
- `id`: Unique packet identifier
- `artist_id`: ID of the artist who owns the packet
- `packet_name`: Name of the jury packet
- `packet_data`: Object containing packet information (see Packet Data Structure)
- `photos_data`: Array of photo objects (see Photos Data Structure)
- `persona_id`: ID of associated artist persona (nullable)
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)

### Packet Data Structure
The `packet_data` object can contain various fields depending on the artist's needs:

**Common Fields:**
- `artist_statement`: Artist's statement about their work
- `bio`: Artist biography
- `exhibition_history`: List of exhibitions and shows
- `awards`: Awards and recognition received
- `education`: Educational background
- `medium`: Primary artistic medium
- `style`: Artistic style or movement
- `themes`: Artistic themes explored
- `techniques`: Techniques and methods used
- `website`: Artist's website URL
- `social_media`: Object with social media links
- `professional_references`: Array of professional references
- `work_description`: Description of submitted work
- `work_dimensions`: Dimensions of the work
- `work_price`: Price of the work
- `availability`: Availability information
- `custom_fields`: Object for additional custom data

**Example:**
```json
{
  "artist_statement": "My work explores...",
  "bio": "Artist biography...",
  "exhibition_history": "2024: Gallery Name\n2023: Another Gallery",
  "awards": "2024: Best in Show\n2023: Emerging Artist",
  "education": "MFA Art, University Name, 2020",
  "medium": "Oil on Canvas",
  "style": "Contemporary Realism",
  "themes": "Nature, Identity, Memory",
  "techniques": "Traditional painting, mixed media",
  "website": "https://artistwebsite.com",
  "social_media": {
    "instagram": "@artisthandle",
    "facebook": "ArtistPage"
  },
  "work_description": "This series explores...",
  "work_dimensions": "24\" x 36\"",
  "work_price": 2500,
  "availability": "Available for purchase",
  "custom_fields": {
    "inspiration": "Nature walks in Oregon",
    "process": "Plein air studies followed by studio work"
  }
}
```

### Photos Data Structure
The `photos_data` array contains objects representing artwork images:

**Photo Object Fields:**
- `id`: Unique photo identifier
- `url`: Image URL
- `title`: Image title
- `description`: Image description
- `medium`: Medium used for the artwork
- `dimensions`: Artwork dimensions
- `year`: Year created
- `price`: Price (optional)
- `is_primary`: Whether this is the primary image
- `order`: Display order
- `tags`: Array of tags
- `metadata`: Object for additional metadata

**Example:**
```json
[
  {
    "id": "artwork_1",
    "url": "/images/portfolio/painting_1.jpg",
    "title": "Sunset Over Mountains",
    "description": "Oil painting capturing the golden hour light",
    "medium": "Oil on Canvas",
    "dimensions": "24\" x 36\"",
    "year": 2024,
    "price": 3500,
    "is_primary": true,
    "order": 1,
    "tags": ["landscape", "oil", "mountains"],
    "metadata": {
      "location": "Mount Hood, Oregon",
      "completion_time": "3 weeks",
      "frame_included": true
    }
  }
]
```

## Validation Rules

### Packet Creation
- `packet_name` is required and cannot be empty
- `packet_name` is automatically trimmed of whitespace
- `persona_id` must belong to the authenticated artist if provided
- `packet_data` defaults to empty object if not provided
- `photos_data` defaults to empty array if not provided

### Packet Updates
- `packet_name` is required and cannot be empty
- Packet must be owned by the authenticated artist
- `persona_id` must belong to the authenticated artist if provided
- All fields are optional except `packet_name`

### Packet Deletion
- Packet must be owned by the authenticated artist
- Deletion is permanent (hard delete)

## Error Responses

### Client Errors (4xx)

**400 Bad Request:**
```json
{
  "error": "Packet name is required"
}
```

```json
{
  "error": "Invalid persona selected"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "error": "Jury packet not found"
}
```

### Server Errors (5xx)

**500 Internal Server Error:**
```json
{
  "error": "Failed to create jury packet"
}
```

```json
{
  "error": "Failed to update jury packet"
}
```

## Rate Limits
- 100 requests per minute per API key for read operations
- 50 requests per minute per API key for write operations

## Example Usage

### Create Basic Jury Packet
```bash
# Create simple jury packet
curl -X POST https://api.beemeeart.com/api/jury-packets \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_name": "Spring Exhibition Submission",
    "packet_data": {
      "artist_statement": "My work explores the relationship between color and emotion...",
      "medium": "Acrylic on Canvas",
      "work_description": "A series of five paintings inspired by seasonal changes"
    }
  }'
```

### Create Comprehensive Jury Packet
```bash
# Create detailed jury packet with photos
curl -X POST https://api.beemeeart.com/api/jury-packets \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_name": "Professional Portfolio 2025",
    "persona_id": 123,
    "packet_data": {
      "artist_statement": "My artistic practice spans over fifteen years...",
      "bio": "Jane Smith is an award-winning contemporary artist...",
      "exhibition_history": "2024: Modern Gallery, Portland\n2023: Art Center, Seattle",
      "awards": "2024: Best in Show, Northwest Art Fair",
      "medium": "Mixed Media Sculpture",
      "style": "Contemporary Abstract",
      "website": "https://janesmithart.com",
      "work_price": 12000
    },
    "photos_data": [
      {
        "id": "main_work",
        "url": "/images/portfolio/sculpture_main.jpg",
        "title": "Convergence Series #3",
        "description": "Large-scale mixed media sculpture",
        "medium": "Steel, Bronze, Glass",
        "dimensions": "8\' x 6\' x 4\'",
        "year": 2024,
        "price": 12000,
        "is_primary": true,
        "order": 1,
        "tags": ["sculpture", "contemporary", "large-scale"]
      }
    ]
  }'
```

### Update Jury Packet
```bash
# Update existing jury packet
curl -X PUT https://api.beemeeart.com/api/jury-packets/123 \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_name": "Updated Portfolio Name",
    "packet_data": {
      "artist_statement": "Updated artist statement with new insights...",
      "work_price": 15000
    }
  }'
```

### Get All Packets
```bash
# Retrieve all jury packets
curl https://api.beemeeart.com/api/jury-packets \
  -H "Authorization: Bearer your_api_key"
```

### Get Specific Packet
```bash
# Get detailed packet information
curl https://api.beemeeart.com/api/jury-packets/123 \
  -H "Authorization: Bearer your_api_key"
```

### Delete Packet
```bash
# Delete jury packet
curl -X DELETE https://api.beemeeart.com/api/jury-packets/123 \
  -H "Authorization: Bearer your_api_key"
```

## Integration Notes

### Artist Persona Integration
- Jury packets can be associated with specific artist personas
- Persona must be owned by the authenticated artist
- Persona information is included in packet listings
- Only active personas can be associated with packets

### Application Integration
- Jury packets are designed for use in event applications
- Packet data provides structured information for jury review
- Photos data includes comprehensive artwork information
- Flexible structure accommodates various application requirements

### Portfolio Management
- Packets serve as organized portfolio collections
- Multiple packets can represent different artistic focuses
- Version control through packet updates
- Comprehensive artwork documentation

## Best Practices

### Packet Organization
- Use descriptive packet names that indicate purpose or theme
- Organize packets by artistic medium, style, or target application
- Keep packet data current and relevant
- Include comprehensive artist statements and work descriptions

### Photo Management
- Use high-quality images for artwork representation
- Include detailed descriptions and metadata for each piece
- Set primary images to represent the packet effectively
- Organize photos in logical display order

### Data Structure
- Use consistent formatting for exhibition history and awards
- Include complete contact and professional information
- Provide accurate dimensions and pricing information
- Utilize custom fields for specific application requirements

### Persona Usage
- Associate packets with appropriate artist personas
- Use personas to organize different artistic identities
- Ensure persona information is current and active
- Leverage personas for targeted applications

## Security Considerations
- Protect API keys and ensure proper authentication
- Verify packet ownership before making modifications
- Validate persona associations to prevent unauthorized access
- Regularly review and audit packet contents
- Secure storage of sensitive artist information

## Future Enhancements

### Advanced Features (Coming Soon)
- **Template System:** Predefined packet templates for common applications
- **Version Control:** Track packet changes and maintain version history
- **Export Features:** Export packets to PDF or other formats
- **Collaboration:** Share packets with galleries or collaborators

### Enhanced Management (Planned)
- **Bulk Operations:** Batch packet operations and management
- **Analytics:** Track packet usage and application success rates
- **Integration APIs:** Connect with external portfolio platforms
- **Advanced Search:** Search and filter packets by various criteria

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Best Practices:** Guidance on effective packet management
- **Updates:** Regular updates on new features and capabilities
- **Community:** Developer community for tips and best practices

## Compliance Notes

### Data Handling
- All packet data handled securely and in compliance with privacy regulations
- Artist information stored with appropriate access controls
- Packet contents protected with proper encryption
- User ownership and access rights strictly enforced

### Access Control
- Strict ownership validation for all packet operations
- Persona associations controlled by ownership rules
- Complete audit trail for all packet modifications
- Secure handling of sensitive artist information

### Data Privacy
- Artist statements and biographical information protected
- Artwork images and metadata secured appropriately
- Professional references and contact information safeguarded
- Compliance with applicable data protection regulations
