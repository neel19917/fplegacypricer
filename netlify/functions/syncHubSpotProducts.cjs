/**
 * Netlify Serverless Function: Sync Supabase pricing_tiers to HubSpot Products
 *
 * GET or POST with ?listOnly=1 (or ?action=list) to only list HubSpot products and return comparison.
 * POST without that to run full upsert sync.
 *
 * Env: HUBSPOT_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

const { createClient } = require('@supabase/supabase-js');

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const BATCH_SIZE = 100;
const SEARCH_PAGE_SIZE = 100;

const PRODUCT_DISPLAY_NAMES = {
  freight: 'Core TMS - Freight',
  parcel: 'Core TMS - Parcel',
  ocean: 'Ocean Tracking',
  locations: 'Locations',
  supportpackage: 'Support Package',
  auditmodule: 'Auditing',
  fleetroutemanagement: 'Fleet Route Optimization',
  dockscheduling: 'Dock Scheduling',
  vendorportal: 'Vendor Portals',
  wms: 'WMS',
  yardmanagement: 'Yard Management',
  aiagent: 'AI Agent',
};

const VOLUME_PRODUCTS = ['freight', 'parcel', 'ocean'];

function getProductDisplayName(productType) {
  return PRODUCT_DISPLAY_NAMES[productType] || productType;
}

function getHubSpotProductType(productType) {
  const map = {
    freight: 'LTL',
    parcel: 'service',
    ocean: 'Ocean Tracking',
    locations: 'service',
    supportpackage: 'service',
    auditmodule: 'Auditing Module',
    fleetroutemanagement: 'service',
    dockscheduling: 'Dock Scheduling',
    vendorportal: 'service',
    wms: 'WMS',
    yardmanagement: 'service',
    aiagent: 'service',
  };
  return map[productType] ?? 'service';
}

function buildProductName(tier) {
  const display = getProductDisplayName(tier.product_type);
  const skuPrefix = tier.sku_number ? `${tier.sku_number} ` : '';
  let base;
  if (tier.product_type === 'aiagent') base = `${display} - ${tier.tier_name}`;
  else {
    const range = `${tier.start_range}-${tier.end_range}`;
    const suffix = VOLUME_PRODUCTS.includes(tier.product_type) ? ` ${range} shipments` : ` (${range})`;
    base = `${display} - ${tier.tier_name}${suffix}`;
  }
  return skuPrefix + base;
}

function buildDescription(tier) {
  const priceCents = tier.monthly_priceforannualbilling ?? 0;
  const priceDollars = (priceCents / 100).toFixed(2);
  return `${tier.tier_name}, range ${tier.start_range}-${tier.end_range}. Monthly price (annual billing): $${priceDollars}.`;
}

function normalizeBillingFrequency(raw) {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'annual' || val === 'annually' || val === 'yearly') return 'annually';
  if (val === 'monthly' || val === 'month') return 'monthly';
  if (val === 'quarterly' || val === 'quarter') return 'quarterly';
  if (val === 'weekly' || val === 'week') return 'weekly';
  if (val === 'biweekly') return 'biweekly';
  return 'annually';
}

function getUnit(productType) {
  if (VOLUME_PRODUCTS.includes(productType)) return 'shipments';
  if (productType === 'locations') return 'locations';
  if (productType === 'fleetroutemanagement') return 'stops';
  if (productType === 'wms') return 'warehouses';
  return 'units';
}

function tierToHubSpotProduct(tier) {
  const priceCents = tier.monthly_priceforannualbilling ?? 0;
  const perMonthDollars = (priceCents / 100).toFixed(2);
  const perYearDollars = ((priceCents / 100) * 12).toFixed(2);
  const unit = getUnit(tier.product_type);
  return {
    id: tier.id,
    idProperty: 'hs_sku',
    properties: {
      name: buildProductName(tier),
      hs_sku: tier.id,
      price: perMonthDollars,
      description: buildDescription(tier),
      hs_recurring_billing_period: 'P12M',
      tier_name: tier.tier_name ?? '',
      start_range: String(tier.start_range ?? 0),
      end_range: String(tier.end_range ?? 0),
      per_month_cost: perMonthDollars,
      per_year_cost: perYearDollars,
      recurringbillingfrequency: 'monthly',
      unit,
      hs_product_type: getHubSpotProductType(tier.product_type),
    },
  };
}

async function getSupabaseTiers(supabaseUrl, supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('id, product_type, tier_name, start_range, end_range, sku_number, Billing_Frequency, monthly_priceforannualbilling, monthly_priceformonthlybilling')
    .order('product_type')
    .order('start_range');
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

async function listHubSpotProducts(accessToken) {
  const properties = ['name', 'hs_sku', 'price', 'description'];
  const all = [];
  let after = undefined;
  do {
    const body = {
      filterGroups: [],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      properties,
      limit: SEARCH_PAGE_SIZE,
      ...(after && { after }),
    };
    const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/products/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HubSpot search: ${res.status} ${err}`);
    }
    const json = await res.json();
    all.push(...(json.results || []));
    after = json.paging?.next?.after ?? null;
  } while (after);
  return all;
}

function compare(supabaseTiers, hubspotProducts) {
  const bySku = new Map();
  for (const p of hubspotProducts) {
    const sku = p.properties?.hs_sku;
    if (sku) bySku.set(sku, p);
  }
  const supabaseIds = new Set(supabaseTiers.map((t) => t.id));
  const toCreate = [];
  const toUpdate = [];
  const onlyInHubSpot = [];
  for (const p of hubspotProducts) {
    const sku = p.properties?.hs_sku;
    if (sku && !supabaseIds.has(sku)) onlyInHubSpot.push(p);
  }
  for (const tier of supabaseTiers) {
    const existing = bySku.get(tier.id);
    if (existing) toUpdate.push({ tier, hubspot: existing });
    else toCreate.push(tier);
  }
  return { toCreate, toUpdate, onlyInHubSpot };
}

async function upsertHubSpotProducts(accessToken, products) {
  const results = { created: 0, updated: 0, errors: [] };
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const res = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/products/batch/upsert?idProperty=hs_sku`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ inputs: chunk }),
      }
    );
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || 10;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      i -= BATCH_SIZE;
      continue;
    }
    if (!res.ok) {
      const err = await res.text();
      results.errors.push({ chunk: chunk.map((c) => c.id), message: `${res.status} ${err}` });
      continue;
    }
    const json = await res.json();
    for (const r of json.results || []) {
      if (r.status === 'CREATED') results.created++;
      else if (r.status === 'UPDATED') results.updated++;
    }
  }
  return results;
}

/**
 * Rename orphan products (only in HubSpot, not in Supabase) to "Orphaned". Uses HubSpot internal id; batch update in chunks.
 */
