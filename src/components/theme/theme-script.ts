import { STORAGE_KEYS } from "@/lib/persistence/local-storage";

/**
 * Runs synchronously in <head> before first paint so the page never flashes
 * the wrong theme. Mirrors `applyTheme` in ./theme.ts.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme,
)});var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
