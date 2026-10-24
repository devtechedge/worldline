import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { LAYER_ORDER } from '../data/layers';
import { HORIZON_YEARS } from '../data/model';
import { getPlace } from '../data/places';
import type { HorizonYear, LayerId, ScenarioId } from '../data/types';
import { loadPrefs, savePrefs } from './persist';
import { DEFAULT_URL_STATE, parseUrl, serializeUrl, type UrlState } from './url';

/** One shared state model: map, layers, horizon, drawer, compare and dialogs. */
export interface AppState extends UrlState {
  query: string;
  bookmarks: string[];
  paletteOpen: boolean;
  methodologyOpen: boolean;
  fieldNoteOpen: boolean;
  introDismissed: boolean;
  storageOk: boolean;
  /** Incremented to ask the map to reset its own viewport. */
  mapResetCount: number;
  /** Ask the map to centre and zoom on a place ("zoom to place" in the drawer). */
  focusRequest: { id: string; nonce: number } | null;
  /** Whether the compare panel is showing. */
  compareOpen: boolean;
  /** UI theme; the map and every pane consume it through CSS tokens. */
  theme: 'light' | 'dark';
}

export type View = UrlState['view'];

export type Action =
  | { type: 'setLayer'; layer: LayerId }
  | { type: 'setHorizon'; horizon: HorizonYear }
  | { type: 'setScenario'; scenario: ScenarioId }
  | { type: 'selectPlace'; id: string | null }
  | { type: 'setView'; view: View }
  | { type: 'setQuery'; query: string }
  | { type: 'addToCompare'; id: string }
  | { type: 'removeFromCompare'; id: string }
  | { type: 'swapCompare' }
  | { type: 'clearCompare' }
  | { type: 'toggleBookmark'; id: string }
  | { type: 'setPaletteOpen'; open: boolean }
  | { type: 'setMethodologyOpen'; open: boolean }
  | { type: 'setFieldNoteOpen'; open: boolean }
  | { type: 'setCompareOpen'; open: boolean }
  | { type: 'setTheme'; theme: 'light' | 'dark' }
  | { type: 'dismissIntro' }
  | { type: 'resetView' }
  | { type: 'restore'; state: UrlState }
  | { type: 'requestFocus'; id: string };

function isValidLayer(v: unknown): v is LayerId {
  return typeof v === 'string' && (LAYER_ORDER as readonly string[]).includes(v);
}

function isValidHorizon(v: unknown): v is HorizonYear {
  return typeof v === 'number' && (HORIZON_YEARS as readonly number[]).includes(v);
}

function isValidScenario(v: unknown): v is ScenarioId {
  return v === 'momentum' || v === 'accelerate' || v === 'strained';
}

