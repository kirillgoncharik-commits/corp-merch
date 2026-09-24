const MAX_BODY_BYTES = 16_000;
const RATE_LIMIT_SECONDS = 60;

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

const clean = (value, maxLength) =>
  String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

const htmlEscape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function parseBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("payload_too_large");

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();
  if (contentType.includes("form")) return Object.fromEntries((await request.formData()).entries());
  throw new Error("unsupported_content_type");
}

async function rateLimited(request) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const bytes = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(hashBuffer)]
      .slice(0, 12)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const key = new Request(`https://rate-limit.internal/${hash}`);
    const cache = caches.default;
    if (await cache.match(key)) return true;
    await cache.put(
      key,
      new Response("1", { headers: { "Cache-Control": `max-age=${RATE_LIMIT_SECONDS}` } })
    );
    return false;
  } catch {
    return false;
  }
}

function normalize(raw) {
  return {
    name: clean(raw.name, 80),
    company: clean(raw.company, 100),
    email: clean(raw.email, 160).toLowerCase(),
    event: clean(raw.event, 160),
    need: clean(raw.need, 2000),
    page: clean(raw.page, 80),
    website: clean(raw.website, 200),
    consent: raw.consent === true || raw.consent === "true" || raw.consent === "on",
    startedAt: Number(raw.startedAt || 0)
  };
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get("host") || new URL(request.url).host);
  } catch {
    return false;
  }
}

async function sendLeadEmail(binding, payload, request) {
  const country = clean(request.cf?.country || "", 16);
  const subject = ["New corp-merch.eu lead", payload.company, payload.event]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 180);

  const text = [
    "New corp-merch.eu enquiry",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company: ${payload.company}`,
    payload.event ? `Event / city / deadline: ${payload.event}` : null,
    payload.page ? `Page: ${payload.page}` : null,
    country ? `Country: ${country}` : null,
    "",
    "Brief:",
    payload.need
  ].filter((line) => line !== null).join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#151817;max-width:680px">
      <h2 style="margin:0 0 18px;color:#176b68">New corp-merch.eu enquiry</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
        <tr><td style="padding:5px 12px 5px 0;color:#666">Name</td><td style="padding:5px 0"><strong>${htmlEscape(payload.name)}</strong></td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#666">Email</td><td style="padding:5px 0"><a href="mailto:${htmlEscape(payload.email)}">${htmlEscape(payload.email)}</a></td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:#666">Company</td><td style="padding:5px 0">${htmlEscape(payload.company)}</td></tr>
        ${payload.event ? `<tr><td style="padding:5px 12px 5px 0;color:#666">Event / city / deadline</td><td style="padding:5px 0">${htmlEscape(payload.event)}</td></tr>` : ""}
        ${payload.page ? `<tr><td style="padding:5px 12px 5px 0;color:#666">Page</td><td style="padding:5px 0">${htmlEscape(payload.page)}</td></tr>` : ""}
        ${country ? `<tr><td style="padding:5px 12px 5px 0;color:#666">Country</td><td style="padding:5px 0">${htmlEscape(country)}</td></tr>` : ""}
      </table>
      <div style="padding:16px 18px;background:#d8ece7;border-radius:10px;white-space:pre-wrap">${htmlEscape(payload.need)}</div>
      <p style="margin:18px 0 0;color:#666;font-size:13px">Submitted via corp-merch.eu</p>
    </div>`;

  await binding.send({
    to: "order@swaggy.agency",
    from: { email: "leads@corp-merch.eu", name: "corp-merch.eu" },
    replyTo: { email: payload.email, name: payload.name },
    subject,
    text,
    html
  });
}

async function handleLead(request, env) {
  if (!sameOrigin(request)) return json({ ok: false, code: "invalid_origin" }, 403);

  let raw;
  try {
    raw = await parseBody(request);
  } catch (error) {
    const status = error.message === "payload_too_large" ? 413 : 415;
    return json({ ok: false, code: error.message }, status);
  }

  const payload = normalize(raw);
  if (payload.website) return json({ ok: true });

  const age = Date.now() - payload.startedAt;
  if (!payload.startedAt || age < 1500 || age > 21_600_000) {
    return json({ ok: false, code: "invalid_form_session", message: "Please refresh the page and try again." }, 400);
  }
  if (!payload.name || !payload.company || !payload.need || !validEmail(payload.email) || !payload.consent) {
    return json({ ok: false, code: "validation_error", message: "Please check the required fields." }, 400);
  }
  if (await rateLimited(request)) return json({ ok: false, code: "rate_limited" }, 429);

  if (!env.LEAD_EMAIL) {
    return json({ ok: false, code: "destination_not_configured" }, 503);
  }

  try {
    await sendLeadEmail(env.LEAD_EMAIL, payload, request);
  } catch (error) {
    console.error("Lead email delivery failed", error?.code || "", error?.message || error);
    return json({
      ok: false,
      code: "delivery_failed",
      message: "We could not send the brief. Please email order@swaggy.agency directly."
    }, 502);
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestedHost = (request.headers.get("host") || url.host).split(":")[0];
    const isLocalHost = env.LOCAL_DEV === "true" || requestedHost === "localhost" || requestedHost === "127.0.0.1" || requestedHost === "[::1]";
    const isWorkersPreview = requestedHost.endsWith(".workers.dev");

    if (requestedHost === "www.corp-merch.eu" || (!isLocalHost && !isWorkersPreview && url.protocol !== "https:")) {
      url.protocol = "https:";
      url.hostname = "corp-merch.eu";
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
      return handleLead(request, env);
    }

    if (isWorkersPreview && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (!isWorkersPreview) return response;

    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
