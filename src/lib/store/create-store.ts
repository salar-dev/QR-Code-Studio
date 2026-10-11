import { useSyncExternalStore } from "react";

export interface Store<T> {
  getState(): T;
  /** The state used for server rendering and hydration. */
  getServerState(): T;
  setState(next: T | ((previous: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

/**
 * Minimal external store. Server rendering and hydration always use the
 * initial state, then React re-renders with the client state (e.g. restored
 * from localStorage) without hydration mismatches.
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    getServerState: () => initial,
    setState(next) {
      const value = typeof next === "function" ? (next as (previous: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Subscribes to a slice of a store. Selectors must return existing references. */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getServerState()),
  );
}
