import { useMemo } from 'react';
import { LAYER_BY_ID, LAYER_ORDER } from '../data/layers';
import {
  deltaChipText,
  displayValue,
  formatNumber,
  metricsForLayer,
  metricLabelFor,
  primaryMetricFor,
  SCENARIO_BY_ID,
} from '../data/model';
import { getPlace } from '../data/places';
import { UI_COPY } from '../data/content';
import type { MetricDef, Place } from '../data/types';
import { useStore } from '../state/store';
import { Dialog } from './Dialog';
import { DeltaChip } from './DeltaChip';

/**
 * Side-by-side comparison of two places. Layer, horizon and scenario are
 * inherited from the atlas; every delta is pre-computed so nothing needs
 * mental arithmetic. Green chips mean the B place is ahead on that indicator.
 */
export function ComparePanel() {
  const { state, dispatch } = useStore();
  const a = state.compareA ? getPlace(state.compareA) ?? null : null;
  const b = state.compareB ? getPlace(state.compareB) ?? null : null;
  const open = state.compareOpen && a !== null && b !== null;

  if (!open || !a || !b) return null;

  return (
    <Dialog
      open
      onClose={() => dispatch({ type: 'setCompareOpen', open: false })}
      title={`Comparing ${a.name} and ${b.name}`}
      variant="wide"
    >
      <CompareBody a={a} b={b} />
    </Dialog>
  );
}

