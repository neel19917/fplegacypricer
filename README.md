# 🚀 FreightPOP Legacy Pricer - Quote Builder

**Version:** 2.1.0 "Marble"  
**Released:** November 5, 2025  
**Status:** ✅ Stable Production

A professional quote builder application for FreightPOP's transportation management system products and services.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Product Structure](#product-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)

---

## 🌟 Overview

The FreightPOP Legacy Pricer is a sophisticated quote building tool that allows sales representatives to:
- Configure product packages based on customer needs
- Calculate pricing across multiple product tiers
- Apply markups and minimum subscription requirements
- Generate professional quotes for customers
- Export quotes as PNG images

### ✨ What's New in v2.1.0 "Marble"

- 💾 **CSV-Based Pricing** - All pricing loaded from CSV file
- 📁 **Complete Database** - 108 SKUs across all products
- ⚡ **Zero Code Updates** - Edit CSV → Deploy → Done
- 🔄 **Auto Fallback** - Uses hardcoded SKUs if CSV fails
- 🚀 **Fast Loading** - Optimized CSV parsing

👉 **See full release notes:** [CSV_IMPLEMENTATION_SUMMARY.md](./CSV_IMPLEMENTATION_SUMMARY.md)

### Previous Releases

**v2.0.0 "Granite"** (November 5, 2025)
- 📦 **9 Granular Pricing Models** - Better organization and categorization
- 🔍 **Advanced Filtering & Search** - Find products instantly
- 💾 **CSV Import/Export** - Manage pricing in Excel/Sheets
- 🏷️ **Version Tracking** - Track changes across releases

👉 **See release notes:** [RELEASE_NOTES_v2.0.0.md](./RELEASE_NOTES_v2.0.0.md)

### Built With

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **html2canvas** - PNG export functionality
- **Config-driven architecture** - Easy product management

---

## ✨ Features

### 📊 Product Management

- **11 Products** across 4 categories
  - Core TMS (Freight, Parcel, Ocean Tracking)
  - Add-Ons (Bill Pay, Vendor Portals)
  - Advanced Modules (Auditing, Fleet Route, Yard Management, Dock Scheduling)
  - Infrastructure (Locations, Support Package)

- **4 Pricing Models**
  - Volume-based with overage charges
  - Fixed tiered pricing
  - Calculated/formula-based pricing
  - Custom multi-input pricing

- **Auto-Tier Selection** - Automatically selects appropriate pricing tier based on volume

### 💰 Quote Building

- **Dual Billing Options** - Annual and monthly billing frequencies
- **Flexible Markup System**
  - Individual product markups
  - Global subscription markup
  - One-time cost markup
- **Minimum Subscription** - Configurable minimum annual subscription
- **One-Time Costs** - Custom line items for implementation and setup

### 🎨 Professional UI

- **Clean, modern design** with professional color scheme
- **Responsive tables** with sticky headers
- **Real-time cost updates** as inputs change
- **Customer view** mode for client presentations
- **PNG export** with formatted filename

### 🔧 Advanced Features

- **Edit mode** - Lock/unlock pricing tier selection
- **Markup editing** - Toggle between view and edit modes
- **Reset functionality** - Clear all inputs and start over
- **URL parameters** - Load saved quotes via URL
- **Custom pricing warnings** - Alerts for management approval

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/neel19917/fplegacypricer.git
cd fplegacypricer
git checkout beta
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open browser**
```
http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📦 Product Structure

### Pricing Types

| Type | Description | Products | Calculation |
|------|-------------|----------|-------------|
| **Volume** | Tiered with overage | Freight, Parcel, Ocean, Docks | Base + overage charges |
| **Fixed** | Tiered, no overage | Locations, Auditing, Support, Fleet | Fixed cost per tier |
| **Calculated** | Formula-based | Bill Pay, Vendor Portals | Custom formula |
| **Custom** | Multi-input | Yard Management | Multiple inputs × rates |

### Product Categories

```
🚚 Core TMS
   ├─ Freight (Volume-based)
   ├─ Parcel (Volume-based)
   └─ Ocean Tracking (Volume-based)

🔧 Add-Ons
   ├─ Bill Pay (Calculated)
   └─ Vendor Portals (Calculated)

⚙️ Advanced Modules
   ├─ Auditing Module (Fixed)
   ├─ Fleet Route Optimization (Fixed)
   ├─ Yard Management (Custom)
   └─ Dock Scheduling (Volume-based)

