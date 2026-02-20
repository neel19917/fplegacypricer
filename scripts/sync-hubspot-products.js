#!/usr/bin/env node
/**
 * Sync Supabase pricing_tiers to HubSpot Products
 *
 * Usage:
 *   node scripts/sync-hubspot-products.js                          # list HubSpot products, compare, then upsert
 *   node scripts/sync-hubspot-products.js --list-only              # only list HubSpot products and print comparison
 *   node scripts/sync-hubspot-products.js --sync-only              # skip list/compare, only run upsert
 *   node scripts/sync-hubspot-products.js --update-line-items      # also update existing deal line items with corrected defaults
 *   node scripts/sync-hubspot-products.js --restore-orphans        # restore products named "Orphaned" to previous name from property history
 *   node scripts/sync-hubspot-products.js --archive-product="NAME" # archive product(s) whose name contains NAME (case-insensitive)
 *   node scripts/sync-hubspot-products.js --verbose                # log request/response for diagnosis
 *
 * Requires .env or .env.local: HUBSPOT_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const BATCH_SIZE = 100;
const SEARCH_PAGE_SIZE = 100;

function isVerbose() {
  return process.argv.includes('--verbose') || process.env.SYNC_HUBSPOT_VERBOSE === '1';
}

// Display names for product_type (aligned with app product names)
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

/** Map our product_type to HubSpot hs_product_type enum (exact option labels). */
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

/**
 * Normalize Supabase Billing_Frequency to HubSpot recurringbillingfrequency enum.
 * HubSpot accepts: weekly, biweekly, monthly, quarterly, per_six_months,
 *                  annually, per_two_years, per_three_years, per_four_years, per_five_years
 */
function normalizeBillingFrequency(raw) {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'annual' || val === 'annually' || val === 'yearly') return 'annually';
  if (val === 'monthly' || val === 'month') return 'monthly';
  if (val === 'quarterly' || val === 'quarter') return 'quarterly';
  if (val === 'weekly' || val === 'week') return 'weekly';
  if (val === 'biweekly') return 'biweekly';
  return 'annually';
}

/** Derive unit for HubSpot from product_type (Supabase has no unit column). */
function getUnit(productType) {
  if (VOLUME_PRODUCTS.includes(productType)) return 'shipments';
  if (productType === 'locations') return 'locations';
  if (productType === 'fleetroutemanagement') return 'stops';
  if (productType === 'wms') return 'warehouses';
  return 'units';
}

/**
 * Convert a pricing_tiers row to HubSpot product payload.
 * Supabase → HubSpot mapping (per spec):
 *   tier_name → tier_name, start_range → start_range, end_range → end_range,
 *   monthly (cents) → per_month_cost, annual → per_year_cost,
 *   Billing_Frequency → recurringbillingfrequency, derived → unit.
 * Price in DB is cents; HubSpot expects string dollars for cost fields.
 */
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
      // Mapped fields (Supabase → HubSpot internal names)
      tier_name: tier.tier_name ?? '',
      start_range: String(tier.start_range ?? 0),
      end_range: String(tier.end_range ?? 0),
      per_month_cost: perMonthDollars,
      per_year_cost: perYearDollars,
      // Always 'monthly' because price = per-month cost; HubSpot uses this
      // to compute ARR (price × 12) and MRR correctly.
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

/**
 * List all HubSpot products (search + paginate). Request hs_sku, name, price, description.
 */
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

/**
 * Compare Supabase tiers vs HubSpot products by hs_sku (tier id).
 * Returns { toCreate, toUpdate, onlyInHubSpot }.
 */
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

/**
 * Batch upsert products. idProperty=hs_sku. Chunks of BATCH_SIZE.
 * HubSpot may return status (CREATED/UPDATED) or a "new" boolean per result.
 */
