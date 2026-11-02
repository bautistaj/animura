# BTAJ MX — WebAR Multi-Obra

Experiencia de Realidad Aumentada para ilustraciones y murales.
Stack: A-Frame 1.4.0 + MindAR 1.2.5 · HTML/CSS/JS ES Modules · Nginx · Docker

---

## Estructura de carpetas

```
/
├── ar/
│   ├── index.html              Galería de obras
│   └── viewer.html             Experiencia AR (SPA)
├── assets/
│   ├── lib/                    A-Frame y MindAR locales (versiones fijas)
│   ├── artworks/{slug}/        Assets por obra
│   │   ├── target.mind         Target compilado
│   │   ├── poster.jpg          Imagen de portada
│   │   ├── video-stacked.mp4   Video transparente universal
│   │   ├── video.webm          WebM VP9 alpha (opcional, Chrome/Android)
│   │   └── video-hevc.mov      HEVC alpha (opcional, iOS Safari)
│   ├── brand/                  Logo SVG y favicon
│   ├── css/btaj.css            Design system BTAJ
│   └── js/                     Lógica de la app
├── artworks.json               Config de todas las obras
├── scripts/                    Utilidades ffmpeg y compilador
├── nginx.conf                  Config de servidor
└── docker-compose.yml
```

---

## Agregar una obra nueva (paso a paso)

### Archivos necesarios por obra

```
assets/artworks/{slug}/
├── target.mind         ← compilado desde foto del mural físico
├── poster.jpg          ← portada en galería y splash (cuadrada, ~500×500)
└── video-stacked.mp4   ← animación con alpha en formato stacked (OBLIGATORIO)
```

---

### 1. Prepara el directorio

```bash
mkdir -p assets/artworks/mi-obra
```

Copia el `poster.jpg` (foto estática del mural/ilustración).

---

### 2. Compila el target `.mind`

El target le dice a MindAR qué imagen reconocer con la cámara.

```bash
npm install          # solo la primera vez
node scripts/compile-target.mjs foto-del-mural.jpg
mv target.mind assets/artworks/mi-obra/
```

**La foto del mural debe ser:**
- Nítida, sin blur ni distorsión
- Buena iluminación (sin sombras fuertes)
- Encuadrada recta (no en perspectiva)
- Cuantos más detalles, mejor tracking

---

### 3. Genera `video-stacked.mp4`

Este es el archivo más importante. El script toma tu animación con canal alpha
y genera un MP4 estándar donde la mitad superior es el color y la mitad inferior
es la máscara de transparencia.

```bash
./scripts/stacked-alpha.sh mi-animacion.mov assets/artworks/mi-obra/video-stacked.mp4
```

El script acepta **cualquier formato con canal alpha real**:
- `.mov` ProRes 4444 (exportado desde After Effects, Motionvv, etc.)
- `.webm` VP9 con alpha (Chrome / web exports)
- `.mov` HEVC con alpha (exportado desde Final Cut Pro)

> **⚠️ El canal alpha debe estar realmente en el archivo.**
> Verifica antes de correr el script:
> ```bash
> ffprobe -v quiet -show_entries stream=pix_fmt -of default=noprint_wrappers=1:nokey=1 mi-animacion.mov
> # Debe mostrar: yuva444p12le, yuva420p, o similar (con la "a" de alpha)
> # Si muestra yuv420p o yuv444p (sin "a"), el archivo NO tiene alpha
> ```
>
> Si el video no tiene alpha, la máscara de transparencia quedará completamente
> negra y la animación aparecerá sobre fondo negro en AR.

**Verifica el resultado:**
```bash
# Extrae un frame de la mitad inferior (máscara alpha) y confirma que NO es todo negro
ffmpeg -ss 2 -i assets/artworks/mi-obra/video-stacked.mp4 \
  -vf "crop=iw:ih/2:0:ih/2" -frames:v 1 /tmp/alpha-check.jpg -y
open /tmp/alpha-check.jpg
# Debe verse la silueta de la ilustración en blanco sobre negro
```

