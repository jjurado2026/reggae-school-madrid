/* =====================================================================
   Riddim — un one drop a 75 BPM con instrumentos reales.
   Cuatro compases (La menor · Sol · La menor · Sol). Suenan todos a la vez
   y cada canal de la mesa deja sonar solo el suyo:

     guitarra → skank en el 2 y el 4        bajo    → la línea de bajo
     canto    → la voz canta la frase        saxo    → el saxo le contesta
     teclado  → piano en el 2 y el 4 y burbuja de órgano
     batería  → one drop: bombo y sidestick en el 3, charles a corcheas
     producción → mezcla dub: batería y bajo con eco, y el DJ (sirena, bocina)
     combo    → la banda entera

   Muestras CC0 (dominio público), ver assets/audio/CREDITOS.txt:
   saxo tenor y piano de VCSL · guitarra, bajo y batería de Karoryfer Samples ·
   voz de legato_vocal_tutorial. La sirena y la bocina del DJ y el órgano se
   sintetizan, como en un sound system.

   Nunca suena solo: arranca únicamente con un clic del usuario.
   API: window.Riddim = { soportado, sonando, listo, precargar(), tocar(canal),
        alternar(), parar(), canal(nombre), alCambiar(fn), alNivel(fn), alCargar(fn) }
   ===================================================================== */
