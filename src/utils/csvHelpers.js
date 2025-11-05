/**
 * CSV Helpers for Pricing Import/Export
 * Allows updating pricing data via CSV files
 */

import * as skus from '../skus.js';

/**
 * Convert all SKU data to CSV format
 */
export function exportSKUsToCSV() {
  const rows = [];
  
  // CSV Header
  rows.push([
    'Product',
    'SKU',
    'Tier',
    'Billing',
    'Monthly Cost',
    'Annual Cost',
    'Range Start',
    'Range End',
    'Shipments Included',
    'Cost Per Unit',
    'Notes'
  ].join(','));

  // Helper to add rows for a product
  const addProductRows = (productName, annualSKUs, monthlySKUs) => {
    // Annual SKUs
    if (annualSKUs) {
      annualSKUs.forEach(sku => {
        rows.push([
          productName,
          sku.sku,
          sku.tier,
          'annual',
          sku.perMonthCost || '',
          sku.annualCost || '',
          sku.rangeStart || sku.range?.[0] || '',
          sku.rangeEnd || sku.range?.[1] || '',
          sku.shipmentsIncluded || sku.parcelsIncluded || '',
          sku.costPerShipment || sku.costPerParcel || '',
          ''
        ].join(','));
      });
    }
    
    // Monthly SKUs
    if (monthlySKUs) {
      monthlySKUs.forEach(sku => {
        rows.push([
          productName,
          sku.sku,
          sku.tier,
          'monthly',
          sku.perMonthCost || '',
          sku.annualCost || (sku.perMonthCost * 12) || '',
          sku.rangeStart || sku.range?.[0] || '',
          sku.rangeEnd || sku.range?.[1] || '',
          sku.shipmentsIncluded || sku.parcelsIncluded || '',
          sku.costPerShipment || sku.costPerParcel || '',
          ''
        ].join(','));
      });
    }
  };

  // Add all products
  addProductRows('Freight', skus.freightAnnualSKUs, skus.freightMonthlySKUs);
  addProductRows('Parcel', skus.parcelAnnualSKUs, skus.parcelMonthlySKUs);
  addProductRows('Ocean', skus.oceanTrackingAnnualSKUs, skus.oceanTrackingMonthlySKUs);
  addProductRows('Locations', skus.locationsAnnualSKUs, skus.locationsMonthlySKUs);
  addProductRows('Support', skus.supportPackageAnnualSKUs, skus.supportPackageMonthlySKUs);
  addProductRows('Auditing', skus.auditingAnnualSKUs, skus.auditingMonthlySKUs);
  addProductRows('FleetRoute', skus.fleetRouteOptimizationAnnualSKUs, skus.fleetRouteOptimizationMonthlySKUs);
  addProductRows('DockScheduling', skus.dockSchedulingAnnualSKUs, skus.dockSchedulingMonthlySKUs);

  return rows.join('\n');
}

/**
 * Download CSV file to user's computer
 */
export function downloadCSV(csvContent, filename = 'pricing_data.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parse CSV content and return structured data
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Convert parsed CSV data back to SKU format
 */
export function csvToSKUs(parsedData) {
  const skusByProduct = {};
  
  parsedData.forEach(row => {
    const product = row.Product;
    const billing = row.Billing;
    
    if (!skusByProduct[product]) {
      skusByProduct[product] = {
        annual: [],
        monthly: []
      };
    }
    
    const skuObj = {
      sku: row.SKU,
      tier: row.Tier,
      perMonthCost: parseFloat(row['Monthly Cost']) || 0,
      annualCost: parseFloat(row['Annual Cost']) || 0,
      rangeStart: row['Range Start'] ? parseInt(row['Range Start']) : undefined,
      rangeEnd: row['Range End'] ? (row['Range End'] === 'Infinity' || row['Range End'] === '+' ? Infinity : parseInt(row['Range End'])) : undefined,
    };
    
    // Add product-specific fields
    if (row['Shipments Included']) {
      const shipments = parseInt(row['Shipments Included']);
      skuObj.shipmentsIncluded = shipments;
      skuObj.parcelsIncluded = shipments; // For parcel products
    }
    
    if (row['Cost Per Unit']) {
      const costPerUnit = parseFloat(row['Cost Per Unit']);
      skuObj.costPerShipment = costPerUnit;
      skuObj.costPerParcel = costPerUnit;
    }
    
    // Handle range format (for some products)
    if (skuObj.rangeStart !== undefined && skuObj.rangeEnd !== undefined) {
      skuObj.range = [skuObj.rangeStart, skuObj.rangeEnd];
    }
    
    if (billing === 'annual') {
      skusByProduct[product].annual.push(skuObj);
    } else {
      skusByProduct[product].monthly.push(skuObj);
    }
  });
  
  return skusByProduct;
}

/**
 * Apply imported SKU data to the app
 * This creates a new SKUs object that can replace the imported one
 */
export function applySKUData(skusByProduct) {
  const newSKUs = {};
  
  // Map product names to SKU variable names
  const productMap = {
    'Freight': {
      annual: 'freightAnnualSKUs',
      monthly: 'freightMonthlySKUs'
    },
    'Parcel': {
      annual: 'parcelAnnualSKUs',
      monthly: 'parcelMonthlySKUs'
    },
    'Ocean': {
      annual: 'oceanTrackingAnnualSKUs',
      monthly: 'oceanTrackingMonthlySKUs'
    },
    'Locations': {
      annual: 'locationsAnnualSKUs',
      monthly: 'locationsMonthlySKUs'
    },
    'Support': {
      annual: 'supportPackageAnnualSKUs',
      monthly: 'supportPackageMonthlySKUs'
    },
    'Auditing': {
      annual: 'auditingAnnualSKUs',
      monthly: 'auditingMonthlySKUs'
    },
    'FleetRoute': {
      annual: 'fleetRouteOptimizationAnnualSKUs',
      monthly: 'fleetRouteOptimizationMonthlySKUs'
    },
    'DockScheduling': {
      annual: 'dockSchedulingAnnualSKUs',
      monthly: 'dockSchedulingMonthlySKUs'
    }
  };
  
  // Apply the mapped data
  Object.keys(skusByProduct).forEach(productName => {
    const mapping = productMap[productName];
    if (mapping) {
      newSKUs[mapping.annual] = skusByProduct[productName].annual;
      newSKUs[mapping.monthly] = skusByProduct[productName].monthly;
    }
  });
  
  return newSKUs;
}

