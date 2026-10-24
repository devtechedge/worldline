import { useMemo } from 'react';
import { LAYER_BY_ID, LAYERS, PRIMARY_BINS } from '../data/layers';
import {
  HORIZON_YEARS,
  SCENARIOS,
  displayValue,
  formatNumber,
  primaryMetricFor,
} from '../data/model';
import { SORTED_PLACES } from '../data/links';
import { UI_COPY } from '../data/content';
import type { HorizonYear, ScenarioId } from '../data/types';
import { useStore } from '../state/store';

/** Search over the gazetteer: name, country, region and kind words. */
function matches(query: string): typeof SORTED_PLACES {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SORTED_PLACES.filter((p) =>
    [p.name, p.country, p.region, p.kind].some((f) => f.toLowerCase().includes(q)),
  ).slice(0, 8);
}

export function Rail() {
  const { state, dispatch } = useStore();
  const primary = primaryMetricFor(state.layer);
  const bins = PRIMARY_BINS[state.layer];
  const results = useMemo(() => matches(state.query), [state.query]);

  return (
    <aside className="rail" aria-label="Atlas controls">
      <section className="rail-section">
        <h2 className="rail-heading">
          <label htmlFor="place-search">Find a place</label>
        </h2>
        <div className="search-box">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="search-icon">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" />
          </svg>
          <input
            id="place-search"
            type="search"
            placeholder="City, country or system…"
            value={state.query}
            onChange={(e) => dispatch({ type: 'setQuery', query: e.target.value })}
            autoComplete="off"
          />
        </div>
        {state.query.trim() !== '' && (
          <ul className="search-results">
            {results.length === 0 ? (
              <li className="search-empty" role="status">
                {UI_COPY.noResults}
              </li>
            ) : (
              results.map((p) => {
                const value = displayValue(p, primary.id, state.horizon, state.scenario);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="search-result"
                      onClick={() => {
                        dispatch({ type: 'selectPlace', id: p.id });
                        dispatch({ type: 'setQuery', query: '' });
                      }}
                    >
                      <span className="result-name">
                        {p.name} <span className="result-country">{p.country}</span>
                      </span>
                      <span className="result-value">
                        {value === null ? 'n/a' : `${formatNumber(value, primary.decimals)} ${primary.unitShort}`}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </section>

      <section className="rail-section">
        <h2 className="rail-heading" id="layers-heading">System layer</h2>
        <div className="layer-tabs" role="group" aria-labelledby="layers-heading">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`layer-tab${state.layer === l.id ? ' is-active' : ''}`}
              aria-pressed={state.layer === l.id}
              onClick={() => dispatch({ type: 'setLayer', layer: l.id })}
            >
              <span className="layer-swatch" style={{ background: l.hue }} aria-hidden="true" />
              {l.name}
            </button>
          ))}
        </div>
        <p className="layer-blurb">{LAYERS.find((l) => l.id === state.layer)?.blurb}</p>
      </section>

      <section className="rail-section">
        <h2 className="rail-heading" id="horizon-heading">Horizon</h2>
        <div className="segmented" role="radiogroup" aria-labelledby="horizon-heading">
          {HORIZON_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              role="radio"
              aria-checked={state.horizon === y}
              className={`segment${state.horizon === y ? ' is-active' : ''}`}
              onClick={() => dispatch({ type: 'setHorizon', horizon: y as HorizonYear })}
            >
              {y}
            </button>
          ))}
        </div>
      </section>

      <section className="rail-section">
        <h2 className="rail-heading" id="scenario-heading">Scenario</h2>
        <div className="pill-group" role="radiogroup" aria-labelledby="scenario-heading">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={state.scenario === s.id}
              className={`layer-tab${state.scenario === s.id ? ' is-active' : ''}`}
              onClick={() => dispatch({ type: 'setScenario', scenario: s.id as ScenarioId })}
            >
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rail-section">
        <h2 className="rail-heading">Legend · {primary.label}</h2>
        <ul className="legend-list">
          {bins.map((bin, i) => (
            <li key={bin.label}>
              <span
                className="legend-swatch"
                style={{ backgroundColor: LAYER_BY_ID[state.layer].ramp[i] }}
                aria-hidden="true"
              />
              <span>{bin.label}</span>
            </li>
          ))}
        </ul>
        <p className="legend-note">
          {primary.unitFull}. {primary.explain}
        </p>
      </section>

      <section className="rail-section">
        <h2 className="rail-heading">Bookmarks</h2>
        {state.bookmarks.length === 0 ? (
          <p className="rail-empty">{UI_COPY.emptyBookmarks}</p>
        ) : (
          <ul className="bookmark-list">
            {state.bookmarks.map((id) => {
              const p = SORTED_PLACES.find((q) => q.id === id);
              if (!p) return null;
              const value = displayValue(p, primary.id, state.horizon, state.scenario);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="bookmark-row"
                    onClick={() => dispatch({ type: 'selectPlace', id })}
                  >
                    <span className="result-name">
                      {p.name} <span className="result-country">{p.country}</span>
                    </span>
                    <span className="result-value">
                      {value === null
                        ? 'n/a'
                        : `${formatNumber(value, primary.decimals)} ${primary.unitShort}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rail-section">
        <button type="button" className="chip-btn reset-btn" onClick={() => dispatch({ type: 'resetView' })}>
          Reset atlas view
        </button>
        <p className="rail-note">
          Values are {UI_COPY.illustrativeLabel.toLowerCase()}; see Methodology for what the model can and cannot claim.
        </p>
      </section>
    </aside>
  );
}
