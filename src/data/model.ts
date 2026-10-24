import { METRICS, METRIC_BY_ID } from './metrics';
import { LAYER_BY_ID, PRIMARY_BINS } from './layers';
import type {
  ArchetypeId,
  HorizonYear,
  LayerId,
  MetricDef,
  MetricId,
  Place,
  PlaceKind,
  ScenarioId,
} from './types';

/**
 * The Worldline illustrative model.
 *
 * Every value is deterministic: an authored 2026 baseline per place, moved along
 * archetype growth rules toward a stated ceiling, then scaled by the selected
 * scenario. No randomness, no runtime data. The numbers are calibrated to feel
 * plausible against publicly reported ranges, but they are an editorial model for
 * exploration, not official statistics. The methodology panel says exactly this.
 */

export const BASE_YEAR: HorizonYear = 2026;
export const HORIZON_YEARS: readonly HorizonYear[] = [2026, 2035, 2050];

interface Curve {
  kind: 'approach';
  /** Annual rate constant; higher = faster movement toward the cap. */
  rate: number;
  /** Ceiling the metric approaches (works in either direction). */
  cap: number;
}

interface Linear {
  kind: 'linear';
  /** Absolute change per year. */
  perYear: number;
}

type Rule = Curve | Linear;

interface Archetype {
  id: ArchetypeId;
  label: string;
  description: string;
  base: Partial<Record<MetricId, number>>;
  rules: Partial<Record<MetricId, Rule>>;
}

/**
 * Scenario multipliers scale each rule's speed. 1 = continued momentum.
 * They never change 2026 values and never invent data; they change how fast a
 * place moves toward the same stated ceilings, except heat, where the scenario
 * is the warming trajectory itself.
 */
export const SCENARIOS: readonly {
  id: ScenarioId;
  name: string;
  summary: string;
  scale: Partial<Record<MetricId, number>>;
  assumptions: string[];
}[] = [
  {
    id: 'momentum',
    name: 'Continued momentum',
    summary: 'The model baseline: today’s pace of buildout and warming carries on.',
    scale: {},
    assumptions: [
      'Decarbonisation, electrification and network buildout continue at roughly their 2024–2025 pace.',
      'Water systems keep improving at current rates; stress tracks demand growth.',
      'Warming follows the trajectory embedded in current policies, adding 0.35–0.9 extreme-heat days per year depending on place.',
    ],
  },
  {
    id: 'accelerate',
    name: 'Accelerate & electrify',
    summary: 'Policy and capital push every system faster; weather does not change.',
    scale: {
      cleanPowerShare: 1.5,
      gridCarbon: 1.45,
      evShare: 1.5,
      transitShare: 1.35,
      flexibilityScore: 1.3,
      broadband: 1.25,
      mobileCoverage: 1.2,
      reuseShare: 1.4,
      lossesShare: 1.3,
      readinessScore: 1.25,
      canopyShare: 1.3,
      accessScore: 1.25,
      commuteTime: 1.2,
      supplyPerCapita: 1.2,
      dataCostShare: 1.2,
      outageHours: 1.25,
      waterStress: 0.75,
      floodExposure: 0.9,
      demandIndex: 0.92,
    },
    assumptions: [
      'Clean-power and grid buildout roughly 1.5× faster; permit and financing friction falls.',
      'EV and transit share climb 1.35–1.5× faster; efficiency trims demand growth by about 8%.',
      'Water efficiency and reuse accelerate; stress grows more slowly.',
      'Extreme heat days are unchanged: faster action does not change weather by 2050, only exposure and coping.',
    ],
  },
  {
    id: 'strained',
    name: 'Strained transition',
    summary: 'Buildout slips and warming runs hotter; systems do more with less.',
    scale: {
      cleanPowerShare: 0.55,
      gridCarbon: 0.6,
      evShare: 0.5,
      transitShare: 0.7,
      flexibilityScore: 0.7,
      broadband: 0.8,
      mobileCoverage: 0.85,
      reuseShare: 0.6,
      lossesShare: 0.6,
      readinessScore: 0.7,
      canopyShare: 0.6,
      accessScore: 0.6,
      commuteTime: 0.5,
      supplyPerCapita: 1.3,
      dataCostShare: 0.7,
      outageHours: 0.7,
      waterStress: 1.35,
      floodExposure: 1.3,
      demandIndex: 1.08,
      heatDays: 1.6,
    },
    assumptions: [
      'Clean-power buildout falls to roughly half its baseline pace; grids stay carbon-heavy longer.',
      'Water stress and flood exposure grow about a third faster; reuse and efficiency lag.',
      'The warming trajectory steepens: extreme-heat days accumulate about 1.6× faster.',
      'Adaptation readiness and network resilience improve more slowly; costs stay high.',
    ],
  },
];

