# BTAJ MX — WebAR Multi-Obra

App de Realidad Aumentada para ilustraciones y murales de BTAJ MX (Pachuca, Hidalgo).
El usuario escanea una imagen física con su celular y aparece una animación en AR encima.

## Stack

- **A-Frame 1.4.0 + MindAR 1.2.5** — AR de imagen (image tracking), sin WebXR nativo
- **Vanilla HTML/CSS/JS ES Modules** — sin frameworks, sin build step
- **Nginx Alpine** — servidor de archivos estáticos
- **Docker + Traefik** — deploy en bautistaj.dev bajo `/ar/`
- **SQLite / Node** — no aplica; app 100% estática

## Estructura de archivos

```
/
├── ar/
│   ├── index.html          Galería de obras
│   └── viewer.html         SPA de experiencia AR (una sola página, slug por URL)
├── assets/
│   ├── css/btaj.css        Design system completo (colores, botones, pantallas)
│   ├── js/
│   │   ├── ar-controller.js    Clase ARController: monta escena A-Frame, eventos, audio
│   │   ├── analytics.js        Wrapper Umami (no-op si no está configurado)
│   │   ├── i18n.js             Strings ES/EN, auto-detect, toggleLang()
│   │   ├── photo-capture.js    Captura AR canvas + watermark, Web Share API
│   │   └── shaders/
│   │       └── stacked-alpha.js  Shader GLSL: reconstruye alpha desde video stacked
│   ├── lib/
│   │   ├── aframe.min.js
│   │   └── mindar-image-aframe.prod.js
│   ├── artworks/{slug}/
│   │   ├── target.mind       Target compilado por MindAR (imagen de referencia)
│   │   ├── poster.jpg        Portada en galería y splash
│   │   ├── video-stacked.mp4 Video con alpha (formato stacked, universal)
│   │   └── video.webm        VP9 con alpha nativo (opcional, Chrome/Android)
│   └── brand/
│       ├── manifest.json     PWA manifest
│       └── qr-plate-template.svg
├── artworks.json             Config de todas las obras (fuente de verdad)
├── scripts/
│   ├── compile-target.mjs    Compila target.mind desde foto del mural
│   ├── stacked-alpha.sh      Genera video-stacked.mp4 desde WebM/MOV con alpha
│   ├── compress-video.sh     Comprime MP4 si es muy grande
│   └── generate-qr-plate.mjs Genera SVG imprimible con QR por obra
├── Dockerfile                Imagen Nginx Alpine con archivos estáticos
├── docker-compose.yml        Deploy producción (Traefik, sin puertos expuestos)
├── docker-compose.dev.yml    Override local (expone :3000)
├── docker/nginx.conf         Nginx sin SSL (Traefik termina TLS)
├── nginx.conf                Nginx standalone con SSL (deploy sin Docker)
├── serve.json                Rewrites para `npx serve` en desarrollo local
└── 404.html                  Página de error branded
```

## Cómo correr localmente

```bash
npx serve . --config serve.json
# → http://localhost:3000/ar/
# → http://localhost:3000/ar/btaj-capas/
# → http://localhost:3000/ar/abismo-negro/
```

