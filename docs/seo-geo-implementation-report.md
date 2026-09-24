# corp-merch.eu — SEO and GEO implementation report

## Executive summary

The site is designed as an SEO-first service website for European B2B demand, not as an ecommerce catalogue. Its central proposition is factual and repeated in visible copy:

> One supplier for corporate merchandise produced in the EU and delivered across the European Union.

The homepage covers broad corporate merchandise, event merchandise, gifts, apparel, promotional products, printing, POSM and welcome-kit intent. The first focused landing page covers iGaming merchandise across Europe without making the whole brand iGaming-only.

## Search intent model

### Primary homepage cluster

- corporate merchandise Europe
- corporate merch Europe
- branded merchandise Europe
- event merchandise Europe
- conference merchandise Europe
- promotional products Europe
- corporate gifts Europe / EU
- merchandise supplier EU

### Supporting service intent

- conference giveaways Europe
- branded apparel Europe
- employee welcome kits Europe
- POSM production Europe
- printing for exhibitions Europe
- direct conference venue delivery
- multi-office merchandise delivery

### Vertical intent

- iGaming merchandise Europe
- iGaming conference merchandise
- iGaming giveaways and team apparel

These topics appear in user-facing headings, body copy, FAQ answers and service definitions. They are not hidden only in structured data and are written as natural explanations rather than repeated keyword strings.

## Page map

### `/`

Purpose: explain the complete European service and convert broad corporate, event and team-merchandise demand.

Production H1:

`Corporate Merch Production & Delivery Across Europe`

Core H2 topics:

- Corporate merchandise produced in Europe
- Merch for conferences, offices and teams
- Produce once. Deliver where your team needs it.
- Real merchandise for real events
- Planning merch for an upcoming European conference?
- From brief to delivery
- Frequently asked questions

### `/igaming-merchandise-europe/`

Purpose: satisfy a distinct vertical intent with sector-relevant service copy, delivery language, production flow and FAQ.

Production H1:

`iGaming Merchandise Production Across Europe`

The page does not claim that showcased clients belong to the iGaming sector and does not claim official supplier status for any conference.

## GEO / AI Search coverage

The visible copy and FAQ provide short, extractable answers to likely generative-search questions:

### What does corp-merch.eu do?

It coordinates selection, sourcing, production, branding, quality control, packing and delivery of corporate merchandise, event giveaways, gifts, apparel, printing, POSM and welcome kits.

### Who is behind corp-merch.eu?

The footer, schema and contact surfaces identify it as a project by SWAGGY.agency.

### Where are products produced?

The site states that EU-focused orders are sourced, branded and produced within the European Union.

### Where can orders be delivered?

The site names offices, hotels, conference venues, booths and other agreed event locations across EU destinations.

### Can an order cover several European offices?

The FAQ explicitly confirms coordinated packing and delivery to multiple agreed EU office locations.

### Do intra-EU orders require import customs clearance?

The site uses the qualified statement that standard intra-EU deliveries normally do not require import customs clearance. It separately states that the UK, Switzerland, Serbia, the UAE and other non-EU destinations follow different rules.

### How early should conference merchandise be ordered?

The FAQ recommends at least three to four weeks for good product choice and approval time, while clearly noting that custom work, volume and multi-location delivery may need longer and urgent jobs are assessed case by case.

### Can delivery go to a hotel or conference venue?

Dedicated FAQ answers confirm this, subject to receiving contacts, access rules and delivery windows.

## Structured data

Every indexable page includes one JSON-LD graph containing:

- `Organization`
- `WebSite`
- `WebPage`
- `Service`
- `FAQPage`

The service provider is the site organization with SWAGGY.agency as the parent organization. `areaServed` is the European Union. Only known facts are present; legal company name, street address, telephone, logo, profiles and other unconfirmed attributes are intentionally omitted.

FAQ schema is generated from the same content objects that render the visible FAQ, preventing divergence between schema and page copy.

## Technical SEO

