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

checkPage({ source: html, name: "Homepage", canonical: "https://corp-merch.eu/", faqCount: 8 });
checkPage({
  source: igamingHtml,
  name: "iGaming page",
  canonical: "https://corp-merch.eu/igaming-merchandise-europe/",
  faqCount: 4
});

if (!html.includes("Corporate Merch Production &amp; Delivery Across Europe")) failures.push("Production H1 is missing.");
if (!html.includes("Corporate merchandise produced in Europe")) failures.push("Corporate merchandise topic is missing.");
if (!html.includes("Merch for conferences, offices and teams")) failures.push("Conference, office and team intent is missing.");
if (!html.includes("Produce once. Deliver where your team needs it.")) failures.push("EU delivery positioning is missing.");
if (!html.includes("standard intra-EU deliveries") && !html.includes("Standard intra-EU deliveries")) failures.push("Intra-EU customs explanation is missing.");
if (!html.includes("Printing &amp; POSM") || !html.includes("Welcome Kits &amp; Employee Gifts")) failures.push("Priority service topics are missing.");
if (!html.includes("Get a Merch Proposal") || !html.includes("Send Your Brief")) failures.push("Approved CTA copy is missing.");
if (html.includes("Get a Quote")) failures.push("Disallowed Get a Quote CTA remains.");

if (count(html, /class="service-card"/g) !== 6) failures.push("Homepage must contain six service categories.");
if (count(html, /class="project-card /g) !== 6) failures.push("Homepage must contain six unique project cards.");
if (count(html, /data-observe-event="project_gallery_view"/g) !== 1) failures.push("Project gallery analytics marker is missing or duplicated.");
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

for (const color of ["#1d211f", "#176b68", "#d8ece7", "#f6f4ee", "#151817", "#ff6b52"]) {
  if (!css.toLowerCase().includes(color)) failures.push(`Production palette is missing ${color}.`);
}
if (css.toLowerCase().includes("#2638cf")) failures.push("Legacy cobalt primary color remains in production CSS.");

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
  "eschatology-branded-apparel-set-512.webp"
]) {
  try {
    await access(path.join(root, "dist/assets/images", image));
  } catch {
    failures.push(`Required optimized image is missing: ${image}`);
  }
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
