import { LAYER_ORDER } from '../data/layers';
import { HORIZON_YEARS } from '../data/model';
import type { HorizonYear, LayerId, ScenarioId } from '../data/types';

/**
 * URL state helpers. The atlas keeps meaningful state in the address bar so
 * refresh and back/forward behave: view, layer, horizon, scenario, selected
 * place and the compare pair. Transient UI (palette, dialogs, search text)
 * deliberately stays out of the URL.
 */

export interface UrlState {
  view: 'atlas' | 'scenarios';
  layer: LayerId;
  horizon: HorizonYear;
  scenario: ScenarioId;
  selectedId: string | null;
  compareA: string | null;
  compareB: string | null;
}

function isLayer(v: unknown): v is LayerId {
  return typeof v === 'string' && (LAYER_ORDER as readonly string[]).includes(v);
}

function isHorizon(v: unknown): v is HorizonYear {
  return typeof v === 'number' && (HORIZON_YEARS as readonly number[]).includes(v);
}

function isScenario(v: unknown): v is ScenarioId {
  return v === 'momentum' || v === 'accelerate' || v === 'strained';
}

function isView(v: unknown): v is UrlState['view'] {
  return v === 'atlas' || v === 'scenarios';
}

function placeIdFromParam(raw: string | null): string | null {
  return raw && /^[a-z0-9-]{1,40}$/.test(raw) ? raw : null;
}

export const DEFAULT_URL_STATE: UrlState = {
  view: 'atlas',
  layer: 'energy',
  horizon: 2026,
  scenario: 'momentum',
  selectedId: null,
  compareA: null,
  compareB: null,
};

/** Parse a query string (without "?") into validated state. Invalid parts fall back to defaults. */
export function parseUrl(search: string, placeExists: (id: string) => boolean): UrlState {
  const params = new URLSearchParams(search);
  const viewParam = params.get('v');
  const layerParam = params.get('l');
  const horizonParam = params.get('h');
  const scenarioParam = params.get('s');
  const rawPlace = placeIdFromParam(params.get('p'));
  const rawA = placeIdFromParam(params.get('a'));
  const rawB = placeIdFromParam(params.get('b'));

  return {
    view: isView(viewParam) ? viewParam : DEFAULT_URL_STATE.view,
    layer: isLayer(layerParam) ? layerParam : DEFAULT_URL_STATE.layer,
    horizon: isHorizon(horizonParam ? Number(horizonParam) : NaN)
      ? (Number(horizonParam) as HorizonYear)
      : DEFAULT_URL_STATE.horizon,
    scenario: isScenario(scenarioParam) ? scenarioParam : DEFAULT_URL_STATE.scenario,
    selectedId: rawPlace && placeExists(rawPlace) ? rawPlace : null,
    compareA: rawA && placeExists(rawA) ? rawA : null,
    compareB: rawB && placeExists(rawB) ? rawB : null,
  };
}

export function serializeUrl(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.view !== 'atlas') params.set('v', state.view);
  if (state.layer !== 'energy') params.set('l', state.layer);
  if (state.horizon !== 2026) params.set('h', String(state.horizon));
  if (state.scenario !== 'momentum') params.set('s', state.scenario);
  if (state.selectedId) params.set('p', state.selectedId);
  if (state.compareA) params.set('a', state.compareA);
  if (state.compareB) params.set('b', state.compareB);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
