/* global AFRAME */

/**
 * stacked-alpha shader para A-Frame / Three.js
 *
 * Usa AFRAME.registerShader para que A-Frame gestione el VideoTexture
 * (más compatible con mobile que crear THREE.VideoTexture directamente).
 *
 * El `discard` en el fragmentShader hace transparente el fondo sin
 * depender de que `transparent:true` se aplique al ShaderMaterial —
 * funciona en todos los navegadores incluyendo mobile Brave/Chrome.
 *
 * Formato del video (generado por scripts/stacked-alpha.sh):
 *   Mitad superior (UV y 0.5..1.0) → RGB color original
 *   Mitad inferior (UV y 0.0..0.5) → máscara alpha en escala de grises
 */

/* global AFRAME */

AFRAME.registerShader('stacked-alpha', {
  schema: {
    src:     { type: 'map',   is: 'uniform' },
    opacity: { type: 'float', is: 'uniform', default: 1.0 }
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D src;
    uniform float     opacity;
    varying vec2      vUv;

    void main() {
      // Con flipY=true (default de A-Frame/Three.js):
      //   vUv.y=1 → top del video (color)  → UV y 0.5..1.0
      //   vUv.y=0 → bottom del video (alpha)→ UV y 0.0..0.5
      vec2 colorUV = vec2(vUv.x, 0.5 + vUv.y * 0.5);
      vec2 alphaUV = vec2(vUv.x, vUv.y * 0.5);

      vec4 color = texture2D(src, colorUV);
      vec4 alpha = texture2D(src, alphaUV);

      // discard no requiere transparent:true — funciona en todos los browsers
      if (alpha.r < 0.05) discard;

      gl_FragColor = vec4(color.rgb, alpha.r * opacity);
    }
  `
});
