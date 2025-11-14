/**
 * Storage Utilities
 * Safe wrappers for localStorage with error handling and fallbacks
 */

// Storage key constant - versioned for future migrations
export const VOLUMES_KEY = "pricing_volumes_v1";

/**
 * Safely get an item from localStorage
 * @param {string} key - The storage key
 * @returns {string|null} The stored value or null if unavailable
 */
export function safeGet(key) {
  // Guard against SSR (server-side rendering)
  if (typeof window === 'undefined') {
    console.warn('[storage] safeGet: window is undefined (SSR environment)');
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Handle various storage errors
    if (error.name === 'QuotaExceededError') {
      console.warn(`[storage] safeGet: Quota exceeded for key "${key}"`);
    } else if (error.name === 'SecurityError') {
      console.warn(`[storage] safeGet: Security error (storage may be disabled) for key "${key}"`);
    } else {
      console.warn(`[storage] safeGet: Error accessing localStorage for key "${key}":`, error);
    }
    return null;
  }
}

/**
 * Safely set an item in localStorage
 * @param {string} key - The storage key
 * @param {string} value - The value to store
 * @returns {boolean} True if successful, false otherwise
 */
export function safeSet(key, value) {
  // Guard against SSR
  if (typeof window === 'undefined') {
    console.warn('[storage] safeSet: window is undefined (SSR environment)');
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle various storage errors
    if (error.name === 'QuotaExceededError') {
      console.warn(`[storage] safeSet: Quota exceeded for key "${key}". Storage may be full.`);
    } else if (error.name === 'SecurityError') {
      console.warn(`[storage] safeSet: Security error (storage may be disabled) for key "${key}"`);
    } else {
      console.warn(`[storage] safeSet: Error writing to localStorage for key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 * @param {string} key - The storage key
 * @returns {boolean} True if successful, false otherwise
 */
export function safeRemove(key) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[storage] safeRemove: Error removing key "${key}":`, error);
    return false;
  }
}

/**
 * Decode and validate volumes data from storage
 * @param {string|null} data - Raw JSON string from storage
 * @returns {object|null} Decoded and validated data, or null if invalid
 */
export function decodeVolumes(data) {
  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    
    // Validate structure - should be an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('[storage] decodeVolumes: Invalid data structure - expected object');
      return null;
    }

    // Validate and sanitize product data
    const validated = {};
    
    // If it's the old format (flat structure), we could migrate it here
    // For now, we expect the new format with a 'products' key
    if (parsed.products && typeof parsed.products === 'object') {
      validated.products = {};
      
      // Validate each product entry
      Object.keys(parsed.products).forEach(productId => {
        const product = parsed.products[productId];
        if (typeof product === 'object' && product !== null) {
          validated.products[productId] = {
            // Validate volume (should be number)
            volume: typeof product.volume === 'number' ? product.volume : 
                    (typeof product.volume === 'string' ? Number(product.volume) || 0 : 0),
            // Validate value (for yes/no products like Bill Pay)
            value: product.value !== undefined ? String(product.value) : undefined,
            // Validate markup (should be number)
            markup: typeof product.markup === 'number' ? product.markup : 
                    (typeof product.markup === 'string' ? Number(product.markup) || 0 : 0),
            // Validate sku (should be string)
            sku: typeof product.sku === 'string' ? product.sku : '',
            // Validate override (should be boolean)
            override: typeof product.override === 'boolean' ? product.override : false,
            // Validate enabled (should be boolean)
            enabled: typeof product.enabled === 'boolean' ? product.enabled : false,
            // Validate inputs (for custom products like Yard Management)
            inputs: typeof product.inputs === 'object' && product.inputs !== null && !Array.isArray(product.inputs)
              ? product.inputs
              : undefined,
            // Preserve other fields (like includesFreight, includesParcel, includesOcean for AI Agent)
            ...Object.keys(product).reduce((acc, key) => {
              if (!['volume', 'value', 'markup', 'sku', 'override', 'enabled', 'inputs'].includes(key)) {
                acc[key] = product[key];
              }
              return acc;
            }, {})
          };
        }
      });
    } else {
      // If no 'products' key, assume it's the old format or invalid
      // For now, return null to trigger fallback to defaults
      console.warn('[storage] decodeVolumes: Missing or invalid "products" key, falling back to defaults');
      return null;
    }

    return validated;
  } catch (error) {
    console.warn('[storage] decodeVolumes: Error parsing JSON:', error);
    return null;
  }
}

/**
 * Encode volumes data for storage
 * @param {object} data - The data object to encode
 * @returns {string} JSON string representation
 */
export function encodeVolumes(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('[storage] encodeVolumes: Error stringifying data:', error);
    return '{}';
  }
}

/**
 * Safely get an item from sessionStorage
 * @param {string} key - The storage key
 * @returns {string|null} The stored value or null if unavailable
 */
export function safeGetSession(key) {
  // Guard against SSR (server-side rendering)
  if (typeof window === 'undefined') {
    console.warn('[storage] safeGetSession: window is undefined (SSR environment)');
    return null;
  }

  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    // Handle various storage errors
    if (error.name === 'QuotaExceededError') {
      console.warn(`[storage] safeGetSession: Quota exceeded for key "${key}"`);
    } else if (error.name === 'SecurityError') {
      console.warn(`[storage] safeGetSession: Security error (storage may be disabled) for key "${key}"`);
    } else {
      console.warn(`[storage] safeGetSession: Error accessing sessionStorage for key "${key}":`, error);
    }
    return null;
  }
}

/**
 * Safely set an item in sessionStorage
 * @param {string} key - The storage key
 * @param {string} value - The value to store
 * @returns {boolean} True if successful, false otherwise
 */
export function safeSetSession(key, value) {
  // Guard against SSR
  if (typeof window === 'undefined') {
    console.warn('[storage] safeSetSession: window is undefined (SSR environment)');
    return false;
  }

  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle various storage errors
    if (error.name === 'QuotaExceededError') {
      console.warn(`[storage] safeSetSession: Quota exceeded for key "${key}". Storage may be full.`);
    } else if (error.name === 'SecurityError') {
      console.warn(`[storage] safeSetSession: Security error (storage may be disabled) for key "${key}"`);
    } else {
      console.warn(`[storage] safeSetSession: Error writing to sessionStorage for key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Safely remove an item from sessionStorage
 * @param {string} key - The storage key
 * @returns {boolean} True if successful, false otherwise
 */
export function safeRemoveSession(key) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[storage] safeRemoveSession: Error removing key "${key}":`, error);
    return false;
  }
}

