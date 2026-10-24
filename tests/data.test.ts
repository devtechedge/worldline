import { describe, expect, it } from 'vitest';
import { METRICS, METRIC_BY_ID } from '../src/data/metrics';
import { LAYERS, LAYER_ORDER, PRIMARY_BINS } from '../src/data/layers';
import { PLACES, PLACE_BY_ID, getPlace } from '../src/data/places';
import { LINKS } from '../src/data/links';
import {
  ARCHETYPES,
  binIndexFor,
  delta,
  displayValue,
  HORIZON_YEARS,
  modelValue,
  primaryMetricFor,
  SCENARIO_BY_ID,
  SCENARIOS,
  series,
} from '../src/data/model';

describe('metric definitions', () => {
  it('covers every layer with exactly one primary metric', () => {
    for (const layer of LAYER_ORDER) {
      const defs = METRICS.filter((m) => m.layer === layer);
      expect(defs.length).toBe(4);
      expect(defs.filter((m) => m.primary).length).toBe(1);
      expect(primaryMetricFor(layer).layer).toBe(layer);
    }
  });

  it('has sane bounds and units', () => {
    for (const m of METRICS) {
      expect(m.min).toBeLessThan(m.max);
      expect(m.unitShort.length).toBeGreaterThan(0);
      expect(m.unitFull.length).toBeGreaterThan(0);
      expect(m.explain.length).toBeGreaterThan(20);
      expect(['upGood', 'downGood', 'neutral']).toContain(m.direction);
    }
  });

  it('gives infrastructure kinds alternative labels where readings differ', () => {
    expect(METRIC_BY_ID.demandIndex.kindLabels?.corridor).toBeTruthy();
    expect(METRIC_BY_ID.outageHours.kindLabels?.corridor).toBeTruthy();
  });
});

