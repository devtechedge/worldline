import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  binColorFor,
  binLabelFor,
  displayValue,
  primaryMetricFor,
  valueWithUnit,
} from '../data/model';
import { LAYER_BY_ID } from '../data/layers';
import { linksForPlace, SORTED_PLACES } from '../data/links';
import { PLACES } from '../data/places';
import { UI_COPY } from '../data/content';
import type { Place, PlaceKind } from '../data/types';
import { useStore } from '../state/store';
import { createProjection, geoPathStrings } from '../geo/geo';

interface View {
  k: number;
  x: number;
  y: number;
}

interface Hover {
  id: string;
  sx: number;
  sy: number;
}

const MIN_K = 1;
const MAX_K = 8;

const TIER_RADIUS: Record<Place['tier'], number> = { 1: 7, 2: 5.5, 3: 6 };

const KIND_WORDS: Record<PlaceKind, string> = {
  city: 'city',
  port: 'port city',
  grid: 'grid node',
  corridor: 'shipping corridor',
  dam: 'dam',
};

function clampView(v: View, w: number, h: number): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  if (k === 1) return { k, x: 0, y: 0 };
  return {
    k,
    x: Math.min(0, Math.max(w * (1 - k), v.x)),
    y: Math.min(0, Math.max(h * (1 - k), v.y)),
  };
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

interface Projected extends Place {
  px: number;
  py: number;
}

function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const lift = Math.min(90, dist * 0.18);
  return `M ${x1} ${y1} Q ${mx + (-dy / dist) * lift} ${my + (dx / dist) * lift} ${x2} ${y2}`;
}

function diamondPath(r: number): string {
  return `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`;
}

