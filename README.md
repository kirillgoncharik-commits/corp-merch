# corp-merch.eu

SEO-first lead-generation website for European companies that need corporate merchandise, event giveaways, gifts, printing, POSM, branded apparel or welcome kits produced and delivered across the EU.

The project is derived from the proven `merch.mt` architecture but has its own positioning, content, petrol/graphite visual identity, SEO semantics, analytics configuration and Cloudflare deployment.

## Production routes

- `/` — corporate merchandise and EU delivery homepage
- `/igaming-merchandise-europe/` — focused iGaming service page
- `/api/lead` — validated lead form handled by the Cloudflare Worker
- `/robots.txt` and `/sitemap.xml` — generated production crawl controls

The structure in `scripts/build.mjs` supports adding intent-led service and event pages without generating doorway city pages.

## Project structure

- `src/content.mjs` — positioning, service categories, projects, FAQ and contact details
- `src/styles.css` — responsive petrol/graphite production design system
- `src/script.js` — navigation, privacy-safe analytics events and lead form states
- `src/assets/images` — optimized desktop/mobile WebP project photography
- `src/_worker.js` — Cloudflare Worker for canonical redirects, preview noindex and lead delivery
- `scripts/build.mjs` — dependency-free static build and metadata/schema generation
- `scripts/check.mjs` — production anti-regression, SEO, asset and Cloudflare checks
- `docs/HANDOFF.md` — production launch and operations checklist
- `docs/seo-geo-implementation-report.md` — SEO/GEO coverage and growth plan
- `dist/` — generated deployable output

## Local development

```bash
npm ci
npm run build
npm run check
npm run dev
```

`npm run check` validates the implementation and may warn while the dedicated GA4 stream is not configured. For the final release, provide the new stream ID and run the strict check:

```bash
GA4_MEASUREMENT_ID=G-XXXXXXXXXX npm run build
GA4_MEASUREMENT_ID=G-XXXXXXXXXX npm run check:production
```

The old `merch.mt` measurement ID is explicitly rejected by the anti-regression checks.

## Lead delivery

The form posts to `/api/lead`. The Worker validates the payload, checks the request origin, uses a honeypot and form-age check, applies a lightweight per-IP cooldown and sends the enquiry through the `LEAD_EMAIL` Cloudflare Email Service binding.

- Destination: `order@swaggy.agency`
- Sender configured in code: `leads@corp-merch.eu`
- Binding: `LEAD_EMAIL`

Cloudflare must authorize the destination and sender before the end-to-end production test.

## Analytics

Create a separate GA4 web stream for `corp-merch.eu` and expose its Measurement ID as the GitHub Actions variable `GA4_MEASUREMENT_ID`. Do not reuse the `merch.mt` stream.

Implemented events:

- `hero_cta_click`
- `header_cta_click`
- `form_start`
- `form_submit` — primary conversion
- `telegram_click`
- `email_click`
- `project_gallery_view`
- `event_cta_click`

Free-form brief text, email addresses, names, company names and event details are never sent to GA4.

## Cloudflare deployment

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required GitHub Actions variable:

- `GA4_MEASUREMENT_ID`

The workflow builds and checks every push to `main`. It deploys only when both Cloudflare credentials and the dedicated GA4 ID are present. The production Worker serves `corp-merch.eu` and permanently redirects `www.corp-merch.eu` to the apex domain.

Every `*.workers.dev` response receives `X-Robots-Tag: noindex, nofollow`; its `robots.txt` disallows crawling. Production remains indexable and canonical to `https://corp-merch.eu/`.

For a form-disabled, noindex Cloudflare preview that cannot touch the production custom domains:

```bash
npm run deploy:preview
```

This uses `wrangler.preview.jsonc` and the separate Worker name `corp-merch-eu-preview`.

Current noindex preview: [corp-merch-eu-preview.kg-758.workers.dev](https://corp-merch-eu-preview.kg-758.workers.dev/)

## Release gate

Before connecting the production domain:

1. Create the dedicated GA4 stream and configure `GA4_MEASUREMENT_ID`.
2. Authorize Cloudflare Email Routing / Email Service for `order@swaggy.agency` and `leads@corp-merch.eu`.
3. Add the Cloudflare repository secrets and run the production workflow.
4. Test one real lead end to end and confirm the reply-to address.
5. Confirm the workers.dev preview is blocked from indexing.
6. Connect the apex and `www` domains; verify the permanent redirect.
7. Verify Search Console ownership and submit `https://corp-merch.eu/sitemap.xml`.
8. Check GA4 DebugView without sending form data as event parameters.

See `docs/HANDOFF.md` for the full production checklist.
