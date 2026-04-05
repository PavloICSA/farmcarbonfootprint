# Validation Framework

Comprehensive client-side validation system for the Farm Carbon Footprint App.

## Overview

The validation framework provides:

- **Numeric input validation** with range checking
- **Area matching validation** (total vs crop areas)
- **Minimum data requirement validation**
- **Valid reference ID validation** for crops and pesticides
- **Inline error tooltips** adjacent to invalid fields
- **Form submission prevention** while errors exist
- **Bilingual support** (English and Ukrainian)
- **Accessibility compliance** with ARIA attributes

## Architecture

### Core Components

1. **ValidationManager** (`validation-manager.ts`)
   - Core validation logic
   - Field-level and form-level validation
   - Bilingual error messages

2. **useValidation Hook** (`hooks/useValidation.ts`)
   - React hook for form validation
   - Debounced validation
   - Field-level error tracking

3. **ValidationTooltip Component** (`components/ValidationTooltip.tsx`)
   - Displays inline validation messages
   - Supports errors and warnings
   - Accessible with ARIA attributes

4. **ValidatedInput Component** (`components/ValidatedInput.tsx`)
   - Input field with built-in validation
   - Automatic error display
   - Simplified integration

## Usage

### Basic Form Validation

```typescript
import { useValidation } from './hooks/useValidation';

function MyForm() {
  const [form, setForm] = useState<FarmForm>(initialForm);
  const [lang, setLang] = useState<Lang>('en');

  const {
    validation,
    canSubmit,
    getFieldErrors,
    hasFieldError,
  } = useValidation(form, lang, {
    debounceMs: 500,
    validateOnMount: false,
    showWarnings: true,
  });

  function handleSubmit() {
    if (!canSubmit) {
      alert('Please fix validation errors');
      return;
    }
    // Process form...
  }

  return (
    <form>
      {/* Form fields */}
      <button onClick={handleSubmit} disabled={!canSubmit}>
        Submit
      </button>
    </form>
  );
}
```

### Validated Input Field

```typescript
import { ValidatedInput } from './components/ValidatedInput';

<ValidatedInput
  value={form.totalArea}
  onChange={(e) => setForm({ ...form, totalArea: e.target.value })}
  min={0}
  max={1000000}
  fieldName="totalArea"
  language={lang}
  label="Total Farm Area (ha)"
  required={true}
/>
```

### Manual Validation Display

```typescript
import { ValidationMessage } from './components/ValidationTooltip';

<div className={`field ${hasFieldError('totalArea') ? 'field--has-error' : ''}`}>
  <label>Total Farm Area</label>
  <input
    value={form.totalArea}
    onChange={(e) => setForm({ ...form, totalArea: e.target.value })}
    aria-invalid={hasFieldError('totalArea')}
  />
  {getFieldErrors('totalArea').map((error, index) => (
    <ValidationMessage key={index} error={error} />
  ))}
</div>
```

### Crop-Specific Validation

```typescript
// Validate a specific crop field
const cropErrors = getFieldErrors('area', cropIndex);
const hasCropError = hasFieldError('area', cropIndex);

<div className={`field ${hasCropError ? 'field--has-error' : ''}`}>
  <label>Crop Area</label>
  <input
    value={crop.area}
    onChange={(e) => updateCrop(cropIndex, { area: e.target.value })}
    aria-invalid={hasCropError}
  />
  {cropErrors.map((error, index) => (
    <ValidationMessage key={index} error={error} />
  ))}
</div>
```

## Validation Rules

### Numeric Fields

| Field | Min | Max | Type |
|-------|-----|-----|------|
| Total Area | 0 | 1,000,000 | Decimal |
| Crop Area | 0 | 1,000,000 | Decimal |
| Nitrogen | 0 | 1,000 | Decimal |
| Phosphorus | 0 | 500 | Decimal |
| Potassium | 0 | 500 | Decimal |
| Manure | 0 | 200 | Decimal |
| Diesel | 0 | 500 | Decimal |
| Irrigation | 0 | 2,000 | Decimal |
| Pesticide Rate | 0 | 100 | Decimal |
| Dairy Cows | 0 | 100,000 | Integer |
| Pigs | 0 | 1,000,000 | Integer |
| Chickens | 0 | 10,000,000 | Integer |

### Area Matching

- Total crop area must equal total farm area (±0.01 ha tolerance)
- Skipped for livestock-only farms (total area = 0)

### Minimum Data

- Must have either:
  - Total farm area > 0, OR
  - At least one livestock value > 0

### Reference IDs

- Crop ID must be valid (0 to crops.length - 1)
- Pesticide ID must be valid (-1 for "no pesticide", or 0 to pesticides.length - 1)

## Error Types

### Errors (Red)

- Block form submission
- Indicate invalid data that must be fixed
- Examples:
  - "Must be a valid number"
  - "Must be between 0 and 1000"
  - "Total crop area must equal total farm area"

### Warnings (Yellow)

- Allow form submission
- Indicate potentially problematic data
- Examples:
  - "Value seems unusually high (>800)"

## Validation Messages

All validation messages are bilingual (English/Ukrainian):

