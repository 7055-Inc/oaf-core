/**
 * Artist Options Data
 * Product categories and art mediums for artist profile forms
 */

// Product categories (matches vendor categories)
export function getProductCategories() {
  return [
    // Top-level categories
    { id: 62, name: 'Wall Art', parent_id: null },
    { id: 4, name: 'Sculpture', parent_id: null },
    { id: 7, name: 'Earthen Materials', parent_id: null },
    { id: 8, name: 'Mixed Media', parent_id: null },
    { id: 9, name: 'Digital Arts', parent_id: null },
    { id: 10, name: 'Textiles', parent_id: null },
    { id: 11, name: 'Printmaking', parent_id: null },
    
    // Wall Art subcategories
    { id: 3, name: 'Paintings', parent_id: 62 },
    { id: 5, name: 'Drawing/Sketching', parent_id: 62 },
    { id: 6, name: 'Photography', parent_id: 62 },
    
    // Painting subcategories
    { id: 21, name: 'Oil', parent_id: 3 },
    { id: 22, name: 'Watercolor', parent_id: 3 },
    { id: 23, name: 'Acrylic', parent_id: 3 },
    { id: 24, name: 'Other Painting', parent_id: 3 },
    
    // Sculpture subcategories
    { id: 25, name: 'Metal', parent_id: 4 },
    { id: 26, name: 'Glass', parent_id: 4 },
    { id: 27, name: 'Fiber', parent_id: 4 },
    { id: 28, name: 'Recycled', parent_id: 4 },
    { id: 29, name: 'Modern Materials', parent_id: 4 },
    
    // Drawing subcategories
    { id: 32, name: 'Pencil', parent_id: 5 },
    { id: 33, name: 'Pastel', parent_id: 5 },
    { id: 34, name: 'Pen/Marker', parent_id: 5 },
    { id: 35, name: 'Other Drawing', parent_id: 5 },
    
    // Photography subcategories
    { id: 36, name: 'Scenery', parent_id: 6 },
    { id: 37, name: 'Wildlife', parent_id: 6 },
    { id: 38, name: 'Regional', parent_id: 6 },
    { id: 39, name: 'Landscape', parent_id: 6 },
    { id: 40, name: 'Other Nature', parent_id: 6 },
    { id: 41, name: 'Urban', parent_id: 6 },
    { id: 42, name: 'Human', parent_id: 6 },
    { id: 43, name: 'Micro/Macro', parent_id: 6 },
    { id: 44, name: 'Digital', parent_id: 6 },
    
    // Earthen Materials subcategories
    { id: 45, name: 'Wood', parent_id: 7 },
    { id: 46, name: 'Clay', parent_id: 7 },
    { id: 47, name: 'Stone', parent_id: 7 },
    { id: 48, name: 'Natural Fiber', parent_id: 7 },
    
    // Digital Arts subcategories
    { id: 50, name: 'Illustration', parent_id: 9 },
    { id: 51, name: 'Animation', parent_id: 9 },
    { id: 52, name: '3D Modeling', parent_id: 9 },
    
    // Textiles subcategories
    { id: 54, name: 'Weaving', parent_id: 10 },
    { id: 55, name: 'Embroidery', parent_id: 10 },
    { id: 56, name: 'Quilting', parent_id: 10 },
    
    // Printmaking subcategories
    { id: 58, name: 'Etching', parent_id: 11 },
    { id: 59, name: 'Lithography', parent_id: 11 },
    { id: 60, name: 'Screen Printing', parent_id: 11 }
  ];
}

// Art mediums and materials
export function getArtMediums() {
  return [
    // Traditional Painting
    'Oil Paint', 'Acrylic Paint', 'Watercolor', 'Gouache', 'Tempera', 'Encaustic',
    
    // Drawing Materials
    'Graphite Pencil', 'Charcoal', 'Pastel', 'Oil Pastel', 'Colored Pencil', 'Ink', 'Marker', 'Pen',
    
    // Printmaking
    'Etching', 'Lithography', 'Screen Print', 'Woodcut', 'Linocut', 'Monotype', 'Digital Print',
    
    // Sculpture Materials
    'Bronze', 'Aluminum', 'Steel', 'Iron', 'Copper', 'Silver', 'Gold', 'Brass',
    'Marble', 'Granite', 'Limestone', 'Sandstone', 'Slate', 'Soapstone',
    'Oak', 'Pine', 'Cedar', 'Walnut', 'Cherry', 'Bamboo', 'Reclaimed Wood',
    'Clay', 'Ceramic', 'Porcelain', 'Stoneware', 'Earthenware', 'Terracotta',
    'Glass', 'Blown Glass', 'Fused Glass', 'Stained Glass',
    'Plastic', 'Resin', 'Fiberglass', 'Vinyl', 'Acrylic Sheet',
    
    // Fiber Arts
    'Cotton', 'Wool', 'Silk', 'Linen', 'Hemp', 'Jute', 'Synthetic Fiber',
    'Yarn', 'Thread', 'Embroidery Floss', 'Wire', 'Rope',
    
    // Mixed Media
    'Collage', 'Found Objects', 'Recycled Materials', 'Paper', 'Cardboard',
    'Fabric', 'Leather', 'Rubber', 'Cork', 'Foam',
    
    // Digital/Modern
    'Digital Media', '3D Printing Filament', 'LED', 'Electronics', 'Video',
    'Photography', 'Digital Illustration', 'AR/VR',
    
    // Jewelry & Small Crafts
    'Precious Metals', 'Semi-Precious Stones', 'Beads', 'Pearls', 'Crystals',
    'Enamel', 'Polymer Clay', 'Wax', 'Resin Casting',
    
    // Specialty Materials
    'Mosaic Tiles', 'Mirror', 'Concrete', 'Plaster', 'Papier-Mâché',
    'Feathers', 'Shells', 'Bone', 'Horn', 'Natural Elements'
  ].sort();
}
