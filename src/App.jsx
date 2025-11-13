import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { productConfig, pricingModels, getPricingModelsWithProducts } from './productConfig';
import { APP_VERSION } from './version';
import ProductCheckbox from './components/ProductCheckbox';
import ScreenshotParseModal from './components/ScreenshotParseModal';
import {
  loadDefaultPricing,
} from './utils/jsonHelpers';
import { parseScreenshotWithClaude } from './utils/claudeHelpers';
import { calculateMargins, calculateRequiredMarkup } from './utils/marginAnalysis';
import {
  freightAnnualSKUs,
  freightMonthlySKUs,
  parcelAnnualSKUs,
  parcelMonthlySKUs,
  oceanTrackingAnnualSKUs,
  oceanTrackingMonthlySKUs,
  auditingAnnualSKUs,
  auditingMonthlySKUs,
  locationsAnnualSKUs,
  locationsMonthlySKUs,
  supportPackageAnnualSKUs,
  supportPackageMonthlySKUs,
  fleetRouteOptimizationAnnualSKUs,
  fleetRouteOptimizationMonthlySKUs,
  // NEW: Dock Scheduling SKUs
  dockSchedulingAnnualSKUs,
  dockSchedulingMonthlySKUs,
  // NEW: WMS SKUs
  wmsAnnualSKUs,
  wmsMonthlySKUs,
} from './skus';
import { useProductState } from './hooks/useProductState';
import {
  computeVolumeBasedCost,
  computeFixedCost,
  calculateBillPayCost,
  calculateVendorPortalCost,
  calculateYardManagementCost,
  calculateSubscriptionTotal,
  calculateOneTimeCosts,
} from './utils/calculations';
import { formatCost } from './utils/formatting';
import { findSKUForProduct, getPlanBySKU, getSKUArrayByBilling } from './utils/skuHelpers';

/* ============================
   STYLE CONSTANTS
============================ */
const inputStyle = {
  marginRight: '12px',
  padding: '10px 12px',
  width: '70px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  backgroundColor: 'white',
};

const selectStyle = {
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const customPricingRowStyle = {
  backgroundColor: '#fee2e2',
  borderLeft: '4px solid #dc2626',
};

const customPricingTextStyle = {
  color: '#dc2626',
  fontWeight: '600',
};

const customPricingInputStyle = {
  marginRight: '12px',
  padding: '10px 12px',
  width: '70px',
  borderColor: '#dc2626',
  borderWidth: '2px',
  borderRadius: '6px',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  backgroundColor: '#fef2f2',
  border: '2px solid #dc2626',
};

const stickyHeaderStyle = {
  position: 'sticky',
  top: 0,
  background: '#334155',
  zIndex: 10,
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
};

const tableThStyle = {
  border: '1px solid #e2e8f0',
  padding: '14px 12px',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'white',
};

const tableTdStyle = {
  border: '1px solid #e2e8f0',
  padding: '12px 10px',
  textAlign: 'center',
  fontSize: '14px',
  color: '#334155',
};

const firstColumnStyle = { 
  minWidth: '220px',
  fontWeight: '500',
  textAlign: 'left',
  paddingLeft: '16px',
};


/* ============================
   REUSABLE COMPONENTS
============================ */
const PricingModelBadge = ({ modelId }) => {
  const model = pricingModels[modelId];
  if (!model) return null;
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '12px',
        backgroundColor: `${model.color}15`,
        border: `1px solid ${model.color}40`,
        fontSize: '11px',
        fontWeight: '600',
        color: model.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{model.icon}</span>
      <span>{model.name}</span>
    </span>
  );
};

const FixedHeader = ({ onLogout }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '70px',
      background: '#1e293b',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }}
  >
    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600', letterSpacing: '0.3px' }}>
      FreightPOP Quote Builder
      <span style={{
        marginLeft: '12px',
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: '600',
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '12px',
        letterSpacing: '0.5px',
      }}>
        v{APP_VERSION.version} • {APP_VERSION.releaseName}
      </span>
    </h1>
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ fontSize: '13px', opacity: 0.8 }}>
        Professional Pricing Tool • Released {APP_VERSION.releaseDate}
      </div>
      {onLogout && (
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          🔓 Logout
        </button>
      )}
    </div>
  </div>
);

const Card = ({ children, className = '' }) => (
  <div
    className={`card fade-in ${className}`}
    style={{
      width: '100%',
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
      margin: '20px 0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}
  >
    {children}
  </div>
);

const CardHeader = ({ children, style }) => (
  <div
    style={{ 
      background: '#334155', 
      padding: '16px 24px', 
      color: '#fff',
      borderBottom: '1px solid #475569',
      ...style 
    }}
  >
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h2 style={{ 
    margin: 0, 
    fontSize: '18px', 
    fontWeight: '600',
    letterSpacing: '0.3px'
  }}>
    {children}
  </h2>
);

const CardContent = ({ children }) => (
  <div style={{ padding: '24px' }}>{children}</div>
);

/* ============================
   TOOLTIP COMPONENT
============================ */
const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help' }}
      >
        {children}
      </span>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e293b',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          marginBottom: '5px',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #1e293b',
          }} />
        </div>
      )}
    </div>
  );
};

