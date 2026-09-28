/* =====================================================================
   Riddim — un one drop sintetizado con Web Audio, sin archivos de audio.
   75 BPM, dos compases en La menor / Sol. Cuatro capas que corresponden a
   cuatro canales de la mesa: batería, bajo, guitarra (skank) y teclado
   (burbuja de órgano). El canal "Producción" añade un eco dub.
   Nunca suena solo: arranca únicamente con un clic del usuario.

   API: window.Riddim = { soportado, sonando, alternar(), parar(),
        canal(nombre), alCambiar(fn), alNivel(fn) }
   ===================================================================== */
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const BPM = 75;
  const SEMI = 60 / BPM / 4;            // semicorchea = 0,2 s
  const PASOS = 32;                      // dos compases de 16
  const ANTICIPO = 0.12;                 // s que se programan por delante
  const CAPAS = ['bateria', 'bajo', 'guitarra', 'teclado'];

  const f = m => 440 * Math.pow(2, (m - 69) / 12);

  // --- Partitura (paso: [nota MIDI, duración en semicorcheas]) ---
  const BAJO = {
    0: [45, 4], 6: [45, 1], 7: [48, 1], 8: [52, 3], 12: [50, 2], 14: [48, 2],
    16: [43, 4], 22: [43, 1], 23: [47, 1], 24: [50, 3], 28: [48, 2], 30: [47, 2]
  };
  const SKANK = { a: [69, 72, 76], b: [67, 71, 74] };      // Lam · Sol, agudo
  const BURBUJA = { a: [57, 60, 64], b: [55, 59, 62] };    // Lam · Sol, medio

  let ctx = null, master, buses = {}, ecoEntrada, ruido;
  let reloj = null, siguiente = 0, paso = 0;
  let sonando = false, canalActual = null, raf = 0;
  const env = { bombo: 0, bateria: 0, bajo: 0, guitarra: 0, teclado: 0 };
  const cola = [];
  const oyentesCambio = new Set(), oyentesNivel = new Set();

  function montar() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const cuerpo = ctx.createBiquadFilter();
    cuerpo.type = 'lowshelf'; cuerpo.frequency.value = 110; cuerpo.gain.value = 4;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .005; comp.release.value = .2;
    master.connect(cuerpo).connect(comp).connect(ctx.destination);

    CAPAS.forEach(c => {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(master);
      buses[c] = g;
    });

    // Eco dub: corchea con puntillo, realimentado y oscureciéndose
    ecoEntrada = ctx.createGain();
    ecoEntrada.gain.value = 0;
    const retardo = ctx.createDelay(2);
    retardo.delayTime.value = SEMI * 3;
    const realim = ctx.createGain();
    realim.gain.value = .5;
    const paso1 = ctx.createBiquadFilter(); paso1.type = 'lowpass'; paso1.frequency.value = 2400;
    const paso2 = ctx.createBiquadFilter(); paso2.type = 'highpass'; paso2.frequency.value = 280;
    ecoEntrada.connect(retardo);
    retardo.connect(paso1).connect(paso2);
    paso2.connect(realim).connect(retardo);
    paso2.connect(master);

    // Ruido blanco para platos y aro
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    aplicarCanal(false);
  }

  // --- Instrumentos ---
  function envolvente(g, t, pico, ataque, caida) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  }

  function bombo(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + .14);
    envolvente(g, t, 1, .004, .42);
    o.connect(g).connect(buses.bateria);
    o.start(t); o.stop(t + .5);
    marcar(t, 'bombo', 1); marcar(t, 'bateria', 1);
  }

  function aro(t, vol = .55) {
    const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = ruido;
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 2.2;
    envolvente(g, t, vol, .002, .07);
    n.connect(bp).connect(g);
    g.connect(buses.bateria);
    g.connect(ecoEntrada);
    const o = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 820;
    envolvente(g2, t, vol * .5, .002, .04);
    o.connect(g2).connect(buses.bateria);
    n.start(t); n.stop(t + .12); o.start(t); o.stop(t + .08);
  }

  function charles(t, vol, abierto = false) {
    const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = ruido;
    hp.type = 'highpass'; hp.frequency.value = 7200;
    envolvente(g, t, vol, .002, abierto ? .22 : .045);
    n.connect(hp).connect(g).connect(buses.bateria);
    n.start(t); n.stop(t + .3);
    marcar(t, 'bateria', Math.min(.55, vol * 3.2));
  }

  function bajo(t, nota, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    const lp = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f(nota);
    o2.type = 'triangle'; o2.frequency.value = f(nota + 12);
    g2.gain.value = .18;
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .7;
    const fin = t + dur * SEMI * .92;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.95, t + .012);
    g.gain.setValueAtTime(.85, fin - .04);
    g.gain.exponentialRampToValueAtTime(0.0001, fin + .06);
    o.connect(lp); o2.connect(g2).connect(lp);
    lp.connect(g).connect(buses.bajo);
    o.start(t); o2.start(t); o.stop(fin + .1); o2.stop(fin + .1);
    marcar(t, 'bajo', 1);
  }

  function acorde(t, notas, tipo, destino, corte, vol, caida, conEco) {
    const bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = tipo === 'sawtooth' ? 'bandpass' : 'lowpass';
    bp.frequency.value = corte; bp.Q.value = tipo === 'sawtooth' ? .9 : .5;
    envolvente(g, t, vol, .004, caida);
    notas.forEach(n => {
      const o = ctx.createOscillator();
      o.type = tipo; o.frequency.value = f(n);
      o.detune.value = (Math.random() - .5) * 8;
      o.connect(bp);
      o.start(t); o.stop(t + caida + .05);
    });
    bp.connect(g);
    g.connect(buses[destino]);
    if (conEco) g.connect(ecoEntrada);
  }

  // --- Secuenciador ---
  function programar(p, t) {
    const enCompas = p % 16;
    const acordeClave = p < 16 ? 'a' : 'b';
    const swing = enCompas % 4 === 2 ? SEMI * .18 : 0;

    // Batería: one drop — bombo y aro juntos en el tiempo 3
    if (enCompas === 8) { bombo(t); aro(t); }
    if (p === 30) aro(t, .22);
    if (enCompas % 2 === 0) charles(t + swing, enCompas % 4 === 2 ? .16 : .09, p === 30);

    // Bajo
    if (BAJO[p]) bajo(t, BAJO[p][0], BAJO[p][1]);

    // Guitarra: skank en el 2 y el 4
    if (enCompas === 4 || enCompas === 12) {
      acorde(t, SKANK[acordeClave], 'sawtooth', 'guitarra', 1700, .16, .09, true);
      marcar(t, 'guitarra', 1);
    }

    // Teclado: burbuja de órgano a contratiempo
    if (enCompas % 4 === 2) {
      acorde(t + swing, BURBUJA[acordeClave], 'square', 'teclado', 1300, .07, .12, false);
      marcar(t + swing, 'teclado', .8);
    }
  }

  function marcar(t, capa, v) { cola.push({ t, capa, v }); }

  function motor() {
    while (siguiente < ctx.currentTime + ANTICIPO) {
      programar(paso, siguiente);
      siguiente += SEMI;
      paso = (paso + 1) % PASOS;
    }
  }

  // Niveles para la interfaz: picos que caen, escalados por la ganancia del bus
  let ultimo = 0;
  function pintar(ahora) {
    const dt = Math.min(.1, (ahora - (ultimo || ahora)) / 1000);
    ultimo = ahora;
    const t = ctx.currentTime;
    while (cola.length && cola[0].t <= t) {
      const e = cola.shift();
      env[e.capa] = Math.max(env[e.capa], e.v);
    }
    const caida = Math.pow(.02, dt);       // ~ -34 dB por segundo
    for (const k in env) env[k] *= caida;
    const ganancias = {};
    CAPAS.forEach(c => { ganancias[c] = buses[c].gain.value; });
    const niveles = {
      bombo: env.bombo * ganancias.bateria,
      bateria: env.bateria * ganancias.bateria,
      bajo: env.bajo * ganancias.bajo,
      guitarra: env.guitarra * ganancias.guitarra,
      teclado: env.teclado * ganancias.teclado
    };
    oyentesNivel.forEach(fn => fn(niveles));
    raf = requestAnimationFrame(pintar);
  }

  // --- Mezcla según el canal elegido en la mesa ---
  function aplicarCanal(suave = true) {
    if (!ctx) return;
    const solo = { guitarra: 'guitarra', bajo: 'bajo', bateria: 'bateria', teclado: 'teclado' }[canalActual];
    const t = ctx.currentTime, k = suave ? .06 : 0.001;
    CAPAS.forEach(c => buses[c].gain.setTargetAtTime(!solo || solo === c ? 1 : 0, t, k));
    ecoEntrada.gain.setTargetAtTime(canalActual === 'produccion' ? .6 : 0, t, k);
  }

  function emitir() { oyentesCambio.forEach(fn => fn(sonando)); }

  async function empezar() {
    if (!AC) return;
    if (!ctx) montar();
    if (ctx.state === 'suspended') await ctx.resume();
    sonando = true;
    paso = 0;
    siguiente = ctx.currentTime + .06;
    cola.length = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(.72, ctx.currentTime, .08);
    motor();
    reloj = setInterval(motor, 25);
    ultimo = 0;
    raf = requestAnimationFrame(pintar);
    emitir();
  }

  function parar() {
    if (!sonando) return;
    sonando = false;
    clearInterval(reloj);
    cancelAnimationFrame(raf);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, .05);
    for (const k in env) env[k] = 0;
    cola.length = 0;
    setTimeout(() => { if (!sonando && ctx) ctx.suspend(); }, 400);
    emitir();
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) parar(); });

  window.Riddim = {
    soportado: !!AC,
    get sonando() { return sonando; },
    alternar() { return sonando ? parar() : empezar(); },
    parar,
    canal(nombre) { canalActual = nombre; aplicarCanal(true); },
    alCambiar(fn) { oyentesCambio.add(fn); },
    alNivel(fn) { oyentesNivel.add(fn); }
  };
})();
