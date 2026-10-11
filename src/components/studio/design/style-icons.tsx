import type { CornerDotStyle, CornerSquareStyle, DotStyle } from "@/lib/qr/design/types";

/*
 * Small illustrative glyphs for each shape option. They mirror the look of
 * qr-code-styling's figures closely enough to choose between them.
 */

/** Rectangle path with individual corner radii [top-left, top-right, bottom-right, bottom-left]. */
function roundedRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]) {
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : "",
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : "",
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : "",
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : "",
    "Z",
  ].join(" ");
}

const SAMPLE = [
  [1, 1, 0],
  [0, 1, 1],
  [1, 0, 1],
];

function moduleShape(style: DotStyle, x: number, y: number, s: number, key: string) {
  switch (style) {
    case "dots":
      return <circle key={key} cx={x + s / 2} cy={y + s / 2} r={s * 0.42} />;
    case "rounded":
      return <rect key={key} x={x} y={y} width={s} height={s} rx={s * 0.3} />;
    case "extra-rounded":
      return <rect key={key} x={x} y={y} width={s} height={s} rx={s * 0.5} />;
    case "classy":
      return <path key={key} d={roundedRect(x, y, s, s, [s * 0.5, 0, s * 0.5, 0])} />;
    case "classy-rounded":
      return <path key={key} d={roundedRect(x, y, s, s, [s * 0.5, s * 0.18, s * 0.5, s * 0.18])} />;
    case "square":
    default:
      return <rect key={key} x={x} y={y} width={s} height={s} />;
  }
}

export function DotStyleIcon({ style }: { style: DotStyle }) {
  const s = 8;
  const gap = style === "square" ? 0 : 1;
  return (
    <svg viewBox="0 0 28 28" className="size-8" fill="currentColor" aria-hidden>
      {SAMPLE.flatMap((row, r) => row.map((on, c) => (on ? moduleShape(style, 2 + c * s + gap / 2, 2 + r * s + gap / 2, s - gap, `${r}-${c}`) : null)))}
    </svg>
  );
}

const FRAME_CELLS = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => [r, c] as const))
  .flat()
  .filter(([r, c]) => r === 0 || r === 6 || c === 0 || c === 6);

export function CornerSquareIcon({ style }: { style: CornerSquareStyle }) {
  const center = <rect x="11" y="11" width="10" height="10" rx="1.5" className="opacity-25" />;
  if (style === "dots" || style === "classy" || style === "classy-rounded" || style === "rounded") {
    if (style === "dots") {
      return (
        <svg viewBox="0 0 32 32" className="size-8" fill="currentColor" aria-hidden>
          {FRAME_CELLS.map(([r, c]) => (
            <circle key={`${r}-${c}`} cx={2 + c * 4 + 2} cy={2 + r * 4 + 2} r={1.7} />
          ))}
          {center}
        </svg>
      );
    }
    const outer: [number, number, number, number] =
      style === "rounded" ? [6, 6, 6, 6] : style === "classy" ? [11, 0, 11, 0] : [11, 3, 11, 3];
    const inner: [number, number, number, number] =
      style === "rounded" ? [2, 2, 2, 2] : style === "classy" ? [6, 0, 6, 0] : [6, 1, 6, 1];
    return (
      <svg viewBox="0 0 32 32" className="size-8" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d={`${roundedRect(2, 2, 28, 28, outer)} ${roundedRect(6, 6, 20, 20, inner)}`} />
        {center}
      </svg>
    );
  }
  if (style === "dot") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M16 2a14 14 0 1 1 0 28a14 14 0 1 1 0-28Zm0 4a10 10 0 1 0 0 20a10 10 0 1 0 0-20Z" />
        {center}
      </svg>
    );
  }
  const r = style === "extra-rounded" ? [10, 5] : [0, 0];
  return (
    <svg viewBox="0 0 32 32" className="size-8" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d={`${roundedRect(2, 2, 28, 28, [r[0], r[0], r[0], r[0]])} ${roundedRect(6, 6, 20, 20, [r[1], r[1], r[1], r[1]])}`} />
      {center}
    </svg>
  );
}

export function CornerDotIcon({ style }: { style: CornerDotStyle }) {
  const frame = <path fillRule="evenodd" className="opacity-20" d={`${roundedRect(2, 2, 28, 28, [2, 2, 2, 2])} ${roundedRect(6, 6, 20, 20, [1, 1, 1, 1])}`} />;
  let shape;
  switch (style) {
    case "dot":
      shape = <circle cx="16" cy="16" r="6" />;
      break;
    case "rounded":
      shape = <rect x="10" y="10" width="12" height="12" rx="3" />;
      break;
    case "extra-rounded":
      shape = <rect x="10" y="10" width="12" height="12" rx="5" />;
      break;
    case "classy":
      shape = <path d={roundedRect(10, 10, 12, 12, [6, 0, 6, 0])} />;
      break;
    case "classy-rounded":
      shape = <path d={roundedRect(10, 10, 12, 12, [6, 2, 6, 2])} />;
      break;
    case "dots":
      shape = (
        <>
          {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}-${c}`} cx={12 + c * 4} cy={12 + r * 4} r={1.6} />))}
        </>
      );
      break;
    case "square":
    default:
      shape = <rect x="10" y="10" width="12" height="12" />;
  }
  return (
    <svg viewBox="0 0 32 32" className="size-8" fill="currentColor" aria-hidden>
      {frame}
      {shape}
    </svg>
  );
}