async function upsertHubSpotProducts(accessToken, products, verbose = false) {
  const results = { created: 0, updated: 0, errors: [] };
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/products/batch/upsert?idProperty=hs_sku`;
    const body = { inputs: chunk };
    if (verbose && i === 0) {
      console.error('[verbose] First batch request URL:', url);
      console.error('[verbose] First batch input count:', chunk.length);
      console.error('[verbose] First input sample:', JSON.stringify(chunk[0], null, 2));
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const responseText = await res.text();
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || 10;
      console.warn(`Rate limited; waiting ${retryAfter}s...`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      i -= BATCH_SIZE;
      continue;
    }
    if (!res.ok) {
      results.errors.push({ chunk: chunk.map((c) => c.id), message: `${res.status} ${responseText}` });
      continue;
    }
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      results.errors.push({ chunk: chunk.map((c) => c.id), message: `Invalid JSON: ${responseText.slice(0, 200)}` });
      continue;
    }
    const resultList = json.results || [];
    if (verbose && i === 0) {
      console.error('[verbose] First batch response status:', res.status);
      console.error('[verbose] First batch results length:', resultList.length);
      console.error('[verbose] First batch response keys:', Object.keys(json));
      if (resultList[0]) console.error('[verbose] First result sample:', JSON.stringify(resultList[0], null, 2));
    }
    // HubSpot returns "new": true/false per result, not "status": "CREATED"/"UPDATED"
    for (const r of resultList) {
      if (r.new === true || r.status === 'CREATED') results.created++;
      else if (r.new === false || r.status === 'UPDATED') results.updated++;
    }
  }
  return results;
}

/**
 * Search HubSpot products by exact name (e.g. "Orphaned").
 */
async function searchHubSpotProductsByName(accessToken, name) {
  const all = [];
  let after = undefined;
  do {
    const body = {
      filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: name }] }],
      properties: ['name', 'hs_sku', 'id'],
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

/**
 * Get product name from HubSpot v1 property history (previous value before "Orphaned"). Returns null if only "Orphaned" in history.
 */
async function getProductNameFromHistoryV1(accessToken, productId, verbose = false) {
  const url = `${HUBSPOT_API_BASE}/crm-objects/v1/objects/products/${productId}?properties=name`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const data = await res.json();
  if (verbose) console.error('[v1 response sample]', JSON.stringify(data, null, 2).slice(0, 1500));
  const nameProp = data.properties?.name;
  if (!nameProp?.versions?.length) return null;
  const sorted = [...nameProp.versions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  for (const v of sorted) {
    const val = v.value ?? v.name;
    if (val != null && String(val).trim() !== '' && String(val) !== 'Orphaned') return String(val).trim();
  }
  return null;
}

/**
 * Get product name from line items that reference this product (line item name is often the product name when added).
 */
async function getProductNameFromLineItems(accessToken, productId) {
  const body = {
    filterGroups: [{ filters: [{ propertyName: 'hs_product_id', operator: 'EQ', value: String(productId) }] }],
    properties: ['name'],
    limit: 1,
  };
  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/line_items/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const name = json.results?.[0]?.properties?.name;
  if (name != null && String(name).trim() !== '' && String(name) !== 'Orphaned') return String(name).trim();
  return null;
}

/**
 * Restore products currently named "Orphaned" to their previous name using HubSpot property history (v1 API).
 */
async function restoreOrphanNamesFromHistory(accessToken, verbose = false) {
  const orphaned = await searchHubSpotProductsByName(accessToken, 'Orphaned');
  if (orphaned.length === 0) {
    console.log('No products named "Orphaned" found.');
    return { restored: 0, errors: [], skipped: 0 };
  }
  console.log(`Found ${orphaned.length} product(s) named "Orphaned". Resolving names from history or line items...`);
  const toUpdate = [];
  for (let idx = 0; idx < orphaned.length; idx++) {
    const p = orphaned[idx];
    let previousName = await getProductNameFromHistoryV1(accessToken, p.id, verbose && idx === 0);
    if (!previousName) previousName = await getProductNameFromLineItems(accessToken, p.id);
    if (previousName) {
      toUpdate.push({ id: p.id, name: previousName });
      if (verbose) console.error(`  ${p.id} (${p.properties?.hs_sku}) -> "${previousName}"`);
    }
  }
  const skipped = orphaned.length - toUpdate.length;
  if (skipped > 0) console.log(`Skipped ${skipped} (no name found in history or line items).`);
  if (toUpdate.length === 0) return { restored: 0, errors: [], skipped };

  const results = { restored: 0, errors: [] };
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const inputs = chunk.map(({ id, name }) => ({ id, properties: { name } }));
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
    results.restored += chunk.length;
  }
  return { ...results, skipped };
}

/**
 * Archive product(s) whose name contains the given string (case-insensitive).
 * Uses HubSpot POST /crm/v3/objects/products/batch/archive.
 */
async function archiveProductsByNameFragment(accessToken, nameFragment) {
  if (!nameFragment || !String(nameFragment).trim()) {
    console.error('--archive-product requires a non-empty value (e.g. --archive-product="freight pay bill pay")');
    return { archived: 0, errors: [] };
  }
  const all = await listHubSpotProducts(accessToken);
  const fragment = String(nameFragment).trim().toLowerCase();
  const toArchive = all.filter((p) => (p.properties?.name || '').toLowerCase().includes(fragment));
  if (toArchive.length === 0) {
    console.log(`No product name contains "${nameFragment}". Nothing to archive.`);
    return { archived: 0, errors: [] };
  }
  console.log(`Found ${toArchive.length} product(s) matching "${nameFragment}":`);
  toArchive.forEach((p) => console.log('  ', p.id, p.properties?.name));

  const ids = toArchive.map((p) => p.id);
  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/products/batch/archive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ inputs: ids.map((id) => ({ id })) }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Archive failed:', res.status, err);
    return { archived: 0, errors: [{ message: `${res.status} ${err}` }] };
  }
  console.log('Archived:', ids.length);
  return { archived: ids.length, errors: [] };
}

/**
 * Rename orphan products (only in HubSpot, not in Supabase) to "Orphaned". Uses HubSpot internal id; batch update in chunks.
 * Disabled by default; use only if explicitly re-enabled.
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

/**
 * Search ALL line items in HubSpot. Paginates with search API.
 * Returns array of line item objects with properties.
 */
async function listAllLineItems(accessToken) {
  const properties = [
    'name', 'hs_sku', 'hs_product_id', 'price', 'quantity',
    'recurringbillingfrequency', 'hs_recurring_billing_period',
    'hs_term_in_months',
  ];
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
    const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/line_items/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HubSpot line_items search: ${res.status} ${err}`);
    }
    const json = await res.json();
    all.push(...(json.results || []));
    after = json.paging?.next?.after ?? null;
  } while (after);
  return all;
}