🏢 Infrastructure & Support
   ├─ Locations (Fixed)
   └─ Support Package (Fixed)
```

---

## 📚 Documentation

Comprehensive documentation is available in the repository:

| Document | Description |
|----------|-------------|
| **[RELEASE_NOTES_v2.0.0.md](RELEASE_NOTES_v2.0.0.md)** | 🆕 Full release notes for v2.0.0 "Granite" |
| **[CSV_IMPORT_EXPORT_GUIDE.md](CSV_IMPORT_EXPORT_GUIDE.md)** | 🆕 Complete guide for CSV pricing management |
| **[PHASE1_IMPLEMENTATION_SUMMARY.md](PHASE1_IMPLEMENTATION_SUMMARY.md)** | 🆕 Technical implementation details |
| **[SUMMARY.md](SUMMARY.md)** | Executive summary of analysis and deliverables |
| **[PRODUCT_MANAGEMENT_GUIDE.md](PRODUCT_MANAGEMENT_GUIDE.md)** | Complete guide for adding/managing products |
| **[ARCHITECTURE_ANALYSIS.md](ARCHITECTURE_ANALYSIS.md)** | Technical deep-dive into system architecture |
| **[VISUAL_GUIDE.md](VISUAL_GUIDE.md)** | Visual diagrams and flowcharts |

### Quick Links

- [How to Add a Product](PRODUCT_MANAGEMENT_GUIDE.md#how-to-add-a-new-product)
- [Pricing Type Decision Guide](VISUAL_GUIDE.md#pricing-type-decision-tree)
- [Configuration Reference](PRODUCT_MANAGEMENT_GUIDE.md#product-configuration-options)
- [Architecture Overview](ARCHITECTURE_ANALYSIS.md#current-structure-analysis)

---

## 🛠️ Development

### Project Structure

```
/LegacyPricer/
├── src/
│   ├── App.jsx                  # Main application component
│   ├── productConfig.js         # Product configuration system
│   ├── skus.js                  # SKU pricing data
│   ├── index.jsx                # React entry point
│   ├── style.css                # Global styles
│   └── ErrorBoundary.jsx        # Error handling
│
├── SUMMARY.md                   # Executive summary
├── PRODUCT_MANAGEMENT_GUIDE.md  # Product management guide
├── ARCHITECTURE_ANALYSIS.md     # Technical analysis
├── VISUAL_GUIDE.md              # Visual documentation
│
├── defaultPricing.csv           # Reference pricing data
├── package.json                 # Dependencies
├── vite.config.js               # Vite configuration
└── index.html                   # HTML entry point
```

### Key Files

#### `src/productConfig.js`
Centralized product configuration system:
- Product definitions
- Category definitions
- Helper functions
- Pricing logic

#### `src/skus.js`
Pricing tier data for all products:
- Annual SKUs
- Monthly SKUs
- Tier ranges and costs

#### `src/App.jsx`
Main React component:
- State management
- Cost calculations
- UI rendering
- User interactions

---

## 🔌 Adding a New Product

### Quick Example

**1. Add SKUs to `src/skus.js`:**
```javascript
export const myProductAnnualSKUs = [
  {
    sku: 'FP2001',
    tier: 'Basic',
    rangeStart: 1,
    rangeEnd: 10,
    perMonthCost: 500,
    annualCost: 6000,
  },
  // ... more tiers
];
```

**2. Add to `src/productConfig.js`:**
```javascript
{
  id: 'myProduct',
  name: 'My Product',
  category: 'modules',
  pricingType: 'fixed',
  description: (plan) => plan ? `${plan.tier}` : 'N/A',
  tierDetails: (plan) => plan ? `Range: ${plan.rangeStart}–${plan.rangeEnd}` : '',
  skus: {
    annual: myProductAnnualSKUs,
    monthly: myProductMonthlySKUs,
  },
  defaultVolume: 0,
  volumeLabel: 'Count',
  includeInMinimum: true,
  canOverride: true,
  order: 12,
}
```

**3. Done!** ✅ Product automatically appears in UI

For detailed instructions, see [PRODUCT_MANAGEMENT_GUIDE.md](PRODUCT_MANAGEMENT_GUIDE.md)

---

## 🎯 Usage Guide

### Basic Workflow

1. **Select Billing Frequency**
   - Annual (lower rates, better value)
   - Monthly (higher rates, more flexibility)

2. **Enter Product Volumes**
   - Enter shipments/month for volume-based products
   - Enter counts for other products
   - System auto-selects appropriate tiers

3. **Review Quote Summary**
   - Check calculated costs
   - Verify tier selections
   - Review totals and minimums

4. **Adjust Markups** (Optional)
   - Click "Edit Markups"
   - Adjust individual product markups
   - Set global markup percentage

5. **Add One-Time Costs** (Optional)
   - Click "Add One-Time Cost"
   - Enter name, description, and amount
   - Apply one-time markup if needed

6. **Export Quote**
   - Enter company name, rep name, and date
   - Click "Download Entire Page as PNG"
   - Quote exports with formatted filename

### Advanced Features

- **Edit Pricing Mode**: Manually override auto-selected tiers
- **Customer View**: Simplified view for customer presentations
- **Reset**: Clear all inputs and start fresh
- **URL Parameters**: Save and share quote configurations

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Volume-based products calculate correctly
- [ ] Fixed tiered products select correct tier
- [ ] Calculated products update based on dependencies
- [ ] Custom input products calculate correctly
- [ ] Markups apply properly at all levels
- [ ] Minimum subscription enforces correctly
- [ ] Billing frequency changes update all products
- [ ] One-time costs calculate and display
- [ ] PNG export works with proper naming
- [ ] Customer view displays correct data

---

## 📊 Metrics

| Metric | Value |
|--------|-------|
| **Total Products** | 11 |
| **Categories** | 4 |
| **Pricing Tiers** | 50+ across all products |
| **Supported Volumes** | 1 to Infinity |
| **Code Lines** | ~2,400 (App.jsx) |
| **Documentation** | ~2,000+ lines |

---

## 🤝 Contributing

### Adding New Products

1. Review [PRODUCT_MANAGEMENT_GUIDE.md](PRODUCT_MANAGEMENT_GUIDE.md)
2. Add SKUs to `src/skus.js`
3. Add product config to `src/productConfig.js`
4. Test thoroughly
5. Update documentation if needed
6. Submit PR to `beta` branch

### Code Style

- Use ES6+ syntax
- Follow existing patterns
- Comment complex logic
- Keep functions focused and small
- Use descriptive variable names

---

## 🐛 Troubleshooting

### Common Issues

**Product not showing in tables?**
- Check `order` field in product config
- Verify `category` ID is correct
- Ensure volume > 0 (if `hideIfZero: true`)

**Pricing calculation wrong?**
- Verify `pricingType` is correct
- Check SKU data for typos
- Review `calculation` function logic
- Test with different volumes

**Tier not auto-selecting?**
- Check `rangeStart`/`rangeEnd` values
- Verify volume falls within range
- Check for overlapping ranges
- Review `findSKUByVolume()` logic

---

## 📞 Support

For questions or issues:
1. Check [PRODUCT_MANAGEMENT_GUIDE.md](PRODUCT_MANAGEMENT_GUIDE.md)
2. Review [ARCHITECTURE_ANALYSIS.md](ARCHITECTURE_ANALYSIS.md)
3. Check [VISUAL_GUIDE.md](VISUAL_GUIDE.md) for diagrams
4. Open an issue on GitHub

---

## 📄 License

Proprietary - FreightPOP Internal Use Only

---

## 🙏 Acknowledgments

- Built for FreightPOP sales team
- Designed for ease of use and professional quotes
- Config-driven architecture for easy maintenance

---

## 📈 Roadmap

### Completed ✅
- [x] Product configuration system
- [x] Comprehensive documentation
- [x] Professional UI design
- [x] Category-based grouping
- [x] Multiple pricing types support

### In Progress 🚧
- [ ] Refactor App.jsx to use productConfig
- [ ] Create useProductState hook
- [ ] Add product management UI

### Planned 📋
- [ ] Product search/filter
- [ ] CSV import/export
- [ ] Product templates
- [ ] Admin dashboard
- [ ] Historical quote tracking

---

## 🔗 Links

- **Repository**: https://github.com/neel19917/fplegacypricer
- **Branch**: `beta`
- **Dev Server**: http://localhost:5173

---

**Version**: 1.0  
**Last Updated**: November 3, 2025  
**Maintained By**: FreightPOP Development Team

