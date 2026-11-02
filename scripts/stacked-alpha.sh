#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# stacked-alpha.sh
# Genera un video MP4 "stacked-alpha" desde un video con canal
# alpha (WebM VP9, MOV ProRes, MOV HEVC, etc.).
#
# Formato de salida:
#   - Mitad superior → datos RGB del color original
#   - Mitad inferior → máscara alpha en escala de grises
#
# Uso:
#   ./scripts/stacked-alpha.sh input-con-alpha.webm output-stacked.mp4
#   ./scripts/stacked-alpha.sh input-con-alpha.mov  output-stacked.mp4
#
# Requiere: ffmpeg con libx264, libvpx y libvpx-vp9
# ─────────────────────────────────────────────────────────────
set -euo pipefail

INPUT="${1:?Uso: $0 <input-con-alpha> <output-stacked.mp4>}"
OUTPUT="${2:?Uso: $0 <input-con-alpha> <output-stacked.mp4>}"

echo "→ Generando stacked-alpha: $INPUT → $OUTPUT"

# VP9 en WebM guarda el alpha en un stream secundario que macOS
# (VideoToolbox) no decodifica. Forzar decoder de software solo
# cuando el codec es vp9 — otros formatos (ProRes, HEVC) van bien
# con el decoder por defecto.
CODEC=$(ffprobe -v quiet -select_streams v:0 \
  -show_entries stream=codec_name \
  -of default=noprint_wrappers=1:nokey=1 "$INPUT")

if [ "$CODEC" = "vp9" ]; then
  DECODER="-c:v libvpx-vp9"
  echo "  Codec: VP9 — usando decoder de software (alpha support)"
else
  DECODER=""
  echo "  Codec: $CODEC"
fi

ffmpeg $DECODER -i "$INPUT" \
  -filter_complex \
    "[0:v]format=rgba,split=2[c][a];\
     [c]format=yuv420p[color];\
     [a]alphaextract,format=yuv420p[mask];\
     [color][mask]vstack=inputs=2[out]" \
  -map "[out]" \
  -map "0:a?" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -crf 18 \
  -c:a aac \
  -b:a 128k \
  -movflags faststart \
  -y "$OUTPUT"

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo "✓ Listo: $OUTPUT ($SIZE)"
echo ""
echo "Nota: el plano AR debe usar el shader 'stacked-alpha'."
echo "La altura del video de salida es el doble del original."
echo "Audio: si el input tiene pista de audio, se conserva (AAC 128k)."
echo "       En artworks.json pon \"muted\": false para activarlo en AR."