/**
 * Build a map of HubSpot product internal ID → product properties (from our synced products).
 */
async function buildProductIdMap(accessToken) {
  const products = await listHubSpotProducts(accessToken);
  const map = new Map();
  for (const p of products) {
    map.set(p.id, p.properties);
  }
  return map;
}

/**
 * Update existing line items with corrected billing defaults.
 * Sets recurringbillingfrequency='monthly', hs_recurring_billing_period='P12M' (12-month annual term).
 * hs_term_in_months is CALCULATED by HubSpot from hs_recurring_billing_period, so we don't set it.
 * With P12M term + monthly frequency + monthly price → ARR = price × 12, MRR = price.
 */
async function updateLineItemDefaults(accessToken, verbose = false) {
  console.log('Fetching all line items from HubSpot...');
  const lineItems = await listAllLineItems(accessToken);
  console.log(`Found ${lineItems.length} line item(s)`);

  if (lineItems.length === 0) {
    console.log('No line items to update.');
    return { updated: 0, errors: [] };
  }

  if (verbose) {
    for (const li of lineItems) {
      const p = li.properties;
      console.log(`  Line item ${li.id}: "${p.name}" price=${p.price} freq=${p.recurringbillingfrequency} period=${p.hs_recurring_billing_period} term=${p.hs_term_in_months}`);
    }
  }

  const inputs = lineItems.map((li) => ({
    id: li.id,
    properties: {
      recurringbillingfrequency: 'monthly',
      hs_recurring_billing_period: 'P12M',
    },
  }));

  const results = { updated: 0, errors: [] };
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const chunk = inputs.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/line_items/batch/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ inputs: chunk }),
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || 10;
      console.warn(`Rate limited; waiting ${retryAfter}s...`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      i -= BATCH_SIZE;
      continue;
    }
    if (!res.ok) {
      const err = await res.text();
      results.errors.push({ message: `${res.status} ${err}` });
      continue;
    }
    const json = await res.json();
    results.updated += (json.results || []).length;
  }
  return results;
}

