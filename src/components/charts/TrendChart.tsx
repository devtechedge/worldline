import { useMemo } from 'react';
import {
  formatNumber,
  METRIC_BY_ID,
  series,
  trendTakeaway,
  valueWithUnit,
} from '../../data/model';
import { LAYER_BY_ID } from '../../data/layers';
import type { HorizonYear, MetricId, Place, ScenarioId } from '../../data/types';

interface TrendChartProps {
  place: Place;
  metricId: MetricId;
  scenario: ScenarioId;
  horizon: HorizonYear;
}

const W = 560;
const H = 200;
const M = { top: 14, right: 14, bottom: 26, left: 44 };

function niceDomain(min: number, max: number): { lo: number; hi: number; step: number } {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const rough = span / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? mag * 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  return { lo, hi, step };
}

/**
 * Line chart of a metric's yearly model path 2026 → 2050, with horizon markers
 * and a visible data table (keyboard access to values, no tooltips required).
 */
export function TrendChart({ place, metricId, scenario, horizon }: TrendChartProps) {
  const metric = METRIC_BY_ID[metricId];

  const data = useMemo(() => series(place, metricId, scenario), [place, metricId, scenario]);
  const points = useMemo(
    () => data.filter((d): d is { year: number; value: number } => d.value !== null),
    [data],
  );

  const takeaway = trendTakeaway(place, metricId, scenario);
  const layerDef = LAYER_BY_ID[metric.layer];

  if (points.length === 0) {
    return (
      <p className="chart-empty">
        No modelled path for {metric.label.toLowerCase()} at this place.
      </p>
    );
  }

  const domain = niceDomain(
    Math.min(...points.map((p) => p.value)),
    Math.max(...points.map((p) => p.value)),
  );
  const x = (year: number): number =>
    M.left + ((year - 2026) / (2050 - 2026)) * (W - M.left - M.right);
  const y = (v: number): number =>
    H - M.bottom - ((v - domain.lo) / (domain.hi - domain.lo)) * (H - M.top - M.bottom);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.year).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${x(points[points.length - 1].year).toFixed(1)} ${
    H - M.bottom
  } L ${x(points[0].year).toFixed(1)} ${H - M.bottom} Z`;

  const ticks: number[] = [];
  for (let v = domain.lo; v <= domain.hi + 1e-9; v += domain.step) ticks.push(Math.round(v * 100) / 100);

  const current = points.find((p) => p.year === horizon) ?? points[points.length - 1];

  return (
    <figure className="chart-figure">
      <figcaption>
        <span className="chart-kicker" style={{ color: layerDef.hueInk }}>
          {metric.label}
        </span>
        <span className="chart-sub">
          {metric.unitFull} · 2026–2050 · illustrative model
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg" role="img" aria-label={`Line chart of ${metric.label} for ${place.name} from 2026 to 2050. ${takeaway}`}>
        <g className="chart-grid" aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
              <text x={M.left - 6} y={y(t) + 3.5} textAnchor="end" className="tick-label">
                {formatNumber(t, metric.decimals > 0 ? (domain.step < 1 ? 1 : 0) : 0)}
              </text>
            </g>
          ))}
          {[2026, 2035, 2050].map((yr) => (
            <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" className="tick-label">
              {yr}
            </text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} />
          <line x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} />
        </g>
        <path className="chart-area" d={areaPath} style={{ fill: layerDef.ramp[1] }} aria-hidden="true" />
        <path className="chart-line" d={linePath} style={{ stroke: layerDef.hue }} aria-hidden="true" />
        {horizon !== 2026 && (
          <line
            className="chart-horizon"
            x1={x(horizon)}
            x2={x(horizon)}
            y1={M.top}
            y2={H - M.bottom}
            aria-hidden="true"
          />
        )}
        {points
          .filter((p) => p.year === 2026 || p.year === 2035 || p.year === 2050)
          .map((p) => (
            <g key={p.year} className="chart-dot" aria-hidden="true">
              <circle cx={x(p.year)} cy={y(p.value)} r={p.year === horizon ? 4.5 : 3} />
            </g>
          ))}
        <text
          x={Math.min(W - M.right - 90, x(current.year) + 8)}
          y={Math.max(M.top + 10, y(current.value) - 8)}
          className="chart-value-label"
        >
          {valueWithUnit(current.value, metric)}
        </text>
      </svg>
      <p className="chart-takeaway">{takeaway}</p>
      <details className="chart-data">
        <summary>Values table</summary>
        <table>
          <caption className="sr-only">{metric.label}, {place.name}, {metric.unitFull}</caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">{metric.label} ({metric.unitShort})</th>
            </tr>
          </thead>
          <tbody>
            {points
              .filter((p) => p.year % 5 === 0 || p.year === 2026)
              .map((p) => (
                <tr key={p.year}>
                  <th scope="row">{p.year}</th>
                  <td>{formatNumber(p.value, metric.decimals)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
