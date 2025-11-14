/**
 * Airtable Helpers for Pricing Data
 * Loads pricing data from Airtable table
 */

/**
 * Check if Airtable is configured and enabled
 */
export function isAirtableConfigured() {
  const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
  const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID;
  const useAirtable = import.meta.env.VITE_USE_AIRTABLE !== 'false';
  
  return !!(apiKey && baseId && tableId && useAirtable && apiKey !== 'your_airtable_api_key_here');
}

/**
 * Load pricing data from Airtable
 * Uses Airtable REST API (browser-compatible)
 */
export async function loadPricingFromAirtable() {
  if (!isAirtableConfigured()) {
    console.log('ℹ️ Airtable not configured, skipping...');
    return null;
  }

  const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
  const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
  const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID;

  try {
    console.log('🔄 Fetching pricing from Airtable...');
    
    // Fetch all records with pagination support
    let allRecords = [];
    let offset = null;
    
    do {
      // Build URL with pagination
      let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?pageSize=100`;
      if (offset) {
        url += `&offset=${offset}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('Invalid Airtable response: missing records array');
      }

      allRecords = allRecords.concat(data.records);
      offset = data.offset || null;
      
      console.log(`📥 Fetched ${data.records.length} records${offset ? ' (more pages to fetch...)' : ''}`);
    } while (offset);

    console.log(`✅ Fetched ${allRecords.length} total records from Airtable`);
    
    // Convert Airtable records to internal SKU format
    const skusByProduct = convertAirtableToSKUFormat(allRecords);
    
    // Validate the converted data
    const validation = validateAirtableData(skusByProduct);
    if (!validation.valid) {
      throw new Error(`Invalid Airtable data: ${validation.error}`);
    }

    console.log('✅ Successfully loaded pricing from Airtable');
    return skusByProduct;
  } catch (error) {
    console.error('❌ Failed to load pricing from Airtable:', error);
    return null;
  }
}

/**
 * Convert Airtable records to internal SKU format
 */
