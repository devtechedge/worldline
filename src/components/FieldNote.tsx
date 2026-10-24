import { useMemo } from 'react';
import { displayValue } from '../data/model';
import { LAYER_BY_ID } from '../data/layers';
import { PLACES } from '../data/places';
import { FIELD_NOTE } from '../data/content';
import { useStore } from '../state/store';
import { Dialog } from './Dialog';

const W = 620;
const H = 380;
const M = { top: 18, right: 18, bottom: 42, left: 52 };

const NAMED = new Set([
  'phoenix',
  'dubai',
  'cairo',
  'lima',
  'cape-town',
  'santiago',
  'tashkent',
  'oslo',
  'singapore',
]);

const SQUEEZE_STRESS = 0.6;
const SQUEEZE_HEAT = 30;

/** The field note: one editorial pattern, its chart, and a plain-language reading. */
export function FieldNote() {
  const { state, dispatch } = useStore();

  const points = useMemo(() => {
    return PLACES.filter((p) => p.kind === 'city')
      .map((p) => {
        const stress = displayValue(p, 'waterStress', state.horizon, state.scenario);
        const heat = displayValue(p, 'heatDays', state.horizon, state.scenario);
        return { p, stress, heat };
      })
      .filter(
        (d): d is { p: (typeof PLACES)[number]; stress: number; heat: number } =>
          d.stress !== null && d.heat !== null,
      );
  }, [state.horizon, state.scenario]);

  if (!state.fieldNoteOpen) return null;

  const x = (v: number): number => M.left + v * (W - M.left - M.right);
  const heatMax = Math.max(...points.map((d) => d.heat), 60);
  const yTop = Math.ceil((heatMax + 10) / 25) * 25;

  const yScale = (v: number): number =>
    H - M.bottom - (v / yTop) * (H - M.top - M.bottom);

  return (
    <Dialog
      open
      onClose={() => dispatch({ type: 'setFieldNoteOpen', open: false })}
      title={`${FIELD_NOTE.kicker}: ${FIELD_NOTE.title}`}
      variant="wide"
    >
      <article className="field-note">
        <p className="field-note-standfirst">{FIELD_NOTE.standfirst}</p>
        {FIELD_NOTE.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="field-note-body">
            {paragraph}
          </p>
        ))}

        <figure className="chart-figure squeeze-chart">
          <figcaption>
            <span className="chart-kicker" style={{ color: LAYER_BY_ID.water.hueInk }}>
              Water stress against extreme heat
            </span>
            <span className="chart-sub">
              {state.horizon} · {state.scenario === 'momentum' ? 'Continued momentum' : state.scenario === 'accelerate' ? 'Accelerate & electrify' : 'Strained transition'} · cities only · illustrative model
            </span>
          </figcaption>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Scatter plot of water stress, 0 to 1, against extreme heat days per year for every city at ${state.horizon}. The upper right quadrant marks the dry-belt squeeze: stress above ${SQUEEZE_STRESS} and more than ${SQUEEZE_HEAT} heat days.`}
          >
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
              <g key={t} aria-hidden="true">
                <line x1={x(t)} x2={x(t)} y1={M.top} y2={H - M.bottom} className="chart-grid" />
                <text x={x(t)} y={H - M.bottom + 16} textAnchor="middle" className="tick-label">
                  {t.toFixed(1)}
                </text>
              </g>
            ))}
            {Array.from({ length: Math.floor(yTop / 25) + 1 }, (_, i) => i * 25).map((t) => (
              <g key={t} aria-hidden="true">
                <line x1={M.left} x2={W - M.right} y1={yScale(t)} y2={yScale(t)} className="chart-grid" />
                <text x={M.left - 8} y={yScale(t) + 3.5} textAnchor="end" className="tick-label">
                  {t}
                </text>
              </g>
            ))}
            <text x={(W + M.left) / 2} y={H - 6} textAnchor="middle" className="axis-label">
              Water stress (0–1, lower is better)
            </text>
            <text
              x={14}
              y={(H - M.bottom + M.top) / 2}
              textAnchor="middle"
              className="axis-label"
              transform={`rotate(-90 14 ${(H - M.bottom + M.top) / 2})`}
            >
              Extreme heat days per year (lower is better)
            </text>
            {/* the squeeze quadrant */}
            <rect
              x={x(SQUEEZE_STRESS)}
              y={M.top}
              width={x(1) - x(SQUEEZE_STRESS)}
              height={yScale(SQUEEZE_HEAT) - M.top}
              className="squeeze-rect"
              aria-hidden="true"
            />
            <text x={x(SQUEEZE_STRESS) + 8} y={M.top + 16} className="squeeze-label" aria-hidden="true">
              The dry-belt squeeze
            </text>
            {points.map((d) => {
              const named = NAMED.has(d.p.id);
              const inSqueeze = d.stress >= SQUEEZE_STRESS && d.heat >= SQUEEZE_HEAT;
              return (
                <g key={d.p.id}>
                  <circle
                    cx={x(d.stress)}
                    cy={yScale(d.heat)}
                    r={named ? 5 : 3.4}
                    className={`squeeze-dot${inSqueeze ? ' in-squeeze' : ''}${named ? ' is-named' : ''}`}
                    style={named ? { fill: LAYER_BY_ID.climate.ramp[3] } : undefined}
                  />
                  {named && (
                    <text
                      x={x(d.stress) + 7}
                      y={yScale(d.heat) + 3.5}
                      className="squeeze-name"
                    >
                      {d.p.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="chart-takeaway">{FIELD_NOTE.takeaway}</p>
          <details className="chart-data">
            <summary>Values table</summary>
            <table>
              <caption className="sr-only">Water stress and heat days by city, {state.horizon}</caption>
              <thead>
                <tr>
                  <th scope="col">City</th>
                  <th scope="col">Water stress</th>
                  <th scope="col">Heat days/yr</th>
                </tr>
              </thead>
              <tbody>
                {points
                  .slice()
                  .sort((a, b) => b.stress * 1000 + b.heat - (a.stress * 1000 + a.heat))
                  .map((d) => (
                    <tr key={d.p.id}>
                      <th scope="row">{d.p.name}</th>
                      <td>{d.stress.toFixed(2)}</td>
                      <td>{Math.round(d.heat)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
        </figure>

        <p className="field-note-coda">
          Read the pattern on the map: switch to the Water layer, then Climate, and watch the same
          belt darken twice.
        </p>
      </article>
    </Dialog>
  );
}
