# Licences & provenance

Everything bundled in Worldline is either original to this repository or carries the licence below. The app makes **no network calls at runtime**; all data and assets ship with the build.

## Map geography

- **Source dataset:** [Natural Earth](https://www.naturalearthdata.com/) 1:110m Admin 0 countries. Natural Earth data is in the **public domain** (no rights reserved).
- **Packaging:** [`world-atlas`](https://github.com/topojson/world-atlas) v2 (BSD-3-Clause), which republishes Natural Earth as TopoJSON. Bundled file: `countries-110m.json`.
- **Rendering:** [`d3-geo`](https://github.com/d3/d3-geo) v3 (ISC) for the Natural Earth I projection and path generation; [`topojson-client`](https://github.com/topojson/topojson-client) v3 (ISC) for TopoJSON decoding.
- **Editorial note:** boundaries are simplified and show de facto control as of the Natural Earth release; they imply no position on disputed territory. This statement is repeated in the app's methodology panel.

## Type

- **Newsreader** (display serif): SIL Open Font License 1.1, bundled as subset woff2 via [`@fontsource-variable/newsreader`](https://github.com/fontsource/fontsource) (variable font).
- **Archivo** (UI sans): SIL Open Font License 1.1, bundled as subset woff2 via [`@fontsource-variable/archivo`](https://github.com/fontsource/fontsource).

Both are served locally from the build output; no font CDN.

## Everything else

- All remaining code, copy, data values, the field note and the design system are original to this repository.
- Data values are **illustrative modelled figures**, calibrated to feel plausible against publicly reported ranges; the methodology panel in the app is the authoritative statement of what they can and cannot be used for. They are not copies of any statistical agency's dataset.
- Favicons and the social card (`public/favicon.svg`, `public/og-card.png`) are original artwork generated for this project (the card is rendered from `scripts/og-card.html`).
