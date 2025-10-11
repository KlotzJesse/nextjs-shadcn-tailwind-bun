# Excel/CSV Bulk Import Feature

## Overview

The bulk import feature allows users to import postal codes and layer assignments from Excel (.xlsx, .xls) or CSV files with intelligent column mapping, validation, and batch processing.

## Features

### 1. **File Format Support**
- Excel files (.xlsx, .xls)
- CSV files (.csv)
- Automatic format detection

### 2. **Intelligent Column Mapping**
- **Automatic detection** of postal code and layer columns
- **Manual column selection** for precise control
- Support for files with or without headers
- Preview of first 5 rows before import

### 3. **Postal Code Format Support**
- Standard format: `12345`
- German format: `D-12345`
- Automatic normalization during processing
- Supports 1-5 digit postal codes for different granularities

### 4. **Layer Management**
- **Create new layers** automatically from layer column
- **Upsert to existing layers** - merges postal codes into existing layers by name
- **Bulk assignment** - assign multiple postal codes to multiple layers in one operation
- **Default layer fallback** - if no layer column specified, all postal codes go to a default layer

### 5. **Performance Optimization**
- **Batch processing** - processes data in chunks of 500 rows
- **Transaction-based** - all operations are atomic (all succeed or all fail)
- **Progress indicator** - real-time feedback during import
- **Change tracking** - all imports are tracked in the change history for undo/redo

### 6. **Validation & Preview**
- **Real-time statistics**:
  - Total rows processed
  - Valid vs invalid postal codes
  - Unique postal codes count
  - Number of layers to be created/updated
- **Error highlighting** - shows which rows have invalid data
- **Layer preview** - shows what will be imported before confirming
- **Duplicate detection** - prevents duplicate postal code assignments

## Usage

### Step 1: Open Import Dialog
1. Navigate to the postal codes view
2. Click the "Import" button
3. Select the "Excel/CSV Massen-Import" tab

### Step 2: Upload File
1. Click "Massen-Import starten"
2. Drag & drop or click to select your Excel/CSV file
3. File is automatically parsed and analyzed

### Step 3: Map Columns
1. **PLZ-Spalte**: Select which column contains postal codes (auto-detected)
2. **Layer-Spalte**: Select which column contains layer names (optional, auto-detected)
3. Preview shows first 5 rows with column indicators

### Step 4: Review & Import
1. Check statistics:
   - Valid/Invalid row counts
   - Unique postal codes
   - Layers to be created/updated
2. Review layer groups to see what will be imported
3. Click import button to proceed

## File Format Examples

### Example 1: With Headers and Layer Column

```csv
PLZ,Layer Name,Description
86899,Region Nord,Northern district
86932,Region Nord,Northern district
80331,Region Süd,Southern district
80335,Region Süd,Southern district
D-90402,Region Ost,Eastern district
```

### Example 2: Without Headers

```csv
86899,Sales Team A
86932,Sales Team A
80331,Sales Team B
80335,Sales Team B
```

### Example 3: Postal Codes Only

```csv
86899
86932
80331
80335
90402
```

### Example 4: Excel with Multiple Columns

| Order ID | Customer | Postal Code | Territory | Status |
|----------|----------|-------------|-----------|--------|
| 1001     | ACME     | 86899       | North     | Active |
| 1002     | TechCo   | D-80331     | South     | Active |
| 1003     | Global   | 90402       | East      | Active |

In this case, you would:
- Select "Postal Code" as PLZ-Spalte
- Select "Territory" as Layer-Spalte

## Technical Implementation

### Architecture

```
User Upload
    ↓
Excel/CSV Parser (xlsx library)
    ↓
Column Auto-Detection
    ↓
Data Validation & Normalization
    ↓
Group by Layer
    ↓
Batch Processing (500 rows/batch)
    ↓
Database Transaction
    ↓
Change Tracking
    ↓
Success/Error Feedback
```

### Key Files

1. **`src/lib/utils/excel-parser.ts`**
   - File parsing with xlsx library
   - Column detection algorithms
   - Data validation and normalization
   - Statistics calculation