describe('layers and legend bins', () => {
  it('defines five sequential ramp colors per layer', () => {
    for (const layer of LAYERS) {
      expect(layer.ramp).toHaveLength(5);
      for (const color of layer.ramp) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('defines five ordered bins per layer', () => {
    for (const layer of LAYER_ORDER) {
      const bins = PRIMARY_BINS[layer];
      expect(bins).toHaveLength(5);
      for (let i = 1; i < bins.length; i += 1) {
        expect(bins[i].upTo).toBeGreaterThan(bins[i - 1].upTo);
      }
    }
  });

  it('binIndexFor maps values into ordered bins', () => {
    expect(binIndexFor('energy', 10)).toBe(0);
    expect(binIndexFor('energy', 40)).toBe(1);
    expect(binIndexFor('energy', 99)).toBe(4);
    expect(binIndexFor('water', 0.95)).toBe(4);
  });
});

describe('places', () => {
  it('has unique ids and coordinates in range', () => {
    const ids = new Set<string>();
    for (const p of PLACES) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.lon).toBeGreaterThanOrEqual(-180);
      expect(p.lon).toBeLessThanOrEqual(180);
      expect(p.lat).toBeGreaterThanOrEqual(-60);
      expect(p.lat).toBeLessThanOrEqual(75);
      expect(['city', 'port', 'grid', 'corridor', 'dam']).toContain(p.kind);
    }
    expect(PLACES.length).toBeGreaterThanOrEqual(30);
  });

  it('has editorial copy for every place', () => {
    for (const p of PLACES) {
      expect(p.context.length).toBeGreaterThan(40);
      expect(p.whyItMatters.length).toBeGreaterThan(40);
      expect(p.risks.length).toBeGreaterThanOrEqual(2);
      expect(p.opportunities.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('resolves lookups and connections', () => {
    expect(getPlace('rotterdam')?.name).toBe('Rotterdam');
    expect(getPlace('nonexistent')).toBeUndefined();
    expect(PLACE_BY_ID.size).toBe(PLACES.length);
    for (const link of LINKS) {
      expect(getPlace(link.from), link.from).toBeDefined();
      expect(getPlace(link.to), link.to).toBeDefined();
    }
  });

  it('city places author the five headline metrics', () => {
    for (const p of PLACES) {
      if (p.kind !== 'city' && p.kind !== 'port') continue;
      for (const id of ['cleanPowerShare', 'waterStress', 'transitShare', 'heatDays', 'broadband'] as const) {
        expect(p.base[id], `${p.id} missing ${id}`).toBeDefined();
      }
    }
  });
});

describe('deterministic model', () => {
  it('returns the 2026 baseline unchanged', () => {
    const rotterdam = getPlace('rotterdam');
    expect(rotterdam).toBeDefined();
    const v = modelValue(rotterdam!, 'cleanPowerShare', 2026, 'momentum');
    expect(v).toBe(rotterdam!.base.cleanPowerShare);
  });

  it('produces identical values for repeated calls (no randomness)', () => {
    const place = getPlace('lagos')!;
    const a = modelValue(place, 'broadband', 2050, 'accelerate');
    const b = modelValue(place, 'broadband', 2050, 'accelerate');
    expect(a).toBe(b);
  });

  it('moves monotonically toward scenario direction for share metrics', () => {
    const place = getPlace('lagos')!;
    const s = series(place, 'broadband', 'momentum');
    for (let i = 1; i < s.length; i += 1) {
      expect(s[i].value).toBeGreaterThanOrEqual(s[i - 1].value!);
    }
  });

  it('accelerate reaches cleaner grids than momentum by 2050', () => {
    const place = getPlace('mumbai')!;
    const momentum = modelValue(place, 'cleanPowerShare', 2050, 'momentum');
    const accelerate = modelValue(place, 'cleanPowerShare', 2050, 'accelerate');
    const strained = modelValue(place, 'cleanPowerShare', 2050, 'strained');
    expect(accelerate).toBeGreaterThan(momentum!);
    expect(strained).toBeLessThan(momentum!);
  });

  it('strained means more heat days, accelerate the same as momentum', () => {
    const place = getPlace('phoenix')!;
    const momentum = modelValue(place, 'heatDays', 2050, 'momentum');
    const accelerate = modelValue(place, 'heatDays', 2050, 'accelerate');
    const strained = modelValue(place, 'heatDays', 2050, 'strained');
    expect(accelerate).toBeCloseTo(momentum!, 6);
    expect(strained).toBeGreaterThan(momentum!);
  });

  it('never leaves metric bounds', () => {
    for (const p of PLACES) {
      for (const m of METRICS) {
        for (const y of HORIZON_YEARS) {
          for (const s of SCENARIOS) {
            const v = modelValue(p, m.id, y, s.id);
            if (v === null) continue;
            expect(v).toBeGreaterThanOrEqual(m.min);
            expect(v).toBeLessThanOrEqual(m.max);
          }
        }
      }
    }
  });

  it('marks unmodelled infrastructure indicators as null', () => {
    const suez = getPlace('suez')!;
    expect(modelValue(suez, 'transitShare', 2050, 'momentum')).toBeNull();
    expect(modelValue(suez, 'demandIndex', 2050, 'momentum')).not.toBeNull();
    const gerd = getPlace('gerd')!;
    expect(modelValue(gerd, 'waterStress', 2050, 'momentum')).toBeNull();
  });

  it('displayValue rounds to the metric decimals', () => {
    const place = getPlace('cairo')!;
    expect(displayValue(place, 'waterStress', 2050, 'momentum')).toBeCloseTo(
      modelValue(place, 'waterStress', 2050, 'momentum')!,
      2,
    );
  });

  it('delta text uses sign, unit and sentiment from metric direction', () => {
    const place = getPlace('oslo')!;
    const d = delta(place, 'evShare', 2026, 2050, 'momentum');
    expect(d.text).toMatch(/^\+/);
    expect(d.sentiment).toBe('good');
    const carbon = delta(place, 'gridCarbon', 2026, 2050, 'momentum');
    expect(carbon.text).toMatch(/^−/);
    expect(carbon.sentiment).toBe('good');
  });

  it('scenario catalogue is complete and internally consistent', () => {
    expect(SCENARIOS).toHaveLength(3);
    for (const s of SCENARIOS) {
      expect(SCENARIO_BY_ID[s.id]).toBe(s);
      expect(s.assumptions.length).toBeGreaterThanOrEqual(3);
      for (const metric of Object.keys(s.scale)) {
        expect(METRIC_BY_ID[metric as keyof typeof METRIC_BY_ID]).toBeDefined();
      }
    }
  });

  it('archetypes define rules for every metric they baseline', () => {
    for (const archetype of Object.values(ARCHETYPES)) {
      for (const metricId of Object.keys(archetype.base)) {
        expect(archetype.rules[metricId as keyof typeof archetype.rules], metricId).toBeDefined();
      }
    }
  });
});
