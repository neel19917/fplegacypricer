import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { productConfig, pricingModels, getPricingModelsWithProducts } from './productConfig';
import { APP_VERSION } from './version';
import ProductCheckbox from './components/ProductCheckbox';
import ScreenshotParseModal from './components/ScreenshotParseModal';
import LoginScreen from './components/LoginScreen';
import QuoteDashboard from './components/QuoteDashboard';
import ShareQuoteModal from './components/ShareQuoteModal';
import ApprovalView from './components/ApprovalView';
import SKUAdminPanel from './components/SKUAdminPanel';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useSupabasePricing } from './hooks/useSupabasePricing';
import { useQuotes, isValidHubSpotUrl } from './hooks/useQuotes';
import { isSupabaseConfigured } from './supabaseConfig';
import { fetchUserProfileByEmail, isSuperAdmin } from './utils/permissions';
import {
  loadDefaultPricing,
} from './utils/jsonHelpers';
import { safeGetSession, safeSetSession, safeRemoveSession } from './utils/storage';
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

const FixedHeader = ({ onLogout, user, onOpenDashboard, onOpenAdmin, showAdminButton, hasUnsavedChanges, saveStatus, splitView, onToggleSplitView }) => (
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Quote Dashboard Button */}
      {onOpenDashboard && (
        <button
          onClick={onOpenDashboard}
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '500',
            color: 'white',
            background: '#10b981',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => e.target.style.background = '#059669'}
          onMouseOut={(e) => e.target.style.background = '#10b981'}
        >
          📋 Quotes
        </button>
      )}
      {/* Admin Panel Button (Super Admin only) */}
      {showAdminButton && onOpenAdmin && (
        <button
          onClick={onOpenAdmin}
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '500',
            color: 'white',
            background: '#f59e0b',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => e.target.style.background = '#d97706'}
          onMouseOut={(e) => e.target.style.background = '#f59e0b'}
        >
          ⚙️ Pricing
        </button>
      )}
      {/* Split View Toggle */}
      {onToggleSplitView && (
        <button
          onClick={onToggleSplitView}
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: '500',
            color: 'white',
            background: splitView ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)',
            border: splitView ? '1px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.background = splitView ? '#7c3aed' : 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = splitView ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)';
          }}
          title={splitView ? 'Switch to single column view' : 'Switch to split view (side-by-side)'}
        >
          {splitView ? '📑 Split' : '📄 Single'}
        </button>
      )}
      {/* Save Status Indicator */}
      <div style={{
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '500',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...(saveStatus === 'saving' && {
          color: '#fef3c7',
          background: 'rgba(245, 158, 11, 0.3)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
        }),
        ...(saveStatus === 'saved' && !hasUnsavedChanges && {
          color: '#d1fae5',
          background: 'rgba(16, 185, 129, 0.3)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
        }),
        ...(hasUnsavedChanges && saveStatus !== 'saving' && {
          color: '#fef3c7',
          background: 'rgba(245, 158, 11, 0.3)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
        }),
        ...(!hasUnsavedChanges && saveStatus === 'idle' && {
          color: 'rgba(255, 255, 255, 0.6)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }),
      }}>
        {saveStatus === 'saving' && '⏳ Saving...'}
        {saveStatus === 'saved' && !hasUnsavedChanges && '✅ Saved'}
        {hasUnsavedChanges && saveStatus !== 'saving' && '⚠️ Unsaved'}
        {!hasUnsavedChanges && saveStatus === 'idle' && '💾 Ready'}
      </div>
      {user && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '6px 16px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '14px',
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
      </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>{user.name || 'Admin'}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>{user.email || 'Local Access'}</div>
          </div>
        </div>
      )}
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
  // Supabase Authentication (Microsoft OAuth only)
  const supabaseAuth = useSupabaseAuth();
  const supabaseConfigured = isSupabaseConfigured();
  
  // Authentication status
  const isAuthenticated = supabaseAuth.isAuthenticated;
  const currentUser = supabaseAuth.user;
  
  // === USER PROFILE & PERMISSIONS ===
  const [userProfile, setUserProfile] = useState(null);
  
  // === MODAL STATE ===
  const [showQuoteDashboard, setShowQuoteDashboard] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSKUAdmin, setShowSKUAdmin] = useState(false);
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [currentQuoteNumber, setCurrentQuoteNumber] = useState(null);
  
  // === LAYOUT STATE ===
  const [splitView, setSplitView] = useState(() => {
    // Load from localStorage, default to false
    const saved = localStorage.getItem('freightpop_splitView');
    return saved === 'true';
  });
  
  // === QUOTE SAVE STATE ===
  const [hubspotDealUrl, setHubspotDealUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationAction, setPendingNavigationAction] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef(null);
  
  // === QUOTES HOOK ===
  const { saveQuote, updateQuote } = useQuotes();
  
  // === SUPABASE PRICING HOOK ===
  const { 
    skuData: supabaseSkuData, 
    isLoading: isSupabasePricingLoading, 
    source: pricingSource,
    reload: reloadPricing 
  } = useSupabasePricing();
  
  // Load user profile when authenticated
  useEffect(() => {
    async function loadUserProfile() {
      if (currentUser?.email) {
        const profile = await fetchUserProfileByEmail(currentUser.email);
        setUserProfile(profile);
        console.log('[App] User profile loaded:', profile?.user_type || 'No profile');
      }
    }
    loadUserProfile();
  }, [currentUser?.email]);
  
  // Update SKU data when Supabase pricing loads
  useEffect(() => {
    if (supabaseSkuData) {
      setSKUData(supabaseSkuData);
      console.log(`✅ Using pricing from ${pricingSource || 'unknown source'}`);
      setIsLoadingPricing(false);
    }
  }, [supabaseSkuData, pricingSource]);
  
  // Fallback: Load pricing data from JSON on mount if Supabase fails
  useEffect(() => {
    async function initializePricing() {
      // Wait a bit for Supabase to load
      if (isSupabasePricingLoading) return;
      
      // If Supabase didn't provide data, try JSON fallback
      if (!supabaseSkuData) {
      const csvData = await loadDefaultPricing();
      
      if (csvData) {
        setSKUData(csvData);
          console.log('✅ Using pricing from JSON fallback');
      } else {
          console.log('⚠️ Using hardcoded SKUs');
      }
      setIsLoadingPricing(false);
      }
    }
    
    initializePricing();
  }, [isSupabasePricingLoading, supabaseSkuData]);

  const handleLogout = () => {
    console.log('[Auth] 🚪 Logging out');
    supabaseAuth.signOut();
    console.log('[Auth] ✅ Logout complete');
  };

  // Toggle split view and persist to localStorage
  const handleToggleSplitView = () => {
    setSplitView(prev => {
      const newValue = !prev;
      localStorage.setItem('freightpop_splitView', String(newValue));
      return newValue;
    });
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
  const [freightCustomPricingAlertShown, setFreightCustomPricingAlertShown] = useState(false);
  const [parcelCustomPricingAlertShown, setParcelCustomPricingAlertShown] = useState(false);
  const [oceanTrackingCustomPricingAlertShown, setOceanTrackingCustomPricingAlertShown] = useState(false);
  const [locationsCustomPricingAlertShown, setLocationsCustomPricingAlertShown] = useState(false);
  const [supportPackageCustomPricingAlertShown, setSupportPackageCustomPricingAlertShown] = useState(false);
  const [auditingCustomPricingAlertShown, setAuditingCustomPricingAlertShown] = useState(false);
  const [fleetRouteCustomPricingAlertShown, setFleetRouteCustomPricingAlertShown] = useState(false);
  const [dockSchedulingCustomPricingAlertShown, setDockSchedulingCustomPricingAlertShown] = useState(false);

  // === PRODUCT STATE MANAGEMENT (NEW HOOK) ===
  const {
    products,
    getProductValue,
    setProductValue,
    setProductInput,
    resetAllProducts,
    loadProducts,
  } = useProductState();

  // Diagnostic: Log storage status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        console.log('[App] localStorage is available and working');
      } catch (e) {
        console.warn('[App] localStorage is not available:', e.name, e.message);
      }
    }
  }, []);

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

  // AI Agent - Simple dropdown selection for token tier
  const aiAgentEnabled = getProductValue('aiAgent', 'enabled');
  const aiAgentMarkup = getProductValue('aiAgent', 'markup');
  const aiAgentSelectedTier = getProductValue('aiAgent', 'selectedTier') ?? '';
  
  // AI Agent token tiers - simple dropdown selection
  const aiAgentTiers = [
    { id: '50m', name: '50M Tokens', tokens: 50000000, annualCost: 3000, monthlyCost: 250 },
    { id: '100m', name: '100M Tokens', tokens: 100000000, annualCost: 6000, monthlyCost: 500 },
    { id: '200m', name: '200M Tokens', tokens: 200000000, annualCost: 12000, monthlyCost: 1000 },
    { id: '300m', name: '300M Tokens', tokens: 300000000, annualCost: 18000, monthlyCost: 1500 },
    { id: '400m', name: '400M Tokens', tokens: 400000000, annualCost: 24000, monthlyCost: 2000 },
    { id: '600m', name: '600M Tokens', tokens: 600000000, annualCost: 36000, monthlyCost: 3000 },
    { id: '800m', name: '800M Tokens', tokens: 800000000, annualCost: 48000, monthlyCost: 4000 },
    { id: '1b', name: '1B Tokens', tokens: 1000000000, annualCost: 60000, monthlyCost: 5000 },
    { id: 'custom', name: 'Custom Pricing (1B+)', tokens: 0, annualCost: 0, monthlyCost: 0, isCustom: true },
  ];
  
  // Get selected tier details
  const aiAgentCurrentTier = aiAgentTiers.find(t => t.id === aiAgentSelectedTier);
  const aiAgentIsCustomPricing = aiAgentCurrentTier?.isCustom ?? false;


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

  // Alert user when Freight volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (freightPlan && freightPlan.isCustomPricing && !freightCustomPricingAlertShown && freightVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nCore TMS – Freight volume (${freightVolume.toLocaleString()} shipments) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setFreightCustomPricingAlertShown(true);
    } else if (!freightPlan || !freightPlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setFreightCustomPricingAlertShown(false);
    }
  }, [freightPlan, freightVolume, freightCustomPricingAlertShown]);

  // Alert user when Parcel volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (parcelPlan && parcelPlan.isCustomPricing && !parcelCustomPricingAlertShown && parcelVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nCore TMS – Parcel volume (${parcelVolume.toLocaleString()} shipments) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setParcelCustomPricingAlertShown(true);
    } else if (!parcelPlan || !parcelPlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setParcelCustomPricingAlertShown(false);
    }
  }, [parcelPlan, parcelVolume, parcelCustomPricingAlertShown]);

  // Alert user when Ocean Tracking volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (oceanTrackingPlan && oceanTrackingPlan.isCustomPricing && !oceanTrackingCustomPricingAlertShown && oceanTrackingVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nOcean Tracking volume (${oceanTrackingVolume.toLocaleString()} shipments) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setOceanTrackingCustomPricingAlertShown(true);
    } else if (!oceanTrackingPlan || !oceanTrackingPlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setOceanTrackingCustomPricingAlertShown(false);
    }
  }, [oceanTrackingPlan, oceanTrackingVolume, oceanTrackingCustomPricingAlertShown]);

  // Alert user when Locations volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (locationsPlan && locationsPlan.isCustomPricing && !locationsCustomPricingAlertShown && locationsVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nLocations volume (${locationsVolume.toLocaleString()} locations) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setLocationsCustomPricingAlertShown(true);
    } else if (!locationsPlan || !locationsPlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setLocationsCustomPricingAlertShown(false);
    }
  }, [locationsPlan, locationsVolume, locationsCustomPricingAlertShown]);

  // Alert user when Support Package volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (supportPackagePlan && supportPackagePlan.isCustomPricing && !supportPackageCustomPricingAlertShown && supportPackageVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nSupport Package volume (${supportPackageVolume.toLocaleString()} hours) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setSupportPackageCustomPricingAlertShown(true);
    } else if (!supportPackagePlan || !supportPackagePlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setSupportPackageCustomPricingAlertShown(false);
    }
  }, [supportPackagePlan, supportPackageVolume, supportPackageCustomPricingAlertShown]);

  // Alert user when Auditing Module volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (auditingPlan && auditingPlan.isCustomPricing && !auditingCustomPricingAlertShown && auditingVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nAuditing Module volume (${auditingVolume.toLocaleString()} carriers) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setAuditingCustomPricingAlertShown(true);
    } else if (!auditingPlan || !auditingPlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setAuditingCustomPricingAlertShown(false);
    }
  }, [auditingPlan, auditingVolume, auditingCustomPricingAlertShown]);

  // Alert user when Fleet Route Optimization volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (fleetRoutePlan && fleetRoutePlan.isCustomPricing && !fleetRouteCustomPricingAlertShown && fleetRouteVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nFleet Route Optimization volume (${fleetRouteVolume.toLocaleString()} stops) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setFleetRouteCustomPricingAlertShown(true);
    } else if (!fleetRoutePlan || !fleetRoutePlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setFleetRouteCustomPricingAlertShown(false);
    }
  }, [fleetRoutePlan, fleetRouteVolume, fleetRouteCustomPricingAlertShown]);

  // Alert user when Dock Scheduling volume exceeds max tier (custom pricing required)
  useEffect(() => {
    if (dockSchedulingPlan && dockSchedulingPlan.isCustomPricing && !dockSchedulingCustomPricingAlertShown && dockSchedulingVolume > 0) {
      alert(`⚠️ Volume Exceeds Maximum Tier\n\nDock Scheduling volume (${dockSchedulingVolume.toLocaleString()} docks) exceeds the maximum standard tier. Custom pricing is required. Please contact management for a custom quote.`);
      setDockSchedulingCustomPricingAlertShown(true);
    } else if (!dockSchedulingPlan || !dockSchedulingPlan.isCustomPricing) {
      // Reset alert flag when volume is within tier limits
      setDockSchedulingCustomPricingAlertShown(false);
    }
  }, [dockSchedulingPlan, dockSchedulingVolume, dockSchedulingCustomPricingAlertShown]);

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

  // AI Agent Costs - Based on selected tier (annual only)
  const aiAgentSubscriptionCost = (() => {
    if (subBilling !== 'annual' || !aiAgentSelectedTier || aiAgentIsCustomPricing) return 0;
    return aiAgentCurrentTier?.annualCost ?? 0;
  })();
  const aiAgentAnnualCost = aiAgentSubscriptionCost * (1 + aiAgentMarkup / 100);
  
  // Get token allocation for AI Agent
  const aiAgentTokens = aiAgentCurrentTier?.tokens ?? 0;

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

  // === One-Time Costs: Start with empty array (no defaults) ===
  // Users can add their own costs using the "Add One-Time Cost" button
  // (Default costs removed to prevent pre-filled values)

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
  const performReset = () => {
    resetAllProducts();
    setGlobalMarkup(0);
    setMinSubscription(20000);
    setOneTimeMarkup(0);
    setOneTimeCosts([]);
    setSubBilling('annual');
    setCompanyName('');
    setHubspotDealUrl('');
    setCurrentQuoteId(null);
    setCurrentQuoteNumber(null);
    setHasUnsavedChanges(false);
    lastSavedDataRef.current = null;
    setSaveStatus('idle');
    setLastSaveTime(null);
  };

  const handleReset = () => {
    if (hasUnsavedChanges) {
      setPendingNavigationAction(() => performReset);
      setShowUnsavedModal(true);
    } else {
      performReset();
    }
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
        // Check if customer was discounted below sticker (our cost)
        if (product.isDiscountedBelowSticker) {
          // Customer price is below our cost - this requires contractual uplift
          // Set a negative markup to indicate discount below sticker
          const requiredMarkup = calculateRequiredMarkup(product.ourCost, product.customerPrice);
          setProductValue(product.productId, 'markup', requiredMarkup);
          console.warn(`⚠️ ${product.productName}: Customer price ($${product.customerPrice.toFixed(2)}) is below sticker ($${product.ourCost.toFixed(2)}) - Contractual uplift required`);
        } else {
          const requiredMarkup = calculateRequiredMarkup(product.ourCost, product.customerPrice);
          if (Math.abs(requiredMarkup) > 0.01) {
            // Only set markup if there's a meaningful difference
            setProductValue(product.productId, 'markup', requiredMarkup);
          }
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

  // === HANDLER FOR LOADING QUOTES ===
  // NOTE: All hooks must be defined before any early returns to follow React hooks rules
  const handleLoadQuote = useCallback((quoteData) => {
    console.log('[App] Loading quote:', quoteData.quoteNumber);
    
    // Set basic quote info
    setCompanyName(quoteData.companyName || '');
    setCurrentQuoteNumber(quoteData.quoteNumber);
    setHubspotDealUrl(quoteData.hubspotDealUrl || '');
    
    // Set billing frequency
    if (quoteData.billingFrequency) {
      setSubBilling(quoteData.billingFrequency.toLowerCase() === 'monthly' ? 'monthly' : 'annual');
    }
    
    // Restore product state from quote data
    if (quoteData.pricingData) {
      console.log('[App] Restoring quote pricing data:', quoteData.pricingData);
      
      // If products are stored in the quote, restore them
      if (quoteData.pricingData.products) {
        loadProducts(quoteData.pricingData.products);
      }
      
      // Restore one-time costs if they exist
      if (quoteData.pricingData.oneTimeCosts) {
        setOneTimeCosts(quoteData.pricingData.oneTimeCosts);
      }
      
      // Restore min subscription if stored
      if (quoteData.pricingData.minSubscription) {
        setMinSubscription(quoteData.pricingData.minSubscription);
      }
      
      // Restore global markup if stored  
      if (quoteData.pricingData.globalMarkup !== undefined) {
        setGlobalMarkup(quoteData.pricingData.globalMarkup);
      }
    }
    
    // Reset save status after loading
    setSaveStatus('idle');
    setLastSaveTime(null);
    
    console.log('[App] Quote loaded successfully:', quoteData.quoteNumber);
  }, [loadProducts]);

  // === MANUAL SAVE QUOTE ===
  const handleSaveQuote = useCallback(async () => {
    // Validate required fields
    if (!companyName.trim()) {
      alert('Please enter a company name to save the quote');
      return;
    }
    if (!hubspotDealUrl.trim()) {
      alert('Please enter a HubSpot deal URL to save the quote');
      return;
    }
    if (!isValidHubSpotUrl(hubspotDealUrl)) {
      alert('Please enter a valid HubSpot deal URL');
      return;
    }

    setSaveStatus('saving');

    const quoteData = {
      companyName: companyName.trim(),
      hubspotDealUrl: hubspotDealUrl.trim(),
      customerName: companyName.trim(),
      customerEmail: '',
      pricingData: {
        billingFrequency: subBilling,
        products: products,
        totalRecurringCost: finalSubscriptionAnnual,
        totalOnetimeCost: finalOneTimeCost,
        oneTimeCosts: oneTimeCosts,
        minSubscription: minSubscription,
        globalMarkup: globalMarkup,
      },
      totalRecurringCost: finalSubscriptionAnnual,
      totalOnetimeCost: finalOneTimeCost,
      billingFrequency: subBilling === 'annual' ? 'Annual' : 'Monthly',
      preparedBy: currentUser?.email || 'Unknown',
    };

    try {
      let result;
      if (currentQuoteId) {
        // Update existing quote
        result = await updateQuote(currentQuoteId, {
          companyName: quoteData.companyName,
          hubspotDealUrl: quoteData.hubspotDealUrl,
          pricingData: quoteData.pricingData,
          totalRecurringCost: quoteData.totalRecurringCost,
          totalOnetimeCost: quoteData.totalOnetimeCost,
          billingFrequency: quoteData.billingFrequency,
        });
      } else {
        // Create new quote
        result = await saveQuote(quoteData);
        if (result.success && result.quote) {
          setCurrentQuoteId(result.quote.id);
          setCurrentQuoteNumber(result.quote.quote_number);
        }
      }

      if (result.success) {
        setSaveStatus('saved');
        setLastSaveTime(new Date());
        setHasUnsavedChanges(false);
        // Store the full data state for comparison
        lastSavedDataRef.current = JSON.stringify({
          products,
          oneTimeCosts,
          minSubscription,
          globalMarkup,
          subBilling,
          companyName,
          hubspotDealUrl,
        });
        console.log('[App] Quote saved successfully');
        
        // Reset to idle after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error('[App] Save failed:', result.error);
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    } catch (err) {
      setSaveStatus('error');
      console.error('[App] Save error:', err);
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  }, [companyName, hubspotDealUrl, subBilling, products, finalSubscriptionAnnual, finalOneTimeCost, oneTimeCosts, minSubscription, globalMarkup, currentUser, currentQuoteId, saveQuote, updateQuote]);

  // === TRACK UNSAVED CHANGES ===
  useEffect(() => {
    // Check if data has changed from last saved state
    const currentData = JSON.stringify({
      products,
      oneTimeCosts,
      minSubscription,
      globalMarkup,
      subBilling,
      companyName,
      hubspotDealUrl,
    });

    // Only mark as unsaved if we have some data entered and it differs from saved
    const hasData = companyName.trim() || hubspotDealUrl.trim() || 
                    Object.values(products).some(p => p.volume > 0 || p.value === 'Yes');
    
    if (hasData && currentData !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [products, oneTimeCosts, minSubscription, globalMarkup, subBilling, companyName, hubspotDealUrl]);

  // === BROWSER BEFOREUNLOAD WARNING ===
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // === AUTO-SAVE EFFECT ===
  useEffect(() => {
    // Only auto-save if we have required fields and auto-save is enabled
    if (!autoSaveEnabled || !companyName.trim() || !hubspotDealUrl.trim() || !isValidHubSpotUrl(hubspotDealUrl)) {
      return;
    }

    // Check if data has actually changed
    const currentData = JSON.stringify({
      products,
      oneTimeCosts,
      minSubscription,
      globalMarkup,
      subBilling,
    });

    if (currentData === lastSavedDataRef.current) {
      return; // No changes to save
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 second after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('[App] Auto-saving quote...');
      handleSaveQuote();
    }, 1000);

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [products, oneTimeCosts, minSubscription, globalMarkup, subBilling, companyName, hubspotDealUrl, autoSaveEnabled, handleSaveQuote]);

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

  // Show loading state while Supabase is initializing
  if (supabaseAuth.isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Loading...</h2>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>Initializing authentication</p>
          </div>
            </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onSupabaseMicrosoft={supabaseAuth.signInWithMicrosoft}
        supabaseError={supabaseAuth.error}
        isSupabaseLoading={supabaseAuth.isLoading}
        isSupabaseConfigured={supabaseConfigured}
      />
    );
  }

  // === MAIN APP CONTENT ===
  return (
    <>
      <FixedHeader 
        onLogout={handleLogout} 
        user={currentUser}
        onOpenDashboard={() => setShowQuoteDashboard(true)}
        onOpenAdmin={() => setShowSKUAdmin(true)}
        showAdminButton={isSuperAdmin(userProfile)}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        splitView={splitView}
        onToggleSplitView={handleToggleSplitView}
      />
      <div style={{ height: topSpacerHeight }} />
      <div
        ref={pageRef}
        style={{
          width: '100%',
          maxWidth: splitView ? '100%' : '1400px',
          margin: '0 auto 20px',
          padding: splitView ? '20px 20px 20px 20px' : '20px',
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
                if (aiAgentSelectedTier && !aiAgentIsCustomPricing) {
                  customerQuoteItems.push({
                    label: 'FreightPOP AI Agent',
                    value: aiAgentCurrentTier?.name ?? 'N/A',
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
          <div style={splitView ? {
            display: 'grid',
            gridTemplateColumns: '1fr 500px',
            gap: '24px',
            alignItems: 'start',
          } : {}}>
            {/* Main Content Column */}
            <div>
            {/* Detailed Quote Summary Table - Hidden in split view (shown in sticky panel instead) */}
            <Card style={{ border: '2px solid #cbd5e1', display: splitView ? 'none' : 'block' }}>
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
                      volume: aiAgentSelectedTier ? 1 : 0, // Use 1 to indicate selected, 0 for not selected
                      monthlyCost: aiAgentAnnualCost / 12,
                      annualCost: aiAgentAnnualCost,
                      planDetails: (() => {
                        if (!aiAgentSelectedTier || subBilling !== 'annual') return 'Annual Only';
                        if (aiAgentIsCustomPricing) return 'Custom Pricing Required';
                        return aiAgentCurrentTier?.name ?? 'N/A';
                      })(),
                      tierDetails: aiAgentSelectedTier && subBilling === 'annual'
                        ? aiAgentIsCustomPricing
                          ? 'Contact sales for custom pricing'
                          : `$${(aiAgentCurrentTier?.annualCost ?? 0).toLocaleString()}/year`
                        : '',
                      lineMarkup: aiAgentMarkup,
                      hideIfZero: true,
                      isEnabled: !!aiAgentSelectedTier,
                      isCustomPricing: aiAgentIsCustomPricing,
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
                        onVolumeChange: e => {
                          const newValue = Number(e.target.value) || 0;
                          console.log('[Volume Input] Freight volume changed:', { 
                            oldValue: freightVolume, 
                            newValue, 
                            inputValue: e.target.value,
                            isDisabled: false
                          });
                          setFreightVolume(newValue);
                        },
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
                          if (!aiAgentSelectedTier) return 'Select token tier';
                          if (aiAgentIsCustomPricing) return '❗ Custom Pricing Required';
                          return `${aiAgentCurrentTier?.name ?? 'N/A'} - $${(aiAgentCurrentTier?.annualCost ?? 0).toLocaleString()}/year`;
                        })(),
                        isCustomPricing: aiAgentIsCustomPricing,
                        tierOptions: aiAgentTiers,
                        volumeCount: aiAgentSelectedTier ? 1 : 0,
                        onVolumeChange: null,
                        monthlyCost: aiAgentAnnualCost / 12,
                        annualCost: aiAgentAnnualCost,
                        tooltip: aiAgentSelectedTier 
                          ? `💡 Selected: ${aiAgentCurrentTier?.name ?? 'N/A'}`
                          : '💡 Select a token tier from the dropdown',
                        isDisabled: subBilling !== 'annual',
                        showCheckbox: false,
                        isChecked: !!aiAgentSelectedTier,
                        onCheckboxChange: null,
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
                                      <select
                                        value={aiAgentSelectedTier}
                                        onChange={e => setProductValue('aiAgent', 'selectedTier', e.target.value)}
                                        style={selectStyle}
                                        disabled={subBilling !== 'annual'}
                                      >
                                        <option value="">Select Token Tier...</option>
                                        {aiAgentTiers.map(tier => (
                                          <option key={tier.id} value={tier.id}>
                                            {tier.name} {tier.isCustom ? '' : `- $${tier.annualCost.toLocaleString()}/yr`}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type='number'
                                        value={row.volumeCount}
                                        onChange={e => {
                                          // Diagnostic logging for volume input changes
                                          if (row.onVolumeChange) {
                                            console.log(`[Volume Input] ${row.productType} volume changed:`, {
                                              productType: row.productType,
                                              oldValue: row.volumeCount,
                                              newValue: e.target.value,
                                              isDisabled: false,
                                              hasOnChange: !!row.onVolumeChange
                                            });
                                            row.onVolumeChange(e);
                                          } else {
                                            console.warn(`[Volume Input] ${row.productType} has no onChange handler - input is read-only`);
                                          }
                                        }}
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
                            <select
                              value={aiAgentSelectedTier}
                              onChange={e => setProductValue('aiAgent', 'selectedTier', e.target.value)}
                              style={selectStyle}
                              disabled={subBilling !== 'annual'}
                            >
                              <option value="">Select Token Tier...</option>
                              {aiAgentTiers.map(tier => (
                                <option key={tier.id} value={tier.id}>
                                  {tier.name} {tier.isCustom ? '' : `- $${tier.annualCost.toLocaleString()}/yr`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type='number'
                              value={row.volumeCount}
                              onChange={e => {
                                // Diagnostic logging for volume input changes
                                if (row.onVolumeChange) {
                                  console.log(`[Volume Input] ${row.productType} volume changed:`, {
                                    productType: row.productType,
                                    oldValue: row.volumeCount,
                                    newValue: e.target.value,
                                    isDisabled: false,
                                    hasOnChange: !!row.onVolumeChange
                                  });
                                  row.onVolumeChange(e);
                                } else {
                                  console.warn(`[Volume Input] ${row.productType} has no onChange handler - input is read-only`);
                                }
                              }}
                              style={row.isCustomPricing ? customPricingInputStyle : inputStyle}
                              disabled={row.onVolumeChange === null}
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

            {/* Quote Save & Download Section */}
            <Card style={{ border: '2px solid #10b981' }}>
              <CardHeader style={{ background: '#f0fdf4', padding: '16px 24px' }}>
                <CardTitle style={{ fontSize: '18px', color: '#065f46' }}>
                  💾 Save & Export Quote
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Save Status Banner */}
                {saveStatus !== 'idle' && (
                  <div style={{
                    padding: '10px 16px',
                    marginBottom: '16px',
                    borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    ...(saveStatus === 'saving' && { background: '#fef3c7', color: '#92400e' }),
                    ...(saveStatus === 'saved' && { background: '#d1fae5', color: '#065f46' }),
                    ...(saveStatus === 'error' && { background: '#fee2e2', color: '#dc2626' }),
                  }}>
                    {saveStatus === 'saving' && '⏳ Saving...'}
                    {saveStatus === 'saved' && `✅ Saved ${lastSaveTime ? `at ${lastSaveTime.toLocaleTimeString()}` : ''}`}
                    {saveStatus === 'error' && '❌ Save failed - please try again'}
                  </div>
                )}

                {/* Quote Number Display */}
                {currentQuoteNumber && (
                  <div style={{
                    padding: '10px 16px',
                    marginBottom: '16px',
                    borderRadius: '6px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    📋 Quote: <strong>{currentQuoteNumber}</strong>
                  </div>
                )}

                {/* Form Fields */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px',
                }}>
                  {/* Company Name */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '6px',
                    }}>
                      Company Name <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type='text'
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      />
                    </div>

                  {/* HubSpot Deal URL */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '6px',
                    }}>
                      HubSpot Deal URL <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type='url'
                      value={hubspotDealUrl}
                      onChange={e => setHubspotDealUrl(e.target.value)}
                      placeholder="https://app.hubspot.com/contacts/.../deal/..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Rep Name */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '6px',
                    }}>
                      Rep Name
                    </label>
                      <input
                        type='text'
                        value={repName}
                        onChange={e => setRepName(e.target.value)}
                      placeholder="Your name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      />
                  </div>

                  {/* Date */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '6px',
                    }}>
                      Date
                    </label>
                      <input
                        type='date'
                        value={downloadDate}
                        onChange={e => setDownloadDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      />
                    </div>
                  </div>

                {/* Auto-save Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '10px 16px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                }}>
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={autoSaveEnabled}
                    onChange={e => setAutoSaveEnabled(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="autoSave" style={{ fontSize: '14px', color: '#374151' }}>
                    Auto-save quote (saves 1 second after changes)
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  <button
                    onClick={handleSaveQuote}
                    disabled={saveStatus === 'saving'}
                    style={{
                      padding: '12px 24px',
                      background: saveStatus === 'saving' ? '#9ca3af' : '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {saveStatus === 'saving' ? '⏳ Saving...' : '💾 Save Quote'}
                  </button>

                  <button
                    onClick={() => setShowShareModal(true)}
                    disabled={!currentQuoteId}
                    style={{
                      padding: '12px 24px',
                      background: currentQuoteId ? '#3b82f6' : '#9ca3af',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentQuoteId ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🔗 Share for Approval
                  </button>

                  <button
                    onClick={downloadPageAsPNG}
                    style={{
                      padding: '12px 24px',
                      background: '#f97316',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    📷 Download as PNG
                  </button>
                </div>
              </CardContent>
            </Card>
            </div>
            
            {/* STICKY SUMMARY PANEL - Only shown in split view */}
            {splitView && (
              <div style={{
                position: 'sticky',
                top: '90px',
                maxHeight: 'calc(100vh - 110px)',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}>
                <div style={{
                  position: 'sticky',
                  top: 0,
                  background: '#1e293b',
                  padding: '14px 20px',
                  borderRadius: '6px 6px 0 0',
                  zIndex: 10,
                }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '600' }}>
                    📊 Quote Summary
                  </h3>
                </div>
                <div style={{ padding: '16px' }}>
                  {/* Billing Frequency */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                      Billing Frequency
                    </label>
                    <select
                      value={subBilling}
                      onChange={e => setSubBilling(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="annual">Annual</option>
                      <option value="monthly">Monthly</option>
                      <option value="2year">2-Year</option>
                      <option value="3year">3-Year</option>
                    </select>
                  </div>

                  {/* Product Breakdown Table */}
                  <div style={{ marginBottom: '12px', overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse', 
                      fontSize: '11px',
                    }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ 
                            padding: '6px 8px', 
                            textAlign: 'left', 
                            fontWeight: '600', 
                            color: '#475569',
                            borderBottom: '2px solid #e2e8f0',
                          }}>
                            Product
                          </th>
                          <th style={{ 
                            padding: '6px 8px', 
                            textAlign: 'center', 
                            fontWeight: '600', 
                            color: '#475569',
                            borderBottom: '2px solid #e2e8f0',
                          }}>
                            Tier
                          </th>
                          <th style={{ 
                            padding: '6px 8px', 
                            textAlign: 'right', 
                            fontWeight: '600', 
                            color: '#475569',
                            borderBottom: '2px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}>
                            Monthly
                          </th>
                          <th style={{ 
                            padding: '6px 8px', 
                            textAlign: 'right', 
                            fontWeight: '600', 
                            color: '#475569',
                            borderBottom: '2px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}>
                            Annual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {freightVolume > 0 && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>🚛 Freight ({freightVolume})</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              {freightPlan?.isCustomPricing ? 'Custom' : freightPlan ? `Incl: ${freightPlan.shipmentsIncluded}` : '—'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(freightAnnualCost / 12)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(freightAnnualCost)}</td>
                          </tr>
                        )}
                        {parcelVolume > 0 && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>📦 Parcel ({parcelVolume})</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              {parcelPlan?.isCustomPricing ? 'Custom' : parcelPlan ? `Incl: ${parcelPlan.shipmentsIncluded}` : '—'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(parcelAnnualCost / 12)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(parcelAnnualCost)}</td>
                          </tr>
                        )}
                        {oceanTrackingVolume > 0 && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>🚢 Ocean ({oceanTrackingVolume})</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              {oceanTrackingPlan?.isCustomPricing ? 'Custom' : oceanTrackingPlan ? `Incl: ${oceanTrackingPlan.shipmentsIncluded}` : '—'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(oceanTrackingAnnualCost / 12)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(oceanTrackingAnnualCost)}</td>
                          </tr>
                        )}
                        {locationsVolume > 3 && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>📍 Locations ({locationsVolume})</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              {locationsVolume} locations
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(locationsAnnualCost / 12)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(locationsAnnualCost)}</td>
                          </tr>
                        )}
                        {billPayYesNo === 'Yes' && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>💳 Bill Pay</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              $500 + $2/LTL + $0.50/Parcel
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(billPayMonthlyCost)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(billPayAnnualCost)}</td>
                          </tr>
                        )}
                        {vendorPortalCount > 0 && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>🏪 Vendor ({vendorPortalCount})</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              $20/user/mo
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(vendorAnnualCost / 12)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(vendorAnnualCost)}</td>
                          </tr>
                        )}
                        {aiAgentSelectedTier && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>🤖 AI Agent</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                              {aiAgentCurrentTier?.name ?? '—'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(aiAgentAnnualCost / 12)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500', color: '#334155' }}>{formatCost(aiAgentAnnualCost)}</td>
                          </tr>
                        )}
                        {/* Subtotal Row */}
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px 8px', fontWeight: '600', color: '#475569' }} colSpan={2}>Subtotal</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>{formatCost(rawSubAnnualSubscription / 12)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>{formatCost(rawSubAnnualSubscription)}</td>
                        </tr>
                        {/* Minimum Row - only if under minimum */}
                        {neededToMinAnnual > 0 && (
                          <>
                            <tr style={{ background: '#fef3c7' }}>
                              <td style={{ padding: '6px 8px', fontWeight: '600', color: '#92400e' }} colSpan={2}>Min Subscription</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#92400e' }}>{formatCost(minSubscription / 12)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#92400e' }}>{formatCost(minSubscription)}</td>
                            </tr>
                            <tr style={{ background: '#fee2e2' }}>
                              <td style={{ padding: '6px 8px', fontWeight: '600', color: '#dc2626' }} colSpan={2}>⚠️ Under By</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>{formatCost(neededToMinAnnual / 12)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>{formatCost(neededToMinAnnual)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Final Total Stats */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{
                      padding: '12px',
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                    }}>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>
                        MONTHLY
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#15803d' }}>
                        {formatCost(finalSubscriptionMonthly)}
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      background: '#eff6ff',
                      borderRadius: '8px',
                      border: '1px solid #93c5fd',
                    }}>
                      <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600', marginBottom: '4px' }}>
                        ANNUAL
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1d4ed8' }}>
                        {formatCost(finalSubscriptionAnnual)}
                      </div>
                    </div>
                  </div>
                  
                  {/* One-Time Cost */}
                  <div style={{
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fcd34d',
                  }}>
                    <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
                      ONE-TIME SETUP
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#b45309' }}>
                      {formatCost(finalOneTimeCost)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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

      {/* Quote Dashboard Modal */}
      <QuoteDashboard
        isOpen={showQuoteDashboard}
        onClose={() => setShowQuoteDashboard(false)}
        onLoadQuote={handleLoadQuote}
        currentPricingData={{
          billingFrequency: subBilling,
          products: products,
          totalRecurringCost: finalSubscriptionAnnual,
          totalOnetimeCost: finalOneTimeCost,
        }}
        currentUser={currentUser}
        userProfile={userProfile}
        companyName={companyName}
        billingFrequency={subBilling}
        totalRecurringCost={finalSubscriptionAnnual}
        totalOnetimeCost={finalOneTimeCost}
      />

      {/* Share Quote Modal */}
      <ShareQuoteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        quoteId={currentQuoteId}
        quoteNumber={currentQuoteNumber}
        companyName={companyName}
        currentUser={currentUser}
      />

      {/* SKU Admin Panel (Super Admin only) */}
      <SKUAdminPanel
        isOpen={showSKUAdmin}
        onClose={() => setShowSKUAdmin(false)}
        userProfile={userProfile}
        onPricingUpdate={reloadPricing}
      />

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '450px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              fontSize: '48px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              ⚠️
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              textAlign: 'center',
              margin: '0 0 12px 0',
              color: '#111827',
            }}>
              Unsaved Changes
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              margin: '0 0 24px 0',
              lineHeight: 1.5,
            }}>
              You have unsaved changes. Would you like to save your quote before leaving?
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}>
              <button
                onClick={async () => {
                  await handleSaveQuote();
                  setShowUnsavedModal(false);
                  // Execute pending action after save
                  if (pendingNavigationAction) {
                    pendingNavigationAction();
                    setPendingNavigationAction(null);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                💾 Save & Continue
              </button>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  setShowUnsavedModal(false);
                  // Execute pending action without saving
                  if (pendingNavigationAction) {
                    pendingNavigationAction();
                    setPendingNavigationAction(null);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                🗑️ Discard
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  setPendingNavigationAction(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;