(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const BPM = 75;
  const SEMI = 60 / BPM / 4;            // semicorchea = 0,2 s
  const PASOS = 64;                      // cuatro compases de 16
  const ANTICIPO = 0.12;
  const CAPAS = ['bateria', 'bajo', 'guitarra', 'teclado', 'saxo', 'canto', 'dj'];
  const URL_AUDIO = 'assets/audio/riddim.wav';

  const MEZCLA = {
    guitarra: ['guitarra'], bajo: ['bajo'], canto: ['canto'], saxo: ['saxo'],
    teclado: ['teclado'], bateria: ['bateria'],
    produccion: ['bateria', 'bajo', 'dj'],
    combo: CAPAS
  };
  const ECO = { produccion: .55, combo: .18 };
  // Paso en el que entra cada instrumento: al pulsar su canal se oye al momento
  const ENTRADA = { saxo: 8, guitarra: 4, teclado: 2 };
  // Volumen de cada capa en la mezcla
  const VOL = { bateria: .9, bajo: 1, guitarra: .5, teclado: .55, saxo: .6, canto: .75, dj: .5 };
  // En solo, cada instrumento se iguala en volumen con el resto (la guitarra solo da dos golpes por compás)
  const SOLO = { guitarra: 2.4, teclado: 1.4, saxo: 1.15, canto: 1.15 };

  // Mapa del sprite: [inicio s, duración s, nota MIDI]
  const MAPA = {"sax56":[0,0.75002,56],"sax58":[0.78,0.75002,58],"sax60":[1.56,0.75002,60],"sax62":[2.34,0.75002,62],"sax64":[3.12,0.75002,64],"sax66":[3.9,0.75002,66],"piano55":[4.68,0.8,55],"piano60":[5.50998,0.8,60],"piano67":[6.33995,0.8,67],"voz47":[7.16993,1.05002,47],"voz50":[8.24993,1.05002,50],"voz52":[9.32993,1.05002,52],"voz55":[10.40993,1.05002,55],"voz57":[11.48993,1.05002,57],"gtr59":[12.56993,0.4,59],"gtr60":[12.99991,0.4,60],"gtr62":[13.42989,0.4,62],"gtr64":[13.85986,0.4,64],"gtr67":[14.28984,0.4,67],"gtr69":[14.71982,0.4,69],"bajo31":[15.1498,1,31],"bajo33":[16.17977,1,33],"bajo35":[17.20975,1,35],"bajo36":[18.23973,1,36],"bajo38":[19.26971,1,38],"bajo40":[20.29968,1,40],"bombo":[21.32966,0.5,null],"aro":[21.85964,0.3,null],"charles":[22.18961,0.18,null],"charlesAb":[22.39959,0.5,null]};
  // La cantante está unos 40 cents baja respecto a La 440: se corrige al tocar
  const AFINA = { voz: .42 };
  const MUESTRAS = {};
  for (const id in MAPA) {
    const fam = id.replace(/\d+$/, '');
    if (MAPA[id][2] != null) (MUESTRAS[fam] = MUESTRAS[fam] || []).push(MAPA[id][2]);
  }

  // --- Partitura (paso: [nota MIDI, duración en semicorcheas]) ---
  const repetir = (a, b) => Object.assign({}, a, ...Object.entries(b).map(([k, v]) => ({ [+k + 32]: v })));
  const BAJO_AB = {
    0: [33, 4], 6: [33, 1], 7: [36, 1], 8: [40, 3], 12: [38, 2], 14: [36, 2],
    16: [31, 4], 22: [31, 1], 23: [35, 1], 24: [38, 3], 28: [36, 2], 30: [35, 2]
  };
  const BAJO = repetir(BAJO_AB, BAJO_AB);
  const VOZ = {
    0: [52, 3], 3: [55, 1], 4: [57, 2], 6: [55, 2],
    16: [55, 3], 19: [52, 1], 20: [50, 2], 22: [47, 2],
    32: [52, 2], 34: [55, 2], 36: [57, 3], 39: [55, 1],
    48: [50, 3], 51: [52, 1], 52: [50, 2], 54: [47, 2]
  };
  const SAXO = {
    8: [57, 2], 10: [60, 1], 11: [62, 1], 12: [64, 2], 14: [62, 2],
    24: [55, 2], 26: [59, 1], 27: [60, 1], 28: [62, 2], 30: [59, 2],
    40: [57, 2], 42: [60, 1], 43: [62, 1], 44: [64, 2], 46: [67, 2],
    56: [64, 2], 58: [62, 1], 59: [60, 1], 60: [59, 2], 62: [55, 2]
  };
  const ACORDES = { a: { gtr: [60, 64, 69], piano: [57, 60, 64], organo: [57, 60, 64] },
                    b: { gtr: [59, 62, 67], piano: [55, 59, 62], organo: [55, 59, 62] } };

  let ctx = null, master, buses = {}, ecoEntrada, sprite = null, cargando = null;
  let reloj = null, siguiente = 0, paso = 0;
  let sonando = false, canalActual = 'guitarra', raf = 0;
  const env = { bombo: 0 };
  CAPAS.forEach(c => { env[c] = 0; });
  const cola = [];
  const oyentesCambio = new Set(), oyentesNivel = new Set(), oyentesCarga = new Set();
  const f = m => 440 * Math.pow(2, (m - 69) / 12);

  function montar() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .004; comp.release.value = .18;
    master.connect(comp).connect(ctx.destination);
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
    const realim = ctx.createGain(); realim.gain.value = .45;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
    ecoEntrada.connect(retardo); retardo.connect(lp).connect(hp);
    hp.connect(realim).connect(retardo); hp.connect(master);
  }

  // Descarga y decodifica el sprite (se puede llamar antes del primer clic)
  function precargar() {
    if (!AC) return Promise.resolve(false);
    if (cargando) return cargando;
    if (!ctx) montar();
    // XHR en lugar de fetch: también funciona al abrir la página en local
    cargando = new Promise((ok, ko) => {
      const x = new XMLHttpRequest();
      x.open('GET', URL_AUDIO);
      x.responseType = 'arraybuffer';
      x.onload = () => (x.status === 200 || x.status === 0) && x.response ? ok(x.response) : ko(new Error(x.status));
      x.onerror = () => ko(new Error('red'));
      x.send();
    })
      .then(b => new Promise((ok, ko) => ctx.decodeAudioData(b, ok, ko)))
      .then(buf => { sprite = buf; oyentesCarga.forEach(fn => fn(true)); return true; })
      .catch(() => { cargando = null; oyentesCarga.forEach(fn => fn(false)); return false; });
    return cargando;
  }

  // --- Muestras: elige la más cercana y la transpone lo que falte ---
  function muestra(t, fam, nota, { dur, vol = 1, capa, eco = 0, ataque = .004, suelta = .06 } = {}) {
    let id = fam, semis = 0;
    if (nota != null) {
      const cerca = MUESTRAS[fam].reduce((a, b) => Math.abs(b - nota) < Math.abs(a - nota) ? b : a);
      id = fam + cerca;
      semis = nota - cerca + (AFINA[fam] || 0);
    }
    const [ini, largo] = MAPA[id];
    const vel = Math.pow(2, semis / 12);
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = sprite;
    s.playbackRate.value = vel;
    const real = Math.min(dur || largo / vel, largo / vel);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol, t + Math.max(ataque, real - suelta));
    g.gain.linearRampToValueAtTime(0, t + real);
    s.connect(g).connect(buses[capa]);
    if (eco) { const e = ctx.createGain(); e.gain.value = eco; g.connect(e).connect(ecoEntrada); }
    s.start(t, ini, Math.min(largo, real * vel + .01));
    s.stop(t + real + .02);
  }

  // Órgano (síntesis aditiva tipo Hammond): la burbuja del teclado
  function organo(t, notas, dur = .13) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.05, t + .008);
    g.gain.setValueAtTime(.05, t + dur - .03);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(buses.teclado);
    notas.forEach(n => [[1, 1], [2, .6], [3, .35], [4, .2]].forEach(([h, a]) => {
      const o = ctx.createOscillator(), ga = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f(n) * h; ga.gain.value = a;
      o.connect(ga).connect(g); o.start(t); o.stop(t + dur + .02);
    }));
  }

  // DJ: la sirena dub y la bocina del sound system
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
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.09, t + .05);
    g.gain.setValueAtTime(.09, t + dur - .15);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp).connect(g); g.connect(buses.dj);
    const e = ctx.createGain(); e.gain.value = .8; g.connect(e).connect(ecoEntrada);
    o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    marcar(t, 'dj', 1);
  }
  function bocina(t) {
    const dur = .34, g = ctx.createGain(), bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = .8;
    [69, 73, 76].forEach((n, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f(n + 12), t);
      o.frequency.exponentialRampToValueAtTime(f(n + 12) * .82, t + dur);
      o.detune.value = (i - 1) * 9;
      o.connect(bp); o.start(t); o.stop(t + dur + .05);
    });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.11, t + .02);
    g.gain.linearRampToValueAtTime(0, t + dur);
    bp.connect(g).connect(buses.dj);
    const e = ctx.createGain(); e.gain.value = .6; g.connect(e).connect(ecoEntrada);
    marcar(t, 'dj', .9);
  }

  // --- Secuenciador ---
  function programar(p, t) {
    const enCompas = p % 16;
    const acorde = ACORDES[Math.floor(p / 16) % 2 === 0 ? 'a' : 'b'];
    const swing = enCompas % 4 === 2 ? .035 : 0;

    // Batería: one drop — bombo y sidestick juntos en el tiempo 3
    if (enCompas === 8) {
      muestra(t, 'bombo', null, { capa: 'bateria', vol: 1 });
      muestra(t, 'aro', null, { capa: 'bateria', vol: .8, eco: .7 });
      marcar(t, 'bombo', 1); marcar(t, 'bateria', 1);
    }
    if (p === 60) muestra(t, 'aro', null, { capa: 'bateria', vol: .35, eco: .5 });
    if (enCompas % 2 === 0) {
      if (p === 62) muestra(t + swing, 'charlesAb', null, { capa: 'bateria', vol: .45 });
      else muestra(t + swing, 'charles', null, { capa: 'bateria', vol: enCompas % 4 === 2 ? .5 : .32 });
      marcar(t + swing, 'bateria', .45);
    }

    // Bajo
    if (BAJO[p]) {
      muestra(t, 'bajo', BAJO[p][0], { capa: 'bajo', vol: 1, dur: BAJO[p][1] * SEMI * .95, suelta: .05 });
      marcar(t, 'bajo', 1);
    }

    // Guitarra: skank en el 2 y el 4, rasgueo hacia abajo
    if (enCompas === 4 || enCompas === 12) {
      acorde.gtr.slice().reverse().forEach((n, i) => muestra(t + i * .007, 'gtr', n, { capa: 'guitarra', vol: .75, dur: .16, suelta: .05 }));
      marcar(t, 'guitarra', 1);
    }

    // Teclado: piano con la guitarra y burbuja de órgano a contratiempo
    if (enCompas === 4 || enCompas === 12) {
      acorde.piano.forEach(n => muestra(t, 'piano', n, { capa: 'teclado', vol: .6, dur: .22, suelta: .08 }));
      marcar(t, 'teclado', 1);
    }
    if (enCompas % 4 === 2) {
      organo(t + swing, acorde.organo);
      marcar(t + swing, 'teclado', .6);
    }

    // Voz y saxo: pregunta y respuesta
    if (VOZ[p]) {
      muestra(t, 'voz', VOZ[p][0], { capa: 'canto', vol: .9, dur: VOZ[p][1] * SEMI + .06, ataque: .03, suelta: .09 });
      marcar(t, 'canto', 1);
    }
    if (SAXO[p]) {
      muestra(t, 'sax', SAXO[p][0], { capa: 'saxo', vol: .85, dur: SAXO[p][1] * SEMI * .92, ataque: .012, suelta: .05 });
      marcar(t, 'saxo', 1);
    }

    // DJ: sirena al entrar el tercer compás y bocina doble al final
    if (p === 32) sirena(t);
    if (p === 58 || p === 60) bocina(t);
  }

  function marcar(t, capa, v) { cola.push({ t, capa, v }); }

  function motor() {
    while (siguiente < ctx.currentTime + ANTICIPO) {
      programar(paso, siguiente);
      siguiente += SEMI;
      paso = (paso + 1) % PASOS;
    }
  }

  // Niveles para la interfaz: picos que caen, escalados por el volumen del bus
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
    const caida = Math.pow(.02, dt);
    for (const k in env) env[k] *= caida;
    const niveles = { bombo: env.bombo * (buses.bateria.gain.value > .01 ? 1 : 0) };
    CAPAS.forEach(c => { niveles[c] = env[c] * Math.min(1, buses[c].gain.value / VOL[c]); });
    oyentesNivel.forEach(fn => fn(niveles));
    raf = requestAnimationFrame(pintar);
  }

  function aplicarCanal(suave = true) {
    if (!ctx) return;
    const activas = MEZCLA[canalActual] || CAPAS;
    const t = ctx.currentTime, k = suave ? .04 : 0.001;
    const extra = SOLO[canalActual] || 1;
    CAPAS.forEach(c => buses[c].gain.setTargetAtTime(activas.includes(c) ? VOL[c] * extra : 0, t, k));
    ecoEntrada.gain.setTargetAtTime(ECO[canalActual] || 0, t, k);
  }

  function emitir() { oyentesCambio.forEach(fn => fn(sonando)); }

  // Arranca (o reinicia) en el compás donde entra el instrumento del canal
  async function tocar(nombre) {
    if (!AC) return;
    if (nombre) canalActual = nombre;
    if (!ctx) montar();
    if (ctx.state === 'suspended') await ctx.resume();
    const ok = await precargar();
    if (!ok) return;
    clearInterval(reloj);
    cola.length = 0;
    aplicarCanal(!sonando ? false : true);
    paso = ENTRADA[canalActual] || 0;
    siguiente = ctx.currentTime + .05;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(.64, ctx.currentTime, .03);
    motor();
    reloj = setInterval(motor, 25);
    if (!sonando) {
      sonando = true;
      ultimo = 0;
      raf = requestAnimationFrame(pintar);
      emitir();
    }
  }

  function parar() {
    if (!sonando) return;
    sonando = false;
    clearInterval(reloj);
    cancelAnimationFrame(raf);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, .04);
    for (const k in env) env[k] = 0;
    cola.length = 0;
    setTimeout(() => { if (!sonando && ctx) ctx.suspend(); }, 400);
    emitir();
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) parar(); });

  window.Riddim = {
    soportado: !!AC,
    get sonando() { return sonando; },
    get listo() { return !!sprite; },
    precargar,
    tocar,
    alternar() { return sonando ? parar() : tocar(); },
    parar,
    canal(nombre) { canalActual = nombre; aplicarCanal(true); },
    alCambiar(fn) { oyentesCambio.add(fn); },
    alNivel(fn) { oyentesNivel.add(fn); },
    alCargar(fn) { oyentesCarga.add(fn); }
  };
})();
