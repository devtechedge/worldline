import type { Bin, LayerDef, LayerId } from './types';

/**
 * Five system layers. Hues are distinct from the selection cobalt and from the
 * positive/negative signal colors. Ramps run light (low) to dark (high) and are
 * used for the primary metric's map bins.
 */
export const LAYERS: readonly LayerDef[] = [
  {
    id: 'energy',
    name: 'Energy',
    blurb: 'How power is generated, moved and balanced as load grows.',
    hue: '#b4690e',
    hueInk: '#7c4708',
    ramp: ['#f0d9ab', '#dfb56d', '#c98d38', '#a06215', '#6f3f0a'],
  },
  {
    id: 'water',
    name: 'Water',
    blurb: 'Supply, stress, losses and reuse across basins and cities.',
    hue: '#17798a',
    hueInk: '#0f5f6d',
    ramp: ['#d3e7e2', '#93c6c4', '#529fa2', '#2b7885', '#135565'],
  },
  {
    id: 'mobility',
    name: 'Mobility',
    blurb: 'How people and freight actually move through a place.',
    hue: '#6250b0',
    hueInk: '#4d3d92',
    ramp: ['#ddd6ee', '#b9aade', '#9078c4', '#6b55a6', '#4a3a82'],
  },
  {
    id: 'climate',
    name: 'Climate',
    blurb: 'Heat, flood exposure and what places are doing about it.',
    hue: '#b0471e',
    hueInk: '#8f3a18',
    ramp: ['#f2e0c9', '#e5b78e', '#d4885a', '#b25c35', '#84371d'],
  },
  {
    id: 'connectivity',
    name: 'Connectivity',
    blurb: 'Bands, fibres, resilience and what access actually costs.',
    hue: '#9c4373',
    hueInk: '#7d3560',
    ramp: ['#ecd9e5', '#d5a9c6', '#b47aa5', '#914f83', '#6c3360'],
  },
];

export const LAYER_BY_ID: Readonly<Record<LayerId, LayerDef>> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l]),
) as Readonly<Record<LayerId, LayerDef>>;

export const LAYER_ORDER: readonly LayerId[] = LAYERS.map((l) => l.id);

/**
 * Legend bins for each layer's primary metric. Bins are authored with round,
 * honest cut points; the last bin is open-ended.
 */
export const PRIMARY_BINS: Readonly<Record<LayerId, readonly Bin[]>> = {
  // Low-carbon electricity share (%). Dark = cleaner.
  energy: [
    { upTo: 25, label: 'Under 25%' },
    { upTo: 50, label: '25–50%' },
    { upTo: 70, label: '50–70%' },
    { upTo: 85, label: '70–85%' },
    { upTo: Infinity, label: '85% and over' },
  ],
  // Water stress (0–1). Dark = more stressed.
  water: [
    { upTo: 0.3, label: 'Low, under 0.30' },
    { upTo: 0.5, label: '0.30–0.50' },
    { upTo: 0.7, label: '0.50–0.70' },
    { upTo: 0.85, label: '0.70–0.85' },
    { upTo: Infinity, label: 'Extreme, 0.85+' },
  ],
  // Public & shared transport share of trips (%). Dark = more transit.
  mobility: [
    { upTo: 15, label: 'Under 15%' },
    { upTo: 25, label: '15–25%' },
    { upTo: 35, label: '25–35%' },
    { upTo: 45, label: '35–45%' },
    { upTo: Infinity, label: '45% and over' },
  ],
  // Extreme heat days per year. Dark = hotter.
  climate: [
    { upTo: 10, label: 'Under 10 days' },
    { upTo: 25, label: '10–25 days' },
    { upTo: 45, label: '25–45 days' },
    { upTo: 80, label: '45–80 days' },
    { upTo: Infinity, label: '80 days and over' },
  ],
  // Median fixed broadband (Mbps). Dark = faster.
  connectivity: [
    { upTo: 75, label: 'Under 75 Mbps' },
    { upTo: 150, label: '75–150 Mbps' },
    { upTo: 250, label: '150–250 Mbps' },
    { upTo: 400, label: '250–400 Mbps' },
    { upTo: Infinity, label: '400 Mbps and over' },
  ],
};
