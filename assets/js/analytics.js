/**
 * Analytics wrapper — Umami (autoalojable, privado)
 * Activar: descomentar la línea de script de Umami en viewer.html
 * y configurar UMAMI_URL + UMAMI_ID en el entorno.
 *
 * Eventos rastreados:
 *   ar_start      { slug }
 *   target_found  { slug }
 *   target_lost   { slug }
 *   cta_click     { slug, action }
 *   ar_error      { slug, reason }
 */

export function track(event, props = {}) {
  if (typeof window.umami === 'undefined') return;
  try {
    window.umami.track(event, props);
  } catch (_) {}
}
