# Undo/Redo Functionality

This document describes the undo/redo functionality implementation for the Farm Carbon Footprint Web App.

## Overview

The undo/redo feature allows users to revert and reapply changes to form data and practice settings, providing a safety net for experimentation and error correction.

## Features

- **State History**: Maintains up to 20 previous states for both form data and practices
- **Keyboard Shortcuts**: 
  - `Ctrl+Z` (Windows/Linux) or `⌘Z` (Mac): Undo
  - `Ctrl+Y` or `Ctrl+Shift+Z` (Windows/Linux) or `⌘Y` or `⌘⇧Z` (Mac): Redo
- **UI Buttons**: Undo and Redo buttons with appropriate disabled states
- **History Management**: Automatic history clearing on calculation completion or form reset

## Implementation

### Hook: `useUndoRedo`

Located in `frontend/src/hooks/useUndoRedo.ts`

#### API

```typescript
interface UseUndoRedoReturn<T> {
  state: T;                          // Current state
  setState: (newState: T) => void;   // Set new state (adds to history)
  undo: () => void;                  // Undo last change
  redo: () => void;                  // Redo last undone change
  canUndo: boolean;                  // Whether undo is available
  canRedo: boolean;                  // Whether redo is available
  clearHistory: () => void;          // Clear undo/redo history
  replaceState: (newState: T) => void; // Replace state without adding to history
}
```

#### Usage Example

```typescript
import { useUndoRedo } from './hooks/useUndoRedo';

const {
  state: form,
  setState: setForm,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
} = useUndoRedo<FarmForm>(initialForm);

// Update state (adds to history)
setForm(newFormData);

// Undo last change
undo();

// Redo last undone change
redo();

// Clear history (e.g., after successful calculation)
clearHistory();

// Replace state without adding to history (e.g., when loading from storage)
replaceState(loadedFormData);
```

### State Structure

The hook maintains three stacks:

```typescript
interface UndoableState<T> {
  past: T[];      // Previous states (up to 20)
  present: T;     // Current state
  future: T[];    // States available for redo
}
```

### Actions

1. **SET**: Add current state to past, set new state as present, clear future
2. **UNDO**: Move current state to future, restore previous state from past
3. **REDO**: Move current state to past, restore next state from future
4. **CLEAR_HISTORY**: Clear past and future, keep present
5. **REPLACE**: Replace present without modifying history

## Integration Points

### 1. Replace useState with useUndoRedo

```typescript
// Before:
const [form, setForm] = useState<FarmForm>(createInitialForm);
const [practices, setPractices] = useState<CropPractice[]>([defaultPractice()]);

// After:
const {
  state: form,
  setState: setForm,
  undo: undoForm,
  redo: redoForm,
  canUndo: canUndoForm,
  canRedo: canRedoForm,
  clearHistory: clearFormHistory,
} = useUndoRedo<FarmForm>(createInitialForm());

const {
  state: practices,
  setState: setPractices,
  undo: undoPractices,
  redo: redoPractices,
  canUndo: canUndoPractices,
  canRedo: canRedoPractices,
  clearHistory: clearPracticesHistory,
} = useUndoRedo<CropPractice[]>([defaultPractice()]);
```

### 2. Add Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    if (!modifier) return;
    
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoForm();
      undoPractices();
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      redoForm();
      redoPractices();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undoForm, redoForm, undoPractices, redoPractices]);
```

### 3. Add UI Buttons

```typescript
const canUndo = canUndoForm || canUndoPractices;
const canRedo = canRedoForm || canRedoPractices;

function handleUndo() {
  undoForm();
  undoPractices();
}

function handleRedo() {
  redoForm();
  redoPractices();
}

// In JSX:
<button 
  className="ghost btn-with-icon" 
  type="button" 
  onClick={handleUndo}
  disabled={!canUndo}
>
  <Icon name="back" className="icon-xs" />
  {t.undo}
