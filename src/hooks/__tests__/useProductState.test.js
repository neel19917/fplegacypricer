import { renderHook, act } from '@testing-library/react';
import { useProductState } from '../useProductState';

describe('useProductState Hook', () => {
  describe('Initialization', () => {
    it('should initialize product state from productConfig', () => {
      const { result } = renderHook(() => useProductState());
      
      expect(result.current.products).toBeDefined();
      expect(typeof result.current.products).toBe('object');
    });

    it('should initialize standard products with default values', () => {
      const { result } = renderHook(() => useProductState());
      
      // Check freight product (standard volume-based)
      const freightState = result.current.getProductState('freight');
      expect(freightState).toHaveProperty('volume');
      expect(freightState).toHaveProperty('sku');
      expect(freightState).toHaveProperty('override');
      expect(freightState).toHaveProperty('markup');
    });

    it('should initialize AI Agent with checkbox fields undefined', () => {
      const { result } = renderHook(() => useProductState());
      
      const aiAgentState = result.current.getProductState('aiAgent');
      expect(aiAgentState).toHaveProperty('enabled');
      expect(aiAgentState).toHaveProperty('volume');
      // These should NOT be present initially
      expect(aiAgentState.includesFreight).toBeUndefined();
      expect(aiAgentState.includesParcel).toBeUndefined();
      expect(aiAgentState.includesOcean).toBeUndefined();
    });

    it('should initialize Yard Management with custom inputs', () => {
      const { result } = renderHook(() => useProductState());
      
      const yardManagementState = result.current.getProductState('yardManagement');
      expect(yardManagementState).toHaveProperty('inputs');
      expect(yardManagementState.inputs).toHaveProperty('facilities');
      expect(yardManagementState.inputs).toHaveProperty('assets');
    });

    it('should initialize Bill Pay with Yes/No value', () => {
      const { result } = renderHook(() => useProductState());
      
      const billPayState = result.current.getProductState('billPay');
      expect(billPayState).toHaveProperty('value');
      expect(billPayState.value).toBe('No');
    });
  });

  describe('getProductValue', () => {
    it('should return volume for standard products', () => {
      const { result } = renderHook(() => useProductState());
      
      const volume = result.current.getProductValue('freight', 'volume');
      expect(typeof volume).toBe('number');
      expect(volume).toBe(0);
    });

    it('should return undefined for unset AI Agent checkbox fields', () => {
      const { result } = renderHook(() => useProductState());
      
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBeUndefined();
      expect(result.current.getProductValue('aiAgent', 'includesParcel')).toBeUndefined();
      expect(result.current.getProductValue('aiAgent', 'includesOcean')).toBeUndefined();
    });

    it('should return boolean value for set AI Agent checkbox fields', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('aiAgent', 'includesFreight', true);
      });
      
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBe(true);
    });

    it('should return false for AI Agent checkbox field set to false', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('aiAgent', 'includesFreight', false);
      });
      
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBe(false);
    });

    it('should return default values for missing products', () => {
      const { result } = renderHook(() => useProductState());
      
      expect(result.current.getProductValue('nonexistent', 'volume')).toBe(0);
      expect(result.current.getProductValue('nonexistent', 'sku')).toBe('');
      expect(result.current.getProductValue('nonexistent', 'inputs')).toEqual({});
      expect(result.current.getProductValue('nonexistent', 'override')).toBe(false);
    });

    it('should return markup value with fallback to 0', () => {
      const { result } = renderHook(() => useProductState());
      
      expect(result.current.getProductValue('freight', 'markup')).toBe(0);
      
      act(() => {
        result.current.setProductValue('freight', 'markup', 10);
      });
      
      expect(result.current.getProductValue('freight', 'markup')).toBe(10);
    });

    it('should return enabled field for AI Agent', () => {
      const { result } = renderHook(() => useProductState());
      
      expect(result.current.getProductValue('aiAgent', 'enabled')).toBe(false);
      
      act(() => {
        result.current.setProductValue('aiAgent', 'enabled', true);
      });
      
      expect(result.current.getProductValue('aiAgent', 'enabled')).toBe(true);
    });
  });

  describe('setProductValue', () => {
    it('should update volume for standard products', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('freight', 'volume', 100);
      });
      
      expect(result.current.getProductValue('freight', 'volume')).toBe(100);
    });

    it('should update AI Agent checkbox fields', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('aiAgent', 'includesFreight', true);
        result.current.setProductValue('aiAgent', 'includesParcel', true);
        result.current.setProductValue('aiAgent', 'includesOcean', false);
      });
      
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBe(true);
      expect(result.current.getProductValue('aiAgent', 'includesParcel')).toBe(true);
      expect(result.current.getProductValue('aiAgent', 'includesOcean')).toBe(false);
    });

    it('should update multiple fields independently', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('freight', 'volume', 50);
        result.current.setProductValue('freight', 'markup', 15);
        result.current.setProductValue('freight', 'sku', 'TEST-SKU');
      });
      
      expect(result.current.getProductValue('freight', 'volume')).toBe(50);
      expect(result.current.getProductValue('freight', 'markup')).toBe(15);
      expect(result.current.getProductValue('freight', 'sku')).toBe('TEST-SKU');
    });

    it('should not affect other products when updating one', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('freight', 'volume', 100);
      });
      
      expect(result.current.getProductValue('parcel', 'volume')).toBe(0);
    });
  });

  describe('setProductInput', () => {
    it('should update custom inputs for Yard Management', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductInput('yardManagement', 'facilities', 5);
        result.current.setProductInput('yardManagement', 'assets', 20);
      });
      
      const inputs = result.current.getProductValue('yardManagement', 'inputs');
      expect(inputs.facilities).toBe(5);
      expect(inputs.assets).toBe(20);
    });

    it('should not affect other input fields when updating one', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductInput('yardManagement', 'facilities', 3);
      });
      
      const inputs = result.current.getProductValue('yardManagement', 'inputs');
      expect(inputs.facilities).toBe(3);
      expect(inputs.assets).toBeDefined(); // Should still have default value
    });
  });

  describe('getProductConfig', () => {
    it('should return product configuration by ID', () => {
      const { result } = renderHook(() => useProductState());
      
      const freightConfig = result.current.getProductConfig('freight');
      expect(freightConfig).toBeDefined();
      expect(freightConfig.id).toBe('freight');
    });

    it('should return undefined for nonexistent product', () => {
      const { result } = renderHook(() => useProductState());
      
      const config = result.current.getProductConfig('nonexistent');
      expect(config).toBeUndefined();
    });
  });

  describe('getProductState', () => {
    it('should return the entire state object for a product', () => {
      const { result } = renderHook(() => useProductState());
      
      const state = result.current.getProductState('freight');
      expect(state).toHaveProperty('volume');
      expect(state).toHaveProperty('sku');
      expect(state).toHaveProperty('override');
      expect(state).toHaveProperty('markup');
    });

    it('should return empty object for nonexistent product', () => {
      const { result } = renderHook(() => useProductState());
      
      const state = result.current.getProductState('nonexistent');
      expect(state).toEqual({});
    });
  });

  describe('resetAllProducts', () => {
    it('should reset all products to initial state', () => {
      const { result } = renderHook(() => useProductState());
      
      // Modify some values
      act(() => {
        result.current.setProductValue('freight', 'volume', 100);
        result.current.setProductValue('aiAgent', 'includesFreight', true);
        result.current.setProductInput('yardManagement', 'facilities', 5);
      });
      
      // Reset
      act(() => {
        result.current.resetAllProducts();
      });
      
      // Verify reset
      expect(result.current.getProductValue('freight', 'volume')).toBe(0);
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBeUndefined();
      const inputs = result.current.getProductValue('yardManagement', 'inputs');
      expect(inputs.facilities).toBe(0); // Default value
    });
  });

  describe('getProductsByCategory', () => {
    it('should return product IDs for a given category', () => {
      const { result } = renderHook(() => useProductState());
      
      const coreProducts = result.current.getProductsByCategory('coreTMS');
      expect(Array.isArray(coreProducts)).toBe(true);
      expect(coreProducts.length).toBeGreaterThan(0);
      expect(coreProducts).toContain('freight');
    });

    it('should return empty array for nonexistent category', () => {
      const { result } = renderHook(() => useProductState());
      
      const products = result.current.getProductsByCategory('nonexistent');
      expect(products).toEqual([]);
    });
  });

  describe('AI Agent Checkbox State Management (Critical for Bug Fix)', () => {
    it('should maintain undefined state until explicitly set', () => {
      const { result } = renderHook(() => useProductState());
      
      // Initially undefined
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBeUndefined();
      
      // Still undefined after accessing multiple times
      result.current.getProductValue('aiAgent', 'includesFreight');
      result.current.getProductValue('aiAgent', 'includesFreight');
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBeUndefined();
    });

    it('should distinguish between undefined, true, and false states', () => {
      const { result } = renderHook(() => useProductState());
      
      // Start undefined
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBeUndefined();
      
      // Set to true
      act(() => {
        result.current.setProductValue('aiAgent', 'includesFreight', true);
      });
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBe(true);
      
      // Set to false (not the same as undefined!)
      act(() => {
        result.current.setProductValue('aiAgent', 'includesFreight', false);
      });
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBe(false);
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).not.toBeUndefined();
    });

    it('should handle all three checkbox fields independently', () => {
      const { result } = renderHook(() => useProductState());
      
      act(() => {
        result.current.setProductValue('aiAgent', 'includesFreight', true);
      });
      
      expect(result.current.getProductValue('aiAgent', 'includesFreight')).toBe(true);
      expect(result.current.getProductValue('aiAgent', 'includesParcel')).toBeUndefined();
      expect(result.current.getProductValue('aiAgent', 'includesOcean')).toBeUndefined();
    });
  });
});