function CompareBody({ a, b }: { a: Place; b: Place }) {
  const { state, dispatch } = useStore();
  const { horizon, scenario } = state;
  const primary = primaryMetricFor(state.layer);

  const interpretation = useMemo(() => {
    let aBetter = 0;
    let bBetter = 0;
    let widest = { text: '', magnitude: -1 };
    for (const lid of LAYER_ORDER) {
      for (const m of metricsForLayer(lid)) {
        const va = displayValue(a, m.id, horizon, scenario);
        const vb = displayValue(b, m.id, horizon, scenario);
        if (va === null || vb === null || m.direction === 'neutral') continue;
        const aWins = m.direction === 'upGood' ? va > vb : va < vb;
        const bWins = m.direction === 'upGood' ? vb > va : vb < va;
        if (aWins) aBetter += 1;
        else if (bWins) bBetter += 1;
        const magnitude = Math.abs(va - vb) / Math.max(0.0001, (va + vb) / 2);
        if (magnitude > widest.magnitude) {
          widest = {
            text: `${m.label.toLowerCase()} (${formatNumber(va, m.decimals)} vs ${formatNumber(
              vb,
              m.decimals,
            )} ${m.unitShort})`,
            magnitude,
          };
        }
      }
    }
    const leader =
      aBetter === bBetter
        ? `They are evenly matched across comparable indicators`
        : aBetter > bBetter
          ? `${a.name} leads on ${aBetter} of ${aBetter + bBetter} comparable indicators`
          : `${b.name} leads on ${bBetter} of ${aBetter + bBetter} comparable indicators`;
    return `${leader} at ${horizon} under ${SCENARIO_BY_ID[scenario].name.toLowerCase()}. The widest relative gap is ${widest.text}.`;
  }, [a, b, horizon, scenario]);

  return (
    <div className="compare">
      <div className="compare-head">
        {[a, b].map((p, idx) => (
          <div key={p.id} className="compare-card">
            <span className={`compare-role role-${idx === 0 ? 'a' : 'b'}`}>
              {idx === 0 ? 'A' : 'B'}
            </span>
            <div>
              <p className="compare-name">{p.name}</p>
              <p className="compare-meta">
                {p.country} · {p.kind}
              </p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${p.name} from comparison`}
              onClick={() => dispatch({ type: 'removeFromCompare', id: p.id })}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        ))}
        <div className="compare-tools">
          <button type="button" className="chip-btn" onClick={() => dispatch({ type: 'swapCompare' })}>
            Swap A / B
          </button>
          <button type="button" className="chip-btn" onClick={() => dispatch({ type: 'clearCompare' })}>
            Clear
          </button>
        </div>
      </div>

      <p className="compare-interpretation">{interpretation}</p>

      <section className="compare-primary">
        <h3>
          {primary.label} <span className="section-note">{primary.unitFull}</span>
        </h3>
        <PairedBars a={a} b={b} metric={primary} />
      </section>

      {LAYER_ORDER.map((lid) => {
        const group = LAYER_BY_ID[lid];
        const metrics = metricsForLayer(lid);
        return (
          <section key={lid} className="compare-group">
            <h4>
              <span className="group-dot" style={{ background: group.hue }} aria-hidden="true" />
              {group.name}
            </h4>
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Indicator</th>
                  <th scope="col">{a.name}</th>
                  <th scope="col">{b.name}</th>
                  <th scope="col">Gap (B − A)</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const va = displayValue(a, m.id, horizon, scenario);
                  const vb = displayValue(b, m.id, horizon, scenario);
                  const label = metricLabelFor(m, a.kind);
                  if (va === null || vb === null) {
                    return (
                      <tr key={m.id} className="is-missing">
                        <th scope="row">{label}</th>
                        <td>{va === null ? 'n/a' : formatNumber(va, m.decimals)}</td>
                        <td>{vb === null ? 'n/a' : formatNumber(vb, m.decimals)}</td>
                        <td className="metric-missing">{UI_COPY.missingMetric}</td>
                      </tr>
                    );
                  }
                  const diff = Math.round((vb - va) * 10 ** m.decimals) / 10 ** m.decimals;
                  const even = Math.abs(diff) < 10 ** -m.decimals / 2;
                  const bAhead = m.direction === 'upGood' ? diff > 0 : diff < 0;
                  const sentiment: 'good' | 'bad' | 'neutral' =
                    m.direction === 'neutral' || even ? 'neutral' : bAhead ? 'good' : 'bad';
                  return (
                    <tr key={m.id}>
                      <th scope="row">
                        {label}
                        <span className="metric-unit">{m.unitShort}</span>
                      </th>
                      <td className="num">{formatNumber(va, m.decimals)}</td>
                      <td className="num">{formatNumber(vb, m.decimals)}</td>
                      <td>
                        <DeltaChip
                          text={deltaChipText(diff, m)}
                          sentiment={sentiment}
                          neutralWord="even"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
      <p className="drawer-note">
        Gaps read from {a.name}’s perspective: a green chip means {b.name} is ahead on that
        indicator at {horizon} under {SCENARIO_BY_ID[scenario].name.toLowerCase()}. Illustrative
        modelled data.
      </p>
    </div>
  );
}

function PairedBars({ a, b, metric }: { a: Place; b: Place; metric: MetricDef }) {
  const { state } = useStore();
  const va = displayValue(a, metric.id, state.horizon, state.scenario);
  const vb = displayValue(b, metric.id, state.horizon, state.scenario);
  if (va === null || vb === null) {
    return <p className="chart-empty">{UI_COPY.missingMetric}</p>;
  }
  const max = Math.max(va, vb, metric.max * 0.2);
  const pct = (v: number) => `${Math.max(2, (v / max) * 100)}%`;
  return (
    <div
      className="paired-bars"
      role="img"
      aria-label={`${metric.label}: ${a.name} ${va} ${metric.unitShort}, ${b.name} ${vb} ${metric.unitShort}`}
    >
      <div className="bar-row">
        <span className="bar-label">{a.name}</span>
        <span className="bar-track">
          <span className="bar-fill bar-a" style={{ width: pct(va) }} />
        </span>
        <span className="bar-value">
          {formatNumber(va, metric.decimals)} {metric.unitShort}
        </span>
      </div>
      <div className="bar-row">
        <span className="bar-label">{b.name}</span>
        <span className="bar-track">
          <span className="bar-fill bar-b" style={{ width: pct(vb) }} />
        </span>
        <span className="bar-value">
          {formatNumber(vb, metric.decimals)} {metric.unitShort}
        </span>
      </div>
    </div>
  );
}