export const SCENARIO_BY_ID: Readonly<Record<ScenarioId, (typeof SCENARIOS)[number]>> =
  Object.fromEntries(SCENARIOS.map((s) => [s.id, s])) as Readonly<
    Record<ScenarioId, (typeof SCENARIOS)[number]>
  >;

const APPROACH = (rate: number, cap: number): Rule => ({ kind: 'approach', rate, cap });
const LINEAR = (perYear: number): Rule => ({ kind: 'linear', perYear });

/**
 * Five place archetypes. The `base` values are defaults for places of that
 * family; authored per-place overrides in places.ts depart from them where the
 * story demands it. Rules are the same idea for trajectories.
 */
export const ARCHETYPES: Readonly<Record<ArchetypeId, Archetype>> = {
  consolidated: {
    id: 'consolidated',
    label: 'Consolidated metro',
    description:
      'Wealthy, temperate metros with mature infrastructure: steady demand, slow stress growth, capital for adaptation.',
    base: {
      cleanPowerShare: 55,
      gridCarbon: 240,
      demandIndex: 100,
      flexibilityScore: 62,
      waterStress: 0.28,
      supplyPerCapita: 320,
      lossesShare: 16,
      reuseShare: 8,
      transitShare: 28,
      evShare: 22,
      commuteTime: 36,
      accessScore: 58,
      heatDays: 9,
      floodExposure: 12,
      canopyShare: 21,
      readinessScore: 58,
      broadband: 180,
      mobileCoverage: 78,
      outageHours: 6,
      dataCostShare: 1.6,
    },
    rules: {
      cleanPowerShare: APPROACH(0.035, 97),
      gridCarbon: APPROACH(0.05, 18),
      demandIndex: LINEAR(1.1),
      flexibilityScore: APPROACH(0.02, 90),
      waterStress: APPROACH(0.008, 0.2),
      supplyPerCapita: APPROACH(0.004, 340),
      lossesShare: APPROACH(0.03, 7),
      reuseShare: APPROACH(0.04, 30),
      transitShare: APPROACH(0.018, 46),
      evShare: APPROACH(0.11, 92),
      commuteTime: APPROACH(0.012, 26),
      accessScore: APPROACH(0.015, 80),
      heatDays: LINEAR(0.35),
      floodExposure: APPROACH(0.008, 10),
      canopyShare: APPROACH(0.012, 32),
      readinessScore: APPROACH(0.022, 88),
      broadband: APPROACH(0.09, 900),
      mobileCoverage: APPROACH(0.05, 99.5),
      outageHours: APPROACH(0.06, 2),
      dataCostShare: APPROACH(0.02, 1.0),
    },
  },
  fastGrowth: {
    id: 'fastGrowth',
    label: 'Fast-growth metro',
    description:
      'Rapidly urbanising places: demand climbs steeply, buildout races, water systems squeeze.',
    base: {
      cleanPowerShare: 32,
      gridCarbon: 430,
      demandIndex: 100,
      flexibilityScore: 44,
      waterStress: 0.55,
      supplyPerCapita: 240,
      lossesShare: 24,
      reuseShare: 6,
      transitShare: 33,
      evShare: 12,
      commuteTime: 48,
      accessScore: 46,
      heatDays: 22,
      floodExposure: 19,
      canopyShare: 14,
      readinessScore: 42,
      broadband: 140,
      mobileCoverage: 72,
      outageHours: 14,
      dataCostShare: 3.2,
    },
    rules: {
      cleanPowerShare: APPROACH(0.055, 90),
      gridCarbon: APPROACH(0.045, 60),
      demandIndex: LINEAR(2.6),
      flexibilityScore: APPROACH(0.028, 82),
      waterStress: APPROACH(0.01, 0.7),
      supplyPerCapita: APPROACH(0.006, 220),
      lossesShare: APPROACH(0.025, 12),
      reuseShare: APPROACH(0.05, 25),
      transitShare: APPROACH(0.02, 52),
      evShare: APPROACH(0.14, 90),
      commuteTime: APPROACH(0.005, 40),
      accessScore: APPROACH(0.02, 74),
      heatDays: LINEAR(0.6),
      floodExposure: APPROACH(0.006, 24),
      canopyShare: APPROACH(0.018, 26),
      readinessScore: APPROACH(0.026, 78),
      broadband: APPROACH(0.11, 850),
      mobileCoverage: APPROACH(0.07, 99),
      outageHours: APPROACH(0.07, 4),
      dataCostShare: APPROACH(0.045, 1.2),
    },
  },
  aridStressed: {
    id: 'aridStressed',
    label: 'Arid & stressed',
    description:
      'Dry, hot places where water defines everything and solar moves fast from a low base.',
    base: {
      cleanPowerShare: 24,
      gridCarbon: 420,
      demandIndex: 100,
      flexibilityScore: 40,
      waterStress: 0.79,
      supplyPerCapita: 210,
      lossesShare: 22,
      reuseShare: 18,
      transitShare: 18,
      evShare: 10,
      commuteTime: 42,
      accessScore: 40,
      heatDays: 58,
      floodExposure: 8,
      canopyShare: 9,
      readinessScore: 44,
      broadband: 150,
      mobileCoverage: 80,
      outageHours: 9,
      dataCostShare: 2.1,
    },
    rules: {
      cleanPowerShare: APPROACH(0.06, 88),
      gridCarbon: APPROACH(0.05, 45),
      demandIndex: LINEAR(2.2),
      flexibilityScore: APPROACH(0.03, 78),
      waterStress: APPROACH(0.02, 0.92),
      supplyPerCapita: APPROACH(0.008, 170),
      lossesShare: APPROACH(0.03, 10),
      reuseShare: APPROACH(0.045, 55),
      transitShare: APPROACH(0.014, 34),
      evShare: APPROACH(0.12, 85),
      commuteTime: APPROACH(0.008, 34),
      accessScore: APPROACH(0.016, 66),
      heatDays: LINEAR(0.9),
      floodExposure: APPROACH(0.005, 12),
      canopyShare: APPROACH(0.012, 18),
      readinessScore: APPROACH(0.024, 74),
      broadband: APPROACH(0.1, 800),
      mobileCoverage: APPROACH(0.06, 99),
      outageHours: APPROACH(0.06, 3),
      dataCostShare: APPROACH(0.04, 0.9),
    },
  },
  emergingLeapfrog: {
    id: 'emergingLeapfrog',
    label: 'Leapfrog metro',
    description:
      'Young, fast cities building around deficits: informal systems today, leapfrog potential tomorrow.',
    base: {
      cleanPowerShare: 30,
      gridCarbon: 390,
      demandIndex: 100,
      flexibilityScore: 30,
      waterStress: 0.48,
      supplyPerCapita: 150,
      lossesShare: 34,
      reuseShare: 3,
      transitShare: 26,
      evShare: 5,
      commuteTime: 62,
      accessScore: 34,
      heatDays: 34,
      floodExposure: 27,
      canopyShare: 11,
      readinessScore: 28,
      broadband: 70,
      mobileCoverage: 62,
      outageHours: 46,
      dataCostShare: 5.5,
    },
    rules: {
      cleanPowerShare: APPROACH(0.05, 85),
      gridCarbon: APPROACH(0.035, 90),
      demandIndex: LINEAR(3.4),
      flexibilityScore: APPROACH(0.03, 72),
      waterStress: APPROACH(0.009, 0.66),
      supplyPerCapita: APPROACH(0.006, 190),
      lossesShare: APPROACH(0.022, 18),
      reuseShare: APPROACH(0.05, 20),
      transitShare: APPROACH(0.016, 42),
      evShare: APPROACH(0.15, 80),
      commuteTime: APPROACH(0.007, 45),
      accessScore: APPROACH(0.018, 62),
      heatDays: LINEAR(0.7),
      floodExposure: APPROACH(0.006, 33),
      canopyShare: APPROACH(0.014, 22),
      readinessScore: APPROACH(0.024, 62),
      broadband: APPROACH(0.13, 600),
      mobileCoverage: APPROACH(0.08, 98),
      outageHours: APPROACH(0.05, 12),
      dataCostShare: APPROACH(0.06, 2.0),
    },
  },
  climateFrontline: {
    id: 'climateFrontline',
    label: 'Climate frontline',
    description:
      'Places organised around a hazard they already live with: flood defence, heat response, managed retreat.',
    base: {
      cleanPowerShare: 34,
      gridCarbon: 320,
      demandIndex: 100,
      flexibilityScore: 46,
      waterStress: 0.24,
      supplyPerCapita: 300,
      lossesShare: 26,
      reuseShare: 3,
      transitShare: 12,
      evShare: 10,
      commuteTime: 34,
      accessScore: 42,
      heatDays: 25,
      floodExposure: 38,
      canopyShare: 24,
      readinessScore: 55,
      broadband: 150,
      mobileCoverage: 84,
      outageHours: 26,
      dataCostShare: 2.0,
    },
    rules: {
      cleanPowerShare: APPROACH(0.04, 92),
      gridCarbon: APPROACH(0.045, 40),
      demandIndex: LINEAR(1.3),
      flexibilityScore: APPROACH(0.022, 84),
      waterStress: APPROACH(0.008, 0.3),
      supplyPerCapita: APPROACH(0.004, 320),
      lossesShare: APPROACH(0.025, 10),
      reuseShare: APPROACH(0.04, 25),
      transitShare: APPROACH(0.016, 30),
      evShare: APPROACH(0.1, 88),
      commuteTime: APPROACH(0.01, 28),
      accessScore: APPROACH(0.016, 66),
      heatDays: LINEAR(0.5),
      floodExposure: APPROACH(0.004, 42),
      canopyShare: APPROACH(0.012, 34),
      readinessScore: APPROACH(0.02, 90),
      broadband: APPROACH(0.09, 800),
      mobileCoverage: APPROACH(0.055, 99),
      outageHours: APPROACH(0.055, 6),
      dataCostShare: APPROACH(0.025, 1.2),
    },
  },
};