/** Fill compare slots in order; adding a place already present removes it. */
function nextCompare(state: AppState, id: string): { a: string | null; b: string | null } {
  if (state.compareA === id) return { a: null, b: state.compareB };
  if (state.compareB === id) return { a: state.compareA, b: null };
  if (!state.compareA) return { a: id, b: state.compareB };
  if (!state.compareB) return { a: state.compareA, b: id };
  return { a: state.compareB, b: id };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setLayer':
      if (!isValidLayer(action.layer) || action.layer === state.layer) return state;
      return { ...state, layer: action.layer };
    case 'setHorizon':
      if (!isValidHorizon(action.horizon) || action.horizon === state.horizon) return state;
      return { ...state, horizon: action.horizon };
    case 'setScenario':
      if (!isValidScenario(action.scenario) || action.scenario === state.scenario) return state;
      return { ...state, scenario: action.scenario };
    case 'selectPlace': {
      if (action.id && !getPlace(action.id)) return state;
      if ((action.id ?? null) === state.selectedId) return state;
      return { ...state, selectedId: action.id };
    }
    case 'setView':
      if (action.view === state.view) return state;
      return { ...state, view: action.view };
    case 'setQuery':
      return { ...state, query: action.query };
    case 'addToCompare': {
      if (!getPlace(action.id)) return state;
      const { a, b } = nextCompare(state, action.id);
      if (a === state.compareA && b === state.compareB) return state;
      return { ...state, compareA: a, compareB: b, compareOpen: a !== null && b !== null };
    }
    case 'removeFromCompare': {
      const a = state.compareA === action.id ? null : state.compareA;
      const b = state.compareB === action.id ? null : state.compareB;
      if (a === state.compareA && b === state.compareB) return state;
      return { ...state, compareA: a, compareB: b, compareOpen: false };
    }
    case 'swapCompare':
      if (!state.compareA && !state.compareB) return state;
      return { ...state, compareA: state.compareB, compareB: state.compareA };
    case 'clearCompare':
      if (!state.compareA && !state.compareB) return state;
      return { ...state, compareA: null, compareB: null, compareOpen: false };
    case 'toggleBookmark': {
      if (!getPlace(action.id)) return state;
      const has = state.bookmarks.includes(action.id);
      const bookmarks = has
        ? state.bookmarks.filter((b) => b !== action.id)
        : [...state.bookmarks, action.id];
      return { ...state, bookmarks };
    }
    case 'setPaletteOpen':
      if (action.open === state.paletteOpen) return state;
      return { ...state, paletteOpen: action.open };
    case 'setMethodologyOpen':
      if (action.open === state.methodologyOpen) return state;
      return { ...state, methodologyOpen: action.open };
    case 'setFieldNoteOpen':
      if (action.open === state.fieldNoteOpen) return state;
      return { ...state, fieldNoteOpen: action.open };
    case 'setCompareOpen':
      if (action.open === state.compareOpen) return state;
      return { ...state, compareOpen: action.open };
    case 'setTheme':
      if (action.theme !== 'light' && action.theme !== 'dark') return state;
      if (action.theme === state.theme) return state;
      return { ...state, theme: action.theme };
    case 'dismissIntro':
      if (state.introDismissed) return state;
      return { ...state, introDismissed: true };
    case 'resetView':
      return {
        ...state,
        view: 'atlas',
        layer: 'energy',
        horizon: 2026,
        scenario: 'momentum',
        selectedId: null,
        compareA: null,
        compareB: null,
        query: '',
        mapResetCount: state.mapResetCount + 1,
      };
    case 'restore':
      return { ...state, ...action.state };
    case 'requestFocus': {
      if (!getPlace(action.id)) return state;
      return {
        ...state,
        focusRequest: { id: action.id, nonce: (state.focusRequest?.nonce ?? 0) + 1 },
      };
    }
    default:
      return state;
  }
}

function initialState(): AppState {
  const { prefs, storageOk } = loadPrefs();
  const fromUrl = parseUrl(window.location.search, (id) => Boolean(getPlace(id)));
  // URL wins over stored prefs; prefs fill what the URL omits.
  const urlIsEmpty = window.location.search === '';
  return {
    ...DEFAULT_URL_STATE,
    layer: urlIsEmpty && prefs.layer ? prefs.layer : fromUrl.layer,
    horizon: urlIsEmpty && prefs.horizon ? prefs.horizon : fromUrl.horizon,
    scenario: urlIsEmpty && prefs.scenario ? prefs.scenario : fromUrl.scenario,
    view: fromUrl.view,
    selectedId: fromUrl.selectedId,
    compareA: fromUrl.compareA,
    compareB: fromUrl.compareB,
    query: '',
    bookmarks: prefs.bookmarks ?? [],
    paletteOpen: false,
    methodologyOpen: false,
    fieldNoteOpen: false,
    introDismissed: prefs.introDismissed ?? false,
    storageOk,
    mapResetCount: 0,
    focusRequest: null,
    compareOpen: false,
    theme: prefs.theme ?? 'light',
  };
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Persist the durable subset whenever it changes.
  useEffect(() => {
    savePrefs({
      layer: state.layer,
      horizon: state.horizon,
      scenario: state.scenario,
      bookmarks: state.bookmarks,
      introDismissed: state.introDismissed,
      theme: state.theme,
    });
  }, [state.layer, state.horizon, state.scenario, state.bookmarks, state.introDismissed, state.theme]);

  // Keep the document attribute in step with the stored theme.
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  // Reflect selection, view and compare into the URL with a history entry.
  useEffect(() => {
    const qs = serializeUrl(state);
    const target = `${window.location.pathname}${qs}`;
    if (target !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedId, state.view, state.compareA, state.compareB]);

  // Layer, horizon and scenario update the URL in place.
  useEffect(() => {
    const qs = serializeUrl(state);
    const target = `${window.location.pathname}${qs}`;
    if (target !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.layer, state.horizon, state.scenario]);

  // Back/forward restores the encoded state.
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const restored = parseUrl(window.location.search, (id) => Boolean(getPlace(id)));
      void event;
      dispatch({ type: 'restore', state: restored });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): { state: AppState; dispatch: Dispatch<Action> } {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
