import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);
export const RecycleIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L5.5 12M11 4.7l1-1.6a1.8 1.8 0 0 1 3.1 0l2.4 4M17 19h2.2a1.8 1.8 0 0 0 1.6-2.7L19 13" />
    <path d="m14 16-3 3 3 3M8.3 13.3 5.5 12 4.2 15M16 8l1.5-.9-.4 3.1" />
  </svg>
);
export const TrophyIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />
  </svg>
);
export const MapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </svg>
);
export const CameraIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const ArrowIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12 5 5 9-10" />
  </svg>
);
export const CaveIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 20c1-6 4-12 9-12s8 6 9 12zM9 20c.5-3 1.5-5 3-5s2.5 2 3 5" />
  </svg>
);
export const BuildingIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6" />
  </svg>
);

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#34D399" />
      <path d="M20 24h24l-2.5 26a3 3 0 0 1-3 2.7H25.5a3 3 0 0 1-3-2.7z" fill="#0F2E2A" />
      <rect x="17" y="18" width="30" height="5" rx="2.5" fill="#0F2E2A" />
      <rect x="28" y="13" width="8" height="5" rx="2" fill="#0F2E2A" />
      <path d="M28 30v16M36 30v16" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
