import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
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
} from './skus';

/* ============================
   STYLE CONSTANTS
============================ */
const inputStyle = {
  marginRight: '12px',
  padding: '10px 12px',
  width: '70px',
  border: '2px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '14px',
  transition: 'all 0.2s ease',
};

const selectStyle = {
  padding: '10px 12px',
  border: '2px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const stickyHeaderStyle = {
  position: 'sticky',
  top: 0,
  background: 'linear-gradient(135deg, #4088cf 0%, #3670b8 100%)',
  zIndex: 10,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
};

const tableThStyle = {
  border: '1px solid #e2e8f0',
  padding: '14px 12px',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'white',
};

const tableTdStyle = {
  border: '1px solid #e2e8f0',
  padding: '12px 10px',
  textAlign: 'center',
  fontSize: '14px',
  color: '#2c3e50',
};

const firstColumnStyle = { 
  minWidth: '220px',
  fontWeight: '500',
  textAlign: 'left',
  paddingLeft: '16px',
};

/* ============================
   HELPER FUNCTIONS
============================ */
const computeVolumeBasedCost = (volume, plan, billing) => {
  const vol = Number(volume) || 0;
  if (!plan) return { included: 0, overage: 0, monthlyCost: 0, annualCost: 0 };
  const included = plan.shipmentsIncluded || 0;
  const overage =
    vol > included ? (vol - included) * (plan.costPerShipment || 0) : 0;
  let monthlyCost = 0,
    annualCost = 0;
  if (billing === 'annual') {
    const baseAnnual = (plan.perMonthCost || 0) * 12;
    annualCost = baseAnnual + overage;
    monthlyCost = annualCost / 12;
  } else {
    monthlyCost = (plan.perMonthCost || 0) + overage;
    annualCost = monthlyCost * 12;
  }
  return { included, overage, monthlyCost, annualCost };
};

const computeFixedCost = (plan, billing = 'annual') => {
  if (!plan) return { monthlyCost: 0, annualCost: 0 };
  if (billing === 'annual') {
    const annualCost =
      plan.annualCost !== undefined
        ? Number(plan.annualCost)
        : Number(plan.cost || 0);
    return { monthlyCost: annualCost / 12, annualCost };
  } else {
    const monthlyCost =
      plan.perMonthCost !== undefined
        ? Number(plan.perMonthCost)
        : Number(plan.cost || 0) / 12;
    return { monthlyCost, annualCost: monthlyCost * 12 };
  }
};

const formatCost = cost =>
  Number(cost).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

/* ============================
   REUSABLE COMPONENTS
============================ */
const FixedHeader = () => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '70px',
      background: 'linear-gradient(135deg, #4088cf 0%, #2563eb 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}
  >
    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', letterSpacing: '0.5px' }}>
      FreightPOP Quote Builder
    </h1>
    <div style={{ fontSize: '14px', opacity: 0.9 }}>
      Professional Pricing Tool
    </div>
  </div>
);