async function main() {
  const listOnly = process.argv.includes('--list-only');
  const syncOnly = process.argv.includes('--sync-only');
  const updateLineItems = process.argv.includes('--update-line-items');
  const restoreOrphans = process.argv.includes('--restore-orphans');
  const archiveProductArg = process.argv.find((a) => a.startsWith('--archive-product='));
  const archiveProductName = archiveProductArg ? archiveProductArg.split('=').slice(1).join('=').trim() : null;

  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!hubspotToken) {
    console.error('Missing HUBSPOT_ACCESS_TOKEN in environment');
    process.exit(1);
  }

  if (restoreOrphans) {
    console.log('--- Restoring products named "Orphaned" from property history ---');
    const restoreResult = await restoreOrphanNamesFromHistory(hubspotToken, isVerbose());
    console.log('Restored:', restoreResult.restored, 'Skipped (no history):', restoreResult.skipped);
    if (restoreResult.errors.length > 0) {
      console.error('Restore errors:', restoreResult.errors);
      process.exitCode = 1;
    }
    if (!syncOnly && !listOnly) return;
  }

  if (archiveProductName) {
    console.log('--- Archiving product(s) by name ---');
    const archiveResult = await archiveProductsByNameFragment(hubspotToken, archiveProductName);
    if (archiveResult.errors.length > 0) process.exitCode = 1;
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in environment');
    process.exit(1);
  }

  console.log('Fetching pricing tiers from Supabase...');
  const tiers = await getSupabaseTiers(supabaseUrl, supabaseKey);
  console.log(`Supabase: ${tiers.length} pricing tiers`);

  let comparison = null;
  if (!syncOnly) {
    console.log('Listing HubSpot products...');
    const hubspotProducts = await listHubSpotProducts(hubspotToken);
    console.log(`HubSpot: ${hubspotProducts.length} products`);
    comparison = compare(tiers, hubspotProducts);
    const { toCreate, toUpdate, onlyInHubSpot } = comparison;
    console.log('\n--- Comparison (by hs_sku / tier id) ---');
    console.log('To create (in Supabase, not in HubSpot):', toCreate.length);
    console.log('To update (in both):', toUpdate.length);
    console.log('Only in HubSpot (orphans):', onlyInHubSpot.length);
    if (onlyInHubSpot.length > 0 && onlyInHubSpot.length <= 5) {
      onlyInHubSpot.forEach((p) =>
        console.log('  -', p.properties?.hs_sku, p.properties?.name)
      );
    }
  }

  if (listOnly) {
    console.log('\nList-only mode; no sync performed.');
    return;
  }

  const products = tiers.map(tierToHubSpotProduct);
  const verbose = isVerbose();
  if (verbose) console.error('\n[verbose] Logging request/response for diagnosis\n');
  console.log('\nUpserting', products.length, 'products to HubSpot (batch size', BATCH_SIZE, ')...');
  const result = await upsertHubSpotProducts(hubspotToken, products, verbose);
  console.log('Upsert result:', result.created, 'created,', result.updated, 'updated');
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
    process.exitCode = 1;
  }

  // Orphan products (in HubSpot but not in Supabase) are no longer renamed to "Orphaned" so reps can keep using them.

  if (updateLineItems) {
    console.log('\n--- Updating existing line items with corrected defaults ---');
    const liResult = await updateLineItemDefaults(hubspotToken, verbose);
    console.log('Line items updated:', liResult.updated);
    if (liResult.errors.length > 0) {
      console.error('Line item update errors:', liResult.errors);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