**Si el archivo es muy grande (>3 MB):**
```bash
./scripts/compress-video.sh assets/artworks/mi-obra/video-stacked.mp4
```

---

### 4. Edita `artworks.json`

Agrega una entrada al array `artworks`. Todos los campos:

```json
{
  "slug":        "mi-obra",
  "title":       "Mi Obra",
  "year":        2024,
  "description": "Descripción corta (aparece en el splash).",
  "story":       "Texto narrativo largo que aparece en el panel de opciones.",
  "technique":   "Acrílico sobre barda",
  "location":    "Pachuca, Hidalgo",
  "category":    "Combate",
  "accent":      "#D92B20",
  "target":      "/assets/artworks/mi-obra/target.mind",
  "targetIndex": 0,
  "poster":      "/assets/artworks/mi-obra/poster.jpg",
  "aspectRatio": 1.0,
  "transparent": true,
  "muted":       true,
  "videos": {
    "stackedMp4": "/assets/artworks/mi-obra/video-stacked.mp4",
    "webm":       null,
    "hevc":       null
  },
  "animation": {
    "from":     "0 0 0.01",
    "to":       "0 0 0.08",
    "duration": 2000,
    "easing":   "easeInOutSine"
  },
  "tracking": {
    "filterMinCF": 0.001,
    "filterBeta":  0.001
  },
  "cta": {
    "instagram":   "https://instagram.com/btaj_mx",
    "commissions": "https://bautistaj.dev/contacto",
    "label":       "Ver más en Instagram"
  }
}
```

**Referencia de campos:**

| Campo | Valores | Notas |
|---|---|---|
| `slug` | string sin espacios | Define la URL: `/ar/mi-obra/` |
| `category` | `Combate` `Lucha` `Rap` `Identidad` | Controla el color accent |
| `accent` | hex color | `Combate=#D92B20` `Lucha=#F2C230` `Rap=#7136D9` `Identidad=#178F82` |
| `aspectRatio` | número decimal | `alto ÷ ancho` del video. Ej: 720×1080 → `1080/720 = 1.5` |
| `transparent` | `true` / `false` | `true` = animación con fondo transparente |
| `muted` | `true` / `false` | `false` = el video tiene audio y debe reproducirse con sonido |
| `targetIndex` | entero `0..N-1` | Si el `.mind` tiene múltiples targets, cuál usar |
| `webm` | ruta o `null` | **Dejar en `null`** a menos que tengas un WebM VP9 con alpha verificado |

**`aspectRatio`:** divide alto entre ancho. Video 720×720 → `1.0`. Video 720×1080 → `1.5`.

**`muted: false`:** solo si la animación tiene pista de audio Y quieres reproducirla en AR.
El sistema hace fade-in al detectar el target y fade-out al perderlo.

---

### 5. Prueba local

```bash
npx serve . --config serve.json
# → http://localhost:3000/ar/mi-obra/
```

Apunta la cámara a la imagen/ilustración y verifica:
- ✓ La animación aparece sobre la imagen
- ✓ El fondo de la animación es transparente (se ve la imagen del mural detrás)
- ✓ La animación flota con la animación de posición
- ✓ Al perder el target, la animación desaparece
- ✓ El panel "Opciones" muestra título, año, técnica e historia

---

### 6. Genera el QR imprimible

```bash
node scripts/generate-qr-plate.mjs mi-obra
# Genera: assets/artworks/mi-obra/qr-plate.svg
```

Imprime el SVG y colócalo junto al mural para que el público pueda escanear.

---

### 7. Despliega al servidor

```bash
# Solo los assets de la obra nueva (sin rebuild de Docker):
rsync -av assets/artworks/mi-obra/ usuario@bautistaj.dev:/ruta/btaj-ar/assets/artworks/mi-obra/
scp artworks.json usuario@bautistaj.dev:/ruta/btaj-ar/artworks.json
sudo docker compose restart btaj-ar
```

