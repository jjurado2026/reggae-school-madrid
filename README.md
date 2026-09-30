# Reggae School Madrid — propuesta de homepage

Prototipo de homepage para [reggaeschoolmadrid.com](https://reggaeschoolmadrid.com/), escuela de
música especializada en reggae (clases online y presenciales en Madrid; saxo o piano también en
Barcelona).

**Prototipo:** https://jjurado2026.github.io/reggae-school-madrid/

## Dirección estética: «Riddim» (v3)

En Jamaica, un riddim es la base sobre la que cantan decenas de artistas; en dub, el ingeniero la
desmonta en la mesa. La escuela funciona igual —una base, el reggae, y ocho formas de tocarla— y
la home se construye como una sesión de dub:

- **Los ocho cursos son los ocho canales de una mesa de mezclas.** Vúmetro, fader, botón SOLO y
  cinta con el nombre. Elegir canal abre el curso con el texto del cliente íntegro. Es un
  `tablist` accesible y en móvil caben los ocho canales.
- **La web suena, con instrumentos reales.** Un one drop a 75 BPM de cuatro compases tocado con
  muestras CC0 (saxo, piano, guitarra, bajo, batería y voz; ver `assets/audio/CREDITOS.txt`).
  Pulsar un canal lo hace sonar solo; Producción es la mezcla dub con el DJ y Combo RSM, la banda
  entera. Solo arranca con un clic y se para al salir de la mesa.
- **Todo va a tempo**: negra 800 ms, semicorchea 200 ms. Eco dub en los titulares, un compás de
  cuatro tiempos con el acento en el 3 y un altavoz que late con el bombo mientras suena.
- **Negro predominante** (`#1d1e1e`, su fondo), texto en blanco y el **rojo** de su cartel del
  Combo (`#b8312b`) para resaltar, con una banda roja de cursos al pie del hero. Fraunces, Instrument Sans y Martian Mono.

Solo se animan `transform` y `opacity`. Sin bucles decorativos. `prefers-reduced-motion`
respetado.

## Qué añade frente a su home

Un hero que cabe entero en la primera pantalla de cualquier dispositivo, los ocho cursos
comparables en la mesa (el Combo RSM con su cartel, su ficha y sus requisitos), tarifas
comparables con «Sin matrícula», preguntas frecuentes, un formulario en tres pasos con
consentimiento que se rellena desde cada curso, el método en un compás y sus redes sociales.
Menú fijo que enlaza a las páginas de la web completa. Los textos de curso, tarifas y testimonios
son los suyos, literales.

## Stack

HTML, CSS y JavaScript puros. Cero dependencias, cero build. Fuentes variables autoalojadas
(232 KB) e imágenes del cliente en WebP con `srcset`. **~470 KB la primera vista y ~650 KB la
página entera**, frente a ~15 MB de su home actual.

## Estructura

```
prototype/          Prototipo navegable (se publica en gh-pages con git subtree)
  index.html
  assets/css/       global.css · home.css
  assets/js/        main.js (interacción) · riddim.js (audio)
  assets/fonts/     fraunces · instrument-sans · martian-mono (woff2, latino)
  assets/img/       fotos, logo y cartel del cliente en WebP
_interno/           Análisis, copy y propuesta (no se publica)
```

## Ver en local

```bash
cd prototype && python -m http.server 8000
```

Parámetro útil: `?ss` (sin animaciones, para capturas).

## Publicar

```bash
git subtree push --prefix=prototype origin gh-pages
```

Versiones anteriores: etiqueta `v2-home` (hero a pantalla completa, oscura).

---
Diseño y desarrollo: **Juan Jurado** · [jjuradogarciadelrio.com](https://jjuradogarciadelrio.com)
