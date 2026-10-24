import { useMemo } from 'react';
import { LAYER_BY_ID } from '../data/layers';
import {
  binLabelFor,
  displayValue,
  formatNumber,
  primaryMetricFor,
  SCENARIOS,
  SCENARIO_BY_ID,
} from '../data/model';
import { SORTED_PLACES } from '../data/links';
import { SCENARIOS_EDITORIAL, UI_COPY } from '../data/content';
import { useStore } from '../state/store';
import { DeltaChip } from './DeltaChip';

/**
 * The scenario reader: assumptions in plain language, then the deterministic
 * changes for the active layer's headline metric, place by place, against the
 * momentum baseline.
 */
export function ScenarioView() {
  const { state, dispatch } = useStore();
  const primary = primaryMetricFor(state.layer);
  const layerDef = LAYER_BY_ID[state.layer];

  const rows = useMemo(() => {
    return SORTED_PLACES.filter((p) => p.kind === 'city' || p.kind === 'port')
      .map((p) => {
        const base = displayValue(p, primary.id, 2026, state.scenario);
        const here = displayValue(p, primary.id, state.horizon, state.scenario);
        const momentum = displayValue(p, primary.id, state.horizon, 'momentum');
        return { p, base, here, momentum };
      })
      .filter((r) => r.base !== null && r.here !== null && r.momentum !== null)
      .map((r) => ({ ...r, base: r.base as number, here: r.here as number, momentum: r.momentum as number }))
      .sort((x, y) => Math.abs(y.here - y.momentum) - Math.abs(x.here - x.momentum));
  }, [primary.id, state.horizon, state.scenario]);

  const selected = SCENARIO_BY_ID[state.scenario];
  const editorial = SCENARIOS_EDITORIAL[state.scenario];

  return (
    <div className="scenario-view">
      <header className="scenario-head">
        <p className="kicker">Scenario reader</p>
        <h2>Three futures, one model</h2>
        <p className="standfirst">
          Scenarios are not predictions. They hold each place’s physics fixed and vary only the
          speed of buildout and the warming trajectory, so the differences you see are exactly the
          assumptions listed below. Nothing here is random: the same scenario always produces the
          same numbers.
        </p>
      </header>

      <div className="scenario-cards" role="radiogroup" aria-label="Choose a scenario">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={state.scenario === s.id}
            className={`scenario-card${state.scenario === s.id ? ' is-active' : ''}`}
            onClick={() => dispatch({ type: 'setScenario', scenario: s.id })}
          >
            <span className="scenario-kicker">{SCENARIOS_EDITORIAL[s.id].kicker}</span>
            <span className="scenario-name">{s.name}</span>
            <span className="scenario-summary">{s.summary}</span>
          </button>
        ))}
      </div>

      <section className="scenario-detail">
        <h3>
          <span style={{ color: 'var(--cobalt)' }}>{editorial.kicker}</span> · {selected.name}
        </h3>
        <p className="scenario-lede">{editorial.lede}</p>
        <h4>Assumptions in force</h4>
        <ul className="assumption-list">
          {selected.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <section className="scenario-changes">
        <h3>
          What changes by {state.horizon} · <span style={{ color: layerDef.hueInk }}>{primary.label}</span>
        </h3>
        <p className="scenario-note">
          Each row compares the selected scenario with Continued momentum for the same place,
          horizon and metric. Positive chips mark places ahead of the baseline; color follows the
          indicator’s own better-direction.
        </p>
        <table className="scenario-table">
          <caption className="sr-only">
            {primary.label} at {state.horizon} under {selected.name} versus momentum, by place
          </caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">2026</th>
              <th scope="col">{state.horizon}, {selected.name}</th>
              <th scope="col">Δ vs momentum</th>
              <th scope="col">Reading</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, base, here, momentum }) => {
              const diffVsMomentum = Math.round((here - momentum) * 10 ** primary.decimals) / 10 ** primary.decimals;
              const bAhead = primary.direction === 'upGood' ? diffVsMomentum > 0 : diffVsMomentum < 0;
              const even = Math.abs(diffVsMomentum) < 10 ** -primary.decimals / 2;
              const sentiment: 'good' | 'bad' | 'neutral' =
                primary.direction === 'neutral' || even ? 'neutral' : bAhead ? 'good' : 'bad';
              return (
                <tr key={p.id}>
                  <th scope="row">
                    <button type="button" className="row-place" onClick={() => dispatch({ type: 'selectPlace', id: p.id })}>
                      {p.name}
                      <span className="result-country">{p.country}</span>
                    </button>
                  </th>
                  <td className="num">{formatNumber(base, primary.decimals)}</td>
                  <td className="num strong">{formatNumber(here, primary.decimals)}</td>
                  <td>
                    <DeltaChip
                      text={`${diffVsMomentum > 0 ? '+' : diffVsMomentum < 0 ? '−' : '±'}${formatNumber(Math.abs(diffVsMomentum), primary.decimals)} ${primary.unitShort}`}
                      sentiment={sentiment}
                      neutralWord="same"
                    />
                  </td>
                  <td className="scenario-reading">{binLabelFor(state.layer, here)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <button type="button" className="chip-btn" onClick={() => dispatch({ type: 'setView', view: 'atlas' })}>
        ← Open the atlas with this scenario
      </button>
      <p className="drawer-note">
        {UI_COPY.illustrativeLabel}: calibrated to public reference ranges, not sourced from any
        statistical agency. Full limits are listed in Methodology.
      </p>
    </div>
  );
}
