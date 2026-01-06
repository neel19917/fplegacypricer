/**
 * Tests for QuoteDashboard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the useQuotes hook
const mockFetchQuotes = jest.fn(() => Promise.resolve([]));
const mockSaveQuote = jest.fn(() => Promise.resolve({ success: true, quote: {} }));
const mockDeleteQuote = jest.fn(() => Promise.resolve({ success: true }));

jest.mock('../../hooks/useQuotes', () => ({
  useQuotes: () => ({
    quotes: [
      {
        id: '123',
        quote_number: 'QT-20250106-ABCD',
        customer_company: 'Test Company',
        hubspot_deal_url: 'https://app.hubspot.com/contacts/123/deal/456',
        total_recurring_cost: 100000,
        status: 'draft',
        created_at: '2025-01-06T12:00:00Z',
      },
    ],
    isLoading: false,
    isSaving: false,
    error: null,
    fetchQuotes: mockFetchQuotes,
    saveQuote: mockSaveQuote,
    deleteQuote: mockDeleteQuote,
  }),
  isValidHubSpotUrl: jest.fn((url) => url && url.includes('hubspot')),
}));

jest.mock('../../utils/permissions', () => ({
  canDeleteQuote: jest.fn(() => true),
}));

import { QuoteDashboard } from '../QuoteDashboard';

describe('QuoteDashboard', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onLoadQuote: jest.fn(),
    currentPricingData: {},
    currentUser: { email: 'test@freightpop.com' },
    userProfile: { user_type: 'Sales' },
    companyName: '',
    billingFrequency: 'annual',
    totalRecurringCost: 1000,
    totalOnetimeCost: 500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<QuoteDashboard {...defaultProps} />);
      expect(screen.getByText('Quote Dashboard')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<QuoteDashboard {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Quote Dashboard')).not.toBeInTheDocument();
    });

    it('should display save and load tabs', () => {
      render(<QuoteDashboard {...defaultProps} />);
      expect(screen.getByText(/Save Quote/)).toBeInTheDocument();
      expect(screen.getByText(/Load Quote/)).toBeInTheDocument();
    });
  });

  describe('save tab', () => {
    it('should show company name input field', () => {
      render(<QuoteDashboard {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter company name')).toBeInTheDocument();
    });

    it('should show HubSpot deal URL input field', () => {
      render(<QuoteDashboard {...defaultProps} />);
      expect(screen.getByPlaceholderText(/hubspot/i)).toBeInTheDocument();
    });

    it('should show required indicators for company name and HubSpot URL', () => {
      render(<QuoteDashboard {...defaultProps} />);
      const companyLabel = screen.getByText(/Company Name/);
      const hubspotLabel = screen.getByText(/HubSpot Deal URL/);
      
      // Check for required indicator (asterisk)
      expect(companyLabel.parentElement).toHaveTextContent('*');
      expect(hubspotLabel.parentElement).toHaveTextContent('*');
    });

    it('should show validation error when company name is empty', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      // Fill HubSpot URL but not company name
      const hubspotInput = screen.getByPlaceholderText(/hubspot/i);
      await userEvent.type(hubspotInput, 'https://app.hubspot.com/contacts/123/deal/456');
      
      // Click save
      const saveButton = screen.getByText(/Save Quote/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeInTheDocument();
      });
    });

    it('should show validation error when HubSpot URL is empty', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      // Fill company name but not HubSpot URL
      const companyInput = screen.getByPlaceholderText('Enter company name');
      await userEvent.type(companyInput, 'Test Company');
      
      // Click save
      const saveButton = screen.getByText(/Save Quote/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('HubSpot deal URL is required')).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid HubSpot URL', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      // Fill both fields but with invalid URL
      const companyInput = screen.getByPlaceholderText('Enter company name');
      await userEvent.type(companyInput, 'Test Company');
      
      const hubspotInput = screen.getByPlaceholderText(/hubspot/i);
      await userEvent.type(hubspotInput, 'https://google.com/invalid');
      
      // Click save
      const saveButton = screen.getByText(/Save Quote/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid HubSpot URL')).toBeInTheDocument();
      });
    });

    it('should call saveQuote with valid data', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      // Fill both fields
      const companyInput = screen.getByPlaceholderText('Enter company name');
      await userEvent.type(companyInput, 'Test Company');
      
      const hubspotInput = screen.getByPlaceholderText(/hubspot/i);
      await userEvent.type(hubspotInput, 'https://app.hubspot.com/contacts/123/deal/456');
      
      // Click save
      const saveButton = screen.getByText(/Save Quote/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockSaveQuote).toHaveBeenCalledWith(expect.objectContaining({
          companyName: 'Test Company',
          hubspotDealUrl: 'https://app.hubspot.com/contacts/123/deal/456',
        }));
      });
    });

    it('should display quote summary', () => {
      render(<QuoteDashboard {...defaultProps} />);
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();
      expect(screen.getByText(/Recurring:/)).toBeInTheDocument();
      expect(screen.getByText(/One-time:/)).toBeInTheDocument();
    });
  });

  describe('load tab', () => {
    it('should fetch quotes when switching to load tab', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const loadTab = screen.getByText(/Load Quote/);
      fireEvent.click(loadTab);
      
      await waitFor(() => {
        expect(mockFetchQuotes).toHaveBeenCalled();
      });
    });

    it('should display list of quotes', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const loadTab = screen.getByText(/Load Quote/);
      fireEvent.click(loadTab);
      
      await waitFor(() => {
        expect(screen.getByText('Test Company')).toBeInTheDocument();
        expect(screen.getByText('QT-20250106-ABCD')).toBeInTheDocument();
      });
    });

    it('should show HubSpot link for each quote', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const loadTab = screen.getByText(/Load Quote/);
      fireEvent.click(loadTab);
      
      await waitFor(() => {
        expect(screen.getByText(/HubSpot Deal/)).toBeInTheDocument();
      });
    });

    it('should filter quotes by search term', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const loadTab = screen.getByText(/Load Quote/);
      fireEvent.click(loadTab);
      
      const searchInput = screen.getByPlaceholderText(/Search by company/i);
      await userEvent.type(searchInput, 'Test');
      
      await waitFor(() => {
        expect(screen.getByText('Test Company')).toBeInTheDocument();
      });
    });

    it('should call onLoadQuote when clicking Load button', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const loadTab = screen.getByText(/Load Quote/);
      fireEvent.click(loadTab);
      
      await waitFor(() => {
        const loadButton = screen.getByText(/📂 Load/);
        fireEvent.click(loadButton);
      });
      
      expect(defaultProps.onLoadQuote).toHaveBeenCalled();
    });

    it('should show delete button for quotes user can delete', async () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const loadTab = screen.getByText(/Load Quote/);
      fireEvent.click(loadTab);
      
      await waitFor(() => {
        expect(screen.getByText('🗑️')).toBeInTheDocument();
      });
    });
  });

  describe('close behavior', () => {
    it('should call onClose when clicking close button', () => {
      render(<QuoteDashboard {...defaultProps} />);
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking overlay', () => {
      const { container } = render(<QuoteDashboard {...defaultProps} />);
      
      // Click on the overlay (first child)
      const overlay = container.firstChild;
      fireEvent.click(overlay);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});

