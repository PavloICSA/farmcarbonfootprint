/**
 * CSV Import Examples
 * Demonstrates how to use the CSV import functionality for bulk crop data entry
 */

import {
  importCropsFromCSV,
  fuzzyMatchCropName,
  fuzzyMatchPesticideName,
  generateCropImportTemplate,
  downloadCropImportTemplate,
} from './csv-import';

/**
 * Example 1: Fuzzy match crop names
 * Shows how the fuzzy matching works with various crop name variations
 */
export function example1_fuzzyMatchCropNames() {
  console.log('=== Example 1: Fuzzy Match Crop Names ===');

  // Exact matches
  console.log('Exact match "Wheat":', fuzzyMatchCropName('Wheat')); // 0
  console.log('Exact match "wheat" (case-insensitive):', fuzzyMatchCropName('wheat')); // 0

  // Fuzzy matches with typos
  console.log('Fuzzy match "Weat" (typo):', fuzzyMatchCropName('Weat')); // 0 (Wheat)
  console.log('Fuzzy match "Maiz" (typo):', fuzzyMatchCropName('Maiz')); // 1 (Maize)
  console.log('Fuzzy match "Soybean":', fuzzyMatchCropName('Soybean')); // 2

  // Non-matching
  console.log('No match "XYZ":', fuzzyMatchCropName('XYZ')); // -1
  console.log('Empty string:', fuzzyMatchCropName('')); // -1
}

/**
 * Example 2: Fuzzy match pesticide names
 * Shows how pesticide matching works with trade names and substances
 */
export function example2_fuzzyMatchPesticideNames() {
  console.log('=== Example 2: Fuzzy Match Pesticide Names ===');

  // Trade name matches
  console.log('Match "Roundup":', fuzzyMatchPesticideName('Roundup')); // 0
  console.log('Match "roundup" (case-insensitive):', fuzzyMatchPesticideName('roundup')); // 0

  // Substance matches
  console.log('Match "Glyphosate" (substance):', fuzzyMatchPesticideName('Glyphosate')); // 0

  // Partial matches
  console.log('Partial match "Atraz":', fuzzyMatchPesticideName('Atraz')); // 1 (Atrazine)
  console.log('Partial match "Karate":', fuzzyMatchPesticideName('Karate')); // 3

  // Non-matching
  console.log('No match "UnknownPesticide":', fuzzyMatchPesticideName('UnknownPesticide')); // -1
}

/**
 * Example 3: Generate CSV template
 * Shows how to generate and download the CSV import template
 */
export function example3_generateCSVTemplate() {
  console.log('=== Example 3: Generate CSV Template ===');

  const template = generateCropImportTemplate();
  console.log('Generated template:');
  console.log(template);

  // In a real application, you would download this:
  // downloadCropImportTemplate();
}

/**
 * Example 4: Import crops from CSV file
 * Demonstrates the complete import workflow with error handling
 */
export async function example4_importCropsFromFile() {
  console.log('=== Example 4: Import Crops from CSV File ===');

  // Create a sample CSV file
  const csvContent = `crop_name,area,nitrogen,phosphorus,potassium,manure,diesel,irrigation,pesticide
Wheat,50,120,60,30,10,15,450,Roundup
Maize,75,150,70,40,15,20,500,Atrazine
Soybean,40,20,50,30,5,10,400,
Potato,30,180,90,100,20,25,600,Bravo
InvalidCrop,25,100,50,25,10,15,400,`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'test-crops.csv', { type: 'text/csv' });

  try {
    const result = await importCropsFromCSV(file);

    console.log('Import Results:');
    console.log(`- Success: ${result.successCount} crops`);
    console.log(`- Errors: ${result.errorCount}`);
    console.log(`- Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error) => {
        console.log(`  Row ${error.rowIndex}: ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning) => {
        console.log(`  Row ${warning.rowIndex}: ${warning.message}`);
      });
    }

    console.log('\nImported Crops:');
    result.crops.forEach((crop, index) => {
      console.log(`  Crop ${index + 1}:`);
      console.log(`    - ID: ${crop.crop_id}`);
      console.log(`    - Area: ${crop.area} ha`);
      console.log(`    - Nitrogen: ${crop.nitrogen} kg/ha`);
    });
  } catch (error) {
    console.error('Import failed:', error);
  }
}

/**
 * Example 5: Handle import with validation errors
 * Shows how to handle and display validation errors
 */
