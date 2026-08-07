/* 24/7 Indoor Golf Club — efectos visuales: parallax, reveal al hacer scroll y lightbox.
   Todo se desactiva si el usuario prefiere movimiento reducido. */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ES = (document.documentElement.lang || "").indexOf("es") === 0;

  /* ---------- 1. Reveal al entrar en pantalla ----------
     Regla de oro: el contenido NUNCA puede quedarse invisible. Si no hay
     IntersectionObserver, si el usuario prefiere no ver movimiento, si el
     viewport no reporta altura o si algo tarda demasiado, se muestra todo. */
  var revealables = [].slice.call(document.querySelectorAll("[data-reveal]"));

  function revealAll() {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  }

  if (reduced || !("IntersectionObserver" in window) || !window.innerHeight) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
    /* red de seguridad: si en 2,5 s no se ha revelado nada, mostrar todo */
    window.setTimeout(function () {
      if (!document.querySelector("[data-reveal].is-in")) revealAll();
    }, 2500);
  }

  /* ---------- 2. Parallax ---------- */
  var layers = [].slice.call(document.querySelectorAll("[data-parallax]"));
  if (!reduced && layers.length) {
    var visible = [];
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var host = e.target;
        var i = visible.indexOf(host);
        if (e.isIntersecting && i === -1) visible.push(host);
        else if (!e.isIntersecting && i > -1) visible.splice(i, 1);
      });
      if (visible.length) request();
    }, { threshold: 0 });

    layers.forEach(function (l) { pio.observe(l.parentElement || l); });

    var ticking = false;
    function request() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      layers.forEach(function (layer) {
        var host = layer.parentElement || layer;
        if (visible.indexOf(host) === -1) return;
        var rect = host.getBoundingClientRect();
        var speed = parseFloat(layer.getAttribute("data-parallax")) || 0.25;
        /* -1 (host bajo la pantalla) .. 1 (host por encima) */
        var progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        var shift = -progress * speed * rect.height * 0.5;
        layer.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
      });
    }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    request();
  }

  /* ---------- 3. Lightbox de capturas ---------- */
  var shots = document.querySelectorAll("button.shot[data-full]");
  if (shots.length) {
    var box = null, lastFocus = null;

    function close() {
      if (!box) return;
      document.removeEventListener("keydown", onKey);
      box.remove();
      box = null;
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    function open(src, caption) {
      close();
      lastFocus = document.activeElement;
      box = document.createElement("div");
      box.className = "lightbox";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", caption || (ES ? "Imagen ampliada" : "Enlarged image"));
      box.innerHTML =
        '<button type="button" class="lightbox__close" aria-label="' +
        (ES ? "Cerrar" : "Close") + '">×</button>' +
        '<img src="' + src + '" alt="' + (caption || "").replace(/"/g, "&quot;") + '">' +
        (caption ? '<p class="lightbox__caption">' + caption + "</p>" : "");
      document.body.appendChild(box);
      document.body.style.overflow = "hidden";
      box.querySelector(".lightbox__close").addEventListener("click", close);
      box.addEventListener("click", function (e) { if (e.target === box) close(); });
      document.addEventListener("keydown", onKey);
      box.querySelector(".lightbox__close").focus();
    }

    shots.forEach(function (btn) {
      btn.addEventListener("click", function () {
        open(btn.getAttribute("data-full"), btn.getAttribute("data-caption") || "");
      });
    });
  }
})();
