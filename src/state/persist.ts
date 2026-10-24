import { LAYER_ORDER } from '../data/layers';
import { HORIZON_YEARS } from '../data/model';
import type { HorizonYear, LayerId, ScenarioId } from '../data/types';

/**
 * Preference persistence, guarded end to end. Storage can throw at any step
 * (private mode, quota, disabled cookies); when it does the app keeps working
 * in memory and the UI may surface a one-line notice.
 */

const KEY = 'worldline.prefs.v1';

export interface Prefs {
  layer?: LayerId;
  horizon?: HorizonYear;
  scenario?: ScenarioId;
  bookmarks?: string[];
  introDismissed?: boolean;
}

export interface PrefsResult {
  prefs: Prefs;
  storageOk: boolean;
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

/** Read prefs, validating every field; junk is dropped, not trusted. */
export function loadPrefs(): PrefsResult {
  let storageOk = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { prefs: {}, storageOk };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { prefs: {}, storageOk };
    const obj = parsed as Record<string, unknown>;
    const prefs: Prefs = {};
    if (isLayer(obj.layer)) prefs.layer = obj.layer;
    if (isHorizon(obj.horizon)) prefs.horizon = obj.horizon;
    if (isScenario(obj.scenario)) prefs.scenario = obj.scenario;
    if (typeof obj.introDismissed === 'boolean') prefs.introDismissed = obj.introDismissed;
    if (Array.isArray(obj.bookmarks)) {
      prefs.bookmarks = obj.bookmarks.filter(
        (b): b is string => typeof b === 'string' && /^[a-z0-9-]{1,40}$/.test(b),
      );
    }
    return { prefs, storageOk };
  } catch {
    storageOk = false;
    return { prefs: {}, storageOk };
  }
}

export function savePrefs(prefs: Prefs): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}