Con Docker:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# → http://localhost:3000/ar/
```

## artworks.json — campos por obra

```json
{
  "slug":        "mi-obra",           // URL: /ar/mi-obra/
  "title":       "Mi Obra",
  "year":        2024,
  "description": "Descripción corta.",
  "story":       "Texto narrativo largo para el panel CTA.",
  "technique":   "Acrílico sobre barda",
  "location":    "Pachuca, Hidalgo",
  "category":    "Combate",           // Combate | Lucha | Rap | Identidad
  "accent":      "#D92B20",           // Color de acento por categoría
  "target":      "/assets/artworks/mi-obra/target.mind",
  "targetIndex": 0,                   // Índice si hay múltiples targets en el .mind
  "poster":      "/assets/artworks/mi-obra/poster.jpg",
  "aspectRatio": 1.0,                 // alto ÷ ancho de la animación
  "transparent": true,                // false = sin alpha (shader flat)
  "muted":       false,               // false = con audio (fade in/out automático)
  "videos": {
    "stackedMp4": "/assets/artworks/mi-obra/video-stacked.mp4",  // siempre requerido
    "webm":       "/assets/artworks/mi-obra/video.webm",          // opcional
    "hevc":       null                                             // opcional iOS
  },
  "animation": {
    "from": "0 0 0.01",
    "to":   "0 0 0.08",
    "duration": 2000,
    "easing": "easeInOutSine"
  },
  "tracking": {
    "filterMinCF": 0.001,   // bajar si vibra, subir si hay lag
    "filterBeta":  0.001
  },
  "cta": {
    "instagram":   "https://instagram.com/btaj_mx",
    "commissions": "https://bautistaj.dev/contacto"
  }
}
```

## Agregar una obra nueva

```bash
# 1. Compilar target desde foto del mural
npm install   # solo primera vez
node scripts/compile-target.mjs foto-del-mural.jpg
mv target.mind assets/artworks/mi-obra/

# 2. Generar video-stacked.mp4 desde WebM/MOV con alpha
#    IMPORTANTE: usar -c:v libvpx-vp9 si el input es WebM con alpha VP9
./scripts/stacked-alpha.sh mi-animacion.webm assets/artworks/mi-obra/video-stacked.mp4

# 3. Agregar entrada en artworks.json

# 4. Generar QR imprimible (requiere: npm install qrcode)
node scripts/generate-qr-plate.mjs mi-obra
```

## Decisiones técnicas importantes

**Stacked-alpha MP4**: el video tiene la mitad superior con color RGB y la mitad inferior con la máscara alpha en escala de grises. El shader GLSL las combina en tiempo real. Funciona en todos los browsers sin soporte especial de codecs.

**`-c:v libvpx-vp9` en stacked-alpha.sh**: obligatorio para WebM con alpha VP9. macOS usa VideoToolbox (hardware) por defecto y no decodifica el canal alpha. El flag fuerza el decoder de software que sí lo soporta. Sin este flag el alpha sale todo blanco (opaco).

**`controller.mount()` dentro del click handler**: iOS solo otorga permiso de cámara en respuesta a un gesto del usuario. Si se llama antes, el AR no arranca en iOS.

**`controller.unlockAudio()`**: debe llamarse sincrónicamente dentro del mismo click handler que mount(). Usa el truco del AudioContext silencioso para desbloquear audio en iOS Safari, que bloquea autoplay con audio aunque haya habido un gesto previo.

**Sin StripPrefix en Traefik**: el código usa rutas absolutas `/assets/...` y `/artworks.json` sin prefijo `/ar/`. Traefik enruta `PathPrefix(/ar) || PathPrefix(/assets) || Path(/artworks.json)` al mismo contenedor sin quitar prefijo.

**`await (async () => { })()` en viewer.html**: workaround para usar `return` como control de flujo en ES modules (top-level return no es válido).

## Deploy producción

```bash
# En el VPS (git pull previo):
sudo docker compose up -d --build

# Agregar obra nueva sin rebuild:
rsync -av assets/artworks/mi-obra/ usuario@bautistaj.dev:/ruta/btaj-ar/assets/artworks/mi-obra/
scp artworks.json usuario@bautistaj.dev:/ruta/btaj-ar/artworks.json
sudo docker compose restart btaj-ar
```

URLs producción: `https://bautistaj.dev/ar/` y `https://bautistaj.dev/ar/{slug}/`

## Obras actuales

| Slug | Título | Target | Transparencia | Audio |
|---|---|---|---|---|
| `btaj-capas` | Capas | `btaj-capas/target.mind` | ✓ | ✗ |
| `abismo-negro` | Abismo Negro | `btaj-capas/target.mind` (mismo) | ✓ | ✓ |
