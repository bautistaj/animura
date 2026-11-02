/**
 * ar-controller.js
 * Orquesta la experiencia AR: carga artwork, configura escena, maneja UX.
 */

import { track } from './analytics.js';

/* ── Detección de formato de video ─────────────────────── */
function detectVideoFormat(videos) {
  const v = document.createElement('video');
  if (videos.hevc && v.canPlayType('video/mp4; codecs="hvc1"') !== '') {
    return { src: videos.hevc, type: 'native-alpha' };
  }
  if (videos.webm && v.canPlayType('video/webm; codecs="vp9"') !== '') {
    return { src: videos.webm, type: 'native-alpha' };
  }
  return { src: videos.stackedMp4, type: 'stacked-alpha' };
}

/* ── Verificar soporte de cámara / HTTPS ───────────────── */
export function checkSupport() {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return { ok: false, reason: 'Esta experiencia requiere HTTPS.' };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'Tu navegador no soporta acceso a la cámara.' };
  }
  return { ok: true };
}

/* ── Clase principal ARController ──────────────────────── */
export class ARController {
  constructor(artwork) {
    this.artwork        = artwork;
    this.videoEl        = null;
    this.sceneEl        = null;
    this._started       = false;
    this._targetVisible = false;
    this._fadeTimer     = null;
    // muted === false opt-in explícito en artworks.json → audio habilitado
    this._audioEnabled  = artwork.muted === false;
  }

  /** Construye y monta la escena A-Frame en el DOM */
  mount() {
    const aw = this.artwork;
    const { src, type } = detectVideoFormat(aw.videos);

    /* ── video element ── */
    const video = document.createElement('video');
    video.id    = 'ar-video';
    video.loop  = true;
    video.muted = !this._audioEnabled;   // muted salvo opt-in explícito
    if (this._audioEnabled) video.volume = 0; // arranca en silencio; fade in en targetFound
    video.setAttribute('playsinline', '');
    video.setAttribute('crossorigin', 'anonymous');
    video.setAttribute('preload', 'auto');
    if (aw.poster) video.setAttribute('poster', aw.poster);
    video.src = src;
    this.videoEl = video;

    /* ── material según formato y transparencia ── */
    const needsAlpha = aw.transparent !== false;
    let materialAttr;
    if (!needsAlpha) {
      materialAttr = 'shader: flat';
    } else if (type === 'stacked-alpha') {
      materialAttr = 'shader: stacked-alpha; transparent: true; depthWrite: false';
    } else {
      // native-alpha: VP9/HEVC con canal alpha nativo
      materialAttr = 'shader: flat; transparent: true; depthWrite: false';
    }

    /* ── aspect ratio del plano ── */
    const aspect = aw.aspectRatio || 1;

    /* ── A-Frame scene ── */
    const scene = document.createElement('a-scene');
    scene.id = 'ar-scene';
    scene.setAttribute('mindar-image',
      `imageTargetSrc: ${aw.target};` +
      `uiLoading: no; uiScanning: no; uiError: no;` +
      `filterMinCF: ${aw.tracking.filterMinCF};` +
      `filterBeta: ${aw.tracking.filterBeta};`
    );
    scene.setAttribute('color-space', 'sRGB');
    scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('device-orientation-permission-ui', 'enabled: false');

    /* assets */
    const assets = document.createElement('a-assets');
    assets.appendChild(video);
    scene.appendChild(assets);

    /* camera */
    const camera = document.createElement('a-camera');
    camera.setAttribute('position', '0 0 0');
    camera.setAttribute('look-controls', 'enabled: false');
    scene.appendChild(camera);

    /* target entity */
    const entity = document.createElement('a-entity');
    entity.setAttribute('mindar-image-target', `targetIndex: ${aw.targetIndex}`);

    const plane = document.createElement('a-plane');
    plane.id = 'ar-plane';
    plane.setAttribute('position', aw.animation.from);
    plane.setAttribute('scale', `1 ${aspect} 1`);
    plane.setAttribute('material', `${materialAttr}; src: #ar-video`);
    plane.setAttribute('animation',
      `property: position; from: ${aw.animation.from}; to: ${aw.animation.to};` +
      `dur: ${aw.animation.duration}; dir: alternate; loop: true; easing: ${aw.animation.easing}`
    );

    entity.appendChild(plane);
    scene.appendChild(entity);

    this.sceneEl = scene;
    document.body.appendChild(scene);
  }

  /**
   * Desbloquea el audio en iOS Safari usando el truco del AudioContext.
   * DEBE llamarse sincrónicamente dentro del handler del gesto del usuario
   * (el click de "Iniciar experiencia"), justo después de mount().
   * Sin este unlock, iOS bloquea el audio en targetFound (que no es un gesto).
   */
  unlockAudio() {
    if (!this._audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Buffer silencioso de 1 sample: suficiente para desbloquear el contexto de audio
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.close();
    } catch (_) {}
  }

  /** Fade-in de volumen: 0 → 1 en ~1000ms */
  _fadeIn() {
    clearInterval(this._fadeTimer);
    if (!this._audioEnabled) return;
    this.videoEl.volume = 0;
    this._fadeTimer = setInterval(() => {
      const next = Math.min(1, this.videoEl.volume + 0.04);
      this.videoEl.volume = next;
      if (next >= 1) clearInterval(this._fadeTimer);
    }, 40); // 25 pasos × 40ms = 1000ms
  }

  /** Fade-out de volumen: actual → 0 en ~680ms; llama onComplete al terminar */
  _fadeOut(onComplete) {
    clearInterval(this._fadeTimer);
    if (!this._audioEnabled) { onComplete?.(); return; }
    this._fadeTimer = setInterval(() => {
      const next = Math.max(0, this.videoEl.volume - 0.06);
      this.videoEl.volume = next;
      if (next <= 0) {
        clearInterval(this._fadeTimer);
        onComplete?.();
      }
    }, 40); // ~17 pasos × 40ms ≈ 680ms
  }

  /** Inicia AR: solicita cámara, suscribe eventos */
  start(callbacks = {}) {
    if (this._started) return;
    this._started = true;

    const { onReady, onTargetFound, onTargetLost, onError } = callbacks;
    const scene = this.sceneEl;

    scene.addEventListener('arReady', () => {
      track('ar_start', { slug: this.artwork.slug });
      onReady?.();
    });

    scene.addEventListener('arError', (e) => {
      const reason = e.detail?.error || 'Error desconocido';
      track('ar_error', { slug: this.artwork.slug, reason });
      onError?.(reason);
    });

    scene.addEventListener('targetFound', () => {
      track('target_found', { slug: this.artwork.slug });
      this._targetVisible = true;
      this.videoEl.play().catch(() => {});
      this._fadeIn();
      navigator.vibrate?.(60);
      onTargetFound?.();
    });

    scene.addEventListener('targetLost', () => {
      track('target_lost', { slug: this.artwork.slug });
      this._targetVisible = false;
      this._fadeOut(() => this.videoEl.pause());
      onTargetLost?.();
    });

    /* Reanudar al volver de otra app */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this._targetVisible) {
        this.videoEl.play().catch(() => {});
        this._fadeIn();
      }
    });

    /* iOS: desbloquear reproducción de video muted en browsers restrictivos */
    if (!this._audioEnabled) {
      const unlock = () => this.videoEl.play().catch(() => {});
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click',      unlock, { once: true });
    }
  }

  destroy() {
    clearInterval(this._fadeTimer);
    this.sceneEl?.remove();
    this._started = false;
  }
}
