const strings = {
  es: {
    start:         'Iniciar experiencia',
    loading:       'Iniciando cámara…',
    scanning:      'Apunta al mural o ilustración',
    scanningAgain: 'Sigue apuntando al mural',
    found:         '¡La encontraste!',
    options:       'Opciones ↑',
    capture:       '◎ Capturar',
    share:         'Compartir',
    linkCopied:    'Enlace copiado ✓',
    gallery:       '← Ver galería',
    allArtworks:   '← Ver todas las obras',
    instagram:     'Instagram @btaj_mx',
    commissions:   'Encargos',
    pointAt:       'Apunta al mural',
    technique:     'Técnica',
    location:      'Lugar',
    privacy:       'Esta app usa la cámara solo para AR. No se graba ni almacena video.',
    errorTitle:    'Algo salió mal',
    errorNotFound: 'Obra no encontrada. Verifica el enlace o el QR.',
    fallbackMsg:   'Escanea con tu celular para la experiencia AR:',
    close:         'Cerrar',
    langToggle:    'EN',
  },
  en: {
    start:         'Start experience',
    loading:       'Starting camera…',
    scanning:      'Point at the mural or illustration',
    scanningAgain: 'Keep pointing at the mural',
    found:         'You found it!',
    options:       'Options ↑',
    capture:       '◎ Capture',
    share:         'Share',
    linkCopied:    'Link copied ✓',
    gallery:       '← Gallery',
    allArtworks:   '← All artworks',
    instagram:     'Instagram @btaj_mx',
    commissions:   'Commissions',
    pointAt:       'Point at the mural',
    technique:     'Technique',
    location:      'Location',
    privacy:       'This app uses the camera only for AR. No video is recorded or stored.',
    errorTitle:    'Something went wrong',
    errorNotFound: 'Artwork not found. Check the link or QR.',
    fallbackMsg:   'Scan with your phone for the AR experience:',
    close:         'Close',
    langToggle:    'ES',
  }
};

let lang = navigator.language?.startsWith('en') ? 'en' : 'es';

export const t       = key => strings[lang]?.[key] ?? strings.es[key] ?? key;
export const getLang = () => lang;
export function toggleLang() {
  lang = lang === 'es' ? 'en' : 'es';
  return lang;
}