</button>
<button 
  className="ghost btn-with-icon" 
  type="button" 
  onClick={handleRedo}
  disabled={!canRedo}
>
  <Icon name="next" className="icon-xs" />
  {t.redo}
</button>
```

### 4. Clear History on Calculation/Reset

```typescript
function runCalculation() {
  // ... existing calculation logic ...
  
  // After successful calculation:
  clearFormHistory();
  clearPracticesHistory();
}

function resetAllInputs() {
  setForm(createInitialForm());
  setPractices([defaultPractice()]);
  clearFormHistory();
  clearPracticesHistory();
  setErrors([]);
  setResults(null);
  setAnimalBreakdown(null);
}
```

## Translations

Add the following translations to the `dict` object:

```typescript
const dict: Record<Lang, Dict> = {
  en: {
    // ... existing translations ...
    undo: "Undo",
    redo: "Redo",
  },
  ua: {
    // ... existing translations ...
    undo: "Скасувати",
    redo: "Повторити",
  }
};
```

Update the `Dict` type:

```typescript
type Dict = {
  // ... existing fields ...
  undo: string;
  redo: string;
};
```

## Behavior

### History Limit

- Maximum 20 states in history
- Oldest states are automatically removed when limit is reached
- Prevents memory issues with long editing sessions

### Redo Stack Clearing

- Redo stack is cleared when a new change is made after undo
- Standard undo/redo behavior (like text editors)

### Boundary Conditions

- Undo button disabled when no history available
- Redo button disabled when no future states available
- Keyboard shortcuts have no effect at boundaries

### History Clearing

History is cleared in these scenarios:
1. Successful calculation completion
2. Form reset
3. Manual clear via `clearHistory()`

## Testing

### Manual Testing Checklist

- [ ] Make changes to form fields
- [ ] Press Ctrl+Z (or ⌘Z) to undo changes
- [ ] Verify form reverts to previous state
- [ ] Press Ctrl+Y (or ⌘Y) to redo changes
- [ ] Verify form returns to newer state
- [ ] Make 25+ changes and verify only last 20 are kept
- [ ] Make changes, undo, then make new changes
- [ ] Verify redo stack is cleared
- [ ] Complete calculation and verify history is cleared
- [ ] Reset form and verify history is cleared
- [ ] Test with both form data and practices
- [ ] Verify buttons are disabled appropriately
- [ ] Test keyboard shortcuts on Mac and Windows/Linux

### Edge Cases

1. **Empty History**: Undo/redo should have no effect
2. **Single State**: Only present state exists, no undo/redo available
3. **History Limit**: Oldest states removed when exceeding 20
4. **Rapid Changes**: All changes tracked correctly
5. **Complex State**: Nested objects and arrays handled correctly

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **23.1**: Maintains Undo_Stack of up to 20 previous States
- **23.2**: Provides "Undo" button that restores previous State
- **23.3**: Provides "Redo" button that restores next State after undo
- **23.4**: Supports keyboard shortcuts: Ctrl+Z for undo, Ctrl+Y for redo
- **23.5**: Clears redo stack when User makes new change after undo
- **23.6**: Disables Undo button when at oldest State
- **23.7**: Disables Redo button when at newest State

## Future Enhancements

Potential improvements for future iterations:

1. **Selective Undo**: Undo only form or only practices
2. **History Visualization**: Show list of previous states
3. **Named Checkpoints**: Allow users to name important states
4. **Persistent History**: Save history to localStorage
5. **Undo Grouping**: Group rapid changes into single undo step
6. **History Branching**: Support multiple undo branches

## Performance Considerations

- State is stored by value (deep copy)
- Large forms may impact memory with 20 states
- Consider using structural sharing for optimization if needed
- Current implementation is sufficient for typical farm data sizes

## Accessibility

- Keyboard shortcuts work with screen readers
- Buttons have appropriate ARIA labels
- Disabled state communicated to assistive technologies
- Keyboard shortcuts follow platform conventions (Cmd on Mac, Ctrl on Windows/Linux)
