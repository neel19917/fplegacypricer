# CSV Import/Export Guide

**Last Updated:** November 5, 2025  
**Feature:** Pricing Data Management via CSV

---

## Overview

The CSV Import/Export feature allows you to manage pricing data using spreadsheet software like Excel, Google Sheets, or any text editor. This makes bulk updates quick and easy without needing to modify code.

---

## How It Works

### 🔄 Workflow

```
1. Export current pricing → CSV file
2. Edit CSV in Excel/Sheets
3. Import updated CSV → New pricing applied
4. Page auto-reloads with new data
```

---

## Features

### ⬇️ Export to CSV
- Downloads all current pricing data as a CSV file
- File includes: Products, SKUs, Tiers, Prices, Ranges
- Filename format: `pricing_data_YYYY-MM-DD.csv`
- Opens in Excel, Google Sheets, or any CSV editor

### ⬆️ Import from CSV
- Upload modified CSV file
- Validates and parses pricing data
- Stores changes in browser localStorage
- Shows success/error messages
- Suggests page reload to apply changes

### 💾 Data Persistence
- Imported data saved to browser localStorage
- Persists across page reloads
- Easy to clear and reset if needed

---

## CSV Format

### Column Structure

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| Product | Product name identifier | Freight | ✅ Yes |
| SKU | Unique SKU identifier | FP1001 | ✅ Yes |
| Tier | Plan tier name | Starter | ✅ Yes |
| Billing | annual or monthly | annual | ✅ Yes |
| Monthly Cost | Cost per month | 830 | ✅ Yes |
| Annual Cost | Total annual cost | 9960 | ✅ Yes |
| Range Start | Minimum volume | 1 | ⚠️ Conditional |
| Range End | Maximum volume (or Infinity) | 100 | ⚠️ Conditional |
| Shipments Included | Volume included in plan | 100 | ⚠️ Conditional |
| Cost Per Unit | Overage cost per unit | 8.30 | ⚠️ Conditional |
| Notes | Optional notes/comments | | ❌ No |

### Product Names

Use these exact product names in the CSV:

| Product Name | Description |
|--------------|-------------|
| `Freight` | Freight Shipments |
| `Parcel` | Parcel Shipments |
| `Ocean` | Ocean Tracking |
| `Locations` | Location Tiers |
| `Support` | Support Packages |
| `Auditing` | Auditing Module |
| `FleetRoute` | Fleet Route Optimization |
| `DockScheduling` | Dock Scheduling |

---

## Step-by-Step Guide

### 📤 Exporting Pricing Data

1. **Click "Export to CSV"** button in Product Configuration section
2. **Save the file** to your computer
3. **Open in Excel/Google Sheets** to edit

### ✏️ Editing the CSV

#### In Excel:
1. Open the downloaded CSV file
2. Edit prices, tiers, ranges as needed
3. **Save as CSV** (not XLSX!)
4. Close Excel

#### In Google Sheets:
1. Upload CSV to Google Sheets
2. Edit values
3. **File → Download → CSV**
4. Save to your computer

### 📥 Importing Updated Pricing

1. **Click "Import from CSV"** button
2. **Select your edited CSV file**
3. **Wait for success message**
4. **Reload the page** to apply changes

---

## Example Edits

### Scenario 1: Update Prices Across All Tiers

**Before:**
```csv
Product,SKU,Tier,Billing,Monthly Cost,Annual Cost,...
Freight,FP1001,Starter,annual,830,9960,...
Freight,FP1002,Pro,annual,1438,17256,...
```

**After (10% increase):**
```csv
Product,SKU,Tier,Billing,Monthly Cost,Annual Cost,...
Freight,FP1001,Starter,annual,913,10956,...
Freight,FP1002,Pro,annual,1582,18982,...
```

### Scenario 2: Add New Tier

```csv
Product,SKU,Tier,Billing,Monthly Cost,Annual Cost,Range Start,Range End,...
Freight,FP1010,Enterprise 10,annual,15000,180000,10001,15000,...
```

### Scenario 3: Adjust Volume Ranges

**Before:**
```csv
...,Range Start,Range End,Shipments Included
...,101,250,250
```

**After:**
```csv
...,Range Start,Range End,Shipments Included
...,101,300,300
```

---

## Tips & Best Practices

### ✅ Do's

