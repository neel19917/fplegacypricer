# Release Notes - Version 2.3.6 "Opal"

**Release Date:** November 6, 2025  
**Release Name:** Opal  
**Status:** ✅ Stable Production

---

## 🎯 Overview

Version 2.3.6 introduces critical bug fixes and enhanced tier validation to ensure accurate pricing and better user experience. This release fixes a critical issue where parcel tiers weren't pulling correctly from the pricing JSON file and adds automatic red highlighting for volumes that exceed tier limits.

---

## 🐛 Critical Bug Fixes

### Fixed Parcel Tiers Not Loading from JSON
**Issue:** Parcel tiers were not correctly pulling from `pricing.json` because the SKU selection logic was using hardcoded SKUs from `productConfig.js` instead of the loaded JSON data.

**Solution:**
- Updated `findSKUForProduct` function to accept SKU array directly from `skuData` instead of reading from `product.skus`
- Added product ID to SKU data key mapping in the auto-selection effect
- Added `skuData` as a dependency so SKU selection updates when JSON loads

**Impact:** All products now correctly use pricing data from `pricing.json`, ensuring pricing updates are reflected immediately without code changes.

---

## ✨ New Features

### Automatic Tier Validation & Red Highlighting
**What it does:** Automatically detects when shipment volumes exceed tier limits and highlights them in red with clear error messages.

**How it works:**
- Detects volumes below minimum tier
- Detects volumes above maximum tier  
- Detects volumes that fall between tier gaps (no matching tier)
- Returns `'CUSTOM_PRICING'` SKU for any mismatch
- Applies red highlighting to product rows
- Shows "Volume exceeds tier limits - Custom Pricing Required" message

**Visual Indicators:**
- 🔴 Light red background (#fee2e2) on affected rows
- 🔴 Red left border (#dc2626) for emphasis
- 🔴 Red text for error messages
- 🔴 Red borders on input fields
- 💰 "Request Quote" or "Custom Pricing" in cost columns

**Products Affected:**
- ✅ Core TMS - Freight
- ✅ Core TMS - Parcel
- ✅ Ocean Tracking
- ✅ Locations
- ✅ Support Package
- ✅ Auditing Module
- ✅ Fleet Route Optimization
- ✅ Dock Scheduling

---

## 🔧 Technical Improvements

### Enhanced SKU Selection Logic
- **Before:** Used hardcoded `product.skus` from `productConfig.js`
- **After:** Uses loaded `skuData` from `pricing.json`
- **Benefit:** Pricing updates in JSON are immediately reflected without code changes

### Improved Tier Detection
- Detects three scenarios:
  1. Volume below minimum tier range
  2. Volume above maximum tier range
  3. Volume between tier gaps (no matching tier)
- All scenarios trigger custom pricing with appropriate console warnings

### Enhanced Debug Logging
- Shows SKU array length for troubleshooting
- Displays first and last SKU details
- Logs product ID, volume, billing frequency, and selected SKU
- Helps identify pricing data issues quickly

---

## 📊 Impact Summary

| Category | Impact |
|----------|--------|
| **Bug Fixes** | 1 critical fix (parcel tiers) |
| **New Features** | Automatic tier validation for all products |
| **Products Enhanced** | 8 products now have custom pricing detection |
| **User Experience** | Clear visual indicators when custom pricing needed |
| **Data Accuracy** | All products now use JSON pricing data |

---

## 🎨 User Experience Improvements

### Before
- Parcel tiers might show incorrect pricing
- No visual indication when volumes exceed tiers
- Users might not realize custom pricing is needed

### After
- ✅ All tiers correctly pull from JSON
- ✅ Automatic red highlighting for tier exceedances
- ✅ Clear error messages: "Volume exceeds tier limits - Custom Pricing Required"
- ✅ Consistent error handling across all products
- ✅ "Request Quote" shown in cost columns

---

## 🔍 Testing Recommendations

### Test Scenarios
1. **Normal Volumes:** Enter volumes within tier ranges - should show normal pricing
2. **Below Minimum:** Enter volume below first tier - should highlight in red
3. **Above Maximum:** Enter volume above last tier - should highlight in red
4. **Between Tiers:** Enter volume in gap between tiers - should highlight in red
5. **Parcel Specific:** Test parcel with various volumes - should pull correct tiers from JSON

### Verification Checklist
- [ ] Parcel tiers pull correctly from `pricing.json`
- [ ] Red highlighting appears when volumes exceed tiers
- [ ] Error messages display correctly
- [ ] All products show custom pricing detection
- [ ] Console logs show correct SKU selection
- [ ] Quote summary reflects custom pricing status

---

## 📝 Developer Notes

### Code Changes
- **File:** `src/utils/skuHelpers.js`
  - Updated `findSKUForProduct` function signature
  - Enhanced tier validation logic
  
- **File:** `src/App.jsx`
  - Updated SKU auto-selection to use `skuData`
  - Added product ID to SKU data mapping
  - Added custom pricing detection to all product rows
  - Enhanced debug logging

### Breaking Changes
- None - backward compatible

### Migration Notes
- No migration required
- Existing quotes will continue to work
- JSON pricing updates will be automatically reflected

---

## 🚀 Deployment

### Pre-Deployment Checklist
- [x] All tests passing
- [x] No linter errors
- [x] Version number updated
- [x] Changelog updated
- [x] Release notes created

### Post-Deployment Verification
- [ ] Verify parcel tiers load correctly
- [ ] Test red highlighting with various volumes
- [ ] Confirm error messages display properly
- [ ] Check console for any warnings

---

## 📚 Related Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Complete changelog
- [README.md](./README.md) - Project documentation
- [pricing.json](./public/pricing.json) - Pricing data structure

---

## 🙏 Acknowledgments

Thank you to the sales team for reporting the parcel tiers issue and providing feedback on the custom pricing detection feature.

---

**Next Release:** Version 2.3.7 (Planned)  
**Questions?** Contact the development team or open an issue on GitHub.

