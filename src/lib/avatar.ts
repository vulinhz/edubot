/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getFallbackAvatarDataUri(label?: string): string {
  const raw = (label || 'E').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const initial = (parts.length > 0 ? parts[parts.length - 1].charAt(0) : 'E').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="eb-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#eb-grad)"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700">${initial.replace(/[<>&"']/g, 'E')}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
