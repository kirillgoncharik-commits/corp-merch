# corp-merch.eu — production handoff

## Product

`corp-merch.eu` is a lead-generation website for corporate merchandise production and delivery across the European Union. It sells a managed service rather than a catalogue:

`brief → selection → sourcing → production → branding → quality control → packing → delivery`

Primary buyers are event, marketing, HR / People, DevRel / Community, office / operations and procurement teams. Priority experience includes iGaming, IT / SaaS, fintech and crypto without positioning the business as iGaming-only.

## Production identity

- Domain: `https://corp-merch.eu/`
- Canonical host: `corp-merch.eu`
- `www.corp-merch.eu`: permanent redirect to the apex host
- Cloudflare Worker: `corp-merch-eu`
- Parent brand: SWAGGY.agency
- Lead destination: `order@swaggy.agency`
- Repository: `kirillgoncharik-commits/corp-merch`

The visual system uses Graphite `#1D211F`, Petrol `#176B68`, Light Mint `#D8ECE7`, Warm White `#F6F4EE`, Near Black `#151817` and a restrained Coral `#FF6B52` accent.

## Architecture

- Node-based static build with no runtime framework
- Cloudflare Workers static assets
- Worker-owned `/api/lead`
- Content separated from layout in `src/content.mjs`
- Desktop/mobile WebP sources with intrinsic dimensions
- Generated sitemap, robots, canonical and JSON-LD
- Anti-regression production checks
- Preview protection at Worker response level

Production routes:

- `/`
- `/igaming-merchandise-europe/`
- `/api/lead`

Future service or event pages should be added only when they have a distinct search intent and useful, verified content. Do not generate city doorway pages.

## Deployment

GitHub Actions runs the following on `main`:

```bash
npm ci
npm run build
npm run check
npm run check:production
npx wrangler deploy
```

Deployment requires:

- repository secret `CLOUDFLARE_API_TOKEN`
- repository secret `CLOUDFLARE_ACCOUNT_ID`
- repository variable `GA4_MEASUREMENT_ID`

The production check fails if the dedicated GA4 ID is missing. The workflow skips deployment and prints a warning when the required production configuration is incomplete.

`npm run deploy:preview` uses the separate `wrangler.preview.jsonc` configuration and the Worker name `corp-merch-eu-preview`. It has no production routes or email binding, so it cannot change the public domain or deliver real leads. The form shows the explicit preview fallback to Telegram/email.

Current verified preview: `https://corp-merch-eu-preview.kg-758.workers.dev/`

## Domain and indexing

1. Add `corp-merch.eu` and `www.corp-merch.eu` to the intended Cloudflare zone.
2. Confirm the Worker custom-domain routes in `wrangler.jsonc`.
3. Verify the apex response is `200` and indexable.
4. Verify `www` returns a permanent redirect to the same path on the apex host.
5. Verify `https://corp-merch.eu/robots.txt` allows crawling and references the production sitemap.
6. Verify `https://corp-merch.eu/sitemap.xml` contains only production URLs.
7. Verify the `workers.dev` hostname returns `X-Robots-Tag: noindex, nofollow` and a fully disallowing robots file.

## Form delivery

The compact form submits JSON to `/api/lead`. Its four required fields are Name, Work email, Company and What do you need?. Event, city and deadline details can be included in the final field.

Worker controls:

- same-origin validation
- maximum request size
- field length normalization
- email validation
- honeypot
- form-age validation
- per-IP cooldown
- no-store responses
- server-side email delivery

Cloudflare configuration:

- Email binding: `LEAD_EMAIL`
- Destination: `order@swaggy.agency`
- Sender in code: `leads@corp-merch.eu`
- Reply-to: submitted work email

Production acceptance test:

1. Submit a real test lead from the public form.
2. Confirm it arrives at `order@swaggy.agency`.
3. Confirm Reply works to the submitted address.
4. Confirm a visible success state appears in the browser.
5. Confirm `form_submit` appears in GA4 DebugView without personal or brief data.
6. Confirm a rapid repeat receives the expected cooldown response.

## Analytics

Create a dedicated GA4 Web Stream for `https://corp-merch.eu`. Do not reuse the `merch.mt` Measurement ID.

Set its ID as the GitHub Actions variable `GA4_MEASUREMENT_ID`. The build injects it into a metadata hook; the client loads Google Analytics only on the apex or `www` production host. Preview and local environments keep the data layer available for debugging without loading GA4.

Primary conversion:

- `form_submit`

Secondary conversions and behavioural signals:

- `hero_cta_click`
- `header_cta_click`
- `form_start`
- `telegram_click`
- `email_click`
- `project_gallery_view`
- `event_cta_click`

Only controlled page context and fixed interface labels may be sent. Never send form names, emails, companies, event details or free-form brief content to GA4.

## Search Console

1. Create or reuse the domain property for `corp-merch.eu`.
2. Complete DNS verification.
3. Inspect `/` and `/igaming-merchandise-europe/` after production launch.
4. Submit `https://corp-merch.eu/sitemap.xml`.
5. Confirm the selected canonical matches the declared canonical.
6. Monitor Page indexing, Core Web Vitals and Enhancements.
7. Check that the workers.dev preview does not enter the index.

## Release checklist

- [ ] Dedicated GA4 stream created and variable configured
- [ ] Cloudflare API credentials configured in GitHub
- [ ] Email binding and sender/destination authorized
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] `npm run check:production` passes with the real GA4 ID
- [ ] Desktop and mobile visual QA completed
- [ ] Keyboard navigation and focus states checked
- [ ] Production lead submitted and received
- [ ] GA4 events verified without PII
- [ ] workers.dev preview confirmed noindex
- [ ] Apex domain connected and indexable
- [ ] `www` redirect confirmed
- [ ] Sitemap submitted in Search Console
- [ ] Canonical and structured data rechecked on the public URL

## Post-launch measurement

Review weekly for the first month:

- organic clicks and impressions by landing page and search intent
- form submissions and conversion rate by landing page
- CTA clicks to form starts and form submissions
- Telegram and email secondary conversions
- device split and Core Web Vitals
- crawl/indexing issues and canonical selection
- queries that justify a genuinely useful new service or event page

Do not expand page count based only on keyword volume. Add pages when the team can provide unique operational guidance, verified event facts and a clear conversion path.
