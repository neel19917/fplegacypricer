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
 * Each category groups related products by business function
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
 * Pricing Models
 * Groups products by how they are priced (granular classification)
 */
export const pricingModels = {
  shipmentBased: {
    id: 'shipmentBased',
    name: 'Shipment-Based',
    description: 'Priced by number of shipments with overage charges',
    icon: '📦',
    inputType: 'shipments',
    color: '#3b82f6',
    order: 1,
  },
  stopBased: {
    id: 'stopBased',
    name: 'Stop-Based',
    description: 'Fleet route optimization by number of stops',
    icon: '🚛',
    inputType: 'stops',
    color: '#10b981',
    order: 2,
  },
  dockBased: {
    id: 'dockBased',
    name: 'Dock-Based',
    description: 'Dock scheduling by number of docks',
    icon: '🚪',
    inputType: 'docks',
    color: '#6366f1',
    order: 3,
  },
  portalBased: {
    id: 'portalBased',
    name: 'Portal-Based',
    description: 'Per portal pricing for vendor portals',
    icon: '🌐',
    inputType: 'portals',
    color: '#06b6d4',
    order: 4,
  },
  carrierBased: {
    id: 'carrierBased',
    name: 'Carrier-Based',
    description: 'Auditing module priced by carrier count',
    icon: '🚚',
    inputType: 'carriers',
    color: '#84cc16',
    order: 5,
  },
  yardManagement: {
    id: 'yardManagement',
    name: 'Yard Management',
    description: 'Custom calculation: per facility + per asset',
    icon: '🏭',
    inputType: 'custom',
    color: '#f59e0b',
    order: 6,
  },
  billPay: {
    id: 'billPay',
    name: 'Bill Pay',
    description: 'Custom formula based on freight & parcel volume',
    icon: '💳',
    inputType: 'custom',
    color: '#ec4899',
    order: 7,
  },
  infrastructureLocations: {
    id: 'infrastructureLocations',
    name: 'Infrastructure - Locations',
    description: 'Fixed location tiers',
    icon: '📍',
    inputType: 'tiers',
    color: '#8b5cf6',
    order: 8,
  },
  infrastructureSupport: {
    id: 'infrastructureSupport',
    name: 'Infrastructure - Support',
    description: 'Support package tiers by hours',
    icon: '🎧',
    inputType: 'tiers',
    color: '#14b8a6',
    order: 9,
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
    pricingModel: 'shipmentBased',
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
    pricingModel: 'shipmentBased',
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
    pricingModel: 'shipmentBased',
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
    pricingModel: 'billPay',
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
    pricingModel: 'portalBased',
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
    pricingModel: 'infrastructureLocations',
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
    pricingModel: 'infrastructureSupport',
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
    pricingModel: 'carrierBased',
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
    pricingModel: 'stopBased',
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
    pricingModel: 'yardManagement',
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
    pricingModel: 'dockBased',
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
 * Get products by pricing model
 */
export const getProductsByPricingModel = (modelId) => {
  return productConfig
    .filter((p) => p.pricingModel === modelId)
    .sort((a, b) => a.order - b.order);
};

/**
 * Get all pricing models with their products
 */
export const getPricingModelsWithProducts = () => {
  return Object.values(pricingModels)
    .sort((a, b) => a.order - b.order)
    .map((model) => ({
      ...model,
      products: getProductsByPricingModel(model.id),
    }));
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

