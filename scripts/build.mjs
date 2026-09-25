import { cp, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  benefits,
  categories,
  faqs,
  featuredEvents,
  gallery,
  igamingPage,
  industries,
  otherEvents,
  site,
  steps,
  useCases
} from "../src/content.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist");
const [stylesSource, scriptSource] = await Promise.all([
  readFile(path.join(projectRoot, "src/styles.css")),
  readFile(path.join(projectRoot, "src/script.js"))
]);
const assetVersion = createHash("sha256")
  .update(stylesSource)
  .update(scriptSource)
  .digest("hex")
  .slice(0, 10);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cleanOutput = (value) => value.replace(/[ \t]+$/gm, "");

const imageUrl = (name) => `/assets/images/${name}.webp`;
const socialPreviewImage = `${site.url}/assets/images/og-swaggy-corporate-merch-europe-social-v1.jpg`;

const picture = ({ item, eager = false, className = "" }) => `
  <picture class="${className}">
    <source media="(max-width: 700px)" srcset="${imageUrl(item.mobileImage)}" width="${item.mobileWidth}" height="${item.mobileHeight}">
    <img src="${imageUrl(item.image)}" alt="${escapeHtml(item.alt)}" width="${item.width}" height="${item.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  </picture>`;

const brand = (homeHref = "/") => `
  <a class="brand" href="${homeHref}" aria-label="corp-merch.eu home">
    <span class="brand__mark" aria-hidden="true">CM</span>
    <span><strong>corp-merch.eu</strong><small>by SWAGGY</small></span>
  </a>`;

const header = ({ internal = false } = {}) => {
  const root = internal ? "/" : "";
  return `
  <header class="site-header" data-header>
    ${brand("/")}
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-menu" data-menu-toggle>
      <span></span><span></span><span></span><span class="sr-only">Open menu</span>
    </button>
    <nav class="main-nav" id="main-menu" aria-label="Main navigation" data-menu>
      <a href="${root}#services">Services</a>
      <a href="${root}#projects">Projects</a>
      <a href="${root}#events">Events</a>
      <a href="${root}#process">Process</a>
      <a class="button button--small button--mint" href="#brief" data-event="header_cta_click">Let's Make Merch</a>
    </nav>
  </header>`;
};

const proofList = (items) => `
  <ul class="proof-line" aria-label="Service highlights">
    ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
  </ul>`;

const leadForm = ({ context = "homepage" } = {}) => `
  <section class="brief-section" id="brief">
    <div class="brief-section__copy">
      <p class="eyebrow eyebrow--light"><span>Start a project</span></p>
      <h2>Tell us what you need and where it needs to be.</h2>
      <p>Share the essentials. We will come back with focused questions and a practical route to production.</p>
      <div class="direct-contact">
        <span>Prefer a direct message?</span>
        <a href="${site.telegramUrl}" target="_blank" rel="noopener" data-event="telegram_click" data-event-label="${context}">Telegram · ${site.telegramLabel}</a>
        <a href="mailto:${site.email}" data-event="email_click" data-event-label="${context}">${site.email}</a>
      </div>
    </div>
    <form class="lead-form" action="/api/lead" method="post" data-lead-form novalidate>
      <div class="lead-form__heading">
        <strong>Send your brief</strong>
        <span>Four fields. Usually under a minute.</span>
      </div>
      <div class="form-grid">
        <label>Name <span aria-hidden="true">*</span><input name="name" type="text" autocomplete="name" required maxlength="80" placeholder="Your name"></label>
        <label>Work email <span aria-hidden="true">*</span><input name="email" type="email" autocomplete="email" required maxlength="160" placeholder="you@company.com"></label>
        <label>Company <span aria-hidden="true">*</span><input name="company" type="text" autocomplete="organization" required maxlength="100" placeholder="Company name"></label>
        <label>What do you need? <span aria-hidden="true">*</span><textarea name="need" rows="3" required maxlength="2000" placeholder="Products, quantity, city and deadline"></textarea></label>
      </div>
      <label class="honeypot" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
      <input type="hidden" name="startedAt" value="" data-started-at>
      <input type="hidden" name="page" value="${context}">
      <label class="consent"><input type="checkbox" name="consent" required> <span>I agree to the <a href="${site.privacyUrl}" target="_blank" rel="noopener">processing of my personal data</a> for this enquiry.</span></label>
      <button class="button button--submit" type="submit" data-submit-button>Let's Make Merch <span aria-hidden="true">↗</span></button>
      <p class="form-status" role="status" aria-live="polite" data-form-status></p>
    </form>
  </section>`;

