/**
 * Calculation utilities for pricing and cost computations
 */

/**
 * Compute costs for volume-based products with overage charges
 * @param {number} volume - The shipment/volume count
 * @param {object} plan - The selected pricing plan/tier
 * @param {string} billing - 'annual' or 'monthly'
 * @returns {object} Cost breakdown with included, overage, monthlyCost, annualCost
 */
export const computeVolumeBasedCost = (volume, plan, billing) => {
  const vol = Number(volume) || 0;
  if (!plan) return { included: 0, overage: 0, monthlyCost: 0, annualCost: 0 };
  
  const included = plan.shipmentsIncluded || 0;
  const overage = vol > included ? (vol - included) * (plan.costPerShipment || 0) : 0;
  
  let monthlyCost = 0;
  let annualCost = 0;
  
  if (billing === 'annual') {
    const baseAnnual = (plan.perMonthCost || 0) * 12;
    annualCost = baseAnnual + overage;
    monthlyCost = annualCost / 12;
  } else {
    monthlyCost = (plan.perMonthCost || 0) + overage;
    annualCost = monthlyCost * 12;
  }
  
  return { included, overage, monthlyCost, annualCost };
};

/**
 * Compute costs for fixed-tier products (no overage)
 * @param {object} plan - The selected pricing plan/tier
 * @param {string} billing - 'annual' or 'monthly'
 * @returns {object} Cost breakdown with monthlyCost, annualCost
 */
export const computeFixedCost = (plan, billing = 'annual') => {
  if (!plan) return { monthlyCost: 0, annualCost: 0 };
  
  if (billing === 'annual') {
    const annualCost = plan.annualCost !== undefined
      ? Number(plan.annualCost)
      : Number(plan.cost || 0);
    return { monthlyCost: annualCost / 12, annualCost };
  } else {
    const monthlyCost = plan.perMonthCost !== undefined
      ? Number(plan.perMonthCost)
      : Number(plan.cost || 0) / 12;
    return { monthlyCost, annualCost: monthlyCost * 12 };
  }
};

/**
 * Apply markup to a cost value
 * @param {number} cost - The base cost
 * @param {number} markupPercent - The markup percentage
 * @returns {number} The cost with markup applied
 */
export const applyMarkup = (cost, markupPercent) => {
  return cost * (1 + (markupPercent || 0) / 100);
};

/**
 * Calculate Bill Pay costs based on formula
 * @param {string} yesNo - 'Yes' or 'No'
 * @param {number} freightVolume - Freight shipments
 * @param {number} parcelVolume - Parcel shipments
 * @param {string} billing - 'annual' or 'monthly'
 * @param {number} markup - Markup percentage
 * @returns {object} monthlyCost and annualCost
 */
export const calculateBillPayCost = (yesNo, freightVolume, parcelVolume, billing, markup = 0) => {
  if (yesNo !== 'Yes') {
    return { monthlyCost: 0, annualCost: 0 };
  }
  
  let monthlyCost = 0;
  
  if (billing === 'annual') {
    const base = 500 + 2 * freightVolume + 0.5 * parcelVolume;
    monthlyCost = applyMarkup(base, markup);
  } else {
    const base = 650 + 2.6 * freightVolume + 0.65 * parcelVolume;
    monthlyCost = applyMarkup(base, markup);
  }
  
  const annualCost = monthlyCost * 12;
  return { monthlyCost, annualCost };
};

/**
 * Calculate Vendor Portal costs
 * @param {number} count - Number of vendor portals
 * @param {string} billing - 'annual' or 'monthly'
 * @param {number} markup - Markup percentage
 * @returns {object} monthlyCost and annualCost
 */
export const calculateVendorPortalCost = (count, billing, markup = 0) => {
  const rate = billing === 'annual' ? 20 : 30;
  const monthlyBase = count * rate;
  const monthlyCost = applyMarkup(monthlyBase, markup);
  const annualCost = monthlyCost * 12;
  return { monthlyCost, annualCost };
};

/**
 * Calculate Yard Management costs (custom formula)
 * @param {number} facilities - Number of facilities
 * @param {number} assets - Number of assets
 * @param {string} billing - 'annual' or 'monthly'
 * @param {number} markup - Markup percentage
 * @returns {object} monthlyCost and annualCost
 */
export const calculateYardManagementCost = (facilities, assets, billing, markup = 0) => {
  const facilityRate = billing === 'annual' ? 100 : 130;
  const assetRate = billing === 'annual' ? 10 : 13;
  
  const monthlyBase = facilities * facilityRate + assets * assetRate;
  const monthlyCost = applyMarkup(monthlyBase, markup);
  const annualCost = monthlyCost * 12;
  
  return { monthlyCost, annualCost };
};

/**
 * Calculate the total subscription cost with minimum enforcement
 * @param {number} rawTotal - The raw subscription total before minimum
 * @param {number} minimum - The minimum subscription amount
 * @param {number} globalMarkup - Global markup percentage to apply
 * @returns {object} finalAnnual, finalMonthly, neededToMin
 */
export const calculateSubscriptionTotal = (rawTotal, minimum, globalMarkup = 0) => {
  const afterMin = Math.max(rawTotal, minimum);
  const finalAnnual = applyMarkup(afterMin, globalMarkup);
  const finalMonthly = finalAnnual / 12;
  const neededToMin = Math.max(0, minimum - rawTotal);
  
  return {
    finalAnnual,
    finalMonthly,
    neededToMin,
    neededToMinMonthly: neededToMin / 12,
  };
};

/**
 * Calculate one-time costs with markup
 * @param {array} oneTimeCosts - Array of one-time cost items
 * @param {number} markup - Markup percentage
 * @returns {object} rawTotal and finalTotal
 */
export const calculateOneTimeCosts = (oneTimeCosts, markup = 0) => {
  const rawTotal = oneTimeCosts.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const finalTotal = applyMarkup(rawTotal, markup);
  
  return { rawTotal, finalTotal };
};