async function renameOrphansToOrphaned(accessToken, orphanProducts) {
  if (orphanProducts.length === 0) return { renamed: 0, errors: [] };
  const results = { renamed: 0, errors: [] };
  for (let i = 0; i < orphanProducts.length; i += BATCH_SIZE) {
    const chunk = orphanProducts.slice(i, i + BATCH_SIZE);
    const inputs = chunk.map((p) => ({
      id: p.id,
      properties: { name: 'Orphaned' },
    }));
    const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/products/batch/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ inputs }),
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || 10;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      i -= BATCH_SIZE;
      continue;
    }
    if (!res.ok) {
      const err = await res.text();
      results.errors.push({ message: `${res.status} ${err}` });
      continue;
    }
    results.renamed += chunk.length;
  }
  return results;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!hubspotToken) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'HUBSPOT_ACCESS_TOKEN not configured' }),
    };
  }
  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Supabase URL and key not configured' }),
    };
  }

  const params = event.queryStringParameters || {};
  const listOnly = params.listOnly === '1' || params.action === 'list';

  try {
    const tiers = await getSupabaseTiers(supabaseUrl, supabaseKey);
    const hubspotProducts = await listHubSpotProducts(hubspotToken);
    const comparison = compare(tiers, hubspotProducts);

    if (listOnly) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          supabaseTiers: tiers.length,
          hubspotProducts: hubspotProducts.length,
          toCreate: comparison.toCreate.length,
          toUpdate: comparison.toUpdate.length,
          onlyInHubSpot: comparison.onlyInHubSpot.length,
          sampleOnlyInHubSpot: comparison.onlyInHubSpot.slice(0, 5).map((p) => ({
            hs_sku: p.properties?.hs_sku,
            name: p.properties?.name,
          })),
        }),
      };
    }

    const products = tiers.map(tierToHubSpotProduct);
    const result = await upsertHubSpotProducts(hubspotToken, products);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        synced: products.length,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
      }),
    };
  } catch (err) {
    console.error('syncHubSpotProducts error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Sync failed' }),
    };
  }
};
