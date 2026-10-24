/**
 * Editorial content: methodology, the field note, and static UI copy.
 * Everything the reader needs to trust (and doubt) the model lives here.
 */

export const EDITION = {
  name: 'Worldline',
  tagline: 'An atlas of the systems shaping modern life',
  edition: 'First edition, October 2026',
  baseline: '2026 baseline',
  horizons: '2026 · 2035 · 2050',
} as const;

export const METHODOLOGY = {
  intro:
    'Worldline is an editorial model, not a statistical agency. It runs entirely in your browser on bundled data. Nothing here is live, nothing is fetched, and nothing updates on its own.',
  whatYouCanClaim: [
    'The 2026 baseline values are authored, rounded figures calibrated to feel plausible against publicly reported ranges for each place and indicator.',
    'Trajectories from 2026 onward follow published, deterministic rules: each metric moves along an archetype-specific path toward a stated ceiling, at a speed the scenario adjusts.',
    'Every number in the app is reproducible. Given the same place, metric, horizon and scenario, you will always see the same value, on any device, offline.',
  ],
  whatYouCannotClaim: [
    'These are not official statistics. Do not cite Worldline values in academic work, journalism or procurement.',
    'The 2035 and 2050 values are scenario outputs, not forecasts. They show how systems respond to a stated set of assumptions, not what will happen.',
    'The model is deliberately simple. It has no prices, no politics, no migration shocks and no second-order effects. Real systems have all four.',
    'Precision is bounded: values are displayed to the number of digits the model can defend, which is fewer than a spreadsheet would suggest.',
  ],
  scenarios:
    'Three scenarios share the same physics and differ only in speed and trajectory. Continued momentum is the baseline. Accelerate and electrify push buildout faster but cannot change weather by 2050. Strained transition slows buildout and steepens the warming curve. All assumptions are listed in the Scenario view.',
  geography:
    'Map geometry comes from Natural Earth, via the world-atlas package (BSD-3 licence). Natural Earth data is public domain. Boundaries are simplified and show de facto control; they imply no position on disputed territory.',
  gaps:
    'Infrastructure nodes carry only the indicators that mean something for that kind of asset; missing indicators are marked, never interpolated. If a metric is not modelled for a place, the app says so.',
  privacy:
    'Worldline has no account, no analytics and no network calls. Your layer, horizon, scenario and bookmarks stay in this browser’s local storage, and the app works normally if storage is unavailable.',
} as const;

/** The one field note. Editorial: a pattern on the map, a chart, a plain reading. */
export const FIELD_NOTE = {
  kicker: 'Field note No. 1',
  title: 'Where heat and thirst arrive together',
  standfirst:
    'Switch the map to Climate and the hot spots sit in deserts. Switch to Water and they are the same places. That overlap is not a coincidence; it is the century’s compounding problem, and the atlas has a name for it: the dry-belt squeeze.',
  body: [
    'Set both layers side by side and a belt emerges: Phoenix, Dubai, Cairo, Lima, Cape Town, Santiago and Tashkent all sit in the top two water-stress bins, and the same names dominate the heat ranking. The pattern holds in 2026 and tightens by 2050, because the two curves feed each other: hotter days push up cooling and irrigation demand exactly when reservoirs and snowpack shrink.',
    'The chart below plots every city in the atlas on both axes at the current horizon and scenario. The upper-right quadrant is the squeeze: high stress, high heat. Watch who slides deeper into it under Strained transition, and how far reuse, efficiency and canopy can hold the line under Accelerate and electrify.',
    'The honest reading: the dry belt does not lack engineering options. It lacks time. Reuse, canopy, tariff design and storage are all proven; the field note is that they are being deployed slowest exactly where the squeeze is tightest.',
  ],
  takeaway:
    'In the dry belt, water stress and extreme heat compound: each makes the other more expensive to manage.',
} as const;

export const SCENARIOS_EDITORIAL: Record<
  string,
  { kicker: string; lede: string }
> = {
  momentum: {
    kicker: 'Scenario A',
    lede: 'The world keeps doing what it did in 2025, at roughly the same speed. Buildout continues, stress tracks demand, and heat accumulates on the current trajectory.',
  },
  accelerate: {
    kicker: 'Scenario B',
    lede: 'Permitting, capital and policy push every system faster. The physical ceilings stay the same; the speed of approach to them does not.',
  },
  strained: {
    kicker: 'Scenario C',
    lede: 'Buildout slips and the warming curve steepens. This is the stress-test scenario: it shows what the same places look like when systems do more with less.',
  },
};

export const UI_COPY = {
  firstRunHint:
    'Select any place on the map, or press ⌘K (Ctrl+K) to search. Switch layers above the map and horizons beside them.',
  noResults: 'No places match that search. Try a city, country or system name like “canal”.',
  emptyBookmarks: 'No bookmarks yet. Open any place and star it to file it here.',
  emptyConnections: 'No modelled system links from this place.',
  comparePrompt: 'Pick a second place to compare. Your layer and horizon stay as they are.',
  missingMetric: 'Not modelled for this place.',
  resetDone: 'View reset.',
  storageWarning:
    'Browser storage is unavailable, so your preferences will not survive a reload. Everything else works.',
  illustrativeLabel: 'Illustrative modelled data',
} as const;
