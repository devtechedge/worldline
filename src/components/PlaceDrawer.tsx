import { useMemo } from 'react';
import { linksForPlace } from '../data/links';
import {
  ARCHETYPES,
  delta,
  displayValue,
  formatNumber,
  metricLabelFor,
  metricsForLayer,
  primaryMetricFor,
  SCENARIO_BY_ID,
} from '../data/model';
import { LAYER_BY_ID, LAYER_ORDER } from '../data/layers';
import { getPlace } from '../data/places';
import type { Place } from '../data/types';
import { useStore } from '../state/store';
import { Dialog } from './Dialog';
import { DeltaChip } from './DeltaChip';
import { TrendChart } from './charts/TrendChart';

/**
 * The place drawer: context, connections, indicator table across all five
 * layers, the trend chart for the active layer, and risks/opportunities.
 */
export function PlaceDrawer() {
  const { state, dispatch } = useStore();
  const place: Place | null = state.selectedId ? getPlace(state.selectedId) ?? null : null;
  const { layer, horizon, scenario } = state;
  const layerDef = LAYER_BY_ID[layer];
  const placeId = place?.id ?? '';

  // Links arrive in both directions; merge them so each relationship shows once.
  const links = useMemo(() => {
    const byOther = new Map<string, { labels: string[]; layer: Place['connections'][number]['layer'] }>();
    for (const l of linksForPlace(placeId)) {
      const otherId = l.from === placeId ? l.to : l.from;
      const entry = byOther.get(otherId) ?? { labels: [], layer: l.layer };
      if (!entry.labels.includes(l.label)) entry.labels.push(l.label);
      byOther.set(otherId, entry);
    }
    return [...byOther.entries()].map(([otherId, e]) => ({
      other: getPlace(otherId),
      label: e.labels.join(' · '),
      layer: e.layer,
    }));
  }, [placeId]);

  if (!place) return null;

  const close = () => dispatch({ type: 'selectPlace', id: null });
  const bookmarked = state.bookmarks.includes(place.id);
  const compareRole = state.compareA === place.id ? 'A' : state.compareB === place.id ? 'B' : null;

  return (
    <Dialog
      open
      onClose={close}
      title={`${place.name}: place profile`}
      variant="side"
      modal={false}
    >
      <header className="drawer-head">
        <p className="drawer-kicker">
          <span className="kind-chip">{place.kind}</span>
          <span>
            {place.country} · {place.region}
          </span>
        </p>
        <p className="drawer-sub">{ARCHETYPES[place.archetype].label} · {SCENARIO_BY_ID[scenario].name}</p>
        <div className="drawer-actions">
          <button
            type="button"
            className={`chip-btn${bookmarked ? ' is-active' : ''}`}
            aria-pressed={bookmarked}
            onClick={() => dispatch({ type: 'toggleBookmark', id: place.id })}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className={bookmarked ? 'filled' : ''}>
              <path d="M4 2h8v12l-4-3-4 3z" />
            </svg>
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button
            type="button"
            className={`chip-btn${compareRole ? ' is-active' : ''}`}
            aria-pressed={compareRole !== null}
            onClick={() => dispatch({ type: 'addToCompare', id: place.id })}
          >
            {compareRole ? `In compare as ${compareRole}` : 'Add to compare'}
          </button>
          <button
            type="button"
            className="chip-btn"
            onClick={() => dispatch({ type: 'requestFocus', id: place.id })}
          >
            Zoom to place
          </button>
        </div>
      </header>

      <section className="drawer-section">
        <h3>Why it matters</h3>
        <p className="drawer-why">{place.whyItMatters}</p>
        <p className="drawer-context">{place.context}</p>
      </section>

      {links.length > 0 && (
        <section className="drawer-section">
          <h3>System links</h3>
          <ul className="link-list">
            {links.map(({ other, label, layer }) => {
              if (!other) return null;
              return (
                <li key={other.id}>
                  <button
                    type="button"
                    className="link-row"
                    onClick={() => dispatch({ type: 'selectPlace', id: other.id })}
                  >
                    <span className="link-dot" style={{ background: LAYER_BY_ID[layer].hue }} aria-hidden="true" />
                    <span className="link-name">{other.name}</span>
                    <span className="link-label">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="drawer-section">
        <h3>
          {layerDef.name} trend <span className="section-note">active layer</span>
        </h3>
        <TrendChart
          place={place}
          metricId={primaryMetricFor(layer).id}
          scenario={scenario}
          horizon={horizon}
        />
      </section>

      <section className="drawer-section">
        <h3>
          Indicators <span className="section-note">{horizon} · {SCENARIO_BY_ID[scenario].name}</span>
        </h3>
        <div className="metric-groups">
          {LAYER_ORDER.map((lid) => {
            const group = LAYER_BY_ID[lid];
            const metrics = metricsForLayer(lid);
            return (
              <div key={lid} className={`metric-group${lid === layer ? ' is-active' : ''}`}>
                <h4>
                  <span className="group-dot" style={{ background: group.hue }} aria-hidden="true" />
                  {group.name}
                </h4>
                <dl className="metric-rows">
                  {metrics.map((m) => {
                    const value = displayValue(place, m.id, horizon, scenario);
                    const d = delta(place, m.id, 2026, horizon, scenario);
                    const label = metricLabelFor(m, place.kind);
                    return (
                      <div key={m.id} className={`metric-row${value === null ? ' is-missing' : ''}`}>
                        <dt>
                          {label}
                          <span className="metric-unit">{m.unitShort}</span>
                        </dt>
                        {value === null ? (
                          <dd className="metric-missing">Not modelled</dd>
                        ) : (
                          <dd>
                            <span className="metric-value">
                              {formatNumber(value, m.decimals)}
                            </span>
                            <DeltaChip text={d.text} sentiment={d.sentiment} neutralWord="±0" />
                          </dd>
                        )}
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>
        <p className="drawer-note">
          Deltas compare {horizon} with the 2026 baseline under {SCENARIO_BY_ID[scenario].name.toLowerCase()}. Illustrative modelled data.
        </p>
      </section>

      <section className="drawer-section two-col">
        <div>
          <h3>Risks</h3>
          <ul className="risk-list">
            {place.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Opportunities</h3>
          <ul className="opportunity-list">
            {place.opportunities.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      </section>
    </Dialog>
  );
}
