# CSV Import for Bulk Crop Data Entry

## Overview

The CSV import feature allows users to quickly import crop data from CSV files, supporting bulk data entry for farms with many crops. The system includes fuzzy matching for crop names and pesticides, comprehensive error reporting, and a downloadable template.

## Features

- **Bulk Import**: Import multiple crops at once from a CSV file
- **Fuzzy Matching**: Automatically match crop names and pesticides even with typos or variations
- **Error Reporting**: Detailed error messages for each invalid row
- **Warnings**: Informative warnings when fuzzy matching is used
- **Template Download**: Users can download a pre-formatted CSV template
- **Bilingual Support**: Full support for English and Ukrainian interfaces
- **Validation**: Comprehensive validation of numeric fields and ranges

## CSV Format

### Required Columns

The CSV file must include the following columns (case-insensitive):

| Column | Type | Range | Required | Description |
|--------|------|-------|----------|-------------|
| crop_name | string | - | Yes | Name of the crop (fuzzy matched to database) |
| area | decimal | 0.01 - 100000 | Yes | Farm area in hectares |
| nitrogen | decimal | 0 - 500 | No | Nitrogen application in kg/ha |
| phosphorus | decimal | 0 - 300 | No | Phosphorus application in kg/ha |
| potassium | decimal | 0 - 300 | No | Potassium application in kg/ha |
| manure | decimal | 0 - 500 | No | Manure application in kg/ha |
| diesel | decimal | 0 - 200 | No | Diesel consumption in L/ha |
| irrigation | decimal | 0 - 2000 | No | Irrigation in mm |
| pesticide | string | - | No | Pesticide name (fuzzy matched to database) |

### Example CSV

```csv
crop_name,area,nitrogen,phosphorus,potassium,manure,diesel,irrigation,pesticide
Wheat,50,120,60,30,10,15,450,Roundup
Maize,75,150,70,40,15,20,500,Atrazine
Soybean,40,20,50,30,5,10,400,
Potato,30,180,90,100,20,25,600,Bravo
```

## Supported Crops

The system supports the following crops for fuzzy matching:

- Wheat
- Maize
- Soybean
- Sunflower
- Potato
- Rice
- Barley
- Rapeseed
- Sugar beet
- Vegetables
- Oats
- Rye
- Sorghum
- Millet
- Cotton
- Alfalfa
- Peas
- Lentils
- Chickpea
- Tomato
- Onion
- Grapes

## Supported Pesticides

The system supports fuzzy matching for pesticides including:

- Roundup (Glyphosate)
- Atrazine
- Harness (Acetochlor)
- Karate (Lambda-cyhalothrin)
- Decis (Deltamethrin)
- Ridomil Gold (Metalaxyl)
- Bravo (Chlorothalonil)
- Tilt (Propiconazole)
- Amistar (Azoxystrobin)
- Dithane (Mancozeb)
- Kocide (Copper hydroxide)
- Dual Gold (S-metolachlor)
- Callisto (Mesotrione)
- Banvel (Dicamba)
- 2,4-D
- Confidor (Imidacloprid)
- Dursban (Chlorpyrifos)
- Karate Zeon (Lambda-cyhalothrin)

## API Reference

### `importCropsFromCSV(file: File): Promise<CropImportResult>`

Imports crops from a CSV file with comprehensive error reporting.

**Parameters:**
- `file` (File): The CSV file to import

**Returns:**
- Promise resolving to `CropImportResult` with:
  - `crops` (CropForm[]): Successfully imported crops
  - `successCount` (number): Number of successfully imported crops
  - `errorCount` (number): Number of rows with validation errors
  - `errors` (Array): Detailed error information for each failed row
  - `warnings` (Array): Warnings for fuzzy-matched items

**Example:**
```typescript
const result = await importCropsFromCSV(file);
if (result.errorCount === 0) {
  // All crops imported successfully
  addCrops(result.crops);
} else {
  // Show errors to user
  displayErrors(result.errors);
}
```

### `fuzzyMatchCropName(cropName: string): number`

Fuzzy matches a crop name to a crop ID using Levenshtein distance.

**Parameters:**
- `cropName` (string): The crop name to match

**Returns:**
- number: The crop ID (0-based index) or -1 if not found

**Matching Strategy:**
1. Exact match (case-insensitive)
2. Fuzzy match with Levenshtein distance (30% tolerance)

**Example:**
```typescript
const cropId = fuzzyMatchCropName('Weat'); // Returns 0 (Wheat)
const cropId = fuzzyMatchCropName('Maiz'); // Returns 1 (Maize)
const cropId = fuzzyMatchCropName('Unknown'); // Returns -1
```

### `fuzzyMatchPesticideName(pesticideName: string): number`

Fuzzy matches a pesticide name to a pesticide ID.

**Parameters:**
- `pesticideName` (string): The pesticide name or substance to match

**Returns:**
- number: The pesticide ID (0-based index) or -1 if not found

**Matching Strategy:**
1. Exact match on trade name or substance (case-insensitive)
2. Partial match on trade name or substance