function ruleFor(place: Place, metric: MetricId): Rule | undefined {
  return ARCHETYPES[place.archetype].rules[metric];
}

/** Deterministic movement toward a cap, symmetric in direction. */
function approach(base: number, cap: number, rate: number, years: number): number {
  return base + (cap - base) * (1 - Math.exp(-rate * years));
}

// Infrastructure nodes author only the indicators that mean something for them;
// unauthored metrics read as not modelled (null) and are never interpolated.

/**
 * The modelled value of a metric for a place at a horizon under a scenario.
 * Returns null where the metric is not modelled for that place.
 */
export function modelValue(
  place: Place,
  metric: MetricId,
  year: HorizonYear,
  scenario: ScenarioId,
): number | null {
  const def = METRIC_BY_ID[metric];
  const authored = place.base[metric];
  if (authored === undefined) return null;

  const base = clamp(authored, def);
  if (year === BASE_YEAR) return base;

  const rule = ruleFor(place, metric);
  if (!rule) return base;

  const scenarioScale = SCENARIO_BY_ID[scenario].scale[metric] ?? 1;
  const placeScale = place.rateScale?.[metric] ?? 1;
  const years = year - BASE_YEAR;

  let value: number;
  if (rule.kind === 'linear') {
    value = base + rule.perYear * years * scenarioScale * placeScale;
  } else {
    const rate = rule.rate * scenarioScale * placeScale;
    value = approach(base, rule.cap, rate, years);
  }
  return clamp(value, def);
}