const footer = () => `
  <footer class="site-footer">
    <div>
      ${brand("/")}
      <p>Corporate merchandise produced in the EU and delivered across Europe.</p>
    </div>
    <div class="footer-links">
      <a href="${site.poweredByUrl}" target="_blank" rel="noopener">SWAGGY.agency</a>
      <a href="mailto:${site.email}">${site.email}</a>
      <a href="${site.telegramUrl}" target="_blank" rel="noopener">Telegram</a>
      <a href="${site.privacyUrl}" target="_blank" rel="noopener">Privacy</a>
    </div>
    <p class="footer-note">© ${new Date().getFullYear()} corp-merch.eu. Conference names belong to their respective owners.</p>
  </footer>`;

const faqMarkup = (items) => items.map((item) => `
  <details class="faq-item">
    <summary>${escapeHtml(item.question)}<span aria-hidden="true"></span></summary>
    <p>${escapeHtml(item.answer)}</p>
  </details>`).join("");

const categoryMarkup = categories.map((item) => `
  <article class="service-card">
    <span>${item.number}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <a href="#brief" data-event="service_cta_click" data-event-label="${escapeHtml(item.title)}">Discuss this project <span aria-hidden="true">↗</span></a>
  </article>`).join("");

const galleryMarkup = gallery.map((item) => `
  <figure class="project-card ${item.className}" data-gallery-item>
    ${picture({ item }).trim()}
    <figcaption><strong>${escapeHtml(item.client)}</strong><span>${escapeHtml(item.type)}</span></figcaption>
  </figure>`).join("");

const featuredEventsMarkup = featuredEvents.map((item, index) => `
  <a class="event-row" href="#brief" data-event="event_cta_click" data-event-label="${escapeHtml(item.name)}">
    <span>${String(index + 1).padStart(2, "0")}</span>
    <strong>${escapeHtml(item.name)}</strong>
    <em>${escapeHtml([item.date, item.location, item.website].filter(Boolean).join(" · "))}</em>
    <b aria-hidden="true">↗</b>
  </a>`).join("");

const otherEventsMarkup = otherEvents.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const stepsMarkup = steps.map(([number, title, description]) => `
  <li class="process-step">
    <span>${number}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(description)}</p>
  </li>`).join("");

const benefitsMarkup = benefits.map((item, index) => `
  <article class="benefit-card">
    <span>${String(index + 1).padStart(2, "0")}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
  </article>`).join("");

const organizationSchema = {
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: "corp-merch.eu",
  url: site.url,
  email: site.email,
  parentOrganization: {
    "@type": "Organization",
    name: "SWAGGY.agency",
    url: site.poweredByUrl
  }
};

const structuredData = ({ url, title, description, faqItems, serviceName, serviceTypes }) => ({
  "@context": "https://schema.org",
  "@graph": [
    organizationSchema,
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      publisher: { "@id": `${site.url}/#organization` },
      inLanguage: "en"
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      isPartOf: { "@id": `${site.url}/#website` },
      about: { "@id": `${url}#service` },
      inLanguage: "en"
    },
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: serviceName,
      description,
      provider: { "@id": `${site.url}/#organization` },
      areaServed: { "@type": "AdministrativeArea", name: "European Union" },
      serviceType: serviceTypes,
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Event, marketing, HR, DevRel, operations and procurement teams"
      }
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer }
      }))
    }
  ]
});

