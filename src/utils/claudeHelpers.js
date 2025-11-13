/**
 * Claude AI Integration Utilities
 * Handles screenshot parsing using Anthropic Claude API
 */

/**
 * Convert image file to base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 encoded image string
 */
async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get the MIME type from file
 * @param {File} file - Image file
 * @returns {string} MIME type
 */
function getImageMimeType(file) {
  if (file.type) {
    return file.type;
  }
  // Fallback based on extension
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

/**
 * Parse screenshot using Claude AI Vision API via proxy server
 * @param {File} imageFile - Screenshot image file
 * @returns {Promise<Object>} Parsed product data
 */
export async function parseScreenshotWithClaude(imageFile) {
  // Convert image to base64
  const base64Image = await imageToBase64(imageFile);
  const mimeType = getImageMimeType(imageFile);

  // Create the prompt
  const prompt = `You are analyzing a FreightPOP quote document screenshot. Extract all product information and return it as JSON.

Products to look for:
- Core TMS - Freight (or "Freight")
- Core TMS - Parcel (or "Parcel")
- Ocean Tracking
- Locations
- Support Package
- Auditing Module
- Fleet Route Optimization
- Dock Scheduling
- Vendor Portals
- WMS
- FreightPOP AI Agent

For each product found, extract:
1. Product name (match to one of the products above)
2. SKU code (format: FP####, AI-AGENT-###, or WMS####)
3. Pricing tier (e.g., "Starter", "Pro", "Enterprise 1", etc.)
4. Volume/shipments count (number)
5. Customer price (what the customer is paying - annual or monthly amount)
6. Billing frequency ("annual" or "monthly")

Return a JSON object with this structure:
{
  "products": [
    {
      "productName": "Core TMS - Freight",
      "productId": "freight",
      "sku": "FP1001",
      "tier": "Starter",
      "volume": 100,
      "customerPrice": 12000,
      "billingFrequency": "annual"
    }
  ],
  "billingFrequency": "annual"
}

Important:
- Only include products that are clearly visible in the screenshot
- If SKU is not visible, leave it as empty string ""
- If tier is not visible, leave it as empty string ""
- Customer price should be the actual amount the customer is paying (after any discounts/markups)
- Volume should be the shipment/volume count for that product
- If billing frequency is not clear, default to "annual"
- Return ONLY valid JSON, no additional text or markdown formatting`;

  try {
    // Determine API endpoint based on environment
    // In development: use local proxy server (http://localhost:3001/api/claude)
    // In production (Netlify): use Netlify Function (/api/claude -> /.netlify/functions/claude)
    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
    const apiEndpoint = isDevelopment
      ? (import.meta.env.VITE_PROXY_URL || 'http://localhost:3001') + '/api/claude'
      : '/api/claude'; // Netlify redirects this to /.netlify/functions/claude
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Image,
        mimeType: mimeType,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your ANTHROPIC_API_KEY on the server.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 400) {
        throw new Error(errorMessage);
      } else if (response.status === 500) {
        throw new Error(errorMessage || 'Server error. Please check server logs.');
      } else {
        throw new Error(errorMessage);
      }
    }

    // Proxy server already parses the JSON, so we get the parsed data directly
    const parsed = await response.json();
    
    // Validate structure
    if (!parsed.products || !Array.isArray(parsed.products)) {
      throw new Error('Invalid response format: missing products array');
    }

    // Map product names to product IDs
    const productNameMap = {
      'Core TMS - Freight': 'freight',
      'Freight': 'freight',
      'Core TMS - Parcel': 'parcel',
      'Parcel': 'parcel',
      'Ocean Tracking': 'oceanTracking',
      'Locations': 'locations',
      'Support Package': 'supportPackage',
      'Auditing Module': 'auditing',
      'Auditing': 'auditing',
      'Fleet Route Optimization': 'fleetRouteOptimization',
      'Fleet Route': 'fleetRouteOptimization',
      'Dock Scheduling': 'dockScheduling',
      'Vendor Portals': 'vendorPortals',
      'WMS': 'wms',
      'FreightPOP AI Agent': 'aiAgent',
      'AI Agent': 'aiAgent',
    };

    // Normalize product data
    const normalizedProducts = parsed.products.map((product) => {
      const productId = product.productId || productNameMap[product.productName] || '';
      return {
        productName: product.productName || '',
        productId: productId,
        sku: product.sku || '',
        tier: product.tier || '',
        volume: Number(product.volume) || 0,
        customerPrice: Number(product.customerPrice) || 0,
        billingFrequency: product.billingFrequency || parsed.billingFrequency || 'annual',
      };
    }).filter((product) => product.productId && product.volume > 0);

    return {
      products: normalizedProducts,
      billingFrequency: parsed.billingFrequency || 'annual',
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse Claude response as JSON. The AI may have returned invalid data.');
    }
    throw error;
  }
}