```typescript
const validationMessages = {
  en: {
    notANumber: 'Must be a valid number',
    mustBePositive: 'Must be a positive number',
    mustBeNonNegative: 'Must be zero or greater',
    outOfRange: 'Must be between {min} and {max}',
    areaMismatch: 'Total crop area ({cropTotal} ha) must equal total farm area ({farmTotal} ha)',
    // ... more messages
  },
  ua: {
    notANumber: 'Має бути дійсним числом',
    mustBePositive: 'Має бути додатним числом',
    mustBeNonNegative: 'Має бути нулем або більше',
    outOfRange: 'Має бути між {min} та {max}',
    areaMismatch: 'Загальна площа культур ({cropTotal} га) має дорівнювати загальній площі господарства ({farmTotal} га)',
    // ... more messages
  },
};
```

## Accessibility

The validation framework is fully accessible:

### ARIA Attributes

- `aria-invalid`: Marks invalid fields
- `aria-describedby`: Links error messages to fields
- `role="alert"`: Announces validation messages
- `aria-live="polite"`: Updates announced without interrupting
- `aria-required`: Marks required fields

### Keyboard Navigation

- All validation messages are keyboard accessible
- Error messages are announced to screen readers
- Focus management for error correction

### Visual Indicators

- Red border for error fields
- Yellow border for warning fields
- Icon indicators for error/warning types
- High contrast support in dark mode

## Styling

The validation components use CSS classes that integrate with the existing theme system:

```css
/* Field states */
.field--has-error input { border-color: #c33; }
.field--has-warning input { border-color: #ffeaa7; }

/* Validation messages */
.validation-message--error { background-color: #fee; color: #c33; }
.validation-message--warning { background-color: #fffbea; color: #856404; }

/* Dark theme support */
[data-theme="dark"] .validation-message--error {
  background-color: #4a1f1f;
  color: #ffaaaa;
}
```

## Performance

### Debouncing

Validation is debounced to avoid excessive re-renders:

- Form-level validation: 500ms default
- Field-level validation: 300ms default
- Configurable per use case

### Optimization

- Validation only runs when form data changes
- Memoized error lookups
- Efficient field-level error filtering

## Testing

### Unit Tests

Test validation logic independently:

```typescript
import { validationManager } from './lib/validation-manager';

test('validates numeric input', () => {
  const error = validationManager.validateNumericInput(
    'abc',
    0,
    100,
    'testField',
    'en'
  );
  expect(error).not.toBeNull();
  expect(error?.message).toBe('Must be a valid number');
});
```

### Integration Tests

Test validation in components:

```typescript
import { render, screen } from '@testing-library/react';
import { ValidatedInput } from './components/ValidatedInput';

test('displays error for invalid input', async () => {
  render(
    <ValidatedInput
      value="abc"
      onChange={() => {}}
      min={0}
      max={100}
      fieldName="test"
      language="en"
    />
  );
  
  await waitFor(() => {
    expect(screen.getByText('Must be a valid number')).toBeInTheDocument();
  });
});
```

## Extension

### Adding New Validation Rules

1. Add validation logic to `ValidationManager`:

```typescript
validateCustomRule(form: FarmForm, language: Lang): ValidationError[] {
  const errors: ValidationError[] = [];
  // Custom validation logic
  return errors;
}
```

2. Call from `validateForm`:

```typescript
validateForm(form: FarmForm, language: Lang): ValidationResult {
  const errors: ValidationError[] = [];
  // ... existing validations
  const customErrors = this.validateCustomRule(form, language);
  errors.push(...customErrors);
  // ... rest of validation
}
```

3. Add messages to dictionary:

```typescript
const validationMessages = {
  en: {
    // ... existing messages
    customError: 'Custom error message',
  },
  ua: {
    // ... existing messages
    customError: 'Повідомлення про помилку',
  },
};
```

### Custom Validation Components

Create custom components using the validation hooks:

```typescript
import { useFieldValidation } from './hooks/useValidation';

function CustomValidatedField({ value, onChange, language }) {
  const { error, hasError } = useFieldValidation(
    value,
    0,
    100,
    'customField',
    language
  );

  return (
    <div className={hasError ? 'error' : ''}>
      <input value={value} onChange={onChange} />
      {error && <span>{error.message}</span>}
    </div>
  );
}
```

## Requirements Satisfied

This validation framework satisfies the following requirements:

- **14.1-14.7**: Input validation with inline tooltips
- **25.1-25.7**: Field-level validation messages
- **66.1-66.7**: Comprehensive validation framework
  - 66.1: Numeric input validation with range checking
  - 66.2: Area matching validation
  - 66.3: Minimum data requirement validation
  - 66.4: Valid reference ID validation
  - 66.5: Inline error tooltips
  - 66.6: Form submission prevention
  - 66.7: Bilingual support

## Files

- `frontend/src/lib/validation-manager.ts` - Core validation logic
- `frontend/src/hooks/useValidation.ts` - React validation hooks
- `frontend/src/components/ValidationTooltip.tsx` - Validation message components
- `frontend/src/components/ValidationTooltip.css` - Validation styles
- `frontend/src/components/ValidatedInput.tsx` - Validated input components
- `frontend/src/lib/validation-example.ts` - Integration examples
- `frontend/src/lib/validation-README.md` - This documentation
