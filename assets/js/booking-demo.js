/* 24/7 Indoor Golf Club — DEMO del calendario de reservas (usa demo-core.js).
   El modo (invitado/socio) sale de la sesión real del demo: Mi cuenta + membresía. */
(function () {
  "use strict";

  var root = document.getElementById("booking-demo");
  if (!root || !window.Demo247) return;
  var D = window.Demo247;
  var ES = D.ES;

  var T = ES
    ? {
        bay: "Bahía",
        free: "libre",
        busy: "Ocupado",
        selected: "seleccionado",
        hello: function (name) { return "Reservando como <strong>" + name + "</strong>"; },
        memberLine: function (tier, detail) { return " · Socio <strong>" + tier + "</strong> (" + detail + ")"; },
        guestLine: " · Como invitado (pago en el club). ¿Juegas a menudo? <a href='membresias.html#tiers'>Hazte socio</a>.",
        anonLine: "Estás navegando como invitado. ¿Ya eres socio o quieres serlo? Ve a <a href='cuenta.html'>Mi cuenta</a>.",
        summaryEmpty: "Elige un hueco libre en la parrilla para ver el resumen.",
        priceIncluded: "$0 (usa 1 h incluida de tu membresía)",
        memberRate: function (p) { return p + " (tarifa de socio) · Pago en el club"; },
        guestRate: function (p) { return p + " · Pago en el club (datáfono o Zelle) al llegar"; },
        confirm: "Confirmar reserva (demo)",
        confirmedTitle: "¡Reserva confirmada! (demo)",
        confirmedBody: "Te hemos enviado un email con la confirmación. Una hora antes recibirás el enlace de apertura de la puerta. Código de acceso:",
        payNote: "Pago: en el club (datáfono o Zelle) al llegar — esta demo no procesa pagos.",
        payNoteIncl: "Sin pago: se ha descontado 1 h incluida de tu membresía.",
        myBookings: "Mis reservas (demo)",
        none: "Todavía no tienes reservas en esta demo.",
        cancel: "Cancelar",
        cancelled: "Reserva cancelada. Las horas incluidas vuelven a tu saldo.",
        who: { guest: "Invitado", member: "Socio" },
        slotLabel: function (state, bay, day, time, price) {
          return state + ": " + bay + ", " + day + " " + time + (price ? ", " + price : "");
        },
      }
    : {
        bay: "Bay",
        free: "free",
        busy: "Booked",
        selected: "selected",
        hello: function (name) { return "Booking as <strong>" + name + "</strong>"; },
        memberLine: function (tier, detail) { return " · <strong>" + tier + "</strong> member (" + detail + ")"; },
        guestLine: " · As a guest (pay at the club). Play often? <a href='membership.html#tiers'>Become a member</a>.",
        anonLine: "You're browsing as a guest. Already a member, or want to be one? Go to <a href='account.html'>My account</a>.",
        summaryEmpty: "Pick a free slot on the sheet to see the summary.",
        priceIncluded: "$0 (uses 1 included hour from your membership)",
        memberRate: function (p) { return p + " (member rate) · Pay at the club"; },
        guestRate: function (p) { return p + " · Pay at the club (card terminal or Zelle) on arrival"; },
        confirm: "Confirm booking (demo)",
        confirmedTitle: "Booking confirmed! (demo)",
        confirmedBody: "We've emailed your confirmation. One hour before your slot you'll receive the door-unlock link. Access code:",
        payNote: "Payment: at the club (card terminal or Zelle) on arrival — this demo processes no payments.",
        payNoteIncl: "No payment: 1 included hour was deducted from your membership.",
        myBookings: "My bookings (demo)",
        none: "No bookings in this demo yet.",
        cancel: "Cancel",
        cancelled: "Booking cancelled. Included hours go back to your balance.",
        who: { guest: "Guest", member: "Member" },
        slotLabel: function (state, bay, day, time, price) {
          return state + ": " + bay + ", " + day + " " + time + (price ? ", " + price : "");
        },
      };

  var state = { dayOffset: 0, selected: null };

  var daysEl = root.querySelector("[data-days]");
  var sheetEl = root.querySelector("[data-sheet]");
  var sessionEl = root.querySelector("[data-session]");
  var summaryEl = root.querySelector("[data-summary]");
  var confirmBtn = root.querySelector("[data-confirm]");
  var confirmationEl = root.querySelector("[data-confirmation]");
  var listEl = root.querySelector("[data-list]");
  var statusEl = root.querySelector("[data-status]");

  function renderSession() {
    var u = D.getUser();
    var s = D.membershipSummary();
    if (!u) { sessionEl.innerHTML = T.anonLine; return; }
    var html = T.hello(u.name || u.email);
    html += s ? T.memberLine(s.tierName, s.detail) : T.guestLine;
    sessionEl.innerHTML = html;
  }

  function renderDays() {
    daysEl.innerHTML = "";
    for (var i = 0; i < 7; i++) {
      (function (i) {
        var d = D.dayInfo(i);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = d.label;
        b.setAttribute("aria-pressed", state.dayOffset === i ? "true" : "false");
        b.addEventListener("click", function () {
          state.dayOffset = i;
          state.selected = null;
          render();
        });
        daysEl.appendChild(b);
      })(i);
    }
  }

  function renderSheet() {
    var d = D.dayInfo(state.dayOffset);
    var html = '<div class="tee-sheet__head" aria-hidden="true"></div>';
    D.BAYS.forEach(function (bay) {
      html += '<div class="tee-sheet__head">' + T.bay + " " + bay + "</div>";
    });
    sheetEl.innerHTML = html;
    D.HOURS.forEach(function (hour) {
      var t = document.createElement("div");
      t.className = "tee-sheet__time";
      t.textContent = D.pad(hour) + ":00";
      sheetEl.appendChild(t);
      D.BAYS.forEach(function (bay) {
        var busy = D.isBusy(d.key, bay, hour);
        var peak = D.isPeak(d.dow, hour);
        var q = D.quote(d.dow, hour);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot" + (peak ? " slot--peak" : "");
        var sel = state.selected && state.selected.dayKey === d.key && state.selected.bay === bay && state.selected.hour === hour;
        if (busy) {
          btn.className = "slot slot--busy";
          btn.disabled = true;
          btn.innerHTML = T.busy;
          btn.setAttribute("aria-label", T.slotLabel(T.busy, T.bay + " " + bay, d.label, D.pad(hour) + ":00", ""));
        } else {
          if (sel) btn.className += " slot--selected";
          btn.innerHTML = D.pad(hour) + ":00<span class='slot__price'>" + q.label + "</span>";
          btn.setAttribute("aria-pressed", sel ? "true" : "false");
          btn.setAttribute("aria-label", T.slotLabel(sel ? T.selected : T.free, T.bay + " " + bay, d.label, D.pad(hour) + ":00", q.label));
          btn.addEventListener("click", function () {
            state.selected = { dayKey: d.key, dayLabel: d.label, bay: bay, hour: hour, dow: d.dow };
            render();
          });
        }
        sheetEl.appendChild(btn);
      });
    });
  }

  function renderSummary() {
    confirmationEl.hidden = true;
    if (!state.selected) {
      summaryEl.innerHTML = "<p class='card__text'>" + T.summaryEmpty + "</p>";
      confirmBtn.hidden = true;
      return;
    }
    var s = state.selected;
    var q = D.quote(s.dow, s.hour);
    var priceTxt;
    if (q.kind === "incl" || q.kind === "peak-incl") priceTxt = T.priceIncluded;
    else if (q.kind === "member-rate") priceTxt = T.memberRate(D.euros(q.price));
    else priceTxt = T.guestRate(D.euros(q.price));
    summaryEl.innerHTML =
      "<p class='demo-panel__total'>" + T.bay + " " + s.bay + " · " + s.dayLabel + " · " +
      D.pad(s.hour) + ":00–" + D.pad(s.hour + 1) + ":00</p>" +
      "<p class='card__text'>" + priceTxt + "</p>";
    confirmBtn.hidden = false;
  }

  function renderList() {
    var items = D.getBookings();
    if (!items.length) {
      listEl.innerHTML = "<li>" + T.none + "</li>";
      return;
    }
    listEl.innerHTML = "";
    items.forEach(function (b, idx) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = T.bay + " " + b.bay + " · " + b.dayLabel + " · " + D.pad(b.hour) + ":00 · " +
        (b.member ? T.who.member : T.who.guest) + (b.price ? " · " + D.euros(b.price) : "");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--ghost btn--small";
      btn.textContent = T.cancel;
      btn.addEventListener("click", function () {
        var list = D.getBookings();
        var removed = list.splice(idx, 1)[0];
        D.setBookings(list);
        if (removed) D.refund(removed);
        confirmationEl.hidden = true;
        render();
        statusEl.textContent = T.cancelled;
      });
      li.appendChild(span);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function render() {
    renderSession();
    renderDays();
    renderSheet();
    renderSummary();
    renderList();
  }

  confirmBtn.addEventListener("click", function () {
    var s = state.selected;
    if (!s) return;
    var q = D.quote(s.dow, s.hour);
    var consumed = q.price === 0 ? D.consume(q.kind) || (q.kind === "incl" ? null : null) : null;
    if (q.kind === "incl" && D.getMembership() && D.TIERS[D.getMembership().tier].offpeakIncluded) {
      consumed = null; // valle ilimitado del Albatross: no consume nada
    }
    var list = D.getBookings();
    list.push({
      dayKey: s.dayKey, dayLabel: s.dayLabel, bay: s.bay, hour: s.hour,
      member: !!D.getMembership(), consumed: consumed, price: q.price,
    });
    D.setBookings(list);
    var code = String(100000 + (D.hashCode(s.dayKey + s.bay + s.hour) % 900000));
    state.selected = null;
    render();
    confirmationEl.hidden = false;
    confirmationEl.innerHTML =
      "<h3 class='card__title'>" + T.confirmedTitle + "</h3>" +
      "<p class='card__text'>" + T.confirmedBody + "</p>" +
      "<p><code>" + code + "</code></p>" +
      "<p class='card__text'>" + (q.price === 0 ? T.payNoteIncl : T.payNote) + "</p>";
    confirmationEl.focus();
  });

  render();
})();