---

## Despliegue inicial en el VPS

```bash
# 1. Clona o sube el proyecto
git clone https://github.com/btaj-mx/ar.git /var/www/btaj-ar
# o: rsync -av ./ usuario@bautistaj.dev:/var/www/btaj-ar/

# 2. Obtén certificado SSL (si no lo tienes)
certbot certonly --nginx -d bautistaj.dev

# 3. Sin Docker — copia la config de Nginx:
cp nginx.conf /etc/nginx/conf.d/btaj-ar.conf
nginx -t && systemctl reload nginx

# 4. Con Docker:
docker network create web       # solo primera vez
docker compose up -d
```

---

## Checklist de pruebas

### iPhone (iOS Safari)
- [ ] Abre `https://bautistaj.dev/ar/btaj-capas/`
- [ ] La pantalla splash carga con título y botón
- [ ] Al tocar "Iniciar" se solicita permiso de cámara
- [ ] El AR inicia y muestra la cámara
- [ ] Al apuntar al mural/ilustración, aparece la animación encima
- [ ] La animación tiene el fondo correcto (transparencia o sólido según formato)
- [ ] Al perder el target, aparece el hint de escaneo
- [ ] El botón "Opciones" abre el panel CTA
- [ ] El botón de Instagram abre la app/web correctamente
- [ ] El botón "Compartir" abre el share sheet de iOS

### Android (Chrome)
- [ ] Mismos pasos que iOS
- [ ] La transparencia se ve correctamente (WebM VP9 alpha)
- [ ] El video arranca sin necesidad de tap adicional

### Desktop (fallback)
- [ ] Abre `https://bautistaj.dev/ar/btaj-capas/`
- [ ] El botón cambia a "Ver en modo normal"
- [ ] El video se reproduce en el player
- [ ] El QR aparece correctamente

---

## Agregar analítica con Umami

1. Despliega [Umami](https://umami.is/docs/install) en tu VPS
2. Crea un sitio y copia el `website-id`
3. Descomenta el bloque `<script>` de Umami en `ar/viewer.html`
4. Reemplaza `TU-WEBSITE-ID` y la URL de tu instancia

Eventos rastreados automáticamente:
- `ar_start` — cuando el AR inicia
- `target_found` / `target_lost` — tracking del mural
- `cta_click` — clicks en Instagram, compartir
- `ar_error` — errores con su razón

---

## Notas técnicas

### Shader stacked-alpha
El `video-stacked.mp4` es un MP4 estándar (sin canal alpha en el contenedor).
La mitad superior del frame contiene el color RGB y la mitad inferior contiene
la máscara de transparencia en escala de grises. El shader GLSL en
`assets/js/shaders/stacked-alpha.js` las combina en tiempo real en la GPU.

- Funciona en **todos los browsers** sin requerir codecs especiales
- Usa `discard` en el fragmentShader para la transparencia — más compatible
  con mobile (Brave, Chrome Android, Safari iOS) que alpha blending puro
- Siempre pon `"webm": null` en artworks.json para forzar este shader en
  todos los navegadores; VP9 nativo tiene problemas en algunos Android

### Compatibilidad de transparencia
| Formato | Desktop | iOS Safari | Android Chrome | Android Brave |
|---|---|---|---|---|
| Stacked-alpha MP4 + shader | ✓ | ✓ | ✓ | ✓ |
| WebM VP9 alpha nativo | ✓ | ✗ | ✓ | ⚠️ inconsistente |
| HEVC alpha nativo | ✓ | ✓ | ✗ | ✗ |

**Recomendación:** usa siempre `stacked-alpha MP4` como único formato
(`webm: null`, `hevc: null`). Agrega WebM o HEVC solo si tienes una razón
específica de calidad.

### Ajustar tracking (vibración / lag)
Si la imagen **vibra** demasiado: baja `filterMinCF` y `filterBeta` (ej. `0.0005`)
Si hay **lag / retraso**: súbelos (ej. `0.005`)
