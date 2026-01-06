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
  const prompt = `You are analyzing a FreightPOP quote document screenshot. Extract all SUBSCRIPTION product information and return it as JSON.

Products to look for:
- Core TMS - Freight (or "Freight", "LTL & FTL shipments")
- Core TMS - Parcel (or "Parcel")
- Ocean Tracking
- Locations
- Support Package (recurring subscription only - NOT one-time onboarding/training)
- Auditing Module (also includes "EDI" and "auditing" - these are part of the Auditing Module product)
- Fleet Route Optimization
- Dock Scheduling
- Vendor Portals
- WMS
- FreightPOP AI Agent

IGNORE these one-time costs (do NOT extract as products):
- Onboarding & Training
- NetSuite Integration Setup
- Any setup fees
- Any development costs
- Any one-time charges
- Anything in "SETUP & DEVELOPMENT" section

For each SUBSCRIPTION product found, extract:
1. Product name (match to one of the products above)
2. SKU code (format: FP####, AI-AGENT-###, or WMS####)
3. Pricing tier (e.g., "Starter", "Pro", "Enterprise 1", etc.)
4. Volume/count (number) - IMPORTANT: The volume type depends on the product:
   - For Freight, Parcel, Ocean Tracking: Extract number of shipments/month
   - For Auditing Module: Extract number of CARRIERS (this is critical - look for "carriers", "carrier count", etc.)
   - For Locations: Extract number of locations
   - For Support Package: Extract hours/month (ONLY if it's a recurring subscription, NOT one-time onboarding)
   - For Fleet Route Optimization: Extract number of stops
   - For Dock Scheduling: Extract number of docks
   - For Vendor Portals: Extract number of portals
   - For WMS: Extract number of warehouses
   - For AI Agent: Extract total shipment volume (Freight + Parcel + Ocean)
5. Customer price (what the customer is paying - annual or monthly amount)
   - Extract from the SUBTOTAL column in the SUBSCRIPTION section (the amount AFTER discount is applied)
   - IMPORTANT: If products are bundled (e.g., "Multi-Mode Plan"), extract the bundled SUBTOTAL price
   - If individual product prices are shown in SUBTOTAL column, use those
   - If only a bundled total is shown, extract it as totalPrice and set individual customerPrice to 0
   - Do NOT extract prices from "SETUP & DEVELOPMENT" section
   - Do NOT extract pre-discount prices - only the SUBTOTAL after discount
6. Billing frequency ("annual" or "monthly")

IMPORTANT - Bundled Plans:
- If you see a bundled plan (e.g., "Multi-Mode Plan", "Suite Plan") that includes multiple products:
  - Extract the volumes for each product mentioned in the bundle description
  - Extract the bundled SUBTOTAL price as totalPrice
  - Set individual customerPrice to 0 for each product in the bundle
  - The totalPrice should be the annual or monthly amount shown for the bundle

IMPORTANT - Total Price Extraction:
- Look for the SUBSCRIPTION section total/subtotal (NOT including setup/development costs)
- This is the recurring amount the customer pays for subscription products
- Extract this as "totalPrice" in the root of the JSON object
- If individual product prices are shown in SUBTOTAL column, use those
- If only a bundled total is shown, use totalPrice and set individual customerPrice to 0

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
  "billingFrequency": "annual",
  "totalPrice": 20000
}

Important:
- ONLY extract SUBSCRIPTION products from the SUBSCRIPTION section
- Do NOT extract one-time costs from SETUP & DEVELOPMENT section as products
- If SKU is not visible, leave it as empty string ""
- If tier is not visible, leave it as empty string ""
- Extract customer price from SUBTOTAL column (after discount), NOT from monthly cost or one-time cost columns
- For bundled plans: Extract volumes for each product, but use the bundled SUBTOTAL as totalPrice
- "EDI" and "auditing" should be mapped to "Auditing Module" (productId: "auditing")
- For Auditing Module: Extract the NUMBER OF CARRIERS (not shipments) - look for text like "X carriers", "carrier count: X", "up to X non-parcel carriers", etc.
- Volume should match the product type (shipments for Freight/Parcel/Ocean, carriers for Auditing, etc.)
- If a bundled plan shows "Payment billed annually at $X", use that amount as totalPrice
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
      'EDI': 'auditing', // EDI is part of Auditing Module
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
      totalPrice: parsed.totalPrice ? Number(parsed.totalPrice) : null,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse Claude response as JSON. The AI may have returned invalid data.');
    }
    throw error;
  }
}