**Example:**
```typescript
const pesticideId = fuzzyMatchPesticideName('Roundup'); // Returns 0
const pesticideId = fuzzyMatchPesticideName('Glyphosate'); // Returns 0 (substance)
const pesticideId = fuzzyMatchPesticideName('Atraz'); // Returns 1 (Atrazine)
```

### `generateCropImportTemplate(): string`

Generates a CSV template with headers and example rows.

**Returns:**
- string: CSV formatted template

**Example:**
```typescript
const template = generateCropImportTemplate();
console.log(template);
// Output:
// "crop_name","area","nitrogen",...
// "Wheat","50","120",...
// "Maize","75","150",...
```

### `downloadCropImportTemplate(): void`

Downloads the CSV template as a file to the user's device.

**Example:**
```typescript
downloadCropImportTemplate(); // Downloads "crop-import-template.csv"
```

## React Component

### `CSVImportButton`

A React component providing the complete CSV import UI.

**Props:**
- `onImportSuccess` (function): Called when crops are successfully imported
  - Parameter: `crops` (CropForm[]) - The imported crops
- `onImportError` (function, optional): Called when import fails
  - Parameter: `error` (string) - Error message
- `language` ('en' | 'ua'): UI language

**Example:**
```typescript
import { CSVImportButton } from './components/CSVImportButton';

function MyForm() {
  const handleImportSuccess = (crops: CropForm[]) => {
    // Add imported crops to form
    setCrops([...crops, ...existingCrops]);
  };

  return (
    <CSVImportButton
      onImportSuccess={handleImportSuccess}
      onImportError={(error) => console.error(error)}
      language="en"
    />
  );
}
```

## Error Handling

### Validation Errors

The system validates:

1. **Required Fields**
   - Crop name is required
   - Area is required

2. **Numeric Validation**
   - All numeric fields must be valid numbers
   - Values must be within acceptable ranges

3. **Crop Matching**
   - Crop name must match a known crop (with fuzzy matching)

### Error Messages

Errors are reported with:
- Row number (1-indexed for user display)
- Crop name (if available)
- Specific error message

**Example Error:**
```
Row 5: Crop "Wheet" not found in database
Row 6: Area must be a number
Row 7: Nitrogen must be between 0 and 500
```

### Warnings

Warnings are shown when:
- Fuzzy matching is used for crop names
- Fuzzy matching is used for pesticide names
- Pesticide not found in database

**Example Warning:**
```
Row 2: Crop name "Weat" matched to "Wheat"
Row 3: Pesticide "Atraz" matched to "Atrazine"
```

## Usage Workflow

### Step 1: Download Template

User clicks "Download Template" button to get a pre-formatted CSV file.

### Step 2: Fill in Data

User opens the template in a spreadsheet application and fills in crop data.

### Step 3: Import File

User clicks "Import Crops from CSV" and selects the filled CSV file.

### Step 4: Review Results

The system displays:
- Number of successfully imported crops
- Any validation errors (with row numbers and details)
- Any warnings (fuzzy matches)

### Step 5: Confirm Import

If there are no errors, user clicks "Import" to add crops to the form.

If there are errors, user can:
- Fix the errors in the CSV file and re-import
- Manually add the problematic crops
- Cancel the import

## Implementation Details

### Fuzzy Matching Algorithm

The system uses Levenshtein distance for fuzzy matching:

1. **Exact Match**: First tries case-insensitive exact match
2. **Fuzzy Match**: If no exact match, calculates Levenshtein distance
3. **Threshold**: Accepts matches within 30% of the input length
4. **Best Match**: Returns the closest match if within threshold

**Example:**
```
Input: "Weat"
- Exact match: No
- Levenshtein distance to "Wheat": 1
- Threshold: 4 * 0.3 = 1.2
- Result: Match found (distance 1 < threshold 1.2)
```

### Data Validation

Each field is validated against:
- Type (numeric fields must be numbers)
- Range (values must be within acceptable limits)
- Required status (some fields are mandatory)

### Error Recovery

The system:
- Continues processing even if some rows fail
- Reports all errors at once
- Allows partial imports (successful rows are imported)
- Preserves original data if import fails

## Performance Considerations

- **File Size**: Supports CSV files with thousands of rows
- **Parsing**: Uses PapaParse for efficient CSV parsing
- **Matching**: Fuzzy matching is O(n*m) where n is input length and m is crop name length
- **Memory**: Stores all results in memory (suitable for typical farm sizes)

## Accessibility

The component includes:
- ARIA labels for all buttons
- Semantic HTML structure
- Keyboard navigation support
- Error messages with role="alert"
- High contrast error/warning displays

## Bilingual Support

Full support for English and Ukrainian:
- UI labels and messages
- Error messages
- Warnings
- Help text

## Examples

See `csv-import-example.ts` for comprehensive examples including:
1. Fuzzy matching crop names
2. Fuzzy matching pesticide names
3. Generating CSV templates
4. Importing crops from files
5. Handling validation errors
6. React component integration
7. Batch import with error recovery

## Related Features

- **CSV Export**: Export calculation results to CSV
- **JSON Import/Export**: Import/export complete farm data
- **Validation Manager**: Field-level validation
- **Storage Manager**: Persistent data storage
