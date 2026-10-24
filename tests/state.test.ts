import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlace } from '../src/data/places';
import { reducer, type AppState } from '../src/state/store';
import { DEFAULT_URL_STATE, parseUrl, serializeUrl } from '../src/state/url';
import { loadPrefs, savePrefs } from '../src/state/persist';

function baseState(): AppState {
  return {
    ...DEFAULT_URL_STATE,
    query: '',
    bookmarks: [],
    paletteOpen: false,
    methodologyOpen: false,
    fieldNoteOpen: false,
    introDismissed: false,
    storageOk: true,
    mapResetCount: 0,
    focusRequest: null,
    compareOpen: false,
    theme: 'light',
  };
}

describe('url parsing and serialization', () => {
  it('falls back to defaults for junk params', () => {
    const s = parseUrl('?l=purple&h=9999&s=chaos&p=../../etc', () => true);
    expect(s.layer).toBe('energy');
    expect(s.horizon).toBe(2026);
    expect(s.scenario).toBe('momentum');
    expect(s.selectedId).toBeNull();
  });

  it('rejects unknown place ids when the gazetteer says no', () => {
    const s = parseUrl('?p=atlantis&a=rotterdam&b=atlantis', (id) => getPlace(id) !== undefined);
    expect(s.selectedId).toBeNull();
    expect(s.compareA).toBe('rotterdam');
    expect(s.compareB).toBeNull();
  });

  it('round-trips a full state', () => {
    const s = {
      ...DEFAULT_URL_STATE,
      view: 'scenarios' as const,
      layer: 'water' as const,
      horizon: 2050 as const,
      scenario: 'strained' as const,
      selectedId: 'cairo',
      compareA: 'cairo',
      compareB: 'oslo',
    };
    const qs = serializeUrl(s);
    const back = parseUrl(qs, () => true);
    expect(back).toEqual(s);
  });

  it('omits default values from the query string', () => {
    expect(serializeUrl(DEFAULT_URL_STATE)).toBe('');
  });
});

