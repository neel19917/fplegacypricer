# 📦 Product Management System Guide

## Overview

This application now uses a **config-driven product management system** that allows you to add, modify, and organize products without touching the core application code.

---

## 🏗️ Architecture

### **Key Files**

1. **`src/productConfig.js`** - Product definitions and configuration
2. **`src/skus.js`** - SKU pricing data
3. **`src/App.jsx`** - Main application (will be refactored to use productConfig)
4. **`defaultPricing.csv`** - CSV pricing data (optional reference)

---

## 📊 Pricing Types

The system supports **4 pricing models**:

### 1. **Volume-Based Pricing** (`pricingType: "volume"`)

**Used for:** Freight, Parcel, Ocean Tracking, Dock Scheduling

**Structure:**
```javascript
{
  id: 'freight',
  pricingType: 'volume',
  skus: {
    annual: freightAnnualSKUs,  // Array of tier options
    monthly: freightMonthlySKUs
  },
  // ... other config
}
```

**Calculation:**
- Base cost from selected tier
- Overage charges if volume exceeds `shipmentsIncluded`
- Formula: `baseCost + (volume - included) * costPerShipment`

---

### 2. **Fixed Tiered Pricing** (`pricingType: "fixed"`)

**Used for:** Locations, Support Package, Auditing Module, Fleet Route Optimization

**Structure:**
```javascript
{
  id: 'auditing',
  pricingType: 'fixed',
  skus: {
    annual: auditingAnnualSKUs,  // Tiers with fixed costs
    monthly: auditingMonthlySKUs
  },
  // ... other config
}
```

**Calculation:**
- Fixed cost based on tier/range
- No overage charges
- Tier selected based on volume falling within range

---

### 3. **Calculated Pricing** (`pricingType: "calculated"`)

**Used for:** Bill Pay, Vendor Portals

**Structure:**
```javascript
{
  id: 'billPay',
  pricingType: 'calculated',
  calculation: (freightVol, parcelVol, billing) => {
    if (billing === 'annual') {
      return 500 + 2 * freightVol + 0.5 * parcelVol;
    } else {
      return 650 + 2.6 * freightVol + 0.65 * parcelVol;
    }
  },
  dependsOn: ['freight', 'parcel'],  // Depends on other products
  // ... other config
}
```

**Calculation:**
- Custom JavaScript function
- Can depend on other product volumes
- Dynamic based on billing frequency

---

### 4. **Custom Input Pricing** (`pricingType: "custom"`)

**Used for:** Yard Management (facilities + assets)

**Structure:**
```javascript
{
  id: 'yardManagement',
  pricingType: 'custom',
  customInputs: [
    { id: 'facilities', label: 'Facilities', defaultValue: 0 },
    { id: 'assets', label: 'Assets', defaultValue: 0 }
  ],
  calculation: (facilities, assets, billing) => {
    const facilityRate = billing === 'annual' ? 100 : 130;
    const assetRate = billing === 'annual' ? 10 : 13;
    return facilities * facilityRate + assets * assetRate;
  },
  // ... other config
}
```

**Calculation:**
- Multiple custom inputs (not just volume)
- Custom calculation function
- Flexible input types

---

## 🎯 Product Categories

Products are organized into **4 categories**:

| Category | Icon | Products |
|----------|------|----------|
| **Core TMS** | 🚚 | Freight, Parcel, Ocean Tracking |
| **Add-Ons** | 🔧 | Bill Pay, Vendor Portals |
| **Advanced Modules** | ⚙️ | Auditing, Fleet Route Optimization, Yard Management, Dock Scheduling |
| **Infrastructure & Support** | 🏢 | Locations, Support Package |

---

## ➕ How to Add a New Product

### **Example: Adding "Warehouse Management" Module**

#### Step 1: Define SKUs (if needed)

Add to `src/skus.js`:

```javascript
export const warehouseManagementAnnualSKUs = [
  {
    sku: 'FP2001',
    tier: 'Basic',
    rangeStart: 1,
    rangeEnd: 3,
    perMonthCost: 500,
    annualCost: 6000,
  },
  {
    sku: 'FP2002',
    tier: 'Pro',
    rangeStart: 4,
    rangeEnd: 10,
    perMonthCost: 1200,
    annualCost: 14400,
  },
  // ... more tiers
];

export const warehouseManagementMonthlySKUs = [
  // ... monthly pricing
];
```

#### Step 2: Add Product to Config

Add to `src/productConfig.js`:

```javascript
import {
  // ... existing imports
  warehouseManagementAnnualSKUs,
  warehouseManagementMonthlySKUs,
} from './skus';

export const productConfig = [
  // ... existing products
  {
    id: 'warehouseManagement',
    name: 'Warehouse Management',
    category: 'modules',  // or create new category
    pricingType: 'fixed',  // or 'volume', 'calculated', 'custom'
    description: (plan) =>
      plan
        ? `${plan.tier} - Range: ${plan.rangeStart}–${plan.rangeEnd} warehouses`
        : 'N/A',
    tierDetails: (plan) =>
      plan ? `Range: ${plan.rangeStart}–${plan.rangeEnd}` : '',
    skus: {
      annual: warehouseManagementAnnualSKUs,
      monthly: warehouseManagementMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Number of Warehouses',
    includeInMinimum: true,
    canOverride: true,
    order: 12,  // Display order
  },
];
```

#### Step 3: Done! ✅

The product will automatically:
- ✅ Appear in the pricing table
- ✅ Be included in calculations
- ✅ Support tier selection
- ✅ Support markup editing
- ✅ Be grouped by category

---

## 🎨 Creating a New Category

To add a new category (e.g., "Analytics"):

```javascript
export const productCategories = {
  // ... existing categories
  analytics: {
    id: 'analytics',
    name: 'Analytics & Reporting',
    description: 'Advanced analytics and reporting tools',
    icon: '📊',
    order: 5,  // Display order
  },
};
```

Then assign products to this category:

```javascript
{
  id: 'advancedReporting',
  name: 'Advanced Reporting',
  category: 'analytics',  // ← Reference new category
  // ... rest of config
}
```

---

## 🔧 Product Configuration Options

### **Required Fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (camelCase) |
| `name` | string | Display name |
| `category` | string | Category ID |
| `pricingType` | string | `"volume"`, `"fixed"`, `"calculated"`, or `"custom"` |
| `description` | function | Returns description string |
| `tierDetails` | function | Returns tier details string |
| `order` | number | Display order within category |

### **Optional Fields**

| Field | Type | Description | Applies To |
|-------|------|-------------|------------|
| `skus.annual` | array | Annual SKU array | volume, fixed |
| `skus.monthly` | array | Monthly SKU array | volume, fixed |
| `calculation` | function | Custom calculation | calculated, custom |
| `customInputs` | array | Custom input definitions | custom |
| `dependsOn` | array | Product ID dependencies | calculated |
| `inputType` | string | Special input type (e.g., `"yesNo"`) | calculated |
| `defaultVolume` | number | Default volume value | volume, fixed |
| `defaultValue` | any | Default value | calculated, custom |
| `volumeLabel` | string | Label for volume input | volume, fixed |
| `includeInMinimum` | boolean | Include in minimum calculation | all |
| `canOverride` | boolean | Allow tier override | volume, fixed |

---

## 🧮 Calculation Functions

### **For Volume/Fixed Pricing**
Automatically calculated using `computeVolumeBasedCost()` or `computeFixedCost()` helpers.

### **For Calculated Pricing**
```javascript
calculation: (primaryInput, secondaryInput, billing) => {
  // Return monthly cost
  return calculatedMonthlyCost;
}
```

### **For Custom Pricing**
```javascript
calculation: (input1, input2, billing) => {
  // Return monthly cost based on custom inputs
  return calculatedMonthlyCost;
}
```

