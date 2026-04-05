# CSV Export for Calculation History

## Overview

The history export module provides functionality to export calculation history to CSV format with bilingual support (English and Ukrainian). This allows users to analyze their farm's emission trends over time in spreadsheet applications.

## Features

- **Bilingual Support**: Export headers and labels in English or Ukrainian
- **Comprehensive Data**: Includes date, farm name, areas, livestock counts, crop count, and emissions
- **Automatic Formatting**: Numbers formatted to 2 decimal places, dates localized
- **Browser Download**: Automatic file download with proper filename format
- **Graceful Handling**: Handles missing data and empty history gracefully

## API

### `exportHistoryToCSV(history, lang?)`

Exports calculation history to CSV format string.

**Parameters:**
- `history` (CalculationHistory[]): Array of calculation history entries
- `lang` ('en' | 'ua'): Language for labels (default: 'en')

**Returns:** CSV formatted string

**Example:**
```typescript
import { exportHistoryToCSV } from './export-history';

const csvContent = exportHistoryToCSV(historyData, 'en');
console.log(csvContent);
```

### `downloadHistoryAsCSV(history, lang?)`

Exports calculation history to CSV and triggers browser download.

**Parameters:**
- `history` (CalculationHistory[]): Array of calculation history entries
- `lang` ('en' | 'ua'): Language for labels (default: 'en')

**Returns:** void (triggers download)

**Example:**
```typescript
import { downloadHistoryAsCSV } from './export-history';

// User clicks "Export History" button
downloadHistoryAsCSV(historyData, userLanguage);
// File downloads as: farm-history-2024-01-15.csv
```

## CSV Format

### Structure

The exported CSV contains:

1. **Title Row**: "Farm Carbon Footprint History"
2. **Empty Row**: Spacing
3. **Header Row**: Column names in selected language
4. **Data Rows**: One row per calculation entry

### Columns

| Column | Description | Format |
|--------|-------------|--------|
| Date | Calculation date | Localized date string |
| Farm Name | Name of the farm | Text (or "(Unnamed)" if missing) |
| Total Area (ha) | Total farm area | Number with 2 decimals |
| Dairy Cows | Number of dairy cows | Integer |
| Pigs | Number of pigs | Integer |
| Chickens | Number of chickens | Integer |
| Number of Crops | Count of crops in calculation | Integer |
| Total Emissions (tCO2e) | Total greenhouse gas emissions | Number with 2 decimals |
| Per Hectare (tCO2e) | Emissions per hectare | Number with 2 decimals |

### Example Output (English)

```csv
Farm Carbon Footprint History

Date,Farm Name,Total Area (ha),Dairy Cows,Pigs,Chickens,Number of Crops,Total Emissions (tCO2e),Per Hectare (tCO2e)
01/15/2024,Green Valley Farm,150.00,50,30,200,2,125.50,0.84
02/20/2024,Sunny Acres,200.00,75,0,500,2,185.30,0.93
```

### Example Output (Ukrainian)

```csv
Історія вуглецевого сліду господарства

Дата,Назва господарства,Загальна площа (га),Молочні корови,Свині,Кури,Кількість культур,Загальні викиди (tCO2e),На гектар (tCO2e)
15.01.2024,Green Valley Farm,150.00,50,30,200,2,125.50,0.84
20.02.2024,Sunny Acres,200.00,75,0,500,2,185.30,0.93
```

## Data Handling

### Missing Data

- **Farm Name**: If not provided, displays as "(Unnamed)"
- **Livestock Counts**: Defaults to "0" if not provided
- **Crops**: Shows count of crops in the calculation
- **Results**: Defaults to "0.00" if emissions data is missing

### Date Formatting

Dates are formatted according to the selected language:
- **English**: MM/DD/YYYY (e.g., 01/15/2024)
- **Ukrainian**: DD.MM.YYYY (e.g., 15.01.2024)

### Number Formatting

All numeric values are formatted to 2 decimal places for consistency and readability.

## Integration with UI

### History Panel Component

The export button should be added to the history panel:

```typescript
import { downloadHistoryAsCSV } from '../lib/export-history';

function HistoryPanel({ history, language }) {
  const handleExportHistory = () => {
    downloadHistoryAsCSV(history, language);
  };

  return (
    <div className="history-panel">
      <h2>Calculation History</h2>
      <button onClick={handleExportHistory}>
        {language === 'en' ? 'Export all history' : 'Експортувати всю історію'}
      </button>
      {/* History list */}
    </div>
  );
}
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **57.1**: Create exportHistoryToCSV function with columns for date, farm name, areas, emissions, livestock ✓
- **57.2**: Add "Export all history" button in history panel (UI integration)
- **57.3**: Trigger download with filename "farm-history-YYYY-MM-DD.csv" ✓
- **57.4**: Support bilingual headers ✓
- **57.5**: Support bilingual headers (Ukrainian) ✓
- **57.6**: Support bilingual headers (English) ✓

## Testing

See `export-history-example.ts` for comprehensive examples including:
- Exporting to CSV string
- Downloading as file
- Handling empty history
- Handling missing data

## Dependencies

- `csv-utils.ts`: CSV generation and download utilities
- `types/storage.ts`: CalculationHistory type definition

## Browser Compatibility

Works in all modern browsers that support:
- Blob API
- URL.createObjectURL()
- HTML5 download attribute

## Performance

- Efficient for typical history sizes (50-100 entries)
- Memory usage scales linearly with history size
- CSV generation is synchronous and fast (<100ms for typical data)
