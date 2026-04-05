/**
 * Undo/Redo Integration Example
 * 
 * This file demonstrates how to integrate the useUndoRedo hook into the App component.
 * 
 * Key Integration Points:
 * 
 * 1. Replace useState for form and practices with useUndoRedo
 * 2. Add keyboard shortcuts for Ctrl+Z (undo) and Ctrl+Y/Ctrl+Shift+Z (redo)
 * 3. Add Undo/Redo buttons to the UI
 * 4. Clear history on successful calculation or reset
 * 
 * Example Usage in App.tsx:
 * 
 * ```typescript
 * import { useUndoRedo } from './hooks/useUndoRedo';
 * 
 * // Replace these lines:
 * // const [form, setForm] = useState<FarmForm>(createInitialForm);
 * // const [practices, setPractices] = useState<CropPractice[]>([defaultPractice()]);
 * 
 * // With:
 * const {
 *   state: form,
 *   setState: setForm,
 *   undo: undoForm,
 *   redo: redoForm,
 *   canUndo: canUndoForm,
 *   canRedo: canRedoForm,
 *   clearHistory: clearFormHistory,
 * } = useUndoRedo<FarmForm>(createInitialForm());
 * 
 * const {
 *   state: practices,
 *   setState: setPractices,
 *   undo: undoPractices,
 *   redo: redoPractices,
 *   canUndo: canUndoPractices,
 *   canRedo: canRedoPractices,
 *   clearHistory: clearPracticesHistory,
 * } = useUndoRedo<CropPractice[]>([defaultPractice()]);
 * 
 * // Add keyboard shortcuts
 * useEffect(() => {
 *   const handleKeyDown = (e: KeyboardEvent) => {
 *     const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
 *     const modifier = isMac ? e.metaKey : e.ctrlKey;
 *     
 *     if (!modifier) return;
 *     
 *     if (e.key === 'z' && !e.shiftKey) {
 *       e.preventDefault();
 *       undoForm();
 *       undoPractices();
 *     } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
 *       e.preventDefault();
 *       redoForm();
 *       redoPractices();
 *     }
 *   };
 *   
 *   window.addEventListener('keydown', handleKeyDown);
 *   return () => window.removeEventListener('keydown', handleKeyDown);
 * }, [undoForm, redoForm, undoPractices, redoPractices]);
 * 
 * // Clear history on successful calculation
 * function runCalculation() {
 *   // ... existing calculation logic ...
 *   
 *   // After successful calculation:
 *   clearFormHistory();
 *   clearPracticesHistory();
 * }
 * 
 * // Clear history on reset
 * function resetAllInputs() {
 *   setForm(createInitialForm());
 *   setPractices([defaultPractice()]);
 *   clearFormHistory();
 *   clearPracticesHistory();
 *   setErrors([]);
 *   setResults(null);
 *   setAnimalBreakdown(null);
 * }
 * 
 * // Add Undo/Redo buttons to UI
 * const canUndo = canUndoForm || canUndoPractices;
 * const canRedo = canRedoForm || canRedoPractices;
 * 
 * function handleUndo() {
 *   undoForm();
 *   undoPractices();
 * }
 * 
 * function handleRedo() {
 *   redoForm();
 *   redoPractices();
 * }
 * 
 * // In the JSX, add buttons (e.g., in the action-row):
 * <div className="action-row">
 *   <button 
 *     className="ghost btn-with-icon" 
 *     type="button" 
 *     onClick={handleUndo}
 *     disabled={!canUndo}
 *     title={isMac ? "Undo (⌘Z)" : "Undo (Ctrl+Z)"}
 *   >
 *     <Icon name="back" className="icon-xs" />
 *     {t.undo}
 *   </button>
 *   <button 
 *     className="ghost btn-with-icon" 
 *     type="button" 
 *     onClick={handleRedo}
 *     disabled={!canRedo}
 *     title={isMac ? "Redo (⌘Y)" : "Redo (Ctrl+Y)"}
 *   >
 *     <Icon name="next" className="icon-xs" />
 *     {t.redo}
 *   </button>
 *   <button className="ghost btn-with-icon" type="button" onClick={clearResultsOnly}>
 *     <Icon name="clear" className="icon-xs" />
 *     {t.clearResults}
 *   </button>
 *   <button className="ghost btn-with-icon" type="button" onClick={resetAllInputs}>
 *     <Icon name="reset" className="icon-xs" />
 *     {t.resetInputs}
 *   </button>
 * </div>
 * ```
 * 
 * Add translations to the dict object:
 * 
 * ```typescript
 * const dict: Record<Lang, Dict> = {
 *   en: {
 *     // ... existing translations ...
 *     undo: "Undo",
 *     redo: "Redo",
 *   },
 *   ua: {
 *     // ... existing translations ...
 *     undo: "Скасувати",
 *     redo: "Повторити",
 *   }
 * };
 * ```
 */

export {};
