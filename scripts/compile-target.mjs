import { writeFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node scripts/compile-target.mjs <image-path> [output-path]');
  process.exit(1);
}
const inputPath = resolve(inputArg);
const outputArg = process.argv[3];
const outputPath = outputArg ? resolve(outputArg) : join(process.cwd(), 'target.mind');

// Import canvas from mind-ar's own nested node_modules so Image/Canvas classes match
const mindArCanvasPath = join(__dirname, '../node_modules/mind-ar/node_modules/canvas/index.js');
const { loadImage } = await import(pathToFileURL(mindArCanvasPath).href);

// Use tfjs CPU backend (not tfjs-node — it overwrites the backend and breaks mind-ar's custom kernels)
await import('@tensorflow/tfjs-backend-cpu');

const { OfflineCompiler } = await import('mind-ar/src/image-target/offline-compiler.js');

console.log(`Loading image: ${basename(inputPath)}`);
const img = await loadImage(inputPath);
console.log(`Image: ${img.width}x${img.height}`);

console.log('Compiling image target (may take ~30-60s)...');
const compiler = new OfflineCompiler();
await compiler.compileImageTargets([img], (progress) => {
  process.stdout.write(`\r  Progress: ${progress.toFixed(1)}%   `);
});

const buffer = compiler.exportData();
writeFileSync(outputPath, Buffer.from(buffer));
console.log(`\n✓ target.mind guardado en: ${outputPath}`);
