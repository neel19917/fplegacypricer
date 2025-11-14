/**
 * Test script for Airtable pricing pull
 * Run with: node test-airtable.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testAirtablePull() {
  console.log('🧪 Testing Airtable Pricing Pull\n');
  console.log('='.repeat(50));
  
  // Check configuration
  console.log('\n📋 Configuration Check:');
  const apiKey = process.env.VITE_AIRTABLE_API_KEY;
  const baseId = process.env.VITE_AIRTABLE_BASE_ID;
  const tableId = process.env.VITE_AIRTABLE_TABLE_ID;
  const useAirtable = process.env.VITE_USE_AIRTABLE !== 'false';
  
  console.log(`  API Key: ${apiKey ? (apiKey.substring(0, 10) + '...') : '❌ Not set'}`);
  console.log(`  Base ID: ${baseId || '❌ Not set'}`);
  console.log(`  Table ID: ${tableId || '❌ Not set'}`);
  console.log(`  Use Airtable: ${useAirtable ? 'Yes' : 'No'}`);
  
  const isConfigured = !!(apiKey && baseId && tableId && useAirtable && apiKey !== 'your_airtable_api_key_here');
  console.log(`  Configured: ${isConfigured ? '✅ Yes' : '❌ No'}\n`);
  
  if (!isConfigured) {
    console.log('⚠️  Airtable is not configured. Please set the following in .env:');
    console.log('   - VITE_AIRTABLE_API_KEY');
    console.log('   - VITE_AIRTABLE_BASE_ID');
    console.log('   - VITE_AIRTABLE_TABLE_ID\n');
    process.exit(1);
  }
  
  // Test fetch directly using Airtable REST API
  console.log('🔄 Fetching pricing from Airtable...\n');
  try {
    // Fetch all records with pagination support
    let allRecords = [];
    let offset = null;
    
    do {
      // Build URL with pagination
      let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?pageSize=100`;
      if (offset) {
        url += `&offset=${offset}`;
      }
      
      console.log(`  Fetching page${offset ? ` (offset: ${offset.substring(0, 20)}...)` : ' (first page)'}...`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('Invalid Airtable response: missing records array');
      }

      allRecords = allRecords.concat(data.records);
      offset = data.offset || null;
      
      console.log(`  ✅ Fetched ${data.records.length} records${offset ? ' (more pages to fetch...)' : ''}`);
    } while (offset);

    console.log(`\n✅ Fetched ${allRecords.length} total records from Airtable\n`);
    
    // Analyze records
    console.log('📊 Record Analysis:');
    
    // Group by Product
    const byProduct = {};
    const byBilling = { Annual: 0, Monthly: 0, Unknown: 0 };
    
    allRecords.forEach(record => {
      const fields = record.fields || {};
      const product = fields.Product || fields.product || fields['Product Name'] || 'Unknown';
      const billing = (fields.Billing || fields.billing || '').toLowerCase();
      
      if (!byProduct[product]) {
        byProduct[product] = { Annual: 0, Monthly: 0 };
      }
      
      if (billing.includes('annual')) {
        byProduct[product].Annual++;
        byBilling.Annual++;
      } else if (billing.includes('monthly')) {
        byProduct[product].Monthly++;
        byBilling.Monthly++;
      } else {
        byBilling.Unknown++;
      }
    });
    
    console.log('\n  By Product:');
    Object.keys(byProduct).sort().forEach(product => {
      const counts = byProduct[product];
      const total = counts.Annual + counts.Monthly;
      if (total > 0) {
        console.log(`    ${product}:`);
        console.log(`      Annual: ${counts.Annual}`);
        console.log(`      Monthly: ${counts.Monthly}`);
        console.log(`      Total: ${total}`);
      }
    });
    
    console.log('\n  By Billing Type:');
    Object.keys(byBilling).forEach(type => {
      if (byBilling[type] > 0) {
        console.log(`    ${type}: ${byBilling[type]}`);
      }
    });
    
    // Show all field names from first record
    if (allRecords.length > 0) {
      console.log('\n📋 Available Fields in Airtable:');
      const firstRecordFields = allRecords[0].fields || {};
      const fieldNames = Object.keys(firstRecordFields);
      fieldNames.forEach((field, index) => {
        const value = firstRecordFields[field];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        const sampleValue = typeof value === 'string' && value.length > 30 
          ? value.substring(0, 30) + '...' 
          : (Array.isArray(value) ? `[${value.length} items]` : value);
        console.log(`  ${index + 1}. ${field} (${valueType}): ${sampleValue}`);
      });
    }
    
    // Check for required fields
    console.log('\n🔍 Field Validation:');
    const requiredFields = ['Product', 'Billing', 'SKU', 'Tier'];
    const firstRecordFields = allRecords[0]?.fields || {};
    const fieldNames = Object.keys(firstRecordFields);
    
    requiredFields.forEach(field => {
      const found = fieldNames.some(f => 
        f.toLowerCase() === field.toLowerCase() || 
        f.toLowerCase().replace(/\s+/g, '') === field.toLowerCase().replace(/\s+/g, '')
      );
      const actualFieldName = fieldNames.find(f => 
        f.toLowerCase() === field.toLowerCase() || 
        f.toLowerCase().replace(/\s+/g, '') === field.toLowerCase().replace(/\s+/g, '')
      );
      console.log(`  ${field}: ${found ? `✅ Found (as "${actualFieldName}")` : '❌ Missing'}`);
    });
    
    // Show sample records from each product
    console.log('\n📦 Sample Records by Product:');
    const productSamples = {};
    allRecords.forEach(record => {
      const fields = record.fields || {};
      const product = fields.Product || fields.product || fields['Product Name'] || 'Unknown';
      if (!productSamples[product] && allRecords.indexOf(record) < 20) {
        productSamples[product] = record;
      }
    });
    
    Object.keys(productSamples).sort().forEach(product => {
      const sample = productSamples[product];
      console.log(`\n  ${product}:`);
      console.log(`    Record ID: ${sample.id}`);
      const fields = sample.fields || {};
      const importantFields = ['Product', 'Billing', 'SKU', 'Tier', 'RangeStart', 'RangeEnd', 
                               'PerMonthCost', 'AnnualCost', 'ShipmentsIncluded', 'CostPerShipment'];
      importantFields.forEach(fieldName => {
        const fieldKey = Object.keys(fields).find(f => 
          f.toLowerCase() === fieldName.toLowerCase() || 
          f.toLowerCase().replace(/\s+/g, '') === fieldName.toLowerCase().replace(/\s+/g, '')
        );
        if (fieldKey) {
          const value = fields[fieldKey];
          console.log(`    ${fieldName}: ${value}`);
        }
      });
    });
    
    // Show first 5 complete records
    console.log('\n📄 First 5 Complete Records:');
    allRecords.slice(0, 5).forEach((record, index) => {
      console.log(`\n  Record ${index + 1} (ID: ${record.id}):`);
      const fields = record.fields || {};
      Object.keys(fields).forEach(key => {
        const value = fields[key];
        let displayValue;
        if (Array.isArray(value)) {
          displayValue = `[${value.length} items] ${JSON.stringify(value.slice(0, 2))}...`;
        } else if (typeof value === 'string' && value.length > 60) {
          displayValue = value.substring(0, 60) + '...';
        } else {
          displayValue = value;
        }
        console.log(`    ${key}: ${displayValue}`);
      });
      // Show unit id if present
      const unitId = fields.fldkAalvp6FUsOLas || fields['fldkAalvp6FUsOLas'];
      if (unitId) {
        console.log(`    ⭐ Unit ID (fldkAalvp6FUsOLas): ${unitId}`);
      }
    });
    
    // Show conversion test
    console.log('\n🔄 Testing Data Conversion:');
    try {
      // Simulate the conversion function
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

      let convertedCount = 0;
      let skippedCount = 0;
      const skippedReasons = {};

      allRecords.forEach(record => {
        const fields = record.fields || {};
        // Use actual Airtable field names
        const productName = fields.Product || fields.product || fields['Product Name'] || fields['Product name'] || '';
        const billing = (fields.Billing || fields.billing || '').toLowerCase();
        const sku = fields.SKU || fields.sku || fields['Product SKU'] || '';
        const tier = fields.Tier || fields.tier || '';

        if (!productName || !sku || !tier) {
          skippedCount++;
          const reason = !productName ? 'Missing Product' : (!sku ? 'Missing SKU' : 'Missing Tier');
          skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
          return;
        }

        // Extract product type from product name (handle "Freight Enterprise 3" -> "Freight")
        let internalKey = null;
        if (productNameMap[productName]) {
          internalKey = productNameMap[productName];
        } else {
          const productNameLower = productName.toLowerCase();
          for (const [key, value] of Object.entries(productNameMap)) {
            if (productNameLower.startsWith(key.toLowerCase())) {
              internalKey = value;
              break;
            }
          }
        }

        if (!internalKey || !skusByProduct[internalKey]) {
          skippedCount++;
          skippedReasons[`Unknown Product: ${productName}`] = (skippedReasons[`Unknown Product: ${productName}`] || 0) + 1;
          return;
        }

        // Determine billing type (default to annual if not specified)
        let billingType = 'annual';
        if (billing) {
          billingType = billing.includes('annual') ? 'annual' : 'monthly';
        }

        convertedCount++;
        const rangeStart = parseFloat(fields['Range Start'] || fields.RangeStart || 0);
        const rangeEnd = parseFloat(fields['Range End'] || fields.RangeEnd || 0);
        const perMonthCost = parseFloat(fields['Per Month Cost'] || fields.PerMonthCost || 0);
        const annualCost = parseFloat(fields['Per Annual Cost'] || fields['Annual Cost'] || fields.AnnualCost || 0);
        // Get unitId from field ID or field name
        const unitId = fields.fldkAalvp6FUsOLas || fields['fldkAalvp6FUsOLas'] || fields['Volume Type'] || fields['volume type'] || '';
        const shipmentsIncluded = parseFloat(fields['Shipments Included'] || fields.ShipmentsIncluded || 0);
        // Use rangeEnd as shipmentsIncluded if shipmentsIncluded is not provided
        const effectiveShipmentsIncluded = shipmentsIncluded > 0 ? shipmentsIncluded : (rangeEnd || 0);

        const skuObj = {
          sku: sku,
          tier: tier,
          rangeStart: rangeStart || undefined,
          rangeEnd: rangeEnd || undefined,
          perMonthCost: perMonthCost,
          annualCost: annualCost || (perMonthCost * 12),
        };

        if (effectiveShipmentsIncluded > 0) {
          skuObj.shipmentsIncluded = effectiveShipmentsIncluded;
        }
        // Always set unitId (from Airtable or default)
        skuObj.unitId = unitId || 'shipments';
        
        // Debug logging
        if (unitId) {
          console.log(`  ✅ Found unitId "${unitId}" for SKU ${sku}`);
        } else {
          console.log(`  ⚠️ No unitId found for SKU ${sku}, using default "shipments"`);
        }

        skusByProduct[internalKey][billingType].push(skuObj);
      });

      console.log(`  Converted: ${convertedCount} records`);
      console.log(`  Skipped: ${skippedCount} records`);
      if (Object.keys(skippedReasons).length > 0) {
        console.log('  Skip Reasons:');
        Object.keys(skippedReasons).forEach(reason => {
          console.log(`    ${reason}: ${skippedReasons[reason]}`);
        });
      }

      console.log('\n  Converted SKUs by Product:');
      Object.keys(skusByProduct).forEach(productKey => {
        const annualCount = skusByProduct[productKey].annual.length;
        const monthlyCount = skusByProduct[productKey].monthly.length;
        if (annualCount > 0 || monthlyCount > 0) {
          console.log(`    ${productKey}: ${annualCount} annual, ${monthlyCount} monthly`);
        }
      });

    } catch (error) {
      console.log(`  ❌ Conversion test failed: ${error.message}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify the field names match your Airtable table');
    console.log('   2. Ensure all required fields are present');
    console.log('   3. Check that Product names match expected values');
    console.log('   4. Test the refresh button in the app UI\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testAirtablePull();

