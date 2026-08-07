/* 24/7 Indoor Golf Club — interacciones básicas */
(function () {
  "use strict";

  /* Menú móvil */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("main-nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Acordeón FAQ */
  document.querySelectorAll(".faq__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".faq__item");
      var open = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* Formularios dummy: sin backend todavía */
  var isSpanish = (document.documentElement.lang || "").indexOf("es") === 0;
  document.querySelectorAll("form[data-dummy]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form__feedback");
      if (!note) {
        note = document.createElement("p");
        note.className = "form__note form__feedback";
        note.setAttribute("role", "status");
        form.appendChild(note);
      }
      note.textContent = isSpanish
        ? "✅ Mensaje recibido. Te responderemos muy pronto."
        : "✅ Message received. We'll get back to you shortly.";
    });
  });

  /* Año en el pie */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
