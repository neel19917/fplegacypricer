/**
 * useSupabasePricing Hook
 * 
 * Fetches pricing tiers from Supabase database and transforms them
 * into the SKU format expected by the app.
 * 
 * Falls back to JSON file if Supabase is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseConfig';
import { loadDefaultPricing } from '../utils/jsonHelpers';

// Map database product_type to app's internal product keys
const PRODUCT_TYPE_MAP = {
  'freight': 'Freight',
  'parcel': 'Parcel',
  'ocean': 'Ocean',
  'locations': 'Locations',
  'supportpackage': 'Support',
  'auditmodule': 'Auditing',
  'fleetroutemanagement': 'FleetRoute',
  'dockscheduling': 'DockScheduling',
  'vendorportal': 'VendorPortals',
  'wms': 'WMS',
  'yardmanagement': 'YardManagement',
  'aiagent': 'AIAgent',
};

// Reverse map for saving back to database
const REVERSE_PRODUCT_TYPE_MAP = Object.fromEntries(
  Object.entries(PRODUCT_TYPE_MAP).map(([k, v]) => [v, k])
);

/**
 * Transform a database tier row into the app's SKU format
 */
function transformTierToSKU(tier, productType) {
  // Prices in DB are stored in cents, convert to dollars
  const annualPrice = (tier.monthly_priceforannualbilling || 0) / 100;
  const monthlyPrice = (tier.monthly_priceformonthlybilling || 0) / 100;
  
  const baseSKU = {
    id: tier.id,
    sku: tier.id.substring(0, 8).toUpperCase(), // Use first 8 chars of UUID as SKU
    tier: tier.tier_name,
    rangeStart: tier.start_range,
    rangeEnd: tier.end_range,
    perMonthCost: annualPrice, // Monthly cost when on annual billing
    annualCost: annualPrice * 12,
  };

  // Add pricing for different billing frequencies
  baseSKU.monthlyBillingPrice = monthlyPrice;
  baseSKU.annualBillingPrice = annualPrice;
  baseSKU.twoYearBillingPrice = (tier.monthly_pricefor2yearbilling || 0) / 100;
  baseSKU.threeYearBillingPrice = (tier.monthly_pricefor3yearbilling || 0) / 100;

  // Add volume-based fields for shipment products
  const volumeProducts = ['Freight', 'Parcel', 'Ocean'];
  if (volumeProducts.includes(productType)) {
    baseSKU.shipmentsIncluded = tier.end_range;
    baseSKU.costPerShipment = tier.end_range > 0 ? annualPrice / tier.end_range : 0;
  }

  // Add range array for fixed pricing products (legacy format support)
  baseSKU.range = [tier.start_range, tier.end_range];

  return baseSKU;
}

/**
 * Group tiers by product type and billing frequency
 */
function groupTiersByProduct(tiers) {
  const grouped = {};

  // Initialize all product types with empty arrays
  Object.values(PRODUCT_TYPE_MAP).forEach(productKey => {
    grouped[productKey] = { annual: [], monthly: [] };
  });

  tiers.forEach(tier => {
    const productKey = PRODUCT_TYPE_MAP[tier.product_type];
    if (!productKey) {
      console.warn(`Unknown product_type: ${tier.product_type}`);
      return;
    }

    const sku = transformTierToSKU(tier, productKey);

    // Add to annual array (all tiers have annual pricing)
    if (tier.monthly_priceforannualbilling !== null) {
      grouped[productKey].annual.push({
        ...sku,
        perMonthCost: sku.annualBillingPrice,
      });
    }

    // Add to monthly array if monthly pricing exists
    if (tier.monthly_priceformonthlybilling !== null) {
      grouped[productKey].monthly.push({
        ...sku,
        perMonthCost: sku.monthlyBillingPrice,
        annualCost: sku.monthlyBillingPrice * 12,
      });
    }
  });

  // Sort each array by rangeStart
  Object.keys(grouped).forEach(productKey => {
    grouped[productKey].annual.sort((a, b) => a.rangeStart - b.rangeStart);
    grouped[productKey].monthly.sort((a, b) => a.rangeStart - b.rangeStart);
  });

  return grouped;
}

/**
 * Main hook for loading pricing from Supabase
 */
