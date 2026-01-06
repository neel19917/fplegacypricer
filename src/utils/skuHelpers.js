/**
 * SKU and pricing tier helper utilities
 */

/**
 * Find the appropriate SKU based on volume and billing
 * @param {array} skuArray - The SKU array to search (from skuData, not product.skus)
 * @param {number} volume - The volume/count
 * @param {string} productId - Product ID for logging purposes
 * @returns {string} The selected SKU or 'CUSTOM_PRICING' if volume doesn't match any tier
 */
export const findSKUForProduct = (skuArray, volume, productId = '') => {
  if (!skuArray || skuArray.length === 0 || volume < 1) return '';
  
  let selected;
  let minTier, maxTier;
  
  // Check if SKUs have range[] array or rangeStart/rangeEnd
  const firstSKU = skuArray[0];
  
  // PRIORITY 1: Check for range array first (auditing, FRM use this format)
  if (firstSKU.range && Array.isArray(firstSKU.range)) {
    selected = skuArray.find(
      plan => plan.range && volume >= plan.range[0] && volume <= plan.range[1]
    );
    
    // Get min and max tier ranges for validation
    minTier = firstSKU.range[0];
    maxTier = skuArray[skuArray.length - 1].range[1];
    
    // If no match found, volume doesn't match any tier
    if (!selected) {
      if (volume < minTier) {
        console.warn(`Volume ${volume} is below minimum tier ${minTier} for product ${productId}`);
        return 'CUSTOM_PRICING';
      } else if (volume > maxTier) {
        console.warn(`Volume ${volume} exceeds max tier ${maxTier} for product ${productId}`);
        return 'CUSTOM_PRICING';
      } else {
        // Volume falls between tiers (gap in tier ranges)
        console.warn(`Volume ${volume} doesn't match any tier range for product ${productId}`);
        return 'CUSTOM_PRICING';
      }
    }
  } 
  // PRIORITY 2: Check for rangeStart/rangeEnd (freight, parcel, locations, ocean, support, dock)
  else if (firstSKU.rangeStart !== undefined && firstSKU.rangeEnd !== undefined) {
    selected = skuArray.find(
      plan => volume >= plan.rangeStart && volume <= plan.rangeEnd
    );
    
    // Get min and max tier ranges for validation
    minTier = firstSKU.rangeStart;
    maxTier = skuArray[skuArray.length - 1].rangeEnd;
    
    // If no match found, volume doesn't match any tier
    if (!selected) {
      if (volume < minTier) {
        console.warn(`Volume ${volume} is below minimum tier ${minTier} for product ${productId}`);
        return 'CUSTOM_PRICING';
      } else if (volume > maxTier) {
        console.warn(`Volume ${volume} exceeds max tier ${maxTier} for product ${productId}`);
        return 'CUSTOM_PRICING';
      } else {
        // Volume falls between tiers (gap in tier ranges)
        console.warn(`Volume ${volume} doesn't match any tier range for product ${productId}`);
        return 'CUSTOM_PRICING';
      }
    }
  }
  
  // Return selected SKU (volume matches a tier)
  return selected ? selected.sku : '';
};

/**
 * Get a pricing plan by SKU
 * @param {array} skuArray - Array of SKU objects
 * @param {string} sku - The SKU to find
 * @returns {object|null} The plan object, custom pricing object, or null
 */
export const getPlanBySKU = (skuArray, sku) => {
  if (!skuArray || !sku) return null;
  
  // Handle custom pricing SKU
  if (sku === 'CUSTOM_PRICING') {
    return {
      sku: 'CUSTOM_PRICING',
      tier: 'Custom Pricing Required',
      isCustomPricing: true,
      annualCost: 0,
      monthlyCost: 0,
      perMonthCost: 0,
    };
  }
  
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
 * Check if a volume exceeds the maximum tier for a product
 * @param {object} product - The product configuration
 * @param {number} volume - The volume to check
 * @param {string} billing - 'annual' or 'monthly'
 * @returns {boolean} True if volume exceeds max tier
 */
export const isVolumeAboveMaxTier = (product, volume, billing) => {
  if (!product.skus || volume < 1) return false;
  
  const skuArray = billing === 'annual' ? product.skus.annual : product.skus.monthly;
  if (!skuArray || skuArray.length === 0) return false;
  
  const highestTier = skuArray[skuArray.length - 1];
  
  // Check rangeEnd or range[1]
  if (highestTier.rangeEnd !== undefined) {
    return volume > highestTier.rangeEnd;
  } else if (highestTier.range && Array.isArray(highestTier.range)) {
    return volume > highestTier.range[1];
  }
  
  return false;
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

