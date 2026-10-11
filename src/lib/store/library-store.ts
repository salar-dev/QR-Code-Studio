import { SENSITIVE_FIELDS } from "../qr/content/defaults";
import type { ContentState, ContentType } from "../qr/content/types";
import type { QRDesign } from "../qr/design/types";
import { coerceContent, coerceDesign } from "../persistence/coerce";
import { createId, readJson, STORAGE_KEYS, writeJson } from "../persistence/local-storage";
import { createStore, useStore } from "./create-store";

export interface SavedStyle {
  id: string;
  name: string;
  createdAt: number;
  design: QRDesign;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  contentType: ContentType;
  /** Short human-readable summary of the payload (omitted for private types). */
  label: string;
  /** Null when the content was private and the user didn't opt in. */
  content: ContentState | null;
  design: QRDesign;
  format: string;
  thumbnail: string;
}

const MAX_STYLES = 40;
const MAX_HISTORY = 12;

export const stylesStore = createStore<SavedStyle[]>([]);
export const historyStore = createStore<HistoryEntry[]>([]);
export const useSavedStyles = () => useStore(stylesStore, (s) => s);
export const useHistory = () => useStore(historyStore, (s) => s);

function persist<T>(key: string, items: T[], dropLogos: (items: T[]) => T[]) {
  if (!writeJson(key, items)) writeJson(key, dropLogos(items));
}

const withoutLogo = (design: QRDesign): QRDesign => ({ ...design, logo: { ...design.logo, src: null } });

export function saveStyle(name: string, design: QRDesign): SavedStyle {
  const style: SavedStyle = { id: createId(), name: name.trim().slice(0, 60), createdAt: Date.now(), design: structuredClone(design) };
  stylesStore.setState((styles) => [style, ...styles].slice(0, MAX_STYLES));
  return style;
}

export function renameStyle(id: string, name: string) {
  stylesStore.setState((styles) => styles.map((s) => (s.id === id ? { ...s, name: name.trim().slice(0, 60) || s.name } : s)));
}

export function duplicateStyle(id: string, suffix: string) {
  stylesStore.setState((styles) => {
    const index = styles.findIndex((s) => s.id === id);
    if (index === -1) return styles;
    const source = styles[index];
    const copy: SavedStyle = {
      id: createId(),
      name: `${source.name} ${suffix}`.slice(0, 60),
      createdAt: Date.now(),
      design: structuredClone(source.design),
    };
    return [...styles.slice(0, index + 1), copy, ...styles.slice(index + 1)].slice(0, MAX_STYLES);
  });
}

export function deleteStyle(id: string) {
  stylesStore.setState((styles) => styles.filter((s) => s.id !== id));
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">) {
  historyStore.setState((items) => [{ ...entry, id: createId(), createdAt: Date.now() }, ...items].slice(0, MAX_HISTORY));
}

export function deleteHistoryEntry(id: string) {
  historyStore.setState((items) => items.filter((item) => item.id !== id));
}

export function clearHistory() {
  historyStore.setState([]);
}

export function isPrivateType(type: ContentType): boolean {
  return Boolean(SENSITIVE_FIELDS[type]);
}

let initialized = false;

export function initLibraryPersistence() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const styles = readJson<unknown[]>(STORAGE_KEYS.styles);
  if (Array.isArray(styles)) {
    stylesStore.setState(
      styles
        .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
        .map((s) => ({
          id: typeof s.id === "string" ? s.id : createId(),
          name: typeof s.name === "string" ? s.name.slice(0, 60) : "Style",
          createdAt: typeof s.createdAt === "number" ? s.createdAt : Date.now(),
          design: coerceDesign(s.design),
        }))
        .slice(0, MAX_STYLES),
    );
  }

  const history = readJson<unknown[]>(STORAGE_KEYS.history);
  if (Array.isArray(history)) {
    historyStore.setState(
      history
        .filter((h): h is Record<string, unknown> => typeof h === "object" && h !== null)
        .map((h) => {
          const content = h.content ? coerceContent(h.content) : null;
          return {
            id: typeof h.id === "string" ? h.id : createId(),
            createdAt: typeof h.createdAt === "number" ? h.createdAt : Date.now(),
            contentType: content?.type ?? (typeof h.contentType === "string" ? (h.contentType as ContentType) : "url"),
            label: typeof h.label === "string" ? h.label.slice(0, 200) : "",
            content,
            design: coerceDesign(h.design),
            format: typeof h.format === "string" ? h.format.slice(0, 8) : "png",
            thumbnail: typeof h.thumbnail === "string" && h.thumbnail.startsWith("data:image/png;base64,") ? h.thumbnail : "",
          };
        })
        .slice(0, MAX_HISTORY),
    );
  }

  stylesStore.subscribe(() =>
    persist(STORAGE_KEYS.styles, stylesStore.getState(), (items) => items.map((s) => ({ ...s, design: withoutLogo(s.design) }))),
  );
  historyStore.subscribe(() =>
    persist(STORAGE_KEYS.history, historyStore.getState(), (items) => items.map((h) => ({ ...h, design: withoutLogo(h.design) }))),
  );
}
