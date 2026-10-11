import type { EncodeResult } from "../content/types";
import type { ScanIssue } from "../validation/analyze";
import type { QrLayout } from "./matrix";
import { createStore, useStore } from "../../store/create-store";

export type RenderPhase = "empty" | "invalid" | "too-long" | "too-small" | "error" | "rendering" | "ready";

export type DecodeState =
  | { state: "idle" | "pending" | "unreadable" }
  | { state: "match"; inverted: boolean }
  | { state: "mismatch"; inverted: boolean; decoded: string };

export interface RenderState {
  phase: RenderPhase;
  encode: EncodeResult;
  /** Last successfully rendered output (kept while new input is invalid or rendering). */
  svg: string | null;
  url: string | null;
  layout: QrLayout | null;
  version: number;
  /** The payload encoded in `svg`. */
  payload: string;
  issues: ScanIssue[];
  decode: DecodeState;
  error: string | null;
  /** Incremented to force a new render attempt after an error. */
  retryToken: number;
}

export const INITIAL_RENDER_STATE: RenderState = {
  phase: "empty",
  encode: { status: "empty" },
  svg: null,
  url: null,
  layout: null,
  version: 0,
  payload: "",
  issues: [],
  decode: { state: "idle" },
  error: null,
  retryToken: 0,
};

export const renderStore = createStore<RenderState>(INITIAL_RENDER_STATE);
export const useRender = <S>(selector: (state: RenderState) => S) => useStore(renderStore, selector);

export function retryRender() {
  renderStore.setState((s) => ({ ...s, retryToken: s.retryToken + 1 }));
}

export type QrStatus = "empty" | "invalid" | "checking" | "ready" | "lowContrast" | "difficult" | "failed";

/** Single source of truth for the status badge shown in the UI. */
export function deriveStatus(state: RenderState): QrStatus {
  switch (state.phase) {
    case "empty":
      return "empty";
    case "invalid":
    case "too-long":
    case "too-small":
      return "invalid";
    case "error":
      return "failed";
    case "rendering":
      return state.svg ? "checking" : "empty";
  }
  if (state.decode.state === "unreadable" || state.decode.state === "mismatch") return "failed";
  if (state.decode.state === "pending" || state.decode.state === "idle") return "checking";
  if (state.issues.some((i) => i.code === "contrastVeryLow" || i.code === "contrastLow")) return "lowContrast";
  if (state.issues.some((i) => i.severity === "warning" || i.severity === "error")) return "difficult";
  return "ready";
}
