# Changelog

All notable changes to the FreightPOP Legacy Pricer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.6] - 2025-11-06

### Fixed
- **Critical Bug Fix**: Parcel tiers now correctly pull from `pricing.json` instead of hardcoded SKUs
- Fixed SKU auto-selection to use loaded JSON data (`skuData`) instead of hardcoded `product.skus`
- Improved tier validation to detect volumes that don't match any tier range

### Enhanced
- **Automatic Tier Validation**: All products now automatically highlight in red when volumes exceed tier limits
- Enhanced detection for volumes below minimum, above maximum, or falling between tier gaps
- Added custom pricing detection to Freight, Ocean Tracking, Support Package, and Fleet Route Optimization
- Consistent error messaging across all products: "Volume exceeds tier limits - Custom Pricing Required"
- Improved debug logging shows SKU array details for troubleshooting

### Changed
- Updated `findSKUForProduct` function signature to accept SKU array directly instead of product config
- SKU auto-selection now uses actual JSON pricing data loaded from `pricing.json`
- All product rows and summary rows include `isCustomPricing` flag for consistent error handling

## [2.3.5] - 2025-11-06

### Added
- Custom pricing detection when volumes exceed highest available tier
- Red-highlighted rows with "Request Quote" message in Product Configuration Table
- "Custom Pricing Required" with detailed explanation in Quote Summary
- Visual indicators: light red background (#fee2e2), red border (#dc2626), red text
- Enhanced SKU selection logic to return "CUSTOM_PRICING" for exceeded volumes
- Updated calculation functions to handle `isCustomPricing` flag
- Debug logging to trace SKU auto-selection

### Fixed
- Pricing display issues for Core TMS Parcel, Locations, Auditing Module, and Dock Scheduling
- Tooltips display helpful message: "Volume of X exceeds max tier Y. Please contact sales."
- Input fields get red border when custom pricing is needed

## [2.3.4] - 2025-11-06

### Changed
- Improved AI Agent display format for better clarity
- Product Configuration now shows tier range: "251-500 Shipments Incl: 100M tokens"
- Quote Summary (Plan Details) shows: "100M tokens (251-500 shipments)"
- Replaced individual shipment count with tier range (e.g., "1,113 shipments" → "1001-1500 shipments")
- More intuitive understanding of pricing tiers
- Consistent tier range display across all views

## [2.3.3] - 2025-11-06

### Fixed
- **Critical Bug**: AI Agent costs not appearing in quote summary ($0.00)
- Root cause: Cost calculation checking `aiAgentEnabled` flag instead of `aiAgentTotalVolume`
- Removed all `aiAgentEnabled` dependencies from cost calculations
- AI Agent now automatically enabled when any checkbox is selected (volume > 0)
- Quote summary correctly displays AI Agent costs and tokens
- Customer quote items show token allocation
- Detailed quote summary shows proper tier and pricing

### Tested
- All functionality validated with 49 passing unit tests

## [2.3.2] - 2025-11-06

### Fixed
- **Critical Bug**: AI Agent checkbox interaction not working
- Root cause: `useProductState` returning 0 instead of undefined for checkbox fields
- Refactored state management to properly handle undefined/true/false states

### Added
- Jest and React Testing Library testing infrastructure
- Comprehensive unit test suite (49 tests, 100% passing)
- Extracted reusable `ProductCheckbox` component
- Debug logging for state tracking

### Changed
- Eliminated code duplication (reduced 180+ lines)
- Improved code maintainability and testability

## [2.3.1] - 2025-11-06

### Added
- Manual product selection for AI Agent via checkboxes
- Users can now choose which products (Freight, Parcel, Ocean) contribute to token calculation
- Checkboxes disabled when product volume is 0
- Dynamic plan description showing token allocation (e.g., "300M tokens | 1,500 shipments | Tier 4")
- Enhanced tooltip showing selected products and calculations
- Real-time volume and token updates as selections change

## [2.3.0] - 2025-11-06

### Added
- **FreightPOP AI Agent** product with token-based pricing
- Token allocation based on total shipment volume (Freight + Parcel + Ocean)
- 8 pricing tiers from $3,000 (50M tokens) to $60,000 (1B tokens)
- Auto-calculated volume from enabled shipment products
- Smart conditional logic: disabled until Freight, Parcel, or Ocean is enabled
- Comprehensive tooltips showing token allocation and volume breakdown
- Annual-only subscription
- Fully integrated into quote summaries and product configuration

## [2.2.0] - 2025-11-06

### Changed
- Migrated pricing storage from CSV to JSON
- Structured pricing data with better organization
- Native JSON parsing for faster load times
- Type-safe number values (not strings)
- Easier to maintain and update
- Metadata support (version, lastUpdated)

## [2.1.2] - 2025-11-06

### Changed
- Simplified WMS to standard volume-based input (same as other products)
- Removed ERP integration dropdown - implementation fees added manually
- Removed CSV import/export UI for simpler interface
- Cleaner product configuration section

## [2.1.1] - 2025-11-06

### Added
- **WMS** product with warehouse-based pricing
- Annual-only WMS subscription ($12,000 base + $6,000 per additional warehouse)
- Implementation fee options: $5,000 (Standard ERP) or $6,000 (Non-Standard ERP)
- Tooltips explaining ERP support (NetSuite, Acumatica, Syspro)
- Integrated into all quote views and calculations

## [2.1.0] - 2025-11-05

### Added
- CSV-based pricing system
- Loads all pricing from `public/defaultPricing.csv`
- Complete pricing database with all products
- Fallback to hardcoded SKUs if CSV fails
- Update pricing without code changes

## [2.0.0] - 2025-11-05

### Added
- Expanded to 9 granular pricing models
- Advanced filtering with search and model toggles
- CSV import/export for bulk pricing updates
- Improved UI organization and grouping
- Better product categorization

## [1.0.0] - 2025-10-15

### Added
- Initial pricing calculator
- Product configuration
- Basic SKU management
- PDF export functionality