const Card = ({ children, className = '' }) => (
  <div
    className={`card fade-in ${className}`}
    style={{
      width: '100%',
      background: 'white',
      border: 'none',
      borderRadius: '12px',
      overflow: 'hidden',
      margin: '24px 0',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}
  >
    {children}
  </div>
);

const CardHeader = ({ children, style }) => (
  <div
    style={{ 
      background: 'linear-gradient(135deg, #4088cf 0%, #3670b8 100%)', 
      padding: '16px 24px', 
      color: '#fff',
      borderBottom: '3px solid #2563eb',
      ...style 
    }}
  >
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h2 style={{ 
    margin: 0, 
    fontSize: '20px', 
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
   MAIN COMPONENT: App
============================ */
const App = () => {
  const pageRef = useRef(null);

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
    if (params.has('freightVolume'))
      setFreightVolume(Number(params.get('freightVolume')) || 0);
    if (params.has('parcelVolume'))
      setParcelVolume(Number(params.get('parcelVolume')) || 0);
    if (params.has('locationsVolume'))
      setLocationsVolume(Number(params.get('locationsVolume')) || 0);
    if (params.has('billPayYesNo')) setBillPayYesNo(params.get('billPayYesNo'));
    if (params.has('vendorPortalCount'))
      setVendorPortalCount(Number(params.get('vendorPortalCount')) || 0);
    if (params.has('auditingVolume'))
      setAuditingVolume(Number(params.get('auditingVolume')) || 0);
    if (params.has('fleetRouteVolume'))
      setFleetRouteVolume(Number(params.get('fleetRouteVolume')) || 0);
    if (params.has('oceanTrackingVolume'))
      setOceanTrackingVolume(Number(params.get('oceanTrackingVolume')) || 0);
    if (params.has('supportPackageVolume'))
      setSupportPackageVolume(Number(params.get('supportPackageVolume')) || 0);
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
  const [editPricingEnabled, setEditPricingEnabled] = useState(false);
  const [showCustomerView, setShowCustomerView] = useState(false);
  const [oneTimeCosts, setOneTimeCosts] = useState([]);

  // MODULE STATES
  const [freightVolume, setFreightVolume] = useState(0);
  const [freightMarkup, setFreightMarkup] = useState(0);
  const [freightSKU, setFreightSKU] = useState('');
  const [freightOverride, setFreightOverride] = useState(false);

  const [parcelVolume, setParcelVolume] = useState(0);
  const [parcelMarkup, setParcelMarkup] = useState(0);
  const [parcelSKU, setParcelSKU] = useState('');
  const [parcelOverride, setParcelOverride] = useState(false);

  const [billPayYesNo, setBillPayYesNo] = useState('No');
  const [billPayMarkup, setBillPayMarkup] = useState(0);

  const [locationsVolume, setLocationsVolume] = useState(0);
  const [locationsMarkup, setLocationsMarkup] = useState(0);
  const [locationsSKU, setLocationsSKU] = useState('');
  const [locationsOverride, setLocationsOverride] = useState(false);

  const [supportPackageVolume, setSupportPackageVolume] = useState(0);
  const [supportPackageMarkup, setSupportPackageMarkup] = useState(0);
  const [supportPackageSKU, setSupportPackageSKU] = useState('');
  const [supportPackageOverride, setSupportPackageOverride] = useState(false);

  const [vendorPortalCount, setVendorPortalCount] = useState(0);
  const [vendorPortalMarkup, setVendorPortalMarkup] = useState(0);

  const [auditingVolume, setAuditingVolume] = useState(0);
  const [auditingMarkup, setAuditingMarkup] = useState(0);
  const [auditingSKU, setAuditingSKU] = useState('');
  const [auditingOverride, setAuditingOverride] = useState(false);

  const [fleetRouteVolume, setFleetRouteVolume] = useState(0);
  const [fleetRouteMarkup, setFleetRouteMarkup] = useState(0);
  const [fleetRouteSKU, setFleetRouteSKU] = useState('');
  const [fleetRouteOverride, setFleetRouteOverride] = useState(false);

  const [oceanTrackingVolume, setOceanTrackingVolume] = useState(0);
  const [oceanTrackingMarkup, setOceanTrackingMarkup] = useState(0);
  const [oceanTrackingSKU, setOceanTrackingSKU] = useState('');
  const [oceanTrackingOverride, setOceanTrackingOverride] = useState(false);

  // NEW: Rename Asset Management to Yard Management
  const [assetManagementFacilities, setAssetManagementFacilities] = useState(0);
  const [assetManagementAssets, setAssetManagementAssets] = useState(0);
  const [assetManagementMarkup, setAssetManagementMarkup] = useState(0);

  // DOCK SCHEDULING STATES (NEW)
  const [dockSchedulingVolume, setDockSchedulingVolume] = useState(0);
  const [dockSchedulingMarkup, setDockSchedulingMarkup] = useState(0);
  const [dockSchedulingSKU, setDockSchedulingSKU] = useState('');
  const [dockSchedulingOverride, setDockSchedulingOverride] = useState(false);

  // === AUTO-SELECTION EFFECTS ===
  useEffect(() => {
    if (!freightOverride && freightVolume >= 1) {
      const arr =
        subBilling === 'annual' ? freightAnnualSKUs : freightMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            freightVolume >= plan.rangeStart && freightVolume <= plan.rangeEnd
        ) || arr[arr.length - 1];
      setFreightSKU(selected.sku);
    } else if (freightVolume < 1) {
      setFreightSKU('');
    }
  }, [freightVolume, subBilling, freightOverride]);

  useEffect(() => {
    if (!parcelOverride && parcelVolume >= 1) {
      const arr =
        subBilling === 'annual' ? parcelAnnualSKUs : parcelMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            parcelVolume >= plan.rangeStart && parcelVolume <= plan.rangeEnd
        ) || arr[arr.length - 1];
      setParcelSKU(selected.sku);
    } else if (parcelVolume < 1) {
      setParcelSKU('');
    }
  }, [parcelVolume, subBilling, parcelOverride]);

  useEffect(() => {
    if (!auditingOverride && auditingVolume >= 1) {
      const arr =
        subBilling === 'annual' ? auditingAnnualSKUs : auditingMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            auditingVolume >= plan.range[0] && auditingVolume <= plan.range[1]
        ) || arr[arr.length - 1];
      setAuditingSKU(selected.sku);
    } else if (auditingVolume < 1) {
      setAuditingSKU('');
    }
  }, [auditingVolume, subBilling, auditingOverride]);

  useEffect(() => {
    if (!locationsOverride && locationsVolume >= 1) {
      const arr =
        subBilling === 'annual' ? locationsAnnualSKUs : locationsMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            locationsVolume >= plan.rangeStart &&
            locationsVolume <= plan.rangeEnd
        ) || arr[arr.length - 1];
      setLocationsSKU(selected.sku);
    } else if (locationsVolume < 1) {
      setLocationsSKU('');
    }
  }, [locationsVolume, subBilling, locationsOverride]);

  useEffect(() => {
    if (!fleetRouteOverride && fleetRouteVolume >= 1) {
      const arr =
        subBilling === 'annual'
          ? fleetRouteOptimizationAnnualSKUs
          : fleetRouteOptimizationMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            fleetRouteVolume >= plan.range[0] &&
            fleetRouteVolume <= plan.range[1]
        ) || arr[arr.length - 1];
      setFleetRouteSKU(selected.sku);
    } else if (fleetRouteVolume < 1) {
      setFleetRouteSKU('');
    }
  }, [fleetRouteVolume, subBilling, fleetRouteOverride]);

  useEffect(() => {
    if (!oceanTrackingOverride && oceanTrackingVolume >= 1) {
      const arr =
        subBilling === 'annual'
          ? oceanTrackingAnnualSKUs
          : oceanTrackingMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            oceanTrackingVolume >= plan.rangeStart &&
            oceanTrackingVolume <= plan.rangeEnd
        ) || arr[arr.length - 1];
      setOceanTrackingSKU(selected.sku);
    } else if (oceanTrackingVolume < 1) {
      setOceanTrackingSKU('');
    }
  }, [oceanTrackingVolume, subBilling, oceanTrackingOverride]);

  useEffect(() => {
    if (!supportPackageOverride && supportPackageVolume >= 1) {
      const arr =
        subBilling === 'annual'
          ? supportPackageAnnualSKUs
          : supportPackageMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            supportPackageVolume >= plan.rangeStart &&
            supportPackageVolume <= plan.rangeEnd
        ) || arr[arr.length - 1];
      setSupportPackageSKU(selected.sku);
    } else if (supportPackageVolume < 1) {
      setSupportPackageSKU('');
    }
  }, [supportPackageVolume, subBilling, supportPackageOverride]);

  // NEW: Dock Scheduling auto-select
  useEffect(() => {
    if (!dockSchedulingOverride && dockSchedulingVolume >= 1) {
      const arr =
        subBilling === 'annual'
          ? dockSchedulingAnnualSKUs
          : dockSchedulingMonthlySKUs;
      const selected =
        arr.find(
          plan =>
            dockSchedulingVolume >= plan.rangeStart &&
            dockSchedulingVolume <= plan.rangeEnd
        ) || arr[arr.length - 1];
      setDockSchedulingSKU(selected.sku);
    } else if (dockSchedulingVolume < 1) {
      setDockSchedulingSKU('');
    }
  }, [dockSchedulingVolume, subBilling, dockSchedulingOverride]);

  // === UPDATE SKU ON BILLING FREQUENCY CHANGE ===
  useEffect(() => {
    if (freightSKU && !freightOverride) {
      const arr =
        subBilling === 'annual' ? freightAnnualSKUs : freightMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === freightSKU);
      if (!currentPlan && freightVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              freightVolume >= plan.rangeStart && freightVolume <= plan.rangeEnd
          ) || arr[arr.length - 1];
        setFreightSKU(selected.sku);
      }
    }
  }, [subBilling]);

  useEffect(() => {
    if (parcelSKU && !parcelOverride) {
      const arr =
        subBilling === 'annual' ? parcelAnnualSKUs : parcelMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === parcelSKU);
      if (!currentPlan && parcelVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              parcelVolume >= plan.rangeStart && parcelVolume <= plan.rangeEnd
          ) || arr[arr.length - 1];
        setParcelSKU(selected.sku);
      }
    }
  }, [subBilling]);

  useEffect(() => {
    if (auditingSKU && !auditingOverride) {
      const arr =
        subBilling === 'annual' ? auditingAnnualSKUs : auditingMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === auditingSKU);
      if (!currentPlan && auditingVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              auditingVolume >= plan.range[0] && auditingVolume <= plan.range[1]
          ) || arr[arr.length - 1];
        setAuditingSKU(selected.sku);
      }
    }
  }, [subBilling]);

  useEffect(() => {
    if (locationsSKU && !locationsOverride) {
      const arr =
        subBilling === 'annual' ? locationsAnnualSKUs : locationsMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === locationsSKU);
      if (!currentPlan && locationsVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              locationsVolume >= plan.rangeStart &&
              locationsVolume <= plan.rangeEnd
          ) || arr[arr.length - 1];
        setLocationsSKU(selected.sku);
      }
    }
  }, [subBilling]);

  useEffect(() => {
    if (fleetRouteSKU && !fleetRouteOverride) {
      const arr =
        subBilling === 'annual'
          ? fleetRouteOptimizationAnnualSKUs
          : fleetRouteOptimizationMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === fleetRouteSKU);
      if (!currentPlan && fleetRouteVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              fleetRouteVolume >= plan.range[0] &&
              fleetRouteVolume <= plan.range[1]
          ) || arr[arr.length - 1];
        setFleetRouteSKU(selected.sku);
      }
    }
  }, [subBilling]);

  useEffect(() => {
    if (oceanTrackingSKU && !oceanTrackingOverride) {
      const arr =
        subBilling === 'annual'
          ? oceanTrackingAnnualSKUs
          : oceanTrackingMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === oceanTrackingSKU);
      if (!currentPlan && oceanTrackingVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              oceanTrackingVolume >= plan.rangeStart &&
              oceanTrackingVolume <= plan.rangeEnd
          ) || arr[arr.length - 1];
        setOceanTrackingSKU(selected.sku);
      }
    }
  }, [subBilling]);

  useEffect(() => {
    if (supportPackageSKU && !supportPackageOverride) {
      const arr =
        subBilling === 'annual'
          ? supportPackageAnnualSKUs
          : supportPackageMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === supportPackageSKU);
      if (!currentPlan && supportPackageVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              supportPackageVolume >= plan.rangeStart &&
              supportPackageVolume <= plan.rangeEnd
          ) || arr[arr.length - 1];
        setSupportPackageSKU(selected.sku);
      }
    }
  }, [subBilling]);

  // NEW: Check Dock Scheduling SKU on billing change
  useEffect(() => {
    if (dockSchedulingSKU && !dockSchedulingOverride) {
      const arr =
        subBilling === 'annual'
          ? dockSchedulingAnnualSKUs
          : dockSchedulingMonthlySKUs;
      const currentPlan = arr.find(plan => plan.sku === dockSchedulingSKU);
      if (!currentPlan && dockSchedulingVolume >= 1) {
        const selected =
          arr.find(
            plan =>
              dockSchedulingVolume >= plan.rangeStart &&
              dockSchedulingVolume <= plan.rangeEnd
          ) || arr[arr.length - 1];
        setDockSchedulingSKU(selected.sku);
      }
    }
  }, [subBilling]);

  // === LOOKUP PLANS ===
  const freightPlan = freightSKU
    ? subBilling === 'annual'
      ? freightAnnualSKUs.find(p => p.sku === freightSKU)
      : freightMonthlySKUs.find(p => p.sku === freightSKU)
    : null;
  const parcelPlan = parcelSKU
    ? subBilling === 'annual'
      ? parcelAnnualSKUs.find(p => p.sku === parcelSKU)
      : parcelMonthlySKUs.find(p => p.sku === parcelSKU)
    : null;
  const auditingPlan = auditingSKU
    ? subBilling === 'annual'
      ? auditingAnnualSKUs.find(p => p.sku === auditingSKU)
      : auditingMonthlySKUs.find(p => p.sku === auditingSKU)
    : null;
  const locationsPlan = locationsSKU
    ? subBilling === 'annual'
      ? locationsAnnualSKUs.find(p => p.sku === locationsSKU)
      : locationsMonthlySKUs.find(p => p.sku === locationsSKU)
    : null;
  const fleetRoutePlan = fleetRouteSKU
    ? subBilling === 'annual'
      ? fleetRouteOptimizationAnnualSKUs.find(p => p.sku === fleetRouteSKU)
      : fleetRouteOptimizationMonthlySKUs.find(p => p.sku === fleetRouteSKU)
    : null;
  const oceanTrackingPlan = oceanTrackingSKU
    ? subBilling === 'annual'
      ? oceanTrackingAnnualSKUs.find(p => p.sku === oceanTrackingSKU)
      : oceanTrackingMonthlySKUs.find(p => p.sku === oceanTrackingSKU)
    : null;
  const supportPackagePlan = supportPackageSKU
    ? subBilling === 'annual'
      ? supportPackageAnnualSKUs.find(p => p.sku === supportPackageSKU)
      : supportPackageMonthlySKUs.find(p => p.sku === supportPackageSKU)
    : null;
  const dockSchedulingPlan = dockSchedulingSKU
    ? subBilling === 'annual'
      ? dockSchedulingAnnualSKUs.find(p => p.sku === dockSchedulingSKU)
      : dockSchedulingMonthlySKUs.find(p => p.sku === dockSchedulingSKU)
    : null;

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
  const freightCostObj = computeVolumeBasedCost(
    freightVolume,
    freightPlan,
    subBilling
  );
  const freightAnnualCost =
    (subBilling === 'annual'
      ? freightCostObj.annualCost
      : freightCostObj.monthlyCost * 12) *
    (1 + freightMarkup / 100);

  const parcelCostObj = computeVolumeBasedCost(
    parcelVolume,
    parcelPlan,
    subBilling
  );
  const parcelAnnualCost = parcelCostObj.annualCost * (1 + parcelMarkup / 100);

  let oceanTrackingAnnualCost = 0;
  if (oceanTrackingPlan) {
    const costObj = computeVolumeBasedCost(
      oceanTrackingVolume,
      oceanTrackingPlan,
      subBilling
    );
    oceanTrackingAnnualCost =
      (subBilling === 'annual'
        ? costObj.annualCost
        : costObj.monthlyCost * 12) *
      (1 + oceanTrackingMarkup / 100);
  }

  const locationsCostObj = computeVolumeBasedCost(
    locationsVolume,
    locationsPlan,
    subBilling
  );
  const locationsAnnualCost =
    locationsCostObj.annualCost * (1 + locationsMarkup / 100);

  const supportPackageCostAnnual = supportPackagePlan
    ? supportPackagePlan.annualCost * (1 + supportPackageMarkup / 100)
    : 0;
  const supportPackageCostMonthly = supportPackagePlan
    ? supportPackageCostAnnual / 12
    : 0;

  // Yard Management Calculation
  const assetFacilityRate = subBilling === 'annual' ? 100 : 130;
  const assetRate = subBilling === 'annual' ? 10 : 13;
  const assetManagementMonthlyBase =
    assetManagementFacilities * assetFacilityRate +
    assetManagementAssets * assetRate;
  const assetManagementMonthlyCost =
    assetManagementMonthlyBase * (1 + assetManagementMarkup / 100);
  const assetManagementAnnualCost = assetManagementMonthlyCost * 12;

  const coreTMSAnnualCost =
    freightAnnualCost + parcelAnnualCost + oceanTrackingAnnualCost;
  const useLocations = locationsAnnualCost > coreTMSAnnualCost;
  const effectiveCoreAnnualCost = useLocations
    ? locationsAnnualCost
    : coreTMSAnnualCost;

  let billPayMonthlyCost = 0;
  if (billPayYesNo === 'Yes') {
    if (subBilling === 'annual') {
      const base = 500 + 2 * freightVolume + 0.5 * parcelVolume;
      billPayMonthlyCost = base * (1 + billPayMarkup / 100);
    } else {
      const base = 650 + 2.6 * freightVolume + 0.65 * parcelVolume;
      billPayMonthlyCost = base * (1 + billPayMarkup / 100);
    }
  }
  const billPayAnnualCost = billPayMonthlyCost * 12;

  const vendorRate = subBilling === 'annual' ? 20 : 30;
  const vendorMonthlyBase = vendorPortalCount * vendorRate;
  const vendorMonthlyCost = vendorMonthlyBase * (1 + vendorPortalMarkup / 100);
  const vendorAnnualCost = vendorMonthlyCost * 12;

  const auditingCostObj = auditingPlan
    ? computeFixedCost(auditingPlan, subBilling)
    : { monthlyCost: 0, annualCost: 0 };
  const auditingAnnualCost =
    auditingCostObj.annualCost * (1 + auditingMarkup / 100);

  const fleetRouteCostObj = fleetRoutePlan
    ? {
        monthlyCost: fleetRoutePlan.perMonthCost,
        annualCost: fleetRoutePlan.annualCost,
      }
    : { monthlyCost: 0, annualCost: 0 };
  const fleetRouteEffectiveAnnual =
    fleetRouteCostObj.annualCost * (1 + fleetRouteMarkup / 100);

  // NEW: Dock Scheduling cost
  const dockSchedulingCostObj = computeVolumeBasedCost(
    dockSchedulingVolume,
    dockSchedulingPlan,
    subBilling
  );
  const dockSchedulingAnnualCost =
    dockSchedulingCostObj.annualCost * (1 + dockSchedulingMarkup / 100);

  const rawSubAnnualSubscription =
    effectiveCoreAnnualCost +
    (billPayYesNo === 'Yes' ? billPayAnnualCost : 0) +
    vendorAnnualCost +
    auditingAnnualCost +
    fleetRouteEffectiveAnnual +
    supportPackageCostAnnual +
    (assetManagementAnnualCost > 0 ? assetManagementAnnualCost : 0) +
    dockSchedulingAnnualCost;

  const subAfterMin = Math.max(rawSubAnnualSubscription, minSubscription);
  const finalSubscriptionAnnual = subAfterMin * (1 + globalMarkup / 100);
  const finalSubscriptionMonthly = finalSubscriptionAnnual / 12;

  const neededToMinAnnual = Math.max(
    0,
    minSubscription - rawSubAnnualSubscription
  );
  const neededToMinMonthly = neededToMinAnnual / 12;

  const rawOneTimeTotal = oneTimeCosts.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const finalOneTimeCost = rawOneTimeTotal * (1 + oneTimeMarkup / 100);

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

  // === Toggle Edit Pricing Mode ===
  const toggleEditPricing = () => {
    setEditPricingEnabled(!editPricingEnabled);
  };

  // === Handle Reset ===
  const handleReset = () => {
    setFreightVolume(0);
    setFreightMarkup(0);
    setFreightSKU('');
    setFreightOverride(false);

    setParcelVolume(0);
    setParcelMarkup(0);
    setParcelSKU('');
    setParcelOverride(false);

    setBillPayYesNo('No');
    setBillPayMarkup(0);

    setLocationsVolume(0);
    setLocationsMarkup(0);
    setLocationsSKU('');
    setLocationsOverride(false);

    setSupportPackageVolume(0);
    setSupportPackageMarkup(0);
    setSupportPackageSKU('');
    setSupportPackageOverride(false);

    setVendorPortalCount(0);
    setVendorPortalMarkup(0);

    setAuditingVolume(0);
    setAuditingMarkup(0);
    setAuditingSKU('');
    setAuditingOverride(false);

    setOceanTrackingVolume(0);
    setOceanTrackingMarkup(0);
    setOceanTrackingSKU('');
    setOceanTrackingOverride(false);

    setFleetRouteVolume(0);
    setFleetRouteMarkup(0);
    setFleetRouteSKU('');
    setFleetRouteOverride(false);

    setAssetManagementFacilities(0);
    setAssetManagementAssets(0);
    setAssetManagementMarkup(0);

    setDockSchedulingVolume(0);
    setDockSchedulingMarkup(0);
    setDockSchedulingSKU('');
    setDockSchedulingOverride(false);

    setGlobalMarkup(0);
    setMinSubscription(20000);
    setOneTimeMarkup(0);
    setOneTimeCosts([]);
    setSubBilling('annual');
  };

  const topSpacerHeight = '90px';

  return (
    <>
      <FixedHeader />
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
            <Card>
              <CardHeader
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <CardTitle>Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ marginRight: '10px' }}>
                    Minimum Subscription (Annual):
                  </label>
                  {editPricingEnabled ? (
                    <input
                      type='number'
                      value={minSubscription}
                      onChange={e => setMinSubscription(Number(e.target.value))}
                      style={{ width: '120px', ...inputStyle }}
                    />
                  ) : (
                    <span>{minSubscription}</span>
                  )}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ marginRight: '10px' }}>
                    Global Markup (%):
                  </label>
                  {editingAllMarkups ? (
                    <input
                      type='number'
                      value={globalMarkup}
                      onChange={e => setGlobalMarkup(Number(e.target.value))}
                      style={{ width: '80px', marginLeft: '10px' }}
                    />
                  ) : (
                    <span style={{ marginLeft: '10px' }}>{globalMarkup}%</span>
                  )}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ marginRight: '10px' }}>
                    One-Time Cost Markup (%):
                  </label>
                  {editingAllMarkups ? (
                    <input
                      type='number'
                      value={oneTimeMarkup}
                      onChange={e => setOneTimeMarkup(Number(e.target.value))}
                      style={{ width: '80px', marginLeft: '10px' }}
                    />
                  ) : (
                    <span style={{ marginLeft: '10px' }}>{oneTimeMarkup}%</span>
                  )}
                </div>
                {/* Detailed summary table (unchanged) */}
                {(() => {
                  const summaryRows = [
                    {
                      productName: 'Core TMS - Freight',
                      volume: freightVolume,
                      monthlyCost: freightAnnualCost / 12,
                      annualCost: freightAnnualCost,
                      planDetails: freightPlan
                        ? `${freightPlan.tier} (Incl: ${freightPlan.shipmentsIncluded})`
                        : 'N/A',
                      tierDetails: freightPlan
                        ? `Incl: ${freightPlan.shipmentsIncluded}, Over: $${freightPlan.costPerShipment}/shipment`
                        : '',
                      lineMarkup: freightMarkup,
                      hideIfZero: true,
                    },
                    {
                      productName: 'Core TMS - Parcel',
                      volume: parcelVolume,
                      monthlyCost: parcelAnnualCost / 12,
                      annualCost: parcelAnnualCost,
                      planDetails: parcelPlan
                        ? `${parcelPlan.tier} (Incl: ${parcelPlan.shipmentsIncluded})`
                        : 'N/A',
                      tierDetails: parcelPlan
                        ? `Incl: ${parcelPlan.shipmentsIncluded}, Over: $${parcelPlan.costPerShipment}/shipment`
                        : '',
                      lineMarkup: parcelMarkup,
                      hideIfZero: true,
                    },
                    {
                      productName: 'Ocean Tracking',
                      volume: oceanTrackingVolume,
                      monthlyCost: oceanTrackingAnnualCost / 12,
                      annualCost: oceanTrackingAnnualCost,
                      planDetails: oceanTrackingPlan
                        ? `${oceanTrackingPlan.tier} (Incl: ${oceanTrackingPlan.shipmentsIncluded})`
                        : 'N/A',
                      tierDetails: oceanTrackingPlan
                        ? `Incl: ${oceanTrackingPlan.shipmentsIncluded}, Over: $${oceanTrackingPlan.costPerShipment}/shipment`
                        : '',
                      lineMarkup: oceanTrackingMarkup,
                      hideIfZero: true,
                    },
                    {
                      productName: 'Locations',
                      volume: locationsVolume,
                      monthlyCost: locationsAnnualCost / 12,
                      annualCost: locationsAnnualCost,
                      planDetails: locationsPlan
                        ? `${locationsPlan.tier} (Range: ${locationsPlan.rangeStart}–${locationsPlan.rangeEnd})`
                        : 'N/A',
                      tierDetails: locationsPlan
                        ? `Range: ${locationsPlan.rangeStart}–${locationsPlan.rangeEnd}`
                        : '',
                      lineMarkup: locationsMarkup,
                      hideIfZero: false,
                    },
                    {
                      productName: 'Support Package',
                      volume: supportPackageVolume,
                      monthlyCost: supportPackageCostAnnual / 12,
                      annualCost: supportPackageCostAnnual,
                      planDetails: supportPackagePlan
                        ? `${supportPackagePlan.tier} (Range: ${
                            supportPackagePlan.rangeStart
                          }–${
                            supportPackagePlan.rangeEnd === Infinity
                              ? '+'
                              : supportPackagePlan.rangeEnd
                          })`
                        : 'N/A',
                      tierDetails: supportPackagePlan
                        ? `Range: ${supportPackagePlan.rangeStart}–${
                            supportPackagePlan.rangeEnd === Infinity
                              ? '+'
                              : supportPackagePlan.rangeEnd
                          }`
                        : '',
                      lineMarkup: supportPackageMarkup,
                      hideIfZero: true,
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
                      planDetails: auditingPlan
                        ? `${auditingPlan.tier} (Range: ${
                            auditingPlan.range[0]
                          }–${
                            auditingPlan.range[1] === Infinity
                              ? '+'
                              : auditingPlan.range[1]
                          })`
                        : 'N/A',
                      tierDetails: auditingPlan
                        ? `Range: ${auditingPlan.range[0]}–${
                            auditingPlan.range[1] === Infinity
                              ? '+'
                              : auditingPlan.range[1]
                          }`
                        : '',
                      lineMarkup: auditingMarkup,
                      hideIfZero: true,
                    },
                    {
                      productName: 'Fleet Route Optimization',
                      volume: fleetRouteVolume,
                      monthlyCost: fleetRouteEffectiveAnnual / 12,
                      annualCost: fleetRouteEffectiveAnnual,
                      planDetails: fleetRoutePlan
                        ? `${fleetRoutePlan.tier} (Range: ${fleetRoutePlan.range[0]}–${fleetRoutePlan.range[1]})`
                        : 'N/A',
                      tierDetails: fleetRoutePlan
                        ? `Range: ${fleetRoutePlan.range[0]}–${fleetRoutePlan.range[1]}`
                        : '',
                      lineMarkup: fleetRouteMarkup,
                      hideIfZero: true,
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
                      planDetails: dockSchedulingPlan
                        ? `${dockSchedulingPlan.tier} (Range: ${
                            dockSchedulingPlan.rangeStart
                          }–${
                            dockSchedulingPlan.rangeEnd === Infinity
                              ? '+'
                              : dockSchedulingPlan.rangeEnd
                          })`
                        : 'N/A',
                      tierDetails: dockSchedulingPlan
                        ? `Range: ${dockSchedulingPlan.rangeStart}–${
                            dockSchedulingPlan.rangeEnd === Infinity
                              ? '+'
                              : dockSchedulingPlan.rangeEnd
                          }`
                        : '',
                      lineMarkup: dockSchedulingMarkup,
                      hideIfZero: true,
                    },
                  ];
                  const visibleSummaryRows = summaryRows.filter(row => {
                    if (typeof row.volume === 'number') {
                      return row.volume !== 0;
                    }
                    return true;
                  });
                  return (
                    <>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '16px',
                        }}
                      >
                        <thead style={stickyHeaderStyle}>
                          <tr style={{ background: '#f8f8f8' }}>
                            <th
                              style={{ ...tableThStyle, ...firstColumnStyle }}
                            >
                              Product Name
                            </th>
                            <th style={tableThStyle}>Monthly Volume/Count</th>
                            <th style={tableThStyle}>Monthly Cost</th>
                            <th style={tableThStyle}>Annual Cost</th>
                            <th style={tableThStyle}>Plan Details</th>
                            <th style={tableThStyle}>Tier Details</th>
                            <th style={tableThStyle}>Line Markup (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleSummaryRows.map((row, idx) => (
                            <tr
                              key={idx}
                              style={
                                row.planDetails.includes('Custom Pricing')
                                  ? { backgroundColor: '#ffcccc' }
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
                              <td style={tableTdStyle}>
                                {formatCost(row.monthlyCost)}
                              </td>
                              <td style={tableTdStyle}>
                                {formatCost(row.annualCost)}
                              </td>
                              <td style={tableTdStyle}>{row.planDetails}</td>
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
                          <tr
                            style={{
                              background: '#e0e0e0',
                              fontWeight: 'bold',
                            }}
                          >
                            <td style={tableTdStyle}>Subscription Total</td>
                            <td style={tableTdStyle}></td>
                            <td style={tableTdStyle}>
                              {formatCost(finalSubscriptionMonthly)}
                            </td>
                            <td style={tableTdStyle}>
                              {formatCost(finalSubscriptionAnnual)}
                            </td>
                            <td style={tableTdStyle} colSpan={2}></td>
                            <td style={tableTdStyle}></td>
                          </tr>
                          {neededToMinAnnual > 0 && (
                            <tr>
                              <td
                                style={{ ...tableTdStyle, color: 'red' }}
                                colSpan={7}
                              >
                                Below Minimum: Need{' '}
                                {formatCost(neededToMinAnnual)} more annually (
                                {formatCost(neededToMinMonthly)} monthly)
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td style={tableTdStyle}>
                              One-Time Costs (with markup)
                            </td>
                            <td style={tableTdStyle} colSpan={4}></td>
                            <td style={tableTdStyle}></td>
                            <td style={tableTdStyle}>
                              {formatCost(finalOneTimeCost)}
                            </td>
                          </tr>
                          <tr
                            style={{
                              background: '#e0e0e0',
                              fontWeight: 'bold',
                            }}
                          >
                            <td style={tableTdStyle}>Grand Total</td>
                            <td style={tableTdStyle} colSpan={4}></td>
                            <td style={tableTdStyle}></td>
                            <td style={tableTdStyle}>
                              {formatCost(finalGrandTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {customPricingPresent && (
                        <div
                          style={{
                            color: 'red',
                            marginTop: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          Please get management approval before sending quote to
                          customer.
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
                <CardTitle>Shipments, Volumes, and Other Counts</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ marginRight: '10px' }}>
                    Billing Frequency:
                  </label>
                  <select
                    value={subBilling}
                    onChange={e => setSubBilling(e.target.value)}
                    style={{ ...selectStyle, marginRight: '20px' }}
                  >
                    <option value='annual'>Annual</option>
                    <option value='monthly'>Monthly</option>
                  </select>
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '16px',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#4088cf', color: '#fff' }}>
                      <th style={{ ...tableThStyle, ...firstColumnStyle }}>
                        Product Type
                      </th>
                      <th style={tableThStyle}>Product Plan Description</th>
                      <th style={tableThStyle}>Tier Selection</th>
                      <th style={tableThStyle}>Monthly Volume/Count</th>
                      <th style={tableThStyle}>Monthly Cost</th>
                      <th style={tableThStyle}>Annual Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        productType: 'Core TMS - Freight',
                        planDescription: freightPlan
                          ? `${freightPlan.tier} (Incl: ${freightPlan.shipmentsIncluded})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? freightAnnualSKUs
                            : freightMonthlySKUs,
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
                      },
                      {
                        productType: 'Core TMS - Parcel',
                        planDescription: parcelPlan
                          ? `${parcelPlan.tier} (Incl: ${parcelPlan.shipmentsIncluded})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? parcelAnnualSKUs
                            : parcelMonthlySKUs,
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
                      },
                      {
                        productType: 'Ocean Tracking',
                        planDescription: oceanTrackingPlan
                          ? `${oceanTrackingPlan.tier} (Incl: ${oceanTrackingPlan.shipmentsIncluded})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? oceanTrackingAnnualSKUs
                            : oceanTrackingMonthlySKUs,
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
                      },
                      {
                        productType: 'Bill Pay',
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
                        planDescription: locationsPlan
                          ? `${locationsPlan.tier} (Range: ${locationsPlan.rangeStart}–${locationsPlan.rangeEnd})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? locationsAnnualSKUs
                            : locationsMonthlySKUs,
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
                      },
                      {
                        productType: 'Support Package',
                        planDescription: supportPackagePlan
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
                            ? supportPackageAnnualSKUs
                            : supportPackageMonthlySKUs,
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
                      },
                      {
                        productType: 'Vendor Portals',
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
                        planDescription: auditingPlan
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
                            ? auditingAnnualSKUs
                            : auditingMonthlySKUs,
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
                      },
                      {
                        productType: 'Fleet Route Optimization',
                        planDescription: fleetRoutePlan
                          ? `${fleetRoutePlan.tier} (Range: ${fleetRoutePlan.range[0]}–${fleetRoutePlan.range[1]})`
                          : 'N/A',
                        tierOptions:
                          subBilling === 'annual'
                            ? fleetRouteOptimizationAnnualSKUs
                            : fleetRouteOptimizationMonthlySKUs,
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
                      },
                      {
                        productType: 'Yard Management',
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
                        planDescription: dockSchedulingPlan
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
                            ? dockSchedulingAnnualSKUs
                            : dockSchedulingMonthlySKUs,
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
                      },
                    ].map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ ...tableTdStyle, ...firstColumnStyle }}>
                          {row.productType}
                        </td>
                        <td style={tableTdStyle}>{row.planDescription}</td>
                        <td style={tableTdStyle}>
                          {row.tierOptions && row.tierOptions.length > 0 ? (
                            editPricingEnabled ? (
                              <select
                                value={row.selectedSKU}
                                onChange={e => row.onSKUChange(e.target.value)}
                                style={selectStyle}
                              >
                                {row.tierOptions.map(opt => (
                                  <option key={opt.sku} value={opt.sku}>
                                    {opt.tier}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>Locked</span>
                            )
                          ) : (
                            'N/A'
                          )}
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
                          ) : (
                            <input
                              type='number'
                              value={row.volumeCount}
                              onChange={e => row.onVolumeChange(e)}
                              style={inputStyle}
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
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* One-Time Costs Table */}
            <Card>
              <CardHeader>
                <CardTitle>One-Time Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '16px',
                  }}
                >
                  <thead style={stickyHeaderStyle}>
                    <tr style={{ background: '#f8f8f8' }}>
                      <th style={tableThStyle}>Name</th>
                      <th style={tableThStyle}>Description</th>
                      <th style={tableThStyle}>Amount</th>
                      <th style={tableThStyle}>Action</th>
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
                            style={{ width: '120px', padding: '6px' }}
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
                            style={{ width: '250px', padding: '6px' }}
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
                            style={{ width: '100px', padding: '6px' }}
                          />
                        </td>
                        <td style={tableTdStyle}>
                          <button
                            onClick={() =>
                              setOneTimeCosts(
                                oneTimeCosts.filter((_, i) => i !== index)
                              )
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() =>
                    setOneTimeCosts([
                      ...oneTimeCosts,
                      { name: '', description: '', amount: 0 },
                    ])
                  }
                  style={{
                    marginTop: '10px',
                    padding: '8px',
                    border: 'none',
                    borderRadius: '4px',
                    background: '#4088cf',
                    color: '#fff',
                  }}
                >
                  Add Custom One-Time Cost
                </button>
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
          background: 'linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.95))',
          borderTop: '2px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1001,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={toggleEditPricing}
          style={{
            padding: '12px 24px',
            background: editPricingEnabled 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          {editPricingEnabled ? '🔒 Lock Pricing' : '✏️ Edit Pricing'}
        </button>
        <button
          onClick={() => setEditingAllMarkups(!editingAllMarkups)}
          style={{
            padding: '12px 24px',
            background: editingAllMarkups
              ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          {editingAllMarkups ? '💾 Save Markups' : '📊 Edit Markups'}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          🔄 Reset All
        </button>
        <button
          onClick={() => setShowCustomerView(!showCustomerView)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          {showCustomerView ? '📋 Show Detailed' : '👤 Customer View'}
        </button>
      </div>
    </>
  );
};

export default App;

