#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# compress-video.sh
# Comprime un video para uso en WebAR (objetivo: carga rápida en 4G).
#
# Uso:
#   ./scripts/compress-video.sh input.mp4 [output.mp4]
#
# Targets de bitrate recomendados para 4G:
#   - Video 1080p:  crf 23, max 2Mbps
#   - Video 720p:   crf 23, max 1.2Mbps
#   - WebM VP9:     crf 33, b:v 0
# ─────────────────────────────────────────────────────────────
set -euo pipefail

INPUT="${1:?Uso: $0 <input> [output]}"
EXT="${INPUT##*.}"
BASE="${INPUT%.*}"
OUTPUT="${2:-${BASE}-compressed.${EXT}}"

echo "→ Comprimiendo: $INPUT → $OUTPUT"

case "$EXT" in
  mp4|mov)
    ffmpeg -i "$INPUT" \
      -c:v libx264 -crf 23 -maxrate 2M -bufsize 4M \
      -pix_fmt yuv420p -movflags faststart \
      -an -y "$OUTPUT"
    ;;
  webm)
    ffmpeg -i "$INPUT" \
      -c:v libvpx-vp9 -crf 33 -b:v 0 \
      -pix_fmt yuva420p -auto-alt-ref 0 \
      -an -y "$OUTPUT"
    ;;
  *)
    echo "Formato no soportado: $EXT"
    exit 1
    ;;
esac

ORIG=$(du -sh "$INPUT"  | cut -f1)
COMP=$(du -sh "$OUTPUT" | cut -f1)
echo "✓ Original: $ORIG  →  Comprimido: $COMP"
