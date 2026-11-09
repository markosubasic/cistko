import type { SVGProps } from 'react';

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="square"
    aria-hidden="true"
    {...p}
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/** Masthead mark: a yellow square with a black bin. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" fill="#FFDD00" />
      <path d="M20 24h24l-2.5 27H22.5z" fill="#0B0C0C" />
      <rect x="16" y="17" width="32" height="5" fill="#0B0C0C" />
      <rect x="27" y="11" width="10" height="5" fill="#0B0C0C" />
    </svg>
  );
}
