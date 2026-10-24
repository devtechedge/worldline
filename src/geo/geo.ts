import { geoGraticule10, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { FeatureCollection, Geometry, MultiLineString } from 'geojson';
import topoRaw from 'world-atlas/countries-110m.json';

/**
 * Bundled geography. Derived from Natural Earth 1:110m via the world-atlas
 * package (BSD-3). Natural Earth is public domain. Simplified coastlines and
 * de facto boundaries; they imply no position on disputed territory.
 */

interface RawTopology {
  objects: { countries: Parameters<typeof feature>[1] };
  arcs: unknown;
  transform: { scale: [number, number]; translate: [number, number] };
}

const topology = topoRaw as unknown as RawTopology;

export interface GeoBundle {
  countries: FeatureCollection<Geometry>;
  /** Interior country borders as a single MultiLineString mesh. */
  borders: MultiLineString;
  graticule: MultiLineString;
}

let bundle: GeoBundle | null = null;

export function getGeoBundle(): GeoBundle {
  if (!bundle) {
    const countries = feature(
      topology as unknown as Parameters<typeof feature>[0],
      topology.objects.countries,
    ) as FeatureCollection<Geometry>;
    const borders = mesh(
      topology as unknown as Parameters<typeof feature>[0],
      topology.objects.countries as never,
      (a, b) => a !== b,
    ) as unknown as MultiLineString;
    bundle = { countries, borders, graticule: geoGraticule10() };
  }
  return bundle;
}

export function createProjection(width: number, height: number): GeoProjection {
  return geoNaturalEarth1().fitExtent(
    [
      [4, 4],
      [width - 4, height - 4],
    ],
    { type: 'Sphere' },
  );
}

export function geoPathStrings(width: number, height: number): {
  land: string;
  borders: string;
  graticule: string;
} {
  const projection = createProjection(width, height);
  const path = geoPath(projection);
  const geo = getGeoBundle();
  return {
    land: path(geo.countries) ?? '',
    borders: path(geo.borders) ?? '',
    graticule: path(geo.graticule) ?? '',
  };
}
