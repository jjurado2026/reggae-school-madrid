/* =========================================================================
   Reggae School Madrid — propuesta
   Tres cosas y ninguna más: entrada de cajas, índice activo, menú y vídeo.
   Sin dependencias.
   ========================================================================= */
(function () {
  'use strict';

  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- 1. Entrada de las cajas, en ritmo one drop ---------------------- */
  // El retraso no es uniforme: dos casi a la vez y la tercera tarde.
  var COMPAS = [0, 60, 260];

  function revelar() {
    var piezas = document.querySelectorAll('.revelar');

    if (sinMovimiento.matches || !('IntersectionObserver' in window)) {
      piezas.forEach(function (p) { p.classList.add('visible'); });
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var i = Number(entrada.target.dataset.beat || 0);
        entrada.target.style.setProperty('--retraso', COMPAS[i % COMPAS.length] + 'ms');
        entrada.target.classList.add('visible');
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    piezas.forEach(function (p, i) {
      p.dataset.beat = i;
      observador.observe(p);
    });
  }

  /* ---- 2. Línea de índice: marca el curso que se está viendo ----------- */
  function indice() {
    var enlaces = Array.prototype.slice.call(
      document.querySelectorAll('.indice__pista a')
    );
    if (!enlaces.length || !('IntersectionObserver' in window)) return;

    var porId = {};
    var cajas = [];

    enlaces.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var caja = document.getElementById(id);
      if (!caja) return;
      porId[id] = a;
      cajas.push(caja);
    });

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        var a = porId[entrada.target.id];
        if (!a) return;
        if (entrada.isIntersecting) {
          enlaces.forEach(function (o) { o.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    cajas.forEach(function (c) { observador.observe(c); });
  }

  /* ---- 3. Menú en móvil ------------------------------------------------ */
  function menu() {
    var boton = document.getElementById('menu-boton');
    var nav = document.getElementById('nav');
    if (!boton || !nav) return;

    function cerrar() {
      nav.removeAttribute('data-abierto');
      boton.setAttribute('aria-expanded', 'false');
      boton.setAttribute('aria-label', 'Abrir menú');
    }

    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      if (abierto) {
        cerrar();
      } else {
        nav.setAttribute('data-abierto', 'true');
        boton.setAttribute('aria-expanded', 'true');
        boton.setAttribute('aria-label', 'Cerrar menú');
      }
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) cerrar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
        cerrar();
        boton.focus();
      }
    });
  }

  /* ---- 4. Vídeo: la miniatura pesa 40 KB, el reproductor 900 ----------- */
  function video() {
    var lanzar = document.querySelector('.video__lanzar');
    if (!lanzar) return;

    lanzar.addEventListener('click', function () {
      var id = lanzar.dataset.video;
      var marco = document.createElement('iframe');
      marco.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      marco.title = 'Reggae School Madrid: educación musical desde el reggae';
      marco.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
      marco.referrerPolicy = 'strict-origin-when-cross-origin';
      marco.allowFullscreen = true;
      lanzar.replaceWith(marco);
      marco.focus();
    });
  }

  /* ---- Arranque -------------------------------------------------------- */
  function iniciar() {
    revelar();
    indice();
    menu();
    video();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
