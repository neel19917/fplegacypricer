# FreightPOP Quote Builder - Changelog

## Version 2.0 - January 2026

### 🗄️ Database Integration (Supabase)

- **SKU Management**: Migrated from hardcoded JSON files to Supabase `pricing_tiers` table for dynamic SKU storage and editing
- **Quote Storage**: Added `quotes` table for saving and loading customer quotes with full state persistence
- **User Authentication**: Integrated Supabase Auth with Microsoft OAuth support
- **Role-Based Access Control**: Implemented user permissions via `user_profiles` table (`Super Admin`, `Admin`, `Sales`)
- **Shareable Links**: Added `quote_access_tokens` table for generating authenticated approval links

---

### 🔧 Bug Fixes

#### Runtime Errors Fixed
- **`ReferenceError: finalMonthlyCost is not defined`** - Corrected variable names in split view panel:
  - `finalMonthlyCost` → `finalSubscriptionMonthly`
  - `finalAnnualCost` → `finalSubscriptionAnnual`
  - `effectiveFreightAnnualCost` → `freightAnnualCost`
  - `effectiveParcelAnnualCost` → `parcelAnnualCost`
  - `effectiveOceanAnnualCost` → `oceanTrackingAnnualCost`
  - `vendorPortalUsers` → `vendorPortalCount`
  - `locationsCount` → `locationsVolume`
  - `billPayAnnualCost` → `billPayMonthlyCost` (for monthly display)
  - Removed undefined `customerPortalAnnualCost` reference

- **`Rendered more hooks than during the previous render`** - Moved `useCallback` hooks above conditional returns to comply with React's rules of hooks

- **`billingFrequency is not defined`** - Fixed prop naming mismatch between `App.jsx` and `QuoteDashboard` component

- **`column "billing_type" does not exist`** - Corrected Supabase SQL queries to use proper column names (`Billing_Frequency`, `monthly_priceforannualbilling`)

---

### 📊 SKU Data Updates (Supabase)

#### Parcel SKUs
- Updated all parcel tiers with correct pricing for annual, monthly, 2-year, and 3-year billing

#### Freight SKUs
- Fixed `Pro+` monthly price: $1,947 → $2,457
- Fixed `Custom Pricing` tier annual/monthly prices
- Corrected `Starter` range: 0-100 → 1-100

#### Ocean Container Tracking SKUs
- Complete refresh of ocean tracking tiers with updated pricing structure

#### AI Agent SKUs (New)
- Added new `aiagent` product type with token-based tiers:
  - 50M Tokens
  - 100M Tokens
  - 200M Tokens
  - Custom Pricing

---

### ✨ New Features

#### Quote Management
- **Save Quotes**: Persist quotes to Supabase with company name, HubSpot deal URL, and full product configuration
- **Load Quotes**: Restore complete application state from saved quotes
- **Auto-Save**: Automatic saving every 1 second with debouncing
- **Save Status Indicator**: Header shows "Saved" / "Unsaved" status with last save timestamp
- **Unsaved Changes Protection**: 
  - Browser `beforeunload` warning
  - In-app modal with Save/Discard options when navigating away

#### Quote Dashboard
- View all saved quotes with search and filtering
- Load, edit, and delete quotes
- Display company name, HubSpot link, and quote totals

#### Share Quote Modal
- Generate authenticated shareable links for manager approval
- Links require user authentication to access

#### SKU Admin Panel
- View and edit pricing tiers (Super Admin only)
- Real-time updates to Supabase

#### Split View Layout
- Toggle between single column and split view in header
- Sticky Quote Summary panel on the right side
- Reduces scrolling for easier quote building

#### AI Agent Pricing
- Changed from shipment-volume-based calculation to standalone dropdown
- Select token tier directly (50M, 100M, 200M, Custom)
- Removed dependency on Freight/Parcel/Ocean checkboxes

---

### 🎨 UI/UX Improvements

#### Quote Summary Panel (Split View)
- **Table Layout**: Proper table structure with aligned columns
- **Tier Column**: Shows tier details for each product:
  - Freight/Parcel/Ocean: "Incl: X" (shipments included)
  - Locations: Number of locations
  - Bill Pay: "$500 + $2/LTL + $0.50/Parcel"
  - Vendor Portal: "$20/user/mo"
  - AI Agent: Selected tier name
- **Subtotal Row**: Shows raw total before minimum enforcement
- **Minimum Subscription Row**: Highlighted yellow when under $20,000 minimum
- **Under By Row**: Red warning showing difference needed to reach minimum
- **Four Columns**: Product | Tier | Monthly | Annual

#### Pricing Consistency
- Fixed Bill Pay to display `billPayMonthlyCost` directly instead of calculating from annual
- Aligned product names between summary panel and main table (Core TMS - Freight, Core TMS - Parcel)

---

### 🧪 Testing
- Added test cases for new hooks and components
- Unit tests for `useQuotes`, `useSupabasePricing`, `useSupabaseAuth`

---

### 📁 Files Modified
- `src/App.jsx` - Main application component with all new features
- `src/hooks/useProductState.js` - Product state management with load/save support
- `src/hooks/useQuotes.js` - Quote CRUD operations
- `src/hooks/useSupabasePricing.js` - SKU loading from Supabase
- `src/hooks/useSupabaseAuth.js` - Authentication hook
- `src/productConfig.js` - AI Agent pricing model updates
- `src/utils/calculations.js` - Subscription total with minimum enforcement
- `src/utils/permissions.js` - Role-based access control
- `src/components/QuoteDashboard.jsx` - Quote management UI
- `src/components/ShareQuoteModal.jsx` - Shareable link generation
- `src/components/SKUAdminPanel.jsx` - SKU editing interface
- `src/components/LoginScreen.jsx` - Microsoft OAuth login

---

### 🗃️ Database Schema (Supabase)

```sql
-- pricing_tiers: SKU storage
CREATE TABLE pricing_tiers (
  id SERIAL PRIMARY KEY,
  product_type TEXT,
  tier_name TEXT,
  start_range INT,
  end_range INT,
  monthly_priceforannualbilling DECIMAL,
  monthly_priceformonthlybilling DECIMAL,
  monthly_pricefor2yearbilling DECIMAL,
  monthly_pricefor3yearbilling DECIMAL
);

-- quotes: Saved quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  company_name TEXT,
  hubspot_deal_url TEXT,
  quote_data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- user_profiles: User roles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  user_type TEXT, -- 'Super Admin', 'Admin', 'Sales'
  created_at TIMESTAMP
);

-- quote_access_tokens: Shareable links
CREATE TABLE quote_access_tokens (
  id UUID PRIMARY KEY,
  quote_id UUID REFERENCES quotes,
  token TEXT UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

### 🚀 Deployment
- All changes pushed to `beta` branch
- Repository: `https://github.com/neel19917/fplegacypricer.git`
