/**
 * M3 Expressive wavy linear progress indicator.
 *
 * Running  → sine wave with amplitude envelope, scrolling phase
 * Paused   → amplitude springs to 0 (wave → flat colored line); track
 *            extends from fillX to end as dim line
 * Resume   → amplitude springs back with M3 overshoot bounce
 *
 * Spring: ζ=0.55, ω₀=18 rad/s → ~10% overshoot, ~350ms settle
 */

import { useLayoutEffect, useRef, useState, useEffect } from 'react';

interface Props {
  value:     number;
  isWork:    boolean;
  isRunning: boolean;
  expired:   boolean;
}

const HEIGHT     = 28;
const MAX_AMP    = 5.5;
const WAVELENGTH = 30;
const TAPER      = WAVELENGTH * 2;
const STEP       = 1;
const CY         = HEIGHT / 2;
const SPEED      = 40;

const SPRING_K    = 324;    // ω₀² = 18²
const SPRING_DAMP = 19.8;   // 2·ζ·ω₀ = 2×0.55×18

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function envelope(x: number, fillX: number): number {
  if (fillX <= 0) return 0;
  const rampLen = Math.min(TAPER, fillX / 2);
  if (x < rampLen)         return easeInOut(x / rampLen);
  if (x > fillX - rampLen) return easeInOut((fillX - x) / rampLen);
  return 1;
}

function buildWavePoints(fillX: number, phase: number, ampScale: number): string {
  if (fillX <= 1) return `0,${CY} ${fillX.toFixed(1)},${CY}`;
  const pts: string[] = [`0,${CY}`];
  for (let x = STEP; x <= fillX - STEP; x += STEP) {
    const amp = MAX_AMP * ampScale * envelope(x, fillX);
    const y   = CY - amp * Math.sin((2 * Math.PI * x) / WAVELENGTH + phase);
    pts.push(`${x.toFixed(1)},${y.toFixed(2)}`);
  }
  pts.push(`${fillX.toFixed(1)},${CY}`);
  return pts.join(' ');
}

const SHORT_THRESHOLD = 0.10;  // below 10% of total width → force flat
const GAP  = 8;                // px gap between wave end and track start
const DOT_R = 4;               // radius of the dot at the track end
const DOT_OFFSET = 0;          // dot sits at the very right end

