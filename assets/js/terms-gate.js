/* 24/7 Indoor Golf Club — modal obligatorio de términos y condiciones.
   Intercepta los enlaces de booking y membresías de Albaplay: si el usuario aún no
   ha aceptado los 3 documentos (tabs), muestra el modal; la aceptación se guarda en
   localStorage y no se vuelve a pedir. Los enlaces legales del footer abren el modal
   en modo consulta. */
(function () {
  "use strict";

  if (!window.TERMS247) return;
  var ES = (document.documentElement.lang || "").indexOf("es") === 0;
  var KEY = "terms247.accepted." + window.TERMS247.version;
  var GATE_PREFIX = "https://albaplay.com/es/venue/247-indoor-golf-club";

  var T = ES
    ? {
        title: "Términos y condiciones de uso",
        intro: "Antes de continuar con tu reserva o membresía, revisa y acepta los siguientes documentos:",
        checkbox: "He leído y acepto todos los presentes términos y condiciones de uso",
        accept: "Aceptar y continuar",
        close: "Cerrar",
        accepted: "Aceptados el ",
      }
    : {
        title: "Terms and conditions of use",
        intro: "Before continuing to booking or membership, please review and accept the following documents:",
        checkbox: "I have read and accept all the present terms and conditions of use",
        accept: "Accept and continue",
        close: "Close",
        accepted: "Accepted on ",
      };

  function isAccepted() {
    try { return !!JSON.parse(localStorage.getItem(KEY)); } catch (e) { return false; }
  }
  function markAccepted() {
    localStorage.setItem(KEY, JSON.stringify({ at: new Date().toISOString(), version: window.TERMS247.version }));
  }

  var overlay = null;
  var lastFocus = null;

  function buildModal(activeTab, pendingHref) {
    destroyModal();
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "terms-overlay";
    var accepted = isAccepted();
    var acceptedInfo = "";
    if (accepted) {
      try {
        var at = JSON.parse(localStorage.getItem(KEY)).at;
        acceptedInfo = "<p class='terms-accepted-note'>✓ " + T.accepted + new Date(at).toLocaleDateString() + "</p>";
      } catch (e) {}
    }
    var tabs = window.TERMS247.docs.map(function (d, i) {
      return "<button type='button' class='terms-tab' role='tab' data-tab='" + d.id + "' aria-selected='" + (d.id === activeTab ? "true" : "false") + "'>" + d.title[ES ? "es" : "en"] + "</button>";
    }).join("");
    overlay.innerHTML =
      "<div class='terms-modal' role='dialog' aria-modal='true' aria-label='" + T.title + "' tabindex='-1'>" +
      "<div class='terms-head'><h2 class='card__title'>" + T.title + "</h2>" +
      "<button type='button' class='terms-close' aria-label='" + T.close + "'>×</button></div>" +
      "<p class='terms-intro'>" + T.intro + "</p>" +
      "<div class='terms-tabs' role='tablist'>" + tabs + "</div>" +
      "<div class='terms-body' tabindex='0'></div>" +
      (accepted
        ? acceptedInfo
        : "<label class='terms-check'><input type='checkbox'> <span>" + T.checkbox + "</span></label>" +
          "<p class='terms-actions'><button type='button' class='btn btn--primary' data-accept disabled>" + T.accept + "</button> " +
          "<button type='button' class='btn btn--ghost' data-cancel>" + T.close + "</button></p>") +
      "</div>";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    var modal = overlay.querySelector(".terms-modal");
    var body = overlay.querySelector(".terms-body");

    function showTab(id) {
      var doc = window.TERMS247.docs.filter(function (d) { return d.id === id; })[0] || window.TERMS247.docs[0];
      body.innerHTML = doc.html;
      body.scrollTop = 0;
      overlay.querySelectorAll(".terms-tab").forEach(function (t) {
        t.setAttribute("aria-selected", t.getAttribute("data-tab") === doc.id ? "true" : "false");
      });
    }
    overlay.querySelectorAll(".terms-tab").forEach(function (t) {
      t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); });
    });
    showTab(activeTab);

    overlay.querySelector(".terms-close").addEventListener("click", destroyModal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) destroyModal(); });
    document.addEventListener("keydown", escHandler);

    var check = overlay.querySelector(".terms-check input");
    var acceptBtn = overlay.querySelector("[data-accept]");
    var cancelBtn = overlay.querySelector("[data-cancel]");
    if (check && acceptBtn) {
      check.addEventListener("change", function () { acceptBtn.disabled = !check.checked; });
      acceptBtn.addEventListener("click", function () {
        if (!check.checked) return;
        markAccepted();
        destroyModal();
        if (pendingHref) {
          var w = window.open(pendingHref, "_blank", "noopener");
          if (!w) window.location.assign(pendingHref);
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener("click", destroyModal);
    modal.focus();
  }

  function escHandler(e) { if (e.key === "Escape") destroyModal(); }

  function destroyModal() {
    if (!overlay) return;
    document.removeEventListener("keydown", escHandler);
    overlay.remove();
    overlay = null;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* Gate: reservas y membresías de Albaplay exigen aceptación previa */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf(GATE_PREFIX) === 0 && !isAccepted()) {
      e.preventDefault();
      e.stopPropagation();
      buildModal("terms", a.href);
    }
  }, true);

  /* Enlaces legales del footer abren el modal en el documento correspondiente */
  var LEGAL_MAP = [
    [/terms|términos|aviso legal|legal notice/i, "terms"],
    [/privacy|privacidad/i, "privacy"],
    [/cancel|cancelación|cookies/i, "facility"],
  ];
  document.querySelectorAll(".footer__legal a[href='#']").forEach(function (a) {
    var txt = a.textContent || "";
    for (var i = 0; i < LEGAL_MAP.length; i++) {
      if (LEGAL_MAP[i][0].test(txt)) {
        (function (tab) {
          a.addEventListener("click", function (e) {
            e.preventDefault();
            buildModal(tab, null);
          });
        })(LEGAL_MAP[i][1]);
        break;
      }
    }
  });
})();
