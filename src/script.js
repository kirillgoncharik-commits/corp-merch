(() => {
  const productionHosts = ["corp-merch.eu", "www.corp-merch.eu"];
  const isProductionHost = productionHosts.includes(window.location.hostname);
  const measurementId = document
    .querySelector('meta[name="ga4-measurement-id"]')
    ?.getAttribute("content")
    ?.trim();

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  if (isProductionHost && /^G-[A-Z0-9]{6,}$/.test(measurementId || "")) {
    const analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(analyticsScript);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });
  }

  const pushEvent = (event, details = {}) => {
    const safeDetails = Object.fromEntries(
      Object.entries(details).filter(([, value]) => typeof value === "string" && value.length <= 100)
    );
    window.dataLayer.push({ event, ...safeDetails });
    if (isProductionHost && /^G-[A-Z0-9]{6,}$/.test(measurementId || "")) {
      window.gtag("event", event, safeDetails);
    }
  };

  const menuButton = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const closeMenu = () => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  menuButton?.addEventListener("click", () => {
    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    menu?.classList.toggle("is-open", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
  });

  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.querySelectorAll("[data-event]").forEach((element) => {
    element.addEventListener("click", () => {
      pushEvent(element.dataset.event, {
        event_label: element.dataset.eventLabel || element.textContent.trim()
      });
    });
  });

  const observedEvents = new Set();
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const eventName = entry.target.dataset.observeEvent;
          if (entry.isIntersecting && eventName && !observedEvents.has(eventName)) {
            observedEvents.add(eventName);
            pushEvent(eventName);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    document.querySelectorAll("[data-observe-event]").forEach((element) => observer.observe(element));
  }

  const stickyCta = document.querySelector(".mobile-sticky-cta");
  const briefSection = document.querySelector("#brief");
  const heroSection = document.querySelector(".hero");
  if (stickyCta && briefSection && heroSection && "IntersectionObserver" in window) {
    const visibleSections = new Set();
    const stickyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.add(entry.target);
          else visibleSections.delete(entry.target);
        });
        stickyCta.classList.toggle("is-hidden", visibleSections.size > 0);
      },
      { threshold: 0.08 }
    );
    stickyObserver.observe(heroSection);
    stickyObserver.observe(briefSection);
  }

  const form = document.querySelector("[data-lead-form]");
  if (!form) return;

  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector("[data-submit-button]");
  const startedAt = form.querySelector("[data-started-at]");
  const pageContext = form.querySelector('[name="page"]')?.value || "homepage";
  let formStarted = false;

  const resetStartedAt = () => {
    if (startedAt) startedAt.value = String(Date.now());
  };
  resetStartedAt();

  form.addEventListener("input", () => {
    if (formStarted) return;
    formStarted = true;
    pushEvent("form_start", { page_context: pageContext });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));

    if (!form.checkValidity()) {
      const invalid = form.querySelector(":invalid");
      invalid?.setAttribute("aria-invalid", "true");
      invalid?.focus();
      status.textContent = "Please complete the required fields and confirm the privacy checkbox.";
      status.classList.add("is-error");
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.consent = Boolean(payload.consent);
    submitButton.disabled = true;
    submitButton.textContent = "Sending…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result.code === "destination_not_configured") {
          throw new Error("Lead delivery is not connected in this preview. Please use Telegram or email.");
        }
        if (response.status === 429) {
          throw new Error("Please wait a minute before sending another brief.");
        }
        throw new Error(result.message || "We could not send the brief. Please try Telegram or email instead.");
      }

      pushEvent("form_submit", { page_context: pageContext });
      form.reset();
      formStarted = false;
      resetStartedAt();
      status.textContent = "Thank you — your brief is on its way. We will get back to you shortly.";
      status.classList.add("is-success");
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("is-error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send Your Brief <span aria-hidden="true">↗</span>';
    }
  });
})();
