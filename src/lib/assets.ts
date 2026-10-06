/**
 * Asset resolution helper for GitHub Pages subpath deployments.
 * Resolves static assets (pieces, Stockfish WASM, web worker scripts)
 * relative to the configured Vite BASE_URL.
 */

export const BASE_URL: string = import.meta.env.BASE_URL || './';

/**
 * Resolve an asset relative to the base deployment path.
 * Handles paths with or without leading slashes.
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';
  // If the path is already an absolute URL or data URL, return it as-is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return `${base}${cleanPath}`;
}