---

## 📝 Examples

### **Example 1: Volume-Based Product**

```javascript
{
  id: 'ltl',
  name: 'LTL Shipping',
  category: 'coreTMS',
  pricingType: 'volume',
  description: (plan) => plan ? `${plan.tier} - ${plan.shipmentsIncluded} shipments` : 'N/A',
  tierDetails: (plan) => plan ? `Overage: $${plan.costPerShipment}/shipment` : '',
  skus: {
    annual: ltlAnnualSKUs,
    monthly: ltlMonthlySKUs,
  },
  defaultVolume: 0,
  volumeLabel: 'LTL Shipments/Month',
  includeInMinimum: true,
  canOverride: true,
  order: 4,
}
```

### **Example 2: Calculated Product**

```javascript
{
  id: 'insurance',
  name: 'Shipment Insurance',
  category: 'addons',
  pricingType: 'calculated',
  description: () => '2% of shipment value',
  tierDetails: () => 'Calculated based on total shipments',
  calculation: (freightVol, parcelVol, billing) => {
    const totalShipments = freightVol + parcelVol;
    const baseRate = billing === 'annual' ? 0.015 : 0.02;
    return totalShipments * 100 * baseRate;  // Assuming $100 avg shipment value
  },
  dependsOn: ['freight', 'parcel'],
  includeInMinimum: true,
  order: 6,
}
```

### **Example 3: Custom Input Product**

```javascript
{
  id: 'customIntegration',
  name: 'Custom Integration',
  category: 'infrastructure',
  pricingType: 'custom',
  description: () => 'Based on API calls and data sync frequency',
  tierDetails: () => 'Custom pricing',
  customInputs: [
    { id: 'apiCalls', label: 'API Calls (thousands)', defaultValue: 0 },
    { id: 'syncFrequency', label: 'Sync Frequency (per day)', defaultValue: 0 },
  ],
  calculation: (apiCalls, syncFrequency, billing) => {
    const apiRate = billing === 'annual' ? 0.01 : 0.013;
    const syncRate = billing === 'annual' ? 5 : 6.5;
    return apiCalls * 1000 * apiRate + syncFrequency * syncRate;
  },
  includeInMinimum: true,
  order: 8,
}
```

---

## 🚀 Next Steps

1. ✅ **Product config created** - `src/productConfig.js`
2. ⏳ **Refactor App.jsx** - Use productConfig instead of hardcoded products
3. ⏳ **Add product management UI** - Allow users to add/edit products via UI
4. ⏳ **CSV import/export** - Import products from CSV files

---

## 📚 API Reference

### **Helper Functions**

```javascript
// Get products by category
const tmProducts = getProductsByCategory('coreTMS');

// Get all categories with products
const categories = getCategoriesWithProducts();

// Get product by ID
const freight = getProductById('freight');

// Find SKU by volume
const selectedSKU = findSKUByVolume(100, freightAnnualSKUs, 'volume');
```

---

## 🎓 Best Practices

1. **Use descriptive IDs** - `camelCase`, e.g., `fleetRouteOptimization`
2. **Keep SKUs organized** - Group by product in `skus.js`
3. **Order matters** - Use `order` field to control display sequence
4. **Test calculations** - Verify custom calculation functions
5. **Document dependencies** - Use `dependsOn` array for calculated products
6. **Category alignment** - Ensure products are in logical categories

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Product not showing | Check `order` field and category ID |
| Wrong calculation | Verify `pricingType` and `calculation` function |
| SKU not found | Ensure SKU array is imported and assigned |
| Tier not selecting | Check `rangeStart`/`rangeEnd` or `range` array |

---

## 📞 Support

For questions or issues, refer to:
- `src/productConfig.js` - Product definitions
- `src/skus.js` - Pricing data
- This guide - Implementation examples

---

**Last Updated:** November 3, 2025

