/**
 * Compone un screenshot del AR scene (cámara + overlay WebGL) con watermark
 * y lo comparte via Web Share API o descarga como fallback.
 */
export async function captureAR(artworkTitle) {
  const sceneEl = document.querySelector('#ar-scene');
  // A-Frame expone el canvas WebGL en sceneEl.canvas (Three.js renderer)
  const arCanvas = sceneEl?.canvas ?? sceneEl?.querySelector('canvas');

  if (!arCanvas) {
    console.warn('captureAR: AR canvas not found');
    return;
  }

  const W = arCanvas.width;
  const H = arCanvas.height;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');

  // MindAR composita cámara + WebGL en el mismo canvas de la escena
  ctx.drawImage(arCanvas, 0, 0, W, H);

  // Watermark bar
  const barH = Math.max(28, Math.round(H * 0.06));
  ctx.fillStyle = 'rgba(21,21,21,0.72)';
  ctx.fillRect(0, H - barH, W, barH);

  const fSize = Math.max(11, Math.round(barH * 0.52));
  ctx.font = `bold ${fSize}px "Arial Black", Arial, sans-serif`;
  ctx.fillStyle = '#F5F1E8';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`@btaj_mx · ${artworkTitle}`, W - 12, H - barH / 2);

  const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.92));
  const slug  = artworkTitle.toLowerCase().replace(/\s+/g, '-');
  const file  = new File([blob], `btaj-${slug}-${Date.now()}.jpg`, { type: 'image/jpeg' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `${artworkTitle} — BTAJ MX` }).catch(() => {});
  } else {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: file.name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}