function clamp(value: number, def: MetricDef): number {
  return Math.min(def.max, Math.max(def.min, value));
}

/** Convenience: the value or null, already rounded for display. */
export function displayValue(
  place: Place,
  metric: MetricId,
  year: HorizonYear,
  scenario: ScenarioId,
): number | null {
  const v = modelValue(place, metric, year, scenario);
  if (v === null) return null;
  const decimals = METRIC_BY_ID[metric].decimals;
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
}

/** Yearly series 2026 → horizon for charts. */
export function series(
  place: Place,
  metric: MetricId,
  scenario: ScenarioId,
  endYear: HorizonYear = 2050,
): { year: number; value: number | null }[] {
  const out: { year: number; value: number | null }[] = [];
  for (let y = BASE_YEAR; y <= endYear; y += 1) {
    out.push({ year: y, value: modelValue(place, metric, y as HorizonYear, scenario) });
  }
  return out;
}

export function binIndexFor(layer: LayerId, value: number): number {
  const bins = PRIMARY_BINS[layer];
  for (let i = 0; i < bins.length; i += 1) {
    if (value < bins[i].upTo) return i;
  }
  return bins.length - 1;
}

export function binColorFor(layer: LayerId, value: number): string {
  return LAYER_BY_ID[layer].ramp[binIndexFor(layer, value)];
}

