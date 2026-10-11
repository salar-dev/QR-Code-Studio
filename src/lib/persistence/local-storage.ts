/**
 * Defensive localStorage access: storage can be unavailable (private mode,
 * disabled cookies, SSR) or full. Failures never break the editor.
 */

export const STORAGE_KEYS = {
  session: "qrstudio:session:v1",
  styles: "qrstudio:styles:v1",
  history: "qrstudio:history:v1",
  recentColors: "qrstudio:recent-colors:v1",
  preferences: "qrstudio:preferences:v1",
  theme: "qrstudio:theme",
} as const;

export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored (e.g. quota exceeded). */
export function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
