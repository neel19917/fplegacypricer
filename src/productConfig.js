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
  wmsAnnualSKUs,
  wmsMonthlySKUs,
  aiAgentAnnualSKUs,
  aiAgentMonthlySKUs,
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
  // billPay removed – not offered to customers
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
  wmsBased: {
    id: 'wmsBased',
    name: 'WMS - Warehouse Based',
    description: 'Warehouse Management System priced per warehouse',
    icon: '🏭',
    inputType: 'warehouses',
    color: '#f97316',
    order: 10,
  },
  aiAgentBased: {
    id: 'aiAgentBased',
    name: 'AI Agent - Token Based',
    description: 'Token allocation based on total shipment volume',
    icon: '🤖',
    inputType: 'tokens',
    color: '#a855f7',
    order: 11,
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
  // Bill Pay removed – not offered to customers
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
  {
    id: 'wms',
    name: 'WMS',
    category: 'modules',
    pricingModel: 'wmsBased',
    pricingType: 'volume',
    description: (_, billing) =>
      billing === 'annual'
        ? '$12,000 first warehouse + $6,000 per additional'
        : 'Annual Only',
    tierDetails: () => 'Annual only - $12,000 first + $6,000 each additional',
    skus: {
      annual: [],
      monthly: [],
    },
    defaultVolume: 0,
    volumeLabel: 'Number of Warehouses',
    annualOnly: true,
    includeInMinimum: true,
    order: 12,
  },
  {
    id: 'aiAgent',
    name: 'FreightPOP AI Agent',
    category: 'addons',
    pricingModel: 'aiAgentBased',
    pricingType: 'dropdown',
    description: (_, billing) =>
      billing === 'annual'
        ? 'AI token allocation - select tier from dropdown'
        : 'Annual Only',
    tierDetails: (selectedTier) => {
      if (!selectedTier) return 'Select a token tier';
      return selectedTier;
    },
    skus: {
      annual: aiAgentAnnualSKUs,
      monthly: aiAgentMonthlySKUs,
    },
    defaultVolume: 0,
    volumeLabel: 'Token Tier',
    annualOnly: true,
    includeInMinimum: true,
    order: 13,
    // Token tiers for dropdown selection
    tokenTiers: [
      { id: '50m', name: '50M Tokens', tokens: 50000000, annualCost: 3000, monthlyCost: 250 },
      { id: '100m', name: '100M Tokens', tokens: 100000000, annualCost: 6000, monthlyCost: 500 },
      { id: '200m', name: '200M Tokens', tokens: 200000000, annualCost: 12000, monthlyCost: 1000 },
      { id: '300m', name: '300M Tokens', tokens: 300000000, annualCost: 18000, monthlyCost: 1500 },
      { id: '400m', name: '400M Tokens', tokens: 400000000, annualCost: 24000, monthlyCost: 2000 },
      { id: '600m', name: '600M Tokens', tokens: 600000000, annualCost: 36000, monthlyCost: 3000 },
      { id: '800m', name: '800M Tokens', tokens: 800000000, annualCost: 48000, monthlyCost: 4000 },
      { id: '1b', name: '1B Tokens', tokens: 1000000000, annualCost: 60000, monthlyCost: 5000 },
      { id: 'custom', name: 'Custom Pricing (1B+)', tokens: 0, annualCost: 0, monthlyCost: 0, isCustom: true },
    ],
    calculation: (selectedTierId, billing, tokenTiers) => {
      if (billing !== 'annual' || !selectedTierId) return 0;
      const tier = tokenTiers?.find(t => t.id === selectedTierId);
      return tier ? tier.annualCost : 0;
    },
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

