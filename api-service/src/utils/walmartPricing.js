/**
 * Walmart Marketplace Pricing Calculator
 * 
 * Pricing rules for Brakebee-as-seller on Walmart:
 * - If wholesale price exists: Walmart price = wholesale × 2
 * - If no wholesale: Walmart price = retail + 20%
 */

/**
 * Calculate Walmart listing price
 * @param {Object} product - Product object with price and wholesale_price
 * @returns {number} Calculated Walmart price
 */
function calculateWalmartPrice(product) {
  const retailPrice = parseFloat(product.price) || 0;
  const wholesalePrice = parseFloat(product.wholesale_price) || 0;
  
  if (wholesalePrice > 0) {
    // Wholesale × 2
    return Math.round(wholesalePrice * 2 * 100) / 100;
  }
  
  // Retail + 20%
  return Math.round(retailPrice * 1.2 * 100) / 100;
}

/**
 * Get pricing breakdown for display
 * @param {Object} product - Product object
 * @returns {Object} Pricing breakdown
 */
function getWalmartPricingBreakdown(product) {
  const retailPrice = parseFloat(product.price) || 0;
  const wholesalePrice = parseFloat(product.wholesale_price) || 0;
  const walmartPrice = calculateWalmartPrice(product);
  
  const usedWholesale = wholesalePrice > 0;
  const basePrice = usedWholesale ? wholesalePrice : retailPrice;
  const multiplier = usedWholesale ? 2 : 1.2;
  const markup = usedWholesale ? '100%' : '20%';
  
  return {
    retail_price: retailPrice,
    wholesale_price: wholesalePrice,
    walmart_price: walmartPrice,
    pricing_method: usedWholesale ? 'wholesale' : 'retail',
    base_price: basePrice,
    multiplier: multiplier,
    markup_percent: markup,
    margin: walmartPrice - basePrice
  };
}

module.exports = {
  calculateWalmartPrice,
  getWalmartPricingBreakdown
};

