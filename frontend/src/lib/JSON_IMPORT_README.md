# JSON Import with Validation and Error Handling

## Overview

The JSON import system provides comprehensive functionality for importing previously exported farm data from JSON files. It includes:

- **File upload UI** with user-friendly error and success messages
- **Comprehensive validation** using Zod schema validation
- **Backward compatibility** with previous file versions
- **Error recovery** with detailed error messages
- **Data integrity** checks to prevent corrupted data from being imported
- **State preservation** - invalid files don't modify current state

## Features

### 1. File Upload Button Component

The `JSONImportButton` React component provides a complete UI for importing JSON files:

```tsx
import { JSONImportButton } from '../components/JSONImportButton';

function MyComponent() {
  const handleImportSuccess = (data) => {
    console.log('Data imported:', data);
    // Update form with imported data
  };

  const handleImportError = (error) => {
    console.error('Import failed:', error);
  };

  const handleImportWarning = (warnings) => {
    console.warn('Import warnings:', warnings);
  };

  return (
    <JSONImportButton
      onImportSuccess={handleImportSuccess}
      onImportError={handleImportError}
      onImportWarning={handleImportWarning}
      label="Import Farm Data"
    />
  );
}
```

### 2. Core Import Functions

#### `importFromJSON(jsonString: string): JSONImportResult`

Imports data from a JSON string with full validation:

```typescript
import { importFromJSON } from '../lib/json-import';

const jsonString = `{
  "version": "1.0.0",
  "exportDate": "2024-03-04T10:30:00Z",
  "appVersion": "0.1.0",
  "language": "en",
  "data": { ... },
  "practices": [ ... ]
}`;

const result = importFromJSON(jsonString);

if (result.success && result.data) {
  console.log('Import successful!');
  const { farmForm, practices } = result.data;
  // Use imported data
} else {
  console.error('Import failed:', result.error);
}
```

#### `importFromJSONFile(file: File): Promise<JSONImportResult>`

Imports data from a File object with file validation:

```typescript
import { importFromJSONFile } from '../lib/json-import';

const file = /* File from input */;
const result = await importFromJSONFile(file);

if (result.success && result.data) {
  // Handle successful import
} else {
  // Handle error
}
```

#### `triggerFileUpload(onFile: (file: File) => void): void`

Triggers a file upload dialog:

```typescript
import { triggerFileUpload, importFromJSONFile } from '../lib/json-import';

triggerFileUpload(async (file) => {
  const result = await importFromJSONFile(file);
  // Handle result
});
```

## Validation

### Schema Validation

The import system validates against the following schema:

```typescript
{
  version: string,
  exportDate: ISO8601 datetime,
  appVersion: string,
  language: 'en' | 'ua',
  data: {
    totalArea: string (numeric),
    dairyCows: string (numeric),
    pigs: string (numeric),
    chickens: string (numeric),
    crops: [
      {
        crop_id: number,
        area: string (numeric),
        nitrogen: string (numeric),
        phosphorus: string (numeric),
        potassium: string (numeric),
        manure: string (numeric),
        diesel: string (numeric),
        irrigation: string (numeric),
        pesticides: [
          {
            pesticide_id: string,
            rate: string (numeric)
          }
        ]
      }
    ]
  },
  practices: [
    {
      tillage: enum,
      precisionFertilization: boolean,
      coverCrop: boolean,
      irrigationMethod: enum,
      irrigationEnergy: enum,
      residue: enum
    }
  ],
  results?: EmissionResults (optional),
  metadata?: object (optional)
}
```

### Validation Steps

1. **JSON Parsing**: Validates JSON syntax
2. **Schema Validation**: Checks structure against Zod schema
3. **Type Validation**: Ensures correct data types
4. **Enum Validation**: Validates enum values (tillage, irrigation, etc.)
5. **Numeric Validation**: Ensures numeric strings are valid and non-negative
6. **Consistency Validation**: Ensures practices array length matches crops array length
7. **Data Integrity**: Validates all required fields are present

## Error Handling

### Error Types

The system handles various error scenarios:

#### 1. Invalid JSON Syntax
```
Error: Invalid JSON at position 42: ...invalid content...
```

#### 2. Missing Required Fields
```
Error: Invalid export format: missing required fields (data, practices)
```

#### 3. Invalid Data Types
```
Error: Invalid farm data: Total area must be a valid number, got: "abc"
```

#### 4. Invalid Enum Values
```
Error: Invalid practices data: Invalid practice at index 0: Invalid tillage value: unknown_value
```

#### 5. Data Mismatch
```
Error: Data mismatch: Number of practices (0) must match number of crops (1)
```

#### 6. File Errors
```
Error: File must be a JSON file (.json)
Error: File is too large (6.5MB). Maximum size is 5MB.
Error: Failed to read file
```

### Error Recovery

- **No state modification**: If import fails, current form state is not modified
- **Detailed error messages**: Users get specific information about what went wrong
- **Backward compatibility**: Older file formats are handled gracefully with warnings
- **Lenient parsing**: If strict validation fails, the system attempts lenient parsing

## Backward Compatibility

The import system supports files from previous versions:

```typescript
const result = importFromJSON(olderFormatJSON);

if (result.success) {
  console.log('Warnings:', result.warnings);
  // Output: ["File was exported from version 0.9.0, current version is 1.0.0"]
}
```

### Version Handling

- **Version detection**: Automatically detects file version
- **Migration**: Applies necessary transformations for older versions
- **Warnings**: Notifies user if file is from different version
- **Data preservation**: All data is preserved during version transitions

## Data Integrity

### Validation Guarantees

1. **No partial imports**: Either all data is imported or none
2. **Type safety**: All data is properly typed after import
3. **Numeric validation**: All numeric fields are validated as non-negative numbers
4. **Enum validation**: All enum fields contain valid values
5. **Consistency**: Practices array always matches crops array length

### File Size Limits

- **Maximum file size**: 5MB
- **Rationale**: Prevents memory issues and ensures reasonable data sizes

## Usage Examples

### Example 1: Basic Import

```typescript
import { importFromJSON } from '../lib/json-import';

const jsonString = localStorage.getItem('backup');
const result = importFromJSON(jsonString);

if (result.success && result.data) {
  setFormData(result.data.farmForm);
  setPractices(result.data.practices);
}
```

### Example 2: File Upload Handler

```typescript
import { importFromJSONFile } from '../lib/json-import';

const handleFileChange = async (event) => {
  const file = event.target.files[0];
  const result = await importFromJSONFile(file);

  if (result.success && result.data) {
    // Show success notification
    showNotification('Data imported successfully');
    // Update form
    updateForm(result.data);
  } else {
    // Show error notification
    showNotification(result.error, 'error');
  }
};
```

### Example 3: React Component Integration

```tsx
import { JSONImportButton } from '../components/JSONImportButton';

function SettingsPanel() {
  const [formData, setFormData] = useState(initialData);

  return (
    <div>
      <JSONImportButton
        onImportSuccess={(data) => {
          setFormData(data.farmForm);
          showNotification('Data imported successfully');
        }}
        onImportError={(error) => {
          showNotification(error, 'error');
        }}
        onImportWarning={(warnings) => {
          showNotification(warnings.join(', '), 'warning');
        }}
      />
    </div>
  );
}
```

### Example 4: Clipboard Import

```typescript
import { importFromJSON } from '../lib/json-import';

const handlePasteImport = async () => {
  try {
    const text = await navigator.clipboard.readText();
    const result = importFromJSON(text);

    if (result.success && result.data) {
      updateForm(result.data);
    } else {
      showError(result.error);
    }
  } catch (error) {
    showError('Failed to read clipboard');
  }
};
```

## Requirements Coverage

This implementation satisfies the following requirements:

- **6.1**: File upload button and handler ✓
- **6.2**: importFromJSON function with Zod schema validation ✓
- **6.3**: Error messages for invalid/corrupted files without state modification ✓
- **6.4**: Confirmation message on successful import ✓
- **6.5**: Backward compatibility with previous versions ✓
- **6.6**: Schema validation ✓

## Testing

### Unit Tests

```typescript
import { importFromJSON } from '../lib/json-import';

describe('JSON Import', () => {
  it('should import valid JSON', () => {
    const result = importFromJSON(validJSON);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should reject invalid JSON', () => {
    const result = importFromJSON('invalid json');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should not modify state on error', () => {
    const result = importFromJSON(invalidJSON);
    expect(result.success).toBe(false);
    // Verify no side effects occurred
  });

  it('should handle backward compatibility', () => {
    const result = importFromJSON(olderVersionJSON);
    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
  });
});
```

## API Reference

### Types

```typescript
interface JSONImportResult {
  success: boolean;
  data?: {
    farmForm: FarmForm;
    practices: CropPractice[];
  };
  error?: string;
  warnings?: string[];
  version?: string;
}

interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
```

### Functions

- `importFromJSON(jsonString: string): JSONImportResult`
- `importFromJSONFile(file: File): Promise<JSONImportResult>`
- `triggerFileUpload(onFile: (file: File) => void): void`
- `createFileUploadInput(onFile: (file: File) => void): HTMLInputElement`

### React Component

- `JSONImportButton`: File upload button with error/success UI

## Best Practices

1. **Always check success flag**: Never assume import succeeded
2. **Handle warnings**: Display warnings to user even on success
3. **Preserve state**: Don't modify state until import succeeds
4. **Show feedback**: Display error or success messages to user
5. **Validate file size**: Check file size before processing
6. **Handle async**: Use async/await for file operations
7. **Error recovery**: Provide clear error messages and recovery options

## Troubleshooting

### "Invalid JSON" Error
- Check JSON syntax using a JSON validator
- Ensure file is not corrupted
- Try exporting fresh data and re-importing

### "Validation failed" Error
- Check that all required fields are present
- Verify numeric fields contain valid numbers
- Ensure practices array length matches crops array

### "File too large" Error
- File exceeds 5MB limit
- Try exporting less data or splitting into multiple files

### "Backward compatibility" Warning
- File is from older version
- Data will be automatically converted
- Verify imported data is correct

## See Also

- [JSON Export Documentation](./JSON_EXPORT_README.md)
- [Storage Manager Documentation](./README.md)
- [Migration Manager Documentation](./MIGRATION_README.md)
