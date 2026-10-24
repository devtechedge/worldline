import { PLACE_BY_ID, PLACES } from '../data/places';
import type { LayerId, Place } from '../data/types';

export interface Link {
  from: string;
  to: string;
  label: string;
  layer: LayerId;
}

/** One-directional place connections expanded into an undirected link list. */
export const LINKS: readonly Link[] = PLACES.flatMap((p) =>
  p.connections.map((c) => ({ from: p.id, to: c.to, label: c.label, layer: c.layer })),
);

const LINKS_BY_PLACE: ReadonlyMap<string, Link[]> = (() => {
  const map = new Map<string, Link[]>();
  const push = (placeId: string, link: Link) => {
    const list = map.get(placeId);
    if (list) list.push(link);
    else map.set(placeId, [link]);
  };
  for (const link of LINKS) {
    push(link.from, link);
    push(link.to, link);
  }
  return map;
})();

export function linksForPlace(placeId: string): Link[] {
  return LINKS_BY_PLACE.get(placeId) ?? [];
}

export const PLACE_IDS: ReadonlySet<string> = new Set(PLACE_BY_ID.keys());

/** Places sorted for stable, predictable Tab order: tier, then name. */
export const SORTED_PLACES: readonly Place[] = [...PLACES].sort(
  (a, b) => a.tier - b.tier || a.name.localeCompare(b.name),
);