export function useSupabasePricing() {
  const [skuData, setSKUData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'supabase' | 'json' | 'hardcoded'

  const loadPricing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Try Supabase first
    if (isSupabaseConfigured() && supabase) {
      try {
        console.log('[Pricing] 📡 Loading from Supabase...');
        
        const { data: tiers, error: fetchError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .order('product_type')
          .order('start_range');

        if (fetchError) throw fetchError;

        if (tiers && tiers.length > 0) {
          const grouped = groupTiersByProduct(tiers);
          setSKUData(grouped);
          setSource('supabase');
          console.log(`[Pricing] ✅ Loaded ${tiers.length} tiers from Supabase`);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('[Pricing] ❌ Supabase error:', err);
        setError(err.message);
      }
    }

    // Fallback to JSON file
    try {
      console.log('[Pricing] 📄 Falling back to JSON...');
      const jsonData = await loadDefaultPricing();
      
      if (jsonData) {
        setSKUData(jsonData);
        setSource('json');
        console.log('[Pricing] ✅ Loaded from JSON');
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('[Pricing] ❌ JSON fallback error:', err);
    }

    // If all else fails, set error
    setError('Failed to load pricing from any source');
    setIsLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  return {
    skuData,
    isLoading,
    error,
    source,
    reload: loadPricing,
  };
}

/**
 * Hook for Super Admin to manage pricing tiers
 */
export function usePricingAdmin() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  /**
   * Update a pricing tier
   */
  const updateTier = useCallback(async (tierId, updates) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Convert dollar amounts to cents for storage
      const dbUpdates = { ...updates };
      if (updates.monthly_priceforannualbilling !== undefined) {
        dbUpdates.monthly_priceforannualbilling = Math.round(updates.monthly_priceforannualbilling * 100);
      }
      if (updates.monthly_priceformonthlybilling !== undefined) {
        dbUpdates.monthly_priceformonthlybilling = Math.round(updates.monthly_priceformonthlybilling * 100);
      }
      if (updates.monthly_pricefor2yearbilling !== undefined) {
        dbUpdates.monthly_pricefor2yearbilling = Math.round(updates.monthly_pricefor2yearbilling * 100);
      }
      if (updates.monthly_pricefor3yearbilling !== undefined) {
        dbUpdates.monthly_pricefor3yearbilling = Math.round(updates.monthly_pricefor3yearbilling * 100);
      }

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('pricing_tiers')
        .update(dbUpdates)
        .eq('id', tierId);

      if (error) throw error;

      console.log('[Pricing Admin] ✅ Updated tier:', tierId);
      return { success: true };
    } catch (err) {
      console.error('[Pricing Admin] ❌ Update error:', err);
      setSaveError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Create a new pricing tier
   */
  const createTier = useCallback(async (tier) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const dbTier = {
        product_type: REVERSE_PRODUCT_TYPE_MAP[tier.productType] || tier.productType.toLowerCase(),
        tier_name: tier.tierName,
        start_range: tier.startRange,
        end_range: tier.endRange,
        monthly_priceforannualbilling: Math.round((tier.annualBillingPrice || 0) * 100),
        monthly_priceformonthlybilling: Math.round((tier.monthlyBillingPrice || 0) * 100),
        monthly_pricefor2yearbilling: Math.round((tier.twoYearBillingPrice || 0) * 100),
        monthly_pricefor3yearbilling: Math.round((tier.threeYearBillingPrice || 0) * 100),
      };

      const { data, error } = await supabase
        .from('pricing_tiers')
        .insert(dbTier)
        .select()
        .single();

      if (error) throw error;

      console.log('[Pricing Admin] ✅ Created tier:', data.id);
      return { success: true, tier: data };
    } catch (err) {
      console.error('[Pricing Admin] ❌ Create error:', err);
      setSaveError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Delete a pricing tier
   */
  const deleteTier = useCallback(async (tierId) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;

      console.log('[Pricing Admin] ✅ Deleted tier:', tierId);
      return { success: true };
    } catch (err) {
      console.error('[Pricing Admin] ❌ Delete error:', err);
      setSaveError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Get all tiers for admin view (raw database format)
   */
  const getAllTiers = useCallback(async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('product_type')
        .order('start_range');

      if (error) throw error;

      // Convert cents to dollars for display
      return data.map(tier => ({
        ...tier,
        monthly_priceforannualbilling: (tier.monthly_priceforannualbilling || 0) / 100,
        monthly_priceformonthlybilling: (tier.monthly_priceformonthlybilling || 0) / 100,
        monthly_pricefor2yearbilling: (tier.monthly_pricefor2yearbilling || 0) / 100,
        monthly_pricefor3yearbilling: (tier.monthly_pricefor3yearbilling || 0) / 100,
      }));
    } catch (err) {
      console.error('[Pricing Admin] ❌ Fetch error:', err);
      throw err;
    }
  }, []);

  return {
    updateTier,
    createTier,
    deleteTier,
    getAllTiers,
    isSaving,
    saveError,
    PRODUCT_TYPE_MAP,
    REVERSE_PRODUCT_TYPE_MAP,
  };
}

export { PRODUCT_TYPE_MAP, REVERSE_PRODUCT_TYPE_MAP };

