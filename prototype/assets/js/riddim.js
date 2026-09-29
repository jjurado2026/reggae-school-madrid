/* =====================================================================
   Riddim — un one drop sintetizado con Web Audio, sin archivos de audio.
   75 BPM, dos compases en La menor / Sol. Todos los instrumentos tocan
   a la vez y cada canal de la mesa deja sonar solo el suyo:

     guitarra → skank        bajo → línea de bajo     batería → one drop
     teclado  → burbuja      saxo → línea de metales  canto   → voz
     producción → mezcla dub (batería + bajo con eco) y el DJ (sirena, bocina)
     combo    → la banda entera

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
  const CAPAS = ['bateria', 'bajo', 'guitarra', 'teclado', 'saxo', 'canto', 'dj'];

  // Qué capas suenan en cada canal de la mesa
  const MEZCLA = {
    guitarra: ['guitarra'],
    bajo: ['bajo'],
    canto: ['canto'],
    saxo: ['saxo'],
    teclado: ['teclado'],
    bateria: ['bateria'],
    produccion: ['bateria', 'bajo', 'dj'],
    combo: CAPAS
  };
  const ECO = { produccion: .6, combo: .28 };

  const f = m => 440 * Math.pow(2, (m - 69) / 12);

  // --- Partitura (paso: [nota MIDI, duración en semicorcheas]) ---
  const BAJO = {
    0: [45, 4], 6: [45, 1], 7: [48, 1], 8: [52, 3], 12: [50, 2], 14: [48, 2],
    16: [43, 4], 22: [43, 1], 23: [47, 1], 24: [50, 3], 28: [48, 2], 30: [47, 2]
  };
  const SKANK = { a: [69, 72, 76], b: [67, 71, 74] };      // Lam · Sol, agudo
  const BURBUJA = { a: [57, 60, 64], b: [55, 59, 62] };    // Lam · Sol, medio
  // Voz y saxo se contestan: la voz en la primera mitad de cada compás, el saxo en la segunda
  const VOZ = { 0: [64, 3], 4: [62, 2], 6: [60, 2], 16: [62, 3], 20: [59, 2], 22: [57, 2] };
  const SAXO = { 8: [76, 2], 10: [74, 1], 11: [72, 1], 12: [69, 3], 24: [74, 2], 26: [71, 1], 27: [67, 1], 28: [69, 3] };

  let ctx = null, master, buses = {}, ecoEntrada, ruido;
  let reloj = null, siguiente = 0, paso = 0;
  let sonando = false, canalActual = 'combo', raf = 0;
  const env = {};
  CAPAS.forEach(c => { env[c] = 0; });
  env.bombo = 0;
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
      g.gain.value = 0;
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
  // Al eco solo van el aro y el DJ: el eco únicamente se abre en Producción
  // (batería + bajo + DJ) y en Combo, así no se cuela ningún instrumento silenciado.
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
    n.connect(bp).connect(g).connect(buses.bateria);
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

  function acorde(t, notas, tipo, capa, corte, vol, caida) {
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
    bp.connect(g).connect(buses[capa]);
  }

  // Saxo: sierra filtrada que se abre al atacar, con vibrato
  function saxo(t, nota, dur) {
    const fin = t + dur * SEMI * .9;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    const lp = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.value = f(nota); o2.frequency.value = f(nota);
    g2.gain.value = .35;
    vib.frequency.value = 5.2; vibG.gain.value = f(nota) * .006;
    vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
    lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(2600, t + .06);
    lp.frequency.linearRampToValueAtTime(1700, fin);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.16, t + .03);
    g.gain.setValueAtTime(.14, fin - .03);
    g.gain.exponentialRampToValueAtTime(0.0001, fin + .08);
    o.connect(lp); o2.connect(g2).connect(lp);
    lp.connect(g).connect(buses.saxo);
    [o, o2, vib].forEach(x => { x.start(t); x.stop(fin + .12); });
    marcar(t, 'saxo', 1);
  }

  // Voz: fuente de pulso filtrada por los formantes de una «o», con vibrato
  function voz(t, nota, dur) {
    const fin = t + dur * SEMI * .95;
    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vibG = ctx.createGain();
    const g = ctx.createGain(), suma = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f(nota);
    vib.frequency.value = 5.6; vibG.gain.value = f(nota) * .012;
    vib.connect(vibG).connect(o.frequency);
    // Formantes aproximados de «o»: 450, 800, 2830 Hz
    [[450, 8, 1], [800, 10, .6], [2830, 14, .18]].forEach(([fr, q, a]) => {
      const bp = ctx.createBiquadFilter(), ga = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; ga.gain.value = a;
      o.connect(bp).connect(ga).connect(suma);
    });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.9, t + .06);
    g.gain.setValueAtTime(.8, fin - .05);
    g.gain.exponentialRampToValueAtTime(0.0001, fin + .12);
    suma.connect(g).connect(buses.canto);
    o.start(t); vib.start(t); o.stop(fin + .15); vib.stop(fin + .15);
    marcar(t, 'canto', 1);
  }

  // DJ: la sirena dub (dos tonos que suben y bajan) y la bocina del sound system
  function sirena(t) {
    const dur = SEMI * 8;
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(760, t + dur);
    lfo.type = 'triangle'; lfo.frequency.value = 5.5; lfoG.gain.value = 170;
    lfo.connect(lfoG).connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.09, t + .05);
    g.gain.setValueAtTime(.09, t + dur - .15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g);
    g.connect(buses.dj);
    const envio = ctx.createGain(); envio.gain.value = .9;
    g.connect(envio).connect(ecoEntrada);
    o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    marcar(t, 'dj', 1);
  }
  function bocina(t) {
    const dur = .34;
    const g = ctx.createGain(), bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = .8;
    [69, 73, 76].forEach((n, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f(n + 12), t);
      o.frequency.exponentialRampToValueAtTime(f(n + 12) * .82, t + dur);
      o.detune.value = (i - 1) * 9;
      o.connect(bp);
      o.start(t); o.stop(t + dur + .05);
    });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.12, t + .02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    bp.connect(g).connect(buses.dj);
    const envio = ctx.createGain(); envio.gain.value = .7;
    g.connect(envio).connect(ecoEntrada);
    marcar(t, 'dj', .9);
  }

  // --- Secuenciador ---
  let vuelta = 0;
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
      acorde(t, SKANK[acordeClave], 'sawtooth', 'guitarra', 1700, .16, .09);
      marcar(t, 'guitarra', 1);
    }

    // Teclado: burbuja de órgano a contratiempo
    if (enCompas % 4 === 2) {
      acorde(t + swing, BURBUJA[acordeClave], 'square', 'teclado', 1300, .07, .12);
      marcar(t + swing, 'teclado', .8);
    }

    // Voz y saxo, pregunta y respuesta
    if (VOZ[p]) voz(t, VOZ[p][0], VOZ[p][1]);
    if (SAXO[p]) saxo(t, SAXO[p][0], SAXO[p][1]);

    // DJ: sirena al entrar la vuelta par, bocina doble al final de la impar
    if (p === 0 && vuelta % 2 === 0) sirena(t);
    if (vuelta % 2 === 1 && (p === 24 || p === 26)) bocina(t);
    if (p === PASOS - 1) vuelta++;
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
    cola.sort((a, b) => a.t - b.t);
    while (cola.length && cola[0].t <= t) {
      const e = cola.shift();
      env[e.capa] = Math.max(env[e.capa], e.v);
    }
    const caida = Math.pow(.02, dt);       // ~ -34 dB por segundo
    for (const k in env) env[k] *= caida;
    const niveles = { bombo: env.bombo * buses.bateria.gain.value };
    CAPAS.forEach(c => { niveles[c] = env[c] * buses[c].gain.value; });
    oyentesNivel.forEach(fn => fn(niveles));
    raf = requestAnimationFrame(pintar);
  }

  // --- Mezcla según el canal elegido en la mesa ---
  function aplicarCanal(suave = true) {
    if (!ctx) return;
    const activas = MEZCLA[canalActual] || CAPAS;
    const t = ctx.currentTime, k = suave ? .06 : 0.001;
    CAPAS.forEach(c => buses[c].gain.setTargetAtTime(activas.includes(c) ? 1 : 0, t, k));
    ecoEntrada.gain.setTargetAtTime(ECO[canalActual] || 0, t, k);
  }

  function emitir() { oyentesCambio.forEach(fn => fn(sonando)); }

  async function empezar() {
    if (!AC) return;
    if (!ctx) montar();
    if (ctx.state === 'suspended') await ctx.resume();
    sonando = true;
    paso = 0; vuelta = 0;
    siguiente = ctx.currentTime + .06;
    cola.length = 0;
    aplicarCanal(false);
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
