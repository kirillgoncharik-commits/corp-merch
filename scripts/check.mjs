import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const [html, igamingHtml, css, clientScript, workerSource, wranglerConfig, sitemap, robots] = await Promise.all([
  read("dist/index.html"),
  read("dist/igaming-merchandise-europe/index.html"),
  read("dist/assets/styles.css"),
  read("dist/assets/script.js"),
  read("src/_worker.js"),
  read("wrangler.jsonc"),
  read("dist/sitemap.xml"),
  read("dist/robots.txt")
]);

const failures = [];
const warnings = [];
const count = (source, pattern) => (source.match(pattern) || []).length;
const socialPreviewFilename = "og-swaggy-corporate-merch-europe-social-v2.jpg";
const socialPreviewUrl = `https://corp-merch.eu/assets/images/${socialPreviewFilename}`;

const readJpegFrame = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) offset += 1;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 1 >= buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    const isStartOfFrame = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isStartOfFrame && segmentLength >= 8 && offset + segmentLength <= buffer.length) {
      return {
        marker,
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
        components: buffer[offset + 7]
      };
    }

    if (segmentLength < 2) break;
    offset += segmentLength;
  }

  return null;
};

const checkPage = ({ source, name, canonical, faqCount }) => {
  if (count(source, /<h1\b/g) !== 1) failures.push(`${name} must contain exactly one H1.`);
  if (!source.includes(`rel="canonical" href="${canonical}"`)) failures.push(`${name} canonical is incorrect.`);
  if (source.includes('name="robots" content="noindex')) failures.push(`${name} must remain indexable.`);
  if (!source.includes('type="application/ld+json"')) failures.push(`${name} structured data is missing.`);
  if (!source.includes('action="/api/lead"')) failures.push(`${name} lead form endpoint is missing.`);
  if (!source.includes('name="name"') || !source.includes('name="email"') || !source.includes('name="company"') || !source.includes('name="need"')) {
    failures.push(`${name} is missing required lead fields.`);
  }
  if (count(source, /class="faq-item"/g) !== faqCount) failures.push(`${name} FAQ count is incorrect.`);

  const title = source.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = source.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
  if (title.length < 30 || title.length > 60) failures.push(`${name} title must stay between 30 and 60 characters.`);
  if (description.length < 110 || description.length > 165) failures.push(`${name} description must stay between 110 and 165 characters.`);

  const schemaText = source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  try {
    const schema = JSON.parse(schemaText || "");
    const types = schema?.["@graph"]?.map((item) => item["@type"]) || [];
    for (const type of ["Organization", "WebSite", "WebPage", "Service", "FAQPage"]) {
      if (!types.includes(type)) failures.push(`${name} schema is missing ${type}.`);
    }
  } catch {
    failures.push(`${name} structured data is not valid JSON.`);
  }
};

checkPage({ source: html, name: "Homepage", canonical: "https://corp-merch.eu/", faqCount: 6 });
checkPage({
  source: igamingHtml,
  name: "iGaming page",
  canonical: "https://corp-merch.eu/igaming-merchandise-europe/",
  faqCount: 4
});

if (!html.includes("Corporate Merch Production &amp; Delivery Across Europe")) failures.push("Production H1 is missing.");
if (!html.includes("Corporate merchandise produced in Europe")) failures.push("Corporate merchandise topic is missing.");
if (!html.includes("Merch for conferences, offices and teams")) failures.push("Conference, office and team intent is missing.");
if (!html.includes("One supplier across the EU")) failures.push("EU delivery positioning is missing.");
if (!html.includes("standard intra-EU deliveries") && !html.includes("Standard intra-EU deliveries")) failures.push("Intra-EU customs explanation is missing.");
if (!html.includes("Printing &amp; POSM") || !html.includes("Welcome Kits &amp; Employee Gifts")) failures.push("Priority service topics are missing.");
if (!html.includes("Let's Make Merch") || !html.includes("Send Your Brief")) failures.push("Approved CTA copy is missing.");
if (html.includes("Get a Merch Proposal") || html.includes("Get a Quote")) failures.push("Legacy CTA copy remains.");

