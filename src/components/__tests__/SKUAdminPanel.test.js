/**
 * Tests for SKUAdminPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock pricing tiers data
const mockTiers = [
  {
    id: '123',
    product_type: 'freight',
    tier_name: 'Starter',
    start_range: 1,
    end_range: 100,
    monthly_priceforannualbilling: 830,
    monthly_priceformonthlybilling: 1000,
  },
  {
    id: '456',
    product_type: 'parcel',
    tier_name: 'Basic',
    start_range: 1,
    end_range: 50,
    monthly_priceforannualbilling: 500,
    monthly_priceformonthlybilling: 650,
  },
];

// Mock the usePricingAdmin hook
const mockGetAllTiers = jest.fn(() => Promise.resolve(mockTiers));
const mockUpdateTier = jest.fn(() => Promise.resolve({ success: true }));
const mockCreateTier = jest.fn(() => Promise.resolve({ success: true, tier: {} }));
const mockDeleteTier = jest.fn(() => Promise.resolve({ success: true }));

jest.mock('../../hooks/useSupabasePricing', () => ({
  usePricingAdmin: () => ({
    getAllTiers: mockGetAllTiers,
    updateTier: mockUpdateTier,
    createTier: mockCreateTier,
    deleteTier: mockDeleteTier,
    isSaving: false,
    saveError: null,
  }),
  PRODUCT_TYPE_MAP: {
    freight: 'Freight',
    parcel: 'Parcel',
    ocean: 'Ocean',
    locations: 'Locations',
    auditmodule: 'Auditing',
    dockscheduling: 'DockScheduling',
  },
}));

// Mock permissions
jest.mock('../../utils/permissions', () => ({
  isSuperAdmin: jest.fn((profile) => profile?.user_type === 'Super Admin'),
}));

import { SKUAdminPanel } from '../SKUAdminPanel';

describe('SKUAdminPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    userProfile: { user_type: 'Super Admin' },
    onPricingUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('access control', () => {
    it('should render for Super Admin users', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Pricing Administration')).toBeInTheDocument();
      });
    });

    it('should show access denied for non-Super Admin users', () => {
      render(<SKUAdminPanel {...defaultProps} userProfile={{ user_type: 'Sales' }} />);
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Only Super Admin users/)).toBeInTheDocument();
    });

    it('should show access denied for Admin users', () => {
      render(<SKUAdminPanel {...defaultProps} userProfile={{ user_type: 'Admin' }} />);
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<SKUAdminPanel {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Pricing Administration')).not.toBeInTheDocument();
    });
  });

  describe('loading tiers', () => {
    it('should load tiers when opened', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockGetAllTiers).toHaveBeenCalled();
      });
    });

    it('should display pricing tiers in a table', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Starter')).toBeInTheDocument();
        expect(screen.getByText('Basic')).toBeInTheDocument();
      });
    });

    it('should show product type badge', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Freight')).toBeInTheDocument();
        expect(screen.getByText('Parcel')).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('should have a product filter dropdown', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Products')).toBeInTheDocument();
      });
    });

    it('should have a search input', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search tiers...')).toBeInTheDocument();
      });
    });
  });

  describe('editing tiers', () => {
    it('should show edit button for each tier', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('✏️').length).toBeGreaterThan(0);
      });
    });

    it('should show delete button for each tier', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('🗑️').length).toBeGreaterThan(0);
      });
    });
  });

  describe('adding tiers', () => {
    it('should have an Add Tier button', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Add Tier/)).toBeInTheDocument();
      });
    });

    it('should show add form when clicking Add Tier', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        const addButton = screen.getByText(/Add Tier/);
        fireEvent.click(addButton);
      });
      
      expect(screen.getByText('Add New Pricing Tier')).toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when clicking close button', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
      });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking Close button in footer', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);
      });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Super Admin badge', () => {
    it('should display Super Admin badge', async () => {
      render(<SKUAdminPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Super Admin')).toBeInTheDocument();
      });
    });
  });
});

