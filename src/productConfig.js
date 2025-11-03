/**
 * Product Configuration System
 * ============================
 * This file defines all products and their pricing structures.
 * 
 * PRICING TYPES:
 * 1. "volume" - Volume-based with overage (e.g., Freight, Parcel)
 * 2. "fixed" - Fixed tiered pricing (e.g., Locations, Auditing)
 * 3. "calculated" - Custom calculation (e.g., Bill Pay, Vendor Portals)
 * 4. "custom" - Custom inputs (e.g., Yard Management with facilities + assets)
 * 
 * HOW TO ADD A NEW PRODUCT:
 * 1. Import SKUs (or define inline for calculated types)
 * 2. Add product to appropriate category in productConfig
 * 3. Define pricingType, calculation method, and display props
 */

import {
  freightAnnualSKUs,
  freightMonthlySKUs,
  parcelAnnualSKUs,
  parcelMonthlySKUs,
  oceanTrackingAnnualSKUs,
  oceanTrackingMonthlySKUs,
  auditingAnnualSKUs,
  auditingMonthlySKUs,
  locationsAnnualSKUs,
  locationsMonthlySKUs,
  supportPackageAnnualSKUs,
  supportPackageMonthlySKUs,
  fleetRouteOptimizationAnnualSKUs,
  fleetRouteOptimizationMonthlySKUs,
  dockSchedulingAnnualSKUs,
  dockSchedulingMonthlySKUs,
} from './skus';

/**
 * Product Categories
 * Each category groups related products
 */
export const productCategories = {
  coreTMS: {
    id: 'coreTMS',
    name: 'Core TMS',
    description: 'Core transportation management system modules',
    icon: '🚚',
    order: 1,
  },
  addons: {
    id: 'addons',
    name: 'Add-Ons',
    description: 'Additional features and capabilities',
    icon: '🔧',
    order: 2,
  },
  modules: {
    id: 'modules',
    name: 'Advanced Modules',
    description: 'Specialized modules for advanced needs',
    icon: '⚙️',
    order: 3,
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'Infrastructure & Support',
    description: 'Locations, support packages, and infrastructure',
    icon: '🏢',
    order: 4,
  },
};

/**
 * Main Product Configuration
 * Each product definition includes:
 * - id: Unique identifier
 * - name: Display name
 * - category: Category ID
 * - pricingType: "volume" | "fixed" | "calculated" | "custom"
 * - description: Auto-generated description template
 * - skus: SKU arrays for annual/monthly (if applicable)
 * - calculation: Custom calculation function (if pricingType = "calculated")
 * - customInputs: Array of custom input definitions (if pricingType = "custom")
 */
