/* 24/7 Indoor Golf Club — DEMO del panel de administración (usa demo-core.js).
   Muestra el tee sheet del día, socios y cobros pendientes con datos del navegador
   + socios ficticios de relleno. */
(function () {
  "use strict";

  var root = document.getElementById("admin-demo");
  if (!root || !window.Demo247) return;
  var D = window.Demo247;
  var ES = D.ES;

  var T = ES
    ? {
        bay: "Bahía", busy: "Ocupado", freeShort: "—",
        you: "(este navegador)",
        pending: "pendiente", paid: "cobrada ✓",
        mark: "Marcar cuota cobrada",
        unmark: "Marcar pendiente",
        occupancy: "Ocupación del día",
        bookingsToday: "Reservas visibles",
        members: "Socios activos",
        pendingFees: "Cuotas pendientes",
      }
    : {
        bay: "Bay", busy: "Booked", freeShort: "—",
        you: "(this browser)",
        pending: "pending", paid: "collected ✓",
        mark: "Mark fee collected",
        unmark: "Mark pending",
        occupancy: "Today's occupancy",
        bookingsToday: "Visible bookings",
        members: "Active members",
        pendingFees: "Pending fees",
      };

  /* socios ficticios de relleno para que el panel luzca poblado */
  var FAKE_MEMBERS = ES
    ? [
        { name: "Marta G.", tier: "Fairway", feePaid: true },
        { name: "Jorge R.", tier: "Green", feePaid: true },
        { name: "Lucía P.", tier: "Albatross", feePaid: false },
      ]
    : [
        { name: "Marta G.", tier: "Fairway", feePaid: true },
        { name: "Jorge R.", tier: "Green", feePaid: true },
        { name: "Lucía P.", tier: "Albatross", feePaid: false },
      ];

  var state = { dayOffset: 0 };

  var daysEl = root.querySelector("[data-days]");
  var sheetEl = root.querySelector("[data-sheet]");
  var statsEl = root.querySelector("[data-stats]");
  var membersEl = root.querySelector("[data-members]");

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
        b.addEventListener("click", function () { state.dayOffset = i; render(); });
        daysEl.appendChild(b);
      })(i);
    }
  }

  function renderSheet() {
    var d = D.dayInfo(state.dayOffset);
    var user = D.getUser();
    var mine = D.getBookings();
    var total = 0, busy = 0;
    var html = '<div class="tee-sheet__head" aria-hidden="true"></div>';
    D.BAYS.forEach(function (bay) { html += '<div class="tee-sheet__head">' + T.bay + " " + bay + "</div>"; });
    sheetEl.innerHTML = html;
    D.HOURS.forEach(function (hour) {
      var t = document.createElement("div");
      t.className = "tee-sheet__time";
      t.textContent = D.pad(hour) + ":00";
      sheetEl.appendChild(t);
      D.BAYS.forEach(function (bay) {
        total++;
        var isMine = mine.some(function (b) { return b.dayKey === d.key && b.bay === bay && b.hour === hour; });
        var isBusy = D.isBusy(d.key, bay, hour);
        var cell = document.createElement("div");
        cell.className = "slot" + (isBusy ? " slot--peak" : "");
        cell.style.cursor = "default";
        if (isMine) {
          busy++;
          cell.className = "slot slot--selected";
          cell.textContent = (user && (user.name || user.email).split(" ")[0]) || "—";
        } else if (isBusy) {
          busy++;
          cell.textContent = T.busy;
          cell.style.opacity = "0.75";
        } else {
          cell.textContent = T.freeShort;
          cell.style.opacity = "0.4";
        }
        sheetEl.appendChild(cell);
      });
    });
    var m = D.getMembership();
    var pendingFees = FAKE_MEMBERS.filter(function (x) { return !x.feePaid; }).length + (m && !m.feePaid ? 1 : 0);
    var membersCount = FAKE_MEMBERS.length + (m ? 1 : 0);
    statsEl.innerHTML =
      "<div class='stat'><div class='stat__value'>" + Math.round((busy / total) * 100) + "%</div><div class='stat__label'>" + T.occupancy + "</div></div>" +
      "<div class='stat'><div class='stat__value'>" + busy + "</div><div class='stat__label'>" + T.bookingsToday + "</div></div>" +
      "<div class='stat'><div class='stat__value'>" + membersCount + "</div><div class='stat__label'>" + T.members + "</div></div>" +
      "<div class='stat'><div class='stat__value'>" + pendingFees + "</div><div class='stat__label'>" + T.pendingFees + "</div></div>";
  }

  function renderMembers() {
    membersEl.innerHTML = "";
    var m = D.getMembership();
    var u = D.getUser();
    var rows = FAKE_MEMBERS.slice();
    if (m && u) {
      rows.unshift({
        name: (u.name || u.email) + " " + T.you,
        tier: D.TIERS[m.tier].name,
        feePaid: !!m.feePaid,
        real: true,
      });
    }
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = r.name + " · " + r.tier + " · ";
      var estado = document.createElement("strong");
      estado.textContent = r.feePaid ? T.paid : T.pending;
      estado.style.color = r.feePaid ? "var(--c-accent-soft)" : "var(--c-cream)";
      span.appendChild(estado);
      li.appendChild(span);
      if (r.real) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--ghost btn--small";
        btn.textContent = r.feePaid ? T.unmark : T.mark;
        btn.addEventListener("click", function () {
          var mm = D.getMembership();
          mm.feePaid = !mm.feePaid;
          D.setMembership(mm);
          render();
        });
        li.appendChild(btn);
      }
      membersEl.appendChild(li);
    });
  }

  function render() {
    renderDays();
    renderSheet();
    renderMembers();
  }

  render();
})();
