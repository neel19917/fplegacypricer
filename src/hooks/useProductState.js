import { useState, useEffect, useRef } from 'react';
import { productConfig } from '../productConfig';
import { safeGet, safeSet, decodeVolumes, encodeVolumes, VOLUMES_KEY } from '../utils/storage';

/**
 * Custom hook for managing product state across the application
 * Provides centralized state management for all products
 */
export const useProductState = () => {
  // Initialize product state from productConfig
  const initializeProductState = () => {
    const state = {};
    
    productConfig.forEach(product => {
      if (product.pricingType === 'custom' && product.customInputs) {
        // Yard Management: facilities + assets
        state[product.id] = {
          inputs: product.customInputs.reduce((acc, input) => ({
            ...acc,
            [input.id]: input.defaultValue
          }), {}),
          markup: 0
        };
      } else if (product.inputType === 'yesNo') {
        // Bill Pay: Yes/No instead of volume
        state[product.id] = {
          value: product.defaultValue || 'No',
          markup: 0
        };
      } else if (product.id === 'aiAgent') {
        // AI Agent: Special handling for checkbox-based product selection
        state[product.id] = {
          volume: product.defaultVolume || 0,
          sku: '',
          override: false,
          markup: 0,
          enabled: false,
          // Note: includesFreight, includesParcel, includesOcean are intentionally
          // NOT initialized here - they need to remain undefined until user interaction
          // so the auto-check logic in App.jsx works correctly
        };
      } else {
        // Standard products: volume, sku, override, markup
        state[product.id] = {
          volume: product.defaultVolume || 0,
          sku: '',
          override: false,
          markup: 0
        };
      }
    });
    
    return state;
  };

  // Load from storage BEFORE initializing defaults
  const loadFromStorage = () => {
    const stored = safeGet(VOLUMES_KEY);
    if (stored) {
      const decoded = decodeVolumes(stored);
      if (decoded && decoded.products) {
        // Merge stored products with defaults (stored takes precedence)
        const defaults = initializeProductState();
        const merged = { ...defaults };
        
        // Merge each product, preserving stored values where they exist
        Object.keys(decoded.products).forEach(productId => {
          if (merged[productId]) {
            merged[productId] = {
              ...merged[productId],
              ...decoded.products[productId]
            };
          }
        });
        
        console.log('[useProductState] Loaded volumes from storage');
        return merged;
      } else {
        console.warn('[useProductState] Failed to decode stored volumes, falling back to defaults');
      }
    } else {
      console.log('[useProductState] No stored volumes found, using defaults');
    }
    
    // Fallback to defaults
    return initializeProductState();
  };

  const [products, setProducts] = useState(loadFromStorage);
  
  // Debounce timer ref for saving to storage
  const saveTimeoutRef = useRef(null);
  
  // Save to storage whenever products state changes (debounced)
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 300ms of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      const dataToSave = {
        products: products
      };
      
      const encoded = encodeVolumes(dataToSave);
      const success = safeSet(VOLUMES_KEY, encoded);
      
      if (success) {
        console.log('[useProductState] Saved volumes to storage');
      } else {
        console.warn('[useProductState] Failed to save volumes to storage (continuing with in-memory state)');
      }
    }, 300);
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [products]);

  /**
   * Get a specific value from a product's state
   * @param {string} productId - The product ID
   * @param {string} field - The field to retrieve (volume, markup, sku, override, inputs, value, includesFreight, includesParcel, includesOcean, enabled)
   * @returns {*} The field value or default (returns undefined for unset checkbox fields)
   */
  const getProductValue = (productId, field) => {
    const product = products[productId];
    if (!product) {
      // Return appropriate defaults for missing products
      if (field === 'inputs') return {};
      if (field === 'sku') return '';
      if (field === 'override' || field === 'enabled') return false;
      return 0;
    }
    
    // Handle different product types
    if (field === 'volume' || field === 'value') {
      return product.volume !== undefined ? product.volume : product.value;
    }
    if (field === 'markup') return product.markup || 0;
    if (field === 'sku') return product.sku || '';
    if (field === 'override') return product.override || false;
    if (field === 'inputs') return product.inputs || {};
    if (field === 'enabled') return product.enabled || false;
    
    // AI Agent checkbox fields - must return undefined if not set
    // This is critical for the auto-check logic in App.jsx
    if (field === 'includesFreight' || field === 'includesParcel' || field === 'includesOcean') {
      // Debug logging (will be removed after validation)
      if (productId === 'aiAgent') {
        console.log(`[useProductState] getProductValue('${productId}', '${field}') = ${product[field]}`);
      }
      return product[field]; // Returns undefined if not set, which is intentional
    }
    
    // For any other custom fields, return the value directly or undefined
    return product[field];
  };

  /**
   * Set a specific value in a product's state
   * @param {string} productId - The product ID
   * @param {string} field - The field to update
   * @param {*} value - The new value
   */
  const setProductValue = (productId, field, value) => {
    // Debug logging for AI Agent checkbox changes (will be removed after validation)
    if (productId === 'aiAgent' && (field === 'includesFreight' || field === 'includesParcel' || field === 'includesOcean')) {
      console.log(`[useProductState] setProductValue('${productId}', '${field}', ${value})`);
    }
    
    setProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  /**
   * Set a specific input value for custom products (e.g., Yard Management)
   * @param {string} productId - The product ID
   * @param {string} inputId - The input field ID
   * @param {*} value - The new value
   */
  const setProductInput = (productId, inputId, value) => {
    setProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        inputs: {
          ...prev[productId].inputs,
          [inputId]: value
        }
      }
    }));
  };

  /**
   * Get the entire product object from config by ID
   * @param {string} productId - The product ID
   * @returns {object} The product configuration object
   */
  const getProductConfig = (productId) => {
    return productConfig.find(p => p.id === productId);
  };

  /**
   * Get product state by ID
   * @param {string} productId - The product ID
   * @returns {object} The product state
   */
  const getProductState = (productId) => {
    return products[productId] || {};
  };

  /**
   * Reset all products to initial state
   */
  const resetAllProducts = () => {
    const defaultState = initializeProductState();
    setProducts(defaultState);
    // Clear storage when resetting
    const encoded = encodeVolumes({ products: defaultState });
    safeSet(VOLUMES_KEY, encoded);
    console.log('[useProductState] Reset all products and cleared storage');
  };

  /**
   * Get all products in a specific category
   * @param {string} categoryId - The category ID
   * @returns {array} Array of product IDs in that category
   */
  const getProductsByCategory = (categoryId) => {
    return productConfig
      .filter(p => p.category === categoryId)
      .map(p => p.id);
  };

  return {
    products,
    getProductValue,
    setProductValue,
    setProductInput,
    getProductConfig,
    getProductState,
    resetAllProducts,
    getProductsByCategory,
  };
};