- **Always export first** - Start with current data
- **Use proper CSV format** - Excel/Sheets can auto-save as CSV
- **Test with small changes** - Try one product first
- **Keep backups** - Save old CSV files before importing new ones
- **Double-check prices** - Verify calculations before importing
- **Use Excel formulas** - Calculate bulk updates easily

### ❌ Don'ts

- **Don't use XLSX format** - Must be CSV (comma-separated)
- **Don't delete columns** - Keep all columns even if empty
- **Don't change product names** - Use exact names from export
- **Don't use special characters** - Keep SKUs alphanumeric
- **Don't skip required fields** - Fill in all mandatory columns

---

## Troubleshooting

### Issue: Import fails with error

**Solution:**
1. Check CSV format (should be comma-separated)
2. Verify all required columns are present
3. Check for special characters or quotes
4. Re-export and compare structure

### Issue: Changes don't appear after reload

**Solution:**
1. Hard reload: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check browser console for errors
4. Verify CSV was imported successfully (look for success message)

### Issue: Excel corrupts CSV format

**Solution:**
1. Use "Save As" → "CSV UTF-8"
2. Or edit in Google Sheets and download as CSV
3. Or use a text editor (VS Code, Notepad++)

### Issue: Some products missing after import

**Solution:**
1. Check product names match exactly (case-sensitive)
2. Verify CSV includes both annual and monthly SKUs
3. Re-export to see correct format

---

## Advanced Usage

### Bulk Price Updates with Excel

```excel
// Column formula to increase all prices by 10%
=ROUND(D2 * 1.1, 2)

// Copy formula down the entire column
```

### Version Control

Create dated backups:
```
pricing_data_2025-11-05_original.csv
pricing_data_2025-11-05_updated.csv
pricing_data_2025-11-05_v2.csv
```

### CSV Editing Tools

**Recommended:**
- Microsoft Excel (best for formulas)
- Google Sheets (collaboration)
- VS Code (precise editing)
- LibreOffice Calc (free alternative)

---

## Future Enhancements

### Coming Soon:
- ⏱️ **Auto-reload** - Watch CSV file for changes
- 📁 **File-based source** - Load from `/public/pricing.csv`
- 🔄 **Hot reload** - Update without page refresh
- 📊 **Validation** - More robust error checking
- 📝 **Change log** - Track pricing history

---

## Technical Details

### Data Storage

- **Location:** Browser localStorage
- **Key:** `importedSKUs`
- **Format:** JSON string
- **Persistence:** Until cleared

### Clear Imported Data

Open browser console and run:
```javascript
localStorage.removeItem('importedSKUs');
location.reload();
```

### Export Function

```javascript
// Exports all SKUs to CSV format
const csvContent = exportSKUsToCSV();
downloadCSV(csvContent, 'pricing_data.csv');
```

### Import Function

```javascript
// Parses CSV and stores in localStorage
const parsedData = parseCSV(csvText);
const skusByProduct = csvToSKUs(parsedData);
localStorage.setItem('importedSKUs', JSON.stringify(skusByProduct));
```

---

## FAQ

### Q: Will imports affect my original code?

**A:** No! Imports are stored in browser localStorage and don't modify any source files. Clear localStorage to revert to original pricing.

### Q: Can multiple users share the same CSV?

**A:** Yes! Export from one browser, edit, and import into another. Great for team collaboration.

### Q: What happens if I import invalid data?

**A:** The app will show an error message and won't apply the changes. Your current pricing remains intact.

### Q: Can I add new products via CSV?

**A:** Not yet. Currently only updates existing products. New products require code changes.

### Q: How do I revert to original pricing?

**A:** Either clear localStorage (see Technical Details) or don't import a CSV - the app defaults to hardcoded pricing.

---

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review error messages in browser console
3. Re-export to verify correct CSV structure
4. Contact your developer/admin

---

## Quick Reference Card

```
┌─────────────────────────────────────┐
│  CSV IMPORT/EXPORT QUICK GUIDE      │
├─────────────────────────────────────┤
│  📤 EXPORT                          │
│   1. Click "Export to CSV"          │
│   2. Save file                      │
│                                      │
│  ✏️  EDIT                            │
│   1. Open in Excel/Sheets           │
│   2. Modify pricing                 │
│   3. Save as CSV                    │
│                                      │
│  📥 IMPORT                          │
│   1. Click "Import from CSV"        │
│   2. Select edited file             │
│   3. Wait for success message       │
│   4. Reload page                    │
└─────────────────────────────────────┘
```

**Remember:** Export → Edit → Import → Reload

