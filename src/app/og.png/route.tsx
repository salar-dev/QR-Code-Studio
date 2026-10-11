import { ImageResponse } from "next/og";
import { createMatrix } from "@/lib/qr/render/matrix";
import { SITE_URL } from "@/lib/site";

/*
 * Social preview image, served as a real `.png` file so static hosts such as
 * GitHub Pages send the correct content type. Rendered once at build time.
 */
export const dynamic = "force-static";

export function GET() {
  // A real, scannable code pointing at the site.
  const matrix = createMatrix(SITE_URL, "M");
  const cell = Math.floor(360 / matrix.count);
  const rows = Array.from({ length: matrix.count }, (_, r) => Array.from({ length: matrix.count }, (_, c) => matrix.isDark(r, c)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "linear-gradient(135deg, #f6f5ff 0%, #ffffff 55%, #eef2ff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#5b3df5", display: "flex" }} />
            <div style={{ fontSize: 34, fontWeight: 700, color: "#18181b" }}>QR Code Studio</div>
          </div>
          <div style={{ marginTop: 40, fontSize: 64, fontWeight: 800, lineHeight: 1.05, color: "#18181b", letterSpacing: -2 }}>
            Beautiful QR codes that scan reliably.
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#52525b", lineHeight: 1.35 }}>
            Colors, gradients, logos and shapes. Verified with a real decoder. PNG · SVG · PDF · JPEG · WebP.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            padding: 32,
            borderRadius: 32,
            background: "#ffffff",
            boxShadow: "0 30px 60px -20px rgba(24,24,27,0.25)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((row, r) => (
              <div key={r} style={{ display: "flex" }}>
                {row.map((dark, c) => (
                  <div key={c} style={{ width: cell, height: cell, background: dark ? "#18181b" : "transparent" }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