describe('reducer', () => {
  it('switches layer and keeps everything else', () => {
    const s = reducer(baseState(), { type: 'setLayer', layer: 'water' });
    expect(s.layer).toBe('water');
    expect(s.horizon).toBe(2026);
  });

  it('ignores invalid actions rather than corrupting state', () => {
    const before = baseState();
    expect(reducer(before, { type: 'setLayer', layer: 'nope' as never })).toBe(before);
    expect(reducer(before, { type: 'selectPlace', id: 'atlantis' })).toBe(before);
    expect(reducer(before, { type: 'toggleBookmark', id: 'atlantis' })).toBe(before);
  });

  it('selecting a place twice is a no-op (stable reference)', () => {
    const opened = reducer(baseState(), { type: 'selectPlace', id: 'oslo' });
    expect(reducer(opened, { type: 'selectPlace', id: 'oslo' })).toBe(opened);
  });

  it('fills compare slots in order and toggles off', () => {
    let s = baseState();
    s = reducer(s, { type: 'addToCompare', id: 'oslo' });
    expect(s.compareA).toBe('oslo');
    expect(s.compareB).toBeNull();
    expect(s.compareOpen).toBe(false);
    s = reducer(s, { type: 'addToCompare', id: 'cairo' });
    expect(s.compareB).toBe('cairo');
    expect(s.compareOpen).toBe(true);
    s = reducer(s, { type: 'swapCompare' });
    expect(s.compareA).toBe('cairo');
    expect(s.compareB).toBe('oslo');
    s = reducer(s, { type: 'addToCompare', id: 'cairo' });
    expect(s.compareA).toBeNull();
    expect(s.compareB).toBe('oslo');
    expect(s.compareOpen).toBe(false);
  });

  it('third compare addition rotates the oldest out', () => {
    let s = baseState();
    s = reducer(s, { type: 'addToCompare', id: 'oslo' });
    s = reducer(s, { type: 'addToCompare', id: 'cairo' });
    s = reducer(s, { type: 'addToCompare', id: 'lagos' });
    expect(s.compareA).toBe('cairo');
    expect(s.compareB).toBe('lagos');
  });

  it('bookmarks toggle', () => {
    let s = baseState();
    s = reducer(s, { type: 'toggleBookmark', id: 'oslo' });
    expect(s.bookmarks).toEqual(['oslo']);
    s = reducer(s, { type: 'toggleBookmark', id: 'oslo' });
    expect(s.bookmarks).toEqual([]);
  });

  it('reset restores defaults and bumps the map reset counter', () => {
    let s = baseState();
    s = reducer(s, { type: 'setLayer', layer: 'climate' });
    s = reducer(s, { type: 'setHorizon', horizon: 2050 });
    s = reducer(s, { type: 'selectPlace', id: 'oslo' });
    s = reducer(s, { type: 'addToCompare', id: 'cairo' });
    s = reducer(s, { type: 'resetView' });
    expect(s.layer).toBe('energy');
    expect(s.horizon).toBe(2026);
    expect(s.selectedId).toBeNull();
    expect(s.compareA).toBeNull();
    expect(s.mapResetCount).toBe(1);
  });

  it('restore merges URL state (back/forward)', () => {
    const s = reducer(baseState(), {
      type: 'restore',
      state: { ...DEFAULT_URL_STATE, layer: 'connectivity', horizon: 2035 },
    });
    expect(s.layer).toBe('connectivity');
    expect(s.horizon).toBe(2035);
    expect(s.bookmarks).toEqual([]);
  });

  it('requestFocus increments a nonce for the map', () => {
    let s = baseState();
    s = reducer(s, { type: 'requestFocus', id: 'oslo' });
    expect(s.focusRequest).toEqual({ id: 'oslo', nonce: 1 });
    s = reducer(s, { type: 'requestFocus', id: 'oslo' });
    expect(s.focusRequest?.nonce).toBe(2);
  });

  it('theme toggles and rejects junk values', () => {
    const s = reducer(baseState(), { type: 'setTheme', theme: 'dark' });
    expect(s.theme).toBe('dark');
    expect(reducer(s, { type: 'setTheme', theme: 'dark' })).toBe(s);
    expect(reducer(s, { type: 'setTheme', theme: 'midnight' as never })).toBe(s);
  });
});

describe('persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads valid prefs', () => {
    expect(
      savePrefs({ layer: 'water', horizon: 2035, bookmarks: ['oslo', 'cairo'], theme: 'dark' }),
    ).toBe(true);
    const { prefs, storageOk } = loadPrefs();
    expect(storageOk).toBe(true);
    expect(prefs.layer).toBe('water');
    expect(prefs.horizon).toBe(2035);
    expect(prefs.bookmarks).toEqual(['oslo', 'cairo']);
    expect(prefs.theme).toBe('dark');
  });

  it('drops junk fields instead of trusting them', () => {
    window.localStorage.setItem('worldline.prefs.v1', '{"layer":"purple","horizon":9999}');
    const { prefs } = loadPrefs();
    expect(prefs.layer).toBeUndefined();
    expect(prefs.horizon).toBeUndefined();
  });

  it('filters malformed bookmarks', () => {
    window.localStorage.setItem(
      'worldline.prefs.v1',
      JSON.stringify({ bookmarks: ['oslo', 42, '../etc/passwd', 'cairo'] }),
    );
    const { prefs } = loadPrefs();
    expect(prefs.bookmarks).toEqual(['oslo', 'cairo']);
  });

  it('keeps working when storage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const result = loadPrefs();
    expect(result.storageOk).toBe(false);
    expect(result.prefs).toEqual({});
    getItem.mockRestore();

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(savePrefs({ layer: 'water' })).toBe(false);
    setItem.mockRestore();
  });
});
