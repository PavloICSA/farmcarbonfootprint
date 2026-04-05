/**
 * Example: Integrating Validation into App Component
 * 
 * This file demonstrates how to integrate the validation framework
 * into the existing App.tsx component.
 */

/*
 * STEP 1: Import validation hooks and components
 * 
 * Add these imports to App.tsx:
 */

// import { useValidation } from './hooks/useValidation';
// import { ValidationMessage } from './components/ValidationTooltip';
// import { ValidatedInput } from './components/ValidatedInput';

/*
 * STEP 2: Add validation hook to App component
 * 
 * Inside the App component, after the existing state declarations:
 */

// const {
//   validation,
//   canSubmit,
//   getFieldErrors,
//   hasFieldError,
// } = useValidation(form, lang, {
//   debounceMs: 500,
//   validateOnMount: false,
//   showWarnings: true,
// });

/*
 * STEP 3: Update the runCalculation function
 * 
 * Prevent calculation if validation errors exist:
 */

// async function runCalculation() {
//   // Check validation before proceeding
//   if (!canSubmit) {
//     setErrors(['Please fix validation errors before calculating']);
//     return;
//   }
//   
//   // ... rest of existing calculation logic
// }

/*
 * STEP 4: Add validation messages to form fields
 * 
 * Option A: Use ValidatedInput component (recommended for new fields)
 */

// <ValidatedInput
//   value={form.totalArea}
//   onChange={(e) => setForm((prev) => ({ ...prev, totalArea: e.target.value }))}
//   min={0}
//   max={1000000}
//   fieldName="totalArea"
//   language={lang}
//   label={t.farmArea}
//   required={true}
// />

/*
 * Option B: Add validation to existing input fields
 */

// <div className={`field ${hasFieldError('totalArea') ? 'field--has-error' : ''}`}>
//   <label>{t.farmArea}</label>
//   <input
//     {...decimalInputProps()}
//     value={form.totalArea}
//     onChange={(e) => setForm((prev) => ({ ...prev, totalArea: e.target.value }))}
//     aria-invalid={hasFieldError('totalArea')}
//   />
//   {getFieldErrors('totalArea').map((error, index) => (
//     <ValidationMessage key={index} error={error} />
//   ))}
// </div>

/*
 * STEP 5: Add validation for crop fields
 * 
 * For crop-specific fields, pass the crop index:
 */

// <div className={`field ${hasFieldError('area', i) ? 'field--has-error' : ''}`}>
//   <label>{t.area}</label>
//   <input
//     {...decimalInputProps()}
//     value={crop.area}
//     onChange={(e) => updateCrop(i, { area: e.target.value })}
//     aria-invalid={hasFieldError('area', i)}
//   />
//   {getFieldErrors('area', i).map((error, index) => (
//     <ValidationMessage key={index} error={error} />
//   ))}
// </div>

/*
 * STEP 6: Disable calculate button when validation fails
 */

// <button
//   className="primary btn-with-icon"
//   type="button"
//   onClick={runCalculation}
//   disabled={!canSubmit}
// >
//   <Icon name="calc" className="icon-xs" />
//   {t.calculate}
// </button>

/*
 * STEP 7: Display validation summary (optional)
 * 
 * Show a summary of all validation errors at the top of the form:
 */

// {validation.hasErrors && (
//   <div className="error-box">
//     <strong>{t.validationErrors}</strong>
//     <ul>
//       {validation.errors
//         .filter(e => e.type === 'error')
//         .map((error, index) => (
//           <li key={index}>
//             {error.cropIndex !== undefined && `${t.crop} #${error.cropIndex + 1}: `}
//             {error.message}
//           </li>
//         ))}
//     </ul>
//   </div>
// )}

/*
 * STEP 8: Add validation messages to dictionary
 * 
 * Add these to the dict object in App.tsx:
 */

// const dict: Record<Lang, Dict> = {
//   en: {
//     // ... existing translations
//     validationErrors: 'Please fix these validation errors:',
//   },
//   ua: {
//     // ... existing translations
//     validationErrors: 'Будь ласка, виправте ці помилки валідації:',
//   },
// };

/*
 * COMPLETE EXAMPLE: Validated Farm Area Field
 */

export const ValidatedFarmAreaExample = `
<div className="field">
  <label>{t.farmArea}</label>
  <input
    {...decimalInputProps()}
    value={form.totalArea}
    onChange={(e) => setForm((prev) => ({ ...prev, totalArea: e.target.value }))}
    className={hasFieldError('totalArea') ? 'input-error' : ''}
    aria-invalid={hasFieldError('totalArea')}
    aria-describedby={hasFieldError('totalArea') ? 'totalArea-error' : undefined}
  />
  {getFieldErrors('totalArea').map((error, index) => (
    <ValidationMessage
      key={index}
      error={error}
      id={index === 0 ? 'totalArea-error' : undefined}
    />
  ))}
</div>
`;

/*
 * COMPLETE EXAMPLE: Validated Crop Field
 */

export const ValidatedCropFieldExample = `
<div className="field">
  <label>{t.area}</label>
  <input
    {...decimalInputProps()}
    value={crop.area}
    onChange={(e) => updateCrop(i, { area: e.target.value })}
    className={hasFieldError('area', i) ? 'input-error' : ''}
    aria-invalid={hasFieldError('area', i)}
    aria-describedby={hasFieldError('area', i) ? \`crop-\${i}-area-error\` : undefined}
  />
  {getFieldErrors('area', i).map((error, index) => (
    <ValidationMessage
      key={index}
      error={error}
      id={index === 0 ? \`crop-\${i}-area-error\` : undefined}
    />
  ))}
</div>
`;

/*
 * STYLING NOTES:
 * 
 * The validation components use CSS classes that work with the existing
 * theme system. Make sure to import the ValidationTooltip.css file:
 * 
 * import './components/ValidationTooltip.css';
 * 
 * The following CSS classes are available:
 * - .field--has-error: Applied to field wrapper when there's an error
 * - .field--has-warning: Applied to field wrapper when there's a warning
 * - .validation-message: Inline validation message
 * - .validation-tooltip: Floating tooltip (for advanced use)
 */

/*
 * ACCESSIBILITY NOTES:
 * 
 * The validation framework includes proper ARIA attributes:
 * - aria-invalid: Indicates invalid fields to screen readers
 * - aria-describedby: Links error messages to fields
 * - role="alert": Announces validation messages
 * - aria-live="polite": Updates are announced without interrupting
 * 
 * Make sure to maintain these attributes when integrating.
 */
