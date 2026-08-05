/* 24/7 Indoor Golf Club — DEMO de Mi cuenta: identificación, membresía y reservas.
   Usa demo-core.js; estado en localStorage (sin backend real). */
(function () {
  "use strict";

  var root = document.getElementById("account-demo");
  if (!root || !window.Demo247) return;
  var D = window.Demo247;
  var ES = D.ES;

  var T = ES
    ? {
        joined: function (t) { return "¡Bienvenido al club! Membresía <strong>" + t + "</strong> creada. La cuota se paga en el club (datáfono o Zelle); el equipo la marcará como cobrada."; },
        feePending: "Cuota del mes: <strong>pendiente de cobro en el club</strong>",
        feePaid: "Cuota del mes: <strong>cobrada ✓</strong>",
        perMonth: "/mes",
        change: "Cambiar a este plan",
        current: "Tu plan actual",
        join: "Alta en este plan (demo)",
        cancelM: "Darme de baja (demo)",
        cancelledM: "Membresía cancelada. Puedes darte de alta de nuevo cuando quieras.",
        logout: "Cerrar sesión (demo)",
        bay: "Bahía",
        none: "Todavía no tienes reservas en esta demo.",
        cancel: "Cancelar",
        cancelledB: "Reserva cancelada. Las horas incluidas vuelven a tu saldo.",
        who: { guest: "Invitado", member: "Socio" },
        noMember: "Aún no eres socio. Elige un plan y juega por menos:",
      }
    : {
        joined: function (t) { return "Welcome to the club! <strong>" + t + "</strong> membership created. The fee is paid at the club (card terminal or Zelle); staff will mark it as collected."; },
        feePending: "This month's fee: <strong>pending collection at the club</strong>",
        feePaid: "This month's fee: <strong>collected ✓</strong>",
        perMonth: "/month",
        change: "Switch to this plan",
        current: "Your current plan",
        join: "Join this plan (demo)",
        cancelM: "Cancel membership (demo)",
        cancelledM: "Membership cancelled. You can rejoin any time.",
        logout: "Log out (demo)",
        bay: "Bay",
        none: "No bookings in this demo yet.",
        cancel: "Cancel",
        cancelledB: "Booking cancelled. Included hours go back to your balance.",
        who: { guest: "Guest", member: "Member" },
        noMember: "You're not a member yet. Pick a plan and play for less:",
      };

  var authEl = root.querySelector("[data-auth]");
  var panelEl = root.querySelector("[data-panel]");
  var helloEl = root.querySelector("[data-hello]");
  var memberEl = root.querySelector("[data-membercard]");
  var tiersEl = root.querySelector("[data-tiers]");
  var listEl = root.querySelector("[data-list]");
  var statusEl = root.querySelector("[data-status]");

  function joinParam() {
    var m = /[?&]join=([a-z]+)/.exec(location.search);
    return m && D.TIERS[m[1]] ? m[1] : null;
  }

  function renderMemberCard() {
    var s = D.membershipSummary();
    if (!s) {
      memberEl.innerHTML = "<p class='card__text'>" + T.noMember + "</p>";
      return;
    }
    memberEl.innerHTML =
      "<p class='demo-panel__total'>" + s.tierName + " · " + D.euros(s.fee) + T.perMonth + "</p>" +
      "<p class='card__text'>" + s.detail + "</p>" +
      "<p class='card__text'>" + (s.feePaid ? T.feePaid : T.feePending) + "</p>" +
      "<p style='margin-top:0.75rem'><button type='button' class='btn btn--ghost btn--small' data-cancel-membership>" + T.cancelM + "</button></p>";
    memberEl.querySelector("[data-cancel-membership]").addEventListener("click", function () {
      D.cancelMembership();
      statusEl.textContent = T.cancelledM;
      render();
    });
  }

  function renderTiers() {
    var m = D.getMembership();
    tiersEl.innerHTML = "";
    Object.keys(D.TIERS).forEach(function (id) {
      var t = D.TIERS[id];
      var div = document.createElement("div");
      div.className = "card price-card";
      var detail = t.offpeakIncluded
        ? (ES ? "Valle ilimitado + " + t.peak + " h punta" : "Unlimited off-peak + " + t.peak + " peak h")
        : (ES ? t.hours + " h incluidas/mes" : t.hours + " included h/month");
      var isCurrent = m && m.tier === id;
      div.innerHTML =
        "<h3 class='card__title'>" + t.name + "</h3>" +
        "<p class='price-card__price'>" + D.euros(t.fee) + "<small>" + T.perMonth + "</small></p>" +
        "<p class='card__text'>" + detail + "</p>" +
        "<p style='margin-top:1rem'>" +
        (isCurrent
          ? "<span class='booking-embed__badge'>" + T.current + "</span>"
          : "<button type='button' class='btn btn--primary btn--small' data-join='" + id + "'>" + (m ? T.change : T.join) + "</button>") +
        "</p>";
      tiersEl.appendChild(div);
    });
    tiersEl.querySelectorAll("[data-join]").forEach(function (b) {
      b.addEventListener("click", function () {
        var mm = D.joinTier(b.getAttribute("data-join"));
        statusEl.innerHTML = T.joined(D.TIERS[mm.tier].name);
        render();
      });
    });
  }

  function renderBookings() {
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
        statusEl.textContent = T.cancelledB;
        render();
      });
      li.appendChild(span);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function render() {
    var u = D.getUser();
    if (!u) {
      authEl.hidden = false;
      panelEl.hidden = true;
      return;
    }
    authEl.hidden = true;
    panelEl.hidden = false;
    helloEl.textContent = (u.name || u.email) + " · " + u.email;
    renderMemberCard();
    renderTiers();
    renderBookings();
  }

  /* identificación (sin contraseña: es una demo) */
  var form = root.querySelector("form[data-login]");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.querySelector("[name=name]").value.trim();
    var email = form.querySelector("[name=email]").value.trim();
    if (!email) return;
    D.setUser({ name: name, email: email });
    var j = joinParam();
    if (j && !D.getMembership()) {
      var mm = D.joinTier(j);
      statusEl.innerHTML = T.joined(D.TIERS[mm.tier].name);
    }
    render();
  });

  root.querySelector("[data-logout]").addEventListener("click", function () {
    D.logout();
    render();
  });

  /* si llega con ?join= y ya está identificado, alta directa */
  var j = joinParam();
  if (j && D.getUser() && !D.getMembership()) {
    var mm = D.joinTier(j);
    statusEl.innerHTML = T.joined(D.TIERS[mm.tier].name);
  }

  render();
})();
