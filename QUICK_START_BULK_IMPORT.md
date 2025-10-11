# Quick Start Guide: Bulk Import Postal Codes

## 🚀 Getting Started

### Step 1: Prepare Your Data

Create an Excel or CSV file with your postal codes. You can include:

**Option A: Postal Codes Only**
```csv
86899
86932
80331
80335
```

**Option B: Postal Codes with Layers**
```csv
PLZ,Layer
86899,Vertrieb Nord
86932,Vertrieb Nord
80331,Vertrieb Süd
80335,Vertrieb Süd
```

**Option C: Full Data (Extra columns ignored)**
```csv
Order,Customer,PLZ,Territory,Status
1001,ACME Corp,86899,North,Active
1002,TechCo,80331,South,Active
```

### Step 2: Open Import Dialog

1. Go to Postal Codes view
2. Click **"Import"** button
3. Select **"Excel/CSV Massen-Import"** tab
4. Click **"Massen-Import starten"**

### Step 3: Upload Your File

- **Drag & drop** your file OR
- **Click to browse** and select it

Supported formats:
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- `.csv` (Comma-separated values)

### Step 4: Map Columns

The system automatically detects columns, but you can change them:

- **PLZ-Spalte**: Column with postal codes (required)
- **Layer-Spalte**: Column with layer names (optional)

### Step 5: Review & Import

Check the preview:
- ✅ Valid postal codes count
- ⚠️ Invalid postal codes (if any)
- 📊 Number of layers
- 👀 First 5 rows preview

Click **Import** when ready!

## 📝 Format Requirements

### Postal Codes
- **Valid**: `86899`, `D-86899`, `d-86899`
- **Invalid**: `AB123`, `12345-6789`, `hello`

German postal codes must be **1-5 digits** with optional `D-` prefix.

### Layer Names
- Any text is allowed
- Existing layers are updated (postal codes merged)
- New layers are created automatically
- Case-insensitive matching

## ✨ Pro Tips

1. **Use Headers**: Include column names in first row for clarity
2. **Consistent Names**: Use same layer names for grouping
3. **Clean Data**: Remove extra spaces and special characters
4. **Test Small**: Try with 5-10 rows first to verify format
5. **Check Preview**: Always review before final import

## 🎯 Common Use Cases

### Import by Sales Territory
```csv
PLZ,Territory
86899,North
86932,North
80331,South
```

### Import Customer Regions
```csv
Postal Code,Customer Region
D-10115,Berlin Metro
D-10117,Berlin Metro
20095,Hamburg Metro
```

### Import from Order Data
```csv
Order ID,Customer,ZIP,Region,Total
1001,ACME,86899,Bavaria,1250.00
1002,TechCo,80331,Bavaria,890.50
```
Just map: ZIP → PLZ-Spalte, Region → Layer-Spalte

## ❓ FAQ

**Q: What happens to existing layers?**
A: Postal codes are merged into existing layers with the same name.

**Q: Can I import without a layer column?**
A: Yes! All postal codes go to "Default Layer".

**Q: What if some postal codes are invalid?**
A: Invalid codes are shown in preview and excluded from import.

**Q: How many rows can I import?**
A: Tested with 10,000+ rows. Larger files work but may take longer.

**Q: Can I undo an import?**
A: Yes! Use the Undo button after import.

**Q: What if the import fails?**
A: Nothing is changed (atomic transaction). Check error message and try again.

## 🔧 Troubleshooting

### "File won't upload"
- Check file extension (.xlsx, .xls, or .csv)
- Try re-saving from Excel
- File might be corrupted

### "No valid postal codes found"
- Ensure postal codes are numbers (1-5 digits)
- Check for D- prefix format
- Verify correct column selected

### "Import failed"
- Check error message
- Try smaller batch
- Verify database connection
- Check area permissions

## 📞 Need Help?

Sample file included: `sample-import.csv`

For detailed documentation, see: `BULK_IMPORT_FEATURE.md`
