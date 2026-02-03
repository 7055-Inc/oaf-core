/**
 * Community Options Data
 * Art styles, interests, and colors for community member profiles
 */

// Art style preferences - visual styles, movements, and aesthetics
export function getArtStylePreferences() {
  return [
    // Classical & Traditional Styles
    'Classical Art', 'Renaissance', 'Baroque', 'Neoclassical', 'Romanticism', 'Realism', 'Academic Art',
    
    // Modern Art Movements
    'Impressionism', 'Post-Impressionism', 'Expressionism', 'Fauvism', 'Cubism', 'Futurism', 'Dadaism',
    'Surrealism', 'Abstract Expressionism', 'Pop Art', 'Minimalism', 'Conceptual Art', 'Op Art',
    
    // Contemporary Styles
    'Contemporary Art', 'Modern Art', 'Neo-Expressionism', 'Street Art', 'Graffiti Art', 'Digital Art Styles',
    'Installation Art', 'Performance Art', 'Video Art', 'New Media Art', 'Bio Art', 'Land Art',
    
    // Cultural & Regional Styles
    'Folk Art', 'Outsider Art', 'Naive Art', 'Primitive Art', 'Tribal Art', 'Asian Art', 'African Art',
    'Latin American Art', 'Indigenous Art', 'Art Brut', 'Lowbrow Art', 'Art Nouveau', 'Art Deco',
    
    // Visual Aesthetics & Approaches
    'Abstract Art', 'Figurative Art', 'Realistic Art', 'Photorealism', 'Hyperrealism', 'Stylized Art',
    'Geometric Art', 'Organic Forms', 'Kinetic Art', 'Light Art', 'Color Field', 'Hard Edge',
    'Trompe-l\'oeil', 'Chiaroscuro', 'Pointillism', 'Collage Aesthetic', 'Mixed Media Styles'
  ].sort();
}

// Art interests - mediums, activities, themes, and subjects
export function getArtInterests() {
  return [
    // Art Mediums & Techniques
    'Painting', 'Drawing', 'Sculpture', 'Photography', 'Printmaking', 'Digital Art', 'Mixed Media',
    'Ceramics', 'Pottery', 'Glass Art', 'Metalworking', 'Woodworking', 'Stone Carving', 'Jewelry Making',
    'Textile Art', 'Fiber Art', 'Quilting', 'Embroidery', 'Weaving', 'Tapestry', 'Calligraphy',
    'Illustration', 'Graphic Design', 'Typography', 'Book Arts', 'Paper Arts', 'Origami', 'Collage',
    
    // Themes & Subjects
    'Portraits', 'Self-Portraits', 'Landscapes', 'Seascapes', 'Cityscapes', 'Still Life', 'Nature Art',
    'Wildlife Art', 'Botanical Art', 'Floral Art', 'Architecture', 'Urban Scenes', 'Rural Scenes',
    'Religious Art', 'Spiritual Art', 'Mythology', 'Fantasy Art', 'Sci-Fi Art', 'Historical Themes',
    'Cultural Art', 'Social Commentary', 'Political Art', 'Environmental Art', 'Abstract Themes',
    
    // Art Activities & Practices
    'Art Collecting', 'Gallery Visits', 'Museum Tours', 'Art Classes', 'Workshops', 'Art Fairs',
    'Art Festivals', 'Studio Visits', 'Artist Talks', 'Art Criticism', 'Art History', 'Art Theory',
    'Art Restoration', 'Art Conservation', 'Art Therapy', 'Art Education', 'Art Teaching',
    'Plein Air Painting', 'Life Drawing', 'Figure Drawing', 'Portrait Sessions', 'Art Journaling',
    'Sketching', 'Urban Sketching', 'Travel Art', 'Art Photography', 'Art Blogging', 'Art Writing',
    
    // Craft & Maker Arts
    'Knitting', 'Crocheting', 'Cross Stitch', 'Needlepoint', 'Beadwork', 'Macrame', 'Leatherwork',
    'Bookbinding', 'Papermaking', 'Candle Making', 'Soap Making', 'Pottery Painting', 'Mosaic',
    'Stained Glass', 'Furniture Making', 'Cabinet Making', 'Toy Making', 'Doll Making', 'Model Making'
  ].sort();
}

// Comprehensive color palette
export function getFavoriteColors() {
  return [
    // Traditional Rainbow Colors
    'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet', 'Purple',
    
    // Extended Primary & Secondary Colors
    'Crimson', 'Scarlet', 'Burgundy', 'Maroon', 'Rose', 'Pink', 'Magenta', 'Fuchsia',
    'Coral', 'Peach', 'Tangerine', 'Amber', 'Gold', 'Lemon', 'Lime', 'Chartreuse',
    'Forest Green', 'Emerald', 'Mint', 'Teal', 'Turquoise', 'Aqua', 'Cyan', 'Sky Blue',
    'Navy', 'Royal Blue', 'Cobalt', 'Periwinkle', 'Lavender', 'Plum', 'Orchid',
    
    // Jewel Tones
    'Ruby', 'Sapphire', 'Emerald Green', 'Amethyst', 'Topaz', 'Garnet', 'Jade',
    'Opal', 'Aquamarine', 'Citrine', 'Peridot', 'Onyx', 'Moonstone', 'Tanzanite',
    
    // Metallic Colors
    'Silver', 'Bronze', 'Copper', 'Platinum', 'Pewter', 'Rose Gold',
    'Antique Gold', 'Brass', 'Chrome', 'Gunmetal', 'Titanium',
    
    // Earth Tones
    'Brown', 'Tan', 'Beige', 'Taupe', 'Khaki', 'Olive', 'Moss', 'Sage',
    'Terracotta', 'Rust', 'Sienna', 'Umber', 'Ochre', 'Clay', 'Sand', 'Stone',
    'Mushroom', 'Driftwood', 'Bark', 'Walnut', 'Chestnut', 'Mahogany',
    
    // Pastels
    'Baby Pink', 'Baby Blue', 'Mint Green', 'Pale Yellow', 'Soft Coral', 'Light Sage', 'Dusty Rose',
    'Champagne', 'Ivory', 'Pearl', 'Vanilla', 'Buttercream', 'Powder Blue', 'Blush', 'Cream',
    
    // Neutrals & Classics
    'White', 'Black', 'Gray', 'Charcoal', 'Slate', 'Ash', 'Dove Gray', 'Storm Gray',
    'Off-White', 'Cream White', 'Bone', 'Eggshell', 'Linen', 'Natural',
    
    // Bold & Vibrant
    'Electric Blue', 'Neon Green', 'Hot Pink', 'Bright Orange', 'Lime Green',
    'Electric Purple', 'Shocking Pink', 'Fluorescent Yellow', 'Vivid Red',
    
    // Deep & Rich Colors
    'Midnight Blue', 'Deep Purple', 'Wine', 'Hunter Green', 'Chocolate',
    'Espresso', 'Jet Black', 'Charcoal Black', 'Deep Teal', 'Dark Olive'
  ].sort();
}