export const productConfig = [
  // ==================== CORE TMS ====================
  {
    id: 'freight',
    name: 'Core TMS - Freight',
    category: 'coreTMS',
    pricingType: 'volume',
    description: (plan) =>
      plan ? `${plan.tier} - Incl: ${plan.shipmentsIncluded} shipments` : 'N/A',
    tierDetails: (plan) =>
      plan
        ? `Incl: ${plan.shipmentsIncluded}, Over: $${plan.costPerShipment}/shipment`
        : '',
    skus: {
      annual: freightAnnualSKUs,
      monthly: freightMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Shipments/Month',
    includeInMinimum: true,
    canOverride: true,
    order: 1,
  },
  {
    id: 'parcel',
    name: 'Core TMS - Parcel',
    category: 'coreTMS',
    pricingType: 'volume',
    description: (plan) =>
      plan ? `${plan.tier} - Incl: ${plan.shipmentsIncluded} shipments` : 'N/A',
    tierDetails: (plan) =>
      plan
        ? `Incl: ${plan.shipmentsIncluded}, Over: $${plan.costPerShipment}/shipment`
        : '',
    skus: {
      annual: parcelAnnualSKUs,
      monthly: parcelMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Shipments/Month',
    includeInMinimum: true,
    canOverride: true,
    order: 2,
  },
  {
    id: 'oceanTracking',
    name: 'Ocean Tracking',
    category: 'coreTMS',
    pricingType: 'volume',
    description: (plan) =>
      plan ? `${plan.tier} - Incl: ${plan.shipmentsIncluded} shipments` : 'N/A',
    tierDetails: (plan) =>
      plan
        ? `Incl: ${plan.shipmentsIncluded}, Over: $${plan.costPerShipment}/shipment`
        : '',
    skus: {
      annual: oceanTrackingAnnualSKUs,
      monthly: oceanTrackingMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Shipments/Month',
    includeInMinimum: true,
    canOverride: true,
    order: 3,
  },

  // ==================== ADD-ONS ====================
  {
    id: 'billPay',
    name: 'Bill Pay',
    category: 'addons',
    pricingType: 'calculated',
    description: (_, billing) =>
      billing === 'annual'
        ? '$500 base + $2/LTL-FTL + $0.50/Parcel'
        : '$650 base + $2.6/LTL-FTL + $0.65/Parcel',
    tierDetails: () => 'Calculated based on freight & parcel volume',
    calculation: (freightVol, parcelVol, billing) => {
      if (billing === 'annual') {
        return 500 + 2 * freightVol + 0.5 * parcelVol;
      } else {
        return 650 + 2.6 * freightVol + 0.65 * parcelVol;
      }
    },
    inputType: 'yesNo', // Special input type for yes/no selection
    defaultValue: 'No',
    dependsOn: ['freight', 'parcel'], // This product depends on freight and parcel volumes
    includeInMinimum: true,
    order: 4,
  },
  {
    id: 'vendorPortals',
    name: 'Vendor Portals',
    category: 'addons',
    pricingType: 'calculated',
    description: (_, billing) =>
      billing === 'annual' ? '$20/portal/month' : '$30/portal/month',
    tierDetails: () => 'Per portal pricing',
    calculation: (count, _, billing) => {
      const rate = billing === 'annual' ? 20 : 30;
      return count * rate;
    },
    volumeLabel: 'Number of Portals',
    defaultVolume: 0,
    includeInMinimum: true,
    order: 5,
  },

  // ==================== INFRASTRUCTURE ====================
  {
    id: 'locations',
    name: 'Locations',
    category: 'infrastructure',
    pricingType: 'volume',
    description: (plan) =>
      plan
        ? `${plan.tier} - Range: ${plan.rangeStart}–${plan.rangeEnd} locations`
        : 'N/A',
    tierDetails: (plan) =>
      plan ? `Range: ${plan.rangeStart}–${plan.rangeEnd}` : '',
    skus: {
      annual: locationsAnnualSKUs,
      monthly: locationsMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Number of Locations',
    includeInMinimum: false, // Locations uses special "useLocations" logic
    canOverride: true,
    order: 6,
  },
  {
    id: 'supportPackage',
    name: 'Support Package',
    category: 'infrastructure',
    pricingType: 'fixed',
    description: (plan) =>
      plan
        ? `${plan.tier} - Range: ${plan.rangeStart}–${
            plan.rangeEnd === Infinity ? '+' : plan.rangeEnd
          } hours`
        : 'N/A',
    tierDetails: (plan) =>
      plan
        ? `Range: ${plan.rangeStart}–${
            plan.rangeEnd === Infinity ? '+' : plan.rangeEnd
          }`
        : '',
    skus: {
      annual: supportPackageAnnualSKUs,
      monthly: supportPackageMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Hours/Month',
    includeInMinimum: true,
    canOverride: true,
    order: 7,
  },

  // ==================== ADVANCED MODULES ====================
  {
    id: 'auditing',
    name: 'Auditing Module',
    category: 'modules',
    pricingType: 'fixed',
    description: (plan) =>
      plan
        ? `${plan.tier} - Range: ${plan.range[0]}–${
            plan.range[1] === Infinity ? '+' : plan.range[1]
          } carriers`
        : 'N/A',
    tierDetails: (plan) =>
      plan
        ? `Range: ${plan.range[0]}–${
            plan.range[1] === Infinity ? '+' : plan.range[1]
          }`
        : '',
    skus: {
      annual: auditingAnnualSKUs,
      monthly: auditingMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Number of Carriers',
    includeInMinimum: true,
    canOverride: true,
    order: 8,
  },
  {
    id: 'fleetRouteOptimization',
    name: 'Fleet Route Optimization',
    category: 'modules',
    pricingType: 'fixed',
    description: (plan) =>
      plan ? `${plan.tier} - Range: ${plan.range[0]}–${plan.range[1]}` : 'N/A',
    tierDetails: (plan) =>
      plan ? `Range: ${plan.range[0]}–${plan.range[1]}` : '',
    skus: {
      annual: fleetRouteOptimizationAnnualSKUs,
      monthly: fleetRouteOptimizationMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Number of Stops',
    includeInMinimum: true,
    canOverride: true,
    order: 9,
  },
  {
    id: 'yardManagement',
    name: 'Yard Management',
    category: 'modules',
    pricingType: 'custom',
    description: (_, billing) =>
      `Per facility: $${billing === 'annual' ? '100' : '130'} / per asset: $${
        billing === 'annual' ? '10' : '13'
      }`,
    tierDetails: () => 'Custom calculation based on facilities and assets',
    customInputs: [
      {
        id: 'facilities',
        label: 'Facilities',
        placeholder: 'Fac.',
        defaultValue: 0,
      },
      {
        id: 'assets',
        label: 'Assets',
        placeholder: 'Assets',
        defaultValue: 0,
      },
    ],
    calculation: (facilities, assets, billing) => {
      const facilityRate = billing === 'annual' ? 100 : 130;
      const assetRate = billing === 'annual' ? 10 : 13;
      return facilities * facilityRate + assets * assetRate;
    },
    includeInMinimum: true,
    order: 10,
  },
  {
    id: 'dockScheduling',
    name: 'Dock Scheduling',
    category: 'modules',
    pricingType: 'volume',
    description: (plan) =>
      plan
        ? `${plan.tier} - Range: ${plan.rangeStart}–${
            plan.rangeEnd === Infinity ? '+' : plan.rangeEnd
          } docks`
        : 'N/A',
    tierDetails: (plan) =>
      plan
        ? `Range: ${plan.rangeStart}–${
            plan.rangeEnd === Infinity ? '+' : plan.rangeEnd
          }`
        : '',
    skus: {
      annual: dockSchedulingAnnualSKUs,
      monthly: dockSchedulingMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Number of Docks',
    includeInMinimum: true,
    canOverride: true,
    order: 11,
  },
];

/**
 * Get products by category
 */
export const getProductsByCategory = (categoryId) => {
  return productConfig
    .filter((p) => p.category === categoryId)
    .sort((a, b) => a.order - b.order);
};

/**
 * Get all categories with their products
 */
export const getCategoriesWithProducts = () => {
  return Object.values(productCategories)
    .sort((a, b) => a.order - b.order)
    .map((cat) => ({
      ...cat,
      products: getProductsByCategory(cat.id),
    }));
};

/**
 * Get product by ID
 */
export const getProductById = (id) => {
  return productConfig.find((p) => p.id === id);
};

/**
 * Helper function to find the right SKU based on volume
 */
export const findSKUByVolume = (volume, skuArray, pricingType) => {
  if (!skuArray || skuArray.length === 0) return null;
  
  let selected;
  
  if (pricingType === 'volume') {
    // For volume-based (has rangeStart/rangeEnd)
    selected = skuArray.find(
      (plan) => volume >= plan.rangeStart && volume <= plan.rangeEnd
    );
  } else if (pricingType === 'fixed') {
    // For fixed pricing (has range array or rangeStart/rangeEnd)
    selected = skuArray.find((plan) => {
      if (plan.range) {
        // Auditing/FRM style: range: [min, max]
        return volume >= plan.range[0] && volume <= plan.range[1];
      } else if (plan.rangeStart !== undefined) {
        // Locations/Support style: rangeStart, rangeEnd
        return volume >= plan.rangeStart && volume <= plan.rangeEnd;
      }
      return false;
    });
  }
  
  // If no exact match, return the last (highest) tier
  return selected || skuArray[skuArray.length - 1];
};

