/**
 * Store Utilities - Pure utilities for Zustand stores
 * 
 * These utilities help prevent common Zustand anti-patterns:
 * - No get() calls in actions (use set((state) => ...) instead)
 * - Stable selectors to prevent useMemo dependency issues
 * - Pure actions without side effects
 */

import { useRef } from 'react'
import { shallow } from 'zustand/shallow'

/**
 * Creates a stable hook that separates state from actions
 * Actions are memoized and don't change on re-renders
 * 
 * @example
 * export const useModal = createStableHook(
 *   useUIStore,
 *   ['isOpen', 'data'],          // State keys (trigger re-renders)
 *   ['openModal', 'closeModal']  // Action keys (stable)
 * )
 */
export function createStableHook<TStore, TState = any, TActions = any>(
  useStore: (selector: (state: any) => any, equalityFn?: any) => any,
  stateKeys: (keyof TStore)[],
  actionKeys: (keyof TStore)[]
) {
  // Create stable selector functions outside the hook
  const stateSelector = (store: any) => {
    if (stateKeys.length === 0) return {}
    const result: any = {}
    for (const key of stateKeys) {
      result[key] = store[key]
    }
    return result
  }

  const actionSelector = (store: any) => {
    const result: any = {}
    for (const key of actionKeys) {
      result[key] = store[key]
    }
    return result
  }

  return () => {
    // Get state with shallow comparison - prevents infinite loops
    const state = useStore(stateSelector, shallow)

    // Get actions once and cache them - stable reference
    const actionsRef = useRef<TActions | null>(null)
    if (!actionsRef.current) {
      actionsRef.current = useStore(actionSelector) as TActions
    }

    return { ...state, ...actionsRef.current } as TState & TActions
  }
}

/**
 * Action helpers for common patterns without using get()
 */
export const actionHelpers = {
  toggle: <TState, K extends keyof TState>(key: K) => 
    (set: (fn: (state: TState) => Partial<TState>) => void) => 
      set((state) => ({ [key]: !state[key] } as Partial<TState>)),

  increment: <TState, K extends keyof TState>(key: K, amount = 1) =>
    (set: (fn: (state: TState) => Partial<TState>) => void) =>
      set((state) => ({ [key]: (state[key] as any) + amount } as Partial<TState>)),

  append: <TState, K extends keyof TState>(key: K, item: any) =>
    (set: (fn: (state: TState) => Partial<TState>) => void) =>
      set((state) => ({ [key]: [...(state[key] as any[]), item] } as Partial<TState>)),
}

/**
 * Creates a pure action that doesn't use get()
 */
export function createPureAction<TState>(
  actionFn: (set: (fn: (state: TState) => Partial<TState>) => void) => (...args: any[]) => void
) {
  return actionFn
}
