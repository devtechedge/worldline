# Security Policy

Worldline is a fully client-side application. It ships no backend, no database, no accounts and no credentials, and it makes no network requests at runtime. This policy describes what an attacker can and cannot do against the shipped artifact, and how to report anything that contradicts it.

## Threat model

- Runtime surface: the app is a set of static assets (HTML, JavaScript, SVG, self-hosted fonts). All content is bundled at build time from the repository's own data files. There are no third-party runtime endpoints, no analytics, and no remote fonts.
- Script injection / XSS: the only user-controlled input is browser-local state (theme preference and persisted view state), rendered through React text nodes, never as HTML. The codebase contains no `dangerouslySetInnerHTML`, no `eval` or `new Function`, and no `innerHTML` assignments. Any change that introduces one of these should be treated as high risk.
- Secrets: none exist at runtime. The repository has no environment variables and no server functions. Commit history must never contain tokens.
- Supply chain: dependencies are pinned through `package-lock.json` and monitored by Dependabot on a weekly schedule. Review dependency updates before merging.
- Data integrity: all figures are illustrative and deterministic and never leave the browser.

## Reporting

If you find something that breaks the above (an unexpected network call, injected markup, or a secret in history), open a private security advisory through the repository's Security tab. Include the artifact version and reproduction steps. No bug bounty program is offered.
