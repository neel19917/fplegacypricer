/**
 * Margin Analysis Utilities
 * Calculates margins between customer pricing and our costs
 */

import { computeVolumeBasedCost, computeFixedCost } from './calculations';
import { getPlanBySKU, findSKUForProduct } from './skuHelpers';

/**
 * Calculate margins for parsed screenshot data
 * @param {Array} parsedProducts - Array of parsed products from Claude
 * @param {Object} skuData - SKU data loaded from pricing.json
 * @param {string} subBilling - Current billing frequency ('annual' or 'monthly')
 * @returns {Array} Array of products with margin analysis
 */
export function calculateMargins(parsedProducts, skuData, subBilling) {
  // Map product IDs to SKU data keys
  const productToSKUDataMap = {
    freight: 'Freight',
    parcel: 'Parcel',
    oceanTracking: 'Ocean',
    locations: 'Locations',
    supportPackage: 'Support',
    auditing: 'Auditing',
    fleetRouteOptimization: 'FleetRoute',
    dockScheduling: 'DockScheduling',
    vendorPortals: 'VendorPortals',
    wms: 'WMS',
    aiAgent: 'AIAgent', // Note: AI Agent may need special handling
  };

  return parsedProducts.map((parsedProduct) => {
    const { productId, sku, volume, customerPrice, billingFrequency } = parsedProduct;
    
    // Use billing frequency from screenshot, or fall back to current setting
    const effectiveBilling = billingFrequency || subBilling;
    
    // Handle AI Agent separately (it's not in skuData yet)
    if (productId === 'aiAgent') {
      const tiers = [
        { rangeEnd: 250, annualCost: 3000 },
        { rangeEnd: 500, annualCost: 6000 },
        { rangeEnd: 1000, annualCost: 12000 },
        { rangeEnd: 1500, annualCost: 18000 },
        { rangeEnd: 2000, annualCost: 24000 },
        { rangeEnd: 3000, annualCost: 36000 },
        { rangeEnd: 4000, annualCost: 48000 },
        { rangeEnd: 5000, annualCost: 60000 },
      ];
      const tier = tiers.find(t => volume <= t.rangeEnd);
      if (tier) {
        const ourCost = effectiveBilling === 'annual' ? tier.annualCost : tier.annualCost / 12;
        let normalizedCustomerPrice = customerPrice;
        if (effectiveBilling === 'annual' && customerPrice < 1000) {
          normalizedCustomerPrice = customerPrice * 12;
        } else if (effectiveBilling === 'monthly' && customerPrice > 10000) {
          normalizedCustomerPrice = customerPrice / 12;
        }
        const margin = normalizedCustomerPrice - ourCost;
        const marginPercent = ourCost > 0 ? ((margin / ourCost) * 100) : (normalizedCustomerPrice > 0 ? 100 : 0);
        return {
          ...parsedProduct,
          ourCost,
          customerPrice: normalizedCustomerPrice,
          margin,
          marginPercent,
          plan: { tier: `Tier ${tiers.indexOf(tier) + 1}` },
          error: null,
        };
      } else {
        return {
          ...parsedProduct,
          ourCost: 0,
          margin: customerPrice,
          marginPercent: 100,
          error: 'Volume exceeds available tiers',
        };
      }
    }

    // Get SKU data for this product
    const skuDataKey = productToSKUDataMap[productId];
    if (!skuDataKey || !skuData[skuDataKey]) {
      return {
        ...parsedProduct,
        ourCost: 0,
        margin: customerPrice,
        marginPercent: 100,
        error: 'Product not found in SKU data',
      };
    }

    const skuArray = effectiveBilling === 'annual' 
      ? skuData[skuDataKey].annual 
      : skuData[skuDataKey].monthly;

    if (!skuArray || skuArray.length === 0) {
      return {
        ...parsedProduct,
        ourCost: 0,
        margin: customerPrice,
        marginPercent: 100,
        error: 'No SKU data available for this product',
      };
    }

    // Find the plan/SKU
    let plan = null;
    if (sku) {
      // Use provided SKU
      plan = getPlanBySKU(skuArray, sku);
    } else if (volume > 0) {
      // Try to find SKU based on volume
      const foundSKU = findSKUForProduct(skuArray, volume, productId);
      if (foundSKU) {
        plan = getPlanBySKU(skuArray, foundSKU);
      }
    }

    if (!plan) {
      return {
        ...parsedProduct,
        ourCost: 0,
        margin: customerPrice,
        marginPercent: 100,
        error: 'Could not find matching SKU or plan',
      };
    }

    // Calculate our cost
    let ourCost = 0;
    
    // Determine pricing type based on product
    const isVolumeBased = ['freight', 'parcel', 'oceanTracking', 'dockScheduling'].includes(productId);
    const isFixed = ['locations', 'supportPackage', 'auditing', 'fleetRouteOptimization'].includes(productId);
    
    if (isVolumeBased) {
      const costObj = computeVolumeBasedCost(volume, plan, effectiveBilling);
      ourCost = effectiveBilling === 'annual' ? costObj.annualCost : costObj.monthlyCost;
    } else if (isFixed) {
      const costObj = computeFixedCost(plan, effectiveBilling);
      ourCost = effectiveBilling === 'annual' ? costObj.annualCost : costObj.monthlyCost;
    } else if (productId === 'vendorPortals') {
      // Vendor Portals: $20/month per portal (annual) or $30/month (monthly)
      const rate = effectiveBilling === 'annual' ? 20 : 30;
      ourCost = volume * rate;
      if (effectiveBilling === 'annual') {
        ourCost = ourCost * 12;
      }
    } else if (productId === 'wms') {
      // WMS: $12,000 base + $6,000 per additional warehouse
      if (volume === 1) {
        ourCost = effectiveBilling === 'annual' ? 12000 : 1000;
      } else {
        ourCost = effectiveBilling === 'annual' 
          ? 12000 + (volume - 1) * 6000 
          : 1000 + (volume - 1) * 500;
      }
    }

    // Normalize customer price to match billing frequency
    let normalizedCustomerPrice = customerPrice;
    if (effectiveBilling === 'annual' && customerPrice < 1000) {
      // Likely monthly price, convert to annual
      normalizedCustomerPrice = customerPrice * 12;
    } else if (effectiveBilling === 'monthly' && customerPrice > 10000) {
      // Likely annual price, convert to monthly
      normalizedCustomerPrice = customerPrice / 12;
    }

    // Calculate margin
    const margin = normalizedCustomerPrice - ourCost;
    const marginPercent = ourCost > 0 
      ? ((margin / ourCost) * 100) 
      : (normalizedCustomerPrice > 0 ? 100 : 0);

    return {
      ...parsedProduct,
      ourCost,
      customerPrice: normalizedCustomerPrice,
      margin,
      marginPercent,
      plan,
      error: null,
    };
  });
}

/**
 * Calculate required markup to achieve customer price
 * @param {number} ourCost - Our base cost
 * @param {number} customerPrice - Customer's price
 * @returns {number} Markup percentage
 */
export function calculateRequiredMarkup(ourCost, customerPrice) {
  if (ourCost <= 0) return 0;
  return ((customerPrice - ourCost) / ourCost) * 100;
}

