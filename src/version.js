/**
 * Version Configuration
 * Update this file for each release
 */

export const APP_VERSION = {
  version: '2.3.6',
  releaseDate: '2025-11-06',
  releaseName: 'Opal',
  changelog: [
    'Enhanced tier validation: automatically highlight volumes that exceed ANY tier limits',
    'Fixed parcel tiers not pulling correctly from pricing.json',
    'Updated SKU selection to use loaded JSON data instead of hardcoded SKUs',
    'All products now show red highlighting when volumes exceed tier limits',
    'Consistent error messages across all products: "Volume exceeds tier limits - Custom Pricing Required"',
    'Improved detection for volumes below minimum, above maximum, or between tier gaps',
  ]
};

export const VERSION_HISTORY = [
  {
    version: '2.3.6',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Fixed critical bug: Parcel tiers now correctly pull from pricing.json',
      'Updated findSKUForProduct to use loaded skuData instead of hardcoded product.skus',
      'Enhanced tier validation: detects volumes below minimum, above maximum, or between tier gaps',
      'All products automatically highlight in red when volumes exceed tier limits',
      'Consistent error messaging: "Volume exceeds tier limits - Custom Pricing Required"',
      'Added custom pricing detection to Freight, Ocean Tracking, Support Package, Fleet Route',
      'Improved SKU auto-selection to use actual JSON pricing data',
      'Enhanced debug logging shows SKU array details for troubleshooting',
    ]
  },
  {
    version: '2.3.5',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Added custom pricing detection when volumes exceed highest available tier',
      'Product Configuration Table: Red-highlighted rows with "Request Quote" message',
      'Quote Summary: "Custom Pricing Required" with detailed explanation',
      'Visual indicators: light red background (#fee2e2), red border (#dc2626), red text',
      'Enhanced SKU selection logic to return "CUSTOM_PRICING" for exceeded volumes',
      'Updated calculation functions to handle isCustomPricing flag',
      'Fixed pricing display issues for Core TMS Parcel, Locations, Auditing Module, and Dock Scheduling',
      'Added debug logging to trace SKU auto-selection',
      'Tooltips display helpful message: "Volume of X exceeds max tier Y. Please contact sales."',
      'Input fields get red border when custom pricing is needed',
    ]
  },
  {
    version: '2.3.4',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Improved AI Agent display format for better clarity',
      'Product Configuration now shows tier range: "251-500 Shipments Incl: 100M tokens"',
      'Quote Summary (Plan Details) shows: "100M tokens (251-500 shipments)"',
      'Replaced individual shipment count with tier range (e.g., "1,113 shipments" → "1001-1500 shipments")',
      'More intuitive understanding of pricing tiers',
      'Consistent tier range display across all views',
    ]
  },
  {
    version: '2.3.3',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Fixed critical bug: AI Agent costs not appearing in quote summary ($0.00)',
      'Root cause: Cost calculation checking aiAgentEnabled flag instead of aiAgentTotalVolume',
      'Removed all aiAgentEnabled dependencies from cost calculations',
      'AI Agent now automatically enabled when any checkbox is selected (volume > 0)',
      'Quote summary correctly displays AI Agent costs and tokens',
      'Customer quote items show token allocation',
      'Detailed quote summary shows proper tier and pricing',
      'All functionality validated with 49 passing unit tests',
    ]
  },
  {
    version: '2.3.2',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Fixed critical AI Agent checkbox interaction bug',
      'Root cause: useProductState returning 0 instead of undefined for checkbox fields',
      'Refactored state management to properly handle undefined/true/false states',
      'Added Jest and React Testing Library testing infrastructure',
      'Created comprehensive unit test suite (49 tests, 100% passing)',
      'Extracted reusable ProductCheckbox component',
      'Eliminated code duplication (reduced 180+ lines)',
      'Added debug logging for state tracking',
      'Improved code maintainability and testability',
    ]
  },
  {
    version: '2.3.1',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Added manual product selection for AI Agent via checkboxes',
      'Users can now choose which products (Freight, Parcel, Ocean) contribute to token calculation',
      'Checkboxes disabled when product volume is 0',
      'Dynamic plan description showing token allocation (e.g., "300M tokens | 1,500 shipments | Tier 4")',
      'Enhanced tooltip showing selected products and calculations',
      'Real-time volume and token updates as selections change',
    ]
  },
  {
    version: '2.3.0',
    date: '2025-11-06',
    name: 'Opal',
    features: [
      'Added FreightPOP AI Agent product with token-based pricing',
      'Token allocation based on total shipment volume (Freight + Parcel + Ocean)',
      '8 pricing tiers from $3,000 (50M tokens) to $60,000 (1B tokens)',
      'Auto-calculated volume from enabled shipment products',
      'Smart conditional logic: disabled until Freight, Parcel, or Ocean is enabled',
      'Comprehensive tooltips showing token allocation and volume breakdown',
      'Annual-only subscription',
      'Fully integrated into quote summaries and product configuration',
    ]
  },
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