2. **`src/lib/hooks/use-excel-import.ts`**
   - React hook for managing import state
   - Column mapping updates
   - File processing coordination

3. **`src/app/actions/bulk-import-actions.ts`**
   - Server action for bulk operations
   - Batch processing logic
   - Layer creation/upsert
   - Transaction management
   - Change tracking integration

4. **`src/components/postal-codes/bulk-import-dialog.tsx`**
   - UI for file upload
   - Column mapping interface
   - Preview table
   - Statistics display
   - Import progress

### Performance Characteristics

- **Batch Size**: 500 rows per batch
- **Memory Efficient**: Streams data processing
- **Database**: Single transaction for atomicity
- **Change Tracking**: Efficient bulk change recording

### Error Handling

- **File parsing errors**: Clear error messages for corrupt files
- **Invalid postal codes**: Highlighted in preview, excluded from import
- **Database errors**: Full rollback, no partial imports
- **Layer conflicts**: Automatic merge for existing layers

## API Reference

### Server Action: `bulkImportPostalCodesAndLayers`

```typescript
async function bulkImportPostalCodesAndLayers(
  areaId: number,
  layers: BulkImportLayer[],
  createdBy?: string
): Promise<BulkImportResult>
```

**Parameters:**
- `areaId`: The area to import into
- `layers`: Array of layer objects with names and postal codes
- `createdBy`: Optional user identifier for change tracking

**Returns:**
```typescript
interface BulkImportResult {
  success: boolean;
  createdLayers: number;      // Count of new layers created
  updatedLayers: number;      // Count of existing layers updated
  totalPostalCodes: number;   // Total postal codes added
  errors?: string[];          // Any errors that occurred
  layerIds?: number[];        // IDs of created/updated layers
}
```

### Hook: `useExcelImport`

```typescript
const {
  fileData,           // Parsed file data
  columnMapping,      // Current column mapping
  layerGroups,        // Grouped data by layer
  stats,              // Import statistics
  isProcessing,       // Loading state
  error,              // Error message if any
  loadFile,           // Function to load a file
  updateColumnMapping,// Function to update column mapping
  reset,              // Function to reset state
} = useExcelImport();
```

## Best Practices

1. **File Preparation**
   - Use clear column headers
   - Ensure postal codes are in a single column
   - Keep layer names consistent

2. **Data Validation**
   - Review the preview before importing
   - Check statistics for invalid rows
   - Verify layer groupings

3. **Large Files**
   - Files up to 10,000 rows are handled efficiently
   - For very large files (>50,000 rows), consider splitting

4. **Layer Management**
   - Use consistent layer naming across files
   - Existing layers are automatically merged
   - Case-insensitive layer name matching

## Troubleshooting

### Problem: File won't upload
- **Solution**: Ensure file is .xlsx, .xls, or .csv format
- Check file isn't corrupted
- Try re-exporting from Excel/spreadsheet software

### Problem: Postal codes not detected
- **Solution**: Manually select the postal code column
- Ensure postal codes are numbers or D-xxxxx format
- Check for extra spaces or special characters

### Problem: Invalid postal codes
- **Solution**: German postal codes must be 1-5 digits
- Remove any letters (except D- prefix)
- Check for formatting issues in source data

### Problem: Import fails
- **Solution**: Check error message in toast notification
- Verify database connection
- Ensure you have permissions for the area
- Try importing smaller batches

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for additional country formats
- [ ] Custom validation rules per area
- [ ] Import templates download
- [ ] Dry-run mode (preview without importing)
- [ ] Import history and logs
- [ ] Column mapping presets
- [ ] Support for Google Sheets links
- [ ] Email notifications for large imports
- [ ] Scheduled imports
- [ ] API endpoint for programmatic imports

## Dependencies

- `xlsx` (^0.18.5) - Excel/CSV parsing
- `drizzle-orm` - Database operations
- `react-dropzone` - File upload UI
- `sonner` - Toast notifications

## License

Part of the main application license.