const documentShell = ({ title, description, canonical, schema, body, preloadImage }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#F6F4EE">
  <meta name="ga4-measurement-id" content="${escapeHtml(site.gaMeasurementId)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="corp-merch.eu">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${socialPreviewImage}">
  <meta property="og:image:secure_url" content="${socialPreviewImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="315">
  <meta property="og:image:alt" content="SWAGGY branded corporate merchandise prepared for a European event team">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${socialPreviewImage}">
  ${preloadImage ? `<link rel="preload" as="image" href="${imageUrl(preloadImage.image)}" imagesrcset="${imageUrl(preloadImage.mobileImage)} ${preloadImage.mobileWidth}w, ${imageUrl(preloadImage.image)} ${preloadImage.width}w" imagesizes="(max-width: 820px) 100vw, 50vw">` : ""}
  <link rel="stylesheet" href="/assets/styles.css?v=${assetVersion}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${body}
  <script src="/assets/script.js?v=${assetVersion}" defer></script>
</body>
</html>`;

const homepageSchema = structuredData({
  url: `${site.url}/`,
  title: site.title,
  description: site.description,
  faqItems: faqs,
  serviceName: "Corporate merchandise production and delivery across the European Union",
  serviceTypes: categories.map((item) => item.title)
});

const homepage = documentShell({
  title: site.title,
  description: site.description,
  canonical: `${site.url}/`,
  schema: homepageSchema,
  preloadImage: gallery[0],
  body: `
  <div class="hero-wrap">
    ${header()}
    <main id="main">
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow"><span>One supplier across the EU</span></p>
          <h1>Corporate Merch Production &amp; Delivery Across Europe</h1>
          <p class="hero__lead">Corporate merchandise, event giveaways, gifts, printing and POSM produced in Europe and delivered directly to your office, hotel or event venue.</p>
          <div class="hero__actions">
            <a class="button button--mint" href="#brief" data-event="hero_cta_click">Let's Make Merch <span aria-hidden="true">↗</span></a>
            <a class="text-link hero-secondary-link" href="#brief" data-event="hero_secondary_cta_click">Send Your Brief</a>
          </div>
          ${proofList(["EU production", "One point of contact", "Direct event delivery"])}
        </div>
        <div class="hero__visual">
          ${picture({ item: gallery[0], eager: true, className: "hero__picture" }).trim()}
          <div class="hero__caption"><span>Selected work</span><strong>IPONWEB · Conference merchandise</strong></div>
        </div>
      </section>

      <section class="flow-strip" aria-label="Our production flow">
        <span>Selection</span><i>→</i><span>Sourcing</span><i>→</i><span>Production</span><i>→</i><span>Branding</span><i>→</i><span>Quality control</span><i>→</i><span>Packing</span><i>→</i><span>Delivery</span>
      </section>

      <section class="section services-section" id="services">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow eyebrow--dark"><span>What we produce</span></p>
            <h2>Corporate merchandise produced in Europe</h2>
          </div>
          <p>Start with the business need, not a catalogue. We build the product mix around the audience, the destination and the date it has to be ready.</p>
        </div>
        <div class="service-grid">${categoryMarkup}</div>
      </section>

      <section class="section projects-section" id="projects" data-observe-event="project_gallery_view">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow eyebrow--dark"><span>Selected projects</span></p>
            <h2>Real merchandise for real teams</h2>
          </div>
          <p>Six completed projects across conference merchandise, textile, gaming, welcome kits, corporate gifts and apparel.</p>
        </div>
        <div class="project-grid">${galleryMarkup}</div>
      </section>

      <section class="events-section" id="events" data-observe-event="conference_section_view">
        <div class="events-section__heading">
          <div>
            <p class="eyebrow"><span>European conference circuit</span></p>
            <h2>Planning merch for a European event?</h2>
          </div>
          <p>Produce in the EU and deliver directly to the venue or hotel through one point of contact.</p>
        </div>
        <div class="event-list">${featuredEventsMarkup}</div>
        <div class="other-events">
          <span>Also supporting teams attending</span>
          <ul>${otherEventsMarkup}</ul>
        </div>
        <p class="events-disclaimer">Conference names are used to describe events our clients may attend. corp-merch.eu and SWAGGY are not presented as official suppliers or partners unless explicitly stated otherwise.</p>
      </section>

      <section class="section use-cases-section">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow eyebrow--dark"><span>Built around the job</span></p>
            <h2>Merch for conferences, offices and teams</h2>
          </div>
          <p>For international marketing, event, HR, People, DevRel, operations and procurement teams.</p>
        </div>
        <div class="use-case-grid">
          ${useCases.map(([title, description], index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></article>`).join("")}
        </div>
        <div class="industry-band">
          <div><span>Sector experience</span><strong>International B2B teams</strong></div>
          <ul>${industries.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <a href="${igamingPage.path}">Explore iGaming merchandise <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section class="section eu-section" id="delivery">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow eyebrow--dark"><span>European production &amp; delivery</span></p>
            <h2>One supplier across the EU</h2>
          </div>
          <div class="eu-section__copy">
            <p>Produce once and deliver directly to the office, hotel or venue — with one contact and one coordinated accounting flow.</p>
            <a class="button button--mint" href="#brief" data-event="delivery_cta_click">Let's Make Merch <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div class="benefit-grid">${benefitsMarkup}</div>
        <p class="customs-line"><strong>Standard intra-EU deliveries:</strong> import customs clearance is normally not required. Non-EU destinations follow different rules.</p>
      </section>

      <section class="section process-section" id="process">
        <div class="section-heading section-heading--split">
          <div>
            <p class="eyebrow eyebrow--dark"><span>How it works</span></p>
            <h2>From brief to delivery</h2>
          </div>
          <p>One accountable flow from the first shortlist to the handover at the agreed European destination.</p>
        </div>
        <ol class="process-list">${stepsMarkup}</ol>
      </section>

      <section class="section faq-section">
        <div class="faq-section__heading">
          <p class="eyebrow eyebrow--dark"><span>Practical answers</span></p>
          <h2>Frequently asked questions</h2>
          <p>Clear answers for planning, procurement and event delivery.</p>
        </div>
        <div class="faq-list">${faqMarkup(faqs)}</div>
      </section>

      ${leadForm()}
    </main>
    ${footer()}
  </div>
  <a class="mobile-sticky-cta" href="#brief" data-event="mobile_sticky_cta_click">Let's Make Merch</a>`
});

const igamingSchema = structuredData({
  url: `${site.url}${igamingPage.path}`,
  title: igamingPage.title,
  description: igamingPage.description,
  faqItems: igamingPage.faqs,
  serviceName: "iGaming merchandise production and delivery across Europe",
  serviceTypes: igamingPage.serviceTypes
});

const igamingGallery = gallery.slice(0, 3).map((item) => `
  <figure class="project-card ${item.className}">
    ${picture({ item }).trim()}
    <figcaption><strong>${escapeHtml(item.client)}</strong><span>${escapeHtml(item.type)}</span></figcaption>
  </figure>`).join("");

const igamingHtml = documentShell({
  title: igamingPage.title,
  description: igamingPage.description,
  canonical: `${site.url}${igamingPage.path}`,
  schema: igamingSchema,
  preloadImage: gallery[0],
  body: `
  <div class="hero-wrap">
    ${header({ internal: true })}
    <main id="main">
      <section class="hero hero--vertical">
        <div class="hero__copy">
          <p class="eyebrow"><span>${escapeHtml(igamingPage.eyebrow)}</span></p>
          <h1>${escapeHtml(igamingPage.h1)}</h1>
          <p class="hero__lead">${escapeHtml(igamingPage.lead)}</p>
          <div class="hero__actions">
            <a class="button button--mint" href="#brief" data-event="hero_cta_click">Let's Make Merch <span aria-hidden="true">↗</span></a>
            <a class="text-link hero-secondary-link" href="/#projects">See Selected Work</a>
          </div>
          ${proofList(igamingPage.proof)}
        </div>
        <div class="hero__visual">
          ${picture({ item: gallery[0], eager: true, className: "hero__picture" }).trim()}
          <div class="hero__caption"><span>Selected work</span><strong>IPONWEB · Conference merchandise</strong></div>
        </div>
      </section>

      <section class="section vertical-intro">
        <div>
          <p class="eyebrow eyebrow--dark"><span>Built for the calendar</span></p>
          <h2>${escapeHtml(igamingPage.introTitle)}</h2>
        </div>
        <div><p>${escapeHtml(igamingPage.introCopy)}</p><ul>${igamingPage.serviceTypes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      </section>

      <section class="section eu-section vertical-benefits">
        <div class="section-heading section-heading--split">
          <div><p class="eyebrow eyebrow--dark"><span>One production flow</span></p><h2>Merchandise that reaches the team before the doors open.</h2></div>
          <p>Plan a single conference, a multi-event season or coordinated merchandise for offices and commercial teams across the EU.</p>
        </div>
        <div class="benefit-grid">${benefitsMarkup}</div>
      </section>

      <section class="section projects-section">
        <div class="section-heading section-heading--split"><div><p class="eyebrow eyebrow--dark"><span>Selected work</span></p><h2>Products made for real teams</h2></div><p>Examples of completed merchandise work across conference, textile and gaming use cases.</p></div>
        <div class="project-grid project-grid--three">${igamingGallery}</div>
      </section>

      <section class="section process-section" id="process">
        <div class="section-heading section-heading--split"><div><p class="eyebrow eyebrow--dark"><span>How it works</span></p><h2>From brief to delivery</h2></div><p>Selection, sourcing, production, branding, quality control, packing and delivery through one point of contact.</p></div>
        <ol class="process-list">${stepsMarkup}</ol>
      </section>

      <section class="section faq-section">
        <div class="faq-section__heading"><p class="eyebrow eyebrow--dark"><span>Planning answers</span></p><h2>iGaming merchandise FAQ</h2><p>What event and marketing teams usually need to know first.</p></div>
        <div class="faq-list">${faqMarkup(igamingPage.faqs)}</div>
      </section>

      ${leadForm({ context: "igaming-merchandise-europe" })}
    </main>
    ${footer()}
  </div>
  <a class="mobile-sticky-cta" href="#brief" data-event="mobile_sticky_cta_click">Let's Make Merch</a>`
});

const notFoundHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Page not found | corp-merch.eu</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/assets/styles.css?v=${assetVersion}">
</head>
<body class="error-page"><main>${brand("/")}<p class="error-page__code">404</p><h1>This route is not in the delivery plan.</h1><p>Start again from the corporate merchandise homepage.</p><a class="button button--mint" href="/">Back to corp-merch.eu</a></main></body>
</html>`;

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`;
const lastmod = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.url}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${site.url}${igamingPage.path}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
</urlset>`;
const headers = `/*
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; style-src 'self'; script-src 'self' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
`;

await rm(distDir, { recursive: true, force: true });
await mkdir(path.join(distDir, "assets"), { recursive: true });
await mkdir(path.join(distDir, "igaming-merchandise-europe"), { recursive: true });
await cp(path.join(projectRoot, "src/assets/images"), path.join(distDir, "assets/images"), { recursive: true });
await copyFile(path.join(projectRoot, "src/styles.css"), path.join(distDir, "assets/styles.css"));
await copyFile(path.join(projectRoot, "src/script.js"), path.join(distDir, "assets/script.js"));
await copyFile(path.join(projectRoot, "src/favicon.svg"), path.join(distDir, "favicon.svg"));
await Promise.all([
  writeFile(path.join(distDir, "index.html"), cleanOutput(homepage)),
  writeFile(path.join(distDir, "igaming-merchandise-europe/index.html"), cleanOutput(igamingHtml)),
  writeFile(path.join(distDir, "404.html"), cleanOutput(notFoundHtml)),
  writeFile(path.join(distDir, "robots.txt"), robots),
  writeFile(path.join(distDir, "sitemap.xml"), sitemap),
  writeFile(path.join(distDir, "_headers"), headers)
]);

console.log(`Built corp-merch.eu → ${path.relative(projectRoot, distDir)}`);
