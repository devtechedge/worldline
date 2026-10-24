/** Core domain types for the Worldline atlas. All data is bundled and deterministic. */

export type LayerId = 'energy' | 'water' | 'mobility' | 'climate' | 'connectivity';

export type ScenarioId = 'momentum' | 'accelerate' | 'strained';

/** Years the atlas supports as horizons. */
export type HorizonYear = 2026 | 2035 | 2050;

export type PlaceKind = 'city' | 'port' | 'grid' | 'corridor' | 'dam';

export type Region =
  | 'Africa'
  | 'Americas'
  | 'Asia'
  | 'Europe'
  | 'Middle East'
  | 'Oceania';

export type ArchetypeId =
  | 'consolidated'
  | 'fastGrowth'
  | 'aridStressed'
  | 'emergingLeapfrog'
  | 'climateFrontline';

export type MetricId =
  // Energy
  | 'cleanPowerShare'
  | 'gridCarbon'
  | 'demandIndex'
  | 'flexibilityScore'
  // Water
  | 'waterStress'
  | 'supplyPerCapita'
  | 'lossesShare'
  | 'reuseShare'
  // Mobility
  | 'transitShare'
  | 'evShare'
  | 'commuteTime'
  | 'accessScore'
  // Climate
  | 'heatDays'
  | 'floodExposure'
  | 'canopyShare'
  | 'readinessScore'
  // Connectivity
  | 'broadband'
  | 'mobileCoverage'
  | 'outageHours'
  | 'dataCostShare';

/** How "better" reads for a metric; drives delta chips and interpretation copy. */
export type Direction = 'upGood' | 'downGood' | 'neutral';

export interface MetricDef {
  id: MetricId;
  layer: LayerId;
  label: string;
  /** Short unit for compact chips, e.g. "%" */
  unitShort: string;
  /** Fuller unit for chart axes, e.g. "% of generation" */
  unitFull: string;
  direction: Direction;
  decimals: 0 | 1 | 2;
  /** Display clamp; also used by the model's caps. */
  min: number;
  max: number;
  /** The layer's headline metric: drives map encoding and the legend. */
  primary?: boolean;
  /** One-line plain-language explanation shown in methodology and metric rows. */
  explain: string;
  /** Alternative labels for infrastructure nodes, where the city reading does not apply. */
  kindLabels?: Partial<Record<PlaceKind, string>>;
}

export interface Bin {
  /** Upper bound (exclusive); last bin is open-ended. */
  upTo: number;
  label: string;
}

export interface LayerDef {
  id: LayerId;
  name: string;
  /** One-line description under the layer tab. */
  blurb: string;
  /** Identity hue for the layer (tabs, accents, connection strokes). */
  hue: string;
  /** Ink-safe variant of the hue for text on porcelain. */
  hueInk: string;
  /** Five sequential ramp colors, light = low to dark = high, for the primary metric. */
  ramp: [string, string, string, string, string];
}

export interface PlaceConnection {
  to: string;
  /** Short label, e.g. "Offshore wind landfall". */
  label: string;
  layer: LayerId;
}

export interface Place {
  id: string;
  name: string;
  country: string;
  region: Region;
  kind: PlaceKind;
  /** WGS84 longitude / latitude. */
  lon: number;
  lat: number;
  /** Symbol size and default label prominence. 1 = largest. */
  tier: 1 | 2 | 3;
  archetype: ArchetypeId;
  /** Authored 2026 values that depart from the archetype baseline. */
  base: Partial<Record<MetricId, number>>;
  /** Per-place speed adjustments applied on top of archetype rates. */
  rateScale?: Partial<Record<MetricId, number>>;
  connections: PlaceConnection[];
  context: string;
  whyItMatters: string;
  risks: string[];
  opportunities: string[];
}