/* ============================
   MAIN COMPONENT: App
============================ */
const App = () => {
  const pageRef = useRef(null);
  
  // === SKU DATA STATE (LOADED FROM CSV) ===
  const [skuData, setSKUData] = useState({
    Freight: { annual: freightAnnualSKUs, monthly: freightMonthlySKUs },
    Parcel: { annual: parcelAnnualSKUs, monthly: parcelMonthlySKUs },
    Ocean: { annual: oceanTrackingAnnualSKUs, monthly: oceanTrackingMonthlySKUs },
    Locations: { annual: locationsAnnualSKUs, monthly: locationsMonthlySKUs },
    Support: { annual: supportPackageAnnualSKUs, monthly: supportPackageMonthlySKUs },
    Auditing: { annual: auditingAnnualSKUs, monthly: auditingMonthlySKUs },
    FleetRoute: { annual: fleetRouteOptimizationAnnualSKUs, monthly: fleetRouteOptimizationMonthlySKUs },
    DockScheduling: { annual: dockSchedulingAnnualSKUs, monthly: dockSchedulingMonthlySKUs },
    VendorPortals: { annual: [], monthly: [] },
    WMS: { annual: wmsAnnualSKUs, monthly: wmsMonthlySKUs },
  });
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);

  // === AUTHENTICATION STATE ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD || 'default-password-set-in-env';

  // Check if already authenticated (from sessionStorage)
  useEffect(() => {
    const authStatus = sessionStorage.getItem('freightpop-authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  // Load pricing data from CSV on mount
  useEffect(() => {
    async function initializePricing() {
      const csvData = await loadDefaultPricing();
      
      if (csvData) {
        // Replace with CSV data
        setSKUData(csvData);
        console.log('✅ Using pricing from CSV');
      } else {
        // Keep using hardcoded imports (already initialized)
        console.log('⚠️ CSV load failed, using hardcoded SKUs');
      }
      
      setIsLoadingPricing(false);
    }
    
    initializePricing();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginPassword === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('freightpop-authenticated', 'true');
      setLoginError('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid password. Please try again.');
      setLoginPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('freightpop-authenticated');
  };

  // === Load URL Parameters on Mount ===
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('companyName')) setCompanyName(params.get('companyName'));
    if (params.has('repName')) setRepName(params.get('repName'));
    if (params.has('downloadDate')) setDownloadDate(params.get('downloadDate'));
    if (params.has('subBilling')) setSubBilling(params.get('subBilling'));
    if (params.has('minSubscription'))
      setMinSubscription(Number(params.get('minSubscription')));
    if (params.has('globalMarkup'))
      setGlobalMarkup(Number(params.get('globalMarkup')));
    if (params.has('oneTimeMarkup'))
      setOneTimeMarkup(Number(params.get('oneTimeMarkup')));
    
    // Load product volumes from URL
    if (params.has('freightVolume'))
      setFreightVolume(Number(params.get('freightVolume')) || 0);
    if (params.has('parcelVolume'))
      setParcelVolume(Number(params.get('parcelVolume')) || 0);
    if (params.has('locationsVolume'))
      setLocationsVolume(Number(params.get('locationsVolume')) || 0);
    if (params.has('oceanTrackingVolume'))
      setOceanTrackingVolume(Number(params.get('oceanTrackingVolume')) || 0);
    if (params.has('supportPackageVolume'))
      setSupportPackageVolume(Number(params.get('supportPackageVolume')) || 0);
    if (params.has('vendorPortalCount'))
      setVendorPortalCount(Number(params.get('vendorPortalCount')) || 0);
    if (params.has('auditingVolume'))
      setAuditingVolume(Number(params.get('auditingVolume')) || 0);
    if (params.has('fleetRouteVolume'))
      setFleetRouteVolume(Number(params.get('fleetRouteVolume')) || 0);
    if (params.has('dockSchedulingVolume'))
      setDockSchedulingVolume(Number(params.get('dockSchedulingVolume')) || 0);
    
    // Special cases
    if (params.has('billPayYesNo')) 
      setBillPayYesNo(params.get('billPayYesNo'));
    if (params.has('assetManagementFacilities'))
      setAssetManagementFacilities(Number(params.get('assetManagementFacilities')) || 0);
    if (params.has('assetManagementAssets'))
      setAssetManagementAssets(Number(params.get('assetManagementAssets')) || 0);
    
    if (params.has('oneTimeCosts')) {
      try {
        const costs = JSON.parse(params.get('oneTimeCosts'));
        setOneTimeCosts(costs);
      } catch (error) {
        console.error('Error parsing oneTimeCosts from URL', error);
      }
    }
  }, []);

  // === STATE DECLARATIONS ===
  const [companyName, setCompanyName] = useState('');
  const [repName, setRepName] = useState('');
  const [downloadDate, setDownloadDate] = useState(
    new Date().toISOString().substr(0, 10)
  );
  const [subBilling, setSubBilling] = useState('annual');
  const [minSubscription, setMinSubscription] = useState(20000);
  const [globalMarkup, setGlobalMarkup] = useState(0);
  const [oneTimeMarkup, setOneTimeMarkup] = useState(0);
  const [editingAllMarkups, setEditingAllMarkups] = useState(false);
  const [showCustomerView, setShowCustomerView] = useState(false);
  const [oneTimeCosts, setOneTimeCosts] = useState([]);
  const [groupBy, setGroupBy] = useState('category'); // 'category' or 'pricingModel'
  
  // Filtering state
  const [selectedModels, setSelectedModels] = useState(
    Object.keys(pricingModels)
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Screenshot parsing state
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [screenshotData, setScreenshotData] = useState(null);
  const [isParsingScreenshot, setIsParsingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState(null);
  const fileInputRef = useRef(null);

  // === PRODUCT STATE MANAGEMENT (NEW HOOK) ===
  const {
    products,
    getProductValue,
    setProductValue,
    setProductInput,
    resetAllProducts,
  } = useProductState();

  // Backward-compatible getters (temporary during refactor)
  const freightVolume = getProductValue('freight', 'volume');
  const freightMarkup = getProductValue('freight', 'markup');
  const freightSKU = getProductValue('freight', 'sku');
  const freightOverride = getProductValue('freight', 'override');

  const parcelVolume = getProductValue('parcel', 'volume');
  const parcelMarkup = getProductValue('parcel', 'markup');
  const parcelSKU = getProductValue('parcel', 'sku');
  const parcelOverride = getProductValue('parcel', 'override');

  const oceanTrackingVolume = getProductValue('oceanTracking', 'volume');
  const oceanTrackingMarkup = getProductValue('oceanTracking', 'markup');
  const oceanTrackingSKU = getProductValue('oceanTracking', 'sku');
  const oceanTrackingOverride = getProductValue('oceanTracking', 'override');

  const billPayYesNo = getProductValue('billPay', 'value');
  const billPayMarkup = getProductValue('billPay', 'markup');

  const locationsVolume = getProductValue('locations', 'volume');
  const locationsMarkup = getProductValue('locations', 'markup');
  const locationsSKU = getProductValue('locations', 'sku');
  const locationsOverride = getProductValue('locations', 'override');

  const supportPackageVolume = getProductValue('supportPackage', 'volume');
  const supportPackageMarkup = getProductValue('supportPackage', 'markup');
  const supportPackageSKU = getProductValue('supportPackage', 'sku');
  const supportPackageOverride = getProductValue('supportPackage', 'override');

  const vendorPortalCount = getProductValue('vendorPortals', 'volume');
  const vendorPortalMarkup = getProductValue('vendorPortals', 'markup');

  const auditingVolume = getProductValue('auditing', 'volume');
  const auditingMarkup = getProductValue('auditing', 'markup');
  const auditingSKU = getProductValue('auditing', 'sku');
  const auditingOverride = getProductValue('auditing', 'override');

  const fleetRouteVolume = getProductValue('fleetRouteOptimization', 'volume');
  const fleetRouteMarkup = getProductValue('fleetRouteOptimization', 'markup');
  const fleetRouteSKU = getProductValue('fleetRouteOptimization', 'sku');
  const fleetRouteOverride = getProductValue('fleetRouteOptimization', 'override');

  const assetManagementFacilities = getProductValue('yardManagement', 'inputs').facilities || 0;
  const assetManagementAssets = getProductValue('yardManagement', 'inputs').assets || 0;
  const assetManagementMarkup = getProductValue('yardManagement', 'markup');

  const dockSchedulingVolume = getProductValue('dockScheduling', 'volume');
  const dockSchedulingMarkup = getProductValue('dockScheduling', 'markup');
  const dockSchedulingSKU = getProductValue('dockScheduling', 'sku');
  const dockSchedulingOverride = getProductValue('dockScheduling', 'override');

  // WMS getters - use standard volume like other products
  const wmsVolume = getProductValue('wms', 'volume');
  const wmsMarkup = getProductValue('wms', 'markup');

  // AI Agent - Manual selection of which products to include
  const aiAgentEnabled = getProductValue('aiAgent', 'enabled');
  const aiAgentMarkup = getProductValue('aiAgent', 'markup');
  const aiAgentIncludesFreight = getProductValue('aiAgent', 'includesFreight') ?? false;
  const aiAgentIncludesParcel = getProductValue('aiAgent', 'includesParcel') ?? false;
  const aiAgentIncludesOcean = getProductValue('aiAgent', 'includesOcean') ?? false;
  
  // Auto-check checkboxes when volumes exist and checkboxes haven't been manually set
  useEffect(() => {
    const hasFreightValue = getProductValue('aiAgent', 'includesFreight');
    const hasParcelValue = getProductValue('aiAgent', 'includesParcel');
    const hasOceanValue = getProductValue('aiAgent', 'includesOcean');
    
    // Debug logging (will be removed after validation)
    console.log('[App.jsx useEffect] AI Agent auto-check logic:', {
      hasFreightValue,
      hasParcelValue,
      hasOceanValue,
      freightVolume,
      parcelVolume,
      oceanTrackingVolume
    });
    
    // Only auto-set if user hasn't manually interacted with these checkboxes yet
    if (hasFreightValue === undefined && freightVolume > 0) {
      console.log('[App.jsx useEffect] Auto-checking Freight');
      setProductValue('aiAgent', 'includesFreight', true);
    }
    if (hasParcelValue === undefined && parcelVolume > 0) {
      console.log('[App.jsx useEffect] Auto-checking Parcel');
      setProductValue('aiAgent', 'includesParcel', true);
    }
    if (hasOceanValue === undefined && oceanTrackingVolume > 0) {
      console.log('[App.jsx useEffect] Auto-checking Ocean');
      setProductValue('aiAgent', 'includesOcean', true);
    }
  }, [freightVolume, parcelVolume, oceanTrackingVolume, getProductValue, setProductValue]);
  
  // Calculate total shipment volume based on checkbox selections
  const aiAgentTotalVolume = 
    (aiAgentIncludesFreight ? freightVolume : 0) +
    (aiAgentIncludesParcel ? parcelVolume : 0) +
    (aiAgentIncludesOcean ? oceanTrackingVolume : 0);

  // Backward-compatible setters (temporary during refactor)
  const setFreightVolume = (val) => setProductValue('freight', 'volume', val);
  const setFreightMarkup = (val) => setProductValue('freight', 'markup', val);
  const setFreightSKU = (val) => setProductValue('freight', 'sku', val);
  const setFreightOverride = (val) => setProductValue('freight', 'override', val);

  const setParcelVolume = (val) => setProductValue('parcel', 'volume', val);
  const setParcelMarkup = (val) => setProductValue('parcel', 'markup', val);
  const setParcelSKU = (val) => setProductValue('parcel', 'sku', val);
  const setParcelOverride = (val) => setProductValue('parcel', 'override', val);

  const setOceanTrackingVolume = (val) => setProductValue('oceanTracking', 'volume', val);
  const setOceanTrackingMarkup = (val) => setProductValue('oceanTracking', 'markup', val);
  const setOceanTrackingSKU = (val) => setProductValue('oceanTracking', 'sku', val);
  const setOceanTrackingOverride = (val) => setProductValue('oceanTracking', 'override', val);

  const setBillPayYesNo = (val) => setProductValue('billPay', 'value', val);
  const setBillPayMarkup = (val) => setProductValue('billPay', 'markup', val);

  const setLocationsVolume = (val) => setProductValue('locations', 'volume', val);
  const setLocationsMarkup = (val) => setProductValue('locations', 'markup', val);
  const setLocationsSKU = (val) => setProductValue('locations', 'sku', val);
  const setLocationsOverride = (val) => setProductValue('locations', 'override', val);

  const setSupportPackageVolume = (val) => setProductValue('supportPackage', 'volume', val);
  const setSupportPackageMarkup = (val) => setProductValue('supportPackage', 'markup', val);
  const setSupportPackageSKU = (val) => setProductValue('supportPackage', 'sku', val);
  const setSupportPackageOverride = (val) => setProductValue('supportPackage', 'override', val);

  const setVendorPortalCount = (val) => setProductValue('vendorPortals', 'volume', val);
  const setVendorPortalMarkup = (val) => setProductValue('vendorPortals', 'markup', val);

  const setAuditingVolume = (val) => setProductValue('auditing', 'volume', val);
  const setAuditingMarkup = (val) => setProductValue('auditing', 'markup', val);
  const setAuditingSKU = (val) => setProductValue('auditing', 'sku', val);
  const setAuditingOverride = (val) => setProductValue('auditing', 'override', val);

  const setFleetRouteVolume = (val) => setProductValue('fleetRouteOptimization', 'volume', val);
  const setFleetRouteMarkup = (val) => setProductValue('fleetRouteOptimization', 'markup', val);
  const setFleetRouteSKU = (val) => setProductValue('fleetRouteOptimization', 'sku', val);
  const setFleetRouteOverride = (val) => setProductValue('fleetRouteOptimization', 'override', val);

  const setAssetManagementFacilities = (val) => setProductInput('yardManagement', 'facilities', val);
  const setAssetManagementAssets = (val) => setProductInput('yardManagement', 'assets', val);
  const setAssetManagementMarkup = (val) => setProductValue('yardManagement', 'markup', val);

  const setDockSchedulingVolume = (val) => setProductValue('dockScheduling', 'volume', val);
  const setDockSchedulingMarkup = (val) => setProductValue('dockScheduling', 'markup', val);
  const setDockSchedulingSKU = (val) => setProductValue('dockScheduling', 'sku', val);
  const setDockSchedulingOverride = (val) => setProductValue('dockScheduling', 'override', val);

  const setWmsVolume = (val) => setProductValue('wms', 'volume', val);
  const setWmsMarkup = (val) => setProductValue('wms', 'markup', val);

  // === AUTO-SELECTION EFFECTS ===
  // Unified auto-tier selection for all products
  useEffect(() => {
    // Map product IDs to skuData keys
    const productToSKUDataMap = {
      'freight': 'Freight',
      'parcel': 'Parcel',
      'oceanTracking': 'Ocean',
      'locations': 'Locations',
      'supportPackage': 'Support',
      'auditing': 'Auditing',
      'fleetRouteOptimization': 'FleetRoute',
      'dockScheduling': 'DockScheduling',
      'vendorPortals': 'VendorPortals',
      'wms': 'WMS',
    };
    
    productConfig.forEach(product => {
      // Skip products without SKU-based pricing
      if (!product.skus || product.inputType === 'yesNo' || product.pricingType === 'custom') {
        return;
      }
      
      const productState = products[product.id];
      if (!productState) return;
      
      const volume = productState.volume || 0;
      const override = productState.override || false;
      const currentSKU = productState.sku || '';
      
      // Get the correct SKU array from skuData (loaded from JSON)
      const skuDataKey = productToSKUDataMap[product.id];
      if (!skuDataKey || !skuData[skuDataKey]) {
        console.warn(`[SKU Auto-Select] No skuData found for product ${product.id}`);
        return;
      }
      
      const skuArray = subBilling === 'annual' 
        ? skuData[skuDataKey].annual 
        : skuData[skuDataKey].monthly;
      
      if (!skuArray || skuArray.length === 0) {
        console.warn(`[SKU Auto-Select] Empty SKU array for product ${product.id}`);
        return;
      }
      
      if (!override && volume >= 1) {
        const selectedSKU = findSKUForProduct(skuArray, volume, product.id);
        
        // Debug logging for pricing issues
        if (['parcel', 'locations', 'auditing', 'dockScheduling'].includes(product.id)) {
          console.log(`[SKU Auto-Select] ${product.id}: volume=${volume}, billing=${subBilling}, selectedSKU=${selectedSKU}, skuArrayLength=${skuArray.length}`);
          if (skuArray.length > 0) {
            console.log(`[SKU Auto-Select] First SKU:`, skuArray[0]);
            console.log(`[SKU Auto-Select] Last SKU:`, skuArray[skuArray.length - 1]);
          }
        }
        
        // Only update if SKU actually changed to avoid infinite loops
        if (selectedSKU !== currentSKU) {
          setProductValue(product.id, 'sku', selectedSKU);
        }
      } else if (volume < 1 && currentSKU !== '') {
        setProductValue(product.id, 'sku', '');
      }
    });
  }, [
    // Track individual product values to avoid infinite loops
    freightVolume, freightOverride,
    parcelVolume, parcelOverride,
    oceanTrackingVolume, oceanTrackingOverride,
    locationsVolume, locationsOverride,
    supportPackageVolume, supportPackageOverride,
    auditingVolume, auditingOverride,
    fleetRouteVolume, fleetRouteOverride,
    dockSchedulingVolume, dockSchedulingOverride,
    subBilling,
    skuData, // Add skuData as dependency so it updates when JSON loads
  ]);

  // === LOOKUP PLANS ===
  const freightPlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.Freight.annual : skuData.Freight.monthly,
    freightSKU
  );
  const parcelPlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.Parcel.annual : skuData.Parcel.monthly,
    parcelSKU
  );
  const auditingPlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.Auditing.annual : skuData.Auditing.monthly,
    auditingSKU
  );
  const locationsPlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.Locations.annual : skuData.Locations.monthly,
    locationsSKU
  );
  const fleetRoutePlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.FleetRoute.annual : skuData.FleetRoute.monthly,
    fleetRouteSKU
  );
  const oceanTrackingPlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.Ocean.annual : skuData.Ocean.monthly,
    oceanTrackingSKU
  );
  const supportPackagePlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.Support.annual : skuData.Support.monthly,
    supportPackageSKU
  );
  const dockSchedulingPlan = getPlanBySKU(
    subBilling === 'annual' ? skuData.DockScheduling.annual : skuData.DockScheduling.monthly,
    dockSchedulingSKU
  );

  // Define customPricingPresent to be used in the detailed quote summary
  const customPricingPresent = [
    freightPlan,
    parcelPlan,
    auditingPlan,
    locationsPlan,
    fleetRoutePlan,
    oceanTrackingPlan,
    supportPackagePlan,
    dockSchedulingPlan,
  ].some(plan => plan && plan.tier.includes('Custom Pricing'));

  // === COMPUTE COSTS ===
  const freightCostObj = computeVolumeBasedCost(freightVolume, freightPlan, subBilling);
  const freightAnnualCost =
    (subBilling === 'annual' ? freightCostObj.annualCost : freightCostObj.monthlyCost * 12) *
    (1 + freightMarkup / 100);

  const parcelCostObj = computeVolumeBasedCost(parcelVolume, parcelPlan, subBilling);
  const parcelAnnualCost = parcelCostObj.annualCost * (1 + parcelMarkup / 100);

  const oceanTrackingCostObj = computeVolumeBasedCost(oceanTrackingVolume, oceanTrackingPlan, subBilling);
  const oceanTrackingAnnualCost =
    (subBilling === 'annual' ? oceanTrackingCostObj.annualCost : oceanTrackingCostObj.monthlyCost * 12) *
    (1 + oceanTrackingMarkup / 100);

  const locationsCostObj = computeVolumeBasedCost(locationsVolume, locationsPlan, subBilling);
  const locationsAnnualCost = locationsCostObj.annualCost * (1 + locationsMarkup / 100);

  const supportPackageCostAnnual = supportPackagePlan
    ? supportPackagePlan.annualCost * (1 + supportPackageMarkup / 100)
    : 0;

  // Yard Management Calculation
  const { monthlyCost: assetManagementMonthlyCost, annualCost: assetManagementAnnualCost } =
    calculateYardManagementCost(assetManagementFacilities, assetManagementAssets, subBilling, assetManagementMarkup);

  const coreTMSAnnualCost = freightAnnualCost + parcelAnnualCost + oceanTrackingAnnualCost;
  const useLocations = locationsAnnualCost > coreTMSAnnualCost;
  const effectiveCoreAnnualCost = useLocations ? locationsAnnualCost : coreTMSAnnualCost;

  // Bill Pay Calculation
  const { monthlyCost: billPayMonthlyCost, annualCost: billPayAnnualCost } =
    calculateBillPayCost(billPayYesNo, freightVolume, parcelVolume, subBilling, billPayMarkup);

  // Vendor Portals Calculation
  const { monthlyCost: vendorMonthlyCost, annualCost: vendorAnnualCost } =
    calculateVendorPortalCost(vendorPortalCount, subBilling, vendorPortalMarkup);

  const auditingCostObj = auditingPlan ? computeFixedCost(auditingPlan, subBilling) : { monthlyCost: 0, annualCost: 0 };
  const auditingAnnualCost = auditingCostObj.annualCost * (1 + auditingMarkup / 100);

  const fleetRouteCostObj = fleetRoutePlan
    ? { monthlyCost: fleetRoutePlan.perMonthCost, annualCost: fleetRoutePlan.annualCost }
    : { monthlyCost: 0, annualCost: 0 };
  const fleetRouteEffectiveAnnual = fleetRouteCostObj.annualCost * (1 + fleetRouteMarkup / 100);

  // Dock Scheduling cost
  const dockSchedulingCostObj = computeVolumeBasedCost(dockSchedulingVolume, dockSchedulingPlan, subBilling);
  const dockSchedulingAnnualCost = dockSchedulingCostObj.annualCost * (1 + dockSchedulingMarkup / 100);

  // WMS Costs - Annual only (simplified, no implementation fee)
  const wmsSubscriptionCost = (() => {
    if (wmsVolume === 0 || subBilling !== 'annual') return 0;
    
    // First warehouse: $12,000, each additional: $6,000
    const firstWarehouse = 12000;
    const additionalWarehouses = Math.max(0, wmsVolume - 1);
    const additionalCost = additionalWarehouses * 6000;
    
    return firstWarehouse + additionalCost;
  })();
  const wmsAnnualCost = wmsSubscriptionCost * (1 + wmsMarkup / 100);

  // AI Agent Costs - Annual only, tiered based on total shipments
  const aiAgentSubscriptionCost = (() => {
    // AI Agent is considered "enabled" if any checkbox is checked (volume > 0)
    if (subBilling !== 'annual' || aiAgentTotalVolume === 0) return 0;
    
    // Tier matching based on total shipments
    const tiers = [
      { rangeStart: 0, rangeEnd: 250, cost: 3000 },
      { rangeStart: 251, rangeEnd: 500, cost: 6000 },
      { rangeStart: 501, rangeEnd: 1000, cost: 12000 },
      { rangeStart: 1001, rangeEnd: 1500, cost: 18000 },
      { rangeStart: 1501, rangeEnd: 2000, cost: 24000 },
      { rangeStart: 2001, rangeEnd: 3000, cost: 36000 },
      { rangeStart: 3001, rangeEnd: 4000, cost: 48000 },
      { rangeStart: 4001, rangeEnd: 5000, cost: 60000 },
    ];
    
    const tier = tiers.find(t => aiAgentTotalVolume >= t.rangeStart && aiAgentTotalVolume <= t.rangeEnd);
    return tier ? tier.cost : 0;
  })();
  const aiAgentAnnualCost = aiAgentSubscriptionCost * (1 + aiAgentMarkup / 100);
  
  // Get token allocation for AI Agent
  const aiAgentTokens = (() => {
    if (aiAgentTotalVolume === 0) return 0;
    
    const tiers = [
      { rangeEnd: 250, tokens: 50000000 },
      { rangeEnd: 500, tokens: 100000000 },
      { rangeEnd: 1000, tokens: 200000000 },
      { rangeEnd: 1500, tokens: 300000000 },
      { rangeEnd: 2000, tokens: 400000000 },
      { rangeEnd: 3000, tokens: 600000000 },
      { rangeEnd: 4000, tokens: 800000000 },
      { rangeEnd: 5000, tokens: 1000000000 },
    ];
    
    const tier = tiers.find(t => aiAgentTotalVolume <= t.rangeEnd);
    return tier ? tier.tokens : 0;
  })();

  const rawSubAnnualSubscription =
    effectiveCoreAnnualCost +
    (billPayYesNo === 'Yes' ? billPayAnnualCost : 0) +
    vendorAnnualCost +
    auditingAnnualCost +
    fleetRouteEffectiveAnnual +
    supportPackageCostAnnual +
    (assetManagementAnnualCost > 0 ? assetManagementAnnualCost : 0) +
    dockSchedulingAnnualCost +
    wmsAnnualCost +
    aiAgentAnnualCost;

  // Calculate subscription total with minimum enforcement
  const {
    finalAnnual: finalSubscriptionAnnual,
    finalMonthly: finalSubscriptionMonthly,
    neededToMin: neededToMinAnnual,
    neededToMinMonthly,
  } = calculateSubscriptionTotal(rawSubAnnualSubscription, minSubscription, globalMarkup);

  // Calculate one-time costs
  const { finalTotal: finalOneTimeCost } = calculateOneTimeCosts(oneTimeCosts, oneTimeMarkup);

  const finalGrandTotal = finalSubscriptionAnnual + finalOneTimeCost;

  // Auto-reset if computed subscription total is NaN.
  useEffect(() => {
    if (isNaN(finalSubscriptionAnnual)) {
      handleReset();
    }
  }, [finalSubscriptionAnnual]);

  // === Simulate CSV load for One-Time Costs ===
  useEffect(() => {
    const sampleOneTime = [
      {
        name: 'Setup Fee',
        description: 'Implementation & Setup',
        amount: 3000,
      },
      {
        name: 'Integration',
        description: 'Custom ERP Integration',
        amount: 2000,
      },
    ];
    setOneTimeCosts(sampleOneTime);
  }, []);

  // === DOWNLOAD PNG FUNCTION ===
  const downloadPageAsPNG = () => {
    if (!companyName.trim() || !repName.trim() || !downloadDate.trim()) {
      alert(
        'Please fill out Company Name, Rep Name, and Date before downloading.'
      );
      return;
    }
    if (!pageRef.current) {
      console.error('Page container not found!');
      return;
    }
    html2canvas(pageRef.current, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      const formattedDate = downloadDate.replace(/-/g, '');
      const company = companyName.trim() || 'Company';
      const rep = repName.trim() || 'Rep';
      link.href = canvas.toDataURL('image/png');
      link.download = `${formattedDate}-${company}-${rep}.png`;
      link.click();
    });
  };

  // === Handle Reset ===
  const handleReset = () => {
    resetAllProducts();
    setGlobalMarkup(0);
    setMinSubscription(20000);
    setOneTimeMarkup(0);
    setOneTimeCosts([]);
    setSubBilling('annual');
  };

  // === Process Screenshot File ===
  const processScreenshotFile = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setScreenshotError('Please upload an image file (PNG, JPG, etc.)');
      setShowScreenshotModal(true);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setScreenshotError('File size must be less than 10MB');
      setShowScreenshotModal(true);
      return;
    }

    setIsParsingScreenshot(true);
    setScreenshotError(null);
    setShowScreenshotModal(true);

    try {
      // Parse screenshot with Claude
      const parsed = await parseScreenshotWithClaude(file);

      // Calculate margins (now returns object with products and totalPrice)
      const marginResult = calculateMargins(parsed.products, skuData, subBilling, parsed.totalPrice);

      setScreenshotData({
        ...parsed,
        products: marginResult.products,
        totalPrice: marginResult.totalPrice,
      });
    } catch (error) {
      console.error('Error parsing screenshot:', error);
      setScreenshotError(error.message || 'Failed to parse screenshot. Please try again.');
      setScreenshotData(null);
    } finally {
      setIsParsingScreenshot(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // === Screenshot Upload Handler ===
  const handleScreenshotUpload = async (event) => {
    const file = event.target.files[0];
    await processScreenshotFile(file);
  };

  // === Handle Paste ===
  const handlePaste = async (file) => {
    await processScreenshotFile(file);
  };

  // === Apply Screenshot Data ===
  const applyScreenshotData = (data) => {
    if (!data || !data.products || data.products.length === 0) {
      return;
    }

    // Update billing frequency if different
    if (data.billingFrequency && data.billingFrequency !== subBilling) {
      setSubBilling(data.billingFrequency);
    }

    // Apply each product
    data.products.forEach((product) => {
      if (!product.productId || product.error) {
        return; // Skip products with errors
      }

      // Set volume (for Auditing Module, this is the number of carriers)
      if (product.volume > 0) {
        setProductValue(product.productId, 'volume', product.volume);
      }

      // Set SKU if found
      if (product.sku) {
        setProductValue(product.productId, 'sku', product.sku);
      }

      // Calculate and set markup if customer price differs from our cost
      // Skip if customerPrice is null (when totalPrice is used instead)
      if (product.ourCost > 0 && product.customerPrice !== null && product.customerPrice !== undefined && product.customerPrice > 0) {
        const requiredMarkup = calculateRequiredMarkup(product.ourCost, product.customerPrice);
        if (Math.abs(requiredMarkup) > 0.01) {
          // Only set markup if there's a meaningful difference
          setProductValue(product.productId, 'markup', requiredMarkup);
        }
      }
    });

    // Close modal
    setShowScreenshotModal(false);
    setScreenshotData(null);
    setScreenshotError(null);
  };

  // === Retry Screenshot Parsing ===
  const handleRetryScreenshot = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const topSpacerHeight = '90px';

  // === LOGIN SCREEN ===
  // Show loading state while pricing data loads
  if (isLoadingPricing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
        <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
          Loading Pricing Data...
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Fetching latest pricing from CSV
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '48px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#334155',
              marginBottom: '8px'
            }}>
              FreightPOP Quote Builder
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              margin: 0
            }}>
              Please enter the master password to continue
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '8px'
              }}>
                Master Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: loginError ? '2px solid #ef4444' : '2px solid #e2e8f0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!loginError) e.target.style.borderColor = '#667eea';
                }}
                onBlur={(e) => {
                  if (!loginError) e.target.style.borderColor = '#e2e8f0';
                }}
              />
              {loginError && (
                <p style={{
                  fontSize: '13px',
                  color: '#ef4444',
                  marginTop: '8px',
                  marginBottom: 0
                }}>
                  🔒 {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.4)';
              }}
            >
              Login
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#94a3b8',
            marginTop: '24px',
            marginBottom: 0
          }}>
            🔐 Secure access only
          </p>
        </div>
      </div>
    );
  }

  // === MAIN APP CONTENT ===
  return (
    <>
      <FixedHeader onLogout={handleLogout} />
      <div style={{ height: topSpacerHeight }} />
      <div
        ref={pageRef}
        style={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto 20px',
          padding: '20px',
          boxSizing: 'border-box',
          minHeight: '100vh',
        }}
      >
        {showCustomerView ? (
          <Card>
            <CardHeader>
              <CardTitle>Customer Detailed Quote</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const customerQuoteItems = [];

                // Row for Shipments Included
                if (
                  freightVolume > 0 ||
                  parcelVolume > 0 ||
                  oceanTrackingVolume > 0
                ) {
                  let shipments = '';
                  if (freightVolume > 0 && freightPlan) {
                    shipments += `Freight: ${freightPlan.shipmentsIncluded} shipments`;
                  }
                  if (parcelVolume > 0 && parcelPlan) {
                    shipments += shipments
                      ? `; Parcel: ${parcelPlan.shipmentsIncluded} shipments`
                      : `Parcel: ${parcelPlan.shipmentsIncluded} shipments`;
                  }
                  if (oceanTrackingVolume > 0 && oceanTrackingPlan) {
                    shipments += shipments
                      ? `; Ocean: ${oceanTrackingPlan.shipmentsIncluded} shipments`
                      : `Ocean: ${oceanTrackingPlan.shipmentsIncluded} shipments`;
                  }
                  customerQuoteItems.push({
                    label: 'Shipments Included',
                    value: shipments,
                  });
                }

                // Auditing Module
                if (auditingVolume > 0 && auditingPlan) {
                  customerQuoteItems.push({
                    label: 'Auditing Module',
                    value: `${auditingPlan.tier} - ${auditingVolume} carriers`,
                  });
                }

                // Locations (default "1-3" if no input)
                if (locationsPlan) {
                  const locationsText =
                    locationsVolume > 0
                      ? `${locationsPlan.tier} - ${locationsVolume} locations`
                      : 'Default (1-3)';
                  customerQuoteItems.push({
                    label: 'Locations Included',
                    value: locationsText,
                  });
                }

                // Fleet Included
                if (fleetRouteVolume > 0 && fleetRoutePlan) {
                  customerQuoteItems.push({
                    label: 'Fleet Included',
                    value: `${fleetRoutePlan.tier} - ${fleetRouteVolume} volumes`,
                  });
                }

                // Support Package
                if (supportPackageVolume > 0 && supportPackagePlan) {
                  customerQuoteItems.push({
                    label: 'Support Package',
                    value: `${supportPackagePlan.tier} - ${supportPackageVolume} hours`,
                  });
                }

                // Dock Scheduling
                if (dockSchedulingVolume > 0 && dockSchedulingPlan) {
                  customerQuoteItems.push({
                    label: 'Dock Scheduling',
                    value: `${dockSchedulingPlan.tier} - ${dockSchedulingVolume} hours`,
                  });
                }

                // WMS
                if (wmsVolume > 0) {
                  customerQuoteItems.push({
                    label: 'WMS',
                    value: `${wmsVolume} warehouse${wmsVolume > 1 ? 's' : ''}`,
                  });
                }

                // AI Agent
                if (aiAgentTotalVolume > 0) {
                  customerQuoteItems.push({
                    label: 'FreightPOP AI Agent',
                    value: `${aiAgentTokens.toLocaleString()} tokens (${aiAgentTotalVolume.toLocaleString()} shipments)`,
                  });
                }

                // Yard Management
                if (
                  assetManagementFacilities > 0 ||
                  assetManagementAssets > 0
                ) {
                  customerQuoteItems.push({
                    label: 'Yard Management',
                    value: `${assetManagementFacilities} facilities, ${assetManagementAssets} assets`,
                  });
                }

                // Subscription Subtotal
                customerQuoteItems.push({
                  label: 'Subscription Subtotal',
                  value: formatCost(finalSubscriptionAnnual),
                });

                return (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '16px',
                    }}
                  >
                    <tbody>
                      {customerQuoteItems.map((item, index) => (
                        <tr key={index}>
                          <th
                            style={{
                              border: '1px solid #ccc',
                              padding: '10px',
                              textAlign: 'left',
                            }}
                          >
                            {item.label}
                          </th>
                          <td
                            style={{
                              border: '1px solid #ccc',
                              padding: '10px',
                              textAlign: 'left',
                            }}
                          >
                            {item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              <div style={{ marginTop: '20px' }}>
                <h3>One-Time Costs</h3>
                {oneTimeCosts.length > 0 ? (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '16px',
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: '1px solid #ccc',
                            padding: '10px',
                            textAlign: 'center',
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            border: '1px solid #ccc',
                            padding: '10px',
                            textAlign: 'center',
                          }}
                        >
                          Description
                        </th>
                        <th
                          style={{
                            border: '1px solid #ccc',
                            padding: '10px',
                            textAlign: 'center',
                          }}
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {oneTimeCosts.map((item, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              border: '1px solid #ccc',
                              padding: '10px',
                              textAlign: 'center',
                            }}
                          >
                            {item.name}
                          </td>
                          <td
                            style={{
                              border: '1px solid #ccc',
                              padding: '10px',
                              textAlign: 'center',
                            }}
                          >
                            {item.description}
                          </td>
                          <td
                            style={{
                              border: '1px solid #ccc',
                              padding: '10px',
                              textAlign: 'center',
                            }}
                          >
                            {formatCost(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No one-time costs</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Detailed Quote Summary Table */}
            <Card style={{ border: '2px solid #cbd5e1' }}>
              <CardHeader
                style={{
                  background: '#1e293b',
                  padding: '18px 24px',
                }}
              >
                <CardTitle style={{ fontSize: '20px' }}>📊 Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Settings Section */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px',
                  marginBottom: '28px',
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <label style={{ 
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      💰 Minimum Subscription (Annual):
                    </label>
                    <div style={{
                      padding: '12px 16px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '17px',
                      fontWeight: '600',
                      color: '#1e293b',
                    }}>
                      <input
                        type='number'
                        value={minSubscription}
                        onChange={e => setMinSubscription(Number(e.target.value))}
                        style={{ 
                          width: '100%',
                          ...inputStyle,
                          fontSize: '17px',
                          fontWeight: '600',
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <label style={{ 
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      📈 Global Markup (%):
                    </label>
                    <div style={{
                      padding: '12px 16px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '17px',
                      fontWeight: '600',
                      color: '#1e293b',
                    }}>
                      {editingAllMarkups ? (
                        <input
                          type='number'
                          value={globalMarkup}
                          onChange={e => setGlobalMarkup(Number(e.target.value))}
                          style={{ 
                            width: '100%',
                            ...inputStyle,
                            fontSize: '17px',
                            fontWeight: '600',
                          }}
                        />
                      ) : (
                        `${globalMarkup}%`
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <label style={{ 
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      💵 One-Time Cost Markup (%):
                    </label>
                    <div style={{
                      padding: '12px 16px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '17px',
                      fontWeight: '600',
                      color: '#1e293b',
                    }}>
                      {editingAllMarkups ? (
                        <input
                          type='number'
                          value={oneTimeMarkup}
                          onChange={e => setOneTimeMarkup(Number(e.target.value))}
                          style={{ 
                            width: '100%',
                            ...inputStyle,
                            fontSize: '17px',
                            fontWeight: '600',
                          }}
                        />
                      ) : (
                        `${oneTimeMarkup}%`
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary Table */}
                {(() => {
                  const summaryRows = [
                    {
                      productName: 'Core TMS - Freight',
                      volume: freightVolume,
                      monthlyCost: freightAnnualCost / 12,
                      annualCost: freightAnnualCost,
                      planDetails: freightPlan && freightPlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : freightPlan
                        ? `${freightPlan.tier} (Incl: ${freightPlan.shipmentsIncluded})`
                        : 'N/A',
                      tierDetails: freightPlan && freightPlan.isCustomPricing
                        ? `Volume of ${freightVolume} exceeds tier limits. Please contact sales.`
                        : freightPlan
                        ? `Incl: ${freightPlan.shipmentsIncluded}, Over: $${freightPlan.costPerShipment}/shipment`
                        : '',
                      lineMarkup: freightMarkup,
                      hideIfZero: true,
                      isCustomPricing: freightPlan && freightPlan.isCustomPricing,
                    },
                    {
                      productName: 'Core TMS - Parcel',
                      volume: parcelVolume,
                      monthlyCost: parcelAnnualCost / 12,
                      annualCost: parcelAnnualCost,
                      planDetails: parcelPlan && parcelPlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : parcelPlan
                        ? `${parcelPlan.tier} (Incl: ${parcelPlan.shipmentsIncluded})`
                        : 'N/A',
                      tierDetails: parcelPlan && parcelPlan.isCustomPricing
                        ? `Volume of ${parcelVolume} exceeds max tier. Please contact sales.`
                        : parcelPlan
                        ? `Incl: ${parcelPlan.shipmentsIncluded}, Over: $${parcelPlan.costPerShipment}/shipment`
                        : '',
                      lineMarkup: parcelMarkup,
                      hideIfZero: true,
                      isCustomPricing: parcelPlan && parcelPlan.isCustomPricing,
                    },
                    {
                      productName: 'Ocean Tracking',
                      volume: oceanTrackingVolume,
                      monthlyCost: oceanTrackingAnnualCost / 12,
                      annualCost: oceanTrackingAnnualCost,
                      planDetails: oceanTrackingPlan && oceanTrackingPlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : oceanTrackingPlan
                        ? `${oceanTrackingPlan.tier} (Incl: ${oceanTrackingPlan.shipmentsIncluded})`
                        : 'N/A',
                      tierDetails: oceanTrackingPlan && oceanTrackingPlan.isCustomPricing
                        ? `Volume of ${oceanTrackingVolume} exceeds tier limits. Please contact sales.`
                        : oceanTrackingPlan
                        ? `Incl: ${oceanTrackingPlan.shipmentsIncluded}, Over: $${oceanTrackingPlan.costPerShipment}/shipment`
                        : '',
                      lineMarkup: oceanTrackingMarkup,
                      hideIfZero: true,
                      isCustomPricing: oceanTrackingPlan && oceanTrackingPlan.isCustomPricing,
                    },
                    {
                      productName: 'Locations',
                      volume: locationsVolume,
                      monthlyCost: locationsAnnualCost / 12,
                      annualCost: locationsAnnualCost,
                      planDetails: locationsPlan && locationsPlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : locationsPlan
                        ? `${locationsPlan.tier} (Range: ${locationsPlan.rangeStart}–${locationsPlan.rangeEnd})`
                        : 'N/A',
                      tierDetails: locationsPlan && locationsPlan.isCustomPricing
                        ? `Volume of ${locationsVolume} exceeds max tier. Please contact sales.`
                        : locationsPlan
                        ? `Range: ${locationsPlan.rangeStart}–${locationsPlan.rangeEnd}`
                        : '',
                      lineMarkup: locationsMarkup,
                      hideIfZero: false,
                      isCustomPricing: locationsPlan && locationsPlan.isCustomPricing,
                    },
                    {
                      productName: 'Support Package',
                      volume: supportPackageVolume,
                      monthlyCost: supportPackageCostAnnual / 12,
                      annualCost: supportPackageCostAnnual,
                      planDetails: supportPackagePlan && supportPackagePlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : supportPackagePlan
                        ? `${supportPackagePlan.tier} (Range: ${
                            supportPackagePlan.rangeStart
                          }–${
                            supportPackagePlan.rangeEnd === Infinity
                              ? '+'
                              : supportPackagePlan.rangeEnd
                          })`
                        : 'N/A',
                      tierDetails: supportPackagePlan && supportPackagePlan.isCustomPricing
                        ? `Volume of ${supportPackageVolume} exceeds tier limits. Please contact sales.`
                        : supportPackagePlan
                        ? `Range: ${supportPackagePlan.rangeStart}–${
                            supportPackagePlan.rangeEnd === Infinity
                              ? '+'
                              : supportPackagePlan.rangeEnd
                          }`
                        : '',
                      lineMarkup: supportPackageMarkup,
                      hideIfZero: true,
                      isCustomPricing: supportPackagePlan && supportPackagePlan.isCustomPricing,
                    },
                    ...(billPayYesNo === 'Yes'
                      ? [
                          {
                            productName: 'Bill Pay',
                            volume: billPayYesNo,
                            monthlyCost: billPayMonthlyCost,
                            annualCost: billPayAnnualCost,
                            planDetails:
                              subBilling === 'annual'
                                ? '$500 base + $2/ LTL-FTL + $0.50/Parcel'
                                : '$650 base + $2.6/ LTL-FTL + $0.65/Parcel',
                            tierDetails: 'Billed if Yes',
                            lineMarkup: billPayMarkup,
                            hideIfZero: true,
                          },
                        ]
                      : []),
                    {
                      productName: 'Vendor Portals',
                      volume: vendorPortalCount,
                      monthlyCost: vendorMonthlyCost,
                      annualCost: vendorAnnualCost,
                      planDetails:
                        subBilling === 'annual'
                          ? '$20/portal/month'
                          : '$30/portal/month',
                      tierDetails: '',
                      lineMarkup: vendorPortalMarkup,
                      hideIfZero: true,
                    },
                    {
                      productName: 'Auditing Module',
                      volume: auditingVolume,
                      monthlyCost: auditingAnnualCost / 12,
                      annualCost: auditingAnnualCost,
                      planDetails: auditingPlan && auditingPlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : auditingPlan
                        ? `${auditingPlan.tier} (Range: ${
                            auditingPlan.range[0]
                          }–${
                            auditingPlan.range[1] === Infinity
                              ? '+'
                              : auditingPlan.range[1]
                          })`
                        : 'N/A',
                      tierDetails: auditingPlan && auditingPlan.isCustomPricing
                        ? `Volume of ${auditingVolume} exceeds max tier. Please contact sales.`
                        : auditingPlan
                        ? `Range: ${auditingPlan.range[0]}–${
                            auditingPlan.range[1] === Infinity
                              ? '+'
                              : auditingPlan.range[1]
                          }`
                        : '',
                      lineMarkup: auditingMarkup,
                      hideIfZero: true,
                      isCustomPricing: auditingPlan && auditingPlan.isCustomPricing,
                    },
                    {
                      productName: 'Fleet Route Optimization',
                      volume: fleetRouteVolume,
                      monthlyCost: fleetRouteEffectiveAnnual / 12,
                      annualCost: fleetRouteEffectiveAnnual,
                      planDetails: fleetRoutePlan && fleetRoutePlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : fleetRoutePlan
                        ? `${fleetRoutePlan.tier} (Range: ${fleetRoutePlan.range[0]}–${fleetRoutePlan.range[1]})`
                        : 'N/A',
                      tierDetails: fleetRoutePlan && fleetRoutePlan.isCustomPricing
                        ? `Volume of ${fleetRouteVolume} exceeds tier limits. Please contact sales.`
                        : fleetRoutePlan
                        ? `Range: ${fleetRoutePlan.range[0]}–${fleetRoutePlan.range[1]}`
                        : '',
                      lineMarkup: fleetRouteMarkup,
                      hideIfZero: true,
                      isCustomPricing: fleetRoutePlan && fleetRoutePlan.isCustomPricing,
                    },
                    ...(assetManagementAnnualCost > 0
                      ? [
                          {
                            productName: 'Yard Management',
                            volume: `${assetManagementFacilities} facilities, ${assetManagementAssets} assets`,
                            monthlyCost: assetManagementMonthlyCost,
                            annualCost: assetManagementAnnualCost,
                            planDetails: `Per facility: $${
                              subBilling === 'annual' ? '100' : '130'
                            }, per asset: $${
                              subBilling === 'annual' ? '10' : '13'
                            }`,
                            tierDetails: '',
                            lineMarkup: assetManagementMarkup,
                            hideIfZero: true,
                          },
                        ]
                      : []),
                    {
                      productName: 'Dock Scheduling',
                      volume: dockSchedulingVolume,
                      monthlyCost: dockSchedulingAnnualCost / 12,
                      annualCost: dockSchedulingAnnualCost,
                      planDetails: dockSchedulingPlan && dockSchedulingPlan.isCustomPricing
                        ? 'Custom Pricing Required'
                        : dockSchedulingPlan
                        ? `${dockSchedulingPlan.tier} (Range: ${
                            dockSchedulingPlan.rangeStart
                          }–${
                            dockSchedulingPlan.rangeEnd === Infinity
                              ? '+'
                              : dockSchedulingPlan.rangeEnd
                          })`
                        : 'N/A',
                      tierDetails: dockSchedulingPlan && dockSchedulingPlan.isCustomPricing
                        ? `Volume of ${dockSchedulingVolume} exceeds max tier. Please contact sales.`
                        : dockSchedulingPlan
                        ? `Range: ${dockSchedulingPlan.rangeStart}–${
                            dockSchedulingPlan.rangeEnd === Infinity
                              ? '+'
                              : dockSchedulingPlan.rangeEnd
                          }`
                        : '',
                      lineMarkup: dockSchedulingMarkup,
                      hideIfZero: true,
                      isCustomPricing: dockSchedulingPlan && dockSchedulingPlan.isCustomPricing,
                    },
                    {
                      productName: 'WMS',
                      volume: wmsVolume,
                      monthlyCost: wmsAnnualCost / 12,
                      annualCost: wmsAnnualCost,
                      planDetails: subBilling === 'annual'
                        ? `${wmsVolume} warehouse${wmsVolume > 1 ? 's' : ''}`
                        : 'Annual Only',
                      tierDetails: subBilling === 'annual'
                        ? `$12,000 first + $6,000 each additional`
                        : '',
                      lineMarkup: wmsMarkup,
                      hideIfZero: true,
                    },
                    {
                      productName: 'FreightPOP AI Agent',
                      volume: aiAgentTotalVolume,
                      monthlyCost: aiAgentAnnualCost / 12,
                      annualCost: aiAgentAnnualCost,
                      planDetails: (() => {
                        if (aiAgentTotalVolume === 0 || subBilling !== 'annual') return 'Annual Only';
                        
                        // Find tier range based on volume
                        const tierRanges = [
                          { min: 0, max: 250, tokens: '50M' },
                          { min: 251, max: 500, tokens: '100M' },
                          { min: 501, max: 1000, tokens: '200M' },
                          { min: 1001, max: 1500, tokens: '300M' },
                          { min: 1501, max: 2000, tokens: '400M' },
                          { min: 2001, max: 3000, tokens: '600M' },
                          { min: 3001, max: 4000, tokens: '800M' },
                          { min: 4001, max: 5000, tokens: '1B' },
                        ];
                        
                        const tier = tierRanges.find(t => aiAgentTotalVolume >= t.min && aiAgentTotalVolume <= t.max);
                        if (!tier) return 'N/A';
                        
                        return `${tier.tokens} tokens (${tier.min}-${tier.max} shipments)`;
                      })(),
                      tierDetails: aiAgentTotalVolume > 0 && subBilling === 'annual'
                        ? `Token-based pricing`
                        : '',
                      lineMarkup: aiAgentMarkup,
                      hideIfZero: true,
                      isEnabled: aiAgentTotalVolume > 0,
                    },
                  ];

                  const visibleSummaryRows = summaryRows.filter(row => {
                    // Check if product has isEnabled property (for AI Agent)
                    if ('isEnabled' in row) {
                      return row.isEnabled && row.volume !== 0;
                    }
                    // Standard volume check
                    if (typeof row.volume === 'number') {
                      return row.volume !== 0;
                    }
                    return true;
                  });

                  return (
                    <>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                      minWidth: '1000px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <thead style={stickyHeaderStyle}>
                      <tr>
                        <th style={{ ...tableThStyle, ...firstColumnStyle }}>
                          PRODUCT NAME
                        </th>
                        <th style={tableThStyle}>MONTHLY VOLUME/COUNT</th>
                        <th style={tableThStyle}>MONTHLY COST</th>
                        <th style={tableThStyle}>ANNUAL COST</th>
                        <th style={tableThStyle}>PLAN DETAILS</th>
                        <th style={tableThStyle}>TIER DETAILS</th>
                        <th style={tableThStyle}>LINE MARKUP (%)</th>
                      </tr>
                    </thead>
                        <tbody>
                          {visibleSummaryRows.map((row, idx) => (
                            <tr
                              key={idx}
                              style={
                                row.isCustomPricing
                                  ? customPricingRowStyle
                                  : {}
                              }
                            >
                              <td
                                style={{
                                  ...tableTdStyle,
                                  ...firstColumnStyle,
                                  textDecoration: row.strike
                                    ? 'line-through'
                                    : 'none',
                                  color: row.strike ? 'red' : 'inherit',
                                }}
                              >
                                {row.productName}
                              </td>
                              <td style={tableTdStyle}>{row.volume}</td>
                              <td style={{ ...tableTdStyle, ...(row.isCustomPricing ? customPricingTextStyle : {}) }}>
                                {row.isCustomPricing ? 'Custom Pricing' : formatCost(row.monthlyCost)}
                              </td>
                              <td style={{ ...tableTdStyle, ...(row.isCustomPricing ? customPricingTextStyle : {}) }}>
                                {row.isCustomPricing ? 'Custom Pricing' : formatCost(row.annualCost)}
                              </td>
                              <td style={{ ...tableTdStyle, ...(row.isCustomPricing ? customPricingTextStyle : {}) }}>
                                {row.planDetails}
                              </td>
                              <td style={tableTdStyle}>{row.tierDetails}</td>
                              <td style={tableTdStyle}>
                                {editingAllMarkups ? (
                                  <input
                                    type='number'
                                    style={{ width: '60px' }}
                                    value={row.lineMarkup}
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      switch (row.productName) {
                                        case 'Core TMS - Freight':
                                          setFreightMarkup(val);
                                          break;
                                        case 'Core TMS - Parcel':
                                          setParcelMarkup(val);
                                          break;
                                        case 'Ocean Tracking':
                                          setOceanTrackingMarkup(val);
                                          break;
                                        case 'Bill Pay':
                                          setBillPayMarkup(val);
                                          break;
                                        case 'Locations':
                                          setLocationsMarkup(val);
                                          break;
                                        case 'Support Package':
                                          setSupportPackageMarkup(val);
                                          break;
                                        case 'Vendor Portals':
                                          setVendorPortalMarkup(val);
                                          break;
                                        case 'Auditing Module':
                                          setAuditingMarkup(val);
                                          break;
                                        case 'Fleet Route Optimization':
                                          setFleetRouteMarkup(val);
                                          break;
                                        case 'Yard Management':
                                          setAssetManagementMarkup(val);
                                          break;
                                        case 'Dock Scheduling':
                                          setDockSchedulingMarkup(val);
                                          break;
                                        default:
                                          break;
                                      }
                                    }}
                                  />
                                ) : (
                                  <span>{`${row.lineMarkup}%`}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          <tr style={{
                            background: '#059669',
                            fontWeight: '600',
                            color: 'white',
                            fontSize: '15px',
                          }}>
                            <td style={{ ...tableTdStyle, color: 'white' }}>
                              💰 Subscription Total
                            </td>
                            <td style={{ ...tableTdStyle, color: 'white' }}></td>
                            <td style={{ ...tableTdStyle, color: 'white', fontSize: '15px', fontWeight: '600' }}>
                              {formatCost(finalSubscriptionMonthly)}
                            </td>
                            <td style={{ ...tableTdStyle, color: 'white', fontSize: '15px', fontWeight: '600' }}>
                              {formatCost(finalSubscriptionAnnual)}
                            </td>
                            <td style={{ ...tableTdStyle, color: 'white' }} colSpan={2}></td>
                            <td style={{ ...tableTdStyle, color: 'white' }}></td>
                          </tr>
                          {neededToMinAnnual > 0 && (
                            <tr style={{
                              background: '#fef2f2',
                            }}>
                              <td
                                style={{ 
                                  ...tableTdStyle, 
                                  color: '#b91c1c',
                                  fontWeight: '600',
                                  fontSize: '13px',
                                }}
                                colSpan={7}
                              >
                                ⚠️ Below Minimum: Need{' '}
                                {formatCost(neededToMinAnnual)} more annually (
                                {formatCost(neededToMinMonthly)} monthly)
                              </td>
                            </tr>
                          )}
                          <tr style={{
                            background: '#f59e0b',
                            fontWeight: '600',
                            color: 'white',
                          }}>
                            <td style={{ ...tableTdStyle, color: 'white' }}>
                              🏗️ One-Time Costs (with markup)
                            </td>
                            <td style={{ ...tableTdStyle, color: 'white' }} colSpan={4}></td>
                            <td style={{ ...tableTdStyle, color: 'white' }}></td>
                            <td style={{ 
                              ...tableTdStyle, 
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: '600',
                            }}>
                              {formatCost(finalOneTimeCost)}
                            </td>
                          </tr>
                          <tr style={{
                            background: '#334155',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            color: 'white',
                          }}>
                            <td style={{ 
                              ...tableTdStyle, 
                              color: 'white',
                              fontSize: '16px',
                            }}>
                              🎯 GRAND TOTAL
                            </td>
                            <td style={{ ...tableTdStyle, color: 'white' }} colSpan={4}></td>
                            <td style={{ ...tableTdStyle, color: 'white' }}></td>
                            <td style={{ 
                              ...tableTdStyle, 
                              color: 'white',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              padding: '16px',
                            }}>
                              {formatCost(finalGrandTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {customPricingPresent && (
                      <div style={{
                        marginTop: '16px',
                        padding: '14px 16px',
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        color: '#991b1b',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                      }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <span>
                          Please get management approval before sending quote to customer.
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
              {useLocations && (
                <div
                  style={{
                    color: 'red',
                    marginTop: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  The cost of the locations is higher than the Freight and
                  Parcel and thus the minimum that we need to hit is the
                  locations cost.
                </div>
              )}
            </CardContent>
          </Card>

            {/* Input Table: Shipments, Volumes, & Other Counts */}
            <Card>
              <CardHeader>
                <CardTitle>📦 Product Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ 
                  marginBottom: '24px', 
                  padding: '16px', 
                  background: '#f8fafc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ 
                      marginRight: '8px',
                      fontWeight: '600',
                      fontSize: '15px',
                      color: '#1e293b'
                    }}>
                      Billing Frequency:
                    </label>
                    <select
                      value={subBilling}
                      onChange={e => setSubBilling(e.target.value)}
                      style={{ 
                        ...selectStyle, 
                        fontWeight: '600',
                        fontSize: '15px',
                        minWidth: '140px'
                      }}
                    >
                      <option value='annual'>📅 Annual</option>
                      <option value='monthly'>📆 Monthly</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ 
                      marginRight: '8px',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Group By:
                    </label>
                    <button
                      onClick={() => setGroupBy('category')}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: groupBy === 'category' ? '#3b82f6' : 'white',
                        color: groupBy === 'category' ? 'white' : '#64748b',
                        border: groupBy === 'category' ? 'none' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Business Category
                    </button>
                    <button
                      onClick={() => setGroupBy('pricingModel')}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: groupBy === 'pricingModel' ? '#8b5cf6' : 'white',
                        color: groupBy === 'pricingModel' ? 'white' : '#64748b',
                        border: groupBy === 'pricingModel' ? 'none' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Pricing Model
                    </button>
                  </div>
                </div>
                
                {/* Advanced Filtering UI */}
                <div style={{ 
                  padding: '20px', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                }}>
                  {/* Search and Quick Actions Row */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: '18px' }}>🔍</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search products..."
                      style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => setSelectedModels(Object.keys(pricingModels))}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'white',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => setSelectedModels([])}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'white',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Hide All
                    </button>
                  </div>

                  {/* Quick Filter Pills */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Quick Filters:
                    </span>
                    {Object.values(pricingModels).sort((a, b) => a.order - b.order).map(model => {
                      const isSelected = selectedModels.includes(model.id);
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedModels(prev => prev.filter(id => id !== model.id));
                            } else {
                              setSelectedModels(prev => [...prev, model.id]);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: isSelected ? model.color : 'white',
                            color: isSelected ? 'white' : model.color,
                            border: `2px solid ${model.color}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: isSelected ? 1 : 0.6,
                          }}
                        >
                          <span>{model.icon}</span>
                          <span>{model.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                      minWidth: '1000px'
                    }}
                  >
                    <thead style={stickyHeaderStyle}>
                      <tr>
                        <th style={{ ...tableThStyle, ...firstColumnStyle }}>
                          PRODUCT TYPE
                        </th>
                        <th style={tableThStyle}>PRODUCT PLAN DESCRIPTION</th>
                        <th style={tableThStyle}>MONTHLY VOLUME/COUNT</th>
                        <th style={tableThStyle}>MONTHLY COST</th>
                        <th style={tableThStyle}>ANNUAL COST</th>
                      </tr>
                    </thead>
                  <tbody>
                    {(() => {
                      // Define the product rows array
                      const productRows = [
                      {
                        productType: 'Core TMS - Freight',
                        pricingModel: 'shipmentBased',
                        planDescription: freightPlan && freightPlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : freightPlan
                          ? `${freightPlan.tier} (Incl: ${freightPlan.shipmentsIncluded})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.Freight.annual
                            : skuData.Freight.monthly,
                        selectedSKU: freightSKU,
                        onSKUChange: val => {
                          setFreightSKU(val);
                          setFreightOverride(true);
                        },
                        volumeCount: freightVolume,
                        onVolumeChange: e =>
                          setFreightVolume(Number(e.target.value) || 0),
                        monthlyCost: freightAnnualCost / 12,
                        annualCost: freightAnnualCost,
                        isCustomPricing: freightPlan && freightPlan.isCustomPricing,
                      },
                      {
                        productType: 'Core TMS - Parcel',
                        pricingModel: 'shipmentBased',
                        planDescription: parcelPlan && parcelPlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : parcelPlan
                          ? `${parcelPlan.tier} (Incl: ${parcelPlan.shipmentsIncluded})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.Parcel.annual
                            : skuData.Parcel.monthly,
                        selectedSKU: parcelSKU,
                        onSKUChange: val => {
                          setParcelSKU(val);
                          setParcelOverride(true);
                        },
                        volumeCount: parcelVolume,
                        onVolumeChange: e =>
                          setParcelVolume(Number(e.target.value) || 0),
                        monthlyCost: parcelAnnualCost / 12,
                        annualCost: parcelAnnualCost,
                        isCustomPricing: parcelPlan && parcelPlan.isCustomPricing,
                      },
                      {
                        productType: 'Ocean Tracking',
                        pricingModel: 'shipmentBased',
                        planDescription: oceanTrackingPlan && oceanTrackingPlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : oceanTrackingPlan
                          ? `${oceanTrackingPlan.tier} (Incl: ${oceanTrackingPlan.shipmentsIncluded})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.Ocean.annual
                            : skuData.Ocean.monthly,
                        selectedSKU: oceanTrackingSKU,
                        onSKUChange: val => {
                          setOceanTrackingSKU(val);
                          setOceanTrackingOverride(true);
                        },
                        volumeCount: oceanTrackingVolume,
                        onVolumeChange: e =>
                          setOceanTrackingVolume(Number(e.target.value) || 0),
                        monthlyCost: oceanTrackingAnnualCost / 12,
                        annualCost: oceanTrackingAnnualCost,
                        isCustomPricing: oceanTrackingPlan && oceanTrackingPlan.isCustomPricing,
                      },
                      {
                        productType: 'Bill Pay',
                        pricingModel: 'billPay',
                        planDescription:
                          subBilling === 'annual'
                            ? '$500 base + $2/ LTL-FTL + $0.50/Parcel'
                            : '$650 base + $2.6/ LTL-FTL + $0.65/Parcel',
                        tierOptions: [],
                        selectedSKU: '',
                        onSKUChange: () => {},
                        volumeCount: billPayYesNo,
                        onVolumeChange: () => {},
                        monthlyCost: billPayMonthlyCost,
                        annualCost: billPayAnnualCost,
                      },
                      {
                        productType: 'Locations',
                        pricingModel: 'infrastructureLocations',
                        planDescription: locationsPlan && locationsPlan.isCustomPricing
                          ? '❗ Volume exceeds max tier - Custom Pricing Required'
                          : locationsPlan
                          ? `${locationsPlan.tier} (Range: ${locationsPlan.rangeStart}–${locationsPlan.rangeEnd})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.Locations.annual
                            : skuData.Locations.monthly,
                        selectedSKU: locationsSKU,
                        onSKUChange: val => {
                          setLocationsSKU(val);
                          setLocationsOverride(true);
                        },
                        volumeCount: locationsVolume,
                        onVolumeChange: e =>
                          setLocationsVolume(Number(e.target.value) || 0),
                        monthlyCost: locationsAnnualCost / 12,
                        annualCost: locationsAnnualCost,
                        isCustomPricing: locationsPlan && locationsPlan.isCustomPricing,
                      },
                      {
                        productType: 'Support Package',
                        pricingModel: 'infrastructureSupport',
                        planDescription: supportPackagePlan && supportPackagePlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : supportPackagePlan
                          ? `${supportPackagePlan.tier} (Range: ${
                              supportPackagePlan.rangeStart
                            }–${
                              supportPackagePlan.rangeEnd === Infinity
                                ? '+'
                                : supportPackagePlan.rangeEnd
                            })`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.Support.annual
                            : skuData.Support.monthly,
                        selectedSKU: supportPackageSKU,
                        onSKUChange: val => {
                          setSupportPackageSKU(val);
                          setSupportPackageOverride(true);
                        },
                        volumeCount: supportPackageVolume,
                        onVolumeChange: e =>
                          setSupportPackageVolume(Number(e.target.value) || 0),
                        monthlyCost: supportPackageCostAnnual / 12,
                        annualCost: supportPackageCostAnnual,
                        isCustomPricing: supportPackagePlan && supportPackagePlan.isCustomPricing,
                      },
                      {
                        productType: 'Vendor Portals',
                        pricingModel: 'portalBased',
                        planDescription:
                          subBilling === 'annual'
                            ? '$20/portal/month'
                            : '$30/portal/month',
                        tierOptions: [],
                        selectedSKU: '',
                        onSKUChange: () => {},
                        volumeCount: vendorPortalCount,
                        onVolumeChange: e =>
                          setVendorPortalCount(Number(e.target.value) || 0),
                        monthlyCost: vendorMonthlyCost,
                        annualCost: vendorAnnualCost,
                      },
                      {
                        productType: 'Auditing Module',
                        pricingModel: 'carrierBased',
                        planDescription: auditingPlan && auditingPlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : auditingPlan
                          ? `${auditingPlan.tier} (Range: ${
                              auditingPlan.range[0]
                            }–${
                              auditingPlan.range[1] === Infinity
                                ? '+'
                                : auditingPlan.range[1]
                            })`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.Auditing.annual
                            : skuData.Auditing.monthly,
                        selectedSKU: auditingSKU,
                        onSKUChange: val => {
                          setAuditingSKU(val);
                          setAuditingOverride(true);
                        },
                        volumeCount: auditingVolume,
                        onVolumeChange: e =>
                          setAuditingVolume(Number(e.target.value) || 0),
                        monthlyCost: auditingAnnualCost / 12,
                        annualCost: auditingAnnualCost,
                        isCustomPricing: auditingPlan && auditingPlan.isCustomPricing,
                      },
                      {
                        productType: 'Fleet Route Optimization',
                        pricingModel: 'stopBased',
                        planDescription: fleetRoutePlan && fleetRoutePlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : fleetRoutePlan
                          ? `${fleetRoutePlan.tier} (Range: ${fleetRoutePlan.range[0]}–${fleetRoutePlan.range[1]})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.FleetRoute.annual
                            : skuData.FleetRoute.monthly,
                        selectedSKU: fleetRouteSKU,
                        onSKUChange: val => {
                          setFleetRouteSKU(val);
                          setFleetRouteOverride(true);
                        },
                        volumeCount: fleetRouteVolume,
                        onVolumeChange: e =>
                          setFleetRouteVolume(Number(e.target.value) || 0),
                        monthlyCost: fleetRouteEffectiveAnnual / 12,
                        annualCost: fleetRouteEffectiveAnnual,
                        isCustomPricing: fleetRoutePlan && fleetRoutePlan.isCustomPricing,
                      },
                      {
                        productType: 'Yard Management',
                        pricingModel: 'yardManagement',
                        planDescription: `Per facility: $${
                          subBilling === 'annual' ? '100' : '130'
                        } / per asset: $${
                          subBilling === 'annual' ? '10' : '13'
                        }`,
                        tierOptions: [],
                        renderVolumeInput: () => (
                          <div>
                            <input
                              type='number'
                              value={assetManagementFacilities}
                              onChange={e =>
                                setAssetManagementFacilities(
                                  Number(e.target.value) || 0
                                )
                              }
                              style={{ ...inputStyle, width: '60px' }}
                              placeholder='Fac.'
                            />
                            <input
                              type='number'
                              value={assetManagementAssets}
                              onChange={e =>
                                setAssetManagementAssets(
                                  Number(e.target.value) || 0
                                )
                              }
                              style={{ ...inputStyle, width: '60px' }}
                              placeholder='Assets'
                            />
                          </div>
                        ),
                        monthlyCost: assetManagementMonthlyCost,
                        annualCost: assetManagementAnnualCost,
                        lineMarkup: assetManagementMarkup,
                        setLineMarkup: setAssetManagementMarkup,
                      },
                      {
                        productType: 'Dock Scheduling',
                        pricingModel: 'dockBased',
                        planDescription: dockSchedulingPlan && dockSchedulingPlan.isCustomPricing
                          ? '❗ Volume exceeds tier limits - Custom Pricing Required'
                          : dockSchedulingPlan
                          ? `${dockSchedulingPlan.tier} (Range: ${
                              dockSchedulingPlan.rangeStart
                            }–${
                              dockSchedulingPlan.rangeEnd === Infinity
                                ? '+'
                                : dockSchedulingPlan.rangeEnd
                            })`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? skuData.DockScheduling.annual
                            : skuData.DockScheduling.monthly,
                        selectedSKU: dockSchedulingSKU,
                        onSKUChange: val => {
                          setDockSchedulingSKU(val);
                          setDockSchedulingOverride(true);
                        },
                        volumeCount: dockSchedulingVolume,
                        onVolumeChange: e =>
                          setDockSchedulingVolume(Number(e.target.value) || 0),
                        monthlyCost: dockSchedulingAnnualCost / 12,
                        annualCost: dockSchedulingAnnualCost,
                        isCustomPricing: dockSchedulingPlan && dockSchedulingPlan.isCustomPricing,
                      },
                      {
                        productType: 'WMS',
                        pricingModel: 'wmsBased',
                        planDescription: subBilling === 'annual' 
                          ? `$12,000 first warehouse + $6,000 per additional`
                          : 'Annual Only',
                        tierOptions: [],
                        volumeCount: wmsVolume,
                        onVolumeChange: e => setWmsVolume(Number(e.target.value) || 0),
                        monthlyCost: wmsAnnualCost / 12,
                        annualCost: wmsAnnualCost,
                        tooltip: '💡 First warehouse: $12,000/year, each additional: $6,000/year. Add implementation fees manually as one-time costs.',
                      },
                      {
                        productType: 'FreightPOP AI Agent',
                        pricingModel: 'aiAgentBased',
                        planDescription: (() => {
                          if (subBilling !== 'annual') return 'Annual Only';
                          if (aiAgentTotalVolume === 0) return 'Select products to calculate tokens';
                          
                          // Find tier range based on volume
                          const tierRanges = [
                            { min: 0, max: 250, tokens: '50M', cost: '$3,000' },
                            { min: 251, max: 500, tokens: '100M', cost: '$6,000' },
                            { min: 501, max: 1000, tokens: '200M', cost: '$12,000' },
                            { min: 1001, max: 1500, tokens: '300M', cost: '$18,000' },
                            { min: 1501, max: 2000, tokens: '400M', cost: '$24,000' },
                            { min: 2001, max: 3000, tokens: '600M', cost: '$36,000' },
                            { min: 3001, max: 4000, tokens: '800M', cost: '$48,000' },
                            { min: 4001, max: 5000, tokens: '1B', cost: '$60,000' },
                          ];
                          
                          const tier = tierRanges.find(t => aiAgentTotalVolume >= t.min && aiAgentTotalVolume <= t.max);
                          if (!tier) return 'Select products to calculate tokens';
                          
                          return `${tier.min}-${tier.max} Shipments Incl: ${tier.tokens} tokens`;
                        })(),
                        tierOptions: [],
                        volumeCount: aiAgentTotalVolume,
                        onVolumeChange: null, // Read-only, calculated from other products
                        monthlyCost: aiAgentAnnualCost / 12,
                        annualCost: aiAgentAnnualCost,
                        tooltip: (() => {
                          const selected = [];
                          if (aiAgentIncludesFreight) selected.push(`Freight (${freightVolume.toLocaleString()})`);
                          if (aiAgentIncludesParcel) selected.push(`Parcel (${parcelVolume.toLocaleString()})`);
                          if (aiAgentIncludesOcean) selected.push(`Ocean (${oceanTrackingVolume.toLocaleString()})`);
                          
                          if (selected.length === 0) return '💡 Select products below to calculate token allocation';
                          
                          const formatTokens = (tokens) => {
                            if (tokens >= 1000000000) return `${tokens / 1000000000}B`;
                            return `${tokens / 1000000}M`;
                          };
                          
                          return `💡 Selected: ${selected.join(' + ')} → Total: ${aiAgentTotalVolume.toLocaleString()} → ${formatTokens(aiAgentTokens)} tokens`;
                        })(),
                        isDisabled: freightVolume === 0 && parcelVolume === 0 && oceanTrackingVolume === 0,
                        showCheckbox: true,
                        isChecked: aiAgentTotalVolume > 0,
                        onCheckboxChange: null, // No longer needed - checkboxes control this automatically
                      },
                    ];
                    
                    // Apply search and model filters
                    const filteredRows = productRows.filter(row => {
                      // Search filter
                      const matchesSearch = searchTerm.trim() === '' || 
                        row.productType.toLowerCase().includes(searchTerm.toLowerCase());
                      
                      // Model filter
                      const matchesModel = selectedModels.includes(row.pricingModel);
                      
                      return matchesSearch && matchesModel;
                    });
                    
                    // Group by pricing model if selected
                    if (groupBy === 'pricingModel') {
                      const grouped = {};
                      filteredRows.forEach(row => {
                        if (!grouped[row.pricingModel]) {
                          grouped[row.pricingModel] = [];
                        }
                        grouped[row.pricingModel].push(row);
                      });
                      
                      return Object.values(pricingModels)
                        .sort((a, b) => a.order - b.order)
                        .map(model => {
                          const modelProducts = grouped[model.id] || [];
                          if (modelProducts.length === 0) return null;
                          
                          return (
                            <React.Fragment key={model.id}>
                              <tr style={{ background: `${model.color}10` }}>
                                <td colSpan={5} style={{ padding: '16px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '24px' }}>{model.icon}</span>
                                    <div>
                                      <div style={{ fontWeight: '700', fontSize: '16px', color: model.color }}>
                                        {model.name}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        {model.description}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {modelProducts.map((row, idx) => (
                                <tr key={`${model.id}-${idx}`}>
                                  <td style={{ ...tableTdStyle, ...firstColumnStyle }}>
                                    {row.productType}
                                  </td>
                                  <td style={tableTdStyle}>{row.planDescription}</td>
                                  <td style={tableTdStyle}>
                                    {row.productType === 'Yard Management' ? (
                                      row.renderVolumeInput ? (
                                        row.renderVolumeInput()
                                      ) : null
                                    ) : row.productType === 'Bill Pay' ? (
                                      <select
                                        value={billPayYesNo}
                                        onChange={e => setBillPayYesNo(e.target.value)}
                                        style={selectStyle}
                                      >
                                        <option value='No'>No</option>
                                        <option value='Yes'>Yes</option>
                                      </select>
                                    ) : row.productType === 'FreightPOP AI Agent' ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                                        <ProductCheckbox
                                          checked={aiAgentIncludesFreight}
                                          disabled={freightVolume === 0}
                                          onChange={(checked) => setProductValue('aiAgent', 'includesFreight', checked)}
                                          label="Freight"
                                          volume={freightVolume}
                                        />
                                        
                                        <ProductCheckbox
                                          checked={aiAgentIncludesParcel}
                                          disabled={parcelVolume === 0}
                                          onChange={(checked) => setProductValue('aiAgent', 'includesParcel', checked)}
                                          label="Parcel"
                                          volume={parcelVolume}
                                        />
                                        
                                        <ProductCheckbox
                                          checked={aiAgentIncludesOcean}
                                          disabled={oceanTrackingVolume === 0}
                                          onChange={(checked) => setProductValue('aiAgent', 'includesOcean', checked)}
                                          label="Ocean"
                                          volume={oceanTrackingVolume}
                                        />
                                        
                                        {aiAgentTotalVolume > 0 && (
                                          <div style={{ 
                                            marginTop: '8px', 
                                            paddingTop: '8px', 
                                            borderTop: '1px solid #e2e8f0',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#1e293b'
                                          }}>
                                            Total: {aiAgentTotalVolume.toLocaleString()} shipments → {
                                              aiAgentTokens >= 1000000000 
                                                ? `${aiAgentTokens / 1000000000}B` 
                                                : `${aiAgentTokens / 1000000}M`
                                            } tokens
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <input
                                        type='number'
                                        value={row.volumeCount}
                                        onChange={e => row.onVolumeChange(e)}
                                        style={inputStyle}
                                        disabled={row.onVolumeChange === null}
                                      />
                                    )}
                                  </td>
                                  <td style={tableTdStyle}>
                                    {formatCost(row.monthlyCost)}
                                  </td>
                                  <td style={tableTdStyle}>
                                    {formatCost(row.annualCost)}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        }).filter(Boolean);
                    }
                    
                    // Default: show all products ungrouped
                    return filteredRows.map((row, idx) => (
                      <tr key={idx} style={row.isCustomPricing ? customPricingRowStyle : {}}>
                        <td style={{ ...tableTdStyle, ...firstColumnStyle }}>
                          {row.productType}
                        </td>
                        <td style={{ ...tableTdStyle, ...(row.isCustomPricing ? customPricingTextStyle : {}) }}>
                          {row.planDescription}
                        </td>
                        <td style={tableTdStyle}>
                          {row.productType === 'Yard Management' ? (
                            row.renderVolumeInput ? (
                              row.renderVolumeInput()
                            ) : null
                          ) : row.productType === 'Bill Pay' ? (
                            <select
                              value={billPayYesNo}
                              onChange={e => setBillPayYesNo(e.target.value)}
                              style={selectStyle}
                            >
                              <option value='No'>No</option>
                              <option value='Yes'>Yes</option>
                            </select>
                          ) : row.productType === 'FreightPOP AI Agent' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                              <ProductCheckbox
                                checked={aiAgentIncludesFreight}
                                disabled={freightVolume === 0}
                                onChange={(checked) => setProductValue('aiAgent', 'includesFreight', checked)}
                                label="Freight"
                                volume={freightVolume}
                              />
                              
                              <ProductCheckbox
                                checked={aiAgentIncludesParcel}
                                disabled={parcelVolume === 0}
                                onChange={(checked) => setProductValue('aiAgent', 'includesParcel', checked)}
                                label="Parcel"
                                volume={parcelVolume}
                              />
                              
                              <ProductCheckbox
                                checked={aiAgentIncludesOcean}
                                disabled={oceanTrackingVolume === 0}
                                onChange={(checked) => setProductValue('aiAgent', 'includesOcean', checked)}
                                label="Ocean"
                                volume={oceanTrackingVolume}
                              />
                              
                              {aiAgentTotalVolume > 0 && (
                                <div style={{ 
                                  marginTop: '8px', 
                                  paddingTop: '8px', 
                                  borderTop: '1px solid #e2e8f0',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#1e293b'
                                }}>
                                  Total: {aiAgentTotalVolume.toLocaleString()} shipments → {
                                    aiAgentTokens >= 1000000000 
                                      ? `${aiAgentTokens / 1000000000}B` 
                                      : `${aiAgentTokens / 1000000}M`
                                  } tokens
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type='number'
                              value={row.volumeCount}
                              onChange={e => row.onVolumeChange(e)}
                              style={row.isCustomPricing ? customPricingInputStyle : inputStyle}
                            />
                          )}
                        </td>
                        <td style={{ ...tableTdStyle, ...(row.isCustomPricing ? customPricingTextStyle : {}) }}>
                          {row.isCustomPricing ? 'Request Quote' : formatCost(row.monthlyCost)}
                        </td>
                        <td style={{ ...tableTdStyle, ...(row.isCustomPricing ? customPricingTextStyle : {}) }}>
                          {row.isCustomPricing ? 'Request Quote' : formatCost(row.annualCost)}
                        </td>
                      </tr>
                    ));
                    })()}
                  </tbody>
                </table>
                </div>
              </CardContent>
            </Card>

            {/* One-Time Costs Table */}
            <Card>
              <CardHeader>
                <CardTitle>💰 Setup & Implementation Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{ fontSize: '18px' }}>ℹ️</span>
                  <span style={{ fontSize: '13px', color: '#78350f', fontWeight: '500' }}>
                    Add custom one-time costs for implementation, setup, integration, or training
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                    }}
                  >
                    <thead style={stickyHeaderStyle}>
                      <tr>
                        <th style={tableThStyle}>NAME</th>
                        <th style={tableThStyle}>DESCRIPTION</th>
                        <th style={tableThStyle}>AMOUNT</th>
                        <th style={tableThStyle}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oneTimeCosts.map((item, index) => (
                        <tr key={index}>
                          <td style={tableTdStyle}>
                            <input
                              type='text'
                              value={item.name}
                              onChange={e => {
                                const clone = [...oneTimeCosts];
                                clone[index].name = e.target.value;
                                setOneTimeCosts(clone);
                              }}
                              style={{ 
                                width: '100%',
                                maxWidth: '160px',
                                ...inputStyle
                              }}
                              placeholder="e.g., Setup Fee"
                            />
                          </td>
                          <td style={tableTdStyle}>
                            <input
                              type='text'
                              value={item.description}
                              onChange={e => {
                                const clone = [...oneTimeCosts];
                                clone[index].description = e.target.value;
                                setOneTimeCosts(clone);
                              }}
                              style={{ 
                                width: '100%',
                                maxWidth: '300px',
                                ...inputStyle
                              }}
                              placeholder="Detailed description"
                            />
                          </td>
                          <td style={tableTdStyle}>
                            <input
                              type='number'
                              value={item.amount}
                              onChange={e => {
                                const clone = [...oneTimeCosts];
                                clone[index].amount = Number(e.target.value);
                                setOneTimeCosts(clone);
                              }}
                              style={{ 
                                width: '100%',
                                maxWidth: '120px',
                                ...inputStyle
                              }}
                              placeholder="0.00"
                            />
                          </td>
                          <td style={tableTdStyle}>
                            <button
                              onClick={() =>
                                setOneTimeCosts(
                                  oneTimeCosts.filter((_, i) => i !== index)
                                )
                              }
                              style={{
                                padding: '8px 16px',
                                background: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                              }}
                            >
                              🗑️ Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {oneTimeCosts.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{
                            ...tableTdStyle,
                            textAlign: 'center',
                            padding: '28px',
                            color: '#64748b',
                            fontStyle: 'italic',
                            fontSize: '13px',
                          }}>
                            No one-time costs added yet. Click the button below to add your first item.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ 
                  marginTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}>
                  <button
                    onClick={() =>
                      setOneTimeCosts([
                        ...oneTimeCosts,
                        { name: '', description: '', amount: 0 },
                      ])
                    }
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#059669',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(5, 150, 105, 0.3)',
                    }}
                  >
                    ➕ Add One-Time Cost
                  </button>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}>
                    <span style={{ marginRight: '10px', color: '#64748b' }}>Total One-Time:</span>
                    <span style={{ 
                      fontSize: '18px',
                      color: '#334155',
                      background: '#e2e8f0',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontWeight: '700',
                    }}>
                      {formatCost(finalOneTimeCost)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Section */}
            <Card>
              <CardContent>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ marginRight: '20px' }}>
                      <label style={{ marginRight: '10px' }}>
                        Company Name:
                      </label>
                      <input
                        type='text'
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ marginRight: '10px' }}>Rep Name:</label>
                      <input
                        type='text'
                        value={repName}
                        onChange={e => setRepName(e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <label style={{ marginRight: '10px' }}>Date:</label>
                      <input
                        type='date'
                        value={downloadDate}
                        onChange={e => setDownloadDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={downloadPageAsPNG}
                    style={{
                      padding: '10px',
                      background: '#ff5722',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    Download Entire Page as PNG
                  </button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Floating Control Panel */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          background: 'rgba(255,255,255,0.98)',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1001,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <button
          onClick={() => setEditingAllMarkups(!editingAllMarkups)}
          style={{
            padding: '10px 20px',
            background: editingAllMarkups
              ? '#7c3aed'
              : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {editingAllMarkups ? '💾 Save Markups' : '📊 Edit Markups'}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            background: '#f59e0b',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          🔄 Reset All
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleScreenshotUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '10px 20px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          📷 Parse Screenshot
        </button>
        <button
          onClick={() => setShowCustomerView(!showCustomerView)}
          style={{
            padding: '10px 20px',
            background: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {showCustomerView ? '📋 Show Detailed' : '👤 Customer View'}
        </button>
      </div>

      {/* Screenshot Parse Modal */}
      <ScreenshotParseModal
        isOpen={showScreenshotModal}
        onClose={() => {
          setShowScreenshotModal(false);
          setScreenshotData(null);
          setScreenshotError(null);
        }}
        parsedData={screenshotData}
        isLoading={isParsingScreenshot}
        error={screenshotError}
        onApply={applyScreenshotData}
        onRetry={handleRetryScreenshot}
        onPaste={handlePaste}
      />
    </>
  );
};

export default App;

