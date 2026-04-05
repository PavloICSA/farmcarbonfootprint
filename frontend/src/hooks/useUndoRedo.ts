/**
 * useUndoRedo Hook
 * Provides undo/redo functionality with state history management
 * Maintains up to 20 previous states
 */

import { useCallback, useReducer, useRef } from 'react';

interface UndoableState<T> {
  past: T[];
  present: T;
  future: T[];
}

type UndoableAction<T> =
  | { type: 'SET'; payload: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'REPLACE'; payload: T }; // Replace without adding to history

const MAX_HISTORY_SIZE = 20;

function undoableReducer<T>(
  state: UndoableState<T>,
  action: UndoableAction<T>
): UndoableState<T> {
  switch (action.type) {
    case 'SET': {
      // Add current state to past, set new state as present, clear future
      const newPast = [...state.past, state.present];
      
      // Keep only last MAX_HISTORY_SIZE states
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      
      return {
        past: newPast,
        present: action.payload,
        future: [],
      };
    }
    
    case 'UNDO': {
      if (state.past.length === 0) {
        return state; // Nothing to undo
      }
      
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    
    case 'REDO': {
      if (state.future.length === 0) {
        return state; // Nothing to redo
      }
      
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    
    case 'CLEAR_HISTORY': {
      return {
        past: [],
        present: state.present,
        future: [],
      };
    }
    
    case 'REPLACE': {
      // Replace current state without adding to history
      return {
        ...state,
        present: action.payload,
      };
    }
    
    default:
      return state;
  }
}

export interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  replaceState: (newState: T) => void;
}

/**
 * Hook for managing undo/redo functionality
 * @param initialState - Initial state value
 * @returns Object with state, setState, undo, redo, and helper properties
 */
export function useUndoRedo<T>(initialState: T): UseUndoRedoReturn<T> {
  const [undoableState, dispatch] = useReducer(undoableReducer<T>, {
    past: [],
    present: initialState,
    future: [],
  });
  
  const setState = useCallback((newState: T) => {
    dispatch({ type: 'SET', payload: newState });
  }, []);
  
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);
  
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);
  
  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);
  
  const replaceState = useCallback((newState: T) => {
    dispatch({ type: 'REPLACE', payload: newState });
  }, []);
  
  return {
    state: undoableState.present,
    setState,
    undo,
    redo,
    canUndo: undoableState.past.length > 0,
    canRedo: undoableState.future.length > 0,
    clearHistory,
    replaceState,
  };
}
