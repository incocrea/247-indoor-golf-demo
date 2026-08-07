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
      /* 1) leer TODAS las medidas y 2) escribir después: evita layout thrashing */
      var reads = [];
      layers.forEach(function (layer) {
        var host = layer.parentElement || layer;
        if (visible.indexOf(host) === -1) return;
        var rect = host.getBoundingClientRect();
        reads.push({ layer: layer, top: rect.top, height: rect.height });
      });
      reads.forEach(function (r) {
        var speed = parseFloat(r.layer.getAttribute("data-parallax")) || 0.25;
        /* -1 (host bajo la pantalla) .. 1 (host por encima) */
        var progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        var shift = -progress * speed * r.height * 0.5;
        r.layer.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
      });
    }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    request();
  }

  /* ---------- 3. Fondos con carga diferida ([data-bg]) ----------
     Evita descargar imágenes de fondo pesadas que el visitante quizá nunca vea. */
  var lazyBgs = [].slice.call(document.querySelectorAll("[data-bg]"));
  if (lazyBgs.length) {
    var canImageSet = window.CSS && CSS.supports &&
      CSS.supports("background-image", 'image-set(url("a.webp") type("image/webp"))');

    function paint(el) {
      var base = el.getAttribute("data-bg");
      el.style.backgroundImage = canImageSet
        ? 'image-set(url("' + base + '.webp") type("image/webp"), url("' + base + '.jpg") type("image/jpeg"))'
        : 'url("' + base + '.jpg")';
      el.removeAttribute("data-bg");
    }

    if (!("IntersectionObserver" in window) || !window.innerHeight) {
      lazyBgs.forEach(paint);
    } else {
      var bgio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { paint(e.target); bgio.unobserve(e.target); }
        });
      }, { rootMargin: "400px 0px" });
      lazyBgs.forEach(function (el) { bgio.observe(el); });
      window.setTimeout(function () {
        lazyBgs.forEach(function (el) { if (el.hasAttribute("data-bg")) paint(el); });
      }, 4000);
    }
  }

  /* ---------- 4. Lightbox de capturas ---------- */
  var shots = document.querySelectorAll("button.shot[data-full]");
  if (shots.length) {
    var box = null, lastFocus = null;

    var inerted = [];

    function close() {
      if (!box) return;
      document.removeEventListener("keydown", onKey);
      box.remove();
      box = null;
      /* devolver el resto de la página a la navegación por teclado */
      inerted.forEach(function (el) { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); });
      inerted = [];
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      /* Trampa de foco: dentro del diálogo solo hay un elemento focalizable,
         así que el tabulador siempre vuelve a él y nunca sale por detrás. */
      if (e.key === "Tab" && box) {
        e.preventDefault();
        box.querySelector(".lightbox__close").focus();
      }
    }

    var lbSeq = 0;

    function open(src, caption, alt) {
      close();
      lastFocus = document.activeElement;
      lbSeq++;
      var capId = "lightbox-caption-" + lbSeq;
      box = document.createElement("div");
      box.className = "lightbox";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      if (caption) box.setAttribute("aria-labelledby", capId);
      else box.setAttribute("aria-label", ES ? "Imagen ampliada" : "Enlarged image");
      box.innerHTML =
        '<button type="button" class="lightbox__close" aria-label="' +
        (ES ? "Cerrar" : "Close") + '">×</button>' +
        '<img src="' + src + '" alt="' + (alt || caption || "").replace(/"/g, "&quot;") + '">' +
        (caption ? '<p class="lightbox__caption" id="' + capId + '">' + caption + "</p>" : "");
      /* el resto de la página deja de ser navegable mientras el diálogo está abierto */
      [].slice.call(document.body.children).forEach(function (el) {
        if (el !== box && !el.hasAttribute("inert")) {
          el.setAttribute("inert", "");
          el.setAttribute("aria-hidden", "true");
          inerted.push(el);
        }
      });
      document.body.appendChild(box);
      document.body.style.overflow = "hidden";
      box.querySelector(".lightbox__close").addEventListener("click", close);
      box.addEventListener("click", function (e) { if (e.target === box) close(); });
      document.addEventListener("keydown", onKey);
      box.querySelector(".lightbox__close").focus();
    }

    shots.forEach(function (btn) {
      btn.addEventListener("click", function () {
        /* Reutiliza el archivo que el navegador ya eligió y cacheó (WebP o JPEG):
           misma resolución, cero descargas nuevas. */
        var img = btn.querySelector("img");
        var src = (img && img.currentSrc) || btn.getAttribute("data-full");
        open(src, btn.getAttribute("data-caption") || "", img && img.alt);
      });
    });
  }
})();
