import { useState } from 'react';
import { productConfig } from '../productConfig';

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

  const [products, setProducts] = useState(initializeProductState);

  /**
   * Get a specific value from a product's state
   * @param {string} productId - The product ID
   * @param {string} field - The field to retrieve (volume, markup, sku, override, inputs, value)
   * @returns {*} The field value or default
   */
  const getProductValue = (productId, field) => {
    const product = products[productId];
    if (!product) return field === 'inputs' ? {} : (field === 'sku' ? '' : 0);
    
    // Handle different product types
    if (field === 'volume' || field === 'value') {
      return product.volume !== undefined ? product.volume : product.value;
    }
    if (field === 'markup') return product.markup || 0;
    if (field === 'sku') return product.sku || '';
    if (field === 'override') return product.override || false;
    if (field === 'inputs') return product.inputs || {};
    
    return 0;
  };

  /**
   * Set a specific value in a product's state
   * @param {string} productId - The product ID
   * @param {string} field - The field to update
   * @param {*} value - The new value
   */
  const setProductValue = (productId, field, value) => {
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
    setProducts(initializeProductState());
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

