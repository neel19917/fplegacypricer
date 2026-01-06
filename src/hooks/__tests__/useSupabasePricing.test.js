/**
 * Tests for useSupabasePricing hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: mockPricingTiers, error: null })),
      })),
    })),
  })),
};

const mockPricingTiers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    product_type: 'freight',
    tier_name: 'Starter',
    start_range: 1,
    end_range: 100,
    monthly_priceforannualbilling: 83000, // $830 in cents
    monthly_priceformonthlybilling: 100000, // $1000 in cents
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    product_type: 'parcel',
    tier_name: 'Basic',
    start_range: 1,
    end_range: 50,
    monthly_priceforannualbilling: 50000,
    monthly_priceformonthlybilling: 65000,
  },
];

// Mock the supabaseConfig
jest.mock('../../supabaseConfig', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: jest.fn(() => true),
}));

// Mock jsonHelpers for fallback
jest.mock('../../utils/jsonHelpers', () => ({
  loadDefaultPricing: jest.fn(() => Promise.resolve({
    Freight: { annual: [], monthly: [] },
    Parcel: { annual: [], monthly: [] },
  })),
}));

// Import after mocks
import { useSupabasePricing, usePricingAdmin, PRODUCT_TYPE_MAP } from '../useSupabasePricing';
import { isSupabaseConfigured } from '../../supabaseConfig';
import { loadDefaultPricing } from '../../utils/jsonHelpers';

describe('useSupabasePricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useSupabasePricing());
      expect(result.current.isLoading).toBe(true);
    });

    it('should set loading false after data loads', async () => {
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('data transformation', () => {
    it('should transform database tiers to app SKU format', async () => {
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.skuData).not.toBeNull();
      });

      // Check that Freight data was transformed correctly
      const freightAnnual = result.current.skuData?.Freight?.annual;
      expect(freightAnnual).toBeDefined();
      
      if (freightAnnual && freightAnnual.length > 0) {
        const firstTier = freightAnnual[0];
        expect(firstTier).toHaveProperty('sku');
        expect(firstTier).toHaveProperty('tier');
        expect(firstTier).toHaveProperty('rangeStart');
        expect(firstTier).toHaveProperty('rangeEnd');
        expect(firstTier).toHaveProperty('perMonthCost');
        expect(firstTier).toHaveProperty('annualCost');
      }
    });

    it('should convert prices from cents to dollars', async () => {
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.skuData).not.toBeNull();
      });

      const freightAnnual = result.current.skuData?.Freight?.annual;
      if (freightAnnual && freightAnnual.length > 0) {
        // 83000 cents = $830
        expect(freightAnnual[0].perMonthCost).toBe(830);
        expect(freightAnnual[0].annualCost).toBe(830 * 12);
      }
    });

    it('should set source to supabase when loaded from database', async () => {
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.source).toBe('supabase');
      });
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to JSON when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);
      
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(loadDefaultPricing).toHaveBeenCalled();
    });

    it('should fall back to JSON when Supabase errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } })),
          })),
        })),
      });

      isSupabaseConfigured.mockReturnValue(true);
      
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(loadDefaultPricing).toHaveBeenCalled();
    });
  });

  describe('reload functionality', () => {
    it('should have a reload function', async () => {
      const { result } = renderHook(() => useSupabasePricing());
      
      await waitFor(() => {
        expect(result.current.reload).toBeDefined();
        expect(typeof result.current.reload).toBe('function');
      });
    });
  });
});

describe('PRODUCT_TYPE_MAP', () => {
  it('should have all expected product types', () => {
    expect(PRODUCT_TYPE_MAP).toHaveProperty('freight');
    expect(PRODUCT_TYPE_MAP).toHaveProperty('parcel');
    expect(PRODUCT_TYPE_MAP).toHaveProperty('ocean');
    expect(PRODUCT_TYPE_MAP).toHaveProperty('locations');
    expect(PRODUCT_TYPE_MAP).toHaveProperty('auditmodule');
    expect(PRODUCT_TYPE_MAP).toHaveProperty('dockscheduling');
  });

  it('should map database types to app types correctly', () => {
    expect(PRODUCT_TYPE_MAP.freight).toBe('Freight');
    expect(PRODUCT_TYPE_MAP.parcel).toBe('Parcel');
    expect(PRODUCT_TYPE_MAP.ocean).toBe('Ocean');
  });
});

describe('usePricingAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it('should provide CRUD operations', () => {
    const { result } = renderHook(() => usePricingAdmin());
    
    expect(result.current.updateTier).toBeDefined();
    expect(result.current.createTier).toBeDefined();
    expect(result.current.deleteTier).toBeDefined();
    expect(result.current.getAllTiers).toBeDefined();
  });

  it('should track saving state', () => {
    const { result } = renderHook(() => usePricingAdmin());
    
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeNull();
  });
});

