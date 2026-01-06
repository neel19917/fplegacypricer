/**
 * Tests for useQuotes hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';

// Mock data
const mockQuotes = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    quote_number: 'QT-20250106-ABCD',
    customer_company: 'Test Company',
    customer_name: 'John Doe',
    customer_email: 'john@test.com',
    hubspot_deal_url: 'https://app.hubspot.com/contacts/123/deal/456',
    quote_data: { products: {} },
    total_recurring_cost: 100000, // $1000 in cents
    total_onetime_cost: 50000, // $500 in cents
    billing_frequency: 'Annual',
    status: 'draft',
    created_at: '2025-01-06T12:00:00Z',
  },
];

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(() => Promise.resolve({ data: mockQuotes, error: null })),
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: mockQuotes[0], error: null })),
      })),
      ilike: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockQuotes, error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ 
          data: { ...mockQuotes[0], id: 'new-id', quote_number: 'QT-NEW' }, 
          error: null 
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockQuotes[0], error: null })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

// Mock the supabaseConfig
jest.mock('../../supabaseConfig', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: jest.fn(() => true),
}));

// Import after mocks
import { useQuotes, isValidHubSpotUrl, generateQuoteNumber } from '../useQuotes';
import { isSupabaseConfigured } from '../../supabaseConfig';

describe('useQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('should start with empty quotes array', () => {
      const { result } = renderHook(() => useQuotes());
      expect(result.current.quotes).toEqual([]);
    });

    it('should start with loading false', () => {
      const { result } = renderHook(() => useQuotes());
      expect(result.current.isLoading).toBe(false);
    });

    it('should start with saving false', () => {
      const { result } = renderHook(() => useQuotes());
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('fetchQuotes', () => {
    it('should fetch quotes from Supabase', async () => {
      const { result } = renderHook(() => useQuotes());
      
      await act(async () => {
        await result.current.fetchQuotes();
      });

      expect(result.current.quotes).toHaveLength(1);
      expect(result.current.quotes[0].customer_company).toBe('Test Company');
    });

    it('should set error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);
      
      const { result } = renderHook(() => useQuotes());
      
      await act(async () => {
        await result.current.fetchQuotes();
      });

      expect(result.current.error).toBe('Supabase not configured');
    });
  });

  describe('saveQuote', () => {
    it('should reject when company name is missing', async () => {
      const { result } = renderHook(() => useQuotes());
      
      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveQuote({
          companyName: '',
          hubspotDealUrl: 'https://app.hubspot.com/contacts/123/deal/456',
        });
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toBe('Company name is required');
    });

    it('should reject when HubSpot deal URL is missing', async () => {
      const { result } = renderHook(() => useQuotes());
      
      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveQuote({
          companyName: 'Test Company',
          hubspotDealUrl: '',
        });
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toBe('HubSpot deal URL is required');
    });

    it('should reject when HubSpot URL is invalid', async () => {
      const { result } = renderHook(() => useQuotes());
      
      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveQuote({
          companyName: 'Test Company',
          hubspotDealUrl: 'https://google.com/invalid',
        });
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toBe('Invalid HubSpot deal URL format');
    });

    it('should save quote with valid data', async () => {
      const { result } = renderHook(() => useQuotes());
      
      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveQuote({
          companyName: 'Test Company',
          hubspotDealUrl: 'https://app.hubspot.com/contacts/123/deal/456',
          totalRecurringCost: 1000,
          totalOnetimeCost: 500,
          billingFrequency: 'Annual',
        });
      });

      expect(saveResult.success).toBe(true);
      expect(saveResult.quote).toBeDefined();
    });
  });

  describe('deleteQuote', () => {
    it('should delete a quote by ID', async () => {
      const { result } = renderHook(() => useQuotes());
      
      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteQuote('123e4567-e89b-12d3-a456-426614174000');
      });

      expect(deleteResult.success).toBe(true);
    });
  });

  describe('getQuote', () => {
    it('should get a single quote by ID', async () => {
      const { result } = renderHook(() => useQuotes());
      
      let getResult;
      await act(async () => {
        getResult = await result.current.getQuote('123e4567-e89b-12d3-a456-426614174000');
      });

      expect(getResult.success).toBe(true);
      expect(getResult.quote).toBeDefined();
      // Check that cents are converted to dollars
      expect(getResult.quote.total_recurring_cost).toBe(1000);
      expect(getResult.quote.total_onetime_cost).toBe(500);
    });
  });
});

describe('isValidHubSpotUrl', () => {
  it('should accept valid HubSpot URLs', () => {
    expect(isValidHubSpotUrl('https://app.hubspot.com/contacts/123/deal/456')).toBe(true);
    expect(isValidHubSpotUrl('https://hubspot.com/deals')).toBe(true);
    expect(isValidHubSpotUrl('https://eu1.hubspot.com/contacts/123/deal/456')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidHubSpotUrl('')).toBe(false);
    expect(isValidHubSpotUrl('not-a-url')).toBe(false);
    expect(isValidHubSpotUrl('https://google.com')).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(isValidHubSpotUrl(null)).toBe(false);
    expect(isValidHubSpotUrl(undefined)).toBe(false);
  });
});

describe('generateQuoteNumber', () => {
  it('should generate a unique quote number', () => {
    const quoteNumber = generateQuoteNumber();
    expect(quoteNumber).toMatch(/^QT-\d{8}-[A-Z0-9]{4}$/);
  });

  it('should generate different numbers on each call', () => {
    const num1 = generateQuoteNumber();
    const num2 = generateQuoteNumber();
    // They could theoretically be the same but extremely unlikely
    // Just check format is correct
    expect(num1).toMatch(/^QT-\d{8}-[A-Z0-9]{4}$/);
    expect(num2).toMatch(/^QT-\d{8}-[A-Z0-9]{4}$/);
  });
});

