/* =====================================================================
   Reggae School Madrid — v3 "RIDDIM" · interacciones
   Cabecera · menú · revelados · eco · mesa de mezclas · riddim ·
   compás · opiniones · vídeo · formulario en tres pasos.
   Solo transform y opacity. Respeta prefers-reduced-motion y ?ss.
   ===================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const html = document.documentElement;
  const captura = html.classList.contains('ss');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const quieto = () => captura || reducido.matches;

  /* ---------------- Entrada del hero ---------------- */
  const arrancar = () => requestAnimationFrame(() => {
    document.body.classList.add('cargada');
    const ecoHero = $('.hero [data-eco]');
    if (ecoHero) {
      ecoHero.style.setProperty('--retardo', quieto() ? '0ms' : '700ms');
      ecoHero.classList.add('suena');
    }
  });
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(arrancar);
  } else arrancar();

  /* ---------------- Revelado al entrar en pantalla ---------------- */
  const revelables = $$('[data-revela]');
  const ecos = $$('[data-eco]').filter(e => !e.closest('.hero'));
  if (captura || !('IntersectionObserver' in window)) {
    revelables.forEach(el => el.classList.add('visto'));
    ecos.forEach(el => el.classList.add('suena'));
  } else {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.hasAttribute('data-eco') ? 'suena' : 'visto');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    revelables.forEach(el => io.observe(el));
    ecos.forEach(el => { el.style.setProperty('--retardo', '300ms'); io.observe(el); });
  }

  /* ---------------- Cabecera: fondo, ocultar al bajar ---------------- */
  const cab = $('[data-cab]');
  const fija = $('[data-fija]');
  const hero = $('.hero');
  const reserva = $('#reserva');
  let yPrevia = window.scrollY, pendiente = false;

  function alDesplazar() {
    pendiente = false;
    const y = window.scrollY;
    const menuAbierto = document.body.classList.contains('menu-abierto');
    cab.classList.toggle('con-fondo', y > 12);
    if (!captura && !menuAbierto) {
      const bajando = y > yPrevia + 4, subiendo = y < yPrevia - 4;
      if (bajando && y > 480 && !cab.contains(document.activeElement)) cab.classList.add('oculta');
      else if (subiendo || y < 480) cab.classList.remove('oculta');
    }
    yPrevia = y;

    // Barra fija en móvil: tras el hero y fuera del formulario
    if (fija && hero && reserva) {
      const trasHero = hero.getBoundingClientRect().bottom < 0;
      const r = reserva.getBoundingClientRect();
      const enReserva = r.top < window.innerHeight * .85 && r.bottom > 0;
      const visible = !captura && trasHero && !enReserva && !menuAbierto;
      fija.classList.toggle('visible', visible);
      fija.setAttribute('aria-hidden', String(!visible));
      const enlace = $('a', fija);
      if (enlace) enlace.tabIndex = visible ? 0 : -1;
    }

    compas();
    sello(y);
  }
  window.addEventListener('scroll', () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(alDesplazar); }
  }, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(alDesplazar));

  // El sello del logo gira un poco con el scroll (decorativo)
  const selloImg = $('[data-sello]');
  function sello(y) {
    if (!selloImg || quieto()) return;
    const giro = -12 + Math.min(y, 900) * .045;
    selloImg.style.transform = `rotate(${giro}deg)`;
  }

  /* ---------------- Sección activa en la navegación ---------------- */
  const enlacesNav = $$('.nav__lista a');
  if ('IntersectionObserver' in window && enlacesNav.length) {
    const porId = new Map(enlacesNav.map(a => [a.getAttribute('href').slice(1), a]));
    const ioNav = new IntersectionObserver((entradas) => {
      entradas.forEach(e => {
        const a = porId.get(e.target.id);
        if (!a) return;
        if (e.isIntersecting) {
          enlacesNav.forEach(x => x.removeAttribute('aria-current'));
          a.setAttribute('aria-current', 'true');
        } else if (a.getAttribute('aria-current')) a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    porId.forEach((_, id) => { const s = document.getElementById(id); if (s) ioNav.observe(s); });
  }

  /* ---------------- Menú móvil ---------------- */
  const menu = $('[data-menu]');
  const menuBtn = $('[data-menu-abrir]');
  const menuTxt = $('.menu-btn__txt');

  function abrirMenu() {
    menu.hidden = false;
    document.body.classList.add('menu-abierto');
    cab.classList.remove('oculta');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuTxt.textContent = 'Cerrar';
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('abierto')));
    const primero = $('a', menu);
    if (primero) primero.focus({ preventScroll: true });
  }
  function cerrarMenu(devolverFoco = true) {
    menu.classList.remove('abierto');
    document.body.classList.remove('menu-abierto');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuTxt.textContent = 'Menú';
    const fin = () => { if (!menu.classList.contains('abierto')) menu.hidden = true; };
    if (quieto()) fin(); else setTimeout(fin, 240);
    if (devolverFoco) menuBtn.focus({ preventScroll: true });
    alDesplazar();
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', () => (menu.hidden ? abrirMenu() : cerrarMenu()));
    $$('[data-menu-enlace]', menu).forEach(a => a.addEventListener('click', () => cerrarMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) cerrarMenu();
      // Foco atrapado entre el botón y el menú mientras está abierto
      if (e.key === 'Tab' && !menu.hidden) {
        const enfocables = [menuBtn, ...$$('a, button', menu)];
        const i = enfocables.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); enfocables[enfocables.length - 1].focus(); }
        else if (!e.shiftKey && i === enfocables.length - 1) { e.preventDefault(); enfocables[0].focus(); }
      }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (m) => { if (m.matches && !menu.hidden) cerrarMenu(false); });
  }

  /* ---------------- Mesa de mezclas: ocho canales, ocho cursos ---------------- */
  const mesa = $('[data-mesa]');
  const canales = $$('[data-canal]');
  const cursos = $$('[data-curso]');
  const estado = $('[data-mesa-estado]');
  const nombres = {
    guitarra: 'Guitarra', bajo: 'Bajo', canto: 'Canto', saxo: 'Saxo', teclado: 'Teclado',
    bateria: 'Batería', produccion: 'Producción y mezcla', combo: 'Combo RSM'
  };
  const queSuena = {
    guitarra: 'Suena la guitarra en solo: el skank en el 2 y el 4',
    bajo: 'Suena el bajo en solo',
    bateria: 'Suena la batería en solo: el one drop, bombo en el 3',
    teclado: 'Suena el teclado en solo: la burbuja de órgano',
    produccion: 'Suena la mezcla con eco dub',
    canto: 'Suena el riddim completo, para cantar encima',
    saxo: 'Suena el riddim completo, para tocar encima',
    combo: 'Suena la banda entera'
  };
  let canalActual = 'guitarra';
  // El solo del riddim solo sigue a la mesa cuando el usuario elige un canal
  let canalAudio = null;

  function textoEstado() {
    if (!estado) return;
    const n = canales.findIndex(c => c.dataset.canal === canalActual) + 1;
    if (window.Riddim && window.Riddim.sonando) {
      estado.textContent = canalAudio ? queSuena[canalAudio] : 'Suena el riddim completo · toca un canal para oírlo en solo';
    } else {
      estado.textContent = `Canal ${String(n).padStart(2, '0')} · ${nombres[canalActual]}`;
    }
  }

  function seleccionar(nombre, { animar = true, enfocar = false, usuario = true } = {}) {
    const tab = canales.find(c => c.dataset.canal === nombre);
    if (!tab) return;
    canalActual = nombre;
    canales.forEach(c => {
      const activo = c === tab;
      c.setAttribute('aria-selected', String(activo));
      c.tabIndex = activo ? 0 : -1;
    });
    cursos.forEach(a => {
      const activo = a.dataset.curso === nombre;
      a.hidden = !activo;
      a.classList.remove('entra');
      if (activo && animar && !quieto()) { void a.offsetWidth; a.classList.add('entra'); }
    });
    if (enfocar) tab.focus();
    if (usuario) {
      canalAudio = nombre;
      if (window.Riddim) window.Riddim.canal(nombre);
    }
    textoEstado();
  }

  if (mesa && canales.length) {
    seleccionar('guitarra', { animar: false, usuario: false });

    canales.forEach((c, i) => {
      c.addEventListener('click', (e) => { e.preventDefault(); seleccionar(c.dataset.canal); });
      c.addEventListener('keydown', (e) => {
        const mapa = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: canales.length - 1 };
        if (!(e.key in mapa)) return;
        e.preventDefault();
        const j = (mapa[e.key] + canales.length) % canales.length;
        // Teclado: cambio inmediato, sin animación
        seleccionar(canales[j].dataset.canal, { animar: false, enfocar: true });
      });
    });

    // Enlaces a un curso concreto (pie, #curso-x en la URL)
    const irACanal = (nombre, suave = true) => {
      seleccionar(nombre, { animar: false });
      mesa.scrollIntoView({ behavior: suave && !quieto() ? 'smooth' : 'auto', block: 'start' });
    };
    $$('[data-ir-canal]').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      irACanal(a.dataset.irCanal);
      history.replaceState(null, '', a.getAttribute('href'));
    }));
    const hash = location.hash.replace('#curso-', '');
    if (nombres[hash] && hash !== 'combo') setTimeout(() => irACanal(hash, false), 60);
  }

  /* ---------------- El riddim: botones, vúmetros y altavoz ---------------- */
  const togglers = $$('[data-riddim-toggle]');
  const sonandoBox = $('[data-sonando]');
  const heroLabel = $('[data-riddim-label]');
  const mesaLabel = $('[data-riddim-label-corto]');
  const cono = $('[data-cono]');
  const anillos = $$('.altavoz__anillo');
  const eqBarras = $$('.sonando__eq i');
  const vus = new Map(canales.map(c => [c.dataset.canal, $('[data-vu]', c)]));

  if (!window.Riddim || !window.Riddim.soportado) {
    togglers.forEach(b => { b.hidden = true; });
  } else {
    togglers.forEach(b => b.addEventListener('click', () => {
      // Desde el hero suena siempre la banda entera; desde la mesa, lo que haya elegido
      if (!window.Riddim.sonando && b.classList.contains('riddim-btn')) {
        canalAudio = null;
        window.Riddim.canal(null);
      }
      window.Riddim.alternar();
    }));

    window.Riddim.alCambiar((suena) => {
      togglers.forEach(b => b.setAttribute('aria-pressed', String(suena)));
      if (heroLabel) heroLabel.textContent = suena ? 'Pausar el riddim' : 'Escucha un one drop';
      if (mesaLabel) mesaLabel.textContent = suena ? 'Pausa' : 'Riddim';
      if (mesa) mesa.classList.toggle('sonando-mesa', suena);
      if (sonandoBox) {
        if (suena) {
          sonandoBox.hidden = false;
          requestAnimationFrame(() => requestAnimationFrame(() => sonandoBox.classList.add('visible')));
        } else {
          sonandoBox.classList.remove('visible');
          setTimeout(() => { if (!window.Riddim.sonando) sonandoBox.hidden = true; }, 300);
        }
      }
      if (!suena) {
        vus.forEach(v => { if (v) v.style.transform = ''; });
        if (cono) cono.style.transform = '';
        anillos.forEach(a => { a.style.transform = ''; });
        eqBarras.forEach(b => { b.style.transform = ''; });
      }
      textoEstado();
    });

    window.Riddim.alNivel((n) => {
      const mezcla = Math.max(n.bateria, n.bajo, n.guitarra, n.teclado);
      const porCanal = {
        guitarra: n.guitarra, bajo: n.bajo, bateria: n.bateria, teclado: n.teclado,
        canto: 0, saxo: 0, produccion: mezcla, combo: mezcla
      };
      vus.forEach((v, k) => {
        if (!v) return;
        const nivel = Math.min(1, .04 + porCanal[k] * .92);
        v.style.transform = `scaleY(${nivel.toFixed(3)})`;
      });
      if (!reducido.matches) {
        if (cono) cono.style.transform = `scale(${(1 + n.bombo * .028).toFixed(4)})`;
        anillos.forEach((a, i) => {
          a.style.transform = `scale(${(1 + n.bombo * .035 * (i + 1)).toFixed(4)})`;
        });
      }
      const eq = [n.bateria, n.bajo, Math.max(n.guitarra, n.teclado)];
      eqBarras.forEach((b, i) => { b.style.transform = `scaleY(${(.2 + eq[i] * .8).toFixed(3)})`; });
    });
  }

  /* ---------------- El compás: el cabezal enciende cada tiempo ---------------- */
  const compasEl = $('.compas');
  const cabezal = $('[data-cabezal]');
  const tiempos = $$('[data-tiempo]');
  const escritorio = window.matchMedia('(min-width: 900px)');
  if (compasEl && !quieto()) compasEl.classList.add('vivo');

  function compas() {
    if (!compasEl || !compasEl.classList.contains('vivo')) return;
    const r = compasEl.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 cuando el compás asoma por abajo, 1 cuando su final pasa el 45 % de la pantalla
    const p = Math.min(1, Math.max(0, (vh * .78 - r.top) / (r.height * .9)));
    const linea = $('.compas__linea', compasEl);
    if (escritorio.matches) {
      cabezal.style.transform = `translateX(${(p * (linea.offsetWidth - 3)).toFixed(1)}px)`;
    } else {
      cabezal.style.transform = `translateY(${(p * (linea.offsetHeight - 3)).toFixed(1)}px)`;
    }
    tiempos.forEach((t, i) => t.classList.toggle('on', p >= (i + .08) / 4));
  }
  reducido.addEventListener('change', () => {
    if (!compasEl) return;
    compasEl.classList.toggle('vivo', !quieto());
    tiempos.forEach(t => t.classList.toggle('on', quieto()));
  });
  if (quieto()) tiempos.forEach(t => t.classList.add('on'));

  /* ---------------- Opiniones: desplazamiento con botones ---------------- */
  const pista = $('[data-opiniones]');
  const navOp = $('[data-opiniones-nav]');
  const cuenta = $('[data-opiniones-cuenta]');
  if (pista && navOp) {
    const tarjetas = $$('.opinion', pista);
    const [atras, alante] = $$('[data-opiniones-ir]', navOp);
    const indice = () => {
      const x = pista.scrollLeft;
      let mejor = 0, dist = Infinity;
      tarjetas.forEach((t, i) => {
        const d = Math.abs(t.offsetLeft - pista.offsetLeft - x - parseFloat(getComputedStyle(pista).paddingLeft || 0));
        if (d < dist) { dist = d; mejor = i; }
      });
      return mejor;
    };
    const actualizar = () => {
      const hayMas = pista.scrollWidth > pista.clientWidth + 4;
      navOp.hidden = !hayMas;
      const fin = pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 4;
      const i = fin ? tarjetas.length - 1 : indice();
      if (cuenta) cuenta.textContent = `${i + 1} / ${tarjetas.length}`;
      atras.disabled = pista.scrollLeft <= 4;
      alante.disabled = fin;
    };
    $$('[data-opiniones-ir]', navOp).forEach(b => b.addEventListener('click', () => {
      const i = Math.max(0, Math.min(tarjetas.length - 1, indice() + Number(b.dataset.opinionesIr)));
      const destino = tarjetas[i].offsetLeft - tarjetas[0].offsetLeft;
      pista.scrollTo({ left: destino, behavior: quieto() ? 'auto' : 'smooth' });
    }));
    let pend = false;
    pista.addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; actualizar(); }); } }, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  }

  /* ---------------- Vídeo: fachada ligera hasta el clic ---------------- */
  $$('[data-video]').forEach(btn => btn.addEventListener('click', () => {
    if (window.Riddim && window.Riddim.sonando) window.Riddim.parar();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.video}?autoplay=1&rel=0`;
    f.title = 'Presentación de Reggae School Madrid, con Javier Ochoa';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    btn.replaceWith(f);
    f.focus();
  }));

  /* ---------------- Formulario en tres pasos ---------------- */
  const form = $('[data-form]');
  if (form) {
    const pasos = $$('[data-paso]', form);
    const barra = $('[data-form-barra]', form);
    const pasoN = $('[data-form-paso-n]', form);
    const bAtras = $('[data-form-atras]', form);
    const bSig = $('[data-form-siguiente]', form);
    const bEnviar = $('[data-form-enviar]', form);
    const ok = $('[data-form-ok]', form);
    const resumen = $('[data-form-resumen]', form);
    let actual = 1;

    pasos.forEach(p => { p.tabIndex = -1; p.style.outline = 'none'; });

    function mostrar(n, direccion = 1) {
      actual = n;
      pasos.forEach(p => {
        const activo = Number(p.dataset.paso) === n;
        p.hidden = !activo;
        p.classList.remove('entra-d', 'entra-i');
        if (activo && !quieto()) { void p.offsetWidth; p.classList.add(direccion > 0 ? 'entra-d' : 'entra-i'); }
      });
      barra.style.transform = `scaleX(${n / 3})`;
      pasoN.textContent = `Paso ${n} de 3`;
      bAtras.hidden = n === 1;
      bSig.hidden = n === 3;
      bEnviar.hidden = n !== 3;
    }

    const error = (nombre, mostrarlo) => {
      const p = $(`[data-error="${nombre}"]`, form);
      if (p) p.hidden = !mostrarlo;
      $$(`[name="${nombre}"]`, form).forEach(i => {
        if (mostrarlo) { i.setAttribute('aria-invalid', 'true'); if (p) { p.id = p.id || `err-${nombre}`; i.setAttribute('aria-describedby', p.id); } }
        else { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); }
      });
    };
    const valor = (nombre) => {
      const els = $$(`[name="${nombre}"]`, form);
      if (!els.length) return '';
      if (els[0].type === 'radio') { const c = els.find(e => e.checked); return c ? c.value : ''; }
      if (els[0].type === 'checkbox') return els[0].checked ? 'si' : '';
      return els[0].value.trim();
    };
    const reglas = {
      1: ['instrumento'],
      2: ['modalidad', 'frecuencia'],
      3: ['nombre', 'email', 'rgpd']
    };
    function valido(n) {
      let primero = null;
      reglas[n].forEach(campo => {
        let v = valor(campo);
        let bien = !!v;
        if (campo === 'email') bien = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        error(campo, !bien);
        if (!bien && !primero) primero = $(`[name="${campo}"]`, form);
      });
      if (primero) primero.focus();
      return !primero;
    }

    // Al corregir, el error desaparece
    form.addEventListener('change', (e) => { if (e.target.name) error(e.target.name, false); });
    form.addEventListener('input', (e) => { if (e.target.name && e.target.getAttribute('aria-invalid')) error(e.target.name, false); });

    bSig.addEventListener('click', () => {
      if (!valido(actual)) return;
      mostrar(actual + 1, 1);
      pasos[actual - 1].focus({ preventScroll: true });
    });
    bAtras.addEventListener('click', () => {
      mostrar(actual - 1, -1);
      pasos[actual - 1].focus({ preventScroll: true });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (actual < 3) { bSig.click(); return; }
      if (!valido(3)) return;
      const inst = valor('instrumento'), mod = valor('modalidad').toLowerCase(), frec = valor('frecuencia').toLowerCase();
      resumen.textContent = `Sesión de prueba de ${inst.toLowerCase() === 'combo rsm' ? 'Combo RSM' : inst.toLowerCase()}, ${mod} y ${frec}. La escuela te escribirá a ${valor('email')} para cerrar día y hora.`;
      form.classList.add('enviado');
      ok.hidden = false;
      ok.focus();
    });

    // Botones "Me interesa" / "Prueba una clase de…" rellenan el formulario
    $$('[data-reserva]').forEach(a => a.addEventListener('click', () => {
      const inst = a.dataset.instrumento, frec = a.dataset.frecuencia;
      if (form.classList.contains('enviado')) return;
      if (inst) { const r = $(`[name="instrumento"][value="${inst}"]`, form); if (r) { r.checked = true; error('instrumento', false); } }
      if (frec) { const r = $(`[name="frecuencia"][value="${frec}"]`, form); if (r) { r.checked = true; error('frecuencia', false); } }
      if (inst && actual === 1) mostrar(2, 1);
    }));

    mostrar(1, 0);
    pasos.forEach(p => p.classList.remove('entra-d', 'entra-i'));
  }

  alDesplazar();
})();