export function M3LinearProgress({ value, isWork, isRunning, expired }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const polylineRef  = useRef<SVGPolylineElement>(null);
  const fillLineRef  = useRef<SVGLineElement>(null);
  const trackRef     = useRef<SVGLineElement>(null);
  const dotRef       = useRef<SVGCircleElement>(null);
  const dotScalePos  = useRef(0);   // spring position for dot scale 0→1
  const dotScaleVel  = useRef(0);
  const [width, setWidth] = useState(280);

  const rafRef       = useRef<number>(0);
  const prevTimeRef  = useRef<number | null>(null);
  const phaseRef     = useRef(0);          // phase accumulates only while running
  const fillXRef     = useRef(0);
  const isRunningRef = useRef(isRunning);
  const expiredRef   = useRef(expired);
  const widthRef     = useRef(width);

  const springPos = useRef(isRunning ? 1 : 0);
  const springVel = useRef(0);

  const clamp = Math.max(0, Math.min(1, value));
  fillXRef.current     = clamp * widthRef.current;
  isRunningRef.current = isRunning;
  expiredRef.current   = expired;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) { widthRef.current = Math.round(w); setWidth(Math.round(w)); }
    });
    ro.observe(el);
    widthRef.current = Math.round(el.getBoundingClientRect().width);
    setWidth(widthRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const tick = (now: number) => {
      if (prevTimeRef.current === null) prevTimeRef.current = now;
      const dt = Math.min((now - prevTimeRef.current) / 1000, 0.05);
      prevTimeRef.current = now;

      // Phase only advances while running, not expired, and not too short
      const isShortPhase = fillXRef.current < widthRef.current * SHORT_THRESHOLD;
      if (isRunningRef.current && !expiredRef.current && !isShortPhase) {
        phaseRef.current -= (2 * Math.PI * SPEED * dt) / WAVELENGTH;
      }

      // Spring towards target — flatten when paused, expired, or nearly empty
      const isShort = fillXRef.current < widthRef.current * SHORT_THRESHOLD;
      const target  = (isRunningRef.current && !expiredRef.current && !isShort) ? 1 : 0;
      const force  = -SPRING_K * (springPos.current - target) - SPRING_DAMP * springVel.current;
      springVel.current = springVel.current + force * dt;
      springPos.current = Math.max(0, springPos.current + springVel.current * dt);
      const ampScale = springPos.current;

      const fx = fillXRef.current;
      const w  = widthRef.current;

      // Wave polyline (colored, always covers 0→fillX)
      polylineRef.current?.setAttribute(
        'points',
        buildWavePoints(fx, phaseRef.current, ampScale),
      );

      // Colored flat fill line — fades OUT as wave grows in (ampScale→1)
      // and fades IN as wave collapses (ampScale→0). No overlap.
      if (fillLineRef.current) {
        fillLineRef.current.setAttribute('x1', '0');
        fillLineRef.current.setAttribute('x2', fx.toFixed(1));
        fillLineRef.current.setAttribute('opacity', (1 - ampScale).toFixed(3));
      }

      // Dim track from (fillX + GAP) → end
      const trackStart = Math.min(fx + GAP, w);
      if (trackRef.current) {
        trackRef.current.setAttribute('x1', trackStart.toFixed(1));
        trackRef.current.setAttribute('x2', String(w));
      }

      // Dot — spring scale in/out based on whether track has room for it
      const dotX = w - DOT_OFFSET;
      const dotVisible = trackStart + DOT_OFFSET * 2 < w;
      const dotTarget = dotVisible ? 1 : 0;
      const dotForce = -SPRING_K * (dotScalePos.current - dotTarget) - SPRING_DAMP * dotScaleVel.current;
      dotScaleVel.current = dotScaleVel.current + dotForce * dt;
      dotScalePos.current = Math.max(0, dotScalePos.current + dotScaleVel.current * dt);
      const ds = dotScalePos.current;

      if (dotRef.current) {
        dotRef.current.setAttribute('cx', dotX.toFixed(1));
        // scale around the dot's own centre via transform
        dotRef.current.setAttribute(
          'transform',
          `translate(${dotX},${CY}) scale(${ds.toFixed(4)}) translate(${-dotX},${-CY})`,
        );
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const primary = isWork
    ? 'oklch(0.6455 0.1801 33.7456)'
    : 'oklch(0.8730 0.1396 93.5379)';

  const uid    = isWork ? 'w' : 'b';
  const gradId = `m3lp-grad-${uid}`;
  const clampedFillX = clamp * width;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        overflow="visible"
        style={{ display: 'block' }}
      >
        <defs>
          {/* userSpaceOnUse so the gradient works correctly on a zero-height flat line */}
          <linearGradient id={gradId} x1="0" x2={width} y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={primary} stopOpacity="0.45" />
            <stop offset="45%"  stopColor={primary} stopOpacity="1"    />
            <stop offset="100%" stopColor={primary} stopOpacity="0.9"  />
          </linearGradient>
        </defs>

        {/* Dim track: (fillX + GAP) → end */}
        <line
          ref={trackRef}
          x1={clampedFillX + GAP} y1={CY}
          x2={width}              y2={CY}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Dot near the right end of the track — spring-scaled in/out */}
        <circle
          ref={dotRef}
          cx={width - DOT_OFFSET}
          cy={CY}
          r={DOT_R}
          fill={primary}
          transform={`translate(${width - DOT_OFFSET},${CY}) scale(0) translate(${-(width - DOT_OFFSET)},${-CY})`}
        />

        {/* Colored flat line: 0 → fillX — always visible, gives color when paused */}
        <line
          ref={fillLineRef}
          x1={0}            y1={CY}
          x2={clampedFillX} y2={CY}
          stroke={`url(#${gradId})`}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Wave polyline on top — amplitude modulated by spring */}
        <polyline
          ref={polylineRef}
          points=""
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
