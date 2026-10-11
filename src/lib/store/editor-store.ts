import { DEFAULT_CONTENT, stripSensitiveContent } from "../qr/content/defaults";
import type { ContentState, ContentType } from "../qr/content/types";
import { DEFAULT_DESIGN } from "../qr/design/defaults";
import type { DesignPreset } from "../qr/design/presets";
import type { PreviewBackdrop, QRDesign } from "../qr/design/types";
import { DEFAULT_EXPORT, type ExportSettings } from "../qr/export/types";
import { coerceContent, coerceDesign, coerceExport } from "../persistence/coerce";
import { readJson, removeKey, STORAGE_KEYS, writeJson } from "../persistence/local-storage";
import { createStore, useStore } from "./create-store";

export interface PreviewSettings {
  backdrop: PreviewBackdrop;
  customBackdrop: string;
}

export interface EditorState {
  content: ContentState;
  design: QRDesign;
  exportSettings: ExportSettings;
  preview: PreviewSettings;
}

export interface Preferences {
  rememberSession: boolean;
  rememberSensitive: boolean;
}

export const DEFAULT_PREVIEW: PreviewSettings = { backdrop: "checker", customBackdrop: "#1f2937" };
export const DEFAULT_PREFERENCES: Preferences = { rememberSession: true, rememberSensitive: false };

const INITIAL_STATE: EditorState = {
  content: DEFAULT_CONTENT,
  design: DEFAULT_DESIGN,
  exportSettings: DEFAULT_EXPORT,
  preview: DEFAULT_PREVIEW,
};

export const editorStore = createStore<EditorState>(INITIAL_STATE);
export const preferencesStore = createStore<Preferences>(DEFAULT_PREFERENCES);
export const recentColorsStore = createStore<string[]>([]);

export const useEditor = <S>(selector: (state: EditorState) => S) => useStore(editorStore, selector);
export const usePreferences = () => useStore(preferencesStore, (s) => s);
export const useRecentColors = () => useStore(recentColorsStore, (s) => s);

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function setContentType(type: ContentType) {
  editorStore.setState((s) => ({ ...s, content: { ...s.content, type } }));
}

export function patchContent<K extends Exclude<ContentType, never>>(type: K, patch: Partial<ContentState[K]>) {
  editorStore.setState((s) => ({
    ...s,
    content: { ...s.content, [type]: { ...s.content[type], ...patch } },
  }));
}

export function clearContent(type: ContentType) {
  editorStore.setState((s) => ({
    ...s,
    content: { ...s.content, [type]: structuredClone(DEFAULT_CONTENT[type]) },
  }));
}

export function setDesign(updater: (design: QRDesign) => QRDesign) {
  editorStore.setState((s) => ({ ...s, design: updater(s.design) }));
}

export function applyPreset(preset: DesignPreset) {
  editorStore.setState((s) => ({
    ...s,
    design: { ...s.design, ...structuredClone(preset.design) },
    preview: preset.backdrop ? { ...s.preview, backdrop: preset.backdrop } : s.preview,
  }));
}

export function applyDesign(design: QRDesign) {
  editorStore.setState((s) => ({ ...s, design: structuredClone(design) }));
}

export function resetDesign() {
  editorStore.setState((s) => ({ ...s, design: DEFAULT_DESIGN }));
}

export function setExportSettings(patch: Partial<ExportSettings>) {
  editorStore.setState((s) => ({ ...s, exportSettings: { ...s.exportSettings, ...patch } }));
}

export function setPreview(patch: Partial<PreviewSettings>) {
  editorStore.setState((s) => ({ ...s, preview: { ...s.preview, ...patch } }));
}

export function resetAll() {
  editorStore.setState(INITIAL_STATE);
}

/** Restores a saved snapshot (e.g. from history). Missing parts keep current values. */
export function loadSnapshot(snapshot: { content?: ContentState; design: QRDesign }) {
  editorStore.setState((s) => ({
    ...s,
    content: snapshot.content ? coerceContent(snapshot.content) : s.content,
    design: coerceDesign(snapshot.design),
  }));
}

export function setPreferences(patch: Partial<Preferences>) {
  preferencesStore.setState((p) => ({ ...p, ...patch }));
}

export function pushRecentColor(color: string) {
  recentColorsStore.setState((colors) => [color, ...colors.filter((c) => c !== color)].slice(0, 10));
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

interface PersistedSession {
  content: ContentState;
  design: QRDesign;
  exportSettings: ExportSettings;
  preview: PreviewSettings;
}

function serializeSession(state: EditorState, prefs: Preferences): PersistedSession {
  return {
    content: prefs.rememberSensitive ? state.content : stripSensitiveContent(state.content),
    design: state.design,
    exportSettings: state.exportSettings,
    preview: state.preview,
  };
}

function persistSession() {
  const prefs = preferencesStore.getState();
  if (!prefs.rememberSession) return;
  const session = serializeSession(editorStore.getState(), prefs);
  if (!writeJson(STORAGE_KEYS.session, session)) {
    // Most likely a quota error caused by a large logo: retry without it.
    writeJson(STORAGE_KEYS.session, { ...session, design: { ...session.design, logo: { ...session.design.logo, src: null } } });
  }
}

/** Deletes everything this app stored on the device. */
export function clearSavedData() {
  Object.values(STORAGE_KEYS)
    .filter((key) => key !== STORAGE_KEYS.theme)
    .forEach(removeKey);
}

let initialized = false;

/** Restores the previous session and starts autosaving. Client only, idempotent. */
export function initEditorPersistence() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const prefs = readJson<Partial<Preferences>>(STORAGE_KEYS.preferences);
  if (prefs) {
    preferencesStore.setState({
      rememberSession: typeof prefs.rememberSession === "boolean" ? prefs.rememberSession : true,
      rememberSensitive: prefs.rememberSensitive === true,
    });
  }

  const colors = readJson<unknown>(STORAGE_KEYS.recentColors);
  if (Array.isArray(colors)) {
    recentColorsStore.setState(colors.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10));
  }

  if (preferencesStore.getState().rememberSession) {
    const session = readJson<Partial<PersistedSession>>(STORAGE_KEYS.session);
    if (session) {
      const preview = session.preview ?? DEFAULT_PREVIEW;
      editorStore.setState({
        content: coerceContent(session.content),
        design: coerceDesign(session.design),
        exportSettings: coerceExport(session.exportSettings),
        preview: {
          backdrop: (["checker", "light", "dark", "custom"] as const).includes(preview.backdrop) ? preview.backdrop : "checker",
          customBackdrop: /^#[0-9a-f]{6}$/i.test(preview.customBackdrop ?? "") ? preview.customBackdrop : DEFAULT_PREVIEW.customBackdrop,
        },
      });
    }
  }

  let timer: number | undefined;
  editorStore.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(persistSession, 400);
  });
  preferencesStore.subscribe(() => {
    const next = preferencesStore.getState();
    writeJson(STORAGE_KEYS.preferences, next);
    if (!next.rememberSession) removeKey(STORAGE_KEYS.session);
    else persistSession();
  });
  recentColorsStore.subscribe(() => writeJson(STORAGE_KEYS.recentColors, recentColorsStore.getState()));
  // Flush pending changes when the tab is hidden or closed.
  window.addEventListener("pagehide", persistSession);
}
