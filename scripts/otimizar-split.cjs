/* Conversão mecânica JPG → WebP das imagens editoriais da home. Sem recorte, redimensionamento,
   filtro ou geração; os JPG originais ficam intactos e continuam como fallback do <picture>.
   Uso: node scripts/otimizar-split.cjs */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const files = ['split_shoes.jpg', 'split_bags.jpg', 'split_editorial.jpg'];
const QUALITY = 85;
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function main() {
  const report = [];
  for (const name of files) {
    const sourcePath = path.join(projectRoot, 'assets', name);
    const outputPath = sourcePath.replace(/\.jpg$/, '.webp');
    const source = await fs.readFile(sourcePath);
    const output = await sharp(source).webp({ quality: QUALITY, effort: 6 }).toBuffer();
    const [before, after] = await Promise.all([sharp(source).metadata(), sharp(output).metadata()]);
    if (before.width !== after.width || before.height !== after.height) throw new Error('Dimensão alterada: ' + name);
    // Fidelidade: PSNR por canal contra o JPG decodificado.
    const [a, b] = await Promise.all([sharp(source).raw().toBuffer(), sharp(output).raw().toBuffer()]);
    let squared = 0;
    for (let i = 0; i < a.length; i++) squared += (a[i] - b[i]) ** 2;
    const psnr = 10 * Math.log10(255 * 255 / (squared / a.length));
    if (psnr < 40) throw new Error('Fidelidade insuficiente: ' + name + ' PSNR ' + psnr.toFixed(1));
    await fs.writeFile(outputPath, output);
    report.push({ source: name, output: path.basename(outputPath), size: before.width + 'x' + before.height,
      bytes: [source.length, output.length], psnr: Number(psnr.toFixed(1)), sha256: [hash(source), hash(output)] });
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
