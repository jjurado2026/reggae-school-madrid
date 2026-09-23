/* =========================================================================
   Reggae School Madrid — propuesta v2
   Motor de interacción. Sin dependencias.
   ========================================================================= */
(function () {
  'use strict';

  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raiz = document.documentElement;

  /* ---------------------------------------------------------------------
     1 · Secuencia de carga del hero
     Una sola vez, orquestada: la cortina se retira, el titular sube línea
     a línea, y el resto entra escalonado.
  --------------------------------------------------------------------- */
  function arranque() {
    var hero = document.querySelector('[data-hero]');
    if (!hero) return;

    var pintar = function () {
      raiz.classList.add('cargado');
      hero.classList.add('dentro');
    };

    if (quieto) { pintar(); return; }

    // Espera a que la imagen del hero esté lista, con tope de 900 ms
    var img = hero.querySelector('[data-hero-img]');
    var lanzado = false;
    var lanzar = function () {
      if (lanzado) return;
      lanzado = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(pintar);
      });
    };

    if (img && !img.complete) {
      img.addEventListener('load', lanzar, { once: true });
      img.addEventListener('error', lanzar, { once: true });
    }
    setTimeout(lanzar, 900);
  }

  /* ---------------------------------------------------------------------
     2 · Revelado al entrar en viewport
     Escalonado en compás: dos seguidos y el tercero con retraso (one drop).
  --------------------------------------------------------------------- */
  var COMPAS = [0, 90, 300];

  function revelado() {
    var piezas = document.querySelectorAll('[data-revela], .cortina');
    if (!piezas.length) return;

    if (quieto || !('IntersectionObserver' in window)) {
      piezas.forEach(function (p) { p.classList.add('dentro'); });
      return;
    }

    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (!el.style.getPropertyValue('--retraso')) {
          var i = Number(el.dataset.beat || 0);
          el.style.setProperty('--retraso', COMPAS[i % COMPAS.length] + 'ms');
        }
        el.classList.add('dentro');
        ojo.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    piezas.forEach(function (p, i) {
      if (!p.dataset.beat) p.dataset.beat = i;
      ojo.observe(p);
    });
  }

  /* ---------------------------------------------------------------------
     3 · Cabecera: se compacta al bajar
  --------------------------------------------------------------------- */
  function cabecera() {
    var cab = document.querySelector('[data-cabecera]');
    if (!cab) return;
    var ultimo = 0, pendiente = false;

    function mirar() {
      var y = window.scrollY;
      cab.classList.toggle('compacta', y > 80);
      cab.classList.toggle('oculta', y > 420 && y > ultimo);
      ultimo = y;
      pendiente = false;
    }
    window.addEventListener('scroll', function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(mirar);
    }, { passive: true });
    mirar();
  }

  /* ---------------------------------------------------------------------
     4 · Menú en móvil
  --------------------------------------------------------------------- */
  function menu() {
    var boton = document.querySelector('[data-menu-boton]');
    var nav = document.querySelector('[data-nav]');
    if (!boton || !nav) return;

    function cerrar() {
      nav.removeAttribute('data-abierto');
      boton.setAttribute('aria-expanded', 'false');
      boton.setAttribute('aria-label', 'Abrir menú');
      document.body.style.removeProperty('overflow');
    }
    function abrir() {
      nav.setAttribute('data-abierto', 'true');
      boton.setAttribute('aria-expanded', 'true');
      boton.setAttribute('aria-label', 'Cerrar menú');
      document.body.style.overflow = 'hidden';
    }

    boton.addEventListener('click', function () {
      boton.getAttribute('aria-expanded') === 'true' ? cerrar() : abrir();
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) cerrar();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
        cerrar(); boton.focus();
      }
    });
  }

  /* ---------------------------------------------------------------------
     5 · Índice de cursos: marca el que se está viendo
  --------------------------------------------------------------------- */
  function indice() {
    var enlaces = [].slice.call(document.querySelectorAll('[data-indice] a'));
    if (!enlaces.length || !('IntersectionObserver' in window)) return;

    var mapa = {}, dianas = [];
    enlaces.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      mapa[id] = a;
      dianas.push(el);
    });

    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var a = mapa[e.target.id];
        if (a && e.isIntersecting) {
          enlaces.forEach(function (o) { o.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
          // mantiene el activo a la vista en la tira horizontal
          var pista = a.parentElement;
          if (pista && pista.scrollWidth > pista.clientWidth) {
            var dx = a.offsetLeft - pista.clientWidth / 2 + a.clientWidth / 2;
            pista.scrollTo({ left: dx, behavior: quieto ? 'auto' : 'smooth' });
          }
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    dianas.forEach(function (d) { ojo.observe(d); });
  }

  /* ---------------------------------------------------------------------
     6 · Vídeo: la miniatura pesa 40 KB, el reproductor 900
  --------------------------------------------------------------------- */
  function video() {
    document.querySelectorAll('[data-video]').forEach(function (lanzar) {
      lanzar.addEventListener('click', function () {
        var marco = document.createElement('iframe');
        marco.src = 'https://www.youtube-nocookie.com/embed/' +
          lanzar.dataset.video + '?autoplay=1&rel=0';
        marco.title = 'Reggae School Madrid: educación musical desde el reggae';
        marco.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
        marco.referrerPolicy = 'strict-origin-when-cross-origin';
        marco.allowFullscreen = true;
        marco.className = 'video__marco';
        lanzar.replaceWith(marco);
        marco.focus();
      });
    });
  }

  /* ---------------------------------------------------------------------
     7 · Claustro: el retrato sigue a la biografía que se está leyendo
  --------------------------------------------------------------------- */
  function claustro() {
    var bios = [].slice.call(document.querySelectorAll('[data-prof-id]'));
    var retratos = {};
    document.querySelectorAll('[data-prof]').forEach(function (r) {
      retratos[r.dataset.prof] = r;
    });
    if (!bios.length || !Object.keys(retratos).length) return;

    function marcar(id) {
      Object.keys(retratos).forEach(function (k) {
        retratos[k].classList.toggle('activo', k === id);
      });
    }
    marcar(bios[0].dataset.profId);

    if (!('IntersectionObserver' in window)) return;

    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) marcar(e.target.dataset.profId);
      });
    }, { rootMargin: '-40% 0px -45% 0px' });

    bios.forEach(function (b) { ojo.observe(b); });
  }

  /* ---------------------------------------------------------------------
     8 · Acordeón de preguntas
  --------------------------------------------------------------------- */
  function preguntas() {
    var grupo = document.querySelector('[data-faq]');
    if (!grupo) return;
    grupo.addEventListener('click', function (e) {
      var resumen = e.target.closest('summary');
      if (!resumen) return;
      var abierto = resumen.parentElement;
      grupo.querySelectorAll('details[open]').forEach(function (d) {
        if (d !== abierto) d.removeAttribute('open');
      });
    });
  }

  /* ---------------------------------------------------------------------
     Arranque
  --------------------------------------------------------------------- */
  function iniciar() {
    arranque();
    revelado();
    cabecera();
    menu();
    indice();
    video();
    claustro();
    preguntas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