export async function example5_handleValidationErrors() {
  console.log('=== Example 5: Handle Validation Errors ===');

  // CSV with various validation errors
  const csvContent = `crop_name,area,nitrogen,phosphorus,potassium,manure,diesel,irrigation,pesticide
Wheat,abc,120,60,30,10,15,450,Roundup
Maize,-50,150,70,40,15,20,500,Atrazine
,40,20,50,30,5,10,400,
Soybean,40,abc,50,30,5,10,400,`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'invalid-crops.csv', { type: 'text/csv' });

  try {
    const result = await importCropsFromCSV(file);

    console.log('Validation Results:');
    console.log(`- Successfully imported: ${result.successCount}`);
    console.log(`- Failed validation: ${result.errorCount}`);

    if (result.errorCount > 0) {
      console.log('\nDetailed Errors:');
      result.errors.forEach((error) => {
        console.log(`\nRow ${error.rowIndex}${error.cropName ? ` (${error.cropName})` : ''}:`);
        console.log(`  ${error.message}`);
      });
    }
  } catch (error) {
    console.error('Import failed:', error);
  }
}

/**
 * Example 6: React component integration
 * Shows how to integrate CSV import into a React component
 */
export function example6_reactComponentIntegration() {
  console.log('=== Example 6: React Component Integration ===');

  // This is a conceptual example of how to use the CSVImportButton component
  const exampleCode = `
import { CSVImportButton } from './components/CSVImportButton';
import { CropForm } from './types/storage';

function MyForm() {
  const [crops, setCrops] = useState<CropForm[]>([]);

  const handleImportSuccess = (importedCrops: CropForm[]) => {
    // Add imported crops to existing crops
    setCrops([...crops, ...importedCrops]);
    
    // Show success notification
    showNotification('Crops imported successfully!', 'success');
  };

  const handleImportError = (error: string) => {
    // Show error notification
    showNotification(\`Import failed: \${error}\`, 'error');
  };

  return (
    <div>
      <CSVImportButton
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
        language="en"
      />
      
      {/* Display imported crops */}
      {crops.map((crop, index) => (
        <div key={index}>
          Crop {index + 1}: {crop.area} ha
        </div>
      ))}
    </div>
  );
}
  `;

  console.log('React Component Example:');
  console.log(exampleCode);
}

/**
 * Example 7: Batch import with error recovery
 * Shows how to handle partial imports with errors
 */
export async function example7_batchImportWithErrorRecovery() {
  console.log('=== Example 7: Batch Import with Error Recovery ===');

  const csvContent = `crop_name,area,nitrogen,phosphorus,potassium,manure,diesel,irrigation,pesticide
Wheat,50,120,60,30,10,15,450,Roundup
InvalidCrop,75,150,70,40,15,20,500,Atrazine
Soybean,40,20,50,30,5,10,400,
Maize,invalid,150,70,40,15,20,500,Atrazine
Potato,30,180,90,100,20,25,600,Bravo`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'batch-crops.csv', { type: 'text/csv' });

  try {
    const result = await importCropsFromCSV(file);

    console.log('Batch Import Summary:');
    console.log(`- Total rows: ${result.successCount + result.errorCount}`);
    console.log(`- Successfully imported: ${result.successCount}`);
    console.log(`- Failed: ${result.errorCount}`);

    // Process successful imports
    if (result.successCount > 0) {
      console.log('\nSuccessfully imported crops:');
      result.crops.forEach((crop, index) => {
        console.log(`  ${index + 1}. Area: ${crop.area} ha, Nitrogen: ${crop.nitrogen} kg/ha`);
      });
    }

    // Handle errors
    if (result.errorCount > 0) {
      console.log('\nFailed rows (can be corrected and re-imported):');
      result.errors.forEach((error) => {
        console.log(`  Row ${error.rowIndex}: ${error.message}`);
      });
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.log('\nWarnings (data was imported but with fuzzy matching):');
      result.warnings.forEach((warning) => {
        console.log(`  Row ${warning.rowIndex}: ${warning.message}`);
      });
    }
  } catch (error) {
    console.error('Batch import failed:', error);
  }
}

// Run all examples
export function runAllExamples() {
  example1_fuzzyMatchCropNames();
  console.log('\n');
  example2_fuzzyMatchPesticideNames();
  console.log('\n');
  example3_generateCSVTemplate();
  console.log('\n');
  example4_importCropsFromFile();
  console.log('\n');
  example5_handleValidationErrors();
  console.log('\n');
  example6_reactComponentIntegration();
  console.log('\n');
  example7_batchImportWithErrorRecovery();
}
