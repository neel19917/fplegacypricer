/**
 * JSON Helpers for Pricing Data
 * Loads pricing data from JSON file or Airtable
 */

import { loadPricingFromAirtable, isAirtableConfigured } from './airtableHelpers';

/**
 * Load default pricing - tries Airtable first, then falls back to JSON
 */
export async function loadDefaultPricing() {
  // Try Airtable first if configured
  if (isAirtableConfigured()) {
    const airtableData = await loadPricingFromAirtable();
    if (airtableData) {
      console.log('✅ Using pricing from Airtable');
      return airtableData;
    }
    console.log('⚠️ Airtable load failed, falling back to JSON...');
  }

  // Fall back to JSON
  return loadPricingFromJSON();
}

/**
 * Load pricing from public/pricing.json
 */
export async function loadPricingFromJSON() {
  try {
    const response = await fetch('/pricing.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    
    // Validate JSON structure
    if (!jsonData.products) {
      throw new Error('Invalid JSON structure: missing products');
    }
    
    // Convert JSON format to internal SKU format
    const skusByProduct = {
      Freight: { annual: [], monthly: [] },
      Parcel: { annual: [], monthly: [] },
      Ocean: { annual: [], monthly: [] },
      Locations: { annual: [], monthly: [] },
      Support: { annual: [], monthly: [] },
      Auditing: { annual: [], monthly: [] },
      FleetRoute: { annual: [], monthly: [] },
      DockScheduling: { annual: [], monthly: [] },
      VendorPortals: { annual: [], monthly: [] },
      WMS: { annual: [], monthly: [] },
    };
    
    // Map JSON product keys to internal product keys
    const productKeyMap = {
      'freight': 'Freight',
      'parcel': 'Parcel',
      'oceanTracking': 'Ocean',
      'locations': 'Locations',
      'supportPackage': 'Support',
      'auditing': 'Auditing',
      'fleetRouteOptimization': 'FleetRoute',
      'dockScheduling': 'DockScheduling',
      'vendorPortals': 'VendorPortals',
      'wms': 'WMS',
    };
    
    // Process each product
    Object.keys(jsonData.products).forEach(productKey => {
      const product = jsonData.products[productKey];
      const internalKey = productKeyMap[productKey] || productKey;
      
      if (skusByProduct[internalKey]) {
        // Process annual SKUs
        if (product.annual && Array.isArray(product.annual)) {
          product.annual.forEach(sku => {
            const skuObj = convertJSONToSKU(sku, product.pricingType);
            if (skuObj) {
              skusByProduct[internalKey].annual.push(skuObj);
            }
          });
        }
        
        // Process monthly SKUs
        if (product.monthly && Array.isArray(product.monthly)) {
          product.monthly.forEach(sku => {
            const skuObj = convertJSONToSKU(sku, product.pricingType);
            if (skuObj) {
              skusByProduct[internalKey].monthly.push(skuObj);
            }
          });
        }
      }
    });
    
    console.log('✅ Loaded pricing from pricing.json', `(v${jsonData.version})`);
    return skusByProduct;
  } catch (error) {
    console.error('❌ Failed to load pricing from JSON:', error);
    return null;
  }
}

/**
 * Convert JSON SKU format to internal SKU format
 */
function convertJSONToSKU(jsonSku, pricingType) {
  if (!jsonSku.sku || !jsonSku.tier) return null;
  
  const skuObj = {
    sku: jsonSku.sku,
    tier: jsonSku.tier,
    perMonthCost: jsonSku.perMonthCost || 0,
    annualCost: jsonSku.annualCost || 0,
    rangeStart: jsonSku.rangeStart,
    rangeEnd: jsonSku.rangeEnd,
  };
  
  // Add pricingType-specific fields
  if (pricingType === 'volume') {
    skuObj.shipmentsIncluded = jsonSku.shipmentsIncluded || 0;
    skuObj.parcelsIncluded = jsonSku.shipmentsIncluded || 0;
    skuObj.costPerShipment = jsonSku.costPerShipment || 0;
    skuObj.costPerParcel = jsonSku.costPerShipment || 0;
  } else if (pricingType === 'fixed') {
    skuObj.range = [jsonSku.rangeStart, jsonSku.rangeEnd];
  } else if (pricingType === 'custom') {
    skuObj.warehouses = jsonSku.rangeStart;
  }
  
  // Add unitId (from JSON if present, otherwise default to 'shipments')
  skuObj.unitId = jsonSku.unitId || 'shipments';
  
  return skuObj;
}

/**
 * Validate JSON pricing structure
 */
export function validatePricingJSON(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    return { valid: false, error: 'Invalid JSON data' };
  }
  
  if (!jsonData.version) {
    return { valid: false, error: 'Missing version' };
  }
  
  if (!jsonData.products || typeof jsonData.products !== 'object') {
    return { valid: false, error: 'Missing or invalid products object' };
  }
  
  return { valid: true };
}

