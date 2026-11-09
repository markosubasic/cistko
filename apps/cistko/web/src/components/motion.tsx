import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';

/** True when the user asked the OS for less motion (or the API is missing, e.g. in tests). */
function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Becomes true once the element has scrolled into view (immediately where there is no observer). */
export function useInView<T extends Element>(margin = '0px 0px -10% 0px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined' || reducedMotion(),
  );
  useEffect(() => {
    if (inView || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [inView, margin]);
  return [ref, inView] as const;
}

/** Wraps a block that fades up and lets its bars grow when it first comes into view. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`ck-reveal ${inView ? 'is-in' : ''} ${className}`}>
      {children}
    </div>
  );
}

/** Counts up to `value` once visible; renders the final number straight away without motion. */
export function CountUp({
  value,
  format,
  duration = 1400,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const animate = useRef(!reducedMotion() && typeof IntersectionObserver !== 'undefined');
  const [shown, setShown] = useState(animate.current ? 0 : value);
  useEffect(() => {
    if (!animate.current) {
      setShown(value);
      return;
    }
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? value * eased : value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return (
    <span ref={ref} className="ck-num">
      {format(shown)}
    </span>
  );
}

/** A hand-drawn marker stroke under a word, drawn once on load. */
export function Scribble({ children }: { children: ReactNode }) {
  return (
    <span className="ck-scribble">
      {children}
      <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
        <path d="M3 9 C 40 4, 80 12, 118 6 S 178 5, 197 8" />
      </svg>
    </span>
  );
}

/** Image that fades in once it has actually loaded. */
export function FadeImg(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      {...props}
      className={`ck-fade ${loaded ? 'is-loaded' : ''} ${props.className ?? ''}`}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  );
}
