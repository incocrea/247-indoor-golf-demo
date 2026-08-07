/* 24/7 Indoor Golf Club — núcleo compartido del DEMO funcional (sin backend).
   Estado en localStorage del navegador; en producción esto sería Supabase/API (docs/05). */
(function () {
  "use strict";

  var ES = (document.documentElement.lang || "").indexOf("es") === 0;

  var TIERS = {
    green: { name: "Green", fee: 29, hours: 2, extra: 14 },
    fairway: { name: "Fairway", fee: 59, hours: 6, extra: 12 },
    albatross: { name: "Albatross", fee: 99, hours: 0, peak: 8, extra: 12, offpeakIncluded: true },
  };

  function read(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function euros(n) { return "$" + n; }  // USD: proyecto para EEUU

  function hashCode(s) {
    var x = 0;
    for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x;
  }

  function dayInfo(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    var key = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    var names = ES
      ? ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var label = names[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1);
    if (offset === 0) label = (ES ? "hoy" : "today") + " " + d.getDate() + "/" + (d.getMonth() + 1);
    return { key: key, label: label, dow: d.getDay() };
  }

  function isPeak(dow, hour) {
    var weekend = dow === 0 || dow === 6;
    return weekend || (hour >= 17 && hour <= 22);
  }

  var api = {
    ES: ES,
    TIERS: TIERS,
    PRICE_PEAK: 18,
    PRICE_OFF: 15,
    HOURS: (function () { var a = []; for (var h = 9; h <= 23; h++) a.push(h); return a; })(),
    BAYS: [1, 2],
    pad: pad,
    euros: euros,
    hashCode: hashCode,
    dayInfo: dayInfo,
    isPeak: isPeak,

    getUser: function () { return read("demo247.user", null); },
    setUser: function (u) { write("demo247.user", u); },
    logout: function () {
      localStorage.removeItem("demo247.user");
      localStorage.removeItem("demo247.membership");
    },

    getMembership: function () { return read("demo247.membership", null); },
    setMembership: function (m) { write("demo247.membership", m); },
    cancelMembership: function () { localStorage.removeItem("demo247.membership"); },

    getBookings: function () { return read("demo247.bookings", []); },
    setBookings: function (list) { write("demo247.bookings", list); },

    /* ocupación pseudoaleatoria determinista + reservas del usuario */
    isBusy: function (dayKey, bay, hour) {
      var mine = api.getBookings().some(function (b) {
        return b.dayKey === dayKey && b.bay === bay && b.hour === hour;
      });
      if (mine) return true;
      return hashCode(dayKey + "|" + bay + "|" + hour) % 10 < 3;
    },

    guestPrice: function (dow, hour) { return isPeak(dow, hour) ? api.PRICE_PEAK : api.PRICE_OFF; },

    /* Qué cuesta un slot para el estado actual (socio o invitado).
       Devuelve {kind:'incl'|'peak-incl'|'member-rate'|'guest', price, label} */
    quote: function (dow, hour) {
      var m = api.getMembership();
      if (m && m.tier && TIERS[m.tier]) {
        var t = TIERS[m.tier];
        if (t.offpeakIncluded && !isPeak(dow, hour)) {
          return { kind: "incl", price: 0, label: ES ? "incluida" : "included" };
        }
        if (t.offpeakIncluded) {
          return (m.peakLeft || 0) > 0
            ? { kind: "peak-incl", price: 0, label: ES ? "incluida" : "included" }
            : { kind: "member-rate", price: t.extra, label: euros(t.extra) };
        }
        return (m.hoursLeft || 0) > 0
          ? { kind: "incl", price: 0, label: ES ? "incluida" : "included" }
          : { kind: "member-rate", price: t.extra, label: euros(t.extra) };
      }
      var p = api.guestPrice(dow, hour);
      return { kind: "guest", price: p, label: euros(p) };
    },

    /* Consume el asiento del ledger que toque; devuelve el tipo consumido */
    consume: function (quoteKind) {
      var m = api.getMembership();
      if (!m) return null;
      if (quoteKind === "incl" && !TIERS[m.tier].offpeakIncluded) {
        m.hoursLeft = Math.max(0, (m.hoursLeft || 0) - 1);
        api.setMembership(m);
        return "hour";
      }
      if (quoteKind === "peak-incl") {
        m.peakLeft = Math.max(0, (m.peakLeft || 0) - 1);
        api.setMembership(m);
        return "peak";
      }
      return null;
    },

    refund: function (booking) {
      var m = api.getMembership();
      if (!m || !booking.consumed) return;
      if (booking.consumed === "hour") m.hoursLeft = (m.hoursLeft || 0) + 1;
      if (booking.consumed === "peak") m.peakLeft = (m.peakLeft || 0) + 1;
      api.setMembership(m);
    },

    joinTier: function (tierId) {
      var t = TIERS[tierId];
      if (!t) return null;
      var m = {
        tier: tierId,
        since: new Date().toISOString().slice(0, 10),
        hoursLeft: t.hours || 0,
        peakLeft: t.peak || 0,
        feePaid: false, // la cuota se cobra OFFLINE (club/Zelle) y el admin la marca
      };
      api.setMembership(m);
      return m;
    },

    membershipSummary: function () {
      var m = api.getMembership();
      if (!m) return null;
      var t = TIERS[m.tier];
      var parts = [];
      if (t.offpeakIncluded) {
        parts.push(ES ? "horas valle ilimitadas" : "unlimited off-peak hours");
        parts.push((ES ? "punta incluidas: " : "peak included: ") + (m.peakLeft || 0) + " h");
      } else {
        parts.push((ES ? "incluidas este mes: " : "included this month: ") + (m.hoursLeft || 0) + " h");
      }
      return { tierName: t.name, fee: t.fee, feePaid: !!m.feePaid, detail: parts.join(" · ") };
    },
  };

  window.Demo247 = api;
})();
