import type QRCodeStylingClass from "qr-code-styling";
import type { ExtensionFunction, Options } from "qr-code-styling";
import type { QRDesign } from "../design/types";
import { computeLayout, createMatrix, toQrByteString, type QrLayout } from "./matrix";
import { buildStylingOptions } from "./options";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const RENDER_TIMEOUT_MS = 15_000;

let libraryPromise: Promise<typeof QRCodeStylingClass> | null = null;

/** Loads qr-code-styling once, on demand, in the browser only. */
export function loadQrLibrary(): Promise<typeof QRCodeStylingClass> {
  libraryPromise ??= import("qr-code-styling")
    .then((module) => module.default)
    .catch((error: unknown) => {
      // Don't cache a failed chunk load (flaky network, redeploy): retry next time.
      libraryPromise = null;
      throw error;
    });
  return libraryPromise;
}

export class QrSizeError extends Error {
  constructor() {
    super("The output size is too small for this amount of content.");
    this.name = "QrSizeError";
  }
}

export interface RenderInput {
  payload: string;
  design: QRDesign;
  size: number;
  /** Accessible title embedded in the SVG. */
  title?: string;
}

export interface RenderOutput {
  svg: string;
  layout: QrLayout;
  version: number;
}

/**
 * Post-processing applied inside the renderer pipeline: logo backdrop plate,
 * namespaced image references (best tool compatibility) and a <title>.
 */
function createExtension(design: QRDesign, title?: string): ExtensionFunction {
  return (svg: SVGElement, options: Options) => {
    const doc = svg.ownerDocument;
    if (title) {
      const titleEl = doc.createElementNS(SVG_NS, "title");
      titleEl.textContent = title;
      svg.insertBefore(titleEl, svg.firstChild);
    }

    const image = svg.querySelector("image");
    if (!image) return;
    const href = image.getAttribute("href") ?? image.getAttribute("xlink:href") ?? "";
    image.removeAttribute("href");
    image.removeAttribute("xlink:href");
    image.setAttributeNS(XLINK_NS, "xlink:href", href);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");

    if (design.logo.backdrop) {
      const margin = options.imageOptions?.margin ?? 0;
      const x = Number.parseFloat(image.getAttribute("x") ?? "0") - margin;
      const y = Number.parseFloat(image.getAttribute("y") ?? "0") - margin;
      const w = Number.parseFloat(image.getAttribute("width") ?? "0") + margin * 2;
      const h = Number.parseFloat(image.getAttribute("height") ?? "0") + margin * 2;
      if (w > 0 && h > 0) {
        const plate = doc.createElementNS(SVG_NS, "rect");
        const radius = (Math.min(w, h) / 2) * Math.min(1, Math.max(0, design.logo.backdropRadius));
        plate.setAttribute("x", String(x));
        plate.setAttribute("y", String(y));
        plate.setAttribute("width", String(w));
        plate.setAttribute("height", String(h));
        plate.setAttribute("rx", String(radius));
        plate.setAttribute("ry", String(radius));
        plate.setAttribute("fill", design.logo.backdropColor);
        svg.insertBefore(plate, image);
      }
    }
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Rendering timed out.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Renders a QR code to an SVG string at the exact export size. The preview
 * displays this same SVG, and every export format is derived from it.
 */
export async function renderQrSvg({ payload, design, size, title }: RenderInput): Promise<RenderOutput> {
  const data = toQrByteString(payload);
  const matrix = createMatrix(data, design.errorCorrection); // throws QrCapacityError
  const layout = computeLayout(matrix.count, size, design.margin, design.shape);
  if (layout.modulePx < 1) throw new QrSizeError();

  const QRCodeStyling = await loadQrLibrary();
  // Construct without data so nothing is drawn until the extension is attached.
  const qr = new QRCodeStyling({ type: "svg" });
  qr.applyExtension(createExtension(design, title));
  qr.update(buildStylingOptions({ data, design, layout }));

  const raw = await withTimeout(qr.getRawData("svg"), RENDER_TIMEOUT_MS);
  if (!raw || !(raw instanceof Blob)) throw new Error("The QR code could not be rendered.");
  const svg = await raw.text();
  if (!svg.includes("<svg")) throw new Error("The QR code could not be rendered.");
  return { svg, layout, version: matrix.version };
}
