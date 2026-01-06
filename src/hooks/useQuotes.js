/**
 * useQuotes Hook
 * 
 * Manages quote CRUD operations with Supabase.
 * Requires company name and HubSpot deal URL for saving quotes.
 */

import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseConfig';

/**
 * Validate HubSpot deal URL format
 */
function isValidHubSpotUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Accept any hubspot.com URL or allow flexibility for different HubSpot instances
    return parsed.hostname.includes('hubspot.com') || 
           parsed.hostname.includes('hubspot') ||
           url.includes('hubspot');
  } catch {
    return false;
  }
}

/**
 * Generate a unique quote number
 */
function generateQuoteNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QT-${dateStr}-${random}`;
}

/**
 * Main hook for managing quotes
 */
export function useQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all quotes for the current user
   */
  const fetchQuotes = useCallback(async (options = {}) => {
    if (!isSupabaseConfigured() || !supabase) {
      setError('Supabase not configured');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.companyName) {
        query = query.ilike('customer_company', `%${options.companyName}%`);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setQuotes(data || []);
      console.log(`[Quotes] ✅ Fetched ${data?.length || 0} quotes`);
      return data || [];
    } catch (err) {
      console.error('[Quotes] ❌ Fetch error:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save a new quote
   * Requires: companyName, hubspotDealUrl
   */
  const saveQuote = useCallback(async (quoteData) => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    // Validate required fields
    if (!quoteData.companyName || !quoteData.companyName.trim()) {
      return { success: false, error: 'Company name is required' };
    }

    if (!quoteData.hubspotDealUrl || !quoteData.hubspotDealUrl.trim()) {
      return { success: false, error: 'HubSpot deal URL is required' };
    }

    if (!isValidHubSpotUrl(quoteData.hubspotDealUrl)) {
      return { success: false, error: 'Invalid HubSpot deal URL format' };
    }

    setIsSaving(true);
    setError(null);

    try {
      const quoteNumber = generateQuoteNumber();

      const dbQuote = {
        quote_number: quoteNumber,
        customer_name: quoteData.customerName || quoteData.companyName,
        customer_email: quoteData.customerEmail || '',
        customer_company: quoteData.companyName.trim(),
        customer_phone: quoteData.customerPhone || null,
        prepared_by: quoteData.preparedBy || 'Unknown',
        hubspot_deal_url: quoteData.hubspotDealUrl.trim(),
        quote_data: quoteData.pricingData || {},
        total_recurring_cost: Math.round((quoteData.totalRecurringCost || 0) * 100), // Store in cents
        total_onetime_cost: Math.round((quoteData.totalOnetimeCost || 0) * 100),
        adjusted_recurring_cost: Math.round((quoteData.adjustedRecurringCost || quoteData.totalRecurringCost || 0) * 100),
        billing_frequency: quoteData.billingFrequency || 'Annual',
        status: quoteData.status || 'draft',
        pricing_adjustments: quoteData.pricingAdjustments || {},
        original_pricing_data: quoteData.originalPricingData || {},
        expires_at: quoteData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('quotes')
        .insert(dbQuote)
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('[Quotes] ✅ Created quote:', data.quote_number);
      
      // Refresh quotes list
      await fetchQuotes();

      return { success: true, quote: data };
    } catch (err) {
      console.error('[Quotes] ❌ Save error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [fetchQuotes]);

  /**
   * Update an existing quote
   */
  const updateQuote = useCallback(async (quoteId, updates) => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    // Validate HubSpot URL if being updated
    if (updates.hubspotDealUrl && !isValidHubSpotUrl(updates.hubspotDealUrl)) {
      return { success: false, error: 'Invalid HubSpot deal URL format' };
    }

    setIsSaving(true);
    setError(null);

    try {
      const dbUpdates = {
        updated_at: new Date().toISOString(),
      };

      // Map frontend field names to database columns
      if (updates.companyName) dbUpdates.customer_company = updates.companyName;
      if (updates.customerName) dbUpdates.customer_name = updates.customerName;
      if (updates.customerEmail) dbUpdates.customer_email = updates.customerEmail;
      if (updates.customerPhone) dbUpdates.customer_phone = updates.customerPhone;
      if (updates.hubspotDealUrl) dbUpdates.hubspot_deal_url = updates.hubspotDealUrl;
      if (updates.pricingData) dbUpdates.quote_data = updates.pricingData;
      if (updates.totalRecurringCost !== undefined) {
        dbUpdates.total_recurring_cost = Math.round(updates.totalRecurringCost * 100);
      }
      if (updates.totalOnetimeCost !== undefined) {
        dbUpdates.total_onetime_cost = Math.round(updates.totalOnetimeCost * 100);
      }
      if (updates.adjustedRecurringCost !== undefined) {
        dbUpdates.adjusted_recurring_cost = Math.round(updates.adjustedRecurringCost * 100);
      }
      if (updates.billingFrequency) dbUpdates.billing_frequency = updates.billingFrequency;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.pricingAdjustments) dbUpdates.pricing_adjustments = updates.pricingAdjustments;

      const { data, error: updateError } = await supabase
        .from('quotes')
        .update(dbUpdates)
        .eq('id', quoteId)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('[Quotes] ✅ Updated quote:', data.quote_number);
      
      // Refresh quotes list
      await fetchQuotes();

      return { success: true, quote: data };
    } catch (err) {
      console.error('[Quotes] ❌ Update error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [fetchQuotes]);

  /**
   * Delete a quote
   */
  const deleteQuote = useCallback(async (quoteId) => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (deleteError) throw deleteError;

      console.log('[Quotes] ✅ Deleted quote:', quoteId);
      
      // Refresh quotes list
      await fetchQuotes();

      return { success: true };
    } catch (err) {
      console.error('[Quotes] ❌ Delete error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [fetchQuotes]);

  /**
   * Get a single quote by ID
   */
  const getQuote = useCallback(async (quoteId) => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Convert cents back to dollars
      return {
        success: true,
        quote: {
          ...data,
          total_recurring_cost: (data.total_recurring_cost || 0) / 100,
          total_onetime_cost: (data.total_onetime_cost || 0) / 100,
          adjusted_recurring_cost: (data.adjusted_recurring_cost || 0) / 100,
        },
      };
    } catch (err) {
      console.error('[Quotes] ❌ Get error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Get quote by quote number
   */
  const getQuoteByNumber = useCallback(async (quoteNumber) => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_number', quoteNumber)
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        quote: {
          ...data,
          total_recurring_cost: (data.total_recurring_cost || 0) / 100,
          total_onetime_cost: (data.total_onetime_cost || 0) / 100,
          adjusted_recurring_cost: (data.adjusted_recurring_cost || 0) / 100,
        },
      };
    } catch (err) {
      console.error('[Quotes] ❌ Get by number error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Duplicate a quote
   */
  const duplicateQuote = useCallback(async (quoteId) => {
    const result = await getQuote(quoteId);
    if (!result.success) return result;

    const originalQuote = result.quote;
    
    return saveQuote({
      companyName: originalQuote.customer_company,
      customerName: originalQuote.customer_name,
      customerEmail: originalQuote.customer_email,
      customerPhone: originalQuote.customer_phone,
      hubspotDealUrl: originalQuote.hubspot_deal_url,
      pricingData: originalQuote.quote_data,
      totalRecurringCost: originalQuote.total_recurring_cost,
      totalOnetimeCost: originalQuote.total_onetime_cost,
      billingFrequency: originalQuote.billing_frequency,
      status: 'draft',
      pricingAdjustments: originalQuote.pricing_adjustments,
      preparedBy: originalQuote.prepared_by,
    });
  }, [getQuote, saveQuote]);

  return {
    quotes,
    isLoading,
    isSaving,
    error,
    fetchQuotes,
    saveQuote,
    updateQuote,
    deleteQuote,
    getQuote,
    getQuoteByNumber,
    duplicateQuote,
    isValidHubSpotUrl,
  };
}

export { isValidHubSpotUrl, generateQuoteNumber };