- one H1 per indexable page
- unique titles and descriptions
- self-referencing production canonicals
- production-only sitemap URLs
- production robots file with sitemap reference
- custom 404 page marked noindex
- semantic sections, headings, lists, links and form controls
- descriptive alt text based on visible image content
- width and height on all project images
- desktop and mobile WebP variants
- preload and `fetchpriority="high"` for the hero image
- lazy loading below the fold
- limited, dependency-free client JavaScript
- hashed CSS/JS query versions
- immutable asset caching and revalidated HTML
- CSP, referrer, permissions, MIME-sniffing and frame headers

## Preview indexing controls

The Cloudflare Worker detects every `*.workers.dev` request and:

- returns a fully disallowing preview `robots.txt`
- attaches `X-Robots-Tag: noindex, nofollow` to every preview response
- applies `Cache-Control: no-store`

Production pages do not include a noindex meta tag. Their canonical stays on `https://corp-merch.eu/`, including when the same build is viewed on preview.

## Canonical and redirect policy

- Primary origin: `https://corp-merch.eu`
- Homepage canonical: `https://corp-merch.eu/`
- Vertical canonical: `https://corp-merch.eu/igaming-merchandise-europe/`
- `http` is redirected to `https`
- `www.corp-merch.eu` is redirected permanently to the apex while preserving path and query

## Image implementation

Six unique supplied projects are used:

- IPONWEB conference merchandise — homepage and vertical hero priority
- Fluence branded event socks
- Robo Quest gaming merchandise
- inDrive employee welcome kit
- holiday corporate gift box
- Eschatology Entertainment branded apparel set

The duplicate Robo Quest upload is excluded. Every source has a descriptive filename and a smaller mobile WebP derivative. Gallery captions state only the client and observable project type; quantities, budgets, timelines and unverified campaign claims are not invented.

## Conversion implementation

Primary CTA: `Get a Merch Proposal`

Secondary CTA: `Send Your Brief`

The form requests:

- Name
- Work email
- Company
- What do you need? (including products, quantity, city and deadline where known)

The server-side endpoint validates the request and delivers it to `order@swaggy.agency`. Telegram and email links remain secondary conversion routes.

## Analytics plan

The client provides a dedicated GA4 configuration hook through `GA4_MEASUREMENT_ID`. The ID must belong to a separate `corp-merch.eu` stream; the old `merch.mt` ID is rejected by checks.

Events:

- `hero_cta_click`
- `header_cta_click`
- `form_start`
- `form_submit`
- `telegram_click`
- `email_click`
- `project_gallery_view`
- `event_cta_click`

The implementation never sends names, email addresses, company names, event details or free-form briefs as analytics parameters.

## Event-page strategy

Future event pages may use routes such as `/events/ice-barcelona-2027/`, but only after the event name, dates, city and venue are verified against the official event website immediately before publication.

Each event page should contain:

- verified event name, dates and location
- recommended ordering window tied to product complexity
- relevant giveaway, apparel and gift scenarios
- direct venue/hotel delivery explanation
- deadline-oriented production flow
- a relevant real project
- a dedicated lead form and event CTA
- the disclaimer that corp-merch.eu and SWAGGY are not official event suppliers or partners unless explicitly stated

Do not generate pages for unverified events, reuse thin text across many cities or mix non-EU destinations into the intra-EU customs proposition.

## Planned service-page expansion

Add only when unique, useful content is available:

- `/conference-merchandise-europe/`
- `/corporate-gifts-europe/`
- `/welcome-kits-europe/`
- `/events/`

The current content/layout split allows these pages to use the same production shell, schema and conversion components without restructuring the project.

## Search Console readiness

After the production domain resolves:

1. verify the domain property via DNS
2. inspect the homepage and iGaming page
3. submit `/sitemap.xml`
4. validate canonical selection
5. monitor indexing, rich-result enhancements and Core Web Vitals
6. confirm preview URLs remain excluded

## Post-launch measurement

Track organic impressions, clicks, landing-page conversions, form-start-to-submit rate, direct-contact clicks, Core Web Vitals and query clusters. Prioritize content additions only where search demand aligns with a useful service or verified event-planning answer.

The first 30 days should establish baselines; later decisions should use both Search Console query evidence and lead quality, not traffic volume alone.
