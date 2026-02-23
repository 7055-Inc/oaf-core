/**
 * Wholesale Pricing Addon
 * Provides volume tier pricing calculation, display, and customer verification
 * for wholesale buyer integration on vendor sites.
 */

class WholesalePricingAddon {
  constructor(siteConfig) {
    this.siteConfig = siteConfig;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Calculate the effective wholesale price based on quantity and tier schedule.
   * @param {number} basePrice - The base wholesale_price (single item)
   * @param {number} quantity - Order quantity
   * @param {Array|string|null} tiers - Pricing tiers JSON or array
   * @returns {{ price: number, tierLabel: string }}
   */
  calculateWholesalePrice(basePrice, quantity, tiers) {
    let price = parseFloat(basePrice);
    let tierLabel = 'Single Item';

    if (!tiers) return { price, tierLabel };

    let parsed;
    try {
      parsed = typeof tiers === 'string' ? JSON.parse(tiers) : tiers;
    } catch {
      return { price, tierLabel };
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return { price, tierLabel };

    const sorted = [...parsed].sort((a, b) => a.min_qty - b.min_qty);
    for (const tier of sorted) {
      if (quantity >= tier.min_qty && tier.price != null) {
        price = parseFloat(tier.price);
        tierLabel = tier.label || `${tier.min_qty}+`;
      }
    }

    return { price, tierLabel };
  }

  /**
   * Build a display-ready tier schedule for a product.
   * @param {Object} product - Product with wholesale_price and wholesale_pricing_tiers
   * @returns {Array<{ label: string, minQty: number, price: number, savingsPercent: number }>}
   */
  displayWholesalePricing(product) {
    if (!product || !product.wholesale_price) return [];

    const basePrice = parseFloat(product.wholesale_price);
    const schedule = [{ label: 'Single Item', minQty: 1, price: basePrice, savingsPercent: 0 }];

    let tiers;
    try {
      tiers = typeof product.wholesale_pricing_tiers === 'string'
        ? JSON.parse(product.wholesale_pricing_tiers)
        : product.wholesale_pricing_tiers;
    } catch {
      return schedule;
    }

    if (!Array.isArray(tiers)) return schedule;

    const sorted = [...tiers]
      .filter(t => t.min_qty && t.price != null)
      .sort((a, b) => a.min_qty - b.min_qty);

    for (const tier of sorted) {
      const tierPrice = parseFloat(tier.price);
      const savingsPercent = basePrice > 0
        ? Math.round(((basePrice - tierPrice) / basePrice) * 100)
        : 0;

      schedule.push({
        label: tier.label || `${tier.min_qty}+`,
        minQty: tier.min_qty,
        price: tierPrice,
        savingsPercent
      });
    }

    return schedule;
  }

  /**
   * Check if a user has the wholesale permission.
   * @param {Object} userData - User data with permissions array
   * @returns {boolean}
   */
  verifyWholesaleCustomer(userData) {
    if (!userData) return false;
    if (userData.permissions && Array.isArray(userData.permissions)) {
      return userData.permissions.includes('wholesale');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.WholesalePricingAddon = WholesalePricingAddon;
}

export default WholesalePricingAddon;
