/**
 * Version Configuration
 * Update this file for each release
 */

export const APP_VERSION = {
  version: '2.2.0',
  releaseDate: '2025-11-06',
  releaseName: 'Marble',
  changelog: [
    'Migrated from CSV to JSON storage',
    'Cleaner, structured pricing data',
    'Faster loading with native JSON parsing',
    'Better maintainability',
  ]
};

export const VERSION_HISTORY = [
  {
    version: '2.2.0',
    date: '2025-11-06',
    name: 'Marble',
    features: [
      'Migrated pricing storage from CSV to JSON',
      'Structured pricing data with better organization',
      'Native JSON parsing for faster load times',
      'Type-safe number values (not strings)',
      'Easier to maintain and update',
      'Metadata support (version, lastUpdated)',
    ]
  },
  {
    version: '2.1.2',
    date: '2025-11-06',
    name: 'Marble',
    features: [
      'Simplified WMS to standard volume-based input (same as other products)',
      'Removed ERP integration dropdown - implementation fees added manually',
      'Removed CSV import/export UI for simpler interface',
      'Cleaner product configuration section',
    ]
  },
  {
    version: '2.1.1',
    date: '2025-11-06',
    name: 'Marble',
    features: [
      'Added WMS product with warehouse-based pricing',
      'Annual-only WMS subscription ($12,000 base + $6,000 per additional warehouse)',
      'Implementation fee options: $5,000 (Standard ERP) or $6,000 (Non-Standard ERP)',
      'Tooltips explaining ERP support (NetSuite, Acumatica, Syspro)',
      'Integrated into all quote views and calculations',
    ]
  },
  {
    version: '2.1.0',
    date: '2025-11-05',
    name: 'Marble',
    features: [
      'CSV-based pricing system',
      'Loads all pricing from public/defaultPricing.csv',
      'Complete pricing database with all products',
      'Fallback to hardcoded SKUs if CSV fails',
      'Update pricing without code changes',
    ]
  },
  {
    version: '2.0.0',
    date: '2025-11-05',
    name: 'Granite',
    features: [
      'Expanded to 9 granular pricing models',
      'Advanced filtering with search and model toggles',
      'CSV import/export for bulk pricing updates',
      'Improved UI organization and grouping',
      'Better product categorization',
    ]
  },
  {
    version: '1.0.0',
    date: '2025-10-15',
    name: 'Foundation',
    features: [
      'Initial pricing calculator',
      'Product configuration',
      'Basic SKU management',
      'PDF export functionality',
    ]
  },
];

