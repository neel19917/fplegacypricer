/**
 * SKU and pricing tier helper utilities
 */

/**
 * Find the appropriate SKU based on volume and billing
 * @param {object} product - The product configuration object
 * @param {number} volume - The volume/count
 * @param {string} billing - 'annual' or 'monthly'
 * @returns {string} The selected SKU or empty string
 */
export const findSKUForProduct = (product, volume, billing) => {
  if (!product.skus || volume < 1) return '';
  
  const skuArray = billing === 'annual' ? product.skus.annual : product.skus.monthly;
  if (!skuArray || skuArray.length === 0) return '';
  
  let selected;
  
  // Check if SKUs have rangeStart/rangeEnd or range[] array
  const firstSKU = skuArray[0];
  if (firstSKU.rangeStart !== undefined && firstSKU.rangeEnd !== undefined) {
    // Products with rangeStart/rangeEnd (freight, parcel, locations, ocean, support, dock)
    selected = skuArray.find(
      plan => volume >= plan.rangeStart && volume <= plan.rangeEnd
    );
  } else if (firstSKU.range && Array.isArray(firstSKU.range)) {
    // Products with range array (auditing, FRM)
    selected = skuArray.find(
      plan => plan.range && volume >= plan.range[0] && volume <= plan.range[1]
    );
  }
  
  // Fallback to highest tier if volume exceeds all ranges
  return selected ? selected.sku : skuArray[skuArray.length - 1].sku;
};

/**
 * Get a pricing plan by SKU
 * @param {array} skuArray - Array of SKU objects
 * @param {string} sku - The SKU to find
 * @returns {object|null} The plan object or null
 */
export const getPlanBySKU = (skuArray, sku) => {
  if (!skuArray || !sku) return null;
  return skuArray.find(p => p.sku === sku) || null;
};

/**
 * Get the appropriate SKU array based on billing frequency
 * @param {object} product - The product configuration
 * @param {string} billing - 'annual' or 'monthly'
 * @returns {array} Array of SKU objects
 */
export const getSKUArrayByBilling = (product, billing) => {
  if (!product.skus) return [];
  return billing === 'annual' ? product.skus.annual : product.skus.monthly;
};

/**
 * Check if a tier contains "Custom Pricing"
 * @param {object} plan - The pricing plan
 * @returns {boolean} True if custom pricing
 */
export const isCustomPricing = (plan) => {
  return plan && plan.tier && plan.tier.includes('Custom Pricing');
};

/**
 * Check if any plans in an array have custom pricing
 * @param {array} plans - Array of pricing plans
 * @returns {boolean} True if any plan has custom pricing
 */
export const hasCustomPricing = (plans) => {
  return plans.some(plan => isCustomPricing(plan));
};

/**
 * Get tier description for a product
 * @param {object} product - Product configuration
 * @param {object} plan - The selected plan
 * @returns {string} Description string
 */
export const getTierDescription = (product, plan) => {
  if (!product || !product.description) return 'N/A';
  if (typeof product.description === 'function') {
    return product.description(plan);
  }
  return product.description;
};

/**
 * Get tier details for a product
 * @param {object} product - Product configuration
 * @param {object} plan - The selected plan
 * @returns {string} Tier details string
 */
export const getTierDetails = (product, plan) => {
  if (!product || !product.tierDetails) return '';
  if (typeof product.tierDetails === 'function') {
    return product.tierDetails(plan);
  }
  return product.tierDetails;
};

