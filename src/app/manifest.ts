import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/site";

// Generated once at build time (also required by the static export).
export const dynamic = "force-static";


export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QR Code Studio",
    short_name: "QR Studio",
    description: "Design, validate and export professional QR codes.",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#fbfbfd",
    theme_color: "#5b3df5",
    icons: [{ src: `${BASE_PATH}/icon.svg`, sizes: "any", type: "image/svg+xml" }],
  };
}
