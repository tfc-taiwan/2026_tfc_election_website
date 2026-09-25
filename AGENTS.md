# Project architecture (2026 election hub)

Follow [docs/architecture.md](docs/architecture.md) for every task in this repository.

- Production canonical URLs live at `https://tfc-taiwan.org.tw/election2026/`. Never assume this project owns the domain root.
- Deploy the pre-rendered site and its JSON/image assets as one Cloudflare Worker with Static Assets. Route only `/election2026` and `/election2026/*` on the existing proxied TFC zone; keep the browser on the TFC URL. Do not add a redirect to a `workers.dev` hostname.
- `data/listings.json` is the sole source for home/listing composition. Each article is `data/reports/<slug>.json`. Do not embed editorial copy in React or the Worker.
- Build/publish every content revision before expecting it on Cloudflare; static assets cannot read the local `data/` directory at request time. Preserve pre-rendered HTML and per-page SEO.
- Search forms submit with `GET` and the `s` parameter to `https://tfc-taiwan.org.tw/`, the main site's existing search form. Local category filters remain local.
- Current mock data must stay visibly identified and `noindex` until actual editorial content is approved. Do not deploy to production without a separate explicit request.
