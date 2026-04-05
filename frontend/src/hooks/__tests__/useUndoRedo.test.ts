/**
 * Tests for useUndoRedo hook
 * 
 * Note: These are example tests to demonstrate the expected behavior.
 * To run these tests, you would need to set up a testing framework like Jest and React Testing Library.
 */

import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';

describe('useUndoRedo', () => {
  describe('initial state', () => {
    it('should initialize with provided state', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      expect(result.current.state).toEqual({ count: 0 });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('setState', () => {
    it('should update state and add to history', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
      });
      
      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should maintain multiple states in history', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
        result.current.setState({ count: 3 });
      });
      
      expect(result.current.state).toEqual({ count: 3 });
      expect(result.current.canUndo).toBe(true);
    });

    it('should limit history to 20 states', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        // Add 25 states
        for (let i = 1; i <= 25; i++) {
          result.current.setState({ count: i });
        }
      });
      
      expect(result.current.state).toEqual({ count: 25 });
      
      // Undo 20 times (should reach state 5, not 0)
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.undo();
        }
      });
      
      expect(result.current.state).toEqual({ count: 5 });
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('undo', () => {
    it('should revert to previous state', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
      });
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    it('should do nothing when no history available', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state).toEqual({ count: 0 });
      expect(result.current.canUndo).toBe(false);
    });

    it('should allow multiple undos', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
        result.current.setState({ count: 3 });
      });
      
      act(() => {
        result.current.undo();
        result.current.undo();
      });
      
      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });
  });

  describe('redo', () => {
    it('should restore undone state', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
        result.current.undo();
      });
      
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.state).toEqual({ count: 2 });
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should do nothing when no future states available', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
      });
      
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canRedo).toBe(false);
    });

    it('should allow multiple redos', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
        result.current.setState({ count: 3 });
        result.current.undo();
        result.current.undo();
      });
      
      act(() => {
        result.current.redo();
        result.current.redo();
      });
      
      expect(result.current.state).toEqual({ count: 3 });
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('redo stack clearing', () => {
    it('should clear redo stack when new state is set after undo', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
        result.current.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
      
      act(() => {
        result.current.setState({ count: 10 });
      });
      
      expect(result.current.state).toEqual({ count: 10 });
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('should clear past and future states', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
        result.current.setState({ count: 2 });
        result.current.undo();
      });
      
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(result.current.state).toEqual({ count: 1 });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('replaceState', () => {
    it('should replace state without adding to history', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      act(() => {
        result.current.setState({ count: 1 });
      });
      
      expect(result.current.canUndo).toBe(true);
      
      act(() => {
        result.current.replaceState({ count: 10 });
      });
      
      expect(result.current.state).toEqual({ count: 10 });
      expect(result.current.canUndo).toBe(true); // History still available
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state).toEqual({ count: 0 }); // Goes back to original, not 1
    });
  });

  describe('complex state', () => {
    it('should handle nested objects', () => {
      const initialState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' }
      };
      
      const { result } = renderHook(() => useUndoRedo(initialState));
      
      act(() => {
        result.current.setState({
          user: { name: 'Jane', age: 25 },
          settings: { theme: 'light' }
        });
      });
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state).toEqual(initialState);
    });

    it('should handle arrays', () => {
      const { result } = renderHook(() => useUndoRedo({ items: [1, 2, 3] }));
      
      act(() => {
        result.current.setState({ items: [1, 2, 3, 4] });
        result.current.setState({ items: [1, 2, 3, 4, 5] });
      });
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state).toEqual({ items: [1, 2, 3, 4] });
    });
  });

  describe('canUndo and canRedo flags', () => {
    it('should correctly report undo availability', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      expect(result.current.canUndo).toBe(false);
      
      act(() => {
        result.current.setState({ count: 1 });
      });
      
      expect(result.current.canUndo).toBe(true);
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.canUndo).toBe(false);
    });

    it('should correctly report redo availability', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));
      
      expect(result.current.canRedo).toBe(false);
      
      act(() => {
        result.current.setState({ count: 1 });
      });
      
      expect(result.current.canRedo).toBe(false);
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
      
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.canRedo).toBe(false);
    });
  });
});
