/* 24/7 Indoor Golf Club — formulario de la Priority Waitlist.
   Envía por fetch() al endpoint (Apps Script → hoja de Google del cliente)
   declarado en data-endpoint (constante WAITLIST_ENDPOINT en tools/build.py).
   Sin endpoint configurado, simula el alta para poder revisar el flujo en local.
   Tras el éxito muestra el panel de compartir; también hay botones de compartir
   en la propia página ([data-share-row]). El texto se comparte con utm propios
   para que cada canal de compartición quede atribuido. */
(function () {
  "use strict";

  var ES = (document.documentElement.lang || "").indexOf("es") === 0;
  var CONSENT_VERSION = "wl-2026-08-v2";
  /* El servidor descarta envíos por debajo de este umbral (anti-bot). Un humano
     ultrarrápido (autorrelleno) se protege en el cliente: si va más rápido, el
     envío se retrasa lo que falte para no perder nunca un alta legítima. */
  var MIN_SECONDS = 4;

  var T = ES
    ? {
        sending: "Enviando…",
        submit: "Unirme a la lista prioritaria",
        errRequired: "Revisa los campos marcados: faltan datos o hay algún error.",
        errEmail: "Ese email no parece válido.",
        errPhone: "Ese teléfono no parece válido: usa al menos 10 dígitos.",
        errZip: "El código postal debe tener 5 dígitos (p. ej. 76179).",
        errConsent: "Para apuntarte necesitamos que aceptes los términos y el uso de tus datos.",
        errNet: "No se pudo enviar. Inténtalo de nuevo en un momento o escríbenos a info@247indoorgolfclub.com.",
        shareTitle: "24/7 Indoor Golf Club — Priority Waitlist",
        shareJoined: "Acabo de apuntarme a la lista prioritaria de 24/7 Indoor Golf Club: golf indoor en simuladores en Fort Worth, abierto 24/7. Apúntate tú también:",
        sharePage: "Mira esto: un club de golf indoor abierto 24/7 va a abrir en Fort Worth y su lista prioritaria ya está abierta:",
        shareNative: "Compartir",
        copy: "Copiar enlace",
        copied: "✓ Copiado",
        copyManual: "Copia el enlace manualmente:",
        demoNote: "⚠️ Vista previa: este alta es de demostración y NO ha quedado registrada.",
      }
    : {
        sending: "Sending…",
        submit: "Join the Priority Waitlist",
        errRequired: "Please review the highlighted fields — something is missing or invalid.",
        errEmail: "That email address doesn't look right.",
        errPhone: "That phone number doesn't look right — use at least 10 digits.",
        errZip: "ZIP code should be 5 digits (e.g. 76179).",
        errConsent: "To join, please accept the terms and the use of your data.",
        errNet: "We couldn't send your signup. Try again in a moment, or email info@247indoorgolfclub.com.",
        shareTitle: "24/7 Indoor Golf Club — Priority Waitlist",
        shareJoined: "I just joined the Priority Waitlist for 24/7 Indoor Golf Club — indoor golf on pro simulators in Fort Worth, open 24/7. Join me:",
        sharePage: "Check this out — an indoor golf club open 24/7 is coming to Fort Worth, and the Priority Waitlist is open:",
        shareNative: "Share",
        copy: "Copy link",
        copied: "✓ Copied",
        copyManual: "Copy the link manually:",
        demoNote: "⚠️ Preview mode: this signup is a demo and has NOT been saved.",
      };

  /* ---------- código de referido propio ---------- */
  function makeRefCode() {
    var chars = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // sin 0/O/1/I/L
    var out = "";
    try {
      var buf = new Uint32Array(6);
      crypto.getRandomValues(buf);
      for (var i = 0; i < 6; i++) out += chars[buf[i] % chars.length];
    } catch (e) {
      for (var j = 0; j < 6; j++) out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }
  function storedRef() {
    try { return localStorage.getItem("waitlist247.ref") || ""; } catch (e) { return ""; }
  }

  /* ---------- compartir ---------- */
  function shareUrl(content, withRef) {
    var base = window.location.origin + window.location.pathname;
    var u = base + "?utm_source=friend&utm_medium=share&utm_content=" + encodeURIComponent(content);
    var ref = withRef ? storedRef() : "";
    if (ref) u += "&ref=" + encodeURIComponent(ref);
    return u;
  }

  function buildShareRow(container, text, withRef) {
    container.innerHTML = "";
    function btn(label, cls) {
      var b = document.createElement(cls === "a" ? "a" : "button");
      if (cls !== "a") b.type = "button";
      b.className = "btn btn--ghost btn--small";
      b.textContent = label;
      container.appendChild(b);
      return b;
    }
    if (navigator.share) {
      var nat = btn(T.shareNative + " 📲");
      nat.addEventListener("click", function () {
        navigator.share({ title: T.shareTitle, text: text, url: shareUrl("native", withRef) }).catch(function () {});
      });
    }
    var wa = btn("WhatsApp", "a");
    wa.href = "https://wa.me/?text=" + encodeURIComponent(text + " " + shareUrl("whatsapp", withRef));
    wa.target = "_blank";
    wa.rel = "noopener";
    var mail = btn("Email", "a");
    mail.href = "mailto:?subject=" + encodeURIComponent(T.shareTitle) + "&body=" + encodeURIComponent(text + "\n\n" + shareUrl("email", withRef));
    var cp = btn(T.copy);
    cp.setAttribute("aria-live", "polite"); // que el "✓ Copiado" se anuncie
    cp.addEventListener("click", function () {
      var u = shareUrl("copy", withRef);
      function done() {
        cp.textContent = T.copied;
        cp.focus();
        setTimeout(function () { cp.textContent = T.copy; }, 2000);
      }
      /* si la copia falla, nada de fingir éxito: se ofrece el enlace a mano */
      function failCopy() {
        if (container.querySelector(".share-copy-fallback")) return;
        var wrap = document.createElement("label");
        wrap.className = "share-copy-fallback";
        wrap.textContent = T.copyManual + " ";
        var inp = document.createElement("input");
        inp.type = "text"; inp.value = u; inp.readOnly = true;
        wrap.appendChild(inp);
        container.appendChild(wrap);
        inp.focus(); inp.select();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(done, failCopy);
      } else {
        var ta = document.createElement("textarea");
        ta.value = u;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta); ta.select();
        var okCopy = false;
        try { okCopy = document.execCommand("copy"); } catch (e) {}
        ta.remove();
        if (okCopy) done(); else failCopy();
      }
    });
  }

  /* filas de compartir de la propia página (antes de registrarse) */
  document.querySelectorAll("[data-share-row]").forEach(function (row) {
    buildShareRow(row, T.sharePage, false);
  });

  /* ---------- formulario ---------- */
  var form = document.querySelector("form[data-waitlist]");
  if (!form) return;
  /* validamos nosotros; novalidate solo cuando hay JS (mejora progresiva:
     sin JS el navegador valida y el POST a Pages devuelve 405 sin volcar
     los datos en la URL) */
  form.setAttribute("novalidate", "");
  var endpoint = form.getAttribute("data-endpoint") || "";
  var feedback = form.querySelector(".form__feedback");
  feedback.id = feedback.id || "wl-feedback";
  var submitBtn = form.querySelector("button[type=submit]");
  var success = document.querySelector("[data-waitlist-success]");
  var loadedAt = Date.now();

  /* "Other" despliega su campo de texto. Sin robo de foco: enfocar aquí rompe
     el recorrido con flechas dentro del grupo de radios; el campo es el
     siguiente tabulable y con eso basta. */
  form.querySelectorAll(".form-choice").forEach(function (fs) {
    var other = fs.querySelector(".choice-other");
    if (!other) return;
    fs.addEventListener("change", function () {
      var sel = fs.querySelector("input[type=radio]:checked");
      var isOther = !!sel && sel.value === "other";
      other.hidden = !isOther;
      if (!isOther) other.value = "";
    });
  });

  function markInvalid(el, on) {
    var box = el.closest(".form-choice, .consent-box") || el;
    box.classList.toggle("is-invalid", on);
  }

  function fail(msg, el) {
    feedback.textContent = "⚠️ " + msg;
    if (!el) return;
    markInvalid(el, true);
    /* el foco va siempre a un control real (un contenedor sin tabindex es un no-op) */
    var ctl = el.matches && el.matches("input,select,textarea") ? el : el.querySelector("input");
    if (ctl) {
      ctl.setAttribute("aria-invalid", "true");
      ctl.setAttribute("aria-describedby", feedback.id);
      ctl.focus();
    }
  }

  function attribution() {
    var first = {}, last = {};
    try { first = JSON.parse(localStorage.getItem("attr247.first")) || {}; } catch (e) {}
    try { last = JSON.parse(sessionStorage.getItem("attr247.last")) || {}; } catch (e) {}
    /* first-touch manda; el last-touch solo rellena huecos de la visita actual */
    var a = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "gclid", "fbclid"].forEach(function (k) {
      a[k] = first[k] || last[k] || "";
    });
    a.first_referrer = first.referrer || "";
    a.first_landing = first.landing || "";
    return a;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return; // envío ya en curso
    feedback.textContent = "";
    form.querySelectorAll(".is-invalid").forEach(function (el) { el.classList.remove("is-invalid"); });
    form.querySelectorAll("[aria-invalid]").forEach(function (el) {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    });

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var zip = form.zip.value.trim();
    var interest = form.querySelector("input[name=interest]:checked");
    var heard = form.querySelector("input[name=heard]:checked");
    var consentTerms = form.consent_terms.checked;
    var consentSms = form.consent_sms.checked;

    if (!name) return fail(T.errRequired, form.name);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(T.errEmail, form.email);
    if (phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) return fail(T.errPhone, form.phone);
    if (!/^\d{5}(-\d{4})?$/.test(zip)) return fail(T.errZip, form.zip);
    if (!interest) return fail(T.errRequired, form.querySelector("[data-fs-interest]"));
    if (!heard) return fail(T.errRequired, form.querySelector("[data-fs-heard]"));
    if (!consentTerms) return fail(T.errConsent, form.querySelector(".consent-box"));

    var myRef = storedRef() || makeRefCode();
    var attr = attribution();
    var buildPayload = function () { return {
      name: name,
      email: email,
      phone: phone,
      zip: zip,
      interest: interest.value,
      interest_other: (form.interest_other.value || "").trim(),
      heard: heard.value,
      heard_other: (form.heard_other.value || "").trim(),
      consent_terms: true,
      consent_sms: consentSms,
      consent_version: CONSENT_VERSION,
      lang: ES ? "es" : "en",
      page: window.location.href,
      my_ref: myRef,
      ref_by: attr.ref || "",
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      utm_content: attr.utm_content,
      utm_term: attr.utm_term,
      gclid: attr.gclid,
      fbclid: attr.fbclid,
      first_referrer: attr.first_referrer,
      first_landing: attr.first_landing,
      ua: navigator.userAgent,
      t_fill: Math.round((Date.now() - loadedAt) / 1000),
      website: form.website.value, // honeypot: siempre vacío en humanos
    }; };

    submitBtn.disabled = true;
    submitBtn.textContent = T.sending;

    function onSuccess(isDemo) {
      try { localStorage.setItem("waitlist247.ref", myRef); } catch (e) {}
      var row = success.querySelector("[data-share-row-success]");
      if (row) buildShareRow(row, T.shareJoined, true);
      if (isDemo && !success.querySelector(".waitlist-demo-note")) {
        var note = document.createElement("p");
        note.className = "form__note waitlist-demo-note";
        note.textContent = T.demoNote;
        success.insertBefore(note, success.firstChild);
      }
      form.hidden = true;
      success.hidden = false;
      var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      var h = success.querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      success.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
    function onError() {
      submitBtn.disabled = false;
      submitBtn.textContent = T.submit;
      fail(T.errNet);
    }

    function send() {
      if (!endpoint) {
        /* modo demo: sin endpoint todavía (WAITLIST_ENDPOINT vacío en build.py).
           El panel de éxito se marca visiblemente como simulado. */
        if (window.console) console.warn("waitlist: WAITLIST_ENDPOINT sin configurar; alta simulada, NO se ha guardado nada.");
        setTimeout(function () { onSuccess(true); }, 500);
        return;
      }
      /* text/plain evita el preflight CORS; Apps Script parsea el JSON del body */
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(buildPayload()),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok) onSuccess(false);
          else onError();
        })
        .catch(onError);
    }

    /* si un humano con autorrelleno va más rápido que el umbral anti-bot del
       servidor, se espera lo que falte (solo ve "Enviando…" un instante) */
    var elapsed = Date.now() - loadedAt;
    var waitMs = Math.max(0, MIN_SECONDS * 1000 - elapsed + 250);
    setTimeout(send, waitMs);
  });
})();