if (count(html, /class="service-card"/g) !== 6) failures.push("Homepage must contain six service categories.");
if (count(html, /class="project-card /g) !== 6) failures.push("Homepage must contain six unique project cards.");
if (count(html, /class="process-step"/g) !== 5) failures.push("Homepage must contain five compact process steps.");
if (count(html, /data-observe-event="project_gallery_view"/g) !== 1) failures.push("Project gallery analytics marker is missing or duplicated.");
if (html.includes("route-board") || html.includes("deliveryCities") || html.includes("hero__stamp")) failures.push("Removed route-board or photo-sticker UI remains on the homepage.");
if (!html.includes('id="events"') || count(html, /class="event-row"/g) !== 6) failures.push("Homepage must contain the compact six-event conference list.");
for (const eventName of ["ICE Barcelona 2027", "iGB Affiliate Barcelona 2027", "TES Affiliate Conference Seville 2027", "SBC Summit Europe", "SiGMA Europe", "Affiliate World Europe"]) {
  if (!html.includes(eventName)) failures.push(`Homepage event list is missing: ${eventName}`);
}
if (count(html, /class="benefit-card"/g) !== 4) failures.push("Homepage must contain four compact EU benefit cards.");
if (html.includes('name="event"')) failures.push("Homepage form must stay limited to four core fields.");

const homepageOrder = [
  'id="services"',
  'id="projects"',
  'id="events"',
  'class="section use-cases-section"',
  'id="delivery"',
  'id="process"',
  'class="section faq-section"',
  'id="brief"'
].map((marker) => html.indexOf(marker));
if (homepageOrder.some((position) => position < 0) || homepageOrder.some((position, index) => index > 0 && position <= homepageOrder[index - 1])) {
  failures.push("Homepage sections are not in the approved compact order.");
}
if (!html.includes('fetchpriority="high"') || !html.includes('rel="preload" as="image"')) failures.push("Hero LCP image priority is not configured.");
if (count(html, /loading="lazy"/g) < 6) failures.push("Below-fold project images must be lazy loaded.");

for (const eventName of [
  "hero_cta_click",
  "header_cta_click",
  "form_start",
  "form_submit",
  "telegram_click",
  "email_click",
  "project_gallery_view",
  "event_cta_click"
]) {
  if (!html.includes(eventName) && !clientScript.includes(eventName)) failures.push(`Analytics event is missing: ${eventName}`);
}

const gaId = html.match(/<meta name="ga4-measurement-id" content="([^"]*)">/)?.[1] || "";
if (!html.includes('meta name="ga4-measurement-id"')) failures.push("GA4 configuration hook is missing.");
if (!clientScript.includes("measurementId") || !clientScript.includes('window.gtag("event", event')) failures.push("GA4 event forwarding is missing.");
if (gaId && !/^G-[A-Z0-9]{6,}$/.test(gaId)) failures.push("GA4 measurement ID has an invalid format.");
if (!gaId) warnings.push("GA4_MEASUREMENT_ID is not set; create the separate corp-merch.eu web stream before production deployment.");
if (process.env.REQUIRE_GA4 === "1" && !gaId) failures.push("Production check requires GA4_MEASUREMENT_ID.");
for (const [name, source] of [["Homepage", html], ["iGaming page", igamingHtml]]) {
  if (!source.includes(`property="og:image" content="${socialPreviewUrl}"`)) failures.push(`${name} OG preview image is incorrect.`);
  if (!source.includes(`property="og:image:secure_url" content="${socialPreviewUrl}"`)) failures.push(`${name} secure OG preview image is incorrect.`);
  if (!source.includes('property="og:image:type" content="image/jpeg"')) failures.push(`${name} OG preview type is incorrect.`);
  if (!source.includes('property="og:image:width" content="600"') || !source.includes('property="og:image:height" content="315"')) {
    failures.push(`${name} OG preview dimensions are incomplete.`);
  }
  if (!source.includes('name="twitter:card" content="summary_large_image"') || !source.includes(`name="twitter:image" content="${socialPreviewUrl}"`)) {
    failures.push(`${name} Twitter/X social preview metadata is incomplete.`);
  }
  if (/og-corp-merch-[^"'<>\s]*/i.test(source)) failures.push(`${name} still contains an old og-corp-merch-* preview filename.`);
  if (source.includes("og-swaggy-corporate-merch-europe-social-v1.jpg")) failures.push(`${name} still contains the superseded social preview filename.`);
}


for (const color of ["#1d211f", "#176b68", "#d8ece7", "#f6f4ee", "#151817", "#ff6b52"]) {
  if (!css.toLowerCase().includes(color)) failures.push(`Production palette is missing ${color}.`);
}
if (css.toLowerCase().includes("#2638cf")) failures.push("Legacy cobalt primary color remains in production CSS.");
if (css.includes("border-radius: 999px")) failures.push("Pill-shaped 999px radii must not remain in the production visual system.");

for (const image of [
  "iponweb-conference-merchandise.webp",
  "iponweb-conference-merchandise-640.webp",
  "fluence-branded-event-socks.webp",
  "fluence-branded-event-socks-405.webp",
  "robo-quest-gaming-merchandise.webp",
  "robo-quest-gaming-merchandise-640.webp",
  "indrive-employee-welcome-kit-europe.webp",
  "indrive-employee-welcome-kit-europe-640.webp",
  "holiday-corporate-gift-box-europe.webp",
  "holiday-corporate-gift-box-europe-640.webp",
  "eschatology-branded-apparel-set.webp",
  "eschatology-branded-apparel-set-512.webp",
  socialPreviewFilename
]) {
  try {
    await access(path.join(root, "dist/assets/images", image));
  } catch {
    failures.push(`Required optimized image is missing: ${image}`);
  }
}

try {
  const previewBuffer = await readFile(path.join(root, "dist/assets/images", socialPreviewFilename));
  const frame = readJpegFrame(previewBuffer);
  if (!frame) {
    failures.push("Social preview asset is not a readable JPEG.");
  } else {
    if (frame.width !== 600 || frame.height !== 315) failures.push("Social preview asset must be exactly 600×315 pixels.");
    if (frame.components !== 3) failures.push("Social preview asset must be a three-component RGB JPEG.");
    if (frame.marker !== 0xc0) failures.push("Social preview asset must use standard baseline JPEG encoding.");
  }
} catch {
  failures.push(`Social preview asset cannot be read: ${socialPreviewFilename}`);
}

const assetMatches = [...html.matchAll(/(?:src|href)="(\/(?:assets\/[^"?#]+|favicon\.svg))"/g)];
for (const [, asset] of assetMatches) {
  try {
    await access(path.join(root, "dist", asset));
  } catch {
    failures.push(`Missing local asset: ${asset}`);
  }
}

if (!sitemap.includes("https://corp-merch.eu/</loc>") || !sitemap.includes("https://corp-merch.eu/igaming-merchandise-europe/")) {
  failures.push("Sitemap is missing a production URL.");
}
if (sitemap.includes("workers.dev") || sitemap.includes("/editorial/") || sitemap.includes("/production/")) {
  failures.push("Sitemap contains preview or review URLs.");
}
if (!robots.includes("Allow: /") || !robots.includes("https://corp-merch.eu/sitemap.xml")) failures.push("Production robots.txt is incorrect.");

if (!wranglerConfig.includes('"name": "corp-merch-eu"')) failures.push("Cloudflare Worker name is incorrect.");
if (!wranglerConfig.includes('"pattern": "corp-merch.eu"') || !wranglerConfig.includes('"pattern": "www.corp-merch.eu"')) {
  failures.push("Cloudflare custom domains are incomplete.");
}
if (!wranglerConfig.includes('"destination_address": "order@swaggy.agency"')) failures.push("Lead destination is incorrect.");
if (!workerSource.includes('requestedHost === "www.corp-merch.eu"')) failures.push("www canonical redirect is missing.");
if (!workerSource.includes('requestedHost.endsWith(".workers.dev")') || !workerSource.includes('"X-Robots-Tag", "noindex, nofollow"')) {
  failures.push("workers.dev noindex protection is missing.");
}
if (!workerSource.includes("env.LEAD_EMAIL") || !workerSource.includes("leads@corp-merch.eu")) failures.push("Cloudflare Email delivery is incomplete.");
if (!workerSource.includes("sameOrigin(request)")) failures.push("Lead endpoint origin protection is missing.");

const productionText = [html, igamingHtml, css, clientScript, workerSource, wranglerConfig, sitemap, robots].join("\n");
for (const forbidden of [
  "https://merch.mt",
  "Your Merch Partner in Malta",
  "SiGMA Europe Malta",
  "SBC Summit Malta",
  "NEXT Summit Valletta",
  "G-YRCP7PXYYE",
  "produced locally in Malta",
  "delivered to Malta"
]) {
  if (productionText.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`Legacy production content remains: ${forbidden}`);
}

if (warnings.length) console.warn(warnings.map((item) => `⚠ ${item}`).join("\n"));
if (failures.length) {
  console.error(failures.map((item) => `• ${item}`).join("\n"));
  process.exit(1);
}

console.log("Checks passed: corp-merch.eu production output, SEO/GEO, form, analytics hooks, assets and Cloudflare guards are consistent.");