export function binLabelFor(layer: LayerId, value: number): string {
  const bins = PRIMARY_BINS[layer];
  const i = binIndexFor(layer, value);
  return bins[i].label;
}

/** Label override for infrastructure nodes, e.g. "Transits (2026 = 100)". */
export function metricLabelFor(metric: MetricDef, kind: PlaceKind): string {
  return metric.kindLabels?.[kind] ?? metric.label;
}

/** A signed difference formatted for a delta chip, honouring dimensionless units. */
export function deltaChipText(diff: number, metric: MetricDef): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  const num = formatNumber(Math.abs(diff), metric.decimals);
  return DIMENSIONLESS_UNITS.has(metric.unitShort) ? `${sign}${num}` : `${sign}${num} ${metric.unitShort}`;
}

/**
 * Delta between two horizons, formatted with unit and sign, plus whether the
 * change reads as good, bad or neutral given the metric's direction.
 */
export function delta(
  place: Place,
  metric: MetricId,
  from: HorizonYear,
  to: HorizonYear,
  scenario: ScenarioId,
): { raw: number | null; text: string; sentiment: 'good' | 'bad' | 'neutral' } {
  const def = METRIC_BY_ID[metric];
  const a = modelValue(place, metric, from, scenario);
  const b = modelValue(place, metric, to, scenario);
  if (a === null || b === null) return { raw: null, text: '', sentiment: 'neutral' };
  const raw = b - a;
  const rounded = Math.round(raw * 10 ** def.decimals) / 10 ** def.decimals;
  const text = deltaChipText(rounded, def);
  let sentiment: 'good' | 'bad' | 'neutral';
  if (def.direction === 'neutral' || rounded === 0) sentiment = 'neutral';
  else if ((def.direction === 'upGood') === raw > 0) sentiment = 'good';
  else sentiment = 'bad';
  return { raw: rounded, text, sentiment };
}

/**
 * Compose a one-sentence takeaway for a metric's trend chart. Deterministic.
 */
export function trendTakeaway(
  place: Place,
  metric: MetricId,
  scenario: ScenarioId,
): string {
  const def = METRIC_BY_ID[metric];
  const a = displayValue(place, metric, 2026, scenario);
  const b = displayValue(place, metric, 2050, scenario);
  if (a === null || b === null) return '';
  const d = delta(place, metric, 2026, 2050, scenario);
  const dir =
    d.sentiment === 'neutral'
      ? d.raw !== null && d.raw > 0
        ? 'rises'
        : d.raw !== null && d.raw < 0
          ? 'eases'
          : 'holds'
      : d.sentiment === 'good'
        ? 'improves'
        : 'deteriorates';
  const scenarioName = SCENARIO_BY_ID[scenario].name.toLowerCase();
  return `${def.label} ${dir} from ${valueWithUnit(a, def)} in 2026 to ${valueWithUnit(b, def)} by 2050 under ${scenarioName}.`;
}

export function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Unit suffixes that read badly inline in prose ("0.91 0–1"); they stay in captions. */
const DIMENSIONLESS_UNITS = new Set(['0–1', '/100', 'index']);

/** A value formatted for prose: number plus unit, unless the unit is dimensionless. */
export function valueWithUnit(value: number, metric: MetricDef): string {
  const num = formatNumber(value, metric.decimals);
  return DIMENSIONLESS_UNITS.has(metric.unitShort) ? num : `${num} ${metric.unitShort}`;
}

/** All metrics of a layer, in definition order. */
export function metricsForLayer(layer: LayerId): MetricDef[] {
  return METRICS.filter((m) => m.layer === layer);
}

/** The layer's headline (map-encoding) metric definition. */
export function primaryMetricFor(layer: LayerId): MetricDef {
  const def = METRICS.find((m) => m.layer === layer && m.primary);
  if (!def) throw new Error(`Layer ${layer} has no primary metric`);
  return def;
}

export { METRICS, METRIC_BY_ID, PRIMARY_BINS, LAYER_BY_ID };