export function AtlasMap() {
  const { state, dispatch } = useStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 960, h: 560 });
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<Hover | null>(null);

  const pointerStart = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);
  const dragDistance = useRef(0);
  const rafPending = useRef(false);
  const pendingView = useRef<View | null>(null);
  const tweenRef = useRef<number | null>(null);

  const { layer, horizon, scenario, selectedId } = state;
  const layerDef = LAYER_BY_ID[layer];
  const primary = primaryMetricFor(layer);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: Math.max(280, rect.width), h: Math.max(240, rect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paths = useMemo(() => geoPathStrings(size.w, size.h), [size.w, size.h]);

  const projected = useMemo<Projected[]>(() => {
    const projection = createProjection(size.w, size.h);
    return SORTED_PLACES.map((p) => {
      const pt = projection([p.lon, p.lat]);
      return { ...p, px: pt?.[0] ?? 0, py: pt?.[1] ?? 0 };
    });
  }, [size.w, size.h]);

  const projectedById = useMemo(() => {
    const m = new Map<string, Projected>();
    for (const p of projected) m.set(p.id, p);
    return m;
  }, [projected]);

  const applyView = useCallback(
    (next: View) => {
      pendingView.current = next;
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        const v = pendingView.current;
        if (v) setView(clampView(v, size.w, size.h));
      });
    },
    [size.w, size.h],
  );

  const stopTween = useCallback(() => {
    if (tweenRef.current !== null) {
      cancelAnimationFrame(tweenRef.current);
      tweenRef.current = null;
    }
  }, []);

  const tweenTo = useCallback(
    (target: View) => {
      stopTween();
      if (reducedMotion) {
        applyView(target);
        return;
      }
      const from = view;
      const t0 = performance.now();
      const duration = 380;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = easeOutCubic(t);
        applyView({
          k: from.k + (target.k - from.k) * e,
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
        });
        tweenRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      tweenRef.current = requestAnimationFrame(step);
    },
    [view, applyView, stopTween, reducedMotion],
  );

  useEffect(() => {
    if (state.mapResetCount === 0) return;
    stopTween();
    applyView({ k: 1, x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mapResetCount]);

  useEffect(() => {
    const req = state.focusRequest;
    if (!req) return;
    const place = PLACES.find((p) => p.id === req.id);
    if (!place) return;
    const projection = createProjection(size.w, size.h);
    const pt = projection([place.lon, place.lat]);
    if (!pt) return;
    const k = Math.max(2.4, Math.min(4, size.w / 480));
    tweenTo(
      clampView({ k, x: size.w / 2 - pt[0] * k, y: size.h / 2 - pt[1] * k }, size.w, size.h),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.focusRequest?.nonce]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopTween();
      const rect = svg.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0016);
        const k = Math.min(MAX_K, Math.max(MIN_K, prev.k * factor));
        return clampView(
          { k, x: cx - ((cx - prev.x) * k) / prev.k, y: cy - ((cy - prev.y) * k) / prev.k },
          size.w,
          size.h,
        );
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [size.w, size.h, stopTween]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    stopTween();
    svgRef.current?.setPointerCapture(e.pointerId);
    pointerStart.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y };
    dragDistance.current = 0;
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const start = pointerStart.current;
    if (!start) return;
    const dx = e.clientX - start.px;
    const dy = e.clientY - start.py;
    dragDistance.current = Math.max(dragDistance.current, Math.hypot(dx, dy));
    if (dragDistance.current > 3) {
      setHover(null);
      applyView({ k: view.k, x: start.vx + dx, y: start.vy + dy });
    }
  };

  const onPointerUp = () => {
    pointerStart.current = null;
  };

  const onDoubleClick = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    stopTween();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setView((prev) => {
      const k = Math.min(MAX_K, prev.k * 1.6);
      return clampView(
        { k, x: cx - ((cx - prev.x) * k) / prev.k, y: cy - ((cy - prev.y) * k) / prev.k },
        size.w,
        size.h,
      );
    });
  };

  const zoomBy = (factor: number) => {
    stopTween();
    setView((prev) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, prev.k * factor));
      const cx = size.w / 2;
      const cy = size.h / 2;
      return clampView(
        { k, x: cx - ((cx - prev.x) * k) / prev.k, y: cy - ((cy - prev.y) * k) / prev.k },
        size.w,
        size.h,
      );
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    const pan = (48 / view.k) * (size.w / 960);
    const handled = () => {
      e.preventDefault();
      stopTween();
    };
    switch (e.key) {
      case 'ArrowLeft':
        handled();
        applyView({ ...view, x: view.x + pan });
        break;
      case 'ArrowRight':
        handled();
        applyView({ ...view, x: view.x - pan });
        break;
      case 'ArrowUp':
        handled();
        applyView({ ...view, y: view.y + pan });
        break;
      case 'ArrowDown':
        handled();
        applyView({ ...view, y: view.y - pan });
        break;
      case '+':
      case '=':
        handled();
        zoomBy(1.5);
        break;
      case '-':
      case '_':
        handled();
        zoomBy(1 / 1.5);
        break;
      case 'Escape':
        if (selectedId) {
          handled();
          dispatch({ type: 'selectPlace', id: null });
        }
        break;
      default:
        break;
    }
  };

  const selected = selectedId ? PLACES.find((p) => p.id === selectedId) ?? null : null;
  const activeLinks = useMemo(() => (selected ? linksForPlace(selected.id) : []), [selected]);
  const neighborIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of activeLinks) {
      s.add(l.from);
      s.add(l.to);
    }
    return s;
  }, [activeLinks]);
  const compareIds = useMemo(() => {
    const m = new Map<string, 'A' | 'B'>();
    if (state.compareA) m.set(state.compareA, 'A');
    if (state.compareB) m.set(state.compareB, 'B');
    return m;
  }, [state.compareA, state.compareB]);

  const select = (place: Place) => {
    if (dragDistance.current > 3) return;
    dispatch({ type: 'selectPlace', id: place.id });
  };

  const describe = (p: Place): string => {
    const value = displayValue(p, primary.id, horizon, scenario);
    const metricText =
      value === null
        ? `${primary.label}: not modelled`
        : `${primary.label}: ${value} ${primary.unitShort}`;
    return `${p.name}, ${KIND_WORDS[p.kind]}, ${p.country}. ${metricText}. Press Enter to open details.`;
  };

  const labelVisible = (p: Projected): boolean => {
    if (selectedId && (p.id === selectedId || neighborIds.has(p.id))) return true;
    if (compareIds.has(p.id)) return true;
    if (size.w < 520) return p.tier === 1;
    if (p.tier === 1 || p.tier === 3) return true;
    return view.k >= 1.7;
  };

  const hoverPlace = hover ? PLACES.find((p) => p.id === hover.id) : null;
  const underLinks = useMemo(
    () =>
      SORTED_PLACES.flatMap((p) =>
        p.connections
          .filter((c) => p.id < c.to)
          .map((c) => {
            const from = projectedById.get(p.id);
            const to = projectedById.get(c.to);
            if (!from || !to) return null;
            return { key: `${p.id}-${c.to}`, d: arcPath(from.px, from.py, to.px, to.py) };
          })
          .filter((v): v is { key: string; d: string } => v !== null),
      ),
    [projectedById],
  );

  return (
    <div className="map-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="atlas-svg"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="group"
        aria-roledescription="interactive map"
        aria-label={`World map, ${layerDef.name} layer, showing ${primary.label} by place. Arrow keys pan, plus and minus zoom, Tab moves between places, Escape clears the selection.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        <g className="map-root" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <path className="graticule" d={paths.graticule} />
          <path className="land" d={paths.land} />
          <path className="borders" d={paths.borders} />
          <g className="links-under" aria-hidden="true">
            {underLinks.map((l) => (
              <path key={l.key} className="link-under" d={l.d} />
            ))}
          </g>
          {activeLinks.length > 0 && (
            <g className="links-active" aria-hidden="true">
              {activeLinks.map((l) => {
                const from = projectedById.get(l.from);
                const to = projectedById.get(l.to);
                if (!from || !to) return null;
                return (
                  <path
                    key={`a-${l.from}-${l.to}`}
                    className="link-active"
                    style={{ stroke: LAYER_BY_ID[l.layer].hue }}
                    d={arcPath(from.px, from.py, to.px, to.py)}
                  />
                );
              })}
            </g>
          )}
          <g className="symbols">
            {/* Infrastructure first so cities win pointer priority where they crowd. */}
            {[...projected.filter((p) => p.kind !== 'city' && p.kind !== 'port'), ...projected.filter((p) => p.kind === 'city' || p.kind === 'port')].map((p) => {
              const value = displayValue(p, primary.id, horizon, scenario);
              const fill = value === null ? 'var(--porcelain-deep)' : binColorFor(layer, value);
              const isSelected = p.id === selectedId;
              const isNeighbor = selectedId !== null && neighborIds.has(p.id);
              const isCompared = compareIds.get(p.id);
              const dimmed = selectedId !== null && !isSelected && !isNeighbor;
              const r = TIER_RADIUS[p.tier] / view.k;
              const isInfra = p.kind !== 'city' && p.kind !== 'port';
              const gapStroke =
                isInfra && value === null ? `${2.2 / view.k} ${1.6 / view.k}` : undefined;
              return (
                <g
                  key={p.id}
                  className={`symbol${isSelected ? ' is-selected' : ''}${
                    isNeighbor ? ' is-neighbor' : ''
                  }${dimmed ? ' is-dimmed' : ''}`}
                  transform={`translate(${p.px} ${p.py})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={describe(p)}
                  onClick={() => select(p)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerEnter={() =>
                    setHover({ id: p.id, sx: p.px * view.k + view.x, sy: p.py * view.k + view.y })
                  }
                  onPointerLeave={() => setHover(null)}
                  onFocus={() =>
                    setHover({ id: p.id, sx: p.px * view.k + view.x, sy: p.py * view.k + view.y })
                  }
                  onBlur={() => setHover(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      select(p);
                    }
                  }}
                >
                  <circle className="hit" r={r + 4.5 / view.k} aria-hidden="true" />
                  {isSelected && <circle className="select-ring" r={r + 4.5 / view.k} />}
                  {isNeighbor && !isSelected && (
                    <circle className="neighbor-ring" r={r + 3.5 / view.k} />
                  )}
                  {isInfra ? (
                    <path
                      className="shape"
                      d={diamondPath(r)}
                      style={{ fill, strokeDasharray: gapStroke }}
                    />
                  ) : (
                    <circle className="shape" r={r} style={{ fill }} />
                  )}
                  <circle className="focus-ring" r={r + 6 / view.k} aria-hidden="true" />
                  {isCompared && (
                    <text className={`compare-badge badge-${isCompared}`} y={-r - 5 / view.k}>
                      {isCompared}
                    </text>
                  )}
                  {labelVisible(p) && (
                    <text
                      className={`place-label${isInfra ? ' is-infra' : ''}`}
                      x={isInfra ? -r - 4 / view.k : 0}
                      y={isInfra ? r + 12 / view.k : -r - 6 / view.k}
                    >
                      {p.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {hoverPlace && hover && (
        <div className="map-tooltip" role="presentation" style={{ left: hover.sx, top: hover.sy - 12 }}>
          <span className="tooltip-name">{hoverPlace.name}</span>
          {(() => {
            const value = displayValue(hoverPlace, primary.id, horizon, scenario);
            return value === null ? (
              <span className="tooltip-value">Not modelled here</span>
            ) : (
              <span className="tooltip-value">
                {valueWithUnit(value, primary)} · {binLabelFor(layer, value)}
              </span>
            );
          })()}
        </div>
      )}

      <div className="map-controls">
        <button
          type="button"
          className="map-ctl"
          onClick={() => zoomBy(1.5)}
          disabled={view.k >= MAX_K - 0.001}
          aria-label="Zoom in"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
        </button>
        <button
          type="button"
          className="map-ctl"
          onClick={() => zoomBy(1 / 1.5)}
          disabled={view.k <= 1.001}
          aria-label="Zoom out"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <button
          type="button"
          className="map-ctl"
          onClick={() => tweenTo({ k: 1, x: 0, y: 0 })}
          disabled={view.k <= 1.001}
          aria-label="Reset map view"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M11.5 2v2.6h2.6" /></svg>
        </button>
      </div>

      <p className="map-caption" aria-hidden="true">
        Natural Earth I projection · {UI_COPY.illustrativeLabel}
      </p>
    </div>
  );
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}
