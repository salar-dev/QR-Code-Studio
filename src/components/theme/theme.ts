"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@/lib/persistence/local-storage";

export type ThemePreference = "light" | "dark" | "system";

const CHANGE_EVENT = "qrstudio:theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.theme);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(callback: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

/** Theme preference plus the resolved light/dark value, synced across tabs. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);
  const resolved = useSyncExternalStore<"light" | "dark">(
    subscribe,
    () => (preference === "dark" || (preference === "system" && systemPrefersDark()) ? "dark" : "light"),
    () => "light" as const,
  );

  // Keep the document in sync (system changes, other tabs).
  useEffect(() => applyTheme(preference), [preference, resolved]);

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEYS.theme);
      else window.localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      // Storage unavailable: still apply for this page view.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preference, resolved, setTheme };
}
