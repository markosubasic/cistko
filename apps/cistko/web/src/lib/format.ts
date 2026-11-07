import type { DumpStatus } from './types';

const nf0 = new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('hr-HR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const int = (n: number) => nf0.format(n);
export const dec1 = (n: number) => nf1.format(n);
export const pct = (n: number | null | undefined) => (n == null ? '–' : `${nf1.format(n)} %`);

export function signedPp(n: number | null | undefined): string {
  if (n == null) return '–';
  const sign = n > 0 ? '+' : n < 0 ? '−' : '±';
  return `${sign}${nf1.format(Math.abs(n))} p. b.`;
}

export function distance(m: number | undefined): string {
  if (m == null) return '';
  return m < 1000 ? `${nf0.format(Math.round(m / 10) * 10)} m` : `${nf1.format(m / 1000)} km`;
}

export function mass(kg: number | null | undefined): string {
  if (kg == null) return '–';
  return kg >= 1000 ? `${nf1.format(kg / 1000)} t` : `${nf0.format(kg)} kg`;
}

export const STATUS_COLOR: Record<DumpStatus, string> = {
  on_site: '#E5484D',
  reported: '#F5A524',
  removed: '#2BB673',
};

export const STATUS_TEXT: Record<DumpStatus, string> = {
  on_site: 'Otpad na lokaciji',
  reported: 'Prijavili građani',
  removed: 'Uklonjeno',
};

/** Separation-rate ramp (%, 2022): red = little separated, green = a lot. */
export const RATE_STEPS: [number, string][] = [
  [0, '#B42318'],
  [10, '#E2552B'],
  [20, '#F39C2D'],
  [30, '#E8C547'],
  [40, '#9CCB4B'],
  [50, '#3FAE5A'],
  [60, '#13804A'],
];

export function rateColor(rate: number | null | undefined): string {
  if (rate == null) return '#CBD5D1';
  let color = RATE_STEPS[0]![1];
  for (const [from, c] of RATE_STEPS) if (rate >= from) color = c;
  return color;
}

/** MapLibre `step` expression on a numeric property that matches {@link RATE_STEPS}. */
export function rateExpression(prop: string): unknown[] {
  const expr: unknown[] = [
    'step',
    ['coalesce', ['get', prop], -1],
    '#CBD5D1',
    0,
    RATE_STEPS[0]![1],
  ];
  for (const [from, c] of RATE_STEPS.slice(1)) expr.push(from, c);
  return expr;
}

/** Croatian plural for "lokacija": 1 lokacija, 2–4 lokacije, 5+ lokacija. */
export function lokacija(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'lokacija';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'lokacije';
  return 'lokacija';
}

/** "Varaždinska županija", but "Grad Zagreb" (a city with county status). */
export function countyLabel(county: string): string {
  return county === 'Grad Zagreb' ? 'Grad Zagreb' : `${county} županija`;
}

/** "Općina Belica", "Grad Varaždin", but "Grad Zagreb" stays as it is. */
export function fullName(kind: string, name: string): string {
  return name.toLowerCase().startsWith(kind.toLowerCase()) ? name : `${kind} ${name}`;
}
