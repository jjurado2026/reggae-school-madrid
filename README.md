# Reggae School Madrid — propuesta de homepage

Remaquetación de la página de inicio de [reggaeschoolmadrid.com](https://reggaeschoolmadrid.com/),
escuela de música reggae de Madrid (clases online y presenciales).

**Prototipo:** https://jjurado2026.github.io/reggae-school-madrid/

## Qué es esto

Una propuesta de diseño para la escuela. Se remaqueta **su home**: sus mismos bloques,
en su mismo orden, con **sus textos literales** y **sus colores** (fondo oscuro `#1d1e1e`
y el crema `#fbe6aa` de su propia hoja de estilos). No se inventan secciones ni mensajes:
la propuesta vale precisamente porque reconocen su web, mejor contada.

Las mejoras detectadas durante el análisis (teléfono y WhatsApp, precios comparables,
noticias desactualizadas, rendimiento de las imágenes…) **no se ejecutan aquí**: se
recogen en el documento de propuesta que acompaña al prototipo.

## Estructura

```
prototype/          Prototipo HTML publicado en GitHub Pages
  index.html
  assets/css        global.css · home.css
  assets/js         main.js
  assets/img        fotos del cliente, reconvertidas a WebP responsive
  assets/fonts      fuentes variables autoalojadas
_interno/           Análisis, copy y propuesta (no se publica)
```

## Stack

HTML, CSS y JavaScript puros. Sin dependencias, sin build, sin frameworks.
Mobile-first. Fuentes autoalojadas. Imágenes en WebP con `srcset`.

---

Juan Jurado · 2026
