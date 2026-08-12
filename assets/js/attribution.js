/* 24/7 Indoor Golf Club — captura de atribución de origen (todas las páginas).
   Guarda de dónde llegó el visitante para adjuntarlo al alta de la waitlist:
   - first-touch en localStorage (NUNCA se sobrescribe: el canal que lo trajo la
     primera vez es el que se atribuye), last-touch en sessionStorage.
   - Lee utm_* estándar, ?ref= (código de referido de otro inscrito) y ?src=
     (atajo corto para QR/impresos: cuenta como utm_source si este falta). */
(function () {
  "use strict";
  try {
    var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "src", "gclid", "fbclid"];
    var q = new URLSearchParams(window.location.search);
    /* el referrer interno (navegar dentro de la propia web) no es un canal:
       si contara, el primer clic interno fijaría un first-touch "con señal"
       y una campaña posterior ya no podría reclamar la atribución */
    var referrer = document.referrer || "";
    try {
      if (referrer && new URL(referrer).origin === window.location.origin) referrer = "";
    } catch (e1) {}
    var touch = {
      at: new Date().toISOString(),
      landing: window.location.pathname + window.location.search,
      referrer: referrer,
    };
    var tagged = false;
    KEYS.forEach(function (k) {
      var v = q.get(k);
      if (v) { touch[k] = v.slice(0, 120); tagged = true; }
    });
    if (touch.src && !touch.utm_source) touch.utm_source = touch.src;

    /* first-touch: no se sobrescribe NUNCA… salvo que el guardado no tenga
       ninguna señal de canal (visita directa) y esta sí la traiga — entonces
       la primera visita atribuible es la que cuenta. */
    var first = null;
    try { first = JSON.parse(localStorage.getItem("attr247.first")); } catch (e2) {}
    var hasChannel = function (t) {
      return !!(t && (t.utm_source || t.ref || t.gclid || t.fbclid || t.referrer));
    };
    if (!first || (!hasChannel(first) && hasChannel(touch))) {
      localStorage.setItem("attr247.first", JSON.stringify(touch));
    }
    if (tagged) {
      sessionStorage.setItem("attr247.last", JSON.stringify(touch));
    }
  } catch (e) { /* modo privado sin storage: la atribución es prescindible */ }
})();