function convertAirtableToSKUFormat(records) {
  // Initialize SKU structure
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

  // Map Airtable product names/prefixes to internal product keys
  const productNameMap = {
    'Core TMS – Freight': 'Freight',
    'Core TMS – Parcel': 'Parcel',
    'Ocean Tracking': 'Ocean',
    'Locations': 'Locations',
    'Support Package': 'Support',
    'Auditing Module': 'Auditing',
    'Fleet Route Optimization': 'FleetRoute',
    'Dock Scheduling': 'DockScheduling',
    'Vendor Portals': 'VendorPortals',
    'WMS': 'WMS',
    // Also handle product names that start with these prefixes
    'Freight': 'Freight',
    'Parcel': 'Parcel',
    'Ocean': 'Ocean',
    'Fleet Route': 'FleetRoute',
    'Fleet': 'FleetRoute',
    'Dock': 'DockScheduling',
    'Vendor': 'VendorPortals',
  };

  // Process each Airtable record
  records.forEach(record => {
    const fields = record.fields || {};
    
    // Extract field values (handle different field name variations)
    const productName = fields.Product || fields.product || fields['Product Name'] || fields['Product name'] || '';
    const billing = (fields.Billing || fields.billing || '').toLowerCase();
    const sku = fields.SKU || fields.sku || fields['Product SKU'] || fields['Product SKU'] || '';
    const tier = fields.Tier || fields.tier || '';
    const rangeStart = parseFloat(fields.RangeStart || fields['Range Start'] || fields.rangeStart || 0);
    const rangeEnd = parseFloat(fields.RangeEnd || fields['Range End'] || fields.rangeEnd || 0);
    const perMonthCost = parseFloat(fields.PerMonthCost || fields['Per Month Cost'] || fields['PerMonthCost'] || fields.perMonthCost || 0);
    const annualCost = parseFloat(fields.AnnualCost || fields['Annual Cost'] || fields['Per Annual Cost'] || fields.annualCost || 0);
    const shipmentsIncluded = parseFloat(fields.ShipmentsIncluded || fields['Shipments Included'] || fields.shipmentsIncluded || 0);
    const costPerShipment = parseFloat(fields.CostPerShipment || fields['Cost Per Shipment'] || fields.costPerShipment || 0);
    // Get unit id from field fldkAalvp6FUsOLas (field ID) or "Volume Type" (field name)
    const unitId = fields.fldkAalvp6FUsOLas || fields['fldkAalvp6FUsOLas'] || fields['Volume Type'] || fields['volume type'] || '';
    
    // Debug logging for unitId
    if (record.id && !unitId) {
      console.log('[Airtable] No unitId found for record:', record.id, 'Available fields:', Object.keys(fields));
    }

    // Skip invalid records
    if (!productName || !sku || !tier) {
      console.warn('⚠️ Skipping invalid Airtable record:', record.id, { productName, sku, tier });
      return;
    }

    // Extract product type from product name
    // Handle cases like "Freight Enterprise 3" -> "Freight"
    let internalKey = null;
    
    // First try exact match
    if (productNameMap[productName]) {
      internalKey = productNameMap[productName];
    } else {
      // Try to match by prefix
      const productNameLower = productName.toLowerCase();
      for (const [key, value] of Object.entries(productNameMap)) {
        if (productNameLower.startsWith(key.toLowerCase())) {
          internalKey = value;
          break;
        }
      }
    }

    if (!internalKey || !skusByProduct[internalKey]) {
      console.warn(`⚠️ Unknown product "${productName}", skipping...`);
      return;
    }

    // Determine billing type
    // If no explicit billing field, check if there's a billing column or default to annual
    // For now, default to annual if not specified (can be enhanced later)
    let billingType = 'annual';
    if (billing) {
      billingType = billing.includes('annual') ? 'annual' : 'monthly';
    } else {
      // Try to infer from other fields or default to annual
      // You might want to add a Billing field to Airtable or use another indicator
      billingType = 'annual'; // Default to annual
    }
    
    // Create SKU object
    const skuObj = {
      sku: sku,
      tier: tier,
      perMonthCost: perMonthCost,
      annualCost: annualCost || (perMonthCost * 12), // Calculate annual if not provided
      rangeStart: rangeStart || undefined,
      rangeEnd: rangeEnd || undefined,
    };

    // Add range array for fixed pricing products
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      skuObj.range = [rangeStart, rangeEnd];
    }

    // Add volume-based fields if present
    // Use rangeEnd as shipmentsIncluded if shipmentsIncluded is not provided
    const effectiveShipmentsIncluded = shipmentsIncluded > 0 ? shipmentsIncluded : (rangeEnd || 0);
    if (effectiveShipmentsIncluded > 0) {
      skuObj.shipmentsIncluded = effectiveShipmentsIncluded;
      skuObj.parcelsIncluded = effectiveShipmentsIncluded;
    }
    if (costPerShipment > 0) {
      skuObj.costPerShipment = costPerShipment;
      skuObj.costPerParcel = costPerShipment;
    }

    // Add unit id - always set it (from Airtable or default to 'shipments')
    skuObj.unitId = unitId || 'shipments';
    
    // Debug logging
    if (unitId) {
      console.log('[Airtable] Set unitId for SKU:', sku, 'unitId:', unitId);
    }

    // Add to appropriate array
    skusByProduct[internalKey][billingType].push(skuObj);
  });

  // Sort SKUs by rangeStart for each product/billing combination
  Object.keys(skusByProduct).forEach(productKey => {
    ['annual', 'monthly'].forEach(billingType => {
      skusByProduct[productKey][billingType].sort((a, b) => {
        const aStart = a.rangeStart || (a.range && a.range[0]) || 0;
        const bStart = b.rangeStart || (b.range && b.range[0]) || 0;
        return aStart - bStart;
      });
    });
  });

  return skusByProduct;
}

/**
 * Validate converted Airtable data structure
 */
function validateAirtableData(skusByProduct) {
  if (!skusByProduct || typeof skusByProduct !== 'object') {
    return { valid: false, error: 'Invalid data structure' };
  }

  // Check that we have at least some SKUs
  let totalSKUs = 0;
  Object.keys(skusByProduct).forEach(productKey => {
    if (skusByProduct[productKey].annual) {
      totalSKUs += skusByProduct[productKey].annual.length;
    }
    if (skusByProduct[productKey].monthly) {
      totalSKUs += skusByProduct[productKey].monthly.length;
    }
  });

  if (totalSKUs === 0) {
    return { valid: false, error: 'No SKUs found in Airtable data' };
  }

  return { valid: true };
}

